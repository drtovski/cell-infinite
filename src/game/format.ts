import { Decimal, type DecimalSource, D } from './decimal';

export type Notation = 'standard' | 'scientific';

/**
 * Short-scale suffixes. Index 0 is the empty units group (1..999), index 1 is
 * "K" (thousand, 1e3), and so on in steps of 1e3. Anything past this list falls
 * back to scientific notation so the formatter never produces garbage.
 */
const SUFFIXES = [
  '', 'K', 'M', 'B', 'T',
  'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc',
  'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg',
];

function trimTrailingZeros(s: string): string {
  if (s.indexOf('.') === -1) return s;
  return s.replace(/\.?0+$/, '');
}

/** Format a mantissa in [1, 1000) with roughly three significant figures. */
function formatLead(lead: number): string {
  let decimals: number;
  if (lead < 10) decimals = 2;
  else if (lead < 100) decimals = 1;
  else decimals = 0;
  return trimTrailingZeros(lead.toFixed(decimals));
}

function formatScientific(mantissa: number, exponent: number, sign: string): string {
  // Re-normalise a mantissa that rounded up to 10.
  let m = mantissa;
  let e = exponent;
  const mStr = m.toFixed(2);
  if (parseFloat(mStr) >= 10) {
    m = m / 10;
    e += 1;
  }
  return `${sign}${trimTrailingZeros(m.toFixed(2))}e${e}`;
}

export interface FormatOptions {
  notation?: Notation;
  /** Decimal places for values below 1000. Defaults to 2 (trailing zeros trimmed). */
  smallDecimals?: number;
}

/**
 * The single entry point for turning a game value into display text.
 * Handles negatives, sub-thousand values, suffixes, and scientific fallback.
 */
export function formatDecimal(value: DecimalSource, opts: FormatOptions = {}): string {
  const notation = opts.notation ?? 'standard';
  const smallDecimals = opts.smallDecimals ?? 2;
  const d = value instanceof Decimal ? value : D(value);

  // break_infinity stores sign*mantissa*10^exponent; NaN surfaces in mantissa.
  if (Number.isNaN(d.mantissa) || Number.isNaN(d.exponent)) return 'NaN';
  if (d.eq(0)) return '0';

  const sign = d.sign() < 0 ? '-' : '';
  const abs = d.abs();
  const exponent = Math.floor(abs.log10());

  // Small magnitudes: render the plain number with trimmed decimals.
  if (exponent < 3) {
    const n = abs.toNumber();
    if (Number.isInteger(n)) return `${sign}${n}`;
    return `${sign}${trimTrailingZeros(n.toFixed(smallDecimals))}`;
  }

  const mantissa = abs.div(D(10).pow(exponent)).toNumber();

  if (notation === 'scientific') {
    return formatScientific(mantissa, exponent, sign);
  }

  let tier = Math.floor(exponent / 3);
  // lead = value scaled into [1, 1000)
  let lead = mantissa * Math.pow(10, exponent - tier * 3);
  let leadStr = formatLead(lead);
  if (parseFloat(leadStr) >= 1000) {
    lead /= 1000;
    tier += 1;
    leadStr = formatLead(lead);
  }

  if (tier < SUFFIXES.length) {
    return `${sign}${leadStr}${SUFFIXES[tier]}`;
  }
  return formatScientific(mantissa, exponent, sign);
}

/** Convenience wrapper used across the UI. */
export function fmt(value: DecimalSource, notation: Notation = 'standard'): string {
  return formatDecimal(value, { notation });
}

/** Whole numbers with thousands separators (levels, counts). */
export function formatWhole(value: DecimalSource): string {
  const d = value instanceof Decimal ? value : D(value);
  if (d.abs().lt(1e6)) {
    return Math.round(d.toNumber()).toLocaleString('en-US');
  }
  return formatDecimal(d);
}

/** A gain rate, e.g. "12.4K/s". */
export function formatRate(value: DecimalSource, notation: Notation = 'standard'): string {
  return `${formatDecimal(value, { notation })}/s`;
}

/** Multipliers such as "×3.50". */
export function formatMult(value: DecimalSource): string {
  return `×${formatDecimal(value, { smallDecimals: 2 })}`;
}

/** Human friendly durations for cooldowns and offline windows. */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0s';
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor((totalSeconds / 3600) % 24);
  const day = Math.floor(totalSeconds / 86400);
  const parts: string[] = [];
  if (day > 0) parts.push(`${day}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 && day === 0) parts.push(`${m}m`);
  if (s > 0 && day === 0 && h === 0) parts.push(`${s}s`);
  if (parts.length === 0) return '0s';
  return parts.join(' ');
}

/** Short countdown "1:05" style, for ability cooldowns. */
export function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, seconds);
  if (clamped < 10) return `${clamped.toFixed(1)}s`;
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
