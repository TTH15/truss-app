import Link from "next/link";

/**
 * 規約・ポリシー本文のプレーンテキストを整形して表示する。
 * 書式は lib/site-documents.ts の冒頭コメント参照（見出し・箇条書きの規則）。
 * サーバー/クライアント両方から使う（運営画面のプレビューでも利用）。
 */
export function PolicyDocumentBody({ content }: { content: string }) {
  const cleanedDoc = content
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (t.startsWith("---")) return "";
      return line;
    })
    .join("\n")
    .trim();

  const blocks = cleanedDoc
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5 text-sm sm:text-[15px] leading-7">
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const first = lines[0] || "";
        const headingType =
          /^\d+\.\s/.test(first) || /^第\d+条/.test(first)
            ? "h2"
            : /^\(\d+\)\s/.test(first)
              ? "h3"
              : "none";

        return (
          <section key={blockIndex} className="space-y-2">
            {headingType === "h2" && (
              <h2 className="text-lg sm:text-xl font-bold leading-snug mt-2">{first}</h2>
            )}
            {headingType === "h3" && (
              <h3 className="text-base sm:text-lg font-semibold leading-snug mt-2">{first}</h3>
            )}
            {headingType === "none" && (
              <p className="text-sm sm:text-[15px] leading-7">{first}</p>
            )}

            {lines.slice(1).map((line, i) => {
              const isNumberedPoint = /^\d+\.\s/.test(line);
              const isBulletPoint = line.startsWith("・");
              return (
                <p
                  key={`${blockIndex}-${i}`}
                  className={
                    isNumberedPoint
                      ? "pl-6 font-medium text-sm sm:text-[15px] leading-7"
                      : isBulletPoint
                        ? "pl-4 text-sm sm:text-[15px] leading-7"
                        : "text-sm sm:text-[15px] leading-7"
                  }
                >
                  {line}
                </p>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

/** 規約・ポリシー公開ページの共通レイアウト（固定ヘッダー + 本文） */
export function PolicyPage({
  title,
  intro,
  content,
}: {
  title: string;
  intro: string;
  content: string;
}) {
  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#3D3D4E]">
      <header className="fixed top-0 left-0 right-0 z-20 bg-[#F5F1E8]/95 backdrop-blur border-b border-[rgba(61,61,78,0.12)]">
        <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-16 h-14 flex items-center justify-between">
          <Link href="/login" className="text-sm font-medium text-[#49B1E4]">
            戻る
          </Link>
          <h1 className="text-base sm:text-lg font-semibold tracking-[-0.01em]">{title}</h1>
          <span className="w-10" aria-hidden="true"></span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-16 pt-20 pb-12">
        <p className="mb-6 text-xs sm:text-sm text-[#3D3D4E]/70">{intro}</p>
        <PolicyDocumentBody content={content} />
      </main>
    </div>
  );
}
