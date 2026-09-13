import React, { useRef } from 'react';
import { Crosshair, RotateCcw } from 'lucide-react';

interface FocalPointPickerProps {
  imageUrl: string;
  focalPoint?: { x: number; y: number };
  onChange: (point: { x: number; y: number }) => void;
  aspectRatioClass?: string;
}

export const FocalPointPicker: React.FC<FocalPointPickerProps> = ({
  imageUrl,
  focalPoint = { x: 50, y: 50 },
  onChange,
  aspectRatioClass = 'aspect-[16/9]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = Math.max(0, Math.min(100, Math.round((clientX / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round((clientY / rect.height) * 100)));

    onChange({ x, y });
  };

  const handleReset = () => {
    onChange({ x: 50, y: 50 });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-700 flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-brand-blue" />
          Click Image to Set Visual Focal Point
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="text-gray-500 hover:text-brand-blue flex items-center gap-1 text-[11px] font-mono transition-colors"
          title="Reset to center (50%, 50%)"
        >
          <RotateCcw className="w-3 h-3" />
          Reset (Center)
        </button>
      </div>

      {/* Interactive Image Canvas */}
      <div
        ref={containerRef}
        onClick={handleClick}
        className={`relative w-full ${aspectRatioClass} rounded-lg overflow-hidden cursor-crosshair border-2 border-dashed border-gray-300 hover:border-brand-blue transition-colors bg-gray-950 select-none group shadow-inner`}
      >
        <img
          src={imageUrl}
          alt="Focal point preview"
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }}
        />

        {/* Subtle grid lines */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
          <div className="border-r border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-r border-b border-white" />
          <div className="border-b border-white" />
          <div className="border-r border-white" />
          <div className="border-r border-white" />
          <div />
        </div>

        {/* Target Pin Marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
          style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-brand-blue/30 animate-ping absolute" />
            <div className="w-6 h-6 rounded-full bg-brand-blue border-2 border-white shadow-lg flex items-center justify-center text-white text-[9px] font-mono font-bold">
              •
            </div>
          </div>
        </div>

        {/* Hover helper badge */}
        <div className="absolute bottom-2 left-2 bg-dark/80 text-white text-[10px] font-mono px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
          X: {focalPoint.x}% · Y: {focalPoint.y}%
        </div>
      </div>

      {/* Coordinate Sliders */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <div className="flex justify-between text-[11px] text-gray-500 font-mono mb-1">
            <span>Horizontal (X)</span>
            <span className="font-bold text-dark">{focalPoint.x}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={focalPoint.x}
            onChange={(e) => onChange({ ...focalPoint, x: Number(e.target.value) })}
            className="w-full accent-brand-blue cursor-pointer h-1.5 bg-gray-200 rounded-lg"
          />
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-gray-500 font-mono mb-1">
            <span>Vertical (Y)</span>
            <span className="font-bold text-dark">{focalPoint.y}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={focalPoint.y}
            onChange={(e) => onChange({ ...focalPoint, y: Number(e.target.value) })}
            className="w-full accent-brand-blue cursor-pointer h-1.5 bg-gray-200 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
