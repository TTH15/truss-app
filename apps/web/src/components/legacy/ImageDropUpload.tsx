import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface ImageDropUploadProps {
  label: string;
  hint: string;
  previewUrl: string;
  onFileSelected: (file: File) => void;
  onClear?: () => void;
  accept?: string;
}

/**
 * 画像の選択欄。
 * 以前はドロップ領域の中にブラウザ標準のファイル入力（Choose File / 選択されていません）が
 * そのまま出ており、同じ役割の操作が二重に見えていた。標準入力は隠し、領域全体を押せるようにする。
 */
export function ImageDropUpload({ label, hint, previewUrl, onFileSelected, onClear, accept = 'image/*' }: ImageDropUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) onFileSelected(file);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-[#6B6B7A]">{label}</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        className={`relative rounded-md border-2 border-dashed transition-colors ${isDragActive ? 'border-[#49B1E4] bg-[#E8F6FC]' : 'border-[#D6D1C4] hover:border-[#49B1E4]'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onFileSelected(file);
          }}
        />
        {previewUrl ? (
          <div className="p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="w-full h-40 object-cover rounded-md" />
            <div className="flex justify-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-sm text-[#49B1E4] hover:underline"
              >
                画像を変更
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-sm text-[#6B6B7A] hover:text-[#3D3D4E] flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  削除
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-8 px-3 text-[#6B6B7A] hover:text-[#49B1E4] transition-colors"
          >
            <ImagePlus className="w-7 h-7" />
            <span className="text-xs text-center">{hint}</span>
          </button>
        )}
      </div>
    </div>
  );
}
