import styles from "./button.module.css";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { classNames } from "./class-names";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "compact" | "standard";

const variantClasses: Record<ButtonVariant, string> = {
  primary: styles.variantClassesprimary1!,
  secondary: styles.variantClassessecondary2!,
  ghost: styles.variantClassesghost3!,
  danger: styles.variantClassesdanger4!,
};

const sizeClasses: Record<ButtonSize, string> = {
  compact: styles.sizeClassescompact5!,
  standard: styles.sizeClassesstandard6!,
};

export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    children: ReactNode;
    icon?: ReactNode;
    loading?: boolean;
    size?: ButtonSize;
    variant?: ButtonVariant;
  }
>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  className,
  disabled,
  icon,
  loading = false,
  size = "standard",
  type = "button",
  variant = "secondary",
  ...buttonProps
}: ButtonProps, ref) {
  const classes = classNames(
    styles.button!,
    styles.classes7!,
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  return (
    <button
      {...buttonProps}
      aria-busy={loading}
      className={classes}
      data-size={size}
      data-variant={variant}
      disabled={disabled || loading}
      ref={ref}
      type={type}
    >
      {loading ? (
        <span aria-hidden className={styles.spinner!} />
      ) : (
        <span className={styles.style1!}>{icon}</span>
      )}
      <span className={styles.buttonLabel!}>{children}</span>
    </button>
  );
});
