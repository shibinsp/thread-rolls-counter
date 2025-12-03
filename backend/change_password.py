#!/usr/bin/env python3
"""
Script to change user password
Usage: python change_password.py <username> <new_password>
Example: python change_password.py admin newpassword123
"""
import sys
from app.database import SessionLocal
from app.models import User
from app.auth import hash_password

def change_password(username: str, new_password: str):
    db = SessionLocal()
    try:
        # Find user
        user = db.query(User).filter(User.username == username).first()

        if not user:
            print(f"❌ User '{username}' not found!")
            print("\nAvailable users:")
            users = db.query(User).all()
            for u in users:
                print(f"  - {u.username} ({u.role})")
            return False

        # Update password
        user.password_hash = hash_password(new_password)
        db.commit()

        print(f"✅ Password updated successfully!")
        print(f"   Username: {user.username}")
        print(f"   Role: {user.role}")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python change_password.py <username> <new_password>")
        print("Example: python change_password.py admin newpassword123")
        sys.exit(1)

    username = sys.argv[1]
    new_password = sys.argv[2]

    if len(new_password) < 8:
        print("❌ Password must be at least 8 characters long")
        sys.exit(1)

    print(f"Changing password for user: {username}")
    print()

    if change_password(username, new_password):
        print()
        print("✅ Done! You can now login with the new password.")
    else:
        sys.exit(1)
