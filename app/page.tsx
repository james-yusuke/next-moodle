import { redirect } from "next/navigation";

import { loadOptionalMoodleSession } from "@/lib/auth/server";

export default async function Home() {
  const session = await loadOptionalMoodleSession();
  redirect(session === null ? "/login" : "/dashboard");
}
