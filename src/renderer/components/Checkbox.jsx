import { Check } from 'lucide-react';

export default function Checkbox({ checked, onChange, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange?.(!checked);
      }}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'border-mfo-green bg-mfo-green' : 'border-mfo-border bg-transparent hover:border-mfo-text-dim'
      } ${className}`}
    >
      {checked && <Check size={11} className="text-black" strokeWidth={3} />}
    </button>
  );
}
