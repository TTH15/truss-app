import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ja as rdpJa, enUS as rdpEnUS } from 'react-day-picker/locale';
import { Languages } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import { DatePicker } from '@platform/ui';
import { EVENT_ICON_OPTIONS, type Language } from '@truss/core';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { translateText } from '../../../utils/translate';
import { EVENT_COLORS } from './event-form';
import type { AdminEventsCopy } from './translations';
import type { EventFormValues } from './types';

interface EventFormFieldsProps {
  language: Language;
  t: AdminEventsCopy;
  values: EventFormValues;
  onChange: (values: EventFormValues) => void;
  /** 画像欄をクリックしたとき（プレビュー / 新規アップロード）に開く画像エディタ */
  onOpenImageEditor: (source: string) => void;
  onSelectImageFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const LABEL_CLASS = 'text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px] block mb-2';
const INPUT_CLASS = 'bg-[#EEEBE3] border-0';
const TRANSLATE_BUTTON_CLASS =
  'bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-7 text-xs';

/**
 * イベントの入力欄一式（新規作成と編集で共通）。
 * 以前は同じ約240行の JSX が作成用・編集用に二重に書かれており、片方だけ直す事故が起きやすかった。
 */
export function EventFormFields({
  language,
  t,
  values,
  onChange,
  onOpenImageEditor,
  onSelectImageFile,
}: EventFormFieldsProps) {
  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  /** 日本語欄を英語へ翻訳して対応する欄に入れる */
  const translateInto = async (source: string, target: 'titleEn' | 'descriptionEn' | 'locationEn') => {
    if (!source.trim()) {
      toast.error(language === 'ja' ? '翻訳する内容を入力してください' : 'Please enter text to translate');
      return;
    }
    toast.loading(language === 'ja' ? '翻訳中...' : 'Translating...');
    try {
      const translatedText = await translateText(source, 'en');
      if (translatedText) {
        set(target, translatedText);
        toast.dismiss();
        toast.success(language === 'ja' ? '翻訳が完了しました' : 'Translation completed');
      }
    } catch {
      toast.dismiss();
      toast.error(language === 'ja' ? '翻訳に失敗しました' : 'Translation failed');
    }
  };

  const translateButton = (source: string, target: 'titleEn' | 'descriptionEn' | 'locationEn') => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void translateInto(source, target)}
      disabled={!source.trim()}
      className={TRANSLATE_BUTTON_CLASS}
    >
      <Languages className="w-3 h-3 mr-1" />
      {t.autoTranslate}
    </Button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左側 */}
      <div className="space-y-4">
        {/* イベント名 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">{t.eventName}</label>
            {translateButton(values.titleJa, 'titleEn')}
          </div>
          <Input
            value={values.titleJa}
            onChange={(e) => set('titleJa', e.target.value)}
            placeholder={t.eventNamePlaceholderJa}
            className={`${INPUT_CLASS} mb-2`}
          />
          <Input
            value={values.titleEn}
            onChange={(e) => set('titleEn', e.target.value)}
            placeholder={t.eventNamePlaceholderEn}
            className={INPUT_CLASS}
          />
        </div>

        {/* 説明 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">{t.description}</label>
            {translateButton(values.descriptionJa, 'descriptionEn')}
          </div>
          <Textarea
            value={values.descriptionJa}
            onChange={(e) => set('descriptionJa', e.target.value)}
            placeholder={t.descriptionPlaceholderJa}
            className={`${INPUT_CLASS} mb-2 min-h-[64px]`}
          />
          <Textarea
            value={values.descriptionEn}
            onChange={(e) => set('descriptionEn', e.target.value)}
            placeholder={t.descriptionPlaceholderEn}
            className={`${INPUT_CLASS} min-h-[64px]`}
          />
        </div>

        {/* LINEグループ招待リンク */}
        <div>
          <label className={LABEL_CLASS}>{t.lineGroupLink}</label>
          <Input
            value={values.lineGroupUrl}
            onChange={(e) => set('lineGroupUrl', e.target.value)}
            placeholder={t.lineGroupPlaceholder}
            className={INPUT_CLASS}
          />
          <p className="text-[#6A7282] text-xs mt-2">{t.lineGroupNote}</p>
        </div>

        {/* 最大参加者数 */}
        <div>
          <label className={LABEL_CLASS}>{t.maxParticipants}</label>
          <Input
            type="number"
            value={values.maxParticipants}
            onChange={(e) => set('maxParticipants', e.target.value)}
            className={`${INPUT_CLASS} w-24`}
          />
        </div>

        {/* 参加費 */}
        <div>
          <label className={LABEL_CLASS}>{t.participationFee}</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={values.participationFee}
            onChange={(e) => set('participationFee', e.target.value)}
            className={`${INPUT_CLASS} w-32`}
          />
        </div>
      </div>

      {/* 右側 */}
      <div className="space-y-4">
        {/* イベント画像 */}
        <div>
          <label className={LABEL_CLASS}>{t.eventImage}</label>
          <div className="bg-[#F5F1E8] border border-[rgba(61,61,78,0.15)] rounded-[8px] h-[126px] flex items-center justify-center relative overflow-hidden group">
            {values.image ? (
              <button type="button" className="w-full h-full" onClick={() => onOpenImageEditor(values.image!)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={values.image} alt="Event" className="w-full h-full object-cover" />
              </button>
            ) : (
              <label className="cursor-pointer flex flex-col items-center">
                <FontAwesomeIcon icon={faUpload} className="w-4 h-4 text-[#3D3D4E] mb-1" />
                <span className="text-[#3D3D4E] text-sm font-medium">{t.upload}</span>
                <input type="file" accept="image/*" onChange={onSelectImageFile} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-[#6A7282] text-xs mt-2">{t.imageNote}</p>
        </div>

        {/* イベントカラー */}
        <div>
          <label className={LABEL_CLASS}>{language === 'ja' ? 'イベントカラー' : 'Event Color'}</label>
          <div className="flex items-center gap-2">
            {EVENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`event-color-${color}`}
                onClick={() => set('eventColor', color)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-105 ${values.eventColor === color ? 'border-[#3D3D4E]' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* カレンダー表示アイコン */}
        <div>
          <label className={LABEL_CLASS}>{language === 'ja' ? 'カレンダー表示アイコン' : 'Calendar icon'}</label>
          <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
            {EVENT_ICON_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                title={language === 'ja' ? opt.labelJa : opt.labelEn}
                onClick={() => set('eventIconKey', opt.key)}
                className={`h-9 w-9 rounded-lg flex items-center justify-center border transition-colors ${
                  values.eventIconKey === opt.key
                    ? 'border-[#49B1E4] bg-[#49B1E4]/15'
                    : 'border-[rgba(61,61,78,0.15)] bg-[#EEEBE3] hover:bg-[#E8E4DB]'
                }`}
              >
                <FontAwesomeIcon icon={opt.icon} className="text-[#3D3D4E] text-sm" />
              </button>
            ))}
          </div>
        </div>

        {/* 日付・時間 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>{t.date}</label>
            <DatePicker
              value={parseDateValue(values.date)}
              onChange={(date) => {
                if (!date) return;
                set('date', format(date, 'yyyy-MM-dd'));
              }}
              formatLabel={(d) =>
                format(d, language === 'ja' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', {
                  locale: language === 'ja' ? ja : undefined,
                })
              }
              placeholder={language === 'ja' ? '日付を選択' : 'Select date'}
              locale={language === 'ja' ? rdpJa : rdpEnUS}
              buttonClassName="bg-[#EEEBE3] border-0 text-[#3D3D4E]"
              iconClassName="text-[#6B6B7A]"
              contentClassName="bg-white opacity-100 shadow-xl border border-[#E5E7EB] z-80"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>{t.time}</label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={values.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                className={`${INPUT_CLASS} text-sm`}
              />
              <span className="text-[#6B6B7A] text-sm">〜</span>
              <Input
                type="time"
                value={values.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                className={`${INPUT_CLASS} text-sm`}
              />
            </div>
          </div>
        </div>

        {/* Google Map URL */}
        <div>
          <label className={LABEL_CLASS}>{t.googleMapUrl}</label>
          <Input
            value={values.googleMapUrl}
            onChange={(e) => set('googleMapUrl', e.target.value)}
            placeholder={t.googleMapUrlPlaceholder}
            className={INPUT_CLASS}
          />
        </div>

        {/* 場所名 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[#3D3D4E] text-sm font-medium tracking-[-0.1504px]">{t.locationName}</label>
            {translateButton(values.location, 'locationEn')}
          </div>
          <Input
            value={values.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder={t.locationNamePlaceholderJa}
            className={`${INPUT_CLASS} mb-2`}
          />
          <Input
            value={values.locationEn}
            onChange={(e) => set('locationEn', e.target.value)}
            placeholder={t.locationNamePlaceholderEn}
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}

function parseDateValue(date: string): Date | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
