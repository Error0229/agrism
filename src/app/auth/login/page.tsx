import { Cormorant_Garamond, Noto_Sans_TC } from "next/font/google";
import { LoginPanel } from "./login-panel";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-auth-display",
});

const bodyFont = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-auth-body",
});

type LoginSearchParams = {
  callbackUrl?: string;
  error?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "/";
  const authError = typeof params.error === "string" ? params.error : undefined;

  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable} relative isolate min-h-screen overflow-hidden bg-[#efe9db] text-[#1f352b] [font-family:var(--font-auth-body)]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(107,138,92,0.32),transparent_40%),radial-gradient(circle_at_88%_80%,rgba(188,135,74,0.28),transparent_43%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-55 [background:linear-gradient(120deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_40%),repeating-linear-gradient(90deg,rgba(31,53,43,0.07)_0,rgba(31,53,43,0.07)_1px,transparent_1px,transparent_28px)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-[#1f352b]/20 bg-[#f8f4ea]/86 p-7 shadow-[0_26px_90px_rgba(31,53,43,0.22)] backdrop-blur-sm md:p-10">
          <p className="inline-flex items-center rounded-full border border-[#1f352b]/20 bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-[#45614f]">
            AGRISM COMMAND CENTER
          </p>

          <h1 className="mt-6 text-4xl leading-[1.03] text-[#11261d] md:text-6xl [font-family:var(--font-auth-display)]">
            花蓮農務決策
            <br />
            一站式中樞
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#2d4b3d] md:text-base">
            從作物資料、田區配置到時程追蹤，統一在同一個工作台完成。登入後即可啟用完整規劃能力，
            包含種植時間軸追溯、輪作判斷與農務紀錄分析。
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#1f352b]/15 bg-white/70 p-4">
              <p className="text-xs text-[#4e6c5a]">資料深度</p>
              <p className="mt-1 text-sm font-semibold">作物屬性與栽培限制</p>
            </article>
            <article className="rounded-2xl border border-[#1f352b]/15 bg-white/70 p-4">
              <p className="text-xs text-[#4e6c5a]">規劃精度</p>
              <p className="mt-1 text-sm font-semibold">網格田區 + 時間軸</p>
            </article>
            <article className="rounded-2xl border border-[#1f352b]/15 bg-white/70 p-4">
              <p className="text-xs text-[#4e6c5a]">管理效率</p>
              <p className="mt-1 text-sm font-semibold">紀錄、分析、建議整合</p>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 text-xs text-[#355242]">
            <span className="rounded-full border border-[#1f352b]/15 bg-white/70 px-3 py-1">在地化種植月曆</span>
            <span className="rounded-full border border-[#1f352b]/15 bg-white/70 px-3 py-1">輪作衝突提醒</span>
            <span className="rounded-full border border-[#1f352b]/15 bg-white/70 px-3 py-1">田區歷史追溯</span>
            <span className="rounded-full border border-[#1f352b]/15 bg-white/70 px-3 py-1">AI 農務建議</span>
          </div>
        </section>

        <aside className="rounded-[2rem] border border-[#1f352b]/20 bg-white/80 p-6 shadow-[0_20px_60px_rgba(17,38,29,0.24)] backdrop-blur-sm md:p-8">
          <LoginPanel callbackUrl={callbackUrl} authError={authError} />
        </aside>
      </div>
    </div>
  );
}
