import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "compact" | "standard";

export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    children: ReactNode;
    icon?: ReactNode;
    loading?: boolean;
    size?: ButtonSize;
    variant?: ButtonVariant;
  }
>;

export function Button({
  children,
  className,
  disabled,
  icon,
  loading = false,
  size = "standard",
  type = "button",
  variant = "secondary",
  ...buttonProps
}: ButtonProps) {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      aria-busy={loading}
      className={classes}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <span aria-hidden className="ui-spinner" /> : icon}
      <span className="ui-button__label">{children}</span>
    </button>
  );
}
