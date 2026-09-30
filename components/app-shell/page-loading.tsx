import styles from "./page-loading.module.css";
import { Skeleton, Surface } from "@/components/ui";
import { RevealTransition } from "@/components/app-shell/transitions";
import { PageFrame } from "@/components/app-shell/workspace-frame";

export function PageLoading({ label }: Readonly<{ label: string }>) {
  return (
    <RevealTransition>
      <PageFrame
        content={(
          <div aria-busy="true" aria-label={label} className={styles.pageStack!} role="status">
            <span className={styles.style1!}>{label}</span>
            <div className={styles.pageGrid!}>
              <Surface><Skeleton className={styles.pageLoadingPanel!} /></Surface>
              <Surface><Skeleton className={styles.pageLoadingPanel!} /></Surface>
            </div>
          </div>
        )}
        header={<div aria-hidden className={styles.pageLoadingHeading!}><Skeleton className={styles.pageLoadingTitle!} /><Skeleton className={styles.pageLoadingCopy!} /></div>}
        mode="overview"
      />
    </RevealTransition>
  );
}
