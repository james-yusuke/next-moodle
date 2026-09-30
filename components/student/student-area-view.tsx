import styles from "./student-area-view.module.css";
import { ArrowRight, File, Info } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Card, DataList, DataListItem, EmptyState } from "@/components/ui";
import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import type { AppRuntimeConfig } from "@/lib/app-config";
import type { ReactNode } from "react";
import type { StudentAreaData } from "@/lib/moodle/queries/student";
import { StudentAreaNavigation } from "./student-area-navigation";

export function StudentAreaView({ actions, config, data, description, empty, title }: Readonly<{
  actions?: ReactNode;
  config: AppRuntimeConfig;
  data: StudentAreaData;
  description: string;
  empty: string;
  title: string;
}>) {
  const dateFormat = new Intl.DateTimeFormat(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  return (
    <PageFrame
      content={data.rows.length === 0 ? <EmptyState title={empty}><p>Moodleに情報が追加されると、ここへ反映されます。</p></EmptyState> : (
        <Card padding="standard"><DataList className={styles.studentLedger!} label={`${title}の内容`}>
          {data.rows.map((row) => (
            <DataListItem action={row.href === undefined ? undefined : <Link className={styles.style1!} href={row.href}>開く <ArrowRight aria-hidden size={15} /></Link>} description={row.meta} icon={<File aria-hidden size={18} />} key={row.id} metadata={row.timestamp === undefined ? undefined : <time dateTime={new Date(row.timestamp * 1_000).toISOString()}>{dateFormat.format(new Date(row.timestamp * 1_000))}</time>} state={row.value === undefined ? undefined : <span className={styles.studentRowValue!}>{row.value}</span>} title={row.title} />
          ))}
        </DataList></Card>
      )}
      context={<ContextPanel storageKey="student" title="学習情報"><StudentAreaNavigation /></ContextPanel>}
      header={<RouteHeader actions={<>{actions}<InspectorSheet label={<><Info aria-hidden size={17} />概要</>} title="概要"><div className={styles.studentOverview!}><strong className={styles.tabular!}>{data.metric}</strong><p className={styles.style2!}>ログイン中のMoodleアカウントから取得しています。</p></div></InspectorSheet></>} description={description} eyebrow="STUDENT RECORD" metadata={data.metric} title={title} />}
      mode="browse"
      width="standard"
    />
  );
}
