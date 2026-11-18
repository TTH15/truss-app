import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_CHAT_ATTENTION, queryAdminChatAttention, saveAdminChatAttention, dismissAdminChatAttention, restoreAdminChatAttention, type AdminChatAttentionPreferences } from '@truss/core';

export function useAdminChatAttention(adminId?: string) {
  const [state, setState] = useState<{ owner?: string; preferences: AdminChatAttentionPreferences; dismissals: Record<string, number> }>({ preferences: DEFAULT_CHAT_ATTENTION, dismissals: {} });
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyOwner, setBusyOwner] = useState<string | null>(null);
  const busy = busyOwner === adminId;
  const [now, setNow] = useState(Date.now);
  const generation = useRef(0);
  const owner = useRef(adminId);
  useEffect(() => { owner.current = adminId; return () => { owner.current = undefined; }; }, [adminId]);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    if (!adminId) return;
    await Promise.resolve();
    if (owner.current !== adminId || request !== generation.current) return false;
    setLoading(true);
    try {
      const result = await queryAdminChatAttention(adminId);
      if (request !== generation.current || owner.current !== adminId) return;
      setState({ owner: adminId, ...result });
      setError(false);
      return true;
    } catch {
      if (request === generation.current && owner.current === adminId) setError(true);
      return false;
    } finally {
      if (request === generation.current && owner.current === adminId) setLoading(false);
    }
  }, [adminId]);
  useEffect(() => {
    void Promise.resolve().then(reload);
    const focus = () => { setNow(Date.now()); void reload(); };
    const visibility = () => { if (document.visibilityState === 'visible') focus(); };
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visibility); };
  }, [reload]);
  const mutate = async (action: (id: string) => Promise<void>) => {
    if (!adminId || state.owner !== adminId || loading || error || busy) throw new Error('Attention settings unavailable');
    const id = adminId;
    ++generation.current;
    setBusyOwner(id);
    try { await action(id); if (owner.current === id && !(await reload())) throw new Error('Could not refresh settings'); }
    finally { setBusyOwner((value) => value === id ? null : value); }
  };
  return {
    preferences: state.owner === adminId ? state.preferences : DEFAULT_CHAT_ATTENTION,
    dismissals: state.owner === adminId ? state.dismissals : {},
    ready: !!adminId && state.owner === adminId && !loading && !error,
    error, busy, now, reload,
    save: (preferences: AdminChatAttentionPreferences) => mutate((id) => saveAdminChatAttention(id, preferences)),
    dismiss: (thread: string, messageId: number) => mutate((id) => dismissAdminChatAttention(id, thread, messageId)),
    restore: (thread?: string) => mutate((id) => restoreAdminChatAttention(id, thread)),
  };
}
