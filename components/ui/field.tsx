import type { InputHTMLAttributes, ReactNode } from "react";

export type FieldStatus = "default" | "success" | "error";

type FieldProps = Readonly<
  Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "aria-describedby" | "aria-invalid" | "id" | "size"
  > & {
    demoState?: "hover" | "focus";
    description?: ReactNode;
    id: string;
    label: ReactNode;
    message?: ReactNode;
    status?: FieldStatus;
  }
>;

export function Field({
  className,
  demoState,
  description,
  id,
  label,
  message,
  status = "default",
  ...inputProps
}: FieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const messageId = message ? `${id}-message` : undefined;
  const describedBy = [descriptionId, messageId].filter(Boolean).join(" ");
  const inputClasses = ["ui-field__input", className].filter(Boolean).join(" ");

  return (
    <div className={`ui-field ui-field--${status}`} data-demo-state={demoState}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      {description ? (
        <span className="ui-field__description" id={descriptionId}>
          {description}
        </span>
      ) : null}
      <span className="ui-field__shell">
        <input
          {...inputProps}
          aria-describedby={describedBy || undefined}
          aria-invalid={status === "error"}
          className={inputClasses}
          id={id}
        />
      </span>
      {message ? (
        <span className="ui-field__message" id={messageId}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
