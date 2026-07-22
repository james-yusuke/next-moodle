import { Skeleton, Surface } from "@/components/ui";
import { RevealTransition } from "@/components/app-shell/transitions";
import { PageFrame } from "@/components/app-shell/workspace-frame";

export function PageLoading({ label }: Readonly<{ label: string }>) {
  return (
    <RevealTransition>
      <PageFrame
        content={(
          <div aria-busy="true" aria-label={label} className="ui-page-stack" role="status">
            <span className="ui-sr-only">{label}</span>
            <div className="ui-page-grid">
              <Surface><Skeleton className="ui-page-loading__panel" /></Surface>
              <Surface><Skeleton className="ui-page-loading__panel" /></Surface>
            </div>
          </div>
        )}
        header={<div aria-hidden className="ui-page-loading__heading"><Skeleton className="ui-page-loading__title" /><Skeleton className="ui-page-loading__copy" /></div>}
        mode="overview"
      />
    </RevealTransition>
  );
}
