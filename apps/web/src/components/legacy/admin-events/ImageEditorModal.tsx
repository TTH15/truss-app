import { X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faUpload, faEye, faWandMagicSparkles, faFloppyDisk, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import type { Language } from '@truss/core';
import type { EventImageEditor } from './useEventImageEditor';

/** イベント画像のプレビューとモザイク加工。状態と操作はすべて useEventImageEditor が持つ */
export function ImageEditorModal({ language, editor }: { language: Language; editor: EventImageEditor }) {
  if (!editor.isOpen || !editor.source) return null;

  return (
    <div className="fixed inset-0 z-90 bg-black/70 flex items-center justify-center p-4" onClick={editor.close}>
      <div
        className="relative w-full max-w-[95vw] max-h-[95vh] bg-[#111827] rounded-xl border border-white/10 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              title={language === 'ja' ? '1つ戻す (Cmd/Ctrl+Z)' : 'Undo (Cmd/Ctrl+Z)'}
              className="text-lg text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-white/60"
              onClick={editor.undo}
              disabled={!editor.canUndo}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
            <button
              type="button"
              title={language === 'ja' ? 'プレビュー' : 'Preview'}
              className={`text-lg transition-colors ${editor.mode === 'preview' ? 'text-white' : 'text-white/60 hover:text-white'}`}
              onClick={() => editor.setMode('preview')}
            >
              <FontAwesomeIcon icon={faEye} />
            </button>
            <button
              type="button"
              title={language === 'ja' ? 'モザイクブラシ' : 'Mosaic Brush'}
              className={`text-lg transition-colors ${editor.mode === 'mosaic' ? 'text-white' : 'text-white/60 hover:text-white'}`}
              onClick={() => editor.setMode('mosaic')}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} />
            </button>
            {editor.mode === 'mosaic' && (
              <div className="flex items-center gap-2 text-white text-xs">
                <span>{language === 'ja' ? 'ブラシ' : 'Brush'}</span>
                <input
                  type="range"
                  min={6}
                  max={48}
                  value={editor.brushSize}
                  onChange={(e) => editor.setBrushSize(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer text-white/60 hover:text-white transition-colors text-lg">
              <input type="file" accept="image/*" onChange={editor.handleFileSelect} className="hidden" />
              <span title={language === 'ja' ? 'アップロード' : 'Upload'}>
                <FontAwesomeIcon icon={faUpload} />
              </span>
            </label>
            <button
              type="button"
              title={language === 'ja' ? '画像削除' : 'Remove Image'}
              className="text-lg text-white/60 hover:text-red-400 transition-colors"
              onClick={editor.remove}
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
            <button
              type="button"
              title={language === 'ja' ? '反映して保存' : 'Apply & Save'}
              className="text-lg text-white/60 hover:text-[#49B1E4] transition-colors disabled:opacity-40 disabled:hover:text-white/60"
              disabled={editor.isProcessing}
              onClick={() => void editor.save()}
            >
              <FontAwesomeIcon icon={faFloppyDisk} className={editor.isProcessing ? 'animate-pulse' : ''} />
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[78vh] rounded-lg bg-black/50 flex items-center justify-center">
          <canvas
            {...editor.canvasProps}
            className={`max-w-full max-h-[78vh] ${editor.mode === 'mosaic' ? 'cursor-crosshair' : 'cursor-default'}`}
          />
        </div>
        <button
          type="button"
          onClick={editor.close}
          className="absolute -top-10 right-0 text-white hover:text-gray-200"
          aria-label="close-image-preview"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
