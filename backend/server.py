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
    "Events & Entertainment", "Emergency Services", "Automotive",
    "Beauty & Personal Care", "Pet Services", "Financial Services", "Other"
]

# Service Subcategories for better filtering
SERVICE_SUBCATEGORIES = {
    "Home Services": [
        "Plumbing", "Electrical", "HVAC", "Cleaning", "Landscaping", "Pest Control",
        "Appliance Repair", "Handyman", "Security Systems", "Pool Services"
    ],
    "Construction & Renovation": [
        "Kitchen Remodeling", "Bathroom Renovation", "Roofing", "Flooring",
        "Painting", "Carpentry", "Drywall", "Tile Work", "Windows & Doors", "Decking"
    ],
    "Professional Services": [
        "Legal", "Accounting", "Consulting", "Real Estate", "Insurance",
        "Architecture", "Engineering", "Translation", "Notary", "Research"
    ],
    "Technology & IT": [
        "Web Development", "Mobile App Development", "IT Support", "Cybersecurity",
        "Data Analysis", "Software Development", "Database Management", "Cloud Services",
        "SEO/Digital Marketing", "Computer Repair"
    ],
    "Creative & Design": [
        "Graphic Design", "Web Design", "Photography", "Video Production", "Copywriting",
        "Logo Design", "Branding", "Interior Design", "Fashion Design", "3D Modeling"
    ],
    "Business Services": [
        "Marketing", "HR Services", "Administrative Support", "Virtual Assistant",
        "Business Development", "Project Management", "Training", "Equipment Rental",
        "Delivery Services", "Bookkeeping"
    ],
    "Health & Wellness": [
        "Personal Training", "Nutrition Coaching", "Massage Therapy", "Mental Health",
        "Physical Therapy", "Yoga Instruction", "Wellness Coaching", "Medical Services",
        "Spa Services", "Fitness Coaching"
    ],
    "Education & Training": [
        "Tutoring", "Language Learning", "Music Lessons", "Art Instruction", "Test Prep",
        "Professional Training", "Workshop Facilitation", "Online Courses", "Coaching",
        "Skill Development"
    ],
    "Transportation": [
        "Moving Services", "Delivery", "Ride Services", "Logistics", "Freight",
        "Auto Transport", "Equipment Transport", "Courier Services", "Storage",
        "Packing Services"
    ],
    "Events & Entertainment": [
        "Event Planning", "Catering", "Entertainment", "DJ Services", "Photography",
        "Venue Rental", "Party Planning", "Wedding Services", "Corporate Events",
        "Audio/Visual Services"
    ],
    "Emergency Services": [
        "24/7 Plumbing", "Emergency Electrical", "Locksmith", "Towing", "Water Damage",
        "Fire Damage Restoration", "Storm Cleanup", "Emergency Repairs", "HVAC Emergency",
        "Security Response"
    ],
    "Automotive": [
        "Auto Repair", "Car Detailing", "Tire Services", "Oil Change", "Brake Repair",
        "Transmission", "Auto Body", "Car Inspection", "Mobile Mechanic", "Towing"
    ],
    "Beauty & Personal Care": [
        "Hair Styling", "Makeup Services", "Nail Services", "Skincare", "Barbering",
        "Spa Services", "Wedding Beauty", "Mobile Beauty", "Permanent Makeup", "Wellness"
    ],
    "Pet Services": [
        "Pet Grooming", "Dog Walking", "Pet Sitting", "Veterinary", "Pet Training",
        "Pet Photography", "Pet Transportation", "Pet Boarding", "Animal Care", "Pet Supplies"
    ],
    "Financial Services": [
        "Tax Preparation", "Financial Planning", "Investment Advice", "Insurance",
        "Mortgage Services", "Credit Repair", "Bookkeeping", "Payroll Services",
        "Business Finance", "Retirement Planning"
    ]
}

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
    proposal: str = ""
    start_date: Optional[str] = None  # When they can start (ISO date)
    duration_days: Optional[int] = None  # How many days they need
    duration_description: Optional[str] = None  # Human readable duration like "2-3 weeks"

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

@api_router.get("/subcategories/{category}")
async def get_subcategories(category: str):
    """Get subcategories for a specific main category"""
    if category in SERVICE_SUBCATEGORIES:
        return {"subcategories": SERVICE_SUBCATEGORIES[category]}
    else:
        return {"subcategories": []}

@api_router.get("/all-subcategories")
async def get_all_subcategories():
    """Get all categories and their subcategories"""
    return SERVICE_SUBCATEGORIES

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
    subcategory: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    deadline_before: Optional[str] = None,
    deadline_after: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    limit: Optional[int] = 20,  # Reduced default limit for better performance
    page: Optional[int] = 1,    # Added pagination
    urgency: Optional[str] = None,
    has_images: Optional[bool] = None,
    show_best_bids_only: Optional[bool] = None,
    min_budget: Optional[float] = None,
    max_budget: Optional[float] = None,
    distance_km: Optional[float] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
):
    """
    Get service requests with optimized performance and pagination
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
    
    # Enhanced budget filters
    budget_filter = {}
    min_bud = budget_min or min_budget
    max_bud = budget_max or max_budget
    
    if min_bud is not None:
        budget_filter["$gte"] = min_bud
    if max_bud is not None:
        budget_filter["$lte"] = max_bud
    
    if budget_filter:
        filter_dict["$or"] = [
            {"budget_min": budget_filter},
            {"budget_max": budget_filter}
        ]
    
    # Search filter (simplified for performance)
    if search:
        filter_dict["$text"] = {"$search": search}
    
    # Urgency filter (simplified)
    if urgency == "urgent":
        now = datetime.utcnow()
        urgent_deadline = now + timedelta(days=7)
        filter_dict["deadline"] = {"$lte": urgent_deadline, "$ne": None}
    elif urgency == "flexible":
        now = datetime.utcnow()
        flexible_deadline = now + timedelta(days=30)
        filter_dict["$or"] = [
            {"deadline": {"$gte": flexible_deadline}},
            {"deadline": None}
        ]
    
    # Images filter
    if has_images is not None:
        if has_images:
            filter_dict["images"] = {"$ne": [], "$exists": True}
        else:
            filter_dict["$or"] = [
                {"images": {"$eq": []}},
                {"images": {"$exists": False}}
            ]
    
    # Show best bids filter
    if show_best_bids_only:
        filter_dict["show_best_bids"] = True
    
    # Sort configuration
    valid_sort_fields = ["created_at", "budget_min", "budget_max", "deadline", "title"]
    sort_field = sort_by if sort_by in valid_sort_fields else "created_at"
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Pagination
    limit = min(max(1, limit), 50)  # Max 50 items per page
    skip = (page - 1) * limit
    
    # Optimized query with projection to return only needed fields
    projection = {
        "_id": 0,
        "id": 1,
        "user_id": 1,
        "title": 1,
        "description": 1,
        "category": 1,
        "budget_min": 1,
        "budget_max": 1,
        "deadline": 1,
        "location": 1,
        "status": 1,
        "show_best_bids": 1,
        "created_at": 1,
        "images": 1
    }
    
    requests = await db.service_requests.find(
        filter_dict, 
        projection
    ).sort(sort_field, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    # Batch process user info and bid counts for better performance
    user_ids = [req["user_id"] for req in requests]
    request_ids = [req["id"] for req in requests]
    
    # Get user info in batch
    users = await db.users.find(
        {"id": {"$in": user_ids}}, 
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1}
    ).to_list(len(user_ids))
    user_map = {user["id"]: f"{user['first_name']} {user['last_name']}" for user in users}
    
    # Get bid counts in batch
    bid_pipeline = [
        {"$match": {"service_request_id": {"$in": request_ids}}},
        {"$group": {
            "_id": "$service_request_id",
            "count": {"$sum": 1},
            "avg_price": {"$avg": "$price"},
            "min_price": {"$min": "$price"},
            "max_price": {"$max": "$price"}
        }}
    ]
    bid_stats = await db.bids.aggregate(bid_pipeline).to_list(len(request_ids))
    bid_map = {stat["_id"]: stat for stat in bid_stats}
    
    # Process results efficiently
    for request in requests:
        # Add user info
        request["user_name"] = user_map.get(request["user_id"], "Unknown User")
        
        # Add bid info
        bid_info = bid_map.get(request["id"], {})
        request["bid_count"] = bid_info.get("count", 0)
        if bid_info.get("avg_price"):
            request["avg_bid_price"] = round(bid_info["avg_price"], 2)
            request["min_bid_price"] = bid_info["min_price"]
            request["max_bid_price"] = bid_info["max_price"]
        
        # Calculate urgency level efficiently
        if request.get("deadline"):
            days_until_deadline = (request["deadline"] - datetime.utcnow()).days
            if days_until_deadline <= 3:
                request["urgency_level"] = "urgent"
            elif days_until_deadline <= 14:
                request["urgency_level"] = "moderate"
            else:
                request["urgency_level"] = "flexible"
        else:
            request["urgency_level"] = "flexible"
        
        # Add image count
        request["image_count"] = len(request.get("images", []))
    
    return serialize_mongo_doc(requests)
    
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

# Delete service request endpoint
@api_router.delete("/service-requests/{request_id}")
async def delete_service_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a service request - only by the owner"""
    # Check if request exists and belongs to user
    existing_request = await db.service_requests.find_one({"id": request_id})
    if not existing_request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if existing_request["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own requests")
    
    # Service requesters can now delete any of their requests, including in-progress ones
    # This gives them full control over their posts
    
    # Delete all associated bids first
    await db.bids.delete_many({"service_request_id": request_id})
    
    # Delete the service request
    result = await db.service_requests.delete_one({"id": request_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    return {"message": "Service request deleted successfully"}

# Update service request status endpoint
@api_router.patch("/service-requests/{request_id}/status")
async def update_service_request_status(
    request_id: str,
    status_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update service request status - only by the owner"""
    # Check if request exists and belongs to user
    existing_request = await db.service_requests.find_one({"id": request_id})
    if not existing_request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if existing_request["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only update your own requests")
    
    new_status = status_data.get("status")
    valid_statuses = ["open", "in_progress", "completed", "cancelled"]
    
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    # Update the status
    result = await db.service_requests.update_one(
        {"id": request_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    return {"message": f"Service request status updated to {new_status}"}

# Update service request endpoint
@api_router.put("/service-requests/{request_id}")
async def update_service_request(
    request_id: str,
    updates: dict,
    current_user: User = Depends(get_current_user)
):
    """Update a service request - only by the owner"""
    # Check if request exists and belongs to user
    existing_request = await db.service_requests.find_one({"id": request_id})
    if not existing_request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if existing_request["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only update your own requests")
    
    # Prevent updating completed/cancelled requests
    if existing_request["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot update completed or cancelled requests")
    
    # Validate and prepare updates
    allowed_fields = ["title", "description", "category", "budget_min", "budget_max", "deadline", "location", "images", "show_best_bids"]
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if "deadline" in filtered_updates and filtered_updates["deadline"]:
        try:
            filtered_updates["deadline"] = datetime.fromisoformat(filtered_updates["deadline"].replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid deadline format")
    
    filtered_updates["updated_at"] = datetime.utcnow()
    
    # Update the request
    result = await db.service_requests.update_one(
        {"id": request_id},
        {"$set": filtered_updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Return updated request
    updated_request = await db.service_requests.find_one({"id": request_id})
    return serialize_mongo_doc(updated_request)

# Accept a bid endpoint  
@api_router.post("/service-requests/{request_id}/accept-bid/{bid_id}")
async def accept_bid(
    request_id: str,
    bid_id: str,
    current_user: User = Depends(get_current_user)
):
    """Accept a bid for a service request"""
    # Check if request exists and belongs to user
    request_obj = await db.service_requests.find_one({"id": request_id})
    if not request_obj:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if request_obj["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only accept bids on your own requests")
    
    if request_obj["status"] != "open":
        raise HTTPException(status_code=400, detail="Can only accept bids on open requests")
    
    # Check if bid exists
    bid = await db.bids.find_one({"id": bid_id, "service_request_id": request_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    # Update bid status to accepted
    await db.bids.update_one(
        {"id": bid_id},
        {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
    )
    
    # Update request status to in_progress
    await db.service_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "in_progress", "accepted_bid_id": bid_id, "updated_at": datetime.utcnow()}}
    )
    
    # Reject all other bids for this request
    await db.bids.update_many(
        {"service_request_id": request_id, "id": {"$ne": bid_id}},
        {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Bid accepted successfully"}

# Decline a bid endpoint
@api_router.post("/service-requests/{request_id}/decline-bid/{bid_id}")
async def decline_bid(
    request_id: str,
    bid_id: str,
    current_user: User = Depends(get_current_user)
):
    """Decline a bid for a service request"""
    # Check if request exists and belongs to user
    request_obj = await db.service_requests.find_one({"id": request_id})
    if not request_obj:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if request_obj["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only decline bids on your own requests")
    
    # Check if bid exists
    bid = await db.bids.find_one({"id": bid_id, "service_request_id": request_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    if bid["status"] == "accepted":
        raise HTTPException(status_code=400, detail="Cannot decline an accepted bid")
    
    # Update bid status to declined
    await db.bids.update_one(
        {"id": bid_id},
        {"$set": {"status": "declined", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Bid declined successfully"}

# Contact bidder endpoint
@api_router.post("/contact-bidder/{bid_id}")
async def contact_bidder(
    bid_id: str,
    message_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Send a message to a bidder"""
    # Check if bid exists
    bid = await db.bids.find_one({"id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    # Check if request belongs to current user
    request_obj = await db.service_requests.find_one({"id": bid["service_request_id"]})
    if not request_obj or request_obj["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only contact bidders on your own requests")
    
    # Get bidder info
    bidder = await db.users.find_one({"id": bid["provider_id"]})
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")
    
    # Return contact information for client-side handling
    return {
        "bidder_email": bidder.get("email"),
        "bidder_phone": bidder.get("phone"), 
        "bidder_name": f"{bidder.get('first_name', '')} {bidder.get('last_name', '')}".strip(),
        "service_title": request_obj["title"],
        "suggested_subject": f"BidMe - Regarding your bid on: {request_obj['title']}",
        "suggested_message": message_data.get("message", f"Hi {bidder.get('first_name', '')},\n\nI received your bid on my request '{request_obj['title']}' and would like to discuss further.\n\nBest regards,\n{current_user.first_name}")
    }
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

# AI Recommendations endpoint with caching
@api_router.post("/ai-recommendations")
async def get_service_recommendations(request: LocationRecommendationRequest):
    """Get AI-powered service provider recommendations with caching"""
    
    # Create cache key based on request content
    cache_key = f"ai_rec_{hash(f'{request.service_category}_{request.description}_{request.location}')}"
    
    # Check if we have cached results (simulate with a simple in-memory cache)
    # In production, use Redis or similar
    
    try:
        # Get AI insights with timeout and fallback
        ai_insights = await asyncio.wait_for(
            get_ai_recommendations(
                request.service_category,
                request.description,
                request.location
            ),
            timeout=3.0  # 3 second timeout
        )
    except asyncio.TimeoutError:
        # Fallback to quick response if AI is slow
        ai_insights = {
            "qualifications": ["Licensed and insured", "Good reviews and ratings", "Relevant experience"],
            "questions": ["Are you licensed and insured?", "Can you provide references?", "What's your timeline?"],
            "red_flags": ["No license or insurance", "Unusually low prices", "Pressure for immediate payment"],
            "price_range": "Get multiple quotes for comparison",
            "timeline": "Discuss timeline expectations upfront"
        }
    
    # Get relevant service providers with optimized query
    recommended_providers = []
    if request.location:
        try:
            # Optimized query with limit and projection
            providers = await db.service_providers.find(
                {
                    "services": {"$in": [request.service_category]},
                    "location": {"$regex": request.location, "$options": "i"}
                },
                {  # Only return needed fields
                    "_id": 0,
                    "id": 1,
                    "business_name": 1,
                    "description": 1,
                    "location": 1,
                    "phone": 1,
                    "email": 1,
                    "website": 1,
                    "google_rating": 1,
                    "google_reviews_count": 1,
                    "verified": 1
                }
            ).sort("google_rating", -1).limit(3).to_list(3)  # Limit to 3 for speed
            
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
    verified_only: bool = False,
    min_rating: float = 0.0,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_distance_km: float = 50.0,
    limit: int = 20
):
    """Get service providers with filtering options"""
    try:
        # Build filter query
        filter_query = {}
        
        if category:
            filter_query["services"] = {"$in": [category]}
        
        if location:
            filter_query["location"] = {"$regex": location, "$options": "i"}
            
        if verified_only:
            filter_query["verified"] = True
            
        if min_rating > 0:
            filter_query["google_rating"] = {"$gte": min_rating}
        
        # Get providers
        providers = await db.service_providers.find(filter_query).limit(limit).to_list(limit)
        
        # Calculate distances if coordinates provided
        if latitude is not None and longitude is not None:
            import math
            
            def haversine_distance(lat1, lon1, lat2, lon2):
                """Calculate distance between two points using Haversine formula"""
                R = 6371  # Earth's radius in kilometers
                
                lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                
                a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
                c = 2 * math.asin(math.sqrt(a))
                return R * c
            
            # Add distance to each provider and filter by max distance
            filtered_providers = []
            for provider in providers:
                distance = haversine_distance(
                    latitude, longitude,
                    provider["latitude"], provider["longitude"]
                )
                if distance <= max_distance_km:
                    provider["distance_km"] = round(distance, 2)
                    filtered_providers.append(provider)
            
            # Sort by distance
            providers = sorted(filtered_providers, key=lambda x: x["distance_km"])
        
        return serialize_mongo_doc(providers)
        
    except Exception as e:
        print(f"Error getting service providers: {e}")
        return []

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
    """Initialize the database with realistic, comprehensive service providers"""
    sample_providers = [
        # Home Services - New York Area
        {
            "business_name": "Premier NYC Plumbing",
            "description": "24/7 emergency plumbing services in Manhattan and Brooklyn. Specializing in residential and commercial repairs, installations, and pipe replacements. Licensed, insured, and highly rated.",
            "services": ["Home Services", "Emergency Services"],
            "location": "Manhattan, NY",
            "latitude": 40.7589,
            "longitude": -73.9851,
            "phone": "(212) 555-0123",
            "email": "service@premierplumbing.nyc",
            "website": "https://premierplumbing.nyc",
            "google_rating": 4.9,
            "google_reviews_count": 467,
            "website_rating": 4.8,
            "verified": True
        },
        {
            "business_name": "Brooklyn Home Cleaners Pro",
            "description": "Professional residential and commercial cleaning services. Deep cleaning, regular maintenance, post-construction cleanup, and eco-friendly options available.",
            "services": ["Home Services"],
            "location": "Brooklyn, NY", 
            "latitude": 40.6782,
            "longitude": -73.9442,
            "phone": "(718) 555-0456",
            "email": "book@brooklyncleaners.com",
            "website": "https://brooklyncleaners.com",
            "google_rating": 4.7,
            "google_reviews_count": 328,
            "website_rating": 4.6,
            "verified": True
        },
        {
            "business_name": "Elite Electrical Services NYC",
            "description": "Master electricians serving all of NYC. Panel upgrades, wiring repairs, smart home installations, and electrical inspections. Same-day service available.",
            "services": ["Home Services"],
            "location": "Queens, NY",
            "latitude": 40.7282,
            "longitude": -73.7949,
            "phone": "(718) 555-0789",
            "email": "info@eliteelectricalnyc.com",
            "website": "https://eliteelectricalnyc.com",
            "google_rating": 4.8,
            "google_reviews_count": 291,
            "website_rating": 4.7,
            "verified": True
        },
        # Construction & Renovation - Los Angeles Area
        {
            "business_name": "Golden State Construction Co.",
            "description": "Award-winning general contractors specializing in kitchen and bathroom renovations, room additions, and complete home remodels. 20+ years serving Greater LA.",
            "services": ["Construction & Renovation"],
            "location": "Los Angeles, CA",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "phone": "(323) 555-1234",
            "email": "projects@goldenstateconst.com",
            "website": "https://goldenstateconst.com",
            "google_rating": 4.9,
            "google_reviews_count": 203,
            "website_rating": 4.9,
            "verified": True
        },
        {
            "business_name": "Pacific Roofing Specialists",
            "description": "Complete roofing solutions for residential and commercial properties. Tile, shingle, and flat roof installations, repairs, and maintenance. Storm damage specialists.",
            "services": ["Construction & Renovation"],
            "location": "Santa Monica, CA",
            "latitude": 34.0195,
            "longitude": -118.4912,
            "phone": "(310) 555-0567",
            "email": "estimates@pacificroofing.com", 
            "website": "https://pacificroofing.com",
            "google_rating": 4.8,
            "google_reviews_count": 445,
            "website_rating": 4.7,
            "verified": True
        },
        {
            "business_name": "Artisan Flooring & Design",
            "description": "Custom flooring installation and refinishing. Hardwood, laminate, tile, and luxury vinyl. Design consultation and complete floor makeovers.",
            "services": ["Construction & Renovation"],
            "location": "Beverly Hills, CA",
            "latitude": 34.0736,
            "longitude": -118.4004,
            "phone": "(310) 555-0890",
            "email": "design@artisanflooring.com",
            "website": "https://artisanflooring.com",
            "google_rating": 4.6,
            "google_reviews_count": 167,
            "website_rating": 4.5,
            "verified": True
        },
        # Professional Services - Chicago Area
        {
            "business_name": "Chicago Business Law Group",
            "description": "Full-service business law firm serving entrepreneurs and established companies. Contract drafting, corporate formation, employment law, and litigation support.",
            "services": ["Professional Services"],
            "location": "Chicago, IL",
            "latitude": 41.8781,
            "longitude": -87.6298,
            "phone": "(312) 555-2345",
            "email": "contact@chicagobusinesslaw.com",
            "website": "https://chicagobusinesslaw.com",
            "google_rating": 4.9,
            "google_reviews_count": 124,
            "website_rating": 4.8,
            "verified": True
        },
        {
            "business_name": "Windy City Accounting Services",
            "description": "Certified public accountants providing comprehensive tax services, bookkeeping, payroll, and business consulting for small to medium businesses.",
            "services": ["Professional Services"],
            "location": "Chicago, IL",
            "latitude": 41.8781,
            "longitude": -87.6298,
            "phone": "(312) 555-3456",
            "email": "info@windycityaccounting.com",
            "website": "https://windycityaccounting.com",
            "google_rating": 4.8,
            "google_reviews_count": 298,
            "website_rating": 4.7,
            "verified": True
        },
        # Technology & IT - San Francisco Bay Area
        {
            "business_name": "Bay Area Web Development",
            "description": "Full-stack web development and e-commerce solutions. Custom websites, mobile apps, and digital marketing services for businesses of all sizes.",
            "services": ["Technology & IT"],
            "location": "San Francisco, CA",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "phone": "(415) 555-4567",
            "email": "hello@bayareawebdev.com",
            "website": "https://bayareawebdev.com",
            "google_rating": 4.7,
            "google_reviews_count": 186,
            "website_rating": 4.6,
            "verified": True
        },
        {
            "business_name": "Silicon Valley IT Support",
            "description": "Comprehensive IT support and managed services. Network setup, cybersecurity, cloud migration, and 24/7 technical support for businesses.",
            "services": ["Technology & IT"],
            "location": "San Jose, CA",
            "latitude": 37.3382,
            "longitude": -121.8863,
            "phone": "(408) 555-5678",
            "email": "support@svitsupport.com",
            "website": "https://svitsupport.com",
            "google_rating": 4.8,
            "google_reviews_count": 234,
            "website_rating": 4.7,
            "verified": True
        },
        # Creative & Design - Various Locations
        {
            "business_name": "Creative Studio Miami",
            "description": "Award-winning graphic design and branding agency. Logo design, website design, marketing materials, and complete brand identity packages.",
            "services": ["Creative & Design"],
            "location": "Miami, FL",
            "latitude": 25.7617,
            "longitude": -80.1918,
            "phone": "(305) 555-6789",
            "email": "projects@creativestudiomiami.com",
            "website": "https://creativestudiomiami.com",
            "google_rating": 4.9,
            "google_reviews_count": 156,
            "website_rating": 4.8,
            "verified": True
        },
        {
            "business_name": "Austin Video Productions",
            "description": "Professional video production services. Corporate videos, commercials, documentaries, and event coverage. Full pre and post-production services.",
            "services": ["Creative & Design"],
            "location": "Austin, TX",
            "latitude": 30.2672,
            "longitude": -97.7431,
            "phone": "(512) 555-7890",
            "email": "info@austinvideoproductions.com",
            "website": "https://austinvideoproductions.com",
            "google_rating": 4.6,
            "google_reviews_count": 98,
            "website_rating": 4.5,
            "verified": True
        },
        # Business Services - Seattle Area
        {
            "business_name": "Seattle Marketing Consultants",
            "description": "Digital marketing specialists helping businesses grow online. SEO, PPC advertising, social media management, and content marketing strategies.",
            "services": ["Business Services"],
            "location": "Seattle, WA",
            "latitude": 47.6062,
            "longitude": -122.3321,
            "phone": "(206) 555-8901",
            "email": "grow@seattlemarketing.com",
            "website": "https://seattlemarketing.com",
            "google_rating": 4.7,
            "google_reviews_count": 143,
            "website_rating": 4.6,
            "verified": True
        },
        # Health & Wellness - Denver Area
        {
            "business_name": "Rocky Mountain Personal Training",
            "description": "Certified personal trainers offering in-home and outdoor fitness training. Nutrition coaching, weight loss programs, and athletic performance training.",
            "services": ["Health & Wellness"],
            "location": "Denver, CO",
            "latitude": 39.7392,
            "longitude": -104.9903,
            "phone": "(303) 555-9012",
            "email": "train@rockymountainpt.com",
            "website": "https://rockymountainpt.com",
            "google_rating": 4.8,
            "google_reviews_count": 267,
            "website_rating": 4.7,
            "verified": True
        },
        # Transportation - Boston Area
        {
            "business_name": "Boston Moving Experts",
            "description": "Professional moving and storage services. Local and long-distance moves, packing services, storage solutions, and specialty item handling.",
            "services": ["Transportation"],
            "location": "Boston, MA",
            "latitude": 42.3601,
            "longitude": -71.0589,
            "phone": "(617) 555-0123",
            "email": "move@bostonmovingexperts.com",
            "website": "https://bostonmovingexperts.com",
            "google_rating": 4.6,
            "google_reviews_count": 189,
            "website_rating": 4.5,
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
        print(f"Initialized {len(sample_providers)} comprehensive service providers")

async def initialize_sample_service_requests():
    """Initialize the database with realistic sample service requests"""
    sample_requests = [
        # Urgent requests
        {
            "title": "Emergency Plumbing - Kitchen Sink Leak",
            "description": "URGENT: My kitchen sink is leaking badly and flooding the floor. Need immediate plumbing repair. Water is everywhere and I need this fixed ASAP!",
            "category": "Home Services",
            "budget_min": 150.0,
            "budget_max": 400.0,
            "deadline": datetime.utcnow() + timedelta(days=1),
            "location": "Manhattan, NY",
            "status": "open",
            "show_best_bids": True,
            "images": []
        },
        {
            "title": "Website Development for New Restaurant",
            "description": "Need a professional website for my new restaurant opening next month. Must include online ordering, menu display, location info, and mobile-friendly design. Looking for experienced web developers with restaurant industry knowledge.",
            "category": "Technology & IT",
            "budget_min": 2000.0,
            "budget_max": 5000.0,
            "deadline": datetime.utcnow() + timedelta(days=21),
            "location": "San Francisco, CA",
            "status": "open",
            "show_best_bids": False,
            "images": []
        },
        {
            "title": "Logo Design and Branding Package",
            "description": "Startup tech company needs complete brand identity package including logo, business cards, letterhead, and brand guidelines. Looking for modern, professional design that appeals to young professionals.",
            "category": "Creative & Design",
            "budget_min": 800.0,
            "budget_max": 1500.0,
            "deadline": datetime.utcnow() + timedelta(days=14),
            "location": "Austin, TX",
            "status": "open",
            "show_best_bids": True,
            "images": []
        },
        {
            "title": "Kitchen Renovation - Full Remodel",
            "description": "Complete kitchen remodel including cabinets, countertops, appliances, flooring, and electrical work. Kitchen is 200 sq ft. Looking for experienced contractors with excellent references and portfolio of similar work.",
            "category": "Construction & Renovation",
            "budget_min": 15000.0,
            "budget_max": 25000.0,
            "deadline": datetime.utcnow() + timedelta(days=45),
            "location": "Los Angeles, CA",
            "status": "open",
            "show_best_bids": True,
            "images": []
        },
        {
            "title": "Personal Training - Weight Loss Program",
            "description": "Looking for certified personal trainer to help with weight loss goals. Need 3 sessions per week for 3 months. Prefer someone experienced with beginners who can provide nutrition guidance too.",
            "category": "Health & Wellness",
            "budget_min": 1200.0,
            "budget_max": 2000.0,
            "deadline": datetime.utcnow() + timedelta(days=7),
            "location": "Denver, CO",
            "status": "open",
            "show_best_bids": False,
            "images": []
        },
        {
            "title": "Business Tax Preparation and Consulting",
            "description": "Small business needs comprehensive tax preparation for 2024 including quarterly estimates for 2025. Also need advice on business deductions and expense tracking. Looking for CPA or enrolled agent.",
            "category": "Professional Services",
            "budget_min": 500.0,
            "budget_max": 1000.0,
            "deadline": datetime.utcnow() + timedelta(days=30),
            "location": "Chicago, IL",
            "status": "open",
            "show_best_bids": False,
            "images": []
        },
        {
            "title": "Wedding Photography - June 2025",
            "description": "Seeking experienced wedding photographer for outdoor ceremony and reception in June 2025. Need full day coverage (8 hours), engagement photos, and digital gallery with editing. Portfolio required.",
            "category": "Creative & Design",
            "budget_min": 2500.0,
            "budget_max": 4000.0,
            "deadline": datetime.utcnow() + timedelta(days=60),
            "location": "Miami, FL",
            "status": "open",
            "show_best_bids": True,
            "images": []
        },
        {
            "title": "House Cleaning Service - Weekly",
            "description": "Need reliable house cleaning service for 3-bedroom, 2-bathroom home. Looking for weekly cleaning with eco-friendly products. Must be insured and bonded with good references.",
            "category": "Home Services",
            "budget_min": 100.0,
            "budget_max": 200.0,
            "deadline": None,
            "location": "Seattle, WA",
            "status": "open",
            "show_best_bids": False,
            "images": []
        },
        {
            "title": "Mobile App Development - Fitness Tracker",
            "description": "Looking for mobile app developers to create iOS and Android fitness tracking app. Features needed: workout logging, progress tracking, social sharing, integration with wearables. Need full development and deployment.",
            "category": "Technology & IT",
            "budget_min": 8000.0,
            "budget_max": 15000.0,
            "deadline": datetime.utcnow() + timedelta(days=90),
            "location": "Boston, MA",
            "status": "open",
            "show_best_bids": True,
            "images": []
        },
        {
            "title": "Corporate Event Planning - Company Retreat",
            "description": "Planning 2-day company retreat for 50 employees. Need venue selection, catering, activities, transportation, and accommodation coordination. Looking for experienced corporate event planners.",
            "category": "Events & Entertainment",
            "budget_min": 5000.0,
            "budget_max": 10000.0,
            "deadline": datetime.utcnow() + timedelta(days=35),
            "location": "San Diego, CA",
            "status": "open",
            "show_best_bids": False,
            "images": []
        }
    ]

    # Check if requests already exist
    existing_count = await db.service_requests.count_documents({})
    if existing_count < 5:  # Only add if we have very few requests
        # Create a sample user first
        sample_user = {
            "id": str(uuid.uuid4()),
            "email": "demo@serviceconnect.com",
            "phone": "(555) 000-0000",
            "password_hash": get_password_hash("demopassword"),
            "roles": ["customer"],
            "first_name": "Demo",
            "last_name": "User",
            "is_verified": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Check if demo user already exists
        existing_user = await db.users.find_one({"email": "demo@serviceconnect.com"})
        if not existing_user:
            await db.users.insert_one(sample_user)
            user_id = sample_user["id"]
        else:
            user_id = existing_user["id"]
        
        # Add sample requests with the demo user
        for request_data in sample_requests:
            request_data["user_id"] = user_id
            request_data["id"] = str(uuid.uuid4())
            request_data["created_at"] = datetime.utcnow()
            request_data["updated_at"] = datetime.utcnow()
            
            request = ServiceRequest(**request_data)
            await db.service_requests.insert_one(request.dict())
        
        print(f"Initialized {len(sample_requests)} sample service requests")

# Clear test data endpoint (for development)
@api_router.post("/admin/clear-test-data")
async def clear_test_data():
    """Clear all test data from the database"""
    try:
        # Clear collections but keep the structure
        await db.service_requests.delete_many({})
        await db.bids.delete_many({})
        await db.bid_messages.delete_many({})
        await db.users.delete_many({})
        await db.provider_profiles.delete_many({})
        
        return {"message": "Test data cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing data: {str(e)}")

# Initialize sample data on startup
@app.on_event("startup")
async def startup_event():
    await initialize_sample_providers()
    await initialize_sample_service_requests()
    await create_database_indexes()

async def create_database_indexes():
    """Create database indexes for improved query performance"""
    try:
        # Service requests indexes
        await db.service_requests.create_index([("category", 1)])
        await db.service_requests.create_index([("status", 1)])
        await db.service_requests.create_index([("location", "text")])
        await db.service_requests.create_index([("created_at", -1)])
        await db.service_requests.create_index([("deadline", 1)])
        await db.service_requests.create_index([("budget_min", 1), ("budget_max", 1)])
        await db.service_requests.create_index([("user_id", 1)])
        
        # Create text index for search functionality
        await db.service_requests.create_index([
            ("title", "text"), 
            ("description", "text")
        ])
        
        # Service providers indexes
        await db.service_providers.create_index([("services", 1)])
        await db.service_providers.create_index([("location", "text")])
        await db.service_providers.create_index([("google_rating", -1)])
        await db.service_providers.create_index([("verified", 1)])
        
        # Bids indexes
        await db.bids.create_index([("service_request_id", 1)])
        await db.bids.create_index([("provider_id", 1)])
        await db.bids.create_index([("created_at", -1)])
        await db.bids.create_index([("price", 1)])
        
        # Users indexes
        await db.users.create_index([("email", 1)], unique=True)
        await db.users.create_index([("id", 1)], unique=True)
        
        print("✅ Database indexes created successfully for improved performance")
        
    except Exception as e:
        print(f"⚠️ Warning: Could not create some indexes: {e}")
        # Continue anyway as indexes are performance optimization, not critical

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