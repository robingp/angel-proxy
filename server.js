/* =====================================================================
   QuantDesk — Angel One SmartAPI proxy
   ---------------------------------------------------------------------
   A tiny server that logs in to Angel One for you, then serves clean
   daily candles for Indian stocks & indices to your QuantDesk app.

   Your secrets live ONLY here as environment variables — never in the
   app / never in the browser. Set these before running:

     ANGEL_API_KEY       your SmartAPI app's API key
     ANGEL_CLIENT_CODE   your Angel One login/client code (e.g. A123456)
     ANGEL_MPIN          your Angel One MPIN (or password)
     ANGEL_TOTP_SECRET   the TOTP secret you got when enabling the
                         authenticator/TOTP for the API (the base32
                         string behind the QR code)

   Run locally:   node server.js
   Deploy free:   Render.com / Railway.app (see README.md)

   NOTE: Angel occasionally changes endpoint hostnames/paths. If login
   fails, check the current SmartAPI docs at smartapi.angelone.in and
   update BASE / the paths below.
   ===================================================================== */

const http = require("http");
const crypto = require("crypto");

const BASE = "https://apiconnect.angelone.in";
const SCRIP_URL =
  "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

const API_KEY = process.env.ANGEL_API_KEY;
const CLIENT  = process.env.ANGEL_CLIENT_CODE;
const MPIN    = process.env.ANGEL_MPIN;
const SECRET  = process.env.ANGEL_TOTP_SECRET;

if (!API_KEY || !CLIENT || !MPIN || !SECRET) {
  console.warn("⚠  Missing env vars. Set ANGEL_API_KEY, ANGEL_CLIENT_CODE, ANGEL_MPIN, ANGEL_TOTP_SECRET.");
}

/* ---------- TOTP (no external dependency) ---------- */
function base32Decode(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  s = (s || "").replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = "", bytes = [];
  for (const c of s) { const v = A.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, "0"); }
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
  return Buffer.from(bytes);
}
function totp(secret) {
  const key = base32Decode(secret);
  const step = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(step / 2 ** 32), 0);
  buf.writeUInt32BE(step >>> 0, 4);
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24) | ((h[off + 1] & 0xff) << 16) |
               ((h[off + 2] & 0xff) << 8) | (h[off + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, "0");
}

/* ---------- Angel headers / session ---------- */
function headers(extra) {
  return Object.assign({
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    "X-ClientLocalIP": "127.0.0.1",
    "X-ClientPublicIP": "127.0.0.1",
    "X-MACAddress": "00:00:00:00:00:00",
    "X-PrivateKey": API_KEY,
  }, extra || {});
}

let session = null; // {token, at}
async function login() {
  const body = { clientcode: CLIENT, password: MPIN, totp: totp(SECRET) };
  const r = await fetch(BASE + "/rest/auth/angelbroking/user/v1/loginByPassword", {
    method: "POST", headers: headers(), body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j || !j.data || !j.data.jwtToken)
    throw new Error("Login failed: " + (j && j.message ? j.message : JSON.stringify(j)));
  session = { token: j.data.jwtToken, at: Date.now() };
  console.log("✓ Angel login OK");
  return session.token;
}
async function getToken() {
  if (session && Date.now() - session.at < 6 * 3600 * 1000) return session.token; // reuse ~6h
  return login();
}

/* ---------- Instrument master (symbol -> token) ---------- */
let scrip = null, scripAt = 0;
async function getScrip() {
  if (scrip && Date.now() - scripAt < 24 * 3600 * 1000) return scrip;
  const r = await fetch(SCRIP_URL);
  scrip = await r.json();
  scripAt = Date.now();
  console.log("✓ Loaded scrip master (" + scrip.length + " instruments)");
  return scrip;
}
const IDX = {
  NIFTY:     { seg: "NSE", names: ["Nifty 50", "NIFTY 50", "NIFTY50", "NIFTY"] },
  BANKNIFTY: { seg: "NSE", names: ["Nifty Bank", "NIFTY BANK", "BANKNIFTY", "BANK NIFTY", "NIFTYBANK"] },
  SENSEX:    { seg: "BSE", names: ["SENSEX", "BSE SENSEX", "S&P BSE SENSEX"] },
};
async function findToken(sym, exchange) {
  const list = await getScrip();
  if (exchange === "IDX") {
    const m = IDX[sym] || { seg: "NSE", names: [sym] };
    const wanted = m.names.map(n => n.toUpperCase().replace(/\s+/g, ""));
    // first try exact-ish name match within the right segment
    let hit = list.find(x => x.exch_seg === m.seg &&
      wanted.includes((x.name || "").toUpperCase().replace(/\s+/g, "")));
    // some indices are tagged as AMXIDX / with instrumenttype blank; try symbol field too
    if (!hit) hit = list.find(x => x.exch_seg === m.seg &&
      wanted.includes((x.symbol || "").toUpperCase().replace(/\s+/g, "")));
    // last resort: any segment, name contains the core word
    if (!hit) {
      const core = (m.names[0] || sym).toUpperCase().replace(/\s+/g, "");
      hit = list.find(x => (x.name || "").toUpperCase().replace(/\s+/g, "") === core);
    }
    if (!hit) throw new Error("Index not found: " + sym + " (try /find?q=" + encodeURIComponent(m.names[0]) + " to see Angel's exact name)");
    return { token: hit.token, seg: hit.exch_seg || m.seg };
  }
  const seg = exchange; // NSE or BSE
  let hit = list.find(x => x.exch_seg === seg && x.symbol === sym + "-EQ");
  if (!hit) hit = list.find(x => x.exch_seg === seg && x.symbol === sym);
  if (!hit) hit = list.find(x => x.exch_seg === seg && (x.name || "").toUpperCase() === sym);
  if (!hit) throw new Error('Symbol not found: "' + sym + '" on ' + seg);
  return { token: hit.token, seg };
}

/* ---------- Candles ---------- */
function fmt(d) {
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " 09:15";
}
async function getCandles(sym, exchange, days) {
  const { token, seg } = await findToken(sym, exchange);
  const from = new Date(Date.now() - days * 1.6 * 864e5); // pad for weekends/holidays
  const body = {
    exchange: seg, symboltoken: token, interval: "ONE_DAY",
    fromdate: fmt(from), todate: fmt(new Date()).replace("09:15", "15:30"),
  };
  const r = await fetch(BASE + "/rest/secure/angelbroking/historical/v1/getCandleData", {
    method: "POST",
    headers: headers({ Authorization: "Bearer " + (await getToken()) }),
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j || !j.data) throw new Error("Candle error: " + (j && j.message ? j.message : JSON.stringify(j)));
  // Angel rows: [timestamp, open, high, low, close, volume]
  return j.data.map(row => ({
    time: String(row[0]).slice(0, 10),
    open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5],
  }));
}

/* ---------- HTTP server ---------- */
http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/candles") {
    try {
      const sym = (url.searchParams.get("symbol") || "").toUpperCase().trim();
      const exchange = (url.searchParams.get("exchange") || "NSE").toUpperCase().trim();
      const days = Math.min(400, +(url.searchParams.get("days") || 150));
      if (!sym) throw new Error("Missing symbol");
      const data = await getCandles(sym, exchange, days);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  if (url.pathname === "/find") {
    // debug helper: /find?q=bank  -> shows Angel instruments whose name contains 'bank'
    try {
      const q = (url.searchParams.get("q") || "").toUpperCase();
      const list = await getScrip();
      const out = list.filter(x =>
        ((x.name || "").toUpperCase().includes(q) || (x.symbol || "").toUpperCase().includes(q)) &&
        (x.instrumenttype === "AMXIDX" || x.instrumenttype === "" || !x.instrumenttype ||
         (x.exch_seg === "NSE" || x.exch_seg === "BSE"))
      ).slice(0, 40).map(x => ({ name: x.name, symbol: x.symbol, token: x.token, seg: x.exch_seg, type: x.instrumenttype }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(out, null, 2));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("QuantDesk Angel proxy is running. Try /candles?symbol=RELIANCE&exchange=NSE");
}).listen(process.env.PORT || 3000, () =>
  console.log("QuantDesk Angel proxy listening on port " + (process.env.PORT || 3000)));
