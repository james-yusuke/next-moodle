import styles from "./textarea.module.css";
import { useId, type TextareaHTMLAttributes } from "react";
import { classNames } from "./class-names";

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & Readonly<{
  description?: string;
  id?: string;
  label: string;
  message?: string;
}>;

export function Textarea({ description, id, label, message, ...props }: TextareaProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = description === undefined ? undefined : `${controlId}-description`;
  const messageId = message === undefined ? undefined : `${controlId}-message`;
  const describedBy = [descriptionId, messageId].filter(Boolean).join(" ") || undefined;
  return (
    <label className={styles.textarea!} htmlFor={controlId}>
      <span className={styles.fieldLabel!}>{label}</span>
      {description === undefined ? null : (
        <span className={styles.fieldDescription!} id={descriptionId}>{description}</span>
      )}
      <textarea
        {...props}
        aria-describedby={describedBy}
        className={classNames(
          styles.textareaInput!,
          props.className,
        )}
        id={controlId}
      />
      {message === undefined ? null : (
        <span className={styles.fieldMessage!} id={messageId}>{message}</span>
      )}
    </label>
  );
}
