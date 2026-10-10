/**
 * newyorkfed — typed, zero-dependency client for the Federal Reserve Bank of
 * New York's free Markets Data API (markets.newyorkfed.org): SOFR and the
 * other reference rates, SOFR averages & index, and SOMA holdings.
 *
 * No API key required. Uses the global fetch (Node 18+); injectable for
 * testing via options.
 */

/** Secured (repo-based) reference rates. */
export type SecuredRateType = "sofr" | "bgcr" | "tgcr";
/** Unsecured reference rates. */
export type UnsecuredRateType = "effr" | "obfr";
export type RateType = SecuredRateType | UnsecuredRateType;
/** Any rate, or "sofrai" — the SOFR averages & index series. */
export type SeriesType = RateType | "sofrai";

export interface NewYorkFedOptions {
  /** Custom fetch implementation (testing, proxies). Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Base URL. Defaults to "https://markets.newyorkfed.org". */
  baseUrl?: string;
  /** Abort the request after this many milliseconds (no timeout by default). */
  timeoutMs?: number;
  /** AbortSignal to cancel the request. */
  signal?: AbortSignal;
}

/**
 * One reference-rate observation. Rates are percents (3.53 = 3.53%).
 * Percentile fields are present for daily rates; average/index fields for
 * the SOFR averages series. Numeric fields the NY Fed publishes as "NA"
 * (e.g. SOFR percentiles on 2019-05-31 and 2021-08-05) are omitted rather
 * than passed through as strings.
 */
export interface RefRate {
  effectiveDate: string; // "2026-07-09"
  type: string; // "SOFR", "EFFR", "SOFRAI", …
  percentRate?: number;
  percentPercentile1?: number;
  percentPercentile25?: number;
  percentPercentile75?: number;
  percentPercentile99?: number;
  volumeInBillions?: number;
  /** EFFR only: FOMC target range (targetRateTo absent before Dec 2008). */
  targetRateFrom?: number;
  targetRateTo?: number;
  /** EFFR only, pre-March 2016 methodology. */
  intraDayLow?: number;
  intraDayHigh?: number;
  stdDeviation?: number;
  average30day?: number;
  average90day?: number;
  average180day?: number;
  index?: number;
  /** "" normally; "r" when the published value was revised. */
  revisionIndicator?: string;
  /** Present when the NY Fed attached a footnote to the observation. */
  footnoteId?: number;
  [field: string]: string | number | undefined;
}

/** Repo / reverse repo operation kind, as used in the API path. */
export type RepoKind = "repo" | "reverserepo" | "all";

/** One repo or reverse repo (RRP) operation result. Amounts are dollars. */
export interface RepoOperation {
  operationId: string; // "RP 100926 25"
  auctionStatus: string;
  operationDate: string;
  settlementDate: string;
  maturityDate: string;
  operationType: string; // "Repo" | "Reverse Repo"
  operationMethod: string;
  settlementType: string;
  termCalenderDays: number; // sic — the API's spelling
  term: string;
  totalAmtSubmitted?: number;
  totalAmtAccepted?: number;
  participatingCpty?: number;
  acceptedCpty?: number;
  details?: Array<{
    securityType: string;
    amtSubmitted?: number;
    amtAccepted?: number;
    percentOfferingRate?: number;
    percentAwardRate?: number;
    [field: string]: string | number | undefined;
  }>;
  [field: string]: unknown;
}

/** One row of the SOMA (System Open Market Account) summary. */
export interface SomaSummaryRow {
  asOfDate: string;
  total: string;
  [field: string]: string | undefined;
}

/**
 * Thrown for non-2xx responses and for 2xx responses whose body isn't JSON
 * of the expected shape (e.g. a maintenance page).
 */
export class NewYorkFedError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string, message?: string) {
    super(message ?? `NY Fed request failed with HTTP ${status}: ${url}`);
    this.name = "NewYorkFedError";
    this.status = status;
    this.url = url;
  }
}

const DEFAULT_BASE = "https://markets.newyorkfed.org";
const SECURED = new Set<string>(["sofr", "bgcr", "tgcr", "sofrai"]);
const UNSECURED = new Set<string>(["effr", "obfr"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function groupFor(type: string): "secured" | "unsecured" {
  const t = type.toLowerCase();
  if (SECURED.has(t)) return "secured";
  if (UNSECURED.has(t)) return "unsecured";
  throw new RangeError(
    `Unknown rate type "${type}" (expected sofr, bgcr, tgcr, effr, obfr, or sofrai)`,
  );
}

function signalFor(opts: NewYorkFedOptions): AbortSignal | undefined {
  const { signal, timeoutMs } = opts;
  if (timeoutMs === undefined) return signal;
  if (!(timeoutMs > 0)) throw new RangeError(`timeoutMs must be > 0, got ${timeoutMs}`);
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeout;
  // AbortSignal.any is Node 20+; combine by hand for Node 18.
  const ctrl = new AbortController();
  const abort = (s: AbortSignal) => () => ctrl.abort(s.reason);
  if (signal.aborted) ctrl.abort(signal.reason);
  signal.addEventListener("abort", abort(signal), { once: true });
  timeout.addEventListener("abort", abort(timeout), { once: true });
  return ctrl.signal;
}

async function request<T>(path: string, opts: NewYorkFedOptions): Promise<T> {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const url = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, "") + path;
  const res = await doFetch(url, {
    headers: { accept: "application/json" },
    signal: signalFor(opts),
  });
  if (!res.ok) throw new NewYorkFedError(res.status, url);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new NewYorkFedError(
      res.status,
      url,
      `NY Fed returned a non-JSON response (HTTP ${res.status}): ${url}`,
    );
  }
}

/** Unwrap `body[key1][key2]`, throwing NewYorkFedError if the shape is wrong. */
function unwrap<T>(body: unknown, path: string, keys: string[]): T {
  let cur: unknown = body;
  for (const k of keys) {
    if (cur === null || typeof cur !== "object" || !(k in cur)) {
      throw new NewYorkFedError(200, path, `Unexpected NY Fed response shape (missing "${keys.join(".")}"): ${path}`);
    }
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur as T;
}

const NUMERIC_PREFIX = /^(percent|volume|targetRate|intraDay|stdDeviation|average|index$|footnoteId$)/;

/** Coerce numeric fields that arrive as strings ("NA", "3.5") — drop the unparseable ones. */
function normalizeRate(r: RefRate): RefRate {
  const out: RefRate = { ...r };
  for (const [k, v] of Object.entries(r)) {
    if (typeof v !== "string" || !NUMERIC_PREFIX.test(k)) continue;
    const n = v.trim() === "" ? NaN : Number(v);
    if (Number.isFinite(n)) out[k] = n;
    else delete out[k];
  }
  return out;
}

async function rates(path: string, opts: NewYorkFedOptions): Promise<RefRate[]> {
  const body = await request<unknown>(path, opts);
  return unwrap<RefRate[]>(body, path, ["refRates"]).map(normalizeRate);
}

/** The API's `last/{n}` endpoints accept 1–999 (1000+ returns HTTP 400). */
function checkN(n: number): void {
  if (!Number.isInteger(n) || n <= 0 || n > 999) {
    throw new RangeError(`n must be an integer in 1–999, got ${n}`);
  }
}

function checkDate(d: string, label: string): void {
  const ok =
    typeof d === "string" &&
    ISO_DATE_RE.test(d) &&
    new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
  if (!ok) {
    throw new RangeError(`Invalid ${label}: "${d}" (expected a real YYYY-MM-DD date)`);
  }
}

/**
 * The latest published value of every reference rate (SOFR, EFFR, OBFR,
 * BGCR, TGCR and the SOFR averages, `type: "SOFRAI"`).
 */
export function latestRates(opts: NewYorkFedOptions = {}): Promise<RefRate[]> {
  return rates("/api/rates/all/latest.json", opts);
}

/**
 * The last `n` (1–999) observations of one rate, newest first.
 *
 * ```ts
 * const [today] = await lastRates("sofr", 1);
 * today.percentRate;      // 3.53
 * today.volumeInBillions; // 3126
 * ```
 */
export async function lastRates(
  type: SeriesType,
  n = 1,
  opts: NewYorkFedOptions = {},
): Promise<RefRate[]> {
  checkN(n);
  const group = groupFor(type);
  return rates(`/api/rates/${group}/${type.toLowerCase()}/last/${n}.json`, opts);
}

/**
 * Observations of one rate over an inclusive date range, newest first.
 * Throws RangeError for impossible dates or startDate after endDate.
 *
 * ```ts
 * await searchRates("sofr", { startDate: "2026-07-01", endDate: "2026-07-09" });
 * ```
 */
export async function searchRates(
  type: SeriesType,
  range: { startDate: string; endDate: string },
  opts: NewYorkFedOptions = {},
): Promise<RefRate[]> {
  checkDate(range.startDate, "startDate");
  checkDate(range.endDate, "endDate");
  if (range.startDate > range.endDate) {
    throw new RangeError(`startDate ${range.startDate} is after endDate ${range.endDate}`);
  }
  const group = groupFor(type);
  return rates(
    `/api/rates/${group}/${type.toLowerCase()}/search.json?startDate=${range.startDate}&endDate=${range.endDate}`,
    opts,
  );
}

/**
 * The last `n` (1–999) observations of the SOFR averages (30/90/180-day)
 * and index, newest first.
 */
export async function sofrAverages(n = 1, opts: NewYorkFedOptions = {}): Promise<RefRate[]> {
  return lastRates("sofrai", n, opts);
}

/**
 * The SOMA holdings summary time series, oldest first. Values are strings
 * of dollars exactly as published ("" where an asset class didn't exist yet,
 * e.g. `frn` before 2014).
 */
export async function somaSummary(opts: NewYorkFedOptions = {}): Promise<SomaSummaryRow[]> {
  const path = "/api/soma/summary.json";
  return unwrap<SomaSummaryRow[]>(await request<unknown>(path, opts), path, ["soma", "summary"]);
}

/**
 * The last `n` (1–999) repo and/or reverse repo (RRP) operation results,
 * newest first.
 *
 * ```ts
 * const [rrp] = await repoOperations("reverserepo", 1);
 * rrp.totalAmtAccepted; // dollars
 * ```
 */
export async function repoOperations(
  kind: RepoKind = "all",
  n = 1,
  opts: NewYorkFedOptions = {},
): Promise<RepoOperation[]> {
  if (kind !== "repo" && kind !== "reverserepo" && kind !== "all") {
    throw new RangeError(`Unknown repo kind "${kind}" (expected repo, reverserepo, or all)`);
  }
  checkN(n);
  const path = `/api/rp/${kind}/all/results/last/${n}.json`;
  return unwrap<RepoOperation[]>(await request<unknown>(path, opts), path, ["repo", "operations"]);
}

/**
 * Escape hatch for the rest of the Markets Data API (Treasury operations,
 * repo operations, primary dealer statistics, FX swaps, securities lending,
 * AMBS): fetch any documented path and get the parsed JSON.
 *
 * ```ts
 * await raw("/api/tsy/all/results/summary/last/5.json");
 * ```
 */
export function raw<T = unknown>(path: string, opts: NewYorkFedOptions = {}): Promise<T> {
  if (!path.startsWith("/api/")) {
    throw new RangeError(`path must start with "/api/", got "${path}"`);
  }
  return request<T>(path, opts);
}
