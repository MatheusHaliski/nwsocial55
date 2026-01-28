"use client";
import Link from "next/link";
import AuthShell from "../components/AuthShell";
import {Button} from "@/components/ui/button";
import {router} from "next/client";
import {useRouter} from "next/navigation";

export default function ForgetPasswordViewPage() {
    const router = useRouter();
  return (
    <AuthShell title="Password reset" subtitle="Send yourself a reset link">
      <div className="space-y-4 text-lg text-[#1d4ed8]/80">
        <p>
          Enter the email connected to your Social Media account. We will send a
          secure link to redefine your password.
        </p>
      </div>
      <form className="space-y-5 text-base items-center justify-end mt-14">
        <label className="block text-lg font-semibold text-[#0f766e]">
          Email address
          <input
            type="email"
            placeholder=""
            className="mt-2 w-full rounded-xl border border-[#0b2b45]/25 bg-white/30 px-4 py-3 text-lg text-[#1d4ed8] shadow-sm focus:border-[#facc15] focus:outline-none focus:ring-2 focus:ring-[#facc15]/40"
          />
        </label>

          <Button
              type="submit"
              className="inline-flex items-center scale-110 font-semibold -translate-x-[-45px] text-xs font-semibold uppercase tracking-[0.2em] text-white transition
 rounded-full ..."
          >
              Email the reset link
          </Button>
      </form>
      <div className="flex flex-col justify-end mt-1 items-center gap-2 text-lg text-[#1d4ed8]/80">
          <Button
              onClick={() => router.push("/authview")}
              className="inline-flex scale-110 rounded-full bg-[#2563eb] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#1d4ed8]"
          >
              Return
          </Button>
          <Button
              onClick={() => router.push("/signupview")}
              className="inline-flex scale-110 justify-end mt-3 rounded-full bg-[#2563eb] px-5 py-6.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#1d4ed8]"
          >
              Create an account
          </Button>
      </div>
    </AuthShell>
  );
}
