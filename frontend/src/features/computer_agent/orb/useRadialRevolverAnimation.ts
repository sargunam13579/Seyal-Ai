import { useState, useRef, useEffect, useCallback } from 'react';
import { RADIUS } from './types';

interface UseRadialRevolverAnimationProps {
  isClosing?: boolean;
  closeHeroLogo: () => void;
}

export const useRadialRevolverAnimation = ({
  isClosing = false,
  closeHeroLogo,
}: UseRadialRevolverAnimationProps) => {
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

  // Reverse Roll Animation
  const startClosingAnimation = useCallback(() => {
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
    const closeDuration = Math.max(300, Math.round((startAngle / 315) * 500));

    const animateReverse = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / closeDuration);
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
          const fade = Math.min(1, angle / 20);
          el.style.opacity = String(fade);
          el.style.pointerEvents = 'none';
          const rad = (angle * Math.PI) / 180;
          const x = Math.round(RADIUS * Math.sin(rad));
          const y = Math.round(-RADIUS * Math.cos(rad));
          el.style.transform = `translate(${x}px, ${y}px)`;
        }
      }

      // Settings (button 7) fades & scales out first at 12 o'clock
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
  }, [isRadialClosing, isRadialOpen]);

  const toggleRadialMenu = useCallback(() => {
    if (isRadialClosing) return;
    if (isRadialOpen) {
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
  }, [isRadialClosing, isRadialOpen, startClosingAnimation]);

  // Retract radial wheel in reverse if popup is closing
  useEffect(() => {
    if (isClosing && isRadialOpen && !isRadialClosing) {
      startClosingAnimation();
    }
  }, [isClosing, isRadialOpen, isRadialClosing, startClosingAnimation]);

  // Keyboard shortcut: Press Escape (Esc) to close
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
  }, [isRadialOpen, isRadialClosing, closeHeroLogo, startClosingAnimation]);

  // Forward Linked Chain Roll Animation
  useEffect(() => {
    if (!isRadialOpen || isRadialClosing) {
      if (!isRadialOpen) {
        setIsAnimationSettled(false);
      }
      return;
    }

    setIsAnimationSettled(false);
    const startTime = performance.now();
    const duration = 1650;

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
      const ease = 1 - Math.pow(1 - p, 3);
      const wheelAngle = ease * 315;
      currentWheelAngleRef.current = wheelAngle;

      for (let i = 0; i < 8; i++) {
        const el = buttonWrapperRefs.current[i];
        if (!el) continue;

        if (i === 7) {
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

  return {
    isRadialOpen,
    isRadialClosing,
    setIsRadialOpen,
    setIsRadialClosing,
    radialKey,
    hoveredSlotIdx,
    setHoveredSlotIdx,
    isAnimationSettled,
    buttonWrapperRefs,
    sectorRefs,
    startClosingAnimation,
    toggleRadialMenu,
  };
};
