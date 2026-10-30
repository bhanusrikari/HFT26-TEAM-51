"""User service implementation."""
from typing import Optional, Dict

def log_call(func):
    """Decorator to log calls."""
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@log_call
async def fetch_remote_user(user_id: int) -> Optional[Dict[str, str]]:
    """Fetch user from remote system asynchronously."""
    if user_id <= 0:
        return None
    return {"id": str(user_id), "status": "active"}

class UserManager:
    """Manages active user sessions."""
    default_role = "viewer"

    def __init__(self, admin_email: str):
        self.admin = admin_email
        self.users: Dict[int, str] = {}

    @log_call
    def register_user(self, user_id: int, username: str) -> bool:
        """Register a user."""
        if user_id in self.users:
            return False
        self.users[user_id] = username
        return True

    async def verify_permissions(self, user_id: int) -> bool:
        """Verify user permissions asynchronously."""
        return user_id in self.users

