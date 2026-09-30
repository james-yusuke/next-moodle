"use client";

import styles from "./database-workspace.module.css";
import { Database, FloppyDisk } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, EmptyState, Notice, RichContent, StickyActionBar } from "@/components/ui";
import { classNames } from "@/components/ui/class-names";
import { isEmptyMoodleDocument } from "@/lib/moodle/html";
import type { DatabaseActivityData, DatabaseField } from "@/lib/moodle/activities/database-model";

function DatabaseControl({ field }: Readonly<{ field: DatabaseField }>) {
  const shared = { "aria-labelledby": `database-field-label-${field.id}`, id: `database-field-${field.id}`, name: String(field.id), required: field.required };
  const controlClass = styles.controlClass1!;
  if (field.kind === "unsupported") {
    return <Notice title={`${field.name} は現在入力できません`} tone="warning"><p>この特殊フィールドの型付きパーサーが必要です。入力せずに診断情報を共有してください。</p></Notice>;
  }
  if (field.kind === "textarea") return <textarea {...shared} className={classNames(controlClass, styles.style12!)} maxLength={50_000} rows={6} />;
  if (field.kind === "select") return <select {...shared} className={controlClass}><option value="">選択してください</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.kind === "checkbox") return <fieldset aria-labelledby={shared["aria-labelledby"]} className={styles.style1!}>{field.options.map((option) => <label className={styles.style2!} key={option}><input className={styles.style3!} name={shared.name} type="checkbox" value={option} /><span>{option}</span></label>)}</fieldset>;
  return <input {...shared} className={controlClass} maxLength={4_000} type={field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"} />;
}

export function DatabaseWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: DatabaseActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const values = data.fields.filter((field) => field.kind !== "unsupported").map((field) => ({
      fieldId: field.id,
      value: field.kind === "checkbox" ? form.getAll(String(field.id)).map(String) : String(form.get(String(field.id)) ?? ""),
    }));
    setPending(true);
    setError("");
    try {
      const response = await ky.post(`/api/activities/${cmid}/database`, { json: { values }, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError("レコードを保存できませんでした。入力内容は保持されています。");
        return;
      }
      formElement.reset();
      router.refresh();
    } catch {
      setError("レコードを保存できませんでした。入力内容は保持されています。");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.database!} aria-labelledby="database-title">
      <header className={styles.style4!}><div className={styles.style5!}><span className={styles.kicker!}>STRUCTURED RECORDS</span><h2 className={styles.style6!} id="database-title">データベース</h2></div><span className={styles.style7!}>{data.total}件</span></header>
      {isEmptyMoodleDocument(data.entries) ? <EmptyState title="表示できるレコードはありません。" /> : <Card padding="spacious"><RichContent className={styles.databaseRecords!} document={data.entries} /></Card>}
      {data.canAdd ? <details className={styles.databaseCreate!}><summary className={styles.style8!}><Database aria-hidden size={18} />レコードを追加</summary><form className={styles.style9!} onSubmit={(event) => void submit(event)}>{data.fields.map((field) => <div className={styles.databaseField!} key={field.id}><span className={styles.style10!} id={`database-field-label-${field.id}`}>{field.name}{field.required ? " *" : ""}</span>{field.description === "" ? null : <small className={styles.style11!}>{field.description}</small>}<DatabaseControl field={field} /></div>)}<span aria-live="polite" className={styles.formError!}>{error}</span><StickyActionBar aria-label="データベース操作"><Button disabled={pending} loading={pending} type="submit"><FloppyDisk aria-hidden size={17} />レコードを保存</Button></StickyActionBar></form></details> : <Notice title="追加は現在利用できません" tone="info"><p>閲覧期間または登録上限を確認してください。</p></Notice>}
    </section>
  );
}
