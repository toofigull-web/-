import React from 'react';

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  label,
  id,
  className = '',
}) => {
  const sliderId = id || (label ? `slider-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={`ui-slider-wrapper ${className}`.trim()}>
      {label && (
        <div className="ui-slider-label-row">
          <label htmlFor={sliderId}>{label}</label>
          <span className="ui-slider-value">{value}</span>
        </div>
      )}
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ui-slider-input"
        style={{
          background: `linear-gradient(to right, var(--brand) ${percentage}%, var(--line) ${percentage}%)`,
          accentColor: 'var(--brand)',
        }}
      />
    </div>
  );
};
