import React, { useState, useRef, useEffect } from 'react';
import { useSeyalAi } from '../../context/SeyalAiContext';
import { useVoice } from '../../context/VoiceContext';
import { RADIAL_ACTIONS_CATALOG } from '../../config/radialActionsConfig';
import appLogo from '../../assets/app-logo.png';

interface HeroAgentLogoOrbProps {
  onDismiss?: () => void;
  onClick?: () => void;
  isClosing?: boolean;
}

export const HeroAgentLogoOrb: React.FC<HeroAgentLogoOrbProps> = ({ onDismiss, onClick, isClosing = false }) => {
  const {
    setIsHeroLogoOpen,
    closeHeroLogo,
    setActiveView,
    addActivity,
    triggerEmergencyStop,
    setIsComputerUseActive,
    radialButtonOrder,
    setIsTextInputPopupOpen,
  } = useSeyalAi();
  const { voiceState, isListening, startListening, stopListening } = useVoice();

  // Drag & dismiss physics state
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);
  const [dismissVector, setDismissVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  // Free Fire Style 8 Radial Buttons State & Revolver Continuous Roll Sequence
  const [isRadialOpen, setIsRadialOpen] = useState<boolean>(false);
  const [isRadialClosing, setIsRadialClosing] = useState<boolean>(false);
  const [radialKey, setRadialKey] = useState<number>(0);
  const [hoveredSlotIdx, setHoveredSlotIdx] = useState<number | null>(null);
  const [isAnimationSettled, setIsAnimationSettled] = useState<boolean>(false);

  const buttonWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sectorRefs = useRef<(SVGPathElement | null)[]>([]);

  const currentWheelAngleRef = useRef<number>(0);
  const openRafRef = useRef<number | null>(null);
  const closeRafRef = useRef<number | null>(null);

  // Center to button radius in pixels
  const RADIUS = 158;

  // Reverse Roll Animation (Retracts all 8 buttons back into top 12 o'clock in a uniform, synchronized sequence without tail lag)
  const startClosingAnimation = () => {
    if (isRadialClosing || !isRadialOpen) return;

    if (openRafRef.current) {
      cancelAnimationFrame(openRafRef.current);
      openRafRef.current = null;
    }

    setIsRadialClosing(true);
    setIsAnimationSettled(false);
    setHoveredSlotIdx(null);

    const startAngle = currentWheelAngleRef.current || 315;
    const startTime = performance.now();
    // 500ms total close duration: fast, uniform, with zero trailing delay for the last button
    const closeDuration = Math.max(300, Math.round((startAngle / 315) * 500));

    const animateReverse = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / closeDuration);
      // Uniform, natural deceleration without a lingering tail
      const ease = 1 - Math.pow(p, 1.4);
      const wheelAngle = ease * startAngle;
      currentWheelAngleRef.current = wheelAngle;

      // Retract buttons 0 to 6 counter-clockwise along rim back into top origin
      for (let i = 0; i < 7; i++) {
        const el = buttonWrapperRefs.current[i];
        if (!el) continue;
        const angle = wheelAngle - i * 45;
        if (angle <= 0) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        } else {
          // Smoothly dissolve as the button enters the top 12 o'clock threshold
          const fade = Math.min(1, angle / 20);
          el.style.opacity = String(fade);
          el.style.pointerEvents = 'none';
          const rad = (angle * Math.PI) / 180;
          const x = Math.round(RADIUS * Math.sin(rad));
          const y = Math.round(-RADIUS * Math.cos(rad));
          el.style.transform = `translate(${x}px, ${y}px)`;
        }
      }

      // Settings (button 7) fades & scales out first at 12 o'clock as the train rolls back
      const settingsEl = buttonWrapperRefs.current[7];
      if (settingsEl) {
        if (wheelAngle < 292) {
          settingsEl.style.opacity = '0';
          settingsEl.style.pointerEvents = 'none';
        } else {
          const progress = Math.min(1, Math.max(0, (wheelAngle - 292) / 23));
          settingsEl.style.opacity = String(progress);
          settingsEl.style.pointerEvents = 'none';
          const scale = 0.75 + 0.25 * progress;
          settingsEl.style.transform = `translate(0px, -${RADIUS}px) scale(${scale})`;
        }
      }

      // Annular sectors dim in reverse
      for (let s = 0; s < 8; s++) {
        const sec = sectorRefs.current[s];
        if (!sec) continue;
        const secFade = Math.max(0.15, Math.min(1, (wheelAngle - s * 45 + 20) / 20));
        sec.style.opacity = String(secFade);
      }

      if (p < 1) {
        closeRafRef.current = requestAnimationFrame(animateReverse);
      } else {
        currentWheelAngleRef.current = 0;
        for (let i = 0; i < 8; i++) {
          const el = buttonWrapperRefs.current[i];
          if (el) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }
          const sec = sectorRefs.current[i];
          if (sec) {
            sec.style.opacity = '0.15';
          }
        }
        setIsRadialClosing(false);
        setIsRadialOpen(false);
      }
    };

    closeRafRef.current = requestAnimationFrame(animateReverse);
  };

  const toggleRadialMenu = () => {
    if (isRadialClosing) return;
    if (isRadialOpen) {
      // Again click panna, return same way la unshow aganum
      startClosingAnimation();
    } else {
      if (closeRafRef.current) {
        cancelAnimationFrame(closeRafRef.current);
        closeRafRef.current = null;
      }
      setIsRadialClosing(false);
      setIsRadialOpen(true);
      setRadialKey((k) => k + 1);
    }
  };

  // Track initial flight entrance so it only runs once on mount (matches 1.2s flight)
  const [entryAnimationComplete, setEntryAnimationComplete] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEntryAnimationComplete(true);
    }, 1250);
    return () => clearTimeout(timer);
  }, []);

  // Retract radial wheel in reverse if popup is closing
  useEffect(() => {
    if (isClosing && isRadialOpen && !isRadialClosing) {
      startClosingAnimation();
    }
  }, [isClosing, isRadialOpen, isRadialClosing]);

  // Keyboard shortcut: Press Escape (Esc) to smoothly close center hero logo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRadialOpen && !isRadialClosing) {
          startClosingAnimation();
        }
        closeHeroLogo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRadialOpen, isRadialClosing, closeHeroLogo]);

  // Unified Linked Chain Roll Engine (100% Clockwise, Rigid 45° Coupling, ZERO Overlap)
  useEffect(() => {
    if (!isRadialOpen || isRadialClosing) {
      if (!isRadialOpen) {
        setIsAnimationSettled(false);
      }
      return;
    }

    setIsAnimationSettled(false);
    const startTime = performance.now();
    const duration = 1650; // Smooth, balanced cinematic pace

    // Initial state: hide buttons before they emerge at 12 o'clock
    for (let i = 0; i < 8; i++) {
      const el = buttonWrapperRefs.current[i];
      if (el) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.transform = `translate(0px, -${RADIUS}px)`;
      }
      const sec = sectorRefs.current[i];
      if (sec) {
        sec.style.opacity = '0.15';
      }
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / duration);
      // Smooth cubic deceleration
      const ease = 1 - Math.pow(1 - p, 3);
      // Master angle sweeps from 0° (Top) to 315° (Slot 7)
      const wheelAngle = ease * 315;
      currentWheelAngleRef.current = wheelAngle;

      // Update each rigidly coupled button in the chain
      // Buttons 0 to 6 glide along the rim with constant 45° spacing
      // Button 7 (Settings at 12 o'clock) blooms seamlessly into position when Kill Switch clears top
      for (let i = 0; i < 8; i++) {
        const el = buttonWrapperRefs.current[i];
        if (!el) continue;

        if (i === 7) {
          // Settings (Slot 0, 12 o'clock): Emerges when Kill Switch has cleared 22° past top (wheelAngle >= 292)
          // Not too late, not too early: perfectly in sync with arrival at 315°
          if (wheelAngle < 292) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          } else {
            const progress = Math.min(1, (wheelAngle - 292) / 23);
            el.style.opacity = String(progress);
            el.style.pointerEvents = progress > 0.6 ? 'auto' : 'none';
            const scale = 0.75 + 0.25 * progress;
            el.style.transform = `translate(0px, -${RADIUS}px) scale(${scale})`;
          }
          continue;
        }

        const angle = wheelAngle - i * 45;
        if (angle < 0) {
          // Has not reached top entry point yet
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        } else {
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
          const rad = (angle * Math.PI) / 180;
          const x = Math.round(RADIUS * Math.sin(rad));
          const y = Math.round(-RADIUS * Math.cos(rad));
          el.style.transform = `translate(${x}px, ${y}px)`;
        }
      }

      // Update annular sector illumination as the chain passes each sector
      for (let s = 0; s < 8; s++) {
        const sec = sectorRefs.current[s];
        if (!sec) continue;
        sec.style.opacity = wheelAngle >= s * 45 ? '1' : '0.15';
      }

      if (p < 1) {
        openRafRef.current = requestAnimationFrame(animate);
      } else {
        currentWheelAngleRef.current = 315;
        setIsAnimationSettled(true);
      }
    };

    openRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (openRafRef.current) {
        cancelAnimationFrame(openRafRef.current);
        openRafRef.current = null;
      }
    };
  }, [isRadialOpen, radialKey, isRadialClosing]);

  // Global RAF cleanup on unmount
  useEffect(() => {
    return () => {
      if (openRafRef.current) cancelAnimationFrame(openRafRef.current);
      if (closeRafRef.current) cancelAnimationFrame(closeRafRef.current);
    };
  }, []);

  // Drag & dismiss pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDismissing) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !pointerStartRef.current || isDismissing) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.hypot(dx, dy) > 8) {
      hasMovedRef.current = true;
    }
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !pointerStartRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);

    const pressDuration = Date.now() - pointerStartRef.current.time;
    const moveDistance = Math.hypot(dragOffset.x, dragOffset.y);

    // If minimal movement (< 8px) and short duration, treat as a BUTTON CLICK!
    if (!hasMovedRef.current && moveDistance < 8 && pressDuration < 500) {
      setDragOffset({ x: 0, y: 0 });
      pointerStartRef.current = null;
      console.log('[POPUP-BUTTON CLICKED] Toggling Free Fire 8 Radial Buttons Wheel');
      toggleRadialMenu();
      if (onClick) {
        onClick();
      }
      return;
    }

    const halfW = typeof window !== 'undefined' ? window.innerWidth / 2 : 700;
    const halfH = typeof window !== 'undefined' ? window.innerHeight / 2 : 450;
    const progressX = Math.abs(dragOffset.x) / halfW;
    const progressY = Math.abs(dragOffset.y) / halfH;
    const dragProgress = Math.max(progressX, progressY);

    if (dragProgress >= 0.75) {
      setIsDismissing(true);
      const angle = Math.atan2(dragOffset.y, dragOffset.x);
      const throwDistance = Math.max(window.innerWidth, window.innerHeight);
      setDismissVector({
        x: Math.cos(angle) * throwDistance,
        y: Math.sin(angle) * throwDistance,
      });

      setTimeout(() => {
        setIsHeroLogoOpen(false);
        if (onDismiss) onDismiss();
      }, 280);
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
    pointerStartRef.current = null;
  };

  // Action dispatcher for the 8 Radial Emote Wheel Buttons
  const handleActionClick = (actionId: string) => {
    switch (actionId) {
      case 'voice':
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
        addActivity({
          type: 'chat',
          title: 'Voice Directive',
          detail: isListening ? 'Voice listening paused' : 'Voice listening activated',
          status: 'info',
        });
        break;
      case 'camera':
        addActivity({
          type: 'tool_exec',
          title: 'Vision Snap',
          detail: 'Screen snapshot captured for computer vision analysis',
          status: 'info',
        });
        break;
      case 'computer_use':
        setActiveView('assistant');
        setIsComputerUseActive(true);
        addActivity({
          type: 'tool_exec',
          title: 'Autonomous Agent',
          detail: 'Computer-Use Agent workspace opened',
          status: 'info',
        });
        break;
      case 'files':
        setActiveView('files');
        break;
      case 'system':
        setActiveView('system');
        break;
      case 'chat':
        setActiveView('assistant');
        setIsTextInputPopupOpen(true);
        setTimeout(() => {
          const inputEl = document.querySelector('input[data-seyal-input="true"]') as HTMLInputElement | null;
          if (inputEl) inputEl.focus();
        }, 120);
        break;
      case 'kill_switch':
        triggerEmergencyStop();
        setIsHeroLogoOpen(false);
        return;
      case 'settings':
        setActiveView('settings');
        setIsRadialOpen(false);
        setIsRadialClosing(false);
        return;
      default:
        break;
    }
    startClosingAnimation();
  };

  // 8 Wheel Slot Angles for SVG annular paths (starting -90 at 12 o'clock)
  const SLOT_ANGLES = [-90, -45, 0, 45, 90, 135, 180, 225];

  // 8 Free Fire Radial Actions dynamically ordered by user's personalized Frequent Task Shortcuts configuration
  const radialActions = radialButtonOrder.map((actionId) => {
    const act = RADIAL_ACTIONS_CATALOG[actionId];
    return {
      ...act,
      activeState: actionId === 'voice' ? isListening : undefined,
    };
  });

  // Helper to generate SVG Annular Sector Path for 1-by-1 wheel filling
  const getSectorPath = (centerAngleDeg: number, rInner = 92, rOuter = 196) => {
    const startDeg = centerAngleDeg - 22.5;
    const endDeg = centerAngleDeg + 22.5;
    const a1 = (startDeg * Math.PI) / 180;
    const a2 = (endDeg * Math.PI) / 180;
    const x1 = +(rInner * Math.cos(a1)).toFixed(2);
    const y1 = +(rInner * Math.sin(a1)).toFixed(2);
    const x2 = +(rOuter * Math.cos(a1)).toFixed(2);
    const y2 = +(rOuter * Math.sin(a1)).toFixed(2);
    const x3 = +(rOuter * Math.cos(a2)).toFixed(2);
    const y3 = +(rOuter * Math.sin(a2)).toFixed(2);
    const x4 = +(rInner * Math.cos(a2)).toFixed(2);
    const y4 = +(rInner * Math.sin(a2)).toFixed(2);
    return `M ${x1} ${y1} L ${x2} ${y2} A ${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rInner} ${rInner} 0 0 0 ${x1} ${y1} Z`;
  };

  // Drag dynamics relative to screen dimensions
  const halfW = typeof window !== 'undefined' ? window.innerWidth / 2 : 700;
  const halfH = typeof window !== 'undefined' ? window.innerHeight / 2 : 450;
  const progressX = Math.abs(dragOffset.x) / halfW;
  const progressY = Math.abs(dragOffset.y) / halfH;
  const dragProgress = Math.max(progressX, progressY);

  const dragRotation = (dragOffset.x / halfW) * 20;
  const dragOpacity = Math.max(0.65, 1 - dragProgress * 0.35);

  let transformStyle = '';
  let transitionStyle = '';
  let opacityStyle = 1;

  if (isDismissing) {
    transformStyle = `translate(${dismissVector.x}px, ${dismissVector.y}px) scale(0.15)`;
    transitionStyle = 'transform 450ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 450ms ease-out';
    opacityStyle = 0;
  } else if (isDragging) {
    transformStyle = `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(0.96) rotate(${dragRotation}deg)`;
    transitionStyle = 'none';
    opacityStyle = dragOpacity;
  } else {
    // Settled at center (smoothly returns along the dragged path back to center, stays open)
    transformStyle = 'translate(0px, 0px) scale(1) rotate(0deg)';
    transitionStyle = 'transform 380ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease-out';
    opacityStyle = 1;
  }

  return (
    <div
      className={`fixed inset-0 z-[100] pointer-events-none flex items-center justify-center select-none overflow-hidden transition-opacity duration-300 ${
        isDismissing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Floating Popup Orb Card (Geometric Center Anchor for Logo and 8 Buttons) */}
      <div
        className={`relative flex items-center justify-center pointer-events-auto ${
          isClosing
            ? 'animate-hero-fly-out'
            : !entryAnimationComplete
            ? 'animate-hero-fly-in'
            : ''
        }`}
        style={
          isClosing
            ? undefined
            : {
                transform: transformStyle,
                transition: transitionStyle,
                opacity: opacityStyle,
              }
        }
      >
        {/* Free Fire Style Segmented Radial Wheel Background (Centered at 0,0) */}
        {isRadialOpen && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center animate-fadeIn transition-all duration-300">
            <svg
              className="w-[450px] h-[450px] sm:w-[480px] sm:h-[480px] drop-shadow-[0_0_35px_rgba(0,0,0,0.95)]"
              viewBox="-225 -225 450 450"
            >
              {/* Outer Wheel Base */}
              <circle
                r="200"
                fill="rgba(4, 8, 18, 0.88)"
                stroke="rgba(34, 211, 238, 0.4)"
                strokeWidth="2"
              />
              <circle
                r="196"
                fill="none"
                stroke="rgba(34, 211, 238, 0.2)"
                strokeWidth="4"
                strokeDasharray="4 8"
              />

              {/* 8 Annular Wheel Sectors: Synchronized illumination with linked roll */}
              {SLOT_ANGLES.map((angle, slotIdx) => {
                const isHovered = hoveredSlotIdx === slotIdx;
                const pathD = getSectorPath(angle);
                const currentAction = radialActions[7 - slotIdx];

                return (
                  <path
                    key={`slot-sector-${slotIdx}`}
                    ref={(el) => {
                      sectorRefs.current[slotIdx] = el;
                    }}
                    d={pathD}
                    className="cursor-pointer pointer-events-auto"
                    fill={
                      isHovered
                        ? 'rgba(6, 182, 212, 0.45)'
                        : 'rgba(10, 25, 54, 0.85)'
                    }
                    stroke={
                      isHovered
                        ? 'rgba(103, 232, 249, 0.95)'
                        : 'rgba(34, 211, 238, 0.65)'
                    }
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{
                      opacity: isAnimationSettled ? 1 : 0.15,
                      transition: 'fill 180ms ease-out, stroke 180ms ease-out, stroke-width 180ms ease-out, opacity 250ms ease-out',
                    }}
                    onMouseEnter={() => setHoveredSlotIdx(slotIdx)}
                    onMouseLeave={() => setHoveredSlotIdx(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentAction) {
                        handleActionClick(currentAction.id);
                      }
                    }}
                  />
                );
              })}

              {/* 8 Sector Radial Divider Spokes at 22.5 deg offsets */}
              {[-112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5, 202.5].map((ang, i) => {
                const r = (ang * Math.PI) / 180;
                const x1 = Math.round(92 * Math.cos(r));
                const y1 = Math.round(92 * Math.sin(r));
                const x2 = Math.round(198 * Math.cos(r));
                const y2 = Math.round(198 * Math.sin(r));
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(34, 211, 238, 0.35)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Orbit Guide Track */}
              <circle
                r={RADIUS}
                fill="none"
                stroke="rgba(34, 211, 238, 0.25)"
                strokeWidth="1"
                strokeDasharray="2 6"
              />

              {/* Inner Hub Border Circle */}
              <circle
                r="90"
                fill="rgba(4, 7, 18, 0.95)"
                stroke="rgba(34, 211, 238, 0.65)"
                strokeWidth="2"
              />
              <circle
                r="86"
                fill="none"
                stroke="rgba(34, 211, 238, 0.3)"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            </svg>
          </div>
        )}

        {/* 8 Free Fire Radial Action Buttons (Rigidly Linked 45° Chain - ZERO Overlap) */}
        {isRadialOpen && (
          <div key={`radial-buttons-${radialKey}`} className="contents">
            {radialActions.map((action, idx) => {
              const slotIdx = 7 - idx; // Target settled slot for hover sync
              const IconComp = action.icon;
              const isHovered = hoveredSlotIdx === slotIdx;
              const finalAngle = 315 - idx * 45;
              const finalRad = (finalAngle * Math.PI) / 180;
              const finalX = Math.round(RADIUS * Math.sin(finalRad));
              const finalY = Math.round(-RADIUS * Math.cos(finalRad));

              return (
                <div
                  key={action.id}
                  ref={(el) => {
                    buttonWrapperRefs.current[idx] = el;
                  }}
                  className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none z-30"
                  style={
                    isAnimationSettled
                      ? {
                          transform: `translate(${finalX}px, ${finalY}px)`,
                          opacity: 1,
                          pointerEvents: 'auto',
                        }
                      : {
                          willChange: 'transform, opacity',
                          opacity: 0,
                          pointerEvents: 'none',
                        }
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActionClick(action.id);
                    }}
                    onMouseEnter={() => setHoveredSlotIdx(slotIdx)}
                    onMouseLeave={() => setHoveredSlotIdx(null)}
                    style={{
                      transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      pointerEvents: 'auto',
                    }}
                    className={`relative -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 bg-gradient-to-br ${action.color} ${action.border} ${action.glow} backdrop-blur-xl shadow-2xl group focus:outline-none cursor-pointer active:scale-95`}
                    title={`${action.label} (${action.sublabel})`}
                  >
                    {/* Glowing border ring */}
                    <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />

                    <IconComp className={`w-6 h-6 sm:w-7 sm:h-7 ${action.text} transition-transform group-hover:scale-110`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Center Multi-Layer Glow & Soundwave Effects */}
        <div className="relative flex items-center justify-center group cursor-grab active:cursor-grabbing z-20">
          {/* Layer 1: Ambient Aura */}
          <div
            className={`absolute -inset-10 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
              voiceState === 'speaking'
                ? 'bg-gradient-to-r from-cyan-500/40 via-blue-500/50 to-purple-500/40 opacity-90 scale-125'
                : isListening
                ? 'bg-gradient-to-r from-rose-500/40 via-pink-500/50 to-cyan-500/40 opacity-90 scale-120 animate-pulse'
                : voiceState === 'processing'
                ? 'bg-gradient-to-r from-amber-500/40 via-cyan-500/40 to-blue-500/40 opacity-80 animate-spin-slow'
                : 'bg-cyan-500/25 opacity-70 group-hover:opacity-100 group-hover:scale-110'
            }`}
          />

          {/* Layer 2: Concentric Reactive Soundwave Rings */}
          {isListening && (
            <>
              <div className="absolute -inset-6 rounded-full border border-rose-500/40 animate-ping pointer-events-none" />
              <div className="absolute -inset-12 rounded-full border border-pink-400/30 animate-pulse pointer-events-none" />
            </>
          )}

          {voiceState === 'speaking' && (
            <>
              <div className="absolute -inset-8 rounded-full border-2 border-cyan-400/50 animate-ping pointer-events-none" />
              <div className="absolute -inset-14 rounded-full border border-blue-400/30 animate-pulse pointer-events-none" />
            </>
          )}

          {/* Layer 3: Rotating Cyber Segmented Orbital Ring */}
          <div
            className={`absolute -inset-4 rounded-full border-2 border-dashed border-cyan-400/40 pointer-events-none transition-all duration-500 ${
              isRadialOpen
                ? 'animate-[spin_6s_linear_infinite] border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                : voiceState === 'processing'
                ? 'animate-[spin_3s_linear_infinite] border-cyan-300'
                : 'animate-[spin_24s_linear_infinite] group-hover:border-cyan-400/70'
            }`}
          />

          {/* Layer 4: Main Center Hero Logo Disc (Touch, Click & Drag Popup-Button) */}
          <div
            role="button"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 bg-slate-950 transition-all duration-300 touch-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
              isRadialOpen
                ? 'border-cyan-300 shadow-[0_0_50px_rgba(0,240,255,0.8)] scale-105'
                : 'border-cyan-400/70 shadow-[0_0_40px_rgba(0,240,255,0.45)] group-hover:shadow-[0_0_60px_rgba(0,240,255,0.7)] group-hover:scale-105 active:scale-95'
            }`}
            title={
              isRadialOpen
                ? 'Click center logo to collapse wheel • Drag to dismiss'
                : 'Click center logo to open 8 radial buttons • Drag to dismiss'
            }
          >
            {/* Logo Image */}
            <img
              src={appLogo}
              alt="Seyal AI Hero Logo"
              draggable={false}
              className={`w-full h-full object-cover rounded-full pointer-events-none transition-transform duration-700 ${
                isDragging ? 'scale-105' : 'group-hover:scale-105'
              }`}
            />

            {/* Holographic Sheen Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/15 via-transparent to-white/20 pointer-events-none" />

            {/* Radial Open State Glow Ring */}
            {isRadialOpen && (
              <div className="absolute inset-0 rounded-full border-2 border-cyan-300 shadow-[inset_0_0_25px_rgba(0,240,255,0.6)] animate-pulse pointer-events-none" />
            )}

            {/* Dynamic Voice State Ring Indicator inside boundary */}
            <div
              className={`absolute inset-0 rounded-full border-2 transition-colors duration-300 pointer-events-none ${
                voiceState === 'speaking'
                  ? 'border-cyan-300 shadow-[inset_0_0_20px_rgba(0,240,255,0.5)]'
                  : isListening
                  ? 'border-rose-400 shadow-[inset_0_0_20px_rgba(244,63,94,0.5)]'
                  : 'border-transparent'
              }`}
            />
          </div>
        </div>

        {/* Dynamic Status Pill & Hint: ONLY shown when wheel is closed, positioned absolutely below so center logo is 100% untouched */}
        {!isRadialOpen && (
          <div className="absolute top-full mt-4 flex flex-col items-center pointer-events-none whitespace-nowrap">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 shadow-lg shadow-cyan-950/40 backdrop-blur-md transition-all duration-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  voiceState === 'speaking'
                    ? 'bg-cyan-400 animate-ping'
                    : isListening
                    ? 'bg-rose-400 animate-ping'
                    : voiceState === 'processing'
                    ? 'bg-amber-400 animate-bounce'
                    : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-cyan-200">
                {voiceState === 'speaking'
                  ? 'Assistant Speaking'
                  : isListening
                  ? 'Listening to Voice...'
                  : voiceState === 'processing'
                  ? 'Thinking & Processing...'
                  : 'Seyal AI Ready'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
