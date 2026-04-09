from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import secrets

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user["id"] = str(user["_id"])  # Add id field for consistency
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: str

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    participants: List[str]
    date: Optional[str] = None

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    participants: Optional[List[str]] = None

class ExpenseResponse(BaseModel):
    id: str
    title: str
    amount: float
    category: str
    paid_by: str
    paid_by_name: str
    participants: List[str]
    split_amount: float
    date: str
    month_year: str
    created_at: str

@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(data.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": data.name,
        "role": "user",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": email,
        "name": data.name,
        "role": "user",
        "is_active": True,
        "created_at": user_doc["created_at"].isoformat()
    }

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "is_active": user["is_active"],
        "created_at": user["created_at"].isoformat()
    }

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"password_hash": 0}).to_list(100)
    return [
        {
            "id": str(u["_id"]),
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "is_active": u["is_active"],
            "created_at": u["created_at"].isoformat()
        }
        for u in users
    ]

@api_router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user["is_active"]
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": new_status}})
    
    return {"id": user_id, "is_active": new_status}

@api_router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(data: ExpenseCreate, user: dict = Depends(get_current_user)):
    if not data.participants:
        raise HTTPException(status_code=400, detail="At least one participant is required")
    
    expense_date = datetime.fromisoformat(data.date) if data.date else datetime.now(timezone.utc)
    month_year = expense_date.strftime("%Y-%m")
    
    split_amount = data.amount / len(data.participants)
    
    expense_doc = {
        "title": data.title,
        "amount": data.amount,
        "category": data.category,
        "paid_by": user["id"],
        "paid_by_name": user["name"],
        "participants": data.participants,
        "split_amount": split_amount,
        "date": expense_date,
        "month_year": month_year,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.expenses.insert_one(expense_doc)
    
    return {
        "id": str(result.inserted_id),
        "title": data.title,
        "amount": data.amount,
        "category": data.category,
        "paid_by": user["id"],
        "paid_by_name": user["name"],
        "participants": data.participants,
        "split_amount": split_amount,
        "date": expense_date.isoformat(),
        "month_year": month_year,
        "created_at": expense_doc["created_at"].isoformat()
    }

@api_router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(month_year: Optional[str] = None, user: dict = Depends(get_current_user)):
    if not month_year:
        month_year = datetime.now(timezone.utc).strftime("%Y-%m")
    
    expenses = await db.expenses.find({"month_year": month_year}).sort("date", -1).to_list(1000)
    
    return [
        {
            "id": str(e["_id"]),
            "title": e["title"],
            "amount": e["amount"],
            "category": e["category"],
            "paid_by": e["paid_by"],
            "paid_by_name": e["paid_by_name"],
            "participants": e["participants"],
            "split_amount": e["split_amount"],
            "date": e["date"].isoformat(),
            "month_year": e["month_year"],
            "created_at": e["created_at"].isoformat()
        }
        for e in expenses
    ]

@api_router.get("/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: str, user: dict = Depends(get_current_user)):
    expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {
        "id": str(expense["_id"]),
        "title": expense["title"],
        "amount": expense["amount"],
        "category": expense["category"],
        "paid_by": expense["paid_by"],
        "paid_by_name": expense["paid_by_name"],
        "participants": expense["participants"],
        "split_amount": expense["split_amount"],
        "date": expense["date"].isoformat(),
        "month_year": expense["month_year"],
        "created_at": expense["created_at"].isoformat()
    }

@api_router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: str, data: ExpenseUpdate, user: dict = Depends(get_current_user)):
    expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title
    if data.amount is not None:
        update_data["amount"] = data.amount
        if data.participants is not None:
            update_data["split_amount"] = data.amount / len(data.participants)
        else:
            update_data["split_amount"] = data.amount / len(expense["participants"])
    if data.category is not None:
        update_data["category"] = data.category
    if data.participants is not None:
        update_data["participants"] = data.participants
        if data.amount is not None:
            update_data["split_amount"] = data.amount / len(data.participants)
        else:
            update_data["split_amount"] = expense["amount"] / len(data.participants)
    
    if update_data:
        await db.expenses.update_one({"_id": ObjectId(expense_id)}, {"$set": update_data})
    
    updated_expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    
    return {
        "id": str(updated_expense["_id"]),
        "title": updated_expense["title"],
        "amount": updated_expense["amount"],
        "category": updated_expense["category"],
        "paid_by": updated_expense["paid_by"],
        "paid_by_name": updated_expense["paid_by_name"],
        "participants": updated_expense["participants"],
        "split_amount": updated_expense["split_amount"],
        "date": updated_expense["date"].isoformat(),
        "month_year": updated_expense["month_year"],
        "created_at": updated_expense["created_at"].isoformat()
    }

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"_id": ObjectId(expense_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

@api_router.get("/expenses/summary/current")
async def get_expenses_summary(month_year: Optional[str] = None, user: dict = Depends(get_current_user)):
    if not month_year:
        month_year = datetime.now(timezone.utc).strftime("%Y-%m")
    
    expenses = await db.expenses.find({"month_year": month_year}).to_list(1000)
    
    total_group_expenses = sum(e["amount"] for e in expenses)
    
    my_expenses = [e for e in expenses if e["paid_by"] == user["id"]]
    total_paid_by_me = sum(e["amount"] for e in my_expenses)
    
    my_share = sum(e["split_amount"] for e in expenses if user["id"] in e["participants"])
    
    balance = total_paid_by_me - my_share
    
    category_breakdown = {}
    for e in expenses:
        if e["category"] not in category_breakdown:
            category_breakdown[e["category"]] = 0
        category_breakdown[e["category"]] += e["amount"]
    
    return {
        "total_group_expenses": total_group_expenses,
        "total_paid_by_me": total_paid_by_me,
        "my_share": my_share,
        "balance": balance,
        "category_breakdown": category_breakdown,
        "month_year": month_year
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.expenses.create_index("month_year")
    await db.expenses.create_index("paid_by")
    
    predefined_users = [
        {"name": "Akash Pradhan", "email": "akash@flatledger.com", "password": "akash123"},
        {"name": "Devansh Pradhan", "email": "devansh@flatledger.com", "password": "devansh123"},
        {"name": "Abhishek Singh", "email": "abhishek@flatledger.com", "password": "abhishek123"},
        {"name": "Raj Singh", "email": "raj@flatledger.com", "password": "raj123"},
        {"name": "Umang Shrivastava", "email": "umang@flatledger.com", "password": "umang123"}
    ]
    
    for user_data in predefined_users:
        existing = await db.users.find_one({"email": user_data["email"]})
        if not existing:
            hashed = hash_password(user_data["password"])
            await db.users.insert_one({
                "email": user_data["email"],
                "password_hash": hashed,
                "name": user_data["name"],
                "role": "user",
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            })
            logger.info(f"Created user: {user_data['name']}")
        elif not verify_password(user_data["password"], existing["password_hash"]):
            await db.users.update_one(
                {"email": user_data["email"]},
                {"$set": {"password_hash": hash_password(user_data["password"])}}
            )
            logger.info(f"Updated password for user: {user_data['name']}")
    
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials for Flat Ledger\n\n")
        f.write("## Predefined Users\n\n")
        for user_data in predefined_users:
            f.write(f"- **{user_data['name']}**\n")
            f.write(f"  - Email: {user_data['email']}\n")
            f.write(f"  - Password: {user_data['password']}\n\n")
        f.write("## Auth Endpoints\n\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n\n")
        f.write("## Expense Endpoints\n\n")
        f.write("- POST /api/expenses\n")
        f.write("- GET /api/expenses\n")
        f.write("- GET /api/expenses/{id}\n")
        f.write("- PUT /api/expenses/{id}\n")
        f.write("- DELETE /api/expenses/{id}\n")
        f.write("- GET /api/expenses/summary/current\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()