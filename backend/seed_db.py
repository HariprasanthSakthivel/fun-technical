"""Clean seed script for Fun Friday Activities Platform (aXtrLabs).

Creates a fresh, clean database with:
1. ONLY the Administrator account ('admin' / 'admin123').
2. Default initial GameState ('lobby').
3. Zero fake participant IDs, zero fake teams, zero fake questions, zero fake topics.
Real participants can register via the registration form, and admin can upload questions and assign topics.
"""

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.models import (
    GameState,
    User,
    utc_now,
)


def seed_database():
    """Drop and recreate all tables, seeding ONLY the clean admin user."""
    print("--> Resetting database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Admin account only
        admin = User(
            username="admin",
            display_name="aXtrLabs Admin",
            email="admin@axtrlabs.com",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True,
            is_logged_in=False,
            last_login_at=utc_now(),
        )
        db.add(admin)

        # 2. Initial game state
        state = GameState(
            id=1,
            current_game="lobby",
            is_buzzer_open=False,
        )
        db.add(state)

        db.commit()
        print("[SUCCESS] Fresh database created successfully!")
        print("[INFO] Admin user: admin / admin123")
        print("[INFO] No fake participant IDs or fake questions present.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
