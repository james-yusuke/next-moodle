import styles from "./progress.module.css";
import { classNames } from "./class-names";

type ProgressProps = Readonly<{
  className?: string | undefined;
  label: string;
  showValue?: boolean;
  value: number;
}>;

export function Progress({ className, label, showValue = false, value }: ProgressProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={classNames(styles.progress!, className)}>
      <div className={styles.style1!}>
        <span>{label}</span>
        {showValue ? <span className={styles.style2!}>{normalized}%</span> : null}
      </div>
      <progress
        aria-label={label}
        className={styles.style3!}
        max={100}
        value={normalized}
      />
    </div>
  );
}
