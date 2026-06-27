from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any
import random
from app.db.supabase import supabase_repository
from app.core.config import get_settings, Settings
from app.db import local_db
from app.services.email_service import send_otp_email

router = APIRouter(prefix="/auth", tags=["auth"])

class AuthRequest(BaseModel):
    email: str
    password: str
    name: str = None

class ProfileSaveRequest(BaseModel):
    email: str
    profile_facts: dict[str, Any]
    chat_messages: list[Any] = None

class OTPRequest(BaseModel):
    email: str

class OTPVerifyRequest(BaseModel):
    email: str
    password: str
    name: str = None
    otp: str

class DeleteAccountRequest(BaseModel):
    email: str
    password: str

@router.post("/request-otp")
def request_otp(req: OTPRequest, settings: Settings = Depends(get_settings)):
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    # Check if user already exists
    if local_db.get_user(email):
        raise HTTPException(status_code=400, detail="User already exists.")
    
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    local_db.save_otp(email, otp)
    
    # Print clearly to backend console log for developer testing
    print("\n" + "="*60)
    print(f" [FormZero EMAIL VERIFICATION OTP] ".center(60, "*"))
    print(f"Code for {email}: {otp}".center(60))
    print("="*60 + "\n")
    
    # Try to send via real SMTP email
    email_sent = send_otp_email(
        to_email=email,
        otp_code=otp,
        smtp_host=settings.smtp_host,
        smtp_port=settings.smtp_port,
        smtp_user=settings.smtp_user,
        smtp_password=settings.smtp_password,
        from_email=settings.smtp_from_email,
    )
    
    response = {
        "status": "success",
        "message": f"Verification code sent to {email}.",
        "email_sent": email_sent,
    }
    
    # Only return dev_otp in response when SMTP is NOT configured (dev/testing mode)
    if not email_sent:
        response["dev_otp"] = otp
    
    return response


@router.get("/test-smtp")
def test_smtp(settings: Settings = Depends(get_settings)):
    email_sent = send_otp_email(
        to_email="imnavneet2901@gmail.com",
        otp_code="111111",
        smtp_host=settings.smtp_host,
        smtp_port=settings.smtp_port,
        smtp_user=settings.smtp_user,
        smtp_password=settings.smtp_password,
        from_email=settings.smtp_from_email,
    )
    return {"status": "success" if email_sent else "fail"}




@router.post("/verify-otp")
def verify_otp(req: OTPVerifyRequest, settings: Settings = Depends(get_settings)):
    email = req.email.strip().lower()
    password = req.password
    name = req.name.strip() if req.name else ""
    otp = req.otp.strip()
    
    # Verify OTP
    if not local_db.verify_otp(email, otp):
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    
    # Create user in SQLite
    user_created = local_db.create_user(email, password, name)
    if not user_created:
        raise HTTPException(status_code=400, detail="User already exists.")
        
    # Sync with Supabase Auth if credentials exist
    if settings.supabase_url and settings.supabase_anon_key:
        try:
            supabase_repository.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": name
                    }
                }
            })
            payload = {
                "email": email,
                "profile_facts": {"full_name": name}
            }
            supabase_repository.client.table("user_profiles").upsert(payload, on_conflict="email").execute()
        except Exception:
            pass
            
    return {
        "status": "success",
        "message": "Email verified and account created successfully.",
        "user": {"email": email},
        "profile_facts": {"full_name": name},
        "chat_messages": [],
        "session_token": f"mock-token-{email}"
    }

@router.post("/signup")
def signup(auth: AuthRequest, settings: Settings = Depends(get_settings)):
    email = auth.email.strip().lower()
    password = auth.password
    name = auth.name.strip() if auth.name else ""
    
    # Create user in local SQLite persistently
    user_created = local_db.create_user(email, password, name)
    if not user_created:
        raise HTTPException(status_code=400, detail="User already exists.")
        
    # Sync with Supabase if credentials exist
    if settings.supabase_url and settings.supabase_anon_key:
        try:
            supabase_repository.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": name
                    }
                }
            })
            payload = {
                "email": email,
                "profile_facts": {"full_name": name}
            }
            supabase_repository.client.table("user_profiles").upsert(payload, on_conflict="email").execute()
        except Exception:
            pass
            
    return {
        "status": "success",
        "message": "User signed up successfully.",
        "user": {"email": email},
        "profile_facts": {"full_name": name},
        "chat_messages": [],
        "session_token": f"mock-token-{email}"
    }

@router.post("/login")
def login(auth: AuthRequest, settings: Settings = Depends(get_settings)):
    email = auth.email.strip().lower()
    password = auth.password
    
    # Check SQLite first
    db_user = local_db.get_user(email)
    if db_user:
        if db_user["password"] == password:
            profile_facts, chat_messages = local_db.get_profile(email)
            if "full_name" not in profile_facts:
                profile_facts["full_name"] = db_user["name"] or ""
            return {
                "status": "success",
                "user": {"email": email},
                "profile_facts": profile_facts,
                "chat_messages": chat_messages,
                "session_token": f"mock-token-{email}"
            }
    
    # Fallback to Supabase if configured
    if settings.supabase_url and settings.supabase_anon_key:
        try:
            res = supabase_repository.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            profile_facts = {}
            chat_messages = []
            try:
                db_res = (
                    supabase_repository.client.table("user_profiles")
                    .select("profile_facts")
                    .eq("email", email)
                    .execute()
                )
                if db_res.data:
                    raw_facts = db_res.data[0].get("profile_facts", {})
                    if isinstance(raw_facts, dict):
                        chat_messages = raw_facts.pop("chat_messages", [])
                        profile_facts = raw_facts
                    else:
                        profile_facts = {}
            except Exception:
                pass
                
            # Cache locally in SQLite
            local_db.create_user(email, password, getattr(res.user, "user_metadata", {}).get("full_name", ""))
            local_db.save_profile(email, profile_facts, chat_messages)
            
            return {
                "status": "success",
                "user": {"email": email, "id": getattr(res.user, "id", None) if res.user else None},
                "profile_facts": profile_facts,
                "chat_messages": chat_messages,
                "session_token": getattr(res.session, "access_token", f"sb-token-{email}") if res.session else f"sb-token-{email}"
            }
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Authentication failed: {str(exc)}")
            
    raise HTTPException(status_code=400, detail="Invalid email or password.")

@router.get("/me")
def get_me(email: str):
    """Fetch user profile data from SQLite for mount re-hydration."""
    email = email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    db_user = local_db.get_user(email)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    profile_facts, chat_messages = local_db.get_profile(email)
    if "full_name" not in profile_facts:
        profile_facts["full_name"] = db_user["name"] or ""
    
    return {
        "status": "success",
        "user": {"email": email, "name": db_user["name"] or ""},
        "profile_facts": profile_facts,
        "chat_messages": chat_messages,
    }

@router.post("/delete-account")
def delete_account(req: DeleteAccountRequest, settings: Settings = Depends(get_settings)):
    """Permanently delete a user account and all associated data."""
    email = req.email.strip().lower()
    password = req.password
    
    # Verify credentials first
    db_user = local_db.get_user(email)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
    if db_user["password"] != password:
        raise HTTPException(status_code=400, detail="Invalid password. Account deletion requires correct password.")
    
    # Delete from SQLite
    local_db.delete_user(email)
    
    # Also delete from Supabase if configured
    if settings.supabase_url and settings.supabase_anon_key:
        try:
            supabase_repository.client.table("user_profiles").delete().eq("email", email).execute()
        except Exception:
            pass
    
    return {
        "status": "success",
        "message": "Account permanently deleted. You can register again with the same email."
    }

@router.post("/save-profile")
async def save_profile(req: ProfileSaveRequest, settings: Settings = Depends(get_settings)):
    email = req.email.strip().lower()
    profile_facts = req.profile_facts
    chat_messages = req.chat_messages or []
    
    print(f"\n[SAVE PROFILE] email: {email}, profile_facts: {profile_facts}, chat_messages_count: {len(chat_messages)}\n")
    
    # Save locally in SQLite database persistently
    local_db.save_profile(email, profile_facts, chat_messages)
    
    if not settings.supabase_url or not settings.supabase_anon_key:
        return {"status": "success", "message": "Profile saved locally."}
    
    try:
        db_profile_facts = {**profile_facts, "chat_messages": chat_messages}
        payload = {
            "email": email,
            "profile_facts": db_profile_facts
        }
        
        try:
            supabase_repository.client.table("user_profiles").upsert(payload, on_conflict="email").execute()
        except Exception:
            intake_payload = {
                "profile": {
                    "full_name": email,
                    "state": profile_facts.get("state"),
                    "household_income": float(profile_facts.get("monthly_income") or 0.0) * 12,
                    "household_size": int(profile_facts.get("household_size") or 1),
                    "immigration_status": profile_facts.get("immigration_status"),
                    "notes": f"Saved profile for {email}"
                },
                "consent_to_store": True
            }
            await supabase_repository.insert_intake(intake_payload)
            
        return {"status": "success", "message": "Profile saved."}
    except Exception as exc:
        return {"status": "success", "message": f"Profile saved locally (Fallback: {str(exc)})"}
