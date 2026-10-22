"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { btn } from "@/lib/styles";

export function Modal({
  title, description, onClose, children, size = "md",
}: { title: string; description?: string; onClose: () => void; children: ReactNode; size?: "md" | "lg" | "xl" }) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = box.current;
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    (el?.querySelector<HTMLElement>("input,select,textarea") ?? el)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeRef.current(); return; }
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(sel));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus();
    };
  }, []);

  const width = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4 print:static print:block print:p-0">
      <button type="button" aria-label="Close dialog" tabIndex={-1} className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl print:max-h-none print:max-w-none print:overflow-visible print:shadow-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl hover:bg-brand-tint">×</button>
        </div>
        <div className="overflow-y-auto px-6 py-5 print:overflow-visible print:p-0">{children}</div>
      </div>
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">{children}</div>;
}

export function ConfirmDialog({
  title, body, confirmLabel, danger = false, onConfirm, onClose,
}: { title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-[15px] text-ink">{body}</p>
      <ModalActions>
        <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
        <button type="button" className={danger ? btn.danger : btn.primary} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </ModalActions>
    </Modal>
  );
}
