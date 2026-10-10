// Live smoke test against the real API (not run in CI — see `npm test` for
// the mocked suite). Usage: npm run smoke
import { lastRates, latestRates, repoOperations, searchRates, sofrAverages, somaSummary } from "../dist/index.js";

const latest = await latestRates();
console.log(`latest rates: ${latest.map((r) => `${r.type}=${r.percentRate ?? "avg"}`).join(" ")}`);

const [sofr] = await lastRates("sofr", 1);
console.log(`SOFR ${sofr.effectiveDate}: ${sofr.percentRate}% ($${sofr.volumeInBillions}B volume)`);

const [effr] = await lastRates("effr", 1);
console.log(`EFFR ${effr.effectiveDate}: ${effr.percentRate}%`);

const week = await searchRates("sofr", { startDate: "2026-07-01", endDate: "2026-07-09" });
console.log(`SOFR search 07-01→07-09: ${week.length} observations`);

const [avg] = await sofrAverages(1);
console.log(`SOFR 30d avg ${avg.effectiveDate}: ${avg.average30day}% (index ${avg.index})`);

const soma = await somaSummary();
console.log(`SOMA summary rows: ${soma.length} (latest as-of ${soma.at(-1)?.asOfDate ?? soma[0]?.asOfDate})`);
const [rrp] = await repoOperations("reverserepo", 1);
console.log(`RRP ${rrp.operationDate}: $${rrp.totalAmtAccepted} accepted`);
console.log("SMOKE OK");
