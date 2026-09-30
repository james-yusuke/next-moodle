import styles from "./card.module.css";
import type { ElementType, ReactNode } from "react";

import { classNames } from "./class-names";

export type CardTone = "default" | "elevated" | "selected" | "inset";
export type CardPadding = "none" | "compact" | "standard" | "spacious";

type CardProps = Readonly<{
  "aria-labelledby"?: string;
  "aria-label"?: string;
  as?: ElementType;
  children: ReactNode;
  className?: string | undefined;
  "data-quiz-question"?: true;
  id?: string;
  padding?: CardPadding;
  tone?: CardTone;
}>;

const toneClasses: Record<CardTone, string> = {
  default: styles.toneClassesdefault1!,
  elevated: styles.toneClasseselevated2!,
  selected: styles.toneClassesselected3!,
  inset: styles.toneClassesinset4!,
};

const paddingClasses: Record<CardPadding, string> = {
  none: styles.paddingClassesnone5!,
  compact: styles.paddingClassescompact6!,
  standard: styles.paddingClassesstandard7!,
  spacious: styles.paddingClassesspacious8!,
};

export function Card({
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
  as: Component = "section",
  children,
  className,
  "data-quiz-question": dataQuizQuestion,
  id,
  padding = "standard",
  tone = "default",
}: CardProps) {
  return (
    <Component
      className={classNames(
        styles.card!,
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
      data-quiz-question={dataQuizQuestion}
      id={id}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
    >
      {children}
    </Component>
  );
}
