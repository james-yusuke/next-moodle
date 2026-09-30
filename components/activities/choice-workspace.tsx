"use client";

import styles from "./choice-workspace.module.css";
import { CheckCircle } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, StickyActionBar } from "@/components/ui";
import type { ChoiceActivityData } from "@/lib/moodle/activities/choice";

export function ChoiceWorkspace({ cmid, data }: Readonly<{ cmid: number; data: ChoiceActivityData }>) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set(data.options.filter((option) => option.checked).map((option) => option.id)));
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");

  function change(id: number, checked: boolean): void {
    setSelected((current) => {
      if (!data.allowMultiple) return checked ? new Set([id]) : new Set();
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (state === "pending" || selected.size === 0) return;
    setState("pending");
    try {
      const response = await ky.post(`/api/activities/${cmid}/choice`, {
        json: { responses: [...selected] }, retry: 0, throwHttpErrors: false,
      });
      setState(response.ok ? "success" : "error");
      if (response.ok) router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <form className={styles.choice!} onSubmit={(event) => void submit(event)}>
      <header className={styles.style1!}><div className={styles.style2!}><span className={styles.kicker!}>CHOICE</span><h2 className={styles.style3!}>{data.name}</h2></div>{selected.size > 0 ? <span className={styles.style4!}>{selected.size}件を選択</span> : null}</header>
      <fieldset className={styles.style5!}><legend className={styles.style6!}>選択肢</legend>{data.options.map((option) => <label className={styles.style7!} data-selected={selected.has(option.id)} key={option.id}><input className={styles.style8!} checked={selected.has(option.id)} disabled={option.disabled || (option.checked && !data.allowUpdate)} name="choice" onChange={(event) => change(option.id, event.currentTarget.checked)} type={data.allowMultiple ? "checkbox" : "radio"} value={option.id} /><span className={styles.style9!}><strong>{option.text}</strong><small className={styles.style4!}>{option.countanswers}件の回答</small></span></label>)}</fieldset>
      <StickyActionBar aria-label="回答操作"><span aria-live="polite" className={state === "error" ? styles.style10! : styles.style11!}>{state === "success" ? <><CheckCircle aria-hidden size={16} />保存しました</> : state === "error" ? "保存できませんでした。" : ""}</span><Button disabled={state === "pending" || selected.size === 0} loading={state === "pending"} type="submit">{data.options.some((option) => option.checked) ? "回答を更新" : "回答を送信"}</Button></StickyActionBar>
    </form>
  );
}
