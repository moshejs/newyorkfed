import { describe, expect, it, vi } from "vitest";
import {
  NewYorkFedError,
  lastRates,
  latestRates,
  raw,
  repoOperations,
  searchRates,
  sofrAverages,
  somaSummary,
} from "../src/index.js";
import { effrRevised, latest, repoLast2, sofrNA } from "./fixtures.js";

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  })) as unknown as typeof fetch;
}

function calledUrl(f: unknown): string {
  return (f as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
}

const RATES = { refRates: [{ effectiveDate: "2026-07-09", type: "SOFR", percentRate: 3.53 }] };

describe("URL construction and routing", () => {
  it("latestRates hits /api/rates/all/latest.json", async () => {
    const f = mockFetch(RATES);
    await latestRates({ fetch: f });
    expect(calledUrl(f)).toBe("https://markets.newyorkfed.org/api/rates/all/latest.json");
  });

  it("routes secured rates to /secured/", async () => {
    const f = mockFetch(RATES);
    await lastRates("sofr", 5, { fetch: f });
    expect(calledUrl(f)).toBe("https://markets.newyorkfed.org/api/rates/secured/sofr/last/5.json");
  });

  it("routes unsecured rates to /unsecured/", async () => {
    const f = mockFetch(RATES);
    await lastRates("effr", 1, { fetch: f });
    expect(calledUrl(f)).toBe("https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json");
  });

  it("searchRates builds the date-range query", async () => {
    const f = mockFetch(RATES);
    await searchRates("tgcr", { startDate: "2026-07-01", endDate: "2026-07-09" }, { fetch: f });
    expect(calledUrl(f)).toBe(
      "https://markets.newyorkfed.org/api/rates/secured/tgcr/search.json?startDate=2026-07-01&endDate=2026-07-09",
    );
  });

  it("sofrAverages hits the sofrai series", async () => {
    const f = mockFetch(RATES);
    await sofrAverages(3, { fetch: f });
    expect(calledUrl(f)).toBe("https://markets.newyorkfed.org/api/rates/secured/sofrai/last/3.json");
  });

  it("somaSummary unwraps soma.summary", async () => {
    const f = mockFetch({ soma: { summary: [{ asOfDate: "2026-07-08", total: "1" }] } });
    const rows = await somaSummary({ fetch: f });
    expect(calledUrl(f)).toBe("https://markets.newyorkfed.org/api/soma/summary.json");
    expect(rows[0]!.asOfDate).toBe("2026-07-08");
  });

  it("raw passes any /api/ path through and honors baseUrl", async () => {
    const f = mockFetch({ ok: 1 });
    await raw("/api/rp/results/latest/all.json", { fetch: f, baseUrl: "https://proxy.local" });
    expect(calledUrl(f)).toBe("https://proxy.local/api/rp/results/latest/all.json");
  });
});

describe("responses and errors", () => {
  it("unwraps refRates", async () => {
    const f = mockFetch(RATES);
    const rates = await lastRates("sofr", 1, { fetch: f });
    expect(rates).toHaveLength(1);
    expect(rates[0]!.percentRate).toBe(3.53);
  });

  it("throws NewYorkFedError with status on non-2xx", async () => {
    const f = mockFetch("nope", 429);
    await expect(latestRates({ fetch: f })).rejects.toMatchObject({
      name: "NewYorkFedError",
      status: 429,
    });
    await expect(latestRates({ fetch: f })).rejects.toBeInstanceOf(NewYorkFedError);
  });
});

describe("validation", () => {
  const f = mockFetch(RATES);

  it("rejects unknown rate types", async () => {
    await expect(lastRates("libor" as never, 1, { fetch: f })).rejects.toThrow(/Unknown rate type/);
  });

  it("rejects bad n and dates and non-API paths", async () => {
    await expect(lastRates("sofr", 0, { fetch: f })).rejects.toThrow(RangeError);
    await expect(lastRates("sofr", 2.5, { fetch: f })).rejects.toThrow(RangeError);
    await expect(sofrAverages(1000, { fetch: f })).rejects.toThrow(RangeError);
    await expect(
      searchRates("sofr", { startDate: "07/01/2026", endDate: "2026-07-09" }, { fetch: f }),
    ).rejects.toThrow(RangeError);
    expect(() => raw("api/soma/summary.json", { fetch: f })).toThrow(RangeError);
  });
});

describe("live-response fixtures", () => {
  it('drops "NA" percentiles instead of returning strings typed as numbers', async () => {
    const rates = await lastRates("sofr", 3, { fetch: mockFetch(sofrNA) });
    const na = rates.find((r) => r.effectiveDate === "2021-08-05")!;
    expect(na.percentRate).toBe(0.05);
    expect(na.percentPercentile1).toBeUndefined();
    expect("percentPercentile99" in na).toBe(false);
    expect(na.footnoteId).toBe(2);
    for (const r of rates) {
      for (const k of ["percentRate", "percentPercentile1", "volumeInBillions"]) {
        if (r[k] !== undefined) expect(typeof r[k]).toBe("number");
      }
    }
    expect(rates[0]!.percentPercentile99).toBe(0.15);
  });

  it("passes revision indicators and EFFR target range through", async () => {
    const [a, b] = await lastRates("effr", 2, { fetch: mockFetch(effrRevised) });
    expect(a!.revisionIndicator).toBe("r");
    expect(a!.targetRateFrom).toBe(0.75);
    expect(a!.targetRateTo).toBe(1);
    expect(b!.intraDayHigh).toBeTypeOf("number");
  });

  it("latestRates includes the SOFRAI averages row", async () => {
    const rows = await latestRates({ fetch: mockFetch(latest) });
    expect(rows.map((r) => r.type).sort()).toEqual(["BGCR", "EFFR", "OBFR", "SOFR", "SOFRAI", "TGCR"]);
    expect(rows.find((r) => r.type === "SOFRAI")!.index).toBeTypeOf("number");
  });

  it("repoOperations hits the documented path and unwraps repo.operations", async () => {
    const f = mockFetch(repoLast2);
    const ops = await repoOperations("all", 2, { fetch: f });
    expect(calledUrl(f)).toBe("https://markets.newyorkfed.org/api/rp/all/all/results/last/2.json");
    expect(ops).toHaveLength(2);
    expect(ops[0]!.operationId).toMatch(/^RP /);
    const g = mockFetch(repoLast2);
    await repoOperations("reverserepo", 5, { fetch: g });
    expect(calledUrl(g)).toBe("https://markets.newyorkfed.org/api/rp/reverserepo/all/results/last/5.json");
    await expect(repoOperations("rrp" as never, 1, { fetch: g })).rejects.toThrow(RangeError);
  });
});

describe("hardening", () => {
  it("wraps non-JSON 200 bodies in NewYorkFedError", async () => {
    const f = mockFetch("<html>Down for maintenance</html>");
    await expect(latestRates({ fetch: f })).rejects.toMatchObject({
      name: "NewYorkFedError",
      message: expect.stringMatching(/non-JSON/),
    });
  });

  it("wraps unexpected JSON shapes in NewYorkFedError", async () => {
    await expect(lastRates("sofr", 1, { fetch: mockFetch({ error: "x" }) })).rejects.toThrow(
      /missing "refRates"/,
    );
    await expect(somaSummary({ fetch: mockFetch({ soma: {} }) })).rejects.toBeInstanceOf(NewYorkFedError);
  });

  it("accepts n up to 999 (the API's limit) and searches sofrai", async () => {
    const f = mockFetch(RATES);
    await lastRates("sofr", 999, { fetch: f });
    expect(calledUrl(f)).toMatch(/last\/999\.json$/);
    await expect(lastRates("sofr", 1000, { fetch: f })).rejects.toThrow(RangeError);
    const g = mockFetch(RATES);
    await searchRates("sofrai", { startDate: "2026-07-01", endDate: "2026-07-03" }, { fetch: g });
    expect(calledUrl(g)).toContain("/api/rates/secured/sofrai/search.json?");
  });

  it("rejects impossible dates and reversed ranges", async () => {
    const f = mockFetch(RATES);
    await expect(
      searchRates("sofr", { startDate: "2026-02-30", endDate: "2026-03-01" }, { fetch: f }),
    ).rejects.toThrow(RangeError);
    await expect(
      searchRates("sofr", { startDate: "2026-07-09", endDate: "2026-07-01" }, { fetch: f }),
    ).rejects.toThrow(/after endDate/);
    await expect(
      searchRates("sofr", { startDate: "2024-02-29", endDate: "2024-03-01" }, { fetch: f }),
    ).resolves.toBeDefined();
  });

  it("passes an abort signal and honors timeoutMs; trims baseUrl slash", async () => {
    const f = mockFetch(RATES);
    await latestRates({ fetch: f, timeoutMs: 5000, baseUrl: "https://proxy.local/" });
    const call = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("https://proxy.local/api/rates/all/latest.json");
    expect((call[1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    await expect(latestRates({ fetch: f, timeoutMs: 0 })).rejects.toThrow(RangeError);

    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
        }),
    ) as unknown as typeof fetch;
    await expect(latestRates({ fetch: hang, timeoutMs: 20 })).rejects.toMatchObject({
      name: "TimeoutError",
    });
    const ctrl = new AbortController();
    const p = latestRates({ fetch: hang, timeoutMs: 10_000, signal: ctrl.signal });
    ctrl.abort(new Error("cancelled"));
    await expect(p).rejects.toThrow("cancelled");
  });
});
