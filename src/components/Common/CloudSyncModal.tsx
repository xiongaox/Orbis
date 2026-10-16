import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import CloudSyncSettingsPanel from './CloudSyncSettingsPanel';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 云同步设置弹窗（T07）：桌面端居中弹窗 + 移动端二级页双壳。
 * 表单主体抽到 CloudSyncSettingsPanel，「数据备份」弹窗的第三个
 * 配置 tab 复用同一份（2026-10-15 界面合并修订）。
 */
export default function CloudSyncModal({ isOpen, onClose }: CloudSyncModalProps) {
  const { isMobile } = useLayoutMode();

  // 移动端检测：必须在 isOpen 早退之前调用，保证 hooks 顺序稳定
  if (!isOpen) return null;

  if (isMobile) {
    return (
      <SubPage isOpen={isOpen} onClose={onClose} title="云同步" bodyClassName="p-4">
        <CloudSyncSettingsPanel />
      </SubPage>
    );
  }
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="云同步" maxWidth="max-w-md">
      <CloudSyncSettingsPanel />
    </BaseModal>
  );
}
