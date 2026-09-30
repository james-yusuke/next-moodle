import styles from "./field.module.css";
import type { InputHTMLAttributes, ReactNode } from "react";
import { classNames } from "./class-names";

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
  const inputClasses = classNames(
    styles.fieldInput!,
    className,
  );

  return (
    <div className={classNames(styles.field!)} data-demo-state={demoState} data-status={status}>
      <label className={styles.fieldLabel!} htmlFor={id}>
        {label}
      </label>
      {description ? (
        <span className={styles.fieldDescription!} id={descriptionId}>
          {description}
        </span>
      ) : null}
      <span className={classNames(
        styles.fieldShell!,
        status === "error" && styles.style1!,
        status === "success" && styles.style2!,
      )}>
        <input
          {...inputProps}
          aria-describedby={describedBy || undefined}
          aria-invalid={status === "error"}
          className={inputClasses}
          id={id}
        />
      </span>
      {message ? (
        <span className={classNames(
          styles.fieldMessage!,
          status === "error" && styles.style3!,
          status === "success" && styles.style4!,
        )} id={messageId}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
