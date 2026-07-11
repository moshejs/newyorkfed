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

All functions take an optional final `options`: `{ fetch?, baseUrl? }` (inject `fetch` for tests/proxies). Rates are percents, as published.

- **`latestRates()`** — the latest value of every reference rate
- **`lastRates(type, n?)`** — last `n` observations; `type`: `"sofr" | "bgcr" | "tgcr"` (secured) or `"effr" | "obfr"` (unsecured) — routing is handled for you
- **`searchRates(type, { startDate, endDate })`** — history over a date range
- **`sofrAverages(n?)`** — 30/90/180-day compounded SOFR averages and the SOFR index
- **`somaSummary()`** — the System Open Market Account holdings time series
- **`raw(path)`** — escape hatch for the rest of the API (Treasury ops, repo ops, primary dealer stats, FX swaps, securities lending, AMBS): any documented `/api/...` path, parsed JSON back

Failures throw `NewYorkFedError` with `status` and `url`. The mocked test suite runs offline; `npm run smoke` exercises the live API.

## Related

Part of a small fixed-income toolkit: [`treasurydirect`](https://github.com/moshejs/treasurydirect) (Treasury auctions & Debt to the Penny) · [`tbill`](https://github.com/moshejs/tbill) (bill yield math) · [`32nds`](https://github.com/moshejs/32nds) (quote notation) · [`day-count`](https://github.com/moshejs/day-count) · [`accrued-interest`](https://github.com/moshejs/accrued-interest) · [`sifma-holidays`](https://github.com/moshejs/sifma-holidays).

## Author

Built by **[Moshe Malka](https://moshemalka.com)** — engineering leader in New York City. Studio work at [Quentin.Code](https://www.quentin.software/).

MIT © Moshe Malka
