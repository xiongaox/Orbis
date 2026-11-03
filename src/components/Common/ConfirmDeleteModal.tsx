import ConfirmModal from './ConfirmModal';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    /** 案例名称 / 标题，用于提示「确认删除「xxx」吗？」 */
    name?: string;
    loading?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * 案例删除的二次确认弹窗（八字 / 奇门 / 三元通用）。
 * 统一文案与危险按钮，避免各列表各写一套确认逻辑。
 */
export default function ConfirmDeleteModal({
    isOpen,
    name,
    loading = false,
    onCancel,
    onConfirm,
}: ConfirmDeleteModalProps) {
    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onCancel}
            onConfirm={onConfirm}
            title="确认删除"
            description={name
                ? <>确认删除「<span className="font-medium text-foreground">{name}</span>」吗？此操作无法撤销。</>
                : '确认删除这条案例吗？此操作无法撤销。'}
            confirmText={loading ? '删除中…' : '确认删除'}
            variant="destructive"
            loading={loading}
        />
    );
}
