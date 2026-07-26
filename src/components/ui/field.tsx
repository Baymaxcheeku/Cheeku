"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

type FieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
};

export function Field({ label, icon: Icon, error, hint, className, ...props }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className="block text-[13px] font-medium text-ink-700">
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "flex h-13 items-center gap-3 rounded-tile border bg-surface px-4",
          "focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100",
          error ? "border-danger" : "border-line",
        )}
      >
        {Icon ? <Icon size={18} className="shrink-0 text-brand-400" aria-hidden /> : null}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-full w-full bg-transparent text-[15px] text-ink-900 outline-none",
            "placeholder:text-ink-300",
            className,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({ ...props }: FieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Field {...props} type={visible ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // The label must say what pressing it does, not what state we are in.
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-4 top-0 flex h-13 items-center text-ink-300 hover:text-ink-500"
        style={{ top: props.label ? "1.65rem" : 0 }}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
