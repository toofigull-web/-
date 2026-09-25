import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  className = '',
}) => {
  const toggleId = id || (label ? `toggle-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <label
      htmlFor={toggleId}
      className={`ui-toggle-wrapper ${disabled ? 'disabled' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        id={toggleId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`ui-toggle-track ${checked ? 'checked' : 'unchecked'}`}
      >
        <span className={`ui-toggle-thumb ${checked ? 'checked' : 'unchecked'}`} />
      </button>
      {label && <span className="ui-toggle-label">{label}</span>}
    </label>
  );
};
