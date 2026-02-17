"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginPanel({
  callbackUrl,
  authError,
}: {
  callbackUrl: string;
  authError?: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const authErrorMessage = authError === "CredentialsSignin" ? "登入失敗，請檢查帳號密碼" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "註冊失敗");
          setLoading(false);
          return;
        }
      }

      await signIn("credentials", {
        redirect: true,
        callbackUrl,
        email,
        password,
      });
    } catch {
      setError("系統錯誤，請稍後再試");
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-[11px] tracking-[0.2em] text-[#587363]">SECURE LOGIN</p>
      <h2 className="mt-2 text-3xl leading-tight text-[#132a20] [font-family:var(--font-auth-display)]">
        {mode === "login" ? "登入農務工作台" : "建立新帳號"}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#426050]">
        未登入前僅能查看登入頁。完成登入後，才可使用作物規劃、田區配置與農務分析功能。
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-[#1f352b]/15 bg-[#f4efe2] p-1.5">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            mode === "login" ? "bg-[#1f352b] text-[#f9f6ec] shadow-[0_8px_16px_rgba(31,53,43,0.3)]" : "text-[#325040] hover:bg-white/70"
          }`}
        >
          登入
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            mode === "signup" ? "bg-[#1f352b] text-[#f9f6ec] shadow-[0_8px_16px_rgba(31,53,43,0.3)]" : "text-[#325040] hover:bg-white/70"
          }`}
        >
          註冊
        </button>
      </div>

      <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <Input
            placeholder="名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 border-[#466352]/25 bg-white"
          />
        )}

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 border-[#466352]/25 bg-white"
        />

        <Input
          type="password"
          placeholder="密碼（至少 8 碼）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11 border-[#466352]/25 bg-white"
        />

        {(error || authErrorMessage) && <p className="text-sm text-red-700">{error || authErrorMessage}</p>}

        <Button
          type="submit"
          className="h-11 w-full bg-[#1f352b] text-[#f9f6ec] hover:bg-[#172b21]"
          disabled={loading}
        >
          {loading ? "處理中..." : mode === "login" ? "登入" : "註冊並登入"}
        </Button>
      </form>
    </div>
  );
}
