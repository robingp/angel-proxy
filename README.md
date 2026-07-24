# QuantDesk — Angel One data proxy (free Indian live data)

This little server lets your QuantDesk app show **live Indian stocks and indices
(Nifty, Bank Nifty, Sensex)** using Angel One's free SmartAPI. Your login secrets
stay only on this server, never in the app.

---

## STEP 1 — Get your Angel One SmartAPI credentials

1. You need an **Angel One demat/trading account** (free to open). If you don't
   have one, open it at angelone.in.
2. Go to **smartapi.angelone.in** → log in → **Create an App**
   (choose "Market Feeds" / "Trading" — either is fine for data).
3. After creating, note your **API Key**.
4. Enable **TOTP** for the API: smartapi.angelone.in → "Enable TOTP".
   Scan the QR with Google Authenticator **AND copy the secret string**
   (the long base32 text shown with the QR). You need that secret text.

You now have four things:
- API Key
- Client Code (your Angel login ID, like `A123456`)
- MPIN (your Angel login PIN)
- TOTP Secret (the base32 string from step 4)

---

## STEP 2 — Run it (pick ONE)

### Option A — Test on your computer first
1. Install Node.js 18+ (nodejs.org).
2. In this folder, create a file named `.env` OR set the variables in your
   terminal, then run `node server.js`. On Mac/Linux:

   ```bash
   export ANGEL_API_KEY="your_api_key"
   export ANGEL_CLIENT_CODE="A123456"
   export ANGEL_MPIN="1234"
   export ANGEL_TOTP_SECRET="YOURBASE32SECRET"
   node server.js
   ```
   On Windows PowerShell use `$env:ANGEL_API_KEY="..."` for each line.
3. Open http://localhost:3000/candles?symbol=RELIANCE&exchange=NSE
   You should see JSON candles. 🎉
4. In the QuantDesk app → ⚙ settings → paste `http://localhost:3000` as the
   **Indian data proxy URL**. (Works while your computer + this server are on.)

### Option B — Host it free so your phone can use it (recommended)
Use **Render.com** (free):
1. Put this folder in a GitHub repo (drag-drop upload works).
2. render.com → New → **Web Service** → connect the repo.
3. Build command: `npm install` · Start command: `npm start`.
4. Under **Environment**, add the 4 variables from Step 1
   (ANGEL_API_KEY, ANGEL_CLIENT_CODE, ANGEL_MPIN, ANGEL_TOTP_SECRET).
5. Deploy. Render gives you a URL like `https://quantdesk-xxxx.onrender.com`.
6. Test: open `<that URL>/candles?symbol=RELIANCE&exchange=NSE`.
7. In the app → ⚙ → paste `<that URL>` as the Indian data proxy URL.

(Railway.app works the same way if you prefer.)

---

## Using it
In QuantDesk, pick market **NSE / BSE / Index**, type a symbol
(RELIANCE, TCS, or a chip like NIFTY), and Analyze. US stocks still use your
Twelve Data key as before.

## Notes & honesty
- SmartAPI historical candles are for learning/analysis; they are not tick-level
  real-time. Good enough for daily signals, not for scalping.
- Angel sometimes changes API hostnames. If login stops working, check
  smartapi.angelone.in docs and update `BASE`/paths in `server.js`.
- Keep your secrets private. Never paste them into the app or commit `.env` to
  GitHub. Only this server should ever see them.
- Free hosting (Render free tier) may "sleep" when idle — the first request
  after a while can take ~30–60s to wake up. That's normal.
