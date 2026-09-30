import styles from "./skeleton-group.module.css";
import { Skeleton } from "./skeleton";
import { classNames } from "./class-names";

type SkeletonGroupProps = Readonly<{
  className?: string | undefined;
  rows?: number;
}>;

export function SkeletonGroup({ className, rows = 3 }: SkeletonGroupProps) {
  return (
    <div
      aria-busy="true"
      aria-label="読み込み中"
      className={classNames(styles.skeletonGroup!, className)}
      role="status"
    >
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          className={classNames(styles.style1!, index === rows - 1 && rows > 1 && styles.style2!)}
          key={index}
        />
      ))}
    </div>
  );
}
