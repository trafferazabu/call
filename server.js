import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Token Generation Endpoint
 * Calls the Telnyx REST API to create an on-demand WebRTC JWT,
 * or gracefully falls back to Simulation Mode if keys are not provided yet.
 */
app.get('/api/token', async (req, res) => {
  const apiKey = process.env.TELNYX_API_KEY;
  const credentialId = process.env.TELNYX_CREDENTIAL_ID;

  // Check if credentials are empty or contain placeholder text
  const isConfigured =
    apiKey &&
    apiKey.trim() !== '' &&
    apiKey !== 'your_telnyx_api_key_here' &&
    credentialId &&
    credentialId.trim() !== '' &&
    credentialId !== 'your_telnyx_credential_id_here';

  if (!isConfigured) {
    console.log('💡 Telnyx credentials not fully configured in .env. Running in interactive SIMULATION MODE.');
    return res.json({
      simulation_mode: true,
      message: "Running in Demonstration/Simulation Mode. Add your API credentials in .env to connect to the real network.",
      verified_number: process.env.TELNYX_VERIFIED_NUMBER || "+819060125466"
    });
  }

  try {
    console.log(`🔑 Fetching WebRTC login token for credential ID: ${credentialId}...`);

    const response = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${credentialId}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telnyx API responded with status ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    let loginToken = null;

    try {
      const result = JSON.parse(responseText);
      loginToken = result?.data?.token || result?.token || responseText;
    } catch (e) {
      // If not JSON, it is already a raw string
      loginToken = responseText.trim();
    }

    // Strip wrapping quotes if present
    if (loginToken.startsWith('"') && loginToken.endsWith('"')) {
      loginToken = loginToken.substring(1, loginToken.length - 1);
    }

    if (!loginToken || !loginToken.startsWith('eyJ')) {
      throw new Error("Invalid token payload returned from Telnyx API");
    }

    console.log('✅ WebRTC token generated successfully!');
    return res.json({
      simulation_mode: false,
      login_token: loginToken,
      verified_number: process.env.TELNYX_VERIFIED_NUMBER || null
    });
  } catch (error) {
    console.error('❌ Failed to generate Telnyx WebRTC token:', error.message);

    // Fall back to Simulation Mode rather than crashing, so the user can still test the UI
    return res.json({
      simulation_mode: true,
      error: error.message,
      message: "Failed to connect to Telnyx API. Falling back to Demonstration/Simulation Mode.",
      verified_number: process.env.TELNYX_VERIFIED_NUMBER || "+819060125466"
    });
  }
});

/**
 * Call Cost Detail Record (CDR) Endpoint
 * Polls Telnyx detail records for a finished call to fetch its real charge amount.
 * Retries up to 10 times (every 2 seconds) to wait for billing engine compilation.
 */
app.get('/api/call-cost/:callId', async (req, res) => {
  const { callId } = req.params;
  const duration = parseInt(req.query.duration || 0, 10);
  const apiKey = process.env.TELNYX_API_KEY;

  // Check if credentials are fully configured or if we are in Simulation Mode
  const isConfigured = apiKey && apiKey.trim() !== '' && apiKey !== 'your_telnyx_api_key_here';
  if (!isConfigured || callId.startsWith('sim-')) {
    // In Simulation Mode, return a mock charge amount immediately
    const mockRate = 0.015;
    const mockCost = duration > 0 ? Math.max(0.005, (duration / 60) * mockRate) : 0.005;
    return res.json({
      success: true,
      simulated: true,
      cost: mockCost.toFixed(4),
      currency: 'USD',
      attempts: 1,
      duration: duration
    });
  }

  console.log(`🔍 Polling Telnyx WebRTC CDR for callId: ${callId}...`);
  const retries = 10;
  const delay = 2000; // 2 seconds

  const fetchRecord = async () => {
    try {
      const response = await fetch(`https://api.telnyx.com/v2/detail_records?filter[record_type]=webrtc&filter[date_range]=today`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Telnyx API returned status ${response.status}`);
      }

      const payload = await response.json();
      const records = payload?.data || [];

      // Find the record matching the Call ID or Session ID
      const record = records.find(r =>
        (r.call_id && r.call_id.toLowerCase() === callId.toLowerCase()) ||
        (r.session_id && r.session_id.toLowerCase() === callId.toLowerCase())
      );

      if (record) {
        let costValue = 0;
        let currencyValue = 'USD';

        if (record.cost && typeof record.cost === 'object') {
          costValue = parseFloat(record.cost.amount || 0);
          currencyValue = record.cost.currency || 'USD';
        } else if (record.cost) {
          costValue = parseFloat(record.cost || 0);
        }

        return {
          cost: costValue.toFixed(4),
          currency: currencyValue,
          duration: record.billed_sec || duration
        };
      }
      return null;
    } catch (err) {
      console.error('⚠️ Telnyx CDR fetch error:', err.message);
      return null;
    }
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`   Attempt ${attempt}/${retries}...`);
    const recordData = await fetchRecord();
    if (recordData) {
      console.log(`✅ CDR found on attempt ${attempt}! Cost: ${recordData.cost} ${recordData.currency}`);
      return res.json({
        success: true,
        simulated: false,
        cost: recordData.cost,
        currency: recordData.currency,
        attempts: attempt,
        duration: recordData.duration
      });
    }

    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log(`❌ CDR not found after ${retries} attempts.`);
  return res.json({
    success: false,
    message: "CDR not yet compiled. Try again later.",
    attempts: retries
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 Standalone Calling App is running at: http://localhost:${PORT}`);
  console.log(`📝 All local user logs, contacts, and history will persist locally.`);
  console.log(`================================================================`);
});
