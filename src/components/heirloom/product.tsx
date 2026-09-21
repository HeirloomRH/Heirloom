import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { X, ArrowUpRight } from "lucide-react";
import { ROBINHOOD_EXPLORER_URL } from "@/lib/chain";
import { useT } from "@/lib/i18n";

export function DemoNotice() {
  const t = useT();
  return (
    <div className="demo-notice">
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>{t.common.demoNotice.status}</span>
      <a
        href={ROBINHOOD_EXPLORER_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1"
      >
        {t.common.demoNotice.explorer} <ArrowUpRight size={10} />
      </a>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h3 id="dialog-title">{title}</h3>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t.common.dialog.close}
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
