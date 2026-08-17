/**
 * Textarea sibling to FormField.tsx (Prompt 23) -- same label+error/hint
 * wrapper shape, kept as its own component rather than making FormField
 * itself polymorphic (e.g. an `as="textarea"` prop): FormField is typed
 * specifically against React.InputHTMLAttributes<HTMLInputElement>, and
 * <textarea> isn't an <input> at the DOM level (different attribute set,
 * no `type`) -- forcing one generic component to cover both would need
 * either unsafe casts or a noticeably more complex prop type for a
 * two-component-sized problem. No "use client" needed, same reasoning as
 * FormField.
 */
export default function TextareaField({
  label,
  name,
  error,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "name">) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-brand-black"
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
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
