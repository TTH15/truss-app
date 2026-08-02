import { useCallback, useState, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * localStorage に永続化する「閉じる」フラグ。
 * SSR・ハイドレーション完了前は true(=非表示)を返し、ハイドレーション後に実際の値になるため
 * effect 内 setState やハイドレーション不一致なしで案内バナー等の表示制御に使える。
 */
export function useLocalStorageDismissal(key: string): [boolean, () => void] {
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const dismiss = useCallback(() => {
    setDismissedNow(true);
    try {
      localStorage.setItem(key, '1');
    } catch {
      // localStorage 不可なら次回また表示されるだけなので無視
    }
  }, [key]);

  let dismissed = true;
  if (hydrated) {
    try {
      dismissed = dismissedNow || localStorage.getItem(key) === '1';
    } catch {
      dismissed = true;
    }
  }
  return [dismissed, dismiss];
}
