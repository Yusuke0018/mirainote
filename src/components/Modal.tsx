"use client";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-border shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-border text-gray-500 hover:bg-gray-50"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
