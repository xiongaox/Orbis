import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Check, Loader2 } from 'lucide-react';
import { profileService } from '../../services/profileService';
import AdvancedDatePicker from '../Common/AdvancedDatePicker';
import BaseModal from '../UI/BaseModal';

interface ProfileCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthDate?: Date;
  onBirthDateChange: (date: Date | undefined) => void;
}

export default function ProfileCenterModal({ isOpen, onClose, birthDate, onBirthDateChange }: ProfileCenterModalProps) {
  const [selectedBirthDate, setSelectedBirthDate] = useState<Date | undefined>(birthDate);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedBirthDate(birthDate);
      setShowPicker(false);
      setError(null);
      setSaved(false);
    }
  }, [isOpen, birthDate]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await profileService.updateProfile({ birth_date: selectedBirthDate?.toISOString() });
      onBirthDateChange(selectedBirthDate);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '生日保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="设置生日" titleIcon={<CalendarDays className="h-5 w-5" />} maxWidth="max-w-lg" bodyClassName="p-5 sm:p-6">
      <form onSubmit={save} className="space-y-5">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground"><CalendarDays className="h-4 w-4" />生日</label>
          <button type="button" onClick={() => setShowPicker((current) => !current)} className="focus-ring h-11 w-full rounded-lg border border-border bg-background px-3 text-left text-foreground">
            {selectedBirthDate ? `${selectedBirthDate.getFullYear()}年${selectedBirthDate.getMonth() + 1}月${selectedBirthDate.getDate()}日` : '请选择生日'}
          </button>
          {showPicker && <AdvancedDatePicker value={selectedBirthDate} isOpen onClose={() => setShowPicker(false)} onConfirm={(date: Date) => { setSelectedBirthDate(date); setShowPicker(false); }} hideBazi />}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" />已保存</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="focus-ring rounded-lg border border-border px-4 py-2 text-sm">关闭</button>
          <button type="submit" disabled={saving} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}保存生日</button>
        </div>
      </form>
    </BaseModal>
  );
}
