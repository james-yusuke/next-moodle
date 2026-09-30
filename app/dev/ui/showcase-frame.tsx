import styles from "./showcase-frame.module.css";
import type { ReactNode } from "react";
import { classNames } from "@/components/ui/class-names";

export function ShowcaseSection({
  children,
  description,
  eyebrow,
  id,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  eyebrow: string;
  id?: string;
  title: string;
}>) {
  return (
    <section className={styles.style1!} id={id}>
      <header className={styles.style2!}>
        <span className={styles.style3!}>{eyebrow}</span>
        <div className={styles.style4!}>
          <h2 className={styles.style5!}>{title}</h2>
          <p className={styles.style6!}>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function ShowcaseSample({
  children,
  label,
  wide = false,
}: Readonly<{ children: ReactNode; label: string; wide?: boolean }>) {
  return (
    <div className={classNames(styles.style12!, wide && styles.style22!)} data-wide={wide}>
      <span className={styles.style7!}>{label}</span>
      <div className={styles.style8!}>{children}</div>
    </div>
  );
}
