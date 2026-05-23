# Walkthrough: AeroVoice Standalone Call Console

We have successfully structured your standalone international calling console in `D:\call` on your Windows machine. 

The codebase features a modern, glassmorphic dark-mode dialer with standard dial-pad audio synthesis (DTMF tones), a live canvas microphone visualizer, contact management, and local call logging.

Here is a summary of what was built, how it works, and how you can run it right now on your machine.

---

## 1. What Was Built

We created a lightweight, high-performance architecture that is fully functional locally and structured to easily scale into a paid SaaS:

* **[package.json](file:///D:/call/package.json)**: Sets up dependencies (`express`, `dotenv`, `cors`) for the Node.js backend environment.
* **[server.js](file:///D:/call/server.js)**: A lightweight Node.js/Express server that securely fetches ephemeral WebRTC authentication tokens from Telnyx’s API and serves the static frontend assets. If your keys are not yet configured in `.env`, the server automatically flags a safe **Simulation Mode** response.
* **[.env](file:///D:/call/.env)**: Configuration template where you can safely store your Telnyx Master API V2 Key and WebRTC Connection ID.
* **[index.html](file:///D:/call/public/index.html)**: Semantic, clean single-page markup containing custom SVG icon blocks and loading the latest Telnyx WebRTC and browser-compatibility SDK scripts.
* **[style.css](file:///D:/call/public/style.css)**: A custom-designed, responsive dark-mode stylesheet with glassmorphism overlays, smooth touch-button active scaling, pulsing connectivity animations, and responsive layout scaling.
* **[app.js](file:///D:/call/public/app.js)**: The core engine of the client app. Features:
  * **Interactive Keypad & Sounds**: Blends dual sine frequencies on-the-fly to play real analog touch-tones (DTMF) when dialing.
  * **Dynamic Country Flag Detector**: Scans your input prefixes (e.g. `+44`, `+81`) to automatically display matching country flags.
  * **Canvas Microphone Visualizer**: Links to your browser's Web Audio API and draws a symmetrical real-time glowing voice amplitude aura on `<canvas>` during calls.
  * **Interactive Simulation Engine**: Lets you test ringing, answering, muting, and duration timers completely free of credentials.
  * **Local Database**: Persists your private recent call logs and address book inside the browser's secure, offline `localStorage`.

---

## 2. How to Run It Right Now

Since this machine has **Node.js and npm installed**, you can run the full, secure Node server immediately!

### Option A: Run via Node.js (Highly Recommended)

Running via Node.js launches the backend server, enabling dynamic token exchange with Telnyx and serving the frontend interface with local fallback compatibility.

1. Open **PowerShell** or **Command Prompt** in `D:\call`.
2. Install the lightweight dependencies:
   ```powershell
   npm install
   ```
3. Launch the server:
   ```powershell
   npm start
   ```
4. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

*If your `.env` credentials are not yet configured, the server will safely run in **Simulation Mode** so you can still fully test the UI/UX.*

---

### Option B: Run via Python (Backup Simulation Sandbox)

If you prefer to bypass Node.js and serve the static files directly:

1. Open PowerShell or Command Prompt in `D:\call`.
2. Run one of the following commands:
   ```powershell
   python -m http.server 3000 --directory public
   ```
   *(Or `python3` depending on how Python is installed on your Windows path).*
3. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

> [!NOTE]
> Serves the frontend directly. Because there is no active token server running under Python, the app will automatically operate in the robust **Simulation Mode** (ideal for rapid UI/UX demoing without credentials).

---

## 3. How to Connect to the Real Telnyx Network

When you are ready to make real international outbound calls to actual phones:

1. **Sign Up**: Create a Telnyx account at [telnyx.com](https://telnyx.com). *(Note: Telnyx requires a domain-based business email to sign up, as they block generic `@gmail.com` accounts to prevent fraud).*
2. **Identity Verification**: During sign-up, Telnyx will ask you to verify a mobile phone number via SMS to secure your account.
3. **Get an API Key**: Go to **Mission Control Portal -> API Keys** and generate a new V2 API Key. Copy it into the `TELNYX_API_KEY` slot in [dotenv](file:///D:/call/.env).
4. **Set Up a Connection**:
   - Go to **Connections -> Add Connection** and select **Credential Connection**.
   - Copy the generated **Connection ID** (also called Credential ID) into the `TELNYX_CREDENTIAL_ID` slot in [dotenv](file:///D:/call/.env).
5. **Configure Outbound Routing & Caller ID**:
   - Create an **Outbound Voice Profile** in the Telnyx portal, check the destinations you wish to call (ensure international destinations are toggled on), and link it to your newly created Credential Connection.
   - **Carrier Caller ID Override**: Rather than letting the browser client transmit arbitrary caller numbers (which carriers would block as spoofing), we removed the editable inputs from the UI. The dialer now displays a professional, static **"Verified (Auto)"** badge, relying entirely on the carrier-level **Caller ID Override** configured within your Telnyx Mission Control Portal connection settings. This is the most secure, robust, and industry-standard way to manage outgoing Caller ID!
6. **Restart Server**: Start your node server with `npm start`. The top pill will glow green and read **"Connected to Telnyx"**. Any call you make will dial real numbers using your verified mobile number!

---

## 4. Call Cost & CDR Badge Feature

We integrated a visual Call Cost CDR badge system to display precisely what each call cost you, directly inside your recent calls list on the right-hand panel.

### How It Works:
1. **Background Polling Loop**: Once a call concludes, the client automatically initiates a background check.
2. **Telnyx V2 Detail Records Query**: The server queries Telnyx's `https://api.telnyx.com/v2/detail_records` endpoint for the active WebRTC `call_id` or `session_id`.
3. **Smart Latency Handling**: Since billing data takes a few seconds to compile, the server polls the CDR endpoint up to **10 times** (every 2 seconds) until the record is returned.
4. **Retry Counter**: The server counts the exact number of attempts it took to find the record, logging it to the console (e.g. `✅ CDR found on attempt 3! Cost: 0.0125 USD`).
5. **No Blind Estimations**: If the CDR is still not found after 10 attempts (20 seconds), it gracefully shows a clear **N/A** badge rather than fabricating a potentially incorrect guess.
6. **Polished Glassmorphic Design**:
   - **Checking...**: Soft golden glowing pill indicating dynamic polling is active.
   - **$0.0125**: Sleek emerald-tinted badge representing the final confirmed charge amount.
   - **N/A**: Clean, muted gray badge for missed/incomplete calls or uncompiled CDRs.

