from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import shutil
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Service Categories
SERVICE_CATEGORIES = [
    "Home Services", "Construction & Renovation", "Professional Services",
    "Technology & IT", "Creative & Design", "Business Services",
    "Health & Wellness", "Education & Training", "Transportation",
    "Events & Entertainment", "Other"
]

# Models
class UserRole:
    CUSTOMER = "customer"
    PROVIDER = "provider"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    phone: str
    password_hash: str
    role: str  # customer or provider
    first_name: str
    last_name: str
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str
    role: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class ProviderProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    business_name: Optional[str] = None
    description: Optional[str] = None
    services_offered: List[str] = []
    website_url: Optional[str] = None
    verification_document: Optional[str] = None
    is_verified: bool = False
    verification_badge: Optional[str] = None
    rating: float = 0.0
    total_reviews: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProviderProfileCreate(BaseModel):
    business_name: Optional[str] = None
    description: Optional[str] = None
    services_offered: List[str] = []
    website_url: Optional[str] = None

class ServiceRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    category: str
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    deadline: Optional[datetime] = None
    location: Optional[str] = None
    status: str = "open"  # open, in_progress, completed, cancelled
    show_best_bids: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceRequestCreate(BaseModel):
    title: str
    description: str
    category: str
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    deadline: Optional[datetime] = None
    location: Optional[str] = None
    show_best_bids: bool = False

class Bid(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_request_id: str
    provider_id: str
    provider_name: str
    price: float
    proposal: str
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BidCreate(BaseModel):
    service_request_id: str
    price: float
    proposal: str

class BidMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bid_id: str
    sender_id: str
    sender_role: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BidMessageCreate(BaseModel):
    bid_id: str
    message: str

# Utility functions
def serialize_mongo_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_mongo_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                continue  # Skip MongoDB's _id field
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_mongo_doc(value)
            elif isinstance(value, list):
                result[key] = serialize_mongo_doc(value)
            else:
                result[key] = value
        return result
    return doc

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return serialize_mongo_doc(user)

# Routes
@api_router.get("/")
async def root():
    return {"message": "Service Marketplace API"}

@api_router.get("/categories")
async def get_categories():
    return {"categories": SERVICE_CATEGORIES}

# Authentication Routes
@api_router.post("/auth/register", response_model=Dict[str, Any])
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        phone=user_data.phone,
        password_hash=hashed_password,
        role=user_data.role,
        first_name=user_data.first_name,
        last_name=user_data.last_name
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    user_dict = user.dict()
    user_dict.pop("password_hash")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    user.pop("password_hash")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    current_user.pop("password_hash", None)
    return current_user

# Service Request Routes
@api_router.post("/service-requests", response_model=ServiceRequest)
async def create_service_request(request_data: ServiceRequestCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create service requests")
    
    service_request = ServiceRequest(**request_data.dict(), user_id=current_user["id"])
    await db.service_requests.insert_one(service_request.dict())
    return service_request

@api_router.get("/service-requests", response_model=List[Dict[str, Any]])
async def get_service_requests(category: Optional[str] = None, status: Optional[str] = None):
    filter_dict = {}
    if category:
        filter_dict["category"] = category
    if status:
        filter_dict["status"] = status
    
    requests = await db.service_requests.find(filter_dict).sort("created_at", -1).to_list(100)
    
    # Add user info for each request
    for request in requests:
        user = await db.users.find_one({"id": request["user_id"]})
        if user:
            request["user_name"] = f"{user['first_name']} {user['last_name']}"
        
        # Get bid count
        bid_count = await db.bids.count_documents({"service_request_id": request["id"]})
        request["bid_count"] = bid_count
    
    return requests

@api_router.get("/service-requests/{request_id}")
async def get_service_request(request_id: str):
    request = await db.service_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Add user info
    user = await db.users.find_one({"id": request["user_id"]})
    if user:
        request["user_name"] = f"{user['first_name']} {user['last_name']}"
    
    return request

@api_router.get("/my-requests")
async def get_my_requests(current_user: dict = Depends(get_current_user)):
    requests = await db.service_requests.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    
    for request in requests:
        bid_count = await db.bids.count_documents({"service_request_id": request["id"]})
        request["bid_count"] = bid_count
    
    return requests

# Bid Routes
@api_router.post("/bids", response_model=Bid)
async def create_bid(bid_data: BidCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can create bids")
    
    # Check if request exists
    request = await db.service_requests.find_one({"id": bid_data.service_request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Check if provider already bid on this request
    existing_bid = await db.bids.find_one({
        "service_request_id": bid_data.service_request_id,
        "provider_id": current_user["id"]
    })
    if existing_bid:
        raise HTTPException(status_code=400, detail="You have already bid on this request")
    
    provider_name = f"{current_user['first_name']} {current_user['last_name']}"
    bid = Bid(**bid_data.dict(), provider_id=current_user["id"], provider_name=provider_name)
    await db.bids.insert_one(bid.dict())
    return bid

@api_router.get("/service-requests/{request_id}/bids")
async def get_bids_for_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.service_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Only request owner or providers who bid can see bids
    user_is_owner = current_user["id"] == request["user_id"]
    user_bid = await db.bids.find_one({"service_request_id": request_id, "provider_id": current_user["id"]})
    
    if not user_is_owner and not user_bid:
        # If show_best_bids is enabled, show top 3 bids
        if request.get("show_best_bids", False):
            bids = await db.bids.find({"service_request_id": request_id}).sort("price", 1).limit(3).to_list(3)
        else:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        bids = await db.bids.find({"service_request_id": request_id}).sort("created_at", -1).to_list(100)
    
    return bids

@api_router.get("/my-bids")
async def get_my_bids(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can view bids")
    
    bids = await db.bids.find({"provider_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    
    # Add service request info
    for bid in bids:
        request = await db.service_requests.find_one({"id": bid["service_request_id"]})
        if request:
            bid["service_title"] = request["title"]
            bid["service_category"] = request["category"]
    
    return bids

# Provider Profile Routes
@api_router.post("/provider-profile")
async def create_provider_profile(profile_data: ProviderProfileCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can create profiles")
    
    # Check if profile already exists
    existing_profile = await db.provider_profiles.find_one({"user_id": current_user["id"]})
    if existing_profile:
        raise HTTPException(status_code=400, detail="Provider profile already exists")
    
    profile = ProviderProfile(**profile_data.dict(), user_id=current_user["id"])
    await db.provider_profiles.insert_one(profile.dict())
    return profile

@api_router.get("/provider-profile")
async def get_my_provider_profile(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can view profiles")
    
    profile = await db.provider_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    
    return profile

@api_router.put("/provider-profile")
async def update_provider_profile(profile_data: ProviderProfileCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can update profiles")
    
    profile = await db.provider_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    
    update_data = profile_data.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.provider_profiles.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    updated_profile = await db.provider_profiles.find_one({"user_id": current_user["id"]})
    return updated_profile

# Bid Messages (Negotiation)
@api_router.post("/bid-messages")
async def create_bid_message(message_data: BidMessageCreate, current_user: dict = Depends(get_current_user)):
    # Verify bid exists and user has access
    bid = await db.bids.find_one({"id": message_data.bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    # Check if user is either the bid owner or the service request owner
    request = await db.service_requests.find_one({"id": bid["service_request_id"]})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    user_is_provider = current_user["id"] == bid["provider_id"]
    user_is_customer = current_user["id"] == request["user_id"]
    
    if not user_is_provider and not user_is_customer:
        raise HTTPException(status_code=403, detail="Access denied")
    
    message = BidMessage(
        **message_data.dict(),
        sender_id=current_user["id"],
        sender_role=current_user["role"]
    )
    await db.bid_messages.insert_one(message.dict())
    return message

@api_router.get("/bid-messages/{bid_id}")
async def get_bid_messages(bid_id: str, current_user: dict = Depends(get_current_user)):
    # Verify access
    bid = await db.bids.find_one({"id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    request = await db.service_requests.find_one({"id": bid["service_request_id"]})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    user_is_provider = current_user["id"] == bid["provider_id"]
    user_is_customer = current_user["id"] == request["user_id"]
    
    if not user_is_provider and not user_is_customer:
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages = await db.bid_messages.find({"bid_id": bid_id}).sort("created_at", 1).to_list(100)
    
    # Add sender names
    for message in messages:
        user = await db.users.find_one({"id": message["sender_id"]})
        if user:
            message["sender_name"] = f"{user['first_name']} {user['last_name']}"
    
    return messages

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()