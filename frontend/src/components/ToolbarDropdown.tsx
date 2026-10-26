import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DropdownOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
}

interface ToolbarDropdownProps<T extends string> {
  value?: T;

  selectedValues?: readonly T[];
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  buttonContent: ReactNode;
  header?: string;
  footer?: string;
  menuWidthClassName?: string;
}


export default function ToolbarDropdown<T extends string>({
  value,
  selectedValues,
  options,
  onChange,
  buttonContent,
  header,
  footer,
  menuWidthClassName = "w-56",
}: ToolbarDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex h-full items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
          open ? "bg-white/10 text-white" : "text-subtext hover:bg-white/5 hover:text-text"
        }`}
      >
        {buttonContent}
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        role="listbox"
        className={`absolute right-0 top-full z-20 mt-2 ${menuWidthClassName} origin-top-right rounded-xl border border-white/10 bg-[#111823]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-md transition-all duration-150 ease-out ${
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        {header && (
          <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {header}
          </div>
        )}
        {options.map((opt) => {
          const active = selectedValues ? selectedValues.includes(opt.value) : opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                onChange(opt.value);
                if (!selectedValues) setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors duration-100 ${
                active ? "bg-white/10 font-medium text-white" : "text-subtext hover:bg-white/5 hover:text-text"
              }`}
            >
              {opt.label}
              {opt.hint != null && (
                <span className={`text-[10px] ${active ? "text-white/60" : "text-muted"}`}>{opt.hint}</span>
              )}
            </button>
          );
        })}
        {footer && (
          <div className="mt-1 border-t border-white/5 px-2.5 pb-1 pt-1.5 text-[10px] text-muted">{footer}</div>
        )}
      </div>
    </div>
  );
}
