"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (!result || result.error) {
        setError("登入失敗，請檢查帳號密碼");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("系統錯誤，請稍後再試");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "login" ? "登入" : "建立帳號"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button variant={mode === "login" ? "default" : "outline"} size="sm" onClick={() => setMode("login")}>
              登入
            </Button>
            <Button variant={mode === "signup" ? "default" : "outline"} size="sm" onClick={() => setMode("signup")}>
              註冊
            </Button>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <Input placeholder="名稱" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="密碼（至少 8 碼）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "處理中..." : mode === "login" ? "登入" : "註冊並登入"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

