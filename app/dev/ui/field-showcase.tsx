import {
  CheckCircle,
  Clock,
  Info,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Badge, Field } from "@/components/ui";
import { ShowcaseSample, ShowcaseSection } from "./showcase-frame";
import styles from "./showcase.module.css";

export function FieldShowcase() {
  return (
    <ShowcaseSection
      description="Labels stay visible, messages keep a stable place, and errors explain recovery rather than exposing implementation detail."
      eyebrow="02 / Input"
      title="Fields and status"
    >
      <div className={styles.fieldGrid}>
        <ShowcaseSample label="Default">
          <Field id="course-search" label="Course search" placeholder="Search by title" />
        </ShowcaseSample>
        <ShowcaseSample label="Hover">
          <Field demoState="hover" id="field-hover" label="Student ID" placeholder="s1234567" />
        </ShowcaseSample>
        <ShowcaseSample label="Focus visible">
          <Field
            demoState="focus"
            description="Shown without moving surrounding content."
            id="field-focus"
            label="Keyword"
            placeholder="Assignment name"
          />
        </ShowcaseSample>
        <ShowcaseSample label="Filled">
          <Field defaultValue="Human–Computer Interaction" id="field-filled" label="Course" />
        </ShowcaseSample>
        <ShowcaseSample label="Read only">
          <Field defaultValue="2026-07-28 23:59" id="field-readonly" label="Due date" readOnly />
        </ShowcaseSample>
        <ShowcaseSample label="Disabled">
          <Field disabled id="field-disabled" label="Group" placeholder="Not available" />
        </ShowcaseSample>
        <ShowcaseSample label="Success">
          <Field
            defaultValue="student@example.edu"
            id="field-success"
            label="Email"
            message="Address verified."
            status="success"
          />
        </ShowcaseSample>
        <ShowcaseSample label="Error">
          <Field
            defaultValue="intro"
            id="field-error"
            label="Submission title"
            message="Use at least 8 characters, then try again."
            status="error"
          />
        </ShowcaseSample>
      </div>

      <div className={styles.badgeBlock}>
        <h3 className={styles.groupTitle}>Semantic badges</h3>
        <div className={styles.badgeRow}>
          <Badge>Draft</Badge>
          <Badge icon={<Info aria-hidden size={14} />} tone="accent">Selected</Badge>
          <Badge icon={<CheckCircle aria-hidden size={14} />} tone="success">Submitted</Badge>
          <Badge icon={<Clock aria-hidden size={14} />} tone="warning">Due soon</Badge>
          <Badge icon={<XCircle aria-hidden size={14} />} tone="error">Overdue</Badge>
          <Badge icon={<Warning aria-hidden size={14} />} tone="info">Moodle only</Badge>
        </div>
      </div>
    </ShowcaseSection>
  );
}
