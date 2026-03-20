export default function Loading() {
  return (
    <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5">
        <img
          src="/Truss/3.svg"
          alt="Truss"
          className="w-[280px] h-auto animate-pulse"
          draggable={false}
        />
        <p className="text-[#3D3D4E] text-sm">Loading...</p>
      </div>
    </main>
  );
}

