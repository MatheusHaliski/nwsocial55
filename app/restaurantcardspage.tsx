"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from "firebase/firestore";

import { firebaseApp, hasFirebaseConfig } from "./firebaseClient";
import { useAuthGate } from "./useAuthGate";

// ============================
// ✅ Microsoft / Apple / LinkedIn tokens
// ============================
const PAGE_BG = "bg-[#f6f7fb]"; // Microsoft-ish surface
const CARD =
  "rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.06)]";
const CARD_SOLID =
  "rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]";
const HEADER =
  "rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.06)]";
const INPUT =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60";
const PILL =
  "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm";
const BTN =
  "inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60";
const BTN_PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60";
const DROPDOWN =
  "absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl";
const DROPDOWN_ITEM =
  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-slate-900 transition hover:bg-slate-50";

const db = firebaseApp ? getFirestore(firebaseApp) : null;

// ============================
// ✅ Schema real do seu Firestore
// ============================
type Employee = {
  id: string;

  cargo?: string;
  celular?: string;
  displayName?: string;
  email?: string;
  favorito?: boolean;
  funcao?: string;
  nome?: string;
  projetos?: string;
  ramal?: string;
  regional?: string;
  uuid?: string;
};

// --------------------
// Helpers
// --------------------
function readCookie(name: string) {
  const v = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
  return v ?? null;
}

function normalizeKey(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "F";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

// ============================
// Firestore path:
// installids/{installId}/employees
// ============================
async function getEmployees(installId: string) {
  if (!db) throw new Error("Firestore not initialized");
  if (!installId) throw new Error("Missing installId");

  const colRef = collection(db, "installids", installId, "employees");
  const q = query(colRef, orderBy("nome", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Employee[];
}

// --------------------
// SearchSelect (same tags)
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

  includeAllOption?: boolean;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputId = useId();

  const hasValue = Boolean(value);
  const buttonLabel = hasValue ? getOptionLabel(value) : allLabel ?? placeholder;

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return options;
    return options.filter((opt) => getOptionLabel(opt).toLowerCase().includes(k));
  }, [options, q, getOptionLabel]);

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
        className={`${BTN} w-full justify-between ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {buttonLabel}
        </span>
        <span className="text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div role="listbox" className={DROPDOWN}>
          <div className="border-b border-slate-200 p-2.5">
            <input
              id={searchInputId}
              data-searchselect="1"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className={INPUT}
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
                className={`${DROPDOWN_ITEM} ${!value ? "bg-slate-50" : ""}`}
              >
                {allLabel ?? placeholder}
              </button>
            ) : null}

            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-slate-500">No matches.</div>
            ) : (
              filtered.map((opt) => {
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
                    className={`${DROPDOWN_ITEM} ${selected ? "bg-slate-50" : ""}`}
                  >
                    <span className="truncate">{getOptionLabel(opt)}</span>
                    {selected ? <span className="text-slate-600">✓</span> : null}
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [nameQuery, setNameQuery] = useState("");
  const [cargo, setCargo] = useState("");
  const [funcao, setFuncao] = useState("");
  const [regional, setRegional] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const router = useRouter();
  const { user, authReady, authError, hasAccess, handleSignOut, pinCheckReady } =
    useAuthGate();

  // ✅ installId via cookie (ou fixe aqui se quiser)
  const installId = useMemo(() => {
    return readCookie("3436985B-C01A-4318-9345-9C92316F3101") || "";
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        if (!hasFirebaseConfig) {
          setError(
            "Firebase config is missing. Check .env.local (NEXT_PUBLIC_FIREBASE_*) and restart `npm run dev`."
          );
          return;
        }

        if (!installId) {
          setError(
            "Missing installId cookie. Set cookie `installId=<DOC_ID>` from installids/{installId}."
          );
          return;
        }

        const items = await getEmployees(installId);
        if (isMounted) setEmployees(items);
      } catch (e: any) {
        console.error("[EmployeesPage] load failed:", e);
        setError(e?.message ? String(e.message) : "Failed to load employees.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (hasAccess) load();

    return () => {
      isMounted = false;
    };
  }, [hasAccess, installId]);

  if (!authReady || !pinCheckReady) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${PAGE_BG} px-6 text-sm text-slate-600`}>
        Checking access...
      </div>
    );
  }
  if (!hasAccess) return null;

  const normalized = useMemo(() => {
    return employees.map((e) => {
      const name = safeStr(e.nome) || safeStr(e.displayName) || "";
      return {
        ...e,
        _name: name,
        _cargo: safeStr(e.cargo),
        _funcao: safeStr(e.funcao),
        _regional: safeStr(e.regional),
        _email: safeStr(e.email),
        _celular: safeStr(e.celular),
        _ramal: safeStr(e.ramal),
        _projetos: safeStr(e.projetos),
        _fav: Boolean(e.favorito),
      };
    });
  }, [employees]);

  const availableCargos = useMemo(() => {
    const s = new Set<string>();
    normalized.forEach((e) => e._cargo && s.add(e._cargo));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [normalized]);

  const availableFuncoes = useMemo(() => {
    const s = new Set<string>();
    normalized.forEach((e) => e._funcao && s.add(e._funcao));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [normalized]);

  const availableRegionais = useMemo(() => {
    const s = new Set<string>();
    normalized.forEach((e) => e._regional && s.add(e._regional));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [normalized]);

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    const cargoKey = normalizeKey(cargo);
    const funcaoKey = normalizeKey(funcao);
    const regionalKey = normalizeKey(regional);

    return normalized
      .filter((e) => {
        const matchesName = q ? e._name.toLowerCase().includes(q) : true;
        const matchesCargo = cargoKey ? normalizeKey(e._cargo) === cargoKey : true;
        const matchesFuncao = funcaoKey ? normalizeKey(e._funcao) === funcaoKey : true;
        const matchesRegional = regionalKey ? normalizeKey(e._regional) === regionalKey : true;
        const matchesFav = onlyFavorites ? e._fav : true;
        return matchesName && matchesCargo && matchesFuncao && matchesRegional && matchesFav;
      })
      .sort((a, b) => (b._fav ? 1 : 0) - (a._fav ? 1 : 0) || a._name.localeCompare(b._name));
  }, [normalized, nameQuery, cargo, funcao, regional, onlyFavorites]);

  const total = normalized.length;
  const shown = filtered.length;
  const favCount = normalized.filter((e) => e._fav).length;

  return (
    <div className={`min-h-screen w-full ${PAGE_BG}`}>
      <div className="mx-auto max-w-6xl px-4 py-7 font-sans text-slate-900 sm:px-6">
        {/* ✅ Top header: Apple/Microsoft clean */}
        <header className={`${HEADER} px-6 py-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[240px]">
              <div className="text-2xl font-semibold tracking-tight">Employees</div>
              <div className="mt-1 text-sm text-slate-600">
                Directory • Search, filter, and view contact details
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className={PILL}>
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-slate-900">{total}</span>
                </span>
                <span className={PILL}>
                  <span className="text-slate-500">Showing</span>
                  <span className="font-bold text-slate-900">{shown}</span>
                </span>
                <span className={PILL}>
                  <span className="text-slate-500">Favorites</span>
                  <span className="font-bold text-slate-900">{favCount}</span>
                </span>
              </div>
            </div>

            {/* right: user */}
            <div className="min-w-[240px] text-right">
              <div className="flex justify-end">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={`${user.displayName || user.email || "User"} profile`}
                    className="h-10 w-10 rounded-2xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600">
                    {initialsFromName(String(user?.displayName || user?.email || "U"))}
                  </div>
                )}
              </div>

              <div className="mt-2 font-semibold">
                {user?.displayName || user?.email || "Guest"}
              </div>

              {authError && <div className="mt-1 text-xs text-amber-700">{authError}</div>}

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    router.replace("/");
                    queueMicrotask(() => handleSignOut());
                  }}
                  className={BTN}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* subtle divider */}
          <div className="mt-5 h-px w-full bg-slate-200/70" />

          {/* ✅ Filters bar: LinkedIn-style */}
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Search by name…"
              className={INPUT}
            />

            <SearchSelect
              value={cargo}
              options={availableCargos}
              onChange={setCargo}
              placeholder="All cargos"
              allLabel="All cargos"
              includeAllOption
              searchPlaceholder="Search cargo…"
              getOptionLabel={(opt) => opt}
              disabled={!availableCargos.length}
            />

            <SearchSelect
              value={funcao}
              options={availableFuncoes}
              onChange={setFuncao}
              placeholder="All functions"
              allLabel="All functions"
              includeAllOption
              searchPlaceholder="Search function…"
              getOptionLabel={(opt) => opt}
              disabled={!availableFuncoes.length}
            />

            <SearchSelect
              value={regional}
              options={availableRegionais}
              onChange={setRegional}
              placeholder="All regionals"
              allLabel="All regionals"
              includeAllOption
              searchPlaceholder="Search regional…"
              getOptionLabel={(opt) => opt}
              disabled={!availableRegionais.length}
            />

            <button
              type="button"
              onClick={() => setOnlyFavorites((v) => !v)}
              className={`${BTN} justify-center`}
              aria-pressed={onlyFavorites}
            >
              {onlyFavorites ? "★ Favorites" : "☆ Favorites"}
            </button>

            <button
              type="button"
              onClick={() => {
                setNameQuery("");
                setCargo("");
                setFuncao("");
                setRegional("");
                setOnlyFavorites(false);
              }}
              className={BTN_PRIMARY}
            >
              Clear
            </button>
          </div>
        </header>

        {/* ✅ Content */}
        <section className="mt-6">
          {loading && (
            <div className={`${CARD_SOLID} px-5 py-4 text-sm text-slate-600`}>
              Loading employees…
            </div>
          )}

          {!loading && error && (
            <div className="whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className={`${CARD_SOLID} px-5 py-4 text-sm text-slate-600`}>
              No employees match your filters.
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {filtered.map((emp) => {
              const name = emp._name || "Sem nome";
              const titleLine =
                [emp._cargo, emp._funcao].filter(Boolean).join(" • ") || "—";

              const hasContacts = Boolean(emp._email || emp._celular || emp._ramal);
              const metaLine = [emp._regional ? `📍 ${emp._regional}` : ""]
                .filter(Boolean)
                .join(" ");

              return (
                <article
                  key={emp.id}
                  className={`${CARD} group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:bg-white`}
                >
                  {/* top accent (subtle, Apple-ish) */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent" />

                  {/* header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-slate-900">
                          {name}
                        </h3>

                        {emp._fav ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                            ★ Favorite
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 truncate text-sm text-slate-600">
                        {titleLine}
                      </div>

                      {metaLine ? (
                        <div className="mt-1 text-xs text-slate-500">{metaLine}</div>
                      ) : (
                        <div className="mt-1 text-xs text-slate-500">&nbsp;</div>
                      )}
                    </div>

                    {/* avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-extrabold text-slate-600 shadow-sm">
                      {initialsFromName(name)}
                    </div>
                  </div>

                  {/* projects */}
                  {emp._projetos ? (
                    <div className="mt-3 line-clamp-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">Projetos:</span>{" "}
                      {emp._projetos}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-transparent px-3 py-2 text-sm text-slate-400">
                      {/* spacer keeps cards aligned */}
                      &nbsp;
                    </div>
                  )}

                  {/* contacts */}
                  {hasContacts ? (
                    <div className="mt-3 space-y-1.5 text-sm text-slate-700">
                      {emp._email ? (
                        <div className="truncate">
                          <span className="font-semibold text-slate-900">Email:</span>{" "}
                          <span className="text-slate-600">{emp._email}</span>
                        </div>
                      ) : null}
                      {emp._celular ? (
                        <div className="truncate">
                          <span className="font-semibold text-slate-900">Celular:</span>{" "}
                          <span className="text-slate-600">{emp._celular}</span>
                        </div>
                      ) : null}
                      {emp._ramal ? (
                        <div className="truncate">
                          <span className="font-semibold text-slate-900">Ramal:</span>{" "}
                          <span className="text-slate-600">{emp._ramal}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-slate-400">No contact details.</div>
                  )}

                  {/* footer */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-3 text-[11px] text-slate-400">
                    <span className="truncate">uuid: {emp.uuid || emp.id}</span>

                    <span className="opacity-0 transition group-hover:opacity-100">
                      View
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
