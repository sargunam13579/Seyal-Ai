import { useState, useRef } from 'react';

interface UseOrbDragPhysicsProps {
  isDismissing: boolean;
  setIsDismissing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHeroLogoOpen: (val: boolean) => void;
  onDismiss?: () => void;
  onClick?: () => void;
  toggleRadialMenu: () => void;
}

export const useOrbDragPhysics = ({
  isDismissing,
  setIsDismissing,
  setIsHeroLogoOpen,
  onDismiss,
  onClick,
  toggleRadialMenu,
}: UseOrbDragPhysicsProps) => {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dismissVector, setDismissVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);

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
    // Settled at center
    transformStyle = 'translate(0px, 0px) scale(1) rotate(0deg)';
    transitionStyle = 'transform 380ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease-out';
    opacityStyle = 1;
  }

  return {
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    transformStyle,
    transitionStyle,
    opacityStyle,
  };
};
