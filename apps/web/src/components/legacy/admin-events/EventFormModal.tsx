import { X } from 'lucide-react';
import type { Language } from '@truss/core';
import { Button } from '../../ui/button';
import { EventFormFields } from './EventFormFields';
import type { AdminEventsCopy } from './translations';
import type { EventFormValues } from './types';

interface EventFormModalProps {
  mode: 'create' | 'edit';
  language: Language;
  t: AdminEventsCopy;
  values: EventFormValues;
  onChange: (values: EventFormValues) => void;
  onOpenImageEditor: (source: string) => void;
  onSelectImageFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSave: () => void;
  /** 編集時のみ。削除ボタンを出す */
  onDelete?: () => void;
  /** 編集時のみ。未保存の変更が無い・保存中は保存ボタンを押させない */
  saveDisabled?: boolean;
}

export function EventFormModal({
  mode,
  language,
  t,
  values,
  onChange,
  onOpenImageEditor,
  onSelectImageFile,
  onClose,
  onSave,
  onDelete,
  saveDisabled = false,
}: EventFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 relative w-full max-w-[1100px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'create' ? (
          <h3 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px] mb-6">{t.newEvent}</h3>
        ) : (
          <div className="flex items-start justify-between gap-3 mb-6 pr-6">
            <div>
              <h3 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">{t.editEvent}</h3>
              <p className="text-[#6B6B7A] text-sm mt-1">
                {values.titleJa || values.titleEn || (language === 'ja' ? '無題のイベント' : 'Untitled event')}
              </p>
            </div>
          </div>
        )}

        <EventFormFields
          language={language}
          t={t}
          values={values}
          onChange={onChange}
          onOpenImageEditor={onOpenImageEditor}
          onSelectImageFile={onSelectImageFile}
        />

        {mode === 'create' ? (
          <div className="flex gap-3 pt-4 justify-center">
            <Button onClick={onSave} className="w-32 bg-[#00A63E] hover:bg-[#008C35] text-white">
              {t.save}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-6 justify-end">
            <Button onClick={onDelete} className="min-w-28 bg-[#D4183D] hover:bg-[#B01535] text-white">
              {t.deleteEvent}
            </Button>
            <Button
              onClick={onSave}
              disabled={saveDisabled}
              className="min-w-28 bg-[#00A63E] hover:bg-[#008C35] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.save}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
