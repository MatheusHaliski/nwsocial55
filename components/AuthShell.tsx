import type { ReactNode } from "react";


type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b bg-white text-black">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#22c55e]/20 blur-[140px]" />
        <div className="absolute left-1/2 top-32 h-80 w-80 -translate-x-1/2 rounded-full bg-[#38bdf8]/25 blur-[160px]" />
        <div className="absolute bottom-12 right-16 h-56 w-56 rounded-full bg-[#f97316]/20 blur-[120px]" />
      </div>

      <div className="absolute left-6 top-6 z-10 flex items-center gap-4 text-base font-semibold text-black">

        <img
          src="/velion.png"
          alt="Velion Infyra Technology Platforms, Inc."
          className="h-55 left-0 top-0 w-auto"
        />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <img
          src="/losangle-blue.svg"
          alt=""
          className="absolute left-6 top-50 h-24 w-24 drop-shadow-[0_16px_30px_rgba(37,99,235,0.25)]"
        />
        <img
          src="/losangle-orange.svg"
          alt=""
          className="absolute right-10 bottom-24 h-24 w-24 drop-shadow-[0_16px_30px_rgba(249,115,22,0.25)]"
        />
        <img
          src="/losangle-blue.svg"
          alt=""
          className="absolute right-24 top-28 h-16 w-16 opacity-70"
        />
        <img
          src="/losangle-orange.svg"
          alt=""
          className="absolute left-16 bottom-20 h-16 w-16 opacity-70"
        />
        <img
          src="/star-orange.svg"
          alt=""
          className="absolute right-2 top-52 h-14 w-14 opacity-80"
        />
        <img
          src="/star-gradient.svg"
          alt=""
          className="absolute left-2 top-120 h-14 w-14 opacity-80"
        />
        <img
          src="/star-gradient.svg"
          alt=""
          className="absolute right-4 bottom-14 h-10 w-10 opacity-70"
        />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur-xl md:p-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="items-center text-center">

              <img
                  src="/v.png"
                  alt="Velion Logo"
                  className="h-40 w-auto -translate-x-[-60px] -translate-y-[-40px]"
              />

              <img
                  src="/v5.png"
                  alt="Velion Logo"
                  className="h-60 w-auto -translate-y-[60px]
"
              />

            </div>


          </div>

          <div className="mt-8 rounded-2xl border -translate-y-[120px] border-white/10 bg-white/5 p-6 text-left shadow-inner backdrop-blur-lg md:p-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316]">
                {title}
              </p>
              <h1 className="text-3xl font-semibold text-[#f97316]">
                {subtitle}
              </h1>
            </div>
            <div className="mt-6 space-y-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
