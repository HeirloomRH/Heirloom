import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { X, ArrowUpRight, FlaskConical } from "lucide-react";
export function DemoNotice() {
  return (
    <div className="demo-notice">
      <FlaskConical size={14} />
      <span>
        Demo workspace{" "}
        <span className="notice-detail">
          · Saved in this browser. No real funds or transactions.
        </span>
      </span>
      <Link to="/docs" hash="preview">
        How this works <ArrowUpRight size={12} />
      </Link>
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
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
