"""
Seyal AI Permissions REST API Router.

Provides endpoints for inspecting, granting, and revoking capability permission scopes.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from seyal_ai.security.permissions import PermissionScopeManager

router = APIRouter(prefix="/permissions", tags=["permissions"])

_scope_manager = PermissionScopeManager()


class GrantScopeRequest(BaseModel):
    scope: str = Field(..., description="The permission scope to grant")


class RevokeScopeRequest(BaseModel):
    scope: str = Field(..., description="The permission scope to revoke")


class SetModeRequest(BaseModel):
    scope: str = Field(..., description="The permission scope to configure")
    mode: str = Field(..., description="The permission mode: 'allow', 'ask', or 'block'")


@router.get("", summary="List all permission scopes")
async def list_permissions() -> dict[str, Any]:
    """Get the current status of all capability permission scopes."""
    scopes = _scope_manager.list_scopes()
    return {
        "scopes": {
            k: {
                "scope": v.scope,
                "granted": v.granted,
                "mode": getattr(v, "mode", "allow" if v.granted else "block"),
                "last_accessed_at": getattr(v, "last_accessed_at", None),
                "last_accessed_by": getattr(v, "last_accessed_by", None),
                "description": v.description,
            }
            for k, v in scopes.items()
        }
    }


@router.post("/mode", summary="Set permission 3-way mode")
async def set_permission_mode(req: SetModeRequest) -> dict[str, Any]:
    """Set 3-way permission mode: allow, ask, or block."""
    _scope_manager.set_mode(req.scope, req.mode)
    return {
        "success": True,
        "scope": req.scope,
        "mode": req.mode,
        "message": f"Permission scope '{req.scope}' set to '{req.mode}'.",
    }


@router.post("/grant", summary="Grant a permission scope")
async def grant_permission(req: GrantScopeRequest) -> dict[str, Any]:
    """Explicitly grant a capability permission scope."""
    _scope_manager.grant_scope(req.scope)
    return {
        "success": True,
        "scope": req.scope,
        "granted": True,
        "message": f"Permission scope '{req.scope}' granted successfully.",
    }


@router.post("/revoke", summary="Revoke a permission scope")
async def revoke_permission(req: RevokeScopeRequest) -> dict[str, Any]:
    """Explicitly revoke a capability permission scope."""
    _scope_manager.revoke_scope(req.scope)
    return {
        "success": True,
        "scope": req.scope,
        "granted": False,
        "message": f"Permission scope '{req.scope}' revoked.",
    }


@router.post("/reset", summary="Reset permissions to defaults")
async def reset_permissions() -> dict[str, Any]:
    """Reset all capability scopes to default granted state."""
    _scope_manager.reset_defaults()
    return {"success": True, "message": "All permission scopes reset to defaults."}

