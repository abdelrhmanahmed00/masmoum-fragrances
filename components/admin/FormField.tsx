/**
 * Shared label+input+error/hint wrapper for admin forms. No "use client"
 * of its own (no hooks) -- fine to use from a client component (like
 * ProductCard.tsx's own precedent on the public site) whether the
 * consumer wants it controlled (value+onChange) or uncontrolled
 * (defaultValue), since it just spreads whatever native input props it's
 * given.
 */
export default function FormField({
  label,
  name,
  error,
  hint,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  type?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "name" | "type"
>) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-brand-black"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${name}-error` : hint ? `${name}-hint` : undefined
        }
        className={
          "w-full rounded-btn border bg-brand-white px-3 py-2.5 text-sm text-brand-black " +
          (error ? "border-red-400" : "border-brand-border")
        }
        {...rest}
      />
      {hint && !error ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-brand-gray">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
