"use client";
import Link from "next/link";
import AuthShell from "../components/AuthShell";
import SignupForm from "./SignupForm";
import {useEffect} from "react";
import {router} from "next/client";
import {useRouter} from "next/navigation";

export default function SignupViewPage() {
    const router = useRouter();
    useEffect(() => {
        const token = sessionStorage.getItem("devAuthToken");
        if (!token) router.replace("/gate");
    }, [router]);
    return (
        <AuthShell title="Sign up" subtitle="Start your Velion Social journey">
            <SignupForm />
            <div className="flex flex-col items-center gap-3 text-base text-[#1d4ed8]/80">
                <p className="max-w-md text-center text-base text-[#1d4ed8]/75">
                    By creating an account, you agree to our community guidelines and
                    data use policy.
                </p>
                <Link
                    href="/authview"
                    className="font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                >
                    Already have an account? Sign in
                </Link>
            </div>
        </AuthShell>
    );
}
