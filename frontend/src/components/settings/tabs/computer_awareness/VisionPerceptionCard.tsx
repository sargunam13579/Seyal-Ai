import React from 'react';
import { Eye, Camera, Zap, Lock } from 'lucide-react';
import type { ComputerControlConfig } from './types';

interface VisionPerceptionCardProps {
  isCapturingScreen: boolean;
  onCaptureScreenSnapshot: () => void;
  controlConfig: ComputerControlConfig;
  updateControlConfig: <K extends keyof ComputerControlConfig>(
    key: K,
    val: ComputerControlConfig[K]
  ) => void;
  screenObservation: {
    active_window: string;
    detected_elements_count: number;
    screen_width: number;
    screen_height: number;
    som_base64_image?: string;
    base64_image?: string;
    timestamp: number;
  } | null;
  renderToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const VisionPerceptionCard: React.FC<VisionPerceptionCardProps> = ({
  isCapturingScreen,
  onCaptureScreenSnapshot,
  controlConfig,
  updateControlConfig,
  screenObservation,
  renderToggle,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Live Vision Perception & Grounding</h3>
            <p className="text-[11px] text-slate-400">
              Test what the AI visual agent perceives on your screen with Set-of-Marks UI element grounding
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isCapturingScreen}
          onClick={onCaptureScreenSnapshot}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-950/40"
        >
          <Camera className={`w-3.5 h-3.5 ${isCapturingScreen ? 'animate-pulse' : ''}`} />
          <span>{isCapturingScreen ? 'Observing Screen...' : 'Capture & Inspect Screen'}</span>
        </button>
      </div>

      {/* Set of Marks Grounding Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Set-of-Marks (SoM) Grounding Tag Overlay
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Automatically draw numeric markers and bounding boxes over interactable UI buttons & inputs.
            </p>
          </div>
          {renderToggle(controlConfig.somGroundingTags, (val) =>
            updateControlConfig('somGroundingTags', val)
          )}
        </div>

        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Mask Sensitive Passwords & OTPs
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Auto-blur confidential inputs and banking screens when sending visual frames to the vision LLM.
            </p>
          </div>
          {renderToggle(controlConfig.maskSensitiveInputFields, (val) =>
            updateControlConfig('maskSensitiveInputFields', val)
          )}
        </div>
      </div>

      {/* Live Observation Result Card */}
      {screenObservation && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-cyan-300 font-bold">Active Focus:</span>
              <span className="text-white truncate max-w-xs">{screenObservation.active_window || 'Desktop'}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>Resolution: {screenObservation.screen_width} x {screenObservation.screen_height}</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                {screenObservation.detected_elements_count} Grounded Elements
              </span>
            </div>
          </div>

          {/* Thumbnail Snapshot */}
          {(screenObservation.som_base64_image || screenObservation.base64_image) && (
            <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-72 flex justify-center bg-black/80">
              <img
                src={`data:image/png;base64,${
                  screenObservation.som_base64_image || screenObservation.base64_image
                }`}
                alt="Grounding Snapshot"
                className="max-h-72 w-auto object-contain rounded"
              />
              <span className="absolute bottom-2 right-2 text-[10px] bg-slate-950/80 text-cyan-300 px-2 py-1 rounded font-mono border border-cyan-500/30">
                Visual Grounding Feed
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
