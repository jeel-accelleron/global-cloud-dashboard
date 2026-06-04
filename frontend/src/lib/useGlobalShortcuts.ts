import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { useQueryClient } from '@tanstack/react-query';

const ROUTES: Record<string, string> = {
  d: '/dashboard',
  p: '/projects',
  b: '/pbis',
  t: '/tasks',
  m: '/missing',
  w: '/work-items',
  a: '/analytics',
  i: '/team',
  c: '/chat',
  y: '/my',
};

/**
 * Wires global keyboard shortcuts:
 *   - Ctrl/Cmd+K  → toggle command palette
 *   - /           → focus the topbar search (or open palette if missing)
 *   - g <key>     → jump to a route (g d, g p, g t, …)
 *   - t           → toggle theme
 *   - ?           → open palette (placeholder for shortcut help)
 *   - r           → invalidate all queries (refresh)
 */
export function useGlobalShortcuts(
  toggleCommandPalette: () => void,
  openCommandPalette: () => void
) {
  const nav = useNavigate();
  const { toggle: toggleTheme } = useTheme();
  const qc = useQueryClient();
  const lastG = useRef<number>(0);

  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      );
    };

    const focusSearch = () => {
      const input = document.querySelector<HTMLInputElement>(
        'header input[placeholder*="Search"]'
      );
      if (input) {
        input.focus();
        input.select();
      } else {
        openCommandPalette();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K always works, even from inputs.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      if (isTyping(e.target)) return;

      if (e.key === '/') {
        e.preventDefault();
        focusSearch();
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (e.key === 't') {
        e.preventDefault();
        toggleTheme();
        return;
      }
      if (e.key === 'r') {
        e.preventDefault();
        qc.invalidateQueries();
        return;
      }

      const now = Date.now();
      if (e.key === 'g') {
        lastG.current = now;
        return;
      }
      if (now - lastG.current < 1200) {
        const target = ROUTES[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          nav(target);
          lastG.current = 0;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav, toggleTheme, qc, toggleCommandPalette, openCommandPalette]);
}
