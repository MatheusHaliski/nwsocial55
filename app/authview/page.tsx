"use client";
import Link from "next/link";
import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/button";
import { useRouter } from "next/navigation";
import {useEffect} from "react";
export default function AuthViewPage() {
    const router = useRouter();
    useEffect(() => {
        const token = sessionStorage.getItem("devAuthToken");
        if (!token) router.replace("/gate");
    }, [router]);
    return (
        <AuthShell title="Sign In" subtitle="Welcome back">
            <form className="space-y-25 text-base">
                <label className="text-lg font-semibold text-orange-500">
                    Email Address
                    <input
                        type="email"
                        placeholder=""
                        className="mt-2 w-full rounded-xl border border-[#2563eb]/40 bg-white/30 px-4 py-4 text-center text-xl text-[#2563eb] shadow-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
                    />
                </label>
                <label className="text-lg font-semibold text-orange-500">
                    Password
                    <input
                        type="password"
                        placeholder=""
                        className="mt-2 w-full rounded-xl border border-[#2563eb]/40 bg-white/30 px-4 py-4 text-center text-xl text-[#2563eb] shadow-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
                    />
                </label>
                <div className="flex items-center justify-end mt-14">
                    <Button
                        type="submit"
                        className="inline-flex items-center scale-110 font-semibold -translate-x-[255px] text-xs font-semibold uppercase tracking-[0.2em] text-white transition
 rounded-full ...">
                        Continue to your VS
                    </Button>
                </div>
            </form>

            <div className="flex flex-col items-center gap-3 text-lg text-[#1d4ed8]/80">
                <Link
                    href="/forgetpasswordview"
                    className="font-semibold text-[#f97316] hover:text-[#f59e0b]"
                >
                    Forgot password? Reset it here
                </Link>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => router.push("/signupview")}
                        className="inline-flex items-center scale-110 font-semibold -translate-x-[5px] text-xs font-semibold uppercase tracking-[0.2em] text-white transition
 rounded-full ...">
                        Create an account
                    </Button>
                </div>
            </div>
        </AuthShell>
    );
}
