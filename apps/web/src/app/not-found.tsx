import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6">
      <div className="max-w-md text-center flex flex-col items-center gap-4">
        <img
          src="/Truss/3.svg"
          alt="Truss"
          className="w-[220px] h-auto"
          draggable={false}
        />
        <h1 className="text-3xl font-bold text-[#3D3D4E]">404</h1>
        <p className="text-[#3D3D4E]">
          お探しのページは見つかりませんでした。
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-[#3D3D4E] text-[#F5F1E8] px-4 py-2 text-sm font-medium"
        >
          トップへ戻る
        </Link>
      </div>
    </main>
  );
}

