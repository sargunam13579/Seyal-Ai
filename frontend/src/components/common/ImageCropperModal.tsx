import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, RotateCw, X, Check, Undo2 } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const VIEWPORT_SIZE = 300; // 300px square container
const CROP_DIAMETER = 240; // 240px circular crop viewport
const OUTPUT_RESOLUTION = 512; // 512x512 crisp Retina-optimized HD resolution

// High clarity Image Sharpening & Micro-contrast Enhancement Filter (Permanently High)
function applyHDSharpening(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number = 0.55 // Always high clarity
) {
  if (amount <= 0) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const copy = new Uint8ClampedArray(data);

  // 3x3 high-pass unsharp mask kernel
  const a = amount;
  const centerWeight = 1 + 4 * a;

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const topOffset = (y - 1) * width;
    const bottomOffset = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const idx = (rowOffset + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const top = copy[(topOffset + x) * 4 + c];
        const bottom = copy[(bottomOffset + x) * 4 + c];
        const left = copy[(rowOffset + (x - 1)) * 4 + c];
        const right = copy[(rowOffset + (x + 1)) * 4 + c];

        const sharpVal = center * centerWeight - (top + bottom + left + right) * a;
        data[idx + c] = sharpVal > 255 ? 255 : sharpVal < 0 ? 0 : sharpVal;
      }
    }
  }

  // Contrast enhancement (+5%) to make colors pop and eliminate haze
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const val = data[i + c];
      const contrastAdjusted = ((val / 255 - 0.5) * 1.05 + 0.5) * 255;
      data[i + c] = contrastAdjusted > 255 ? 255 : contrastAdjusted < 0 ? 0 : contrastAdjusted;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onCrop,
  onCancel,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset state when a new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({
      width: img.naturalWidth || 400,
      height: img.naturalHeight || 400,
    });
  };

  // Base scale calculation so image completely covers the crop circle
  const getBaseScale = useCallback(() => {
    if (!naturalSize.width || !naturalSize.height) return 1;
    const isSwapped = rotation === 90 || rotation === 270;
    const w = isSwapped ? naturalSize.height : naturalSize.width;
    const h = isSwapped ? naturalSize.width : naturalSize.height;
    return Math.max(CROP_DIAMETER / w, CROP_DIAMETER / h);
  }, [naturalSize, rotation]);

  const baseScale = getBaseScale();

  // Mouse / Touch Dragging - intact and smooth
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan({
        x: dragStart.panX + dx,
        y: dragStart.panY + dy,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers for mobile/laptop touchscreens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setPan({
      x: dragStart.panX + dx,
      y: dragStart.panY + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3.5, Math.max(1.0, prev + delta)));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // High Resolution Crop Pipeline - clarity always high
  const handleApplyCrop = async () => {
    if (!imageSrc || !naturalSize.width || !naturalSize.height) return;

    // Load clean unstyled image object for pristine pixel sampling
    const cleanImg = new Image();
    cleanImg.crossOrigin = 'anonymous';
    cleanImg.src = imageSrc;
    await new Promise((resolve) => {
      if (cleanImg.complete) resolve(true);
      else cleanImg.onload = () => resolve(true);
    });

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_RESOLUTION;
    canvas.height = OUTPUT_RESOLUTION;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // High quality bicubic image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Canvas center
    const center = OUTPUT_RESOLUTION / 2;
    ctx.translate(center, center);

    // Scale ratio between output canvas and crop diameter
    const ratio = OUTPUT_RESOLUTION / CROP_DIAMETER;

    // 1) Translate by pan scaled to canvas
    ctx.translate(pan.x * ratio, pan.y * ratio);

    // 2) Rotate around center
    ctx.rotate((rotation * Math.PI) / 180);

    // 3) Scale by effective zoom
    const totalScale = baseScale * zoom * ratio;
    ctx.scale(totalScale, totalScale);

    // 4) Draw clean image centered at (0, 0)
    ctx.drawImage(
      cleanImg,
      -naturalSize.width / 2,
      -naturalSize.height / 2,
      naturalSize.width,
      naturalSize.height
    );

    // 5) Reset transform before pixel processing
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 6) Clarity & Edge Sharpening - always high clarity
    applyHDSharpening(ctx, OUTPUT_RESOLUTION, OUTPUT_RESOLUTION, 0.55);

    // 7) Export as high-bitrate JPEG (0.96) for lossless visual sharpness
    const highResDataUrl = canvas.toDataURL('image/jpeg', 0.96);
    onCrop(highResDataUrl);
  };

  if (!isOpen || !imageSrc || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[380px] bg-[#16181b] border border-cyan-500/40 text-slate-100 rounded-3xl p-5 shadow-2xl space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white tracking-wide">Crop Profile Picture</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport & Drag Canvas (Drag functionality fully active) */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          className="relative mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 cursor-grab active:cursor-grabbing flex items-center justify-center shadow-inner"
        >
          {/* Target Image being transformed */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${baseScale * zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="pointer-events-none absolute flex items-center justify-center"
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
              className="max-w-none select-none"
              style={{
                imageRendering: 'auto',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
              }}
              draggable={false}
            />
          </div>

          {/* Circular Vignette Overlay */}
          <svg
            className="absolute inset-0 pointer-events-none w-full h-full"
            viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
          >
            <defs>
              <mask id="crop-circle-mask">
                <rect width="100%" height="100%" fill="white" />
                <circle
                  cx={VIEWPORT_SIZE / 2}
                  cy={VIEWPORT_SIZE / 2}
                  r={CROP_DIAMETER / 2}
                  fill="black"
                />
              </mask>
            </defs>
            {/* Dim exterior */}
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.70)"
              mask="url(#crop-circle-mask)"
            />
            {/* Cyan circular crop guide border */}
            <circle
              cx={VIEWPORT_SIZE / 2}
              cy={VIEWPORT_SIZE / 2}
              r={CROP_DIAMETER / 2}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="6 3"
              className="opacity-85"
            />
          </svg>
        </div>

        {/* Controls Toolbar */}
        <div className="space-y-3 pt-1">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 px-1">
            <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min="1.0"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
            <ZoomIn className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Rotate & Reset Buttons */}
          <div className="flex items-center justify-between px-1 text-xs">
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rotate 90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
