import { Skeleton } from '../ui/skeleton';

/** ギャラリー: Masonry と同じ見え方になるよう高さをばらけさせる */
export function GallerySkeleton({ count = 8 }: { count?: number }) {
  const heights = [180, 240, 200, 280, 220, 190, 260, 210];
  return (
    <div className="columns-2 md:columns-3 gap-4 [&>*]:mb-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="w-full rounded-lg" style={{ height: heights[i % heights.length] }} />
      ))}
    </div>
  );
}

/** 掲示板: ストーリーの丸 + 投稿カード */
export function BoardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="w-12 h-3" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="w-24 h-3" />
                <Skeleton className="w-32 h-2.5" />
              </div>
            </div>
            <Skeleton className="w-3/4 h-4" />
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-2/3 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** メンバー一覧: アバター + 名前のカード */
export function MemberListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-2/3 h-4" />
            <Skeleton className="w-1/2 h-3" />
            <Skeleton className="w-16 h-4 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
