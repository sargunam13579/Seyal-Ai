import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../../services/api';
import {
  PERMISSION_CONFIGS,
  PermissionsHeaderHUD,
  SecurityProfilesCard,
  PermissionsFilterToolbar,
  PermissionCardRow,
} from './permissions';

export const PermissionsTab: React.FC = () => {
  const [permissionsState, setPermissionsState] = useState<Record<string, any>>({});
  const [isUpdatingPermission, setIsUpdatingPermission] = useState<Record<string, boolean>>({});
  const [openDropdownScope, setOpenDropdownScope] = useState<string | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'media' | 'os' | 'exec' | 'system'>('all');

  // Preset loading state & feedback
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const loadPermissionsData = async () => {
    try {
      const perms = await api.getPermissions();
      if (perms && typeof perms === 'object') {
        setPermissionsState(perms);
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  useEffect(() => {
    loadPermissionsData();
  }, []);

  const handleSetPermissionMode = async (scope: string, mode: 'allow' | 'ask' | 'block') => {
    setIsUpdatingPermission((prev) => ({ ...prev, [scope]: true }));
    try {
      const res = await api.setPermissionMode(scope, mode);
      setPermissionsState((prev) => ({
        ...prev,
        [scope]: {
          ...prev[scope],
          granted: mode === 'allow',
          mode: mode,
          last_accessed_at: res?.last_accessed_at ?? prev[scope]?.last_accessed_at,
          last_accessed_by: res?.last_accessed_by ?? prev[scope]?.last_accessed_by,
        },
      }));
    } catch (err) {
      console.error(`Failed to set permission mode for ${scope}:`, err);
    } finally {
      setIsUpdatingPermission((prev) => ({ ...prev, [scope]: false }));
    }
  };

  // 1-Click Security Profiles
  const handleApplySecurityProfile = async (preset: 'paranoid' | 'balanced' | 'autonomous') => {
    setIsApplyingPreset(true);
    setFeedbackMessage(null);

    const updates: Record<string, 'allow' | 'ask' | 'block'> = {};

    PERMISSION_CONFIGS.forEach((item) => {
      if (preset === 'paranoid') {
        updates[item.scope] = 'ask';
      } else if (preset === 'balanced') {
        if (item.riskLevel === 'high') {
          updates[item.scope] = 'ask';
        } else {
          updates[item.scope] = 'allow';
        }
      } else {
        updates[item.scope] = 'allow';
      }
    });

    try {
      await Promise.all(
        Object.entries(updates).map(([scope, mode]) =>
          api.setPermissionMode(scope, mode).catch(() => {})
        )
      );

      setPermissionsState((prev) => {
        const nextState = { ...prev };
        Object.entries(updates).forEach(([scope, mode]) => {
          nextState[scope] = {
            ...nextState[scope],
            granted: mode === 'allow',
            mode: mode,
          };
        });
        return nextState;
      });

      const presetNames = {
        paranoid: 'Zero-Trust Paranoid (Ask Every Time for all scopes)',
        balanced: 'Balanced Operator (High-risk commands require confirmation)',
        autonomous: 'Full Autonomous Power Mode (All capabilities allowed)',
      };
      setFeedbackMessage(`Security profile applied: ${presetNames[preset]}`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Failed to apply preset:', err);
    } finally {
      setIsApplyingPreset(false);
    }
  };

  // Emergency Revoke All
  const handleRevokeAllPermissions = async () => {
    setIsApplyingPreset(true);
    setShowRevokeConfirm(false);
    try {
      await Promise.all(
        PERMISSION_CONFIGS.map((item) =>
          api.setPermissionMode(item.scope, 'block').catch(() => {})
        )
      );

      setPermissionsState((prev) => {
        const nextState = { ...prev };
        PERMISSION_CONFIGS.forEach((item) => {
          nextState[item.scope] = {
            ...nextState[item.scope],
            granted: false,
            mode: 'block',
          };
        });
        return nextState;
      });

      setFeedbackMessage('All autonomous permissions have been revoked. Agent actions are frozen.');
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err) {
      console.error('Revoke all error:', err);
    } finally {
      setIsApplyingPreset(false);
    }
  };

  // Compute counts
  const counts = useMemo(() => {
    let allowed = 0;
    let ask = 0;
    let blocked = 0;

    PERMISSION_CONFIGS.forEach((c) => {
      const p = permissionsState[c.scope];
      const mode = p?.mode || (p?.granted ?? true ? 'allow' : 'block');
      if (mode === 'allow') allowed++;
      else if (mode === 'ask') ask++;
      else blocked++;
    });

    return { allowed, ask, blocked };
  }, [permissionsState]);

  // Filtered list
  const filteredConfigs = useMemo(() => {
    return PERMISSION_CONFIGS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.scope.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Header Bar */}
      <PermissionsHeaderHUD counts={counts} />

      <div className="p-8 sm:p-10 space-y-7 w-full">
        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fadeIn shadow-md">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 1. 1-CLICK SECURITY PROFILES (PRESETS) */}
        <SecurityProfilesCard
          isApplyingPreset={isApplyingPreset}
          onApplyProfile={handleApplySecurityProfile}
        />

        {/* 2. FILTER PILLS & SEARCH BAR */}
        <PermissionsFilterToolbar
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showRevokeConfirm={showRevokeConfirm}
          setShowRevokeConfirm={setShowRevokeConfirm}
          onRevokeAll={handleRevokeAllPermissions}
        />

        {/* 3. PERMISSIONS LIST */}
        <div className="space-y-3">
          {filteredConfigs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-2xl bg-slate-900/40">
              No permission scopes matched your search query.
            </div>
          ) : (
            filteredConfigs.map((item) => (
              <PermissionCardRow
                key={item.scope}
                item={item}
                permData={permissionsState[item.scope]}
                isBusy={!!isUpdatingPermission[item.scope]}
                isApplyingPreset={isApplyingPreset}
                isOpenDropdown={openDropdownScope === item.scope}
                onToggleDropdown={() =>
                  setOpenDropdownScope(openDropdownScope === item.scope ? null : item.scope)
                }
                onSetMode={(mode) => {
                  handleSetPermissionMode(item.scope, mode);
                  setOpenDropdownScope(null);
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
