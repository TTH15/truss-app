'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { queryFeeSettings, type FeeSettings } from '@truss/core';

export function useFeeSettings(enabled = true) {
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const request = useRef({ id: 0 });
  const refresh = useCallback(async () => {
    const current = ++request.current.id;
    setLoading(true);
    try {
      const next = await queryFeeSettings();
      if (current !== request.current.id) return;
      setSettings(next);
      setError(false);
    } catch {
      if (current !== request.current.id) return;
      setSettings(null);
      setError(true);
    } finally {
      if (current === request.current.id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const pending = request.current;
    const initial = window.setTimeout(() => void refresh(), 0);
    const revalidate = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    window.addEventListener('truss-fee-settings-updated', revalidate);
    return () => {
      window.clearTimeout(initial);
      pending.id++;
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
      window.removeEventListener('truss-fee-settings-updated', revalidate);
    };
  }, [enabled, refresh]);

  return { settings, error, loading, refresh };
}
