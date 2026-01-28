"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getFirestore, updateDoc } from "firebase/firestore";

import { getRestaurants } from "./firebase";
import {
  FOOD_CATEGORIES,
  getCategoryIcon,
  normalizeCategoryLabel,
} from "./categories";
import { firebaseApp, hasFirebaseConfig } from "./firebaseClient";
import { useAuthGate } from "./useAuthGate";
const GLASS = "border border-white/20 bg-white/10 backdrop-blur-xl";
const GLASS_DEEP = "border border-white/18 bg-white/8 backdrop-blur-2xl";

const GLOW_BAR =
    "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 " +
    "shadow-[0_14px_45px_rgba(16,185,129,0.25)]";

const GLOW_LINE =
    "after:content-[''] after:absolute after:left-6 after:right-6 after:-bottom-2 " +
    "after:h-[10px] after:rounded-full after:bg-gradient-to-r after:from-cyan-400/40 after:via-teal-300/40 after:to-emerald-400/40 " +
    "after:blur-xl";

const TEXT_GLOW =
    "text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.25)]";
// ============================
// 🍏 Apple Glassmorphism Tokens
// ============================

const GLASS_PANEL =
    "relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.35)]";

const GLASS_INPUT =
    "h-12 w-full rounded-2xl border border-white/14 bg-white/[0.08] backdrop-blur-2xl px-3 text-white placeholder:text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35";

type Restaurant = {
  id: string;
  name?: string;
  photo?: string;
  photoPath?: string;
  imagePath?: string;
  storagePath?: string;
  fallbackApplied?: boolean;
  fallbackapplied?: boolean;

  rating?: number;
  grade?: number;
  starsgiven?: number;

  country?: string;
  state?: string;
  city?: string;

  address?: string;
  street?: string;

  categories?: unknown;
  category?: string;
};

const db = firebaseApp ? getFirestore(firebaseApp) : null;

const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

const getRestaurantStoragePath = (restaurant: Restaurant) => {
  if (restaurant.imagePath) return restaurant.imagePath;
  if (restaurant.photoPath) return restaurant.photoPath;
  if (restaurant.storagePath) return restaurant.storagePath;
  if (restaurant.photo && !isExternalUrl(restaurant.photo)) {
    return restaurant.photo;
  }
  return `restaurants/${restaurant.id}.jpg`;
};

const parseRatingValue = (rating: unknown) => {
  if (typeof rating === "number" && !Number.isNaN(rating)) return rating;
  if (typeof rating === "string") {
    const normalized = rating.trim().replace(",", ".");
    const match = normalized.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }
  return 0;
};

const getStarRating = (rating: unknown) => {
  const safe = parseRatingValue(rating);
  const rounded = Math.max(0, Math.min(5, Math.round(safe)));
  return { rounded, display: Math.max(0, Math.min(5, safe)) };
};

// --------------------
// Flags via /public PNG
// --------------------
type FlagAsset = {
  alt: string;
  src: string;
};

const COUNTRY_FLAG_PNG: Record<string, FlagAsset> = {
  brasil: { alt: "Brasil", src: "/brasil.png" },
  brazil: { alt: "Brasil", src: "/brasil.png" },
  br: { alt: "Brasil", src: "/brasil.png" },

  canada: { alt: "Canada", src: "/canada.png" },
  ca: { alt: "Canada", src: "/canada.png" },

  "estados unidos": { alt: "Estados Unidos", src: "/estados-unidos.png" },
  "estados-unidos": { alt: "Estados Unidos", src: "/estados-unidos.png" },
  "united states": { alt: "Estados Unidos", src: "/estados-unidos.png" },
  usa: { alt: "Estados Unidos", src: "/estados-unidos.png" },
  us: { alt: "Estados Unidos", src: "/estados-unidos.png" },
};

const normalizeKey = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[._]/g, "-");

const CAFE_CATEGORY_SET = new Set([
  "cafes",
  "cafeteria",
  "hong kong style cafe",
  "themed cafes",
]);

const SANDWICH_CATEGORY_SET = new Set([
  "sandwiches",
  "sandwich shop",
  "sandwich shops",
  "sandwiches & wraps",
  "sandwiches and wraps",
]);

const getCategoryValues = (restaurant: Restaurant) => {
  if (Array.isArray(restaurant.categories)) {
    return restaurant.categories.map((item) =>
        normalizeCategoryLabel(String(item))
    );
  }
  if (typeof restaurant.categories === "string") {
    return restaurant.categories
        .split(",")
        .map((item) => normalizeCategoryLabel(item))
        .filter(Boolean);
  }
  if (restaurant.category) {
    return [normalizeCategoryLabel(String(restaurant.category))];
  }
  return [];
};

const hasCafeCategory = (restaurant: Restaurant) =>
    getCategoryValues(restaurant).some((category) =>
        CAFE_CATEGORY_SET.has(category.trim().toLowerCase())
    );

const hasSandwichCategory = (restaurant: Restaurant) =>
    getCategoryValues(restaurant).some((category) =>
        SANDWICH_CATEGORY_SET.has(category.trim().toLowerCase())
    );

const getFallbackImageForRestaurant = (restaurant: Restaurant) => {
  const fallbackApplied = Boolean(
      restaurant.fallbackApplied ?? restaurant.fallbackapplied
  );
  if (!fallbackApplied) return null;
  if (hasSandwichCategory(restaurant)) return "/fallbacksandwich.png";
  if (hasCafeCategory(restaurant)) return "/fallbackcafe.png";
  return null;
};

function getCountryFlagPng(
    countryName: string | undefined | null
): FlagAsset | null {
  if (!countryName) return null;
  const key = normalizeKey(countryName);
  return COUNTRY_FLAG_PNG[key] ?? null;
}

const NEW_YORK_ADDRESS_REGEX = /\b\d+\s+[^,]+,?\s*new york\b/i;

const getNormalizedLocation = (restaurant: Restaurant) => {
  const sourceAddress = [restaurant.address, restaurant.street]
      .filter(Boolean)
      .join(", ");

  if (sourceAddress && NEW_YORK_ADDRESS_REGEX.test(sourceAddress)) {
    return {
      city: "New York",
      state: "NY",
      country: "USA",
    };
  }

  return {
    city: restaurant.city,
    state: restaurant.state,
    country: restaurant.country,
  };
};

// --------------------
// Reusable SearchSelect
// --------------------
function SearchSelect<T extends string>({
                                          value,
                                          options,
                                          onChange,
                                          placeholder,
                                          searchPlaceholder,
                                          disabled,
                                          getOptionKey,
                                          getOptionLabel,
                                          renderOption,
                                          renderValue,
                                          includeAllOption,
                                          allLabel,
                                        }: {
  value: T;
  options: T[];
  onChange: (next: T) => void;

  placeholder: string;
  searchPlaceholder: string;

  disabled?: boolean;

  getOptionKey?: (opt: T) => string;
  getOptionLabel: (opt: T) => string;

  renderOption?: (opt: T, selected: boolean) => React.ReactNode;
  renderValue?: (opt: T) => React.ReactNode;

  includeAllOption?: boolean;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputId = useId();

  const hasValue = Boolean(value);
  const buttonLabel = hasValue
      ? renderValue
          ? renderValue(value)
          : getOptionLabel(value)
      : allLabel ?? placeholder;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    return options.filter((opt) =>
        getOptionLabel(opt).toLowerCase().includes(q)
    );
  }, [options, query, getOptionLabel]);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const input = rootRef.current?.querySelector<HTMLInputElement>(
          'input[data-searchselect="1"]'
      );
      input?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  return (
      <div ref={rootRef} className="relative">
        <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={`w-full text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#1d4ed8]  rounded-xl top-10 bg-[#2563eb] px-4 py-5 text-base font-semibold text-[#e0f2fe] shadow-lg shadow-[#2563eb]/40 transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] ${
                disabled
                    ? "cursor-not-allowed bg-white/5 text-white/40"
                    : "bg-white/5 hover:-translate-y-0.5"
            }`}
        >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {buttonLabel}
        </span>
          <span className="text-white/70">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
            <div
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-xl shadow-black/30 backdrop-blur"
            >
              <div className="border-b border-white/10 p-2.5">
                <input
                    id={searchInputId}
                    data-searchselect="1"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white placeholder:text-white/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                />
              </div>

              <div className="max-h-[280px] overflow-y-auto">
                {includeAllOption ? (
                    <button
                        type="button"
                        onClick={() => {
                          onChange("" as T);
                          setOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm text-white transition-all duration-200 hover:bg-white/10 ${
                            !value ? "bg-cyan-500/10" : "bg-transparent"
                        }`}
                    >
                      {allLabel ?? placeholder}
                    </button>
                ) : null}

                {filteredOptions.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-white/60">
                      No matches.
                    </div>
                ) : (
                    filteredOptions.map((opt) => {
                      const key = getOptionKey ? getOptionKey(opt) : String(opt);
                      const selected = opt === value;

                      return (
                          <button
                              key={key}
                              type="button"
                              onClick={() => {
                                onChange(opt);
                                setOpen(false);
                              }}
                              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-white transition-all duration-200 hover:bg-white/10 ${
                                  selected ? "bg-cyan-500/10" : "bg-transparent"
                              }`}
                          >
                    <span>
                      {renderOption
                          ? renderOption(opt, selected)
                          : getOptionLabel(opt)}
                    </span>
                            {selected ? <span className="text-white/80">✓</span> : null}
                          </button>
                      );
                    })
                )}
              </div>
            </div>
        )}
      </div>
  );
}

function readCookie(name: string) {
  const v = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${name}=`))
      ?.split("=")[1];
  return v ?? null;
}

export default function RestaurantCardsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [cardImageUrls, setCardImageUrls] = useState<Record<string, string>>(
      {}
  );
  const updatedPhotoIdsRef = useRef(new Set<string>());

  const [nameQuery, setNameQuery] = useState("");

  const [country, setCountry] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [starsFilter, setStarsFilter] = useState("");

  const router = useRouter();
  const { user, authReady, authError, hasAccess, handleSignOut, pinCheckReady } =
      useAuthGate();

  useEffect(() => {
    (async () => {
      const sessionTokenCookie = readCookie("sessionToken");
      const pinVerifiedCookie = readCookie("pinVerified");


      if (!user) {
        return;
      }

      try {
        const idToken = await user.getIdToken(true);
        const tokenResult = await user.getIdTokenResult();

      } catch (e) {
        console.error("[Auth] Failed to get ID token:", e);
      }
    })();
  }, [authReady, pinCheckReady, hasAccess, user]);
  const warmRoute = (id: string) => {
    // Prefetch do chunk da página de detalhes
    router.prefetch(`/restaurantinfopage/${id}`);

    // (Opcional) aquece também a imagem do card, se já tiver URL
    const url = cardImageUrls[id];
    if (url) {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
    }
  };

  const goToDetails = (id: string) => {
    setNavigatingTo(id); // dá feedback instantâneo
    router.push(`/restaurantinfopage/${id}`);
  };
  // Load restaurants
  useEffect(() => {
    let isMounted = true;

    async function loadRestaurants() {
      try {
        setLoading(true);
        setError("");

        const items = await getRestaurants();
        if (isMounted) {
          setRestaurants(items as Restaurant[]);
        }
      } catch (err: any) {
        console.error("[RestaurantCardsPage] getRestaurants() failed:", err);

        const code = err?.code ? String(err.code) : "";
        const message = err?.message ? String(err.message) : "Unknown error";

        let friendly = "Failed to load restaurants.";

        if (
            code === "permission-denied" ||
            message.toLowerCase().includes("missing or insufficient permissions")
        ) {
          setError(
              "Permissão negada no Firestore (rules). Vou sair da conta para evitar loop."
          );
          await handleSignOut();
          router.replace("/");
          return;
        }

        if (
            message.toLowerCase().includes("not configured") ||
            message.toLowerCase().includes("missing firebase env vars") ||
            message.toLowerCase().includes("firebase app was not initialized")
        ) {
          friendly =
              "Firebase config is missing. Check .env.local (NEXT_PUBLIC_FIREBASE_*) and restart `npm run dev`.";
        }

        if (isMounted) {
          setError(`${friendly}\n\n[debug] ${code || "no-code"}: ${message}`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRestaurants();
    return () => {
      isMounted = false;
    };
  }, [hasAccess, handleSignOut, router]);

  // imagesReady (mantive o seu fluxo atual)
  useEffect(() => {
    if (!hasAccess || loading) return;
    if (restaurants.length === 0) {
      setCardImageUrls({});
      return;
    }


    let isMounted = true;

    const preloadImage = (url: string) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        });

    const loadStorageImages = async () => {

      const imageCandidates = restaurants.filter(
          (restaurant) => !getFallbackImageForRestaurant(restaurant)
      );


      const nextUrls: Record<string, string> = {};
      const preloadUrls: string[] = [];

      if (!isMounted) return;

      setCardImageUrls(nextUrls);

      if (preloadUrls.length === 0) {
        return;
      }

      await Promise.allSettled(preloadUrls.map((url) => preloadImage(url)));
    };

    loadStorageImages();

    return () => {
      isMounted = false;
    };
  }, [hasAccess, loading, restaurants]);

  useEffect(() => {
    if (!db || !hasFirebaseConfig) return;

    const pendingUpdates = restaurants.filter(
        (restaurant) =>
            Boolean(restaurant.fallbackApplied ?? restaurant.fallbackapplied) &&
            ((hasCafeCategory(restaurant) &&
                    restaurant.photo !== "/fallbackcafe.png") ||
                (hasSandwichCategory(restaurant) &&
                    restaurant.photo !== "/fallbacksandwich.png")) &&
            !updatedPhotoIdsRef.current.has(restaurant.id)
    );

    if (pendingUpdates.length === 0) return;

    pendingUpdates.forEach((restaurant) => {
      const nextPhoto = hasSandwichCategory(restaurant)
          ? "/fallbacksandwich.png"
          : "/fallbackcafe.png";
      updatedPhotoIdsRef.current.add(restaurant.id);
      updateDoc(doc(db, "restaurants", restaurant.id), {
        photo: nextPhoto,
      }).catch((err) => {
        updatedPhotoIdsRef.current.delete(restaurant.id);
        console.error("[RestaurantCardsPage] Failed to update photo:", err);
      });
    });
  }, [restaurants]);

  const normalizedRestaurants = useMemo(
      () =>
          restaurants.map((restaurant) => ({
            ...restaurant,
            ...getNormalizedLocation(restaurant),
          })),
      [restaurants]
  );

  const availableCountries = useMemo(() => {
    const options = new Set<string>();
    normalizedRestaurants.forEach((r) => r.country && options.add(r.country));
    return Array.from(options).sort();
  }, [normalizedRestaurants]);

  const availableStates = useMemo(() => {
    const options = new Set<string>();
    normalizedRestaurants.forEach((r) => {
      if (country && r.country !== country) return;
      if (r.state) options.add(r.state);
    });
    return Array.from(options).sort();
  }, [normalizedRestaurants, country]);

  const availableCities = useMemo(() => {
    const options = new Set<string>();
    normalizedRestaurants.forEach((r) => {
      if (country && r.country !== country) return;
      if (stateValue && r.state !== stateValue) return;
      if (r.city) options.add(r.city);
    });
    return Array.from(options).sort();
  }, [normalizedRestaurants, country, stateValue]);

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    const options: string[] = [];
    FOOD_CATEGORIES.forEach((c) => {
      const normalized = normalizeCategoryLabel(c);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      options.push(normalized);
    });
    return options.sort((a, b) => a.localeCompare(b));
  }, []);

  useEffect(() => {
    setStateValue("");
    setCity("");
  }, [country]);

  useEffect(() => {
    setCity("");
  }, [stateValue]);

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = nameQuery.trim().toLowerCase();
    const selectedCategory = category.trim().toLowerCase();
    const minimumStars = starsFilter ? Number(starsFilter) : null;

    return normalizedRestaurants.filter((r) => {
      const matchesName = normalizedQuery
          ? String(r.name || "").toLowerCase().includes(normalizedQuery)
          : true;

      const matchesCountry = country ? r.country === country : true;
      const matchesState = stateValue ? r.state === stateValue : true;
      const matchesCity = city ? r.city === city : true;

      const matchesCategory = selectedCategory
          ? getCategoryValues(r).some((value) => value.toLowerCase() === selectedCategory)
          : true;

      const matchesStars =
          minimumStars === null ? true : parseRatingValue(r.starsgiven) >= minimumStars;

      return (
          matchesName &&
          matchesCountry &&
          matchesState &&
          matchesCity &&
          matchesCategory &&
          matchesStars
      );
    });
  }, [normalizedRestaurants, nameQuery, country, stateValue, city, category, starsFilter]);

  // ===========================
  // A) SIGN OUT FIX (no stuck)
  // ===========================
  // Enquanto está checando, mostra "Checking..."
  if (!authReady || !pinCheckReady) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-sm text-white/70">
          Checking access...
        </div>
    );
  }

// Enquanto está checando, mostra "Checking..."
  if (!authReady || !pinCheckReady) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-sm text-white/70">
          Checking access...
        </div>
    );
  }

// Gate pronto e sem acesso => o effect acima vai redirecionar uma vez.
// Aqui só não renderiza a página.
  if (!hasAccess) {
    return null; // ou "Redirecting..."
  }

  return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="mx-auto max-w-6xl py-6 font-sans text-white sm:px-6">
          {/* ✅ HEADER (único, centralizado, Apple-vibe) */}
          <header
              className={[
                "relative flex flex-wrap items-center justify-between gap-4 px-6 py-5",
                "rounded-3xl",
                GLOW_BAR,
                "border border-white/25",
                "backdrop-blur-xl",
                "overflow-hidden",
                GLOW_LINE,
              ].join(" ")}
          >
            {/* brilho interno estilo “vidro” */}
            <div className="pointer-events-none absolute inset-0 opacity-35 bg-gradient-to-b from-white/35 via-white/0 to-black/0" />

            {/* LEFT: logo + título */}
            <div className="relative z-10 flex items-center gap-3.5">
              <img
                  src="/friendly-eats.svg"
                  alt="FriendlyEats logo"
                  className="h-11 w-11 rounded-xl bg-white/90 object-cover"
              />
              <div>
                <div className={`text-2xl font-bold tracking-tight ${TEXT_GLOW}`}>
                  FriendlyEats
                </div>
                <div className={`text-xs text-white/90 ${TEXT_GLOW}`}>
                  Connecting you to places that matter.
                </div>
              </div>
            </div>

            {/* RIGHT: user + signout */}
            <div className="relative z-10 min-w-[220px] text-right">
              <div className="flex justify-end">
                {user?.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={`${user.displayName || user.email || "User"} profile`}
                        className="mb-1.5 h-9 w-9 rounded-full border border-white/60 object-cover"
                    />
                ) : (
                    <div className="mb-1.5 text-sm text-white/90">Guest</div>
                )}
              </div>

              <div className="font-semibold">
                {user?.displayName || user?.email || "Guest"}
              </div>

              {authError && (
                  <div className="mt-1.5 text-xs text-amber-200">{authError}</div>
              )}

              <button
                  type="button"
                  onClick={() => {
                    router.replace("/");
                    queueMicrotask(() => {
                      handleSignOut();
                    });
                  }}
                  className="mt-2 h-11 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-white/15 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
              >
                Sign out
              </button>
            </div>
          </header>

          {/* ✅ FILTERS (agora dentro do container também) */}
          <section className={[
            "relative flex flex-wrap items-center  gap-4 px-6 py-5",
            "rounded-3xl",
            GLOW_BAR,
            "border border-white/25",
            "backdrop-blur-xl",
            "overflow-hidden",
            GLOW_LINE,
          ].join(" ")}>
            <div />
            <div className="relative grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
              <input
                  type="text"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="Search by name"
                  className={GLASS_INPUT}
              />

              <SearchSelect
                  value={country}
                  options={availableCountries}
                  onChange={setCountry}
                  placeholder="All countries"
                  allLabel="All countries"
                  includeAllOption
                  searchPlaceholder="Search country…"
                  getOptionLabel={(opt) => opt}
                  renderValue={(opt) => {
                    const flag = getCountryFlagPng(opt);
                    return (
                        <span className="inline-flex items-center gap-2">
                  {flag ? (
                      <img
                          src={flag.src}
                          alt={flag.alt}
                          className="h-[18px] w-[18px] rounded-[6px] object-cover ring-1 ring-white/20"
                      />
                  ) : (
                      <span aria-hidden="true">🌍</span>
                  )}
                          <span>{opt}</span>
                </span>
                    );
                  }}
                  renderOption={(opt) => {
                    const flag = getCountryFlagPng(opt);
                    return (
                        <span className="inline-flex items-center gap-2">
                  {flag ? (
                      <img
                          src={flag.src}
                          alt={flag.alt}
                          className="h-[18px] w-[18px] rounded-[6px] object-cover ring-1 ring-white/20"
                      />
                  ) : (
                      <span aria-hidden="true">🌍</span>
                  )}
                          <span>{opt}</span>
                </span>
                    );
                  }}
              />

            <SearchSelect
                value={stateValue}
                options={availableStates}
                onChange={setStateValue}
                placeholder="All states"
                allLabel="All states"
                includeAllOption
                searchPlaceholder="Search state…"
                getOptionLabel={(opt) => opt}
                disabled={!availableStates.length}
            />

            <SearchSelect
                value={city}
                options={availableCities}
                onChange={setCity}
                placeholder="All cities"
                allLabel="All cities"
                includeAllOption
                searchPlaceholder="Search city…"
                getOptionLabel={(opt) => opt}
                disabled={!availableCities.length}
            />

            <SearchSelect
                value={category}
                options={availableCategories}
                onChange={setCategory}
                placeholder="All categories"
                allLabel="All categories"
                includeAllOption
                searchPlaceholder="Search category…"
                getOptionLabel={(opt) => opt}
                renderValue={(opt) => (
                    <span className="inline-flex items-center gap-2">
              <span aria-hidden="true">{getCategoryIcon(opt)}</span>
              <span>{opt}</span>
            </span>
                )}
                renderOption={(opt) => (
                    <span className="inline-flex items-center gap-2">
              <span aria-hidden="true">{getCategoryIcon(opt)}</span>
              <span>{opt}</span>
            </span>
                )}
            />

            <SearchSelect
                value={starsFilter}
                options={["1", "2", "3", "4", "5"]}
                onChange={setStarsFilter}
                placeholder="All star ratings"
                allLabel="All star ratings"
                includeAllOption
                searchPlaceholder="Search stars…"
                getOptionLabel={(opt) => `${opt}+ stars`}
            />
          </div>
        </section>

  {/* ✅ RESULTS + CARDS */}
  <section className="mt-6">
    {!loading && error && (
        <p className="whitespace-pre-wrap rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 backdrop-blur-2xl">
          {error}
        </p>
    )}

    {!loading && !error && filteredRestaurants.length === 0 && (
        <p className="rounded-2xl border border-white/14 bg-white/[0.08] px-4 py-3 text-sm text-white/70 backdrop-blur-2xl">
          No restaurants match your filters.
        </p>
    )}

    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
      {filteredRestaurants.map((restaurant) => {
        const ratingValueRaw =
            restaurant.starsgiven ?? restaurant.rating ?? restaurant.grade ?? 0;

        const { rounded, display } = getStarRating(ratingValueRaw);

        const fallbackImage = getFallbackImageForRestaurant(restaurant);

        const photoFromDoc =
            typeof restaurant.photo === "string" && restaurant.photo.trim()
                ? restaurant.photo.trim()
                : "";

        const usablePhoto =
            photoFromDoc &&
            (isExternalUrl(photoFromDoc) || photoFromDoc.startsWith("/"))
                ? photoFromDoc
                : "";

        const cardImageSrc =
            fallbackImage ?? usablePhoto ?? cardImageUrls[restaurant.id];

        return (
            <Link
                key={restaurant.id}
                href={`/restaurantinfopage/${restaurant.id}`}
                className="text-inherit no-underline"
            >
              <article
                  className={[
                    "group relative overflow-hidden rounded-3xl",
                    "border border-white/14 bg-white/[0.08] backdrop-blur-2xl",
                    "shadow-[0_18px_60px_rgba(0,0,0,0.35)]",
                    "transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.11]",
                  ].join(" ")}
              >
                {/* highlight interno (Apple vibe) */}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.18),rgba(255,255,255,0)_40%)]" />

                {cardImageSrc ? (
                    <div className="relative">
                      <img
                          src={cardImageSrc}
                          alt={restaurant.name || "Restaurant"}
                          loading="lazy"
                          decoding="async"
                          className="block h-40 w-full object-cover opacity-95 transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
                    </div>
                ) : (
                    <div aria-hidden="true" className="h-40 w-full bg-white/5" />
                )}

                <div className="relative p-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <h3 className="m-0 text-lg font-semibold leading-tight text-white">
                      {restaurant.name || "Unnamed Restaurant"}
                    </h3>

                    <span
                        aria-label={`Restaurant rating ${display.toFixed(1)} out of 5`}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-white/90"
                    >
                  <span className="inline-flex gap-0.5 text-base">
                    {Array.from({ length: 5 }, (_, index) => (
                        <span
                            key={`star-${restaurant.id}-${index}`}
                            className={
                              index < rounded ? "text-amber-400" : "text-white/20"
                            }
                        >
                        ★
                      </span>
                    ))}
                  </span>

                  <span className="text-xs text-white/70">
                    {display.toFixed(1)}
                  </span>
                </span>
                  </div>

                  <p className="mt-2 text-sm text-white/60">
                    {[restaurant.address, restaurant.street, restaurant.city, restaurant.state]
                        .filter(Boolean)
                        .join(", ") || "Address unavailable."}
                  </p>

                  <div className="mt-2 text-xs text-white/70">
                    <div>
                      {restaurant.city || "Unknown city"}
                      {restaurant.state ? `, ${restaurant.state}` : ""}
                    </div>

                    <div className="mt-1 inline-flex items-center gap-2">
                      {restaurant.country ? (
                          (() => {
                            const flag = getCountryFlagPng(restaurant.country);
                            return (
                                <>
                                  {flag ? (
                                      <img
                                          src={flag.src}
                                          alt={flag.alt}
                                          className="h-[18px] w-[18px] rounded-[6px] object-cover ring-1 ring-white/20"
                                      />
                                  ) : (
                                      <span aria-hidden="true">🌍</span>
                                  )}
                                  <span>{restaurant.country}</span>
                                </>
                            );
                          })()
                      ) : (
                          <>
                            <span aria-hidden="true">🌍</span>
                            <span>Unknown country</span>
                          </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </Link>
        );
      })}
    </div>
  </section>

</div>
      </div>
  );
}
