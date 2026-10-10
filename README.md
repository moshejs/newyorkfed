# newyorkfed

Typed, zero-dependency client for the **Federal Reserve Bank of New York's free [Markets Data API](https://markets.newyorkfed.org/)** — the primary source for **SOFR** and the other US reference rates. **No API key required.**

```
npm install newyorkfed
```

## Why

SOFR replaced LIBOR as the benchmark underneath floating-rate loans, swaps, and futures — and the NY Fed publishes it (with percentiles and volume), plus EFFR, OBFR, BGCR, TGCR, the SOFR averages & index, and SOMA holdings, all as free keyless JSON. npm had no client library for any of it.

```ts
import { lastRates, latestRates, sofrAverages } from "newyorkfed";

const [sofr] = await lastRates("sofr", 1);
sofr.percentRate;       // 3.53          (percent)
sofr.volumeInBillions;  // 3126          ($3.1T of repo behind one number)
sofr.percentPercentile75; // 3.57

const all = await latestRates(); // SOFR, EFFR, OBFR, BGCR, TGCR + averages

const [avg] = await sofrAverages(1);
avg.average30day; avg.average90day; avg.index; // compounded averages & index
```

## API

All functions take an optional final `options`: `{ fetch?, baseUrl?, timeoutMs?, signal? }` (inject `fetch` for tests/proxies; `timeoutMs`/`signal` abort the request — there is no timeout by default). Rates are percents, as published. Rate series come back **newest first**.

- **`latestRates()`** — the latest value of every reference rate, plus the SOFR averages row (`type: "SOFRAI"`)
- **`lastRates(type, n?)`** — last `n` observations (1–999, the API's limit); `type`: `"sofr" | "bgcr" | "tgcr"` (secured), `"effr" | "obfr"` (unsecured) or `"sofrai"` — routing is handled for you
- **`searchRates(type, { startDate, endDate })`** — history over an inclusive `YYYY-MM-DD` range (same `type`s). Impossible dates or a reversed range throw `RangeError`
- **`sofrAverages(n?)`** — 30/90/180-day compounded SOFR averages and the SOFR index (same as `lastRates("sofrai", n)`)
- **`repoOperations(kind?, n?)`** — last `n` repo / reverse repo (RRP) operation results; `kind`: `"repo" | "reverserepo" | "all"` (default). Amounts in dollars
- **`somaSummary()`** — the System Open Market Account holdings time series, oldest first. Values are dollar strings exactly as published (`""` where an asset class didn't exist yet)
- **`raw(path)`** — escape hatch for the rest of the API (Treasury ops, primary dealer stats, FX swaps, securities lending, AMBS): any documented `/api/...` path, parsed JSON back, e.g. `raw("/api/tsy/all/results/summary/last/5.json")`

### Data notes

- Optional fields depend on the series and era: EFFR carries `targetRateFrom`/`targetRateTo` (`targetRateTo` absent before the Dec 2008 target range) and, before March 2016, `intraDayLow`/`intraDayHigh`/`stdDeviation` instead of percentiles/volume.
- On a few days (e.g. 2019-05-31 and 2021-08-05 for SOFR/BGCR/TGCR) the NY Fed published percentiles as `"NA"`. Those fields are **omitted** so numeric fields are always numbers when present; `footnoteId` tells you a note applies.
- `revisionIndicator` is `""` or `"r"` (revised).

### Errors

Non-2xx responses throw `NewYorkFedError` with `status` and `url` (the API answers unknown paths and out-of-range parameters with an empty HTTP 400). A 2xx body that isn't JSON, or lacks the expected wrapper (e.g. `refRates`), also throws `NewYorkFedError`. Invalid arguments throw `RangeError` before any request is made. The mocked test suite runs offline; `npm run smoke` exercises the live API.

## Related

Part of a small fixed-income toolkit: [`treasurydirect`](https://github.com/moshejs/treasurydirect) (Treasury auctions & Debt to the Penny) · [`tbill`](https://github.com/moshejs/tbill) (bill yield math) · [`32nds`](https://github.com/moshejs/32nds) (quote notation) · [`day-count`](https://github.com/moshejs/day-count) · [`accrued-interest`](https://github.com/moshejs/accrued-interest) · [`sifma-holidays`](https://github.com/moshejs/sifma-holidays).

## Author

Built by **[Moshe Malka](https://moshemalka.com)** — engineering leader in New York City. Studio work at [Quentin.Code](https://www.quentin.software/).

MIT © Moshe Malka
