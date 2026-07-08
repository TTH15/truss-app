import { useState, type DragEvent } from 'react';
import { Input } from '../ui/input';

interface ImageDropUploadProps {
  label: string;
  hint: string;
  previewUrl: string;
  onFileSelected: (file: File) => void;
  accept?: string;
}

export function ImageDropUpload({ label, hint, previewUrl, onFileSelected, accept = 'image/*' }: ImageDropUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);

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
        className={`rounded-md border-2 border-dashed p-3 space-y-2 transition-colors ${isDragActive ? 'border-[#49B1E4] bg-[#E8F6FC]' : 'border-gray-200'}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-md" />
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">{hint}</p>
        )}
        <Input
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </div>
    </div>
  );
}
