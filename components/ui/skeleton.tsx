type SkeletonProps = Readonly<{
  className?: string | undefined;
}>;

export function Skeleton({ className }: SkeletonProps) {
  const classes = ["ui-skeleton", className].filter(Boolean).join(" ");
  return <span aria-hidden className={classes} />;
}
