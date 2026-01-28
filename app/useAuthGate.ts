"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import Swal from "sweetalert2";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { signInWithGoogle, signOutUser, subscribeToAuthChanges } from "./auth";
import { firebaseApp, hasFirebaseConfig } from "./firebaseClient";

const db = firebaseApp ? getFirestore(firebaseApp) : null;
const SESSION_TOKEN_KEY = "restaurantcards_session_token";

const getStoredSessionToken = () => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) ?? "";
  } catch (error) {
    console.warn("[AuthGate] Unable to read session token:", error);
    return "";
  }
};

const setStoredSessionToken = (token: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch (error) {
    console.warn("[AuthGate] Unable to persist session token:", error);
  }
};

const clearStoredSessionToken = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.warn("[AuthGate] Unable to clear session token:", error);
  }
};
const ALLOWED_SIGNIN_EMAIL = "matheushaliski@gmail.com";

const encodeBase64Url = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

const createSessionToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
};

export const useAuthGate = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinChecking, setPinChecking] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlocked, setCheckingBlocked] = useState(false);
  const [sessionToken, setSessionToken] = useState(() =>
      getStoredSessionToken()
  );
  const [pinCheckReady, setPinCheckReady] = useState(false);
  const [remoteSessionExpired, setRemoteSessionExpired] = useState(false);
  const [rootSignOutInProgress, setRootSignOutInProgress] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const hasAccess = Boolean(user && pinVerified && sessionToken);

  const storeSessionToken = (token: string) => {
    setSessionToken(token);
    setStoredSessionToken(token);
  };

  const clearSessionToken = () => {
    setSessionToken("");
    clearStoredSessionToken();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_TOKEN_KEY) return;
      const nextToken = event.newValue ?? "";
      setSessionToken(nextToken);
      if (!nextToken) {
        setRemoteSessionExpired(true);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!remoteSessionExpired) return;
    if (typeof window === "undefined") return;
    let isMounted = true;
    const handleRemoteExpiry = async () => {
      window.alert("You are session expired!");
      router.replace("/");
      try {
        await fetch("/api/pin", { method: "DELETE" });
      } catch (error) {
        console.error("[AuthGate] Unable to clear PIN after session expiry:", error);
      }
      clearSessionToken();
      setPinVerified(false);
      setPinInput("");
      setPinError("");
      setPinAttempts(0);
      await signOutUser();
      if (isMounted) {
        setRemoteSessionExpired(false);
        router.replace("/page");
      }
    };

    void handleRemoteExpiry();
    return () => {
      isMounted = false;
    };
  }, [remoteSessionExpired, router]);

  const resetPinState = () => {
    setPinVerified(false);
    setPinInput("");
    setPinError("");
    setPinAttempts(0);
  };

  const expireSession = async () => {
    try {
      await fetch("/api/pin", { method: "DELETE" });
    } catch (error) {
      console.error("[AuthGate] Unable to clear PIN during sign out:", error);
    }
    clearSessionToken();
    await signOutUser();
    resetPinState();
  };

  useEffect(() => {
    if (pathname !== "/") return;
    if (!user && !sessionToken) return;
    if (rootSignOutInProgress) return;
    let isMounted = true;
    const signOutFromRoot = async () => {
      setRootSignOutInProgress(true);
      await expireSession();
      if (isMounted) {
        setRootSignOutInProgress(false);
      }
    };

    void signOutFromRoot();
    return () => {
      isMounted = false;
    };
  }, [pathname, user, sessionToken, rootSignOutInProgress]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser: User | null) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        resetPinState();
        setIsBlocked(false);
        setPinCheckReady(true);
        clearSessionToken();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const normalizedEmail = (user.email ?? "").toLowerCase();
    if (normalizedEmail !== ALLOWED_SIGNIN_EMAIL) {
      setAuthError("This account is not authorized to access this app.");
      setPinVerified(false);
      setPinInput("");
      setPinError("");
      clearSessionToken();
      void signOutUser();
      return;
    }

    if (!sessionToken) {
      const token = createSessionToken();
      storeSessionToken(token);
      console.info("[AuthGate] Session token generated:", token);
    }
  }, [user, sessionToken]);

  useEffect(() => {
    if (!user || !db || !hasFirebaseConfig) return;

    let isMounted = true;
    const checkBlockedAndLog = async () => {
      setCheckingBlocked(true);
      try {
        const blockedRef = doc(db, "blockedUsers", user.uid);
        const blockedSnap = await getDoc(blockedRef);
        if (!isMounted) return;

        if (blockedSnap.exists()) {
          setIsBlocked(true);
          void Swal.fire({
            icon: "error",
            title: "Account blocked",
            text: "Your account has been blocked. Please contact support.",
          });
          await fetch("/api/pin", { method: "DELETE" });
          clearSessionToken();
          await signOutUser();
          return;
        }

        setIsBlocked(false);
        await addDoc(collection(db, "userLogins"), {
          uid: user.uid,
          displayName: user.displayName ?? "",
          email: user.email ?? "",
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("[AuthGate] Blocked check failed:", error);
      } finally {
        if (isMounted) setCheckingBlocked(false);
      }
    };

    checkBlockedAndLog();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || isBlocked) {
      setPinCheckReady(true);
      return;
    }

    let isMounted = true;
    const checkPinCookie = async () => {
      setPinCheckReady(false);
      try {
        const response = await fetch("/api/pin", {
          method: "GET",
        });
        if (!response.ok) return;
        if (isMounted) {
          setPinVerified(true);
          setPinError("");
        }
      } catch (error) {
        console.error("[AuthGate] Unable to verify PIN cookie:", error);
      } finally {
        if (isMounted) setPinCheckReady(true);
      }
    };

    checkPinCookie();
    return () => {
      isMounted = false;
    };
  }, [user, isBlocked]);

  const handleSignIn = async () => {
    setAuthError("");
    setPinError("");
    setPinVerified(false);
    try {
      const credential = await signInWithGoogle();
      const normalizedEmail = (credential?.user?.email ?? "").toLowerCase();
      const token = createSessionToken();
      storeSessionToken(token);
      console.info("[AuthGate] Session token generated:", token);
      void Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Insert PIN",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("[AuthGate] signInWithGoogle failed:", err);
      setAuthError(
          err?.code === "auth/unauthorized-domain"
              ? "Unauthorized domain for Google Sign-In. Add your domain in Firebase Auth > Settings > Authorized domains."
              : "Unable to sign in with Google."
      );
    }
  };

  const handleSignOut = async () => {
    setAuthError("");
    try {
      await expireSession();
    } catch (err) {
      console.error("[AuthGate] signOutUser failed:", err);
      setAuthError("Unable to sign out right now.");
    }
  };

  const blockUser = async (reason: string) => {
    if (!user || !db || !hasFirebaseConfig) return;
    try {
      await setDoc(doc(db, "blockedUsers", user.uid), {
        uid: user.uid,
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        blockedAt: serverTimestamp(),
        reason,
      });
      setIsBlocked(true);
      void Swal.fire({
        icon: "error",
        title: "Account blocked",
        text: "Your account has been blocked. Please contact support.",
      });
      await fetch("/api/pin", { method: "DELETE" });
      clearSessionToken();
      await signOutUser();
    } catch (error) {
      console.error("[AuthGate] Failed to block user:", error);
      setPinError("Unable to block account right now.");
    }
  };

  const handlePinVerify = async () => {
    if (isBlocked || checkingBlocked) {
      setPinError("This account is blocked.");
      return;
    }

    const normalizedInput = pinInput.trim();
    if (!normalizedInput) {
      setPinError("Enter the required PIN to continue.");
      setPinVerified(false);
      return;
    }

    setPinChecking(true);
    try {
      const response = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: normalizedInput }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
            typeof payload?.error === "string"
                ? payload.error
                : "Incorrect PIN. Please try again.";
        setPinError(message);
        setPinVerified(false);
        if (response.status === 401) {
          const nextAttempts = pinAttempts + 1;
          setPinAttempts(nextAttempts);
          if (nextAttempts >= 3) {
            await blockUser("PIN entered incorrectly 3 times.");
          }
        }
        return;
      }

      setPinError("");
      setPinVerified(true);
      setPinAttempts(0);
    } catch (error) {
      console.error("[AuthGate] PIN verification failed:", error);
      setPinError("Unable to verify PIN right now.");
      setPinVerified(false);
    } finally {
      setPinChecking(false);
    }
  };

  return {
    user,
    authReady,
    authError,
    pinInput,
    setPinInput,
    pinError,
    pinVerified,
    pinChecking,
    pinAttempts,
    isBlocked,
    checkingBlocked,
    sessionToken,
    pinCheckReady,
    hasAccess,
    handleSignIn,
    handleSignOut,
    handlePinVerify,
  };
};
