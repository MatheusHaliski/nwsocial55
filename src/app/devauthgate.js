"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthViewPage from "@/app/authview/page";

const PIN_SALT = "FRA0102E77I_SVAC_JKF91WLING";
const PIN_HASH =
    "b04a7d934ab0a06b0a0987f16deac39ebb87e63df499ff8ff3fc2e40714af5f3";

const hexFromBuffer = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PIN_SALT}${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hexFromBuffer(digest);
}

export default function DevauthGate() {
  const [googleAuthed, setGoogleAuthed] = useState(false);
  const [googleUserId, setGoogleUserId] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [googleError, setGoogleError] = useState("");
  let NEXT_PUBLIC_GOOGLE_CLIENT_ID= "457209482063-6cjdf87vfkrlrfo5fmgpvpm7kevcm7kc.apps.googleusercontent.com";
  const clientId = useMemo(
    () => NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    []
  );

  const parseGoogleCredential = useCallback((credential) => {
    if (!credential) {
      return "";
    }

    const payload = credential.split(".")[1];
    if (!payload) {
      return "";
    }

    let normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    normalized = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const json = atob(normalized);
    const data = JSON.parse(json);
    return data?.email || data?.sub || "";
  }, []);

  const handleGoogleResponse = useCallback(
    (response) => {
      const userId = parseGoogleCredential(response?.credential);
      setGoogleUserId(userId || "Unknown user");
      setGoogleAuthed(true);
    },
    [parseGoogleCredential]
  );

  const verifyPin = useCallback(async () => {
    setPinError("");
    if (!pinInput) {
      setPinError("Enter the PIN to continue.");
      return;
    }

    const hashed = await hashPin(pinInput);
    if (hashed === PIN_HASH) {
      setPinVerified(true);
      return;
    }

    setPinVerified(false);
    setPinError("Incorrect PIN. Try again.");
  }, [pinInput]);

  useEffect(() => {
    if (!clientId) {
      setGoogleError(
        "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Add it to enable Google sign-in."
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin"),
        {
          theme: "outline",
          size: "large",
          text: "continue_with",
        }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts?.id) {
        setGoogleError("Google Identity Services failed to load.");
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin"),
        {
          theme: "outline",
          size: "large",
          text: "continue_with",
        }
      );
    };
    script.onerror = () =>
      setGoogleError("Google Identity Services failed to load.");
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [clientId, handleGoogleResponse]);

  if (googleAuthed && pinVerified) {
    return < AuthViewPage/>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Devauth Gate
          </p>
          <h1 className="text-2xl font-semibold">
            Sign in with Google and enter your PIN
          </h1>
          <p className="text-sm text-zinc-500">
            This gate checks a Google sign-in and a locally verified PIN. Replace
            the stored hash with your own salted hash when you are ready.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Google sign-in</p>
            <div
              id="google-signin"
              className="mt-2 min-h-[44px]"
              aria-live="polite"
            />
            {googleError ? (
              <p className="mt-2 text-xs text-rose-500">{googleError}</p>
            ) : null}
            {googleAuthed ? (
              <button
                type="button"
                className="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700"
              >
                Signed in as {googleUserId}
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="pin">
              PIN password
            </label>
            <input
              id="pin"
              type="password"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              placeholder="Enter your PIN"
            />
            {pinError ? (
              <p className="text-xs text-rose-500">{pinError}</p>
            ) : null}
            {pinVerified ? (
              <p className="text-xs text-emerald-500">PIN verified.</p>
            ) : null}
            <button
              type="button"
              onClick={verifyPin}
              className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={!pinInput}
            >
              Verify PIN
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-xs text-zinc-500 dark:border-zinc-700">
          <p className="font-semibold text-zinc-600 dark:text-zinc-300">
            Developer note
          </p>
          <p className="mt-1">
            Update <span className="font-mono">PIN_SALT</span> and
            <span className="ml-1 font-mono">PIN_HASH</span> to match your
            desired PIN before deploying.
          </p>
        </div>
      </div>
    </div>
  );
}
