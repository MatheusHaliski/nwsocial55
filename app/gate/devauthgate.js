"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Se você usa esse tracker, mantenha. Se não existir, remova e use uma string direto.
// import { LAST_PATH_KEY } from "./RouterTracker";
const LAST_PATH_KEY = "dev_last_path";

const PIN_SALT = "FRA0102E77I_SVAC_JKF91WLING";
const PIN_HASH =
  "b04a7d934ab0a06b0a0987f16deac39ebb87e63df499ff8ff3fc2e40714af5f3";

const DEV_AUTH_SESSION_KEY = "devAuthSession";
const DEV_AUTH_LOGOUT_EVENT_KEY = "devAuthLogoutEvent";
const DEV_SESSION_TOKEN_KEY = "devAuthToken";

// Rotas que, se o usuário vier delas para /gate, deve deslogar
const LOGOUT_SOURCES = new Set(["/authview", "/forgetpassword", "/signupview"]);

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

function safeReadSessionStorage(key) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeWriteSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

function safeRemoveSessionStorage(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

function safeRemoveLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export default function AuthDevGate() {
  const pathname = usePathname(); // aqui será "/gate"
  const router = useRouter();
  const didInit = useRef(false);

  const [googleAuthed, setGoogleAuthed] = useState(false);
  const [googleUserId, setGoogleUserId] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [sessionToken, setSessionToken] = useState("");

  // ✅ Ideal: usar env var (NEXT_PUBLIC_GOOGLE_CLIENT_ID)
  // Aqui mantive hardcoded como você estava usando.
  const NEXT_PUBLIC_GOOGLE_CLIENT_ID =
    "457209482063-6cjdf87vfkrlrfo5fmgpvpm7kevcm7kc.apps.googleusercontent.com";

  const clientId = useMemo(() => NEXT_PUBLIC_GOOGLE_CLIENT_ID, []);

  const triggerLogout = useCallback(() => {
    setGoogleAuthed(false);
    setGoogleUserId("");
    setPinInput("");
    setPinVerified(false);
    setPinError("");
    setGoogleError("");
    setSessionToken("");

    if (typeof window !== "undefined") {
      safeRemoveLocalStorage(DEV_AUTH_SESSION_KEY);
      safeSetLocalStorage(DEV_AUTH_LOGOUT_EVENT_KEY, String(Date.now()));
      safeRemoveSessionStorage(DEV_SESSION_TOKEN_KEY);
    }
  }, []);

  // ✅ Ao ENTRAR em /gate: se veio de /authview|/forgetpassword|/signupview -> desloga
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (typeof window === "undefined") return;

    const prevPath = safeReadSessionStorage(LAST_PATH_KEY);
    const isGate = pathname === "/gate";
    const shouldLogout = isGate && prevPath && LOGOUT_SOURCES.has(prevPath);

    if (shouldLogout) {
      console.log("[AuthDevGate] Came from protected route -> logout", {
        prevPath,
        pathname,
      });
      triggerLogout();
    } else {
      console.log("[AuthDevGate] No forced logout", { prevPath, pathname });
    }

    // Atualiza o last path para a rota atual
    safeWriteSessionStorage(LAST_PATH_KEY, pathname);
  }, [pathname, triggerLogout]);

  // ✅ Mantém last path atualizado em qualquer navegação
  useEffect(() => {
    if (typeof window === "undefined") return;
    safeWriteSessionStorage(LAST_PATH_KEY, pathname);
  }, [pathname]);

  // ✅ Multi-aba: se outra aba fizer logout, esta também apaga e força /gate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event) => {
      if (!event || event.key !== DEV_AUTH_LOGOUT_EVENT_KEY) return;
      triggerLogout();
      router.replace("/gate");
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [triggerLogout, router]);

  const parseGoogleCredential = useCallback((credential) => {
    if (!credential) return "";
    try {
      const payload = credential.split(".")[1];
      if (!payload) return "";

      let normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      normalized = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "="
      );

      const json = atob(normalized);
      const data = JSON.parse(json);
      return data && (data.email || data.sub) ? String(data.email || data.sub) : "";
    } catch {
      return "";
    }
  }, []);

  const handleGoogleResponse = useCallback(
    async (response) => {
      try {
        const userId = parseGoogleCredential(response && response.credential);
        setGoogleUserId(userId || "Unknown user");
        setGoogleAuthed(true);
      } catch (e) {
        console.error("[AuthDevGate] Google response parse failed:", e);
        setGoogleError("Could not read Google credential.");
      }
    },
    [parseGoogleCredential]
  );

  const verifyPin = useCallback(async () => {
    setPinError("");

    const normalized = (pinInput || "").trim();
    if (!normalized) {
      setPinError("Enter the PIN to continue.");
      return;
    }

    const hashed = await hashPin(normalized);
    if (hashed === PIN_HASH) {
      setPinVerified(true);
      setPinError("");
      return;
    }

    setPinVerified(false);
    setPinError("Incorrect PIN. Try again.");
  }, [pinInput]);

  // ✅ token somente após Google + PIN
  useEffect(() => {
    if (!googleAuthed || !pinVerified) return;
    if (typeof window === "undefined") return;

    const existingToken = safeReadSessionStorage(DEV_SESSION_TOKEN_KEY);
    if (existingToken) {
      setSessionToken(existingToken);
      return;
    }

    const token = crypto.randomUUID();
    safeWriteSessionStorage(DEV_SESSION_TOKEN_KEY, token);
    setSessionToken(token);
    console.info("[AuthDevGate] Developer session token:", token);
  }, [googleAuthed, pinVerified]);

  // ✅ persistência (opcional)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (googleAuthed && pinVerified) {
      safeSetLocalStorage(
        DEV_AUTH_SESSION_KEY,
        JSON.stringify({ userId: googleUserId, verifiedAt: Date.now() })
      );
    }
  }, [googleAuthed, googleUserId, pinVerified]);

  // ✅ load Google SDK
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!clientId) {
      setGoogleError("Missing Google Client ID.");
      return;
    }

    const render = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        setGoogleError("Google Identity Services failed to load.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });

      const el = document.getElementById("google-signin");
      if (!el) return;

      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        text: "continue_with",
      });
    };

    if (window.google && window.google.accounts && window.google.accounts.id) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => setGoogleError("Google Identity Services failed to load.");
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
    };
  }, [clientId, handleGoogleResponse]);

  // ✅ quando autenticou tudo, vai para /authview
  useEffect(() => {
    if (googleAuthed && pinVerified && sessionToken) {
      router.replace("/authview");
    }
  }, [googleAuthed, pinVerified, sessionToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            /gate
          </p>
          <h1 className="text-2xl font-semibold">
            Sign in with Google and enter your PIN
          </h1>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Google sign-in</p>
            <div id="google-signin" className="mt-2 min-h-[44px]" />
            {googleError ? (
              <p className="mt-2 text-xs text-rose-500">{googleError}</p>
            ) : null}

            {googleAuthed ? (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Signed in as {googleUserId}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">PIN password</label>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              placeholder="Enter your PIN"
            />
            {pinError ? <p className="text-xs text-rose-500">{pinError}</p> : null}
            {pinVerified ? (
              <p className="text-xs text-emerald-500">PIN verified.</p>
            ) : null}
            <button
              type="button"
              onClick={verifyPin}
              disabled={!pinInput.trim()}
              className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Verify PIN
            </button>
          </div>

          <button
            type="button"
            onClick={triggerLogout}
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Reset gate (logout)
          </button>
        </div>
      </div>
    </div>
  );
}
