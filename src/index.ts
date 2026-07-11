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

export interface NewYorkFedOptions {
  /** Custom fetch implementation (testing, proxies). Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Base URL. Defaults to "https://markets.newyorkfed.org". */
  baseUrl?: string;
}

/**
 * One reference-rate observation. Rates are percents (3.53 = 3.53%).
 * Percentile fields are present for daily rates; average/index fields for
 * the SOFR averages series.
 */
export interface RefRate {
  effectiveDate: string; // "2026-07-09"
  type: string; // "SOFR", "EFFR", …
  percentRate?: number;
  percentPercentile1?: number;
  percentPercentile25?: number;
  percentPercentile75?: number;
  percentPercentile99?: number;
  volumeInBillions?: number;
  average30day?: number;
  average90day?: number;
  average180day?: number;
  index?: number;
  revisionIndicator?: string;
  [field: string]: string | number | undefined;
}

/** One row of the SOMA (System Open Market Account) summary. */
export interface SomaSummaryRow {
  asOfDate: string;
  total: string;
  [field: string]: string | undefined;
}

export class NewYorkFedError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string) {
    super(`NY Fed request failed with HTTP ${status}: ${url}`);
    this.name = "NewYorkFedError";
    this.status = status;
    this.url = url;
  }
}

const DEFAULT_BASE = "https://markets.newyorkfed.org";
const SECURED = new Set<string>(["sofr", "bgcr", "tgcr"]);
const UNSECURED = new Set<string>(["effr", "obfr"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function groupFor(type: string): "secured" | "unsecured" {
  const t = type.toLowerCase();
  if (SECURED.has(t)) return "secured";
  if (UNSECURED.has(t)) return "unsecured";
  throw new RangeError(
    `Unknown rate type "${type}" (expected sofr, bgcr, tgcr, effr, or obfr)`,
  );
}

async function request<T>(path: string, opts: NewYorkFedOptions): Promise<T> {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const url = (opts.baseUrl ?? DEFAULT_BASE) + path;
  const res = await doFetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new NewYorkFedError(res.status, url);
  return (await res.json()) as T;
}

function checkN(n: number): void {
  if (!Number.isInteger(n) || n <= 0 || n > 500) {
    throw new RangeError(`n must be an integer in 1–500, got ${n}`);
  }
}

function checkDate(d: string, label: string): void {
  if (!ISO_DATE_RE.test(d)) {
    throw new RangeError(`Invalid ${label}: "${d}" (expected YYYY-MM-DD)`);
  }
}

/**
 * The latest published value of every reference rate (SOFR, EFFR, OBFR,
 * BGCR, TGCR and the SOFR averages).
 */
export async function latestRates(opts: NewYorkFedOptions = {}): Promise<RefRate[]> {
  const res = await request<{ refRates: RefRate[] }>("/api/rates/all/latest.json", opts);
  return res.refRates;
}

/**
 * The last `n` observations of one rate.
 *
 * ```ts
 * const [today] = await lastRates("sofr", 1);
 * today.percentRate;      // 3.53
 * today.volumeInBillions; // 3126
 * ```
 */
export async function lastRates(
  type: RateType,
  n = 1,
  opts: NewYorkFedOptions = {},
): Promise<RefRate[]> {
  checkN(n);
  const group = groupFor(type);
  const res = await request<{ refRates: RefRate[] }>(
    `/api/rates/${group}/${type.toLowerCase()}/last/${n}.json`,
    opts,
  );
  return res.refRates;
}

/**
 * Observations of one rate over an inclusive date range.
 *
 * ```ts
 * await searchRates("sofr", { startDate: "2026-07-01", endDate: "2026-07-09" });
 * ```
 */
export async function searchRates(
  type: RateType,
  range: { startDate: string; endDate: string },
  opts: NewYorkFedOptions = {},
): Promise<RefRate[]> {
  checkDate(range.startDate, "startDate");
  checkDate(range.endDate, "endDate");
  const group = groupFor(type);
  const res = await request<{ refRates: RefRate[] }>(
    `/api/rates/${group}/${type.toLowerCase()}/search.json?startDate=${range.startDate}&endDate=${range.endDate}`,
    opts,
  );
  return res.refRates;
}

/**
 * The last `n` observations of the SOFR averages (30/90/180-day) and index.
 */
export async function sofrAverages(n = 1, opts: NewYorkFedOptions = {}): Promise<RefRate[]> {
  checkN(n);
  const res = await request<{ refRates: RefRate[] }>(
    `/api/rates/secured/sofrai/last/${n}.json`,
    opts,
  );
  return res.refRates;
}

/** The SOMA holdings summary time series (as-of dates with totals by asset class). */
export async function somaSummary(opts: NewYorkFedOptions = {}): Promise<SomaSummaryRow[]> {
  const res = await request<{ soma: { summary: SomaSummaryRow[] } }>("/api/soma/summary.json", opts);
  return res.soma.summary;
}

/**
 * Escape hatch for the rest of the Markets Data API (Treasury operations,
 * repo operations, primary dealer statistics, FX swaps, securities lending,
 * AMBS): fetch any documented path and get the parsed JSON.
 *
 * ```ts
 * await raw("/api/rp/results/latest/all.json");
 * ```
 */
export function raw<T = unknown>(path: string, opts: NewYorkFedOptions = {}): Promise<T> {
  if (!path.startsWith("/api/")) {
    throw new RangeError(`path must start with "/api/", got "${path}"`);
  }
  return request<T>(path, opts);
}
