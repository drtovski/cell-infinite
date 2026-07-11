import type { ReactNode } from 'react';

export function Meter({ value, gold }: { value: number; gold?: boolean }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={`meter ${gold ? 'gold' : ''}`}>
      <div className="fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`switch ${on ? 'on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  );
}

interface SegOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tag({ children, hue }: { children: ReactNode; hue?: number }) {
  return (
    <span
      className="tag"
      style={hue !== undefined ? { color: `hsl(${hue} 90% 72%)`, borderColor: `hsl(${hue} 90% 60% / 0.35)` } : undefined}
    >
      {children}
    </span>
  );
}
