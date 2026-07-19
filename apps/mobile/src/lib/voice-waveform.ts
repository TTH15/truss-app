/** ボイスメッセージの波形表示に使う本数（送信時にこの本数へ間引く） */
export const WAVEFORM_BAR_COUNT = 28;

/** ライブ録音中に表示する直近サンプル数（この本数だけ流れるように表示する） */
export const LIVE_WAVEFORM_BAR_COUNT = 28;

/** expo-audioのmetering値（dBFS、おおよそ-160〜0）を0〜1の高さに正規化する */
export function normalizeMeteringLevel(db: number): number {
  if (!Number.isFinite(db)) return 0;
  const clamped = Math.max(-50, Math.min(0, db));
  return (clamped + 50) / 50;
}

/** 収集した音量サンプルを固定本数にバケット平均で間引く */
export function downsampleLevels(levels: number[], barCount: number): number[] {
  if (levels.length === 0) return new Array(barCount).fill(0.08);
  const result: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const start = Math.floor((i / barCount) * levels.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / barCount) * levels.length));
    const slice = levels.slice(start, end);
    const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    result.push(Math.max(0.08, avg));
  }
  return result;
}

export function formatSecondsAsClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMillisAsClock(millis: number): string {
  return formatSecondsAsClock(millis / 1000);
}
