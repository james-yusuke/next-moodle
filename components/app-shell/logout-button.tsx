"use client";

import { SignOut } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  const logout = async () => {
    setPending(true);
    setFailed(false);
    try {
      const response = await ky.post("/api/auth/logout", {
        json: {},
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch (error) {
      if (isKyError(error)) {
        setFailed(true);
        return;
      }
      throw error;
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="ui-app-logout">
      <Button
        icon={<SignOut aria-hidden size={18} weight="regular" />}
        loading={pending}
        onClick={logout}
        variant="ghost"
      >
        ログアウト
      </Button>
      <span aria-live="polite" className="ui-app-logout__status">
        {failed ? "ログアウトできませんでした。もう一度お試しください。" : ""}
      </span>
    </div>
  );
}
