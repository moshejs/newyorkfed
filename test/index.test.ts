import { describe, expect, it, vi } from "vitest";
import {
  NewYorkFedError,
  lastRates,
  latestRates,
  raw,
  searchRates,
  sofrAverages,
  somaSummary,
} from "../src/index.js";

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
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
    await expect(sofrAverages(501, { fetch: f })).rejects.toThrow(RangeError);
    await expect(
      searchRates("sofr", { startDate: "07/01/2026", endDate: "2026-07-09" }, { fetch: f }),
    ).rejects.toThrow(RangeError);
    expect(() => raw("api/soma/summary.json", { fetch: f })).toThrow(RangeError);
  });
});
