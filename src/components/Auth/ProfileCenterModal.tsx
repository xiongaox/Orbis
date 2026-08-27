import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Check, Eye, EyeOff, KeyRound, Loader2, UserRound } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { authService } from '../../services/authService';
import { profileService } from '../../services/profileService';
import AdvancedDatePicker from '../Common/AdvancedDatePicker';
import BaseModal from '../UI/BaseModal';

interface ProfileCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthDate?: Date;
  onBirthDateChange: (date: Date | undefined) => void;
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  autoComplete: string;
}

type ProfileSection = 'profile' | 'security';

const formatDate = (date?: Date) => date && !Number.isNaN(date.getTime())
  ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  : '请选择生日';

function PasswordField({ label, value, onChange, visible, onVisibilityChange, autoComplete }: PasswordFieldProps) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-foreground">
      <span>{label}</span>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="focus-ring h-11 w-full rounded-lg border border-border bg-background pl-10 pr-10 text-foreground" placeholder={`请输入${label}`} />
        <button type="button" onClick={() => onVisibilityChange(!visible)} className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label={`${visible ? '隐藏' : '显示'}${label}`}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

export default function ProfileCenterModal({ isOpen, onClose, birthDate, onBirthDateChange }: ProfileCenterModalProps) {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [selectedBirthDate, setSelectedBirthDate] = useState<Date | undefined>(undefined);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');

  useEffect(() => {
    if (!isOpen) return;
    setUsername(user?.email ?? '');
    setSelectedBirthDate(birthDate);
    setShowBirthdayPicker(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setProfileError(null);
    setPasswordError(null);
    setProfileSuccess(false);
    setPasswordSuccess(false);
    setActiveSection('profile');
  }, [isOpen, user?.email, birthDate]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      setProfileError('请输入用户名');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      if (normalizedUsername !== user.email) {
        const { error } = await authService.changeUsername(user.id, normalizedUsername);
        if (error) throw new Error(error.message);
      }

      const nextBirthDate = selectedBirthDate;
      await profileService.updateProfile(user.id, {
        username: normalizedUsername,
        email: normalizedUsername,
        birth_date: nextBirthDate?.toISOString(),
      });
      onBirthDateChange(nextBirthDate);
      setProfileSuccess(true);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : '个人资料保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setPasswordError(null);
    setPasswordSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有密码字段');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('新密码不能与当前密码相同');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await authService.changePassword(user.id, currentPassword, newPassword);
      if (error) throw new Error(error.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="个人中心" titleIcon={<UserRound className="h-5 w-5" />} maxWidth="max-w-lg" bodyClassName="p-5 sm:p-6">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="个人中心功能">
          <button type="button" role="tab" aria-selected={activeSection === 'profile'} onClick={() => setActiveSection('profile')} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-ring ${activeSection === 'profile' ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}`}>
            <UserRound className="h-4 w-4" />基本资料
          </button>
          <button type="button" role="tab" aria-selected={activeSection === 'security'} onClick={() => setActiveSection('security')} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-ring ${activeSection === 'security' ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}`}>
            <KeyRound className="h-4 w-4" />账户安全
          </button>
        </div>

        {activeSection === 'profile' ? (
          <form onSubmit={saveProfile} className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">基本资料</h3>
            <p className="mt-1 text-sm text-muted-foreground">修改名称与出生日期后，排盘信息将同步更新。</p>
          </div>
          {profileError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{profileError}</p>}
          {profileSuccess && <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"><Check className="h-4 w-4" />资料已保存</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              <span>用户名</span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="focus-ring h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-foreground" placeholder="请输入用户名" />
              </div>
            </label>
            <div className="space-y-1.5">
              <span>生日</span>
              <button type="button" onClick={() => setShowBirthdayPicker(true)} className="focus-ring relative h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                {formatDate(selectedBirthDate)}
              </button>
            </div>
          </div>
          <button type="submit" disabled={savingProfile} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}保存资料
          </button>
          </form>
        ) : (
          <form onSubmit={savePassword} className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">修改密码</h3>
            <p className="mt-1 text-sm text-muted-foreground">更新本地账户的登录凭证。</p>
          </div>
          {passwordError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{passwordError}</p>}
          {passwordSuccess && <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"><Check className="h-4 w-4" />密码已修改</p>}
          <PasswordField label="当前密码" value={currentPassword} onChange={setCurrentPassword} visible={showCurrentPassword} onVisibilityChange={setShowCurrentPassword} autoComplete="current-password" />
          <PasswordField label="新密码" value={newPassword} onChange={setNewPassword} visible={showNewPassword} onVisibilityChange={setShowNewPassword} autoComplete="new-password" />
          <PasswordField label="确认新密码" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onVisibilityChange={setShowConfirmPassword} autoComplete="new-password" />
          <button type="submit" disabled={savingPassword} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}确认修改
          </button>
          </form>
        )}
      </div>
      <AdvancedDatePicker
        isOpen={showBirthdayPicker}
        onClose={() => setShowBirthdayPicker(false)}
        onConfirm={(date) => {
          setSelectedBirthDate(date);
          setShowBirthdayPicker(false);
        }}
        value={selectedBirthDate}
        hideBazi={true}
      />
    </BaseModal>
  );
}
