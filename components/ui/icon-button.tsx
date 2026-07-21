import type { ReactNode } from "react";
import { Button } from "./button";
import type { ButtonProps } from "./button";

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
  const classes = ["ui-icon-button", className].filter(Boolean).join(" ");

  return (
    <Button {...buttonProps} aria-label={label} className={classes}>
      <span aria-hidden className="ui-icon-button__icon">
        {icon}
      </span>
      <span className="ui-sr-only">{label}</span>
    </Button>
  );
}
