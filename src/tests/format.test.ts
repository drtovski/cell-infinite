import { describe, it, expect } from 'vitest';
import { fmt, formatDecimal, formatTime, formatCountdown } from '../game/format';
import { D } from '../game/decimal';

describe('formatDecimal', () => {
  it('renders small numbers plainly', () => {
    expect(fmt(0)).toBe('0');
    expect(fmt(7)).toBe('7');
    expect(fmt(0.5)).toBe('0.5');
    expect(fmt(999)).toBe('999');
  });

  it('applies short-scale suffixes with 3 significant figures', () => {
    expect(fmt(1250)).toBe('1.25K');
    expect(fmt(3.48e6)).toBe('3.48M');
    expect(fmt(7.91e9)).toBe('7.91B');
    expect(fmt(12_340)).toBe('12.3K');
    expect(fmt(123_400)).toBe('123K');
  });

  it('handles very large magnitudes past the double ceiling', () => {
    expect(fmt(D('1e33'))).toBe('1Dc');
    expect(fmt(D('1e63'))).toBe('1Vg');
    // Beyond the suffix table it falls back to scientific.
    expect(fmt(D('1e120'))).toMatch(/e120$/);
  });

  it('supports a scientific notation mode', () => {
    expect(formatDecimal(1.23e45, { notation: 'scientific' })).toBe('1.23e45');
  });

  it('renders negatives', () => {
    expect(fmt(-2500)).toBe('-2.5K');
  });
});

describe('formatTime / formatCountdown', () => {
  it('formats durations', () => {
    expect(formatTime(0)).toBe('0s');
    expect(formatTime(90)).toBe('1m 30s');
    expect(formatTime(3661)).toBe('1h 1m');
  });
  it('formats countdowns', () => {
    expect(formatCountdown(5.2)).toBe('5.2s');
    expect(formatCountdown(75)).toBe('1:15');
  });
});
