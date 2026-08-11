import Link from "next/link";
import { splitSiteDocument } from "../../lib/site-documents";

/**
 * 規約・ポリシー本文のプレーンテキストを整形して表示する。
 * 書式は lib/site-documents.ts の冒頭コメント参照（見出し・箇条書きの規則）。
 * サーバー/クライアント両方から使う（運営画面のプレビューでも利用）。
 *
 * variant:
 * - 'document': テキスト全体をそのまま描画（ブロック先頭の「N. 」「第N条」を見出し扱い）
 * - 'section-body': 条文カードの本文用。「N. 」で始まる行は条内の号として描画し、見出しにしない
 */
export function PolicyDocumentBody({
  content,
  variant = "document",
}: {
  content: string;
  variant?: "document" | "section-body";
}) {
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

  const renderLine = (line: string, key: string) => {
    const isNumberedPoint = /^\d+\.\s/.test(line);
    const isBulletPoint = line.startsWith("・");
    return (
      <p
        key={key}
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
  };

  return (
    <div className="space-y-5 text-sm sm:text-[15px] leading-7">
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const first = lines[0] || "";
        const headingType =
          variant === "document" && (/^\d+\.\s/.test(first) || /^第\d+条/.test(first))
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
            {headingType === "none" && renderLine(first, `${blockIndex}-first`)}

            {lines.slice(1).map((line, i) => renderLine(line, `${blockIndex}-${i}`))}
          </section>
        );
      })}
    </div>
  );
}

/**
 * 文書を前文 + 条文カードに区切って描画する（公開ページと運営画面プレビューで共用）。
 * 条文ごとにカードで区切ることで長文でも読みやすくする
 */
export function PolicyArticles({ content }: { content: string }) {
  const { preamble, sections } = splitSiteDocument(content);
  return (
    <div className="space-y-4">
      {preamble && (
        <div className="px-1">
          <PolicyDocumentBody content={preamble} variant="section-body" />
        </div>
      )}
      {sections.map((section, index) => (
        <section
          key={index}
          className="rounded-xl border border-[rgba(61,61,78,0.12)] bg-white/70 p-5 sm:p-6"
        >
          <h2 className="text-base sm:text-lg font-bold leading-snug text-[#3D3D4E]">
            {section.title}
          </h2>
          {section.body && (
            <div className="mt-3">
              <PolicyDocumentBody content={section.body} variant="section-body" />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

/** 規約・ポリシー公開ページの共通レイアウト（固定ヘッダー + 本文） */
export function PolicyPage({
  title,
  intro,
  content,
  updatedAt,
}: {
  title: string;
  intro: string;
  content: string;
  /** 最終改定日時（DB で改定されている場合のみ。既定文面のときは null） */
  updatedAt?: string | null;
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
        <p className="mb-2 text-xs sm:text-sm text-[#3D3D4E]/70">{intro}</p>
        {updatedAt && (
          <p className="mb-6 text-xs text-[#3D3D4E]/60">
            最終改定: {new Date(updatedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
        {!updatedAt && <div className="mb-6" />}
        <PolicyArticles content={content} />
      </main>
    </div>
  );
}
