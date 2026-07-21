import {
  ArrowRight,
  Bell,
  FloppyDisk,
  Trash,
} from "@phosphor-icons/react/dist/ssr";
import { Button, IconButton, ThemeControl } from "@/components/ui";
import { ShowcaseSample, ShowcaseSection } from "./showcase-frame";
import styles from "./showcase.module.css";

export function ActionShowcase() {
  return (
    <ShowcaseSection
      description="Every action keeps a 44px target, visible focus, and a stable loading width. Forced states sit beside live controls for review."
      eyebrow="01 / Interaction"
      title="Actions and theme"
    >
      <div className={styles.themeRow}>
        <div>
          <h3 className={styles.groupTitle}>Theme preference</h3>
          <p className={styles.groupDescription}>
            Dark is the default; explicit light and system choices persist without a paint flash.
          </p>
        </div>
        <ThemeControl />
      </div>

      <div className={styles.sampleGrid}>
        <ShowcaseSample label="Default">
          <Button icon={<FloppyDisk aria-hidden size={17} weight="regular" />} variant="primary">
            Save changes
          </Button>
        </ShowcaseSample>
        <ShowcaseSample label="Hover">
          <Button data-demo-state="hover" icon={<ArrowRight aria-hidden size={17} />}>
            Open course
          </Button>
        </ShowcaseSample>
        <ShowcaseSample label="Active">
          <Button data-demo-state="active" variant="secondary">
            Pressed
          </Button>
        </ShowcaseSample>
        <ShowcaseSample label="Focus visible">
          <Button data-demo-state="focus" variant="ghost">
            Keyboard focus
          </Button>
        </ShowcaseSample>
        <ShowcaseSample label="Disabled">
          <Button disabled variant="secondary">
            Unavailable
          </Button>
        </ShowcaseSample>
        <ShowcaseSample label="Loading">
          <Button loading variant="primary">
            Saving
          </Button>
        </ShowcaseSample>
        <ShowcaseSample label="Danger">
          <Button icon={<Trash aria-hidden size={17} weight="regular" />} variant="danger">
            Remove draft
          </Button>
        </ShowcaseSample>
        <ShowcaseSample label="Icon button">
          <IconButton
            icon={<Bell aria-hidden size={19} weight="regular" />}
            label="Open notifications"
            variant="secondary"
          />
        </ShowcaseSample>
      </div>
    </ShowcaseSection>
  );
}
