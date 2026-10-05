import { useId, useState } from 'react';
import type { Language } from '@truss/core';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PROFILE_LANGUAGE_OPTIONS, profileLanguageOption, uniqueProfileLanguages } from '../../lib/profile-options';

export function ProfileLanguagePicker({ value, onChange, language }: { value: string[]; onChange: (next: string[]) => void; language: Language }) {
  const otherId = useId();
  const [otherText, setOtherText] = useState(() => value.filter(item => !profileLanguageOption(item)).join(', '));
  const ja = language === 'ja';
  return <fieldset className="space-y-3 min-w-0">
    <legend className="sr-only">{ja ? '話せる言語' : 'Languages'}</legend>
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {PROFILE_LANGUAGE_OPTIONS.map(option => <label key={option.value} className="flex min-w-0 min-h-11 items-center gap-2 cursor-pointer">
        <Checkbox checked={value.some(item => profileLanguageOption(item)?.value === option.value)} onCheckedChange={checked => {
          onChange(uniqueProfileLanguages(checked === true ? [...value, option.value] : value.filter(item => profileLanguageOption(item)?.value !== option.value)));
        }} />
        <span className="min-w-0 text-sm wrap-anywhere">{option[language]}</span>
      </label>)}
    </div>
    <div className="space-y-2">
      <Label htmlFor={otherId}>{ja ? 'その他の言語（カンマ区切り）' : 'Other languages (comma-separated)'}</Label>
      <Input id={otherId} value={otherText} onChange={event => {
        const text = event.target.value;
        setOtherText(text);
        onChange(uniqueProfileLanguages([...value.filter(item => profileLanguageOption(item)), ...text.split(/[,、\n]/)]));
      }} />
    </div>
  </fieldset>;
}
