import {
  ArrowClockwise,
  ArrowRight,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import { Button, Notice, Skeleton, Surface } from "@/components/ui";
import { ShowcaseSection } from "./showcase-frame";
import styles from "./showcase.module.css";

export function FeedbackShowcase() {
  return (
    <ShowcaseSection
      description="Tonal depth distinguishes surfaces; loading, empty, and error compositions keep context and expose one useful next step."
      eyebrow="03 / Feedback"
      title="Surfaces and system states"
    >
      <div className={styles.surfaceGrid}>
        <Surface eyebrow="Base" title="Course summary">
          Quiet containment for everyday information with the graphite paired-rim material.
        </Surface>
        <Surface eyebrow="Raised" title="Priority work" variant="raised">
          Elevated luminance and a broad ambient shadow reserve attention for the next action.
        </Surface>
        <Surface eyebrow="Inset" title="Secondary detail" variant="inset">
          Recessed treatment groups metadata without turning every region into another card.
        </Surface>
      </div>

      <div className={styles.noticeStack}>
        <Notice title="Schedule updated">Three upcoming events were refreshed from Moodle.</Notice>
        <Notice title="Submission saved" tone="success">Your online-text draft is stored safely.</Notice>
        <Notice title="Due in 2 days" tone="warning">Review the rubric before submitting your final file.</Notice>
        <Notice
          action={<Button icon={<ArrowClockwise aria-hidden size={16} />} size="compact">Try again</Button>}
          title="Courses could not load"
          tone="error"
          urgent
        >
          Check your connection. Your saved work has not been changed.
        </Notice>
      </div>

      <div className={styles.stateGrid}>
        <Surface className={styles.stateCard} eyebrow="Loading" title="Fetching assignments">
          <div aria-label="Assignments are loading" className={styles.skeletonStack} role="status">
            <Skeleton className={styles.skeletonShort} />
            <Skeleton />
            <Skeleton className={styles.skeletonMedium} />
          </div>
        </Surface>

        <Surface className={styles.stateCard} eyebrow="Empty" title="No upcoming work">
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              <CalendarBlank aria-hidden size={24} weight="regular" />
            </span>
            <p>You are clear for the next seven days. Review a course whenever you are ready.</p>
            <Button icon={<ArrowRight aria-hidden size={16} />} size="compact" variant="ghost">
              Browse courses
            </Button>
          </div>
        </Surface>

        <Surface className={styles.stateCard} eyebrow="Capability" title="Continue in Moodle">
          <p className={styles.stateCopy}>
            This activity type is not available through the configured web service. Open Moodle to continue without losing context.
          </p>
          <Button icon={<ArrowRight aria-hidden size={16} />} size="compact" variant="secondary">
            Open Moodle
          </Button>
        </Surface>
      </div>
    </ShowcaseSection>
  );
}
