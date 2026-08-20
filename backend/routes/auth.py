from fastapi import APIRouter, HTTPException, Form
from backend.database import db

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup")
async def signup(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    name: str = Form(...)
):
    if role not in ["patient", "clinician"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    user = db.create_user(email, password, role, name)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    return user

@router.post("/login")
async def login(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...)
):
    user = db.authenticate_user(email, password)
    if not user or user["role"] != role:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    return user
