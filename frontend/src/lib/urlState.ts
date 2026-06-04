import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Two-way bind a single URL search param. Reading is cheap; writing replaces
 * the param without scrolling. `defaultValue` is omitted from the URL when
 * the current value matches it (keeps shareable links short).
 */
export function useUrlParam(
  key: string,
  defaultValue = ''
): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? defaultValue;
  const set = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (!next || next === defaultValue) p.delete(key);
          else p.set(key, next);
          return p;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setParams]
  );
  return [value, set];
}

/** Same as `useUrlParam` but coerces to/from a number. */
export function useUrlNumber(
  key: string,
  defaultValue: number
): [number, (next: number) => void] {
  const [raw, setRaw] = useUrlParam(key, String(defaultValue));
  const value = useMemo(() => {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : defaultValue;
  }, [raw, defaultValue]);
  const set = useCallback((n: number) => setRaw(String(n)), [setRaw]);
  return [value, set];
}
