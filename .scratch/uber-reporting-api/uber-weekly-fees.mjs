// Weekly Uber Eats fees: Uber Reporting API -> CSV -> Claude -> fee summary.
//
//   node uber-weekly-fees.mjs request [--start YYYY-MM-DD --end YYYY-MM-DD]
//   node uber-weekly-fees.mjs serve [--port 8080]
//   node uber-weekly-fees.mjs process --csv payment_details.csv [--start ... --end ...]
//
// Env: UBER_CLIENT_ID, UBER_CLIENT_SECRET, UBER_STORE_UUIDS (comma list), ANTHROPIC_API_KEY.

import Anthropic from "@anthropic-ai/sdk";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { parseArgs } from "node:util";

const UBER_TOKEN_URL = "https://auth.uber.com/oauth/v2/token";
const UBER_REPORT_URL = "https://api.uber.com/v1/eats/report";
const REPORT_TYPE = "PAYMENT_DETAILS_REPORT";
const OUT_DIR = process.env.UBER_FEES_OUT ?? "out";
const PAYOUT_COLUMN = process.env.UBER_PAYOUT_COLUMN ?? "Total payout";

const CATEGORIES = ["marketplace_fee", "marketing", "promotions", "chargebacks", "marketplace_facilitator_tax", "other_fees"];
const FIELDS = ["store", "gross_sales", "sales_tax", "tips", ...CATEGORIES, "net_payout", "notes"];

const FEE_SCHEMA = {
  type: "object",
  properties: {
    stores: {
      type: "array",
      items: {
        type: "object",
        properties: Object.fromEntries(FIELDS.map((f) => [f, { type: f === "store" || f === "notes" ? "string" : "number" }])),
        required: FIELDS,
        additionalProperties: false,
      },
    },
  },
  required: ["stores"],
  additionalProperties: false,
};

const SYSTEM =
  "You read Uber Eats Payment Details report CSVs and total the weekly fees per store. " +
  "Sum every row per store. Fees, promotions and chargebacks are negative numbers (they reduce payout). " +
  "gross_sales + sales_tax + tips + every fee category must equal net_payout for each store. " +
  "Put any fee column that fits no category in other_fees and name the column in notes.";

const cents = (n) => Math.round(Number(n) * 100);
const iso = (d) => d.toISOString().slice(0, 10);

function lastWeek() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - (end.getUTCDay() || 7)); // prior Sunday
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);
  return [iso(start), iso(end)];
}

// Uber
async function uberToken() {
  const res = await fetch(UBER_TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.UBER_CLIENT_ID,
      client_secret: process.env.UBER_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "eats.report",
    }),
  });
  if (!res.ok) throw new Error(`Uber token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function requestReport(start, end) {
  const body = {
    report_type: REPORT_TYPE,
    store_uuids: process.env.UBER_STORE_UUIDS.split(",").map((s) => s.trim()).filter(Boolean),
    start_date: start,
    end_date: end,
  };
  const res = await fetch(UBER_REPORT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${await uberToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Uber report ${res.status}: ${text}`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "pending.json"), JSON.stringify({ start, end, response: text }, null, 2));
  console.log(`Requested ${REPORT_TYPE} ${start} to ${end}: ${text}`);
}

// field names per Uber's eats.report.success docs; check against a real payload
const sectionUrls = (payload) =>
  (payload.report_metadata?.sections ?? []).map((s) => s.download_url ?? s.url).filter(Boolean);

async function downloadCsv(urls) {
  const parts = [];
  for (const url of urls) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Section download ${res.status}`);
    parts.push((await res.text()).replace(/^﻿/, ""));
  }
  return parts;
}

// CSV parse + payout totals done in code, never trusted to the model
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some((v) => v.trim()));
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])));
}

function codePayoutByStore(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return new Map();
  const cols = Object.keys(rows[0]);
  const storeCol = cols.find((c) => ["store name", "store", "restaurant"].includes(c.toLowerCase()));
  if (!storeCol || !cols.includes(PAYOUT_COLUMN)) {
    throw new Error(`CSV missing store or "${PAYOUT_COLUMN}" column; columns: ${cols.join(", ")}`);
  }
  const totals = new Map();
  for (const r of rows) {
    const amt = cents((r[PAYOUT_COLUMN] || "0").replace(/[$,]/g, ""));
    totals.set(r[storeCol], (totals.get(r[storeCol]) ?? 0) + amt);
  }
  return totals;
}

// Claude
async function claudeFees(csvText, start, end) {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: FEE_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `Week ${start} to ${end}. Payment Details report:\n\n<csv>\n${csvText}\n</csv>` }],
  });
  if (response.stop_reason === "refusal") throw new Error(`Claude declined: ${JSON.stringify(response.stop_details)}`);
  if (response.stop_reason === "max_tokens") throw new Error("Claude hit max_tokens before finishing");
  return JSON.parse(response.content.find((b) => b.type === "text").text).stores;
}

function tieOut(stores, codePayouts) {
  const problems = [];
  for (const s of stores) {
    const parts = ["gross_sales", "sales_tax", "tips", ...CATEGORIES].reduce((t, k) => t + cents(s[k]), 0);
    if (Math.abs(parts - cents(s.net_payout)) > 1) {
      problems.push(`${s.store}: components ${(parts / 100).toFixed(2)} != net payout ${s.net_payout.toFixed(2)}`);
    }
    const csvPayout = codePayouts.get(s.store);
    if (csvPayout === undefined) problems.push(`${s.store}: not found in CSV`);
    else if (Math.abs(csvPayout - cents(s.net_payout)) > 1) {
      problems.push(`${s.store}: Claude payout ${s.net_payout.toFixed(2)} != CSV ${(csvPayout / 100).toFixed(2)}`);
    }
  }
  const named = new Set(stores.map((s) => s.store));
  for (const name of codePayouts.keys()) if (!named.has(name)) problems.push(`${name}: in CSV, missing from Claude output`);
  return problems;
}

async function processReport(csvText, start, end) {
  mkdirSync(OUT_DIR, { recursive: true });
  const tag = `${start}_${end}`;
  writeFileSync(join(OUT_DIR, `raw_${tag}.csv`), csvText);

  const codePayouts = codePayoutByStore(csvText);
  const stores = await claudeFees(csvText, start, end);
  const problems = tieOut(stores, codePayouts);

  const quote = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const lines = [["week_start", "week_end", ...FIELDS].join(",")];
  for (const s of stores) lines.push([start, end, ...FIELDS.map((f) => quote(s[f]))].join(","));
  const out = join(OUT_DIR, `fees_${tag}.csv`);
  writeFileSync(out, lines.join("\n") + "\n");

  console.log(`Wrote ${out}`);
  if (problems.length) {
    console.log("DOES NOT TIE, do not record:\n  " + problems.join("\n  "));
    process.exitCode = 1;
  } else console.log("Ties to the CSV payout for every store.");
}

// webhook receiver
function serve(port) {
  createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const body = Buffer.concat(chunks);
      const expected = Buffer.from(createHmac("sha256", process.env.UBER_CLIENT_SECRET).update(body).digest("hex"));
      const got = Buffer.from(req.headers["x-uber-signature"] ?? "");
      if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
        res.writeHead(401).end();
        return;
      }
      res.writeHead(200).end();

      const payload = JSON.parse(body);
      if (payload.event_type !== "eats.report.success") return;
      try {
        const { start, end } = JSON.parse(readFileSync(join(OUT_DIR, "pending.json"), "utf8"));
        const csvText = (await downloadCsv(sectionUrls(payload))).join("\n");
        await processReport(csvText, start, end);
      } catch (e) {
        console.error(e);
      }
    });
  }).listen(port, () => console.log(`Listening for eats.report.success on :${port}`));
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { start: { type: "string" }, end: { type: "string" }, csv: { type: "string" }, port: { type: "string", default: "8080" } },
});
const [cmd] = positionals;
const [start, end] = values.start && values.end ? [values.start, values.end] : lastWeek();

if (cmd === "request") await requestReport(start, end);
else if (cmd === "serve") serve(Number(values.port));
else if (cmd === "process" && values.csv) await processReport(readFileSync(values.csv, "utf8").replace(/^﻿/, ""), start, end);
else {
  console.error("usage: request [--start --end] | serve [--port] | process --csv FILE [--start --end]");
  process.exitCode = 2;
}
