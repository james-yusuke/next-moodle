import styles from "./plain-writing-editor.module.css";
type PlainWritingEditorProps = Readonly<{
  disabled: boolean;
  maxLength: number;
  onChange: (value: string) => void;
  value: string;
}>;

export function PlainWritingEditor(props: PlainWritingEditorProps) {
  return (
    <div className={styles.plainEditor!}>
      <textarea
        aria-label="本文"
        className={styles.plainEditorInput!}
        disabled={props.disabled}
        maxLength={props.maxLength}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
      />
    </div>
  );
}
