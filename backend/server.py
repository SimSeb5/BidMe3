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
import json
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

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
    roles: List[str] = ["customer"]  # Can have multiple roles: customer, provider
    first_name: str
    last_name: str
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str
    role: str  # Will be converted to roles list
    first_name: str
    last_name: str

class UserRoleUpdate(BaseModel):
    roles: List[str]

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
    images: List[str] = []  # Base64 encoded images or image URLs
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
    images: List[str] = []  # Base64 encoded images
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

class LocationRecommendationRequest(BaseModel):
    service_category: str
    description: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ServiceProvider(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_name: str
    description: str
    services: List[str]
    location: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    google_rating: float = 0.0
    google_reviews_count: int = 0
    website_rating: float = 0.0
    verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
        roles=[user_data.role],  # Convert single role to list
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
    
    user_dict = serialize_mongo_doc(user)
    user_dict.pop("password_hash", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    current_user.pop("password_hash", None)
    return serialize_mongo_doc(current_user)

# Service Request Routes
@api_router.post("/service-requests", response_model=ServiceRequest)
async def create_service_request(request_data: ServiceRequestCreate, current_user: dict = Depends(get_current_user)):
    if "customer" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Only customers can create service requests")
    
    service_request = ServiceRequest(**request_data.dict(), user_id=current_user["id"])
    await db.service_requests.insert_one(service_request.dict())
    return service_request

@api_router.get("/service-requests", response_model=List[Dict[str, Any]])
async def get_service_requests(
    category: Optional[str] = None, 
    status: Optional[str] = None,
    location: Optional[str] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    deadline_before: Optional[str] = None,
    deadline_after: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    limit: Optional[int] = 100
):
    """
    Get service requests with advanced filtering options
    
    Parameters:
    - category: Filter by service category
    - status: Filter by request status (open, in_progress, completed, cancelled)
    - location: Filter by location (partial match)
    - budget_min: Minimum budget filter
    - budget_max: Maximum budget filter
    - deadline_before: Filter requests with deadline before this date (ISO format)
    - deadline_after: Filter requests with deadline after this date (ISO format)
    - search: Search in title and description
    - sort_by: Sort field (created_at, budget_min, budget_max, deadline)
    - sort_order: Sort order (asc, desc)
    - limit: Maximum number of results
    """
    filter_dict = {}
    
    # Basic filters
    if category:
        filter_dict["category"] = category
    if status:
        filter_dict["status"] = status
    
    # Location filter (case-insensitive partial match)
    if location:
        filter_dict["location"] = {"$regex": location, "$options": "i"}
    
    # Budget filters
    budget_filter = {}
    if budget_min is not None:
        budget_filter["$gte"] = budget_min
    if budget_max is not None:
        budget_filter["$lte"] = budget_max
    
    if budget_filter:
        # Filter where either budget_min or budget_max falls within range
        filter_dict["$or"] = [
            {"budget_min": budget_filter},
            {"budget_max": budget_filter},
            {"$and": [
                {"budget_min": {"$lte": budget_max if budget_max else float('inf')}},
                {"budget_max": {"$gte": budget_min if budget_min else 0}}
            ]}
        ]
    
    # Deadline filters
    if deadline_before or deadline_after:
        deadline_filter = {}
        if deadline_before:
            try:
                deadline_filter["$lte"] = datetime.fromisoformat(deadline_before.replace('Z', '+00:00'))
            except ValueError:
                pass
        if deadline_after:
            try:
                deadline_filter["$gte"] = datetime.fromisoformat(deadline_after.replace('Z', '+00:00'))
            except ValueError:
                pass
        if deadline_filter:
            filter_dict["deadline"] = deadline_filter
    
    # Search filter (in title and description)
    if search:
        filter_dict["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Sort configuration
    sort_field = sort_by if sort_by in ["created_at", "budget_min", "budget_max", "deadline", "title"] else "created_at"
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Limit validation
    limit = min(max(1, limit), 500)  # Between 1 and 500
    
    requests = await db.service_requests.find(filter_dict).sort(sort_field, sort_direction).limit(limit).to_list(limit)
    
    # Add user info and bid count for each request
    for request in requests:
        user = await db.users.find_one({"id": request["user_id"]})
        if user:
            request["user_name"] = f"{user['first_name']} {user['last_name']}"
        
        # Get bid count
        bid_count = await db.bids.count_documents({"service_request_id": request["id"]})
        request["bid_count"] = bid_count
        
        # Add average bid price if bids exist
        if bid_count > 0:
            pipeline = [
                {"$match": {"service_request_id": request["id"]}},
                {"$group": {"_id": None, "avg_price": {"$avg": "$price"}, "min_price": {"$min": "$price"}, "max_price": {"$max": "$price"}}}
            ]
            bid_stats = await db.bids.aggregate(pipeline).to_list(1)
            if bid_stats:
                request["avg_bid_price"] = round(bid_stats[0]["avg_price"], 2)
                request["min_bid_price"] = bid_stats[0]["min_price"]
                request["max_bid_price"] = bid_stats[0]["max_price"]
    
    return serialize_mongo_doc(requests)

@api_router.get("/service-requests/{request_id}")
async def get_service_request(request_id: str):
    request = await db.service_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Add user info
    user = await db.users.find_one({"id": request["user_id"]})
    if user:
        request["user_name"] = f"{user['first_name']} {user['last_name']}"
    
    return serialize_mongo_doc(request)

@api_router.get("/my-requests")
async def get_my_requests(current_user: dict = Depends(get_current_user)):
    requests = await db.service_requests.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    
    for request in requests:
        bid_count = await db.bids.count_documents({"service_request_id": request["id"]})
        request["bid_count"] = bid_count
    
    return serialize_mongo_doc(requests)

# Bid Routes
@api_router.post("/bids", response_model=Bid)
async def create_bid(bid_data: BidCreate, current_user: dict = Depends(get_current_user)):
    if "provider" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Only providers can create bids")
    
    # Rest of the function remains the same...
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
    
    return serialize_mongo_doc(bids)

@api_router.get("/my-bids")
async def get_my_bids(current_user: dict = Depends(get_current_user)):
    if "provider" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Only providers can view bids")
    
    bids = await db.bids.find({"provider_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    
    # Add service request info
    for bid in bids:
        request = await db.service_requests.find_one({"id": bid["service_request_id"]})
        if request:
            bid["service_title"] = request["title"]
            bid["service_category"] = request["category"]
    
    return serialize_mongo_doc(bids)

# Provider Profile Routes
@api_router.post("/provider-profile")
async def create_provider_profile(profile_data: ProviderProfileCreate, current_user: dict = Depends(get_current_user)):
    if "provider" not in current_user.get("roles", []):
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
    if "provider" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Only providers can view profiles")
    
    profile = await db.provider_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    
    return serialize_mongo_doc(profile)

@api_router.put("/provider-profile")
async def update_provider_profile(profile_data: ProviderProfileCreate, current_user: dict = Depends(get_current_user)):
    if "provider" not in current_user.get("roles", []):
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
    return serialize_mongo_doc(updated_profile)

# User Role Management
@api_router.post("/user/add-role")
async def add_user_role(role_data: dict, current_user: dict = Depends(get_current_user)):
    """Add a new role to user (customer can become provider and vice versa)"""
    new_role = role_data.get("role")
    if new_role not in ["customer", "provider"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    current_roles = current_user.get("roles", [])
    if new_role not in current_roles:
        current_roles.append(new_role)
        
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"roles": current_roles, "updated_at": datetime.utcnow()}}
        )
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    return serialize_mongo_doc(updated_user)

@api_router.get("/user/roles")
async def get_user_roles(current_user: dict = Depends(get_current_user)):
    """Get current user's roles"""
    return {"roles": current_user.get("roles", [])}

# Image upload endpoint
@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Upload image and return base64 encoded string"""
    try:
        # Read file content
        contents = await file.read()
        
        # Convert to base64
        import base64
        encoded_string = base64.b64encode(contents).decode('utf-8')
        
        # Return with proper data URL format
        file_type = file.content_type or 'image/jpeg'
        data_url = f"data:{file_type};base64,{encoded_string}"
        
        return {"image": data_url, "filename": file.filename}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image upload failed: {str(e)}")

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
        sender_role="provider" if "provider" in current_user.get("roles", []) else "customer"
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
    
    return serialize_mongo_doc(messages)

# AI Recommendations endpoint
@api_router.post("/ai-recommendations")
async def get_service_recommendations(request: LocationRecommendationRequest):
    """Get AI-powered service provider recommendations"""
    ai_insights = await get_ai_recommendations(
        request.service_category,
        request.description,
        request.location
    )
    
    # Get relevant service providers if location is provided
    recommended_providers = []
    if request.location:
        try:
            # Search for providers in the same location/area
            providers = await db.service_providers.find({
                "services": {"$in": [request.service_category]},
                "location": {"$regex": request.location, "$options": "i"}
            }).sort("google_rating", -1).limit(5).to_list(5)
            
            recommended_providers = serialize_mongo_doc(providers)
            
        except Exception as e:
            print(f"Error fetching providers: {e}")
    
    return {
        "ai_insights": ai_insights,
        "recommended_providers": recommended_providers,
        "total_providers_found": len(recommended_providers)
    }

# Service Providers endpoints
@api_router.get("/service-providers")
async def get_service_providers(
    category: Optional[str] = None,
    location: Optional[str] = None,
    verified_only: Optional[bool] = False,
    min_rating: Optional[float] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = 50.0,
    limit: Optional[int] = 50
):
    """
    Get service providers with filtering options
    
    Parameters:
    - category: Filter by service category
    - location: Filter by location (partial match)
    - verified_only: Show only verified providers
    - min_rating: Minimum Google rating
    - latitude/longitude: Center point for distance-based search
    - radius_km: Search radius in kilometers (default: 50km)
    - limit: Maximum number of results
    """
    filter_dict = {}
    
    # Category filter
    if category:
        filter_dict["services"] = {"$in": [category]}
    
    # Location filter
    if location:
        filter_dict["location"] = {"$regex": location, "$options": "i"}
    
    # Verified filter
    if verified_only:
        filter_dict["verified"] = True
    
    # Rating filter
    if min_rating is not None:
        filter_dict["google_rating"] = {"$gte": min_rating}
    
    # Geographic proximity filter
    if latitude is not None and longitude is not None:
        # MongoDB geospatial query for providers within radius
        filter_dict["latitude"] = {
            "$gte": latitude - (radius_km / 111.0),  # Rough conversion: 1 degree ≈ 111km
            "$lte": latitude + (radius_km / 111.0)
        }
        filter_dict["longitude"] = {
            "$gte": longitude - (radius_km / (111.0 * abs(latitude / 90.0))),
            "$lte": longitude + (radius_km / (111.0 * abs(latitude / 90.0)))
        }
    
    # Limit validation
    limit = min(max(1, limit), 200)
    
    providers = await db.service_providers.find(filter_dict).sort("google_rating", -1).limit(limit).to_list(limit)
    
    # Calculate distance if coordinates provided
    if latitude is not None and longitude is not None:
        import math
        
        def calculate_distance(lat1, lon1, lat2, lon2):
            """Calculate distance between two points using Haversine formula"""
            R = 6371  # Earth's radius in kilometers
            
            lat1_rad = math.radians(lat1)
            lon1_rad = math.radians(lon1)
            lat2_rad = math.radians(lat2)
            lon2_rad = math.radians(lon2)
            
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            
            a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            
            return R * c
        
        for provider in providers:
            distance = calculate_distance(
                latitude, longitude,
                provider["latitude"], provider["longitude"]
            )
            provider["distance_km"] = round(distance, 2)
        
        # Sort by distance if coordinates provided
        providers.sort(key=lambda x: x.get("distance_km", float('inf')))
    
    return serialize_mongo_doc(providers)

@api_router.get("/service-providers/{provider_id}")
async def get_service_provider(provider_id: str):
    """Get detailed information about a specific service provider"""
    provider = await db.service_providers.find_one({"id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Service provider not found")
    
    return serialize_mongo_doc(provider)

async def get_ai_recommendations(service_category: str, description: str, location: str = None):
    """Get AI-powered service provider recommendations"""
    try:
        # Initialize AI chat
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"recommendations_{uuid.uuid4()}",
            system_message="""You are an AI assistant that helps match customers with the best service providers based on their location and service needs.

Your task is to analyze service requests and recommend the most suitable providers from a database.

You should consider:
1. Geographic proximity to the customer
2. Service category match
3. Provider ratings and reviews
4. Provider specializations
5. Availability and response time

Always provide practical, helpful recommendations with clear reasoning."""
        ).with_model("openai", "gpt-4o-mini")

        # Create recommendation prompt
        user_message = UserMessage(
            text=f"""Please help me find the best service providers for this request:

Service Category: {service_category}
Description: {description}
Location: {location or "Not specified"}

Based on this information, what should I look for in service providers? Please provide:
1. Key qualifications to look for
2. Important questions to ask providers
3. Red flags to avoid
4. Typical price ranges for this service
5. Timeline expectations

Format your response as a JSON object with these keys: qualifications, questions, red_flags, price_range, timeline."""
        )

        # Get AI response
        response = await chat.send_message(user_message)
        
        # Try to parse JSON response
        try:
            ai_insights = json.loads(response)
        except:
            # Fallback if JSON parsing fails
            ai_insights = {
                "qualifications": ["Licensed and insured", "Good reviews and ratings", "Relevant experience"],
                "questions": ["Are you licensed and insured?", "Can you provide references?", "What's your timeline?"],
                "red_flags": ["No license or insurance", "Unusually low prices", "Pressure for immediate payment"],
                "price_range": "Varies by project scope",
                "timeline": "Depends on project complexity"
            }

        return ai_insights

    except Exception as e:
        print(f"AI recommendation error: {e}")
        # Return fallback recommendations
        return {
            "qualifications": ["Licensed and insured", "Good reviews and ratings", "Relevant experience"],
            "questions": ["Are you licensed and insured?", "Can you provide references?", "What's your timeline?"],
            "red_flags": ["No license or insurance", "Unusually low prices", "Pressure for immediate payment"],
            "price_range": "Get multiple quotes for comparison",
            "timeline": "Discuss timeline expectations upfront"
        }

async def initialize_sample_providers():
    """Initialize the database with realistic service providers"""
    sample_providers = [
        # Home Services - New York
        {
            "business_name": "Elite Plumbing Solutions",
            "description": "Professional plumbing services with 15+ years experience. Emergency repairs, installations, and maintenance.",
            "services": ["Home Services"],
            "location": "New York, NY",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "phone": "(212) 555-0123",
            "email": "contact@eliteplumbing.com",
            "website": "https://eliteplumbing.com",
            "google_rating": 4.8,
            "google_reviews_count": 234,
            "website_rating": 4.7,
            "verified": True
        },
        {
            "business_name": "Brooklyn Electric Pro",
            "description": "Licensed electricians serving NYC. Residential and commercial electrical services.",
            "services": ["Home Services"],
            "location": "Brooklyn, NY", 
            "latitude": 40.6782,
            "longitude": -73.9442,
            "phone": "(718) 555-0456",
            "email": "info@brooklynelectric.com",
            "website": "https://brooklynelectric.com",
            "google_rating": 4.6,
            "google_reviews_count": 189,
            "website_rating": 4.5,
            "verified": True
        },
        # Construction - Los Angeles
        {
            "business_name": "Sunshine Construction Group",
            "description": "Full-service construction company specializing in residential renovations and custom builds.",
            "services": ["Construction & Renovation"],
            "location": "Los Angeles, CA",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "phone": "(323) 555-0789",
            "email": "projects@sunshineconst.com",
            "website": "https://sunshineconst.com",
            "google_rating": 4.9,
            "google_reviews_count": 156,
            "website_rating": 4.8,
            "verified": True
        },
        {
            "business_name": "Precision Roofing LA",
            "description": "Expert roofing contractors with 20+ years experience. Repairs, replacements, and inspections.",
            "services": ["Construction & Renovation"],
            "location": "Santa Monica, CA",
            "latitude": 34.0195,
            "longitude": -118.4912,
            "phone": "(310) 555-0234",
            "email": "info@precisionroofing.com", 
            "website": "https://precisionroofing.com",
            "google_rating": 4.7,
            "google_reviews_count": 203,
            "website_rating": 4.6,
            "verified": True
        },
        # Professional Services - Chicago
        {
            "business_name": "Midwest Legal Advisors",
            "description": "Experienced attorneys providing business law, contracts, and legal consultation services.",
            "services": ["Professional Services"],
            "location": "Chicago, IL",
            "latitude": 41.8781,
            "longitude": -87.6298,
            "phone": "(312) 555-0567",
            "email": "contact@midwestlegal.com",
            "website": "https://midwestlegal.com",
            "google_rating": 4.9,
            "google_reviews_count": 87,
            "website_rating": 4.8,
            "verified": True
        },
        {
            "business_name": "Chicago CPA Partners",
            "description": "Certified public accountants offering tax preparation, bookkeeping, and business consulting.",
            "services": ["Professional Services"],
            "location": "Chicago, IL",
            "latitude": 41.8781,
            "longitude": -87.6298,
            "phone": "(312) 555-0890",
            "email": "info@chicagocpa.com",
            "website": "https://chicagocpa.com",
            "google_rating": 4.8,
            "google_reviews_count": 142,
            "website_rating": 4.7,
            "verified": True
        },
        # Technology - San Francisco
        {
            "business_name": "Bay Area Tech Solutions",
            "description": "IT consulting, web development, and digital transformation services for businesses.",
            "services": ["Technology & IT"],
            "location": "San Francisco, CA",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "phone": "(415) 555-0123",
            "email": "hello@baytech.com",
            "website": "https://baytech.com",
            "google_rating": 4.6,
            "google_reviews_count": 98,
            "website_rating": 4.5,
            "verified": True
        },
        {
            "business_name": "Silicon Valley Apps",
            "description": "Mobile app development and software consulting for startups and enterprises.",
            "services": ["Technology & IT"],
            "location": "Palo Alto, CA",
            "latitude": 37.4419,
            "longitude": -122.1430,
            "phone": "(650) 555-0456",
            "email": "contact@svapps.com",
            "website": "https://svapps.com",
            "google_rating": 4.7,
            "google_reviews_count": 76,
            "website_rating": 4.6,
            "verified": True
        }
    ]

    # Check if providers already exist
    existing_count = await db.service_providers.count_documents({})
    if existing_count == 0:
        # Add sample providers
        for provider_data in sample_providers:
            provider = ServiceProvider(**provider_data)
            await db.service_providers.insert_one(provider.dict())
        print(f"Initialized {len(sample_providers)} sample service providers")

# Initialize sample data on startup
@app.on_event("startup")
async def startup_event():
    await initialize_sample_providers()

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