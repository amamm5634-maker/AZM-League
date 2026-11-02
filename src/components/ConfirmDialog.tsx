import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** نافذة تأكيد تعتمد على عنصر <dialog> الأصلي (تدعم لوحة المفاتيح وزر Esc) */
export function ConfirmDialog({ open, title, children, confirmLabel, danger = false, busy = false, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <div className="confirm-body">{children}</div>
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={onCancel} autoFocus>
          إلغاء
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-dark'}`} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
