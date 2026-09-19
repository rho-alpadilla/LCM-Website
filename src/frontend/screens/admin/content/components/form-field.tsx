import type { ReactNode } from "react";

export const formInputClass =
  "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3";

type FormFieldProps = {
  label: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
};

export function FormField({
  label,
  hint,
  wide = false,
  children,
}: FormFieldProps) {
  return (
    <label
      className={`block font-semibold text-slate-800 ${wide ? "sm:col-span-2" : ""}`}
    >
      {label}
      {hint ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      ) : null}
      {children}
    </label>
  );
}
