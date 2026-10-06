"""
Seyal AI API — User Profile Management Endpoints.

Allows collecting and managing user profile details (name, age, gender) in the Supabase PostgreSQL database.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from seyal_ai.database.engine import get_session
from seyal_ai.database.models import User
from seyal_ai.security.supabase_auth import SupabaseUser, get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileSetupRequest(BaseModel):
    name: str = Field(..., min_length=1, description="User's full name")
    dob: str | None = Field(default=None, description="User's date of birth (YYYY-MM-DD)")
    age: int | None = Field(default=None, ge=1, le=120, description="User's age")
    gender: str | None = Field(default="other", description="User's gender")
    mother_tongue: str | None = Field(default=None, description="User's native/mother tongue")
    known_languages: list[str] | None = Field(default_factory=list, description="Languages known by user")


@router.post("/setup")
async def setup_profile(
    body: ProfileSetupRequest,
    current_supabase_user: SupabaseUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Save or update user details (name, dob, age, mother_tongue, known_languages) mapped to their Supabase user ID.
    """
    user_id = current_supabase_user.user_id
    user_email = (current_supabase_user.email or "").strip().lower()

    # Enforce valid Gmail account requirement
    if user_email and not (user_email.endswith("@gmail.com") or user_email.endswith("@googlemail.com")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only verified @gmail.com accounts are permitted.",
        )

    # Compute age from DOB if DOB provided and age not explicitly set
    calculated_age = body.age
    if body.dob and not calculated_age:
        try:
            from datetime import date
            parts = [int(p) for p in body.dob.split("-")]
            if len(parts) == 3:
                born = date(parts[0], parts[1], parts[2])
                today = date.today()
                calculated_age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
        except Exception:
            pass

    async with get_session() as session:
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            user.name = body.name
            if calculated_age is not None:
                user.age = calculated_age
            if body.dob is not None:
                user.dob = body.dob
            if body.gender is not None:
                user.gender = body.gender
            if body.mother_tongue is not None:
                user.mother_tongue = body.mother_tongue
            if body.known_languages is not None:
                user.known_languages = body.known_languages
        else:
            user = User(
                id=user_id,
                name=body.name,
                dob=body.dob,
                age=calculated_age or 25,
                gender=body.gender or "other",
                mother_tongue=body.mother_tongue,
                known_languages=body.known_languages or [],
            )
            session.add(user)

        await session.flush()

        from seyal_ai.llm.prompts.language_guardrail import invalidate_user_language_profile_cache
        invalidate_user_language_profile_cache()

        return {
            "success": True,
            "message": "Profile updated successfully",
            "profile": {
                "user_id": user_id,
                "name": user.name,
                "dob": user.dob,
                "age": user.age,
                "gender": user.gender,
                "mother_tongue": user.mother_tongue,
                "known_languages": user.known_languages or [],
            },
        }


@router.get("/me")
async def get_profile(
    current_supabase_user: SupabaseUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Fetch the current user profile. Returns setup_required = True if the onboarding profile hasn't been completed.
    """
    user_id = current_supabase_user.user_id

    async with get_session() as session:
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        # Check required onboarding fields: name, mother_tongue, and known_languages
        if not user or not user.name or not user.mother_tongue or not user.known_languages:
            return {
                "setup_required": True,
                "user_id": user_id,
                "email": current_supabase_user.email,
                "profile": {
                    "name": user.name if user else None,
                    "dob": user.dob if user else None,
                    "mother_tongue": user.mother_tongue if user else None,
                    "known_languages": user.known_languages if user else [],
                } if user else None,
            }

        return {
            "setup_required": False,
            "profile": {
                "user_id": user_id,
                "email": current_supabase_user.email,
                "name": user.name,
                "dob": user.dob,
                "age": user.age,
                "gender": user.gender,
                "mother_tongue": user.mother_tongue,
                "known_languages": user.known_languages or [],
            },
        }
