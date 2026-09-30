type SkeletonProps = Readonly<{
  className?: string | undefined;
}>;

export function Skeleton({ className }: SkeletonProps) {
  const classes = classNames(
    styles.skeleton!,
    className,
  );
  return <span aria-hidden className={classes} />;
}
import styles from "./skeleton.module.css";
import { classNames } from "./class-names";
