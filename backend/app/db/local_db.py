import sqlite3
import json
import os
from typing import Any, Dict, List, Tuple, Optional
from app.db.supabase import supabase_repository
from app.core.config import get_settings

# Place db file in the backend root directory or custom path
DB_PATH = os.environ.get(
    "SQLITE_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "formzero.db")
)

def is_supabase_enabled() -> bool:
    """Check if Supabase credentials are configured in the environment."""
    settings = get_settings()
    return bool(settings.supabase_url and settings.supabase_anon_key)

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if is_supabase_enabled():
        print("Database Mode: ONLINE (Supabase Active)")
        return

    # Ensure parent directory exists
    db_dir = os.path.dirname(os.path.abspath(DB_PATH))
    os.makedirs(db_dir, exist_ok=True)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            name TEXT
        )
    """)
    
    # Create user_profiles table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            email TEXT PRIMARY KEY,
            profile_facts TEXT,
            chat_messages TEXT
        )
    """)
    
    # Create otps table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS otps (
            email TEXT PRIMARY KEY,
            otp TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    print("Database Mode: LOCAL (SQLite Initialized)")

# Initialize DB on load
init_db()

def create_user(email: str, password: str, name: str) -> bool:
    email_clean = email.strip().lower()
    name_clean = name.strip() if name else ""

    if is_supabase_enabled():
        try:
            # Check if user already exists
            res = supabase_repository.client.table("users").select("email").eq("email", email_clean).execute()
            if res.data:
                return False
            # Insert user
            supabase_repository.client.table("users").insert({
                "email": email_clean,
                "password": password,
                "name": name_clean
            }).execute()
            return True
        except Exception as e:
            print("Supabase create_user error:", e)
            return False

    # Local SQLite Fallback
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", (email_clean, password, name_clean))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False

def get_user(email: str) -> Optional[Dict[str, Any]]:
    email_clean = email.strip().lower()

    if is_supabase_enabled():
        try:
            res = supabase_repository.client.table("users").select("*").eq("email", email_clean).execute()
            if res.data:
                return res.data[0]
            return None
        except Exception as e:
            print("Supabase get_user error:", e)
            return None

    # Local SQLite Fallback
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email_clean,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def save_profile(email: str, profile_facts: Dict[str, Any], chat_messages: List[Any]) -> None:
    email_clean = email.strip().lower()

    if is_supabase_enabled():
        try:
            supabase_repository.client.table("user_profiles").upsert({
                "email": email_clean,
                "profile_facts": profile_facts,
                "chat_messages": chat_messages
            }).execute()
            return
        except Exception as e:
            print("Supabase save_profile error:", e)
            return

    # Local SQLite Fallback
    conn = get_connection()
    cursor = conn.cursor()
    facts_str = json.dumps(profile_facts)
    chat_str = json.dumps(chat_messages)
    cursor.execute("""
        INSERT INTO user_profiles (email, profile_facts, chat_messages)
        VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
            profile_facts = excluded.profile_facts,
            chat_messages = excluded.chat_messages
    """, (email_clean, facts_str, chat_str))
    conn.commit()
    conn.close()

def get_profile(email: str) -> Tuple[Dict[str, Any], List[Any]]:
    email_clean = email.strip().lower()

    if is_supabase_enabled():
        try:
            res = supabase_repository.client.table("user_profiles").select("*").eq("email", email_clean).execute()
            if res.data:
                row = res.data[0]
                facts = row.get("profile_facts") or {}
                chat = row.get("chat_messages") or []
                return facts, chat
            return {}, []
        except Exception as e:
            print("Supabase get_profile error:", e)
            return {}, []

    # Local SQLite Fallback
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_profiles WHERE email = ?", (email_clean,))
    row = cursor.fetchone()
    conn.close()
    if row:
        facts = json.loads(row["profile_facts"]) if row["profile_facts"] else {}
        chat = json.loads(row["chat_messages"]) if row["chat_messages"] else []
        return facts, chat
    return {}, []

def save_otp(email: str, otp: str) -> None:
    email_clean = email.strip().lower()

    if is_supabase_enabled():
        try:
            supabase_repository.client.table("otps").upsert({
                "email": email_clean,
                "otp": otp
            }).execute()
            return
        except Exception as e:
            print("Supabase save_otp error:", e)
            return

    # Local SQLite Fallback
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO otps (email, otp, timestamp)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET
            otp = excluded.otp,
            timestamp = CURRENT_TIMESTAMP
    """, (email_clean, otp))
    conn.commit()
    conn.close()

def get_otp(email: str) -> Optional[str]:
    email_clean = email.strip().lower()

    if is_supabase_enabled():
        try:
            res = supabase_repository.client.table("otps").select("otp").eq("email", email_clean).execute()
            if res.data:
                return res.data[0]["otp"]
            return None
        except Exception as e:
            print("Supabase get_otp error:", e)
            return None

    # Local SQLite Fallback
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT otp FROM otps WHERE email = ?", (email_clean,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row["otp"]
    return None

def verify_otp(email: str, entered_otp: str) -> bool:
    email_clean = email.strip().lower()
    saved = get_otp(email_clean)
    if saved and saved == entered_otp.strip():
        if is_supabase_enabled():
            try:
                supabase_repository.client.table("otps").delete().eq("email", email_clean).execute()
                return True
            except Exception as e:
                print("Supabase verify_otp delete error:", e)
                return True

        # Local SQLite Fallback
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM otps WHERE email = ?", (email_clean,))
        conn.commit()
        conn.close()
        return True
    return False

def delete_user(email: str) -> bool:
    """Permanently delete a user account and all associated data."""
    email_clean = email.strip().lower()

    if is_supabase_enabled():
        try:
            supabase_repository.client.table("users").delete().eq("email", email_clean).execute()
            supabase_repository.client.table("user_profiles").delete().eq("email", email_clean).execute()
            supabase_repository.client.table("otps").delete().eq("email", email_clean).execute()
            return True
        except Exception as e:
            print("Supabase delete_user error:", e)
            return False

    # Local SQLite Fallback
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email = ?", (email_clean,))
    cursor.execute("DELETE FROM user_profiles WHERE email = ?", (email_clean,))
    cursor.execute("DELETE FROM otps WHERE email = ?", (email_clean,))
    deleted = cursor.rowcount >= 0
    conn.commit()
    conn.close()
    return deleted
