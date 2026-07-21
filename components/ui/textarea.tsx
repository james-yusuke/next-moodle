import { useId, type TextareaHTMLAttributes } from "react";

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
    <label className="ui-textarea" htmlFor={controlId}>
      <span className="ui-field__label">{label}</span>
      {description === undefined ? null : (
        <span className="ui-field__description" id={descriptionId}>{description}</span>
      )}
      <textarea {...props} aria-describedby={describedBy} className="ui-textarea__input" id={controlId} />
      {message === undefined ? null : (
        <span className="ui-field__message" id={messageId}>{message}</span>
      )}
    </label>
  );
}
