import styles from "./icon-button.module.css";
import type { ReactNode } from "react";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { classNames } from "./class-names";

type IconButtonProps = Readonly<
  Omit<ButtonProps, "children" | "icon" | "loading" | "size"> & {
    icon: ReactNode;
    label: string;
  }
>;

export function IconButton({
  className,
  icon,
  label,
  ...buttonProps
}: IconButtonProps) {
  const classes = classNames(styles.iconButton!, className);

  return (
    <Button {...buttonProps} aria-label={label} className={classes}>
      <span aria-hidden className={styles.iconButtonIcon!}>
        {icon}
      </span>
      <span className={styles.srOnly!}>{label}</span>
    </Button>
  );
}
