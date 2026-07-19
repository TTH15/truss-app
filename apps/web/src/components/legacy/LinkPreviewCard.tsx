import { useEffect, useState } from 'react';

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

// 同一URLへの再フェッチを避けるためのモジュールレベルキャッシュ（タブを開いている間だけ有効でよい）
const previewCache = new Map<string, LinkPreviewData | null>();

interface LinkPreviewCardProps {
  url: string;
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [data, setData] = useState<LinkPreviewData | null | undefined>(previewCache.get(url));
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) {
      setData(previewCache.get(url));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('failed');
        const json = (await res.json()) as LinkPreviewData;
        if (!cancelled) {
          previewCache.set(url, json);
          setData(json);
        }
      } catch {
        if (!cancelled) {
          previewCache.set(url, null);
          setData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (data === null) return null;
  if (data === undefined) {
    return (
      <div className="mt-1 max-w-[280px] rounded-xl border border-gray-200 bg-white p-2 animate-pulse">
        <div className="h-3 w-3/4 bg-gray-200 rounded" />
      </div>
    );
  }
  // タイトルも説明もなく、画像も読み込めなかった場合は壊れた見た目になるので何も出さない
  if (!data.title && (!data.image || imageFailed)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex max-w-[280px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
    >
      {data.image && !imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image} alt="" className="h-32 w-full object-cover" onError={() => setImageFailed(true)} />
      )}
      <div className="p-2 min-w-0">
        {data.title && <p className="text-sm font-medium text-[#3D3D4E] truncate">{data.title}</p>}
        {data.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{data.description}</p>}
        {data.siteName && <p className="text-xs text-gray-400 truncate mt-0.5">{data.siteName}</p>}
      </div>
    </a>
  );
}
