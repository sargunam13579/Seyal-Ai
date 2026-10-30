import React, { useState, useEffect } from 'react';
import { useSeyalAi } from '../../context/SeyalAiContext';
import { useVoice } from '../../context/VoiceContext';
import { RADIAL_ACTIONS_CATALOG } from '../../config/radialActionsConfig';
import { useOrbDragPhysics } from './orb/useOrbDragPhysics';
import { useRadialRevolverAnimation } from './orb/useRadialRevolverAnimation';
import { RadialWheelSectors } from './orb/RadialWheelSectors';
import { RadialActionButtons } from './orb/RadialActionButtons';
import { HeroLogoOrbCore } from './orb/HeroLogoOrbCore';
import type { HeroAgentLogoOrbProps } from './orb/types';

export const HeroAgentLogoOrb: React.FC<HeroAgentLogoOrbProps> = ({
  onDismiss,
  onClick,
  isClosing = false,
}) => {
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
  const [isDismissing, setIsDismissing] = useState<boolean>(false);
  const [entryAnimationComplete, setEntryAnimationComplete] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEntryAnimationComplete(true);
    }, 1250);
    return () => clearTimeout(timer);
  }, []);

  const {
    isRadialOpen,
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
  } = useRadialRevolverAnimation({
    isClosing,
    closeHeroLogo,
  });

  const {
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    transformStyle,
    transitionStyle,
    opacityStyle,
  } = useOrbDragPhysics({
    isDismissing,
    setIsDismissing,
    setIsHeroLogoOpen,
    onDismiss,
    onClick,
    toggleRadialMenu,
  });

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

  const radialActions = radialButtonOrder.map((actionId) => {
    const act = RADIAL_ACTIONS_CATALOG[actionId];
    return {
      ...act,
      activeState: actionId === 'voice' ? isListening : undefined,
    };
  });

  return (
    <div
      className={`fixed inset-0 z-[100] pointer-events-none flex items-center justify-center select-none overflow-hidden transition-opacity duration-300 ${
        isDismissing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Floating Popup Orb Card */}
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
        {/* Free Fire Style Segmented Radial Wheel Background */}
        <RadialWheelSectors
          isRadialOpen={isRadialOpen}
          hoveredSlotIdx={hoveredSlotIdx}
          setHoveredSlotIdx={setHoveredSlotIdx}
          isAnimationSettled={isAnimationSettled}
          radialActions={radialActions}
          sectorRefs={sectorRefs}
          onActionClick={handleActionClick}
        />

        {/* 8 Free Fire Radial Action Buttons */}
        <RadialActionButtons
          isRadialOpen={isRadialOpen}
          radialKey={radialKey}
          radialActions={radialActions}
          hoveredSlotIdx={hoveredSlotIdx}
          setHoveredSlotIdx={setHoveredSlotIdx}
          isAnimationSettled={isAnimationSettled}
          buttonWrapperRefs={buttonWrapperRefs}
          onActionClick={handleActionClick}
        />

        {/* Center Multi-Layer Glow, Soundwave & Logo Orb */}
        <HeroLogoOrbCore
          voiceState={voiceState}
          isListening={isListening}
          isRadialOpen={isRadialOpen}
          isDragging={isDragging}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  );
};
