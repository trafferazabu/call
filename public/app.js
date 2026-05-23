/**
 * AeroVoice - Core Application Logic
 * Implements a complete calling state machine, DTMF tone generator,
 * canvas audio visualizer, local contact book, and Telnyx WebRTC bindings.
 */

// Ensure compatibility between CDN (TelnyxRTC) and Local UMD (TelnyxWebRTC) SDK global names
if (window.TelnyxWebRTC && !window.TelnyxRTC) {
  window.TelnyxRTC = window.TelnyxWebRTC;
}

// UI State Elements
const phoneNumberInput = document.getElementById('phone-number');
const flagIcon = document.getElementById('country-flag-icon');
const callStatusText = document.getElementById('call-status');
const callTimer = document.getElementById('call-timer');
const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');

// Control Buttons
const btnCall = document.getElementById('btn-call');
const btnMute = document.getElementById('btn-mute');
const btnSpeaker = document.getElementById('btn-speaker');
const btnBackspace = document.getElementById('btn-backspace');
const audioDrawer = document.getElementById('audio-settings-drawer');
const volumeSlider = document.getElementById('volume-slider');
const btnCloseAudio = document.getElementById('btn-close-audio');

// Audio Device Selects
const micSelect = document.getElementById('mic-select');
const outputSelect = document.getElementById('output-select');

// Tabs & Panes
const tabHistory = document.getElementById('tab-history');
const tabContacts = document.getElementById('tab-contacts');
const paneHistory = document.getElementById('pane-history');
const paneContacts = document.getElementById('pane-contacts');

// Scroll Lists
const historyList = document.getElementById('history-list');
const contactsList = document.getElementById('contacts-list');
const btnClearHistory = document.getElementById('btn-clear-history');
const btnAddContact = document.getElementById('btn-add-contact');

// Modal Elements
const modalContact = document.getElementById('modal-contact');
const contactForm = document.getElementById('contact-form');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const contactNameInput = document.getElementById('contact-name');
const contactPhoneInput = document.getElementById('contact-phone');

// Canvas Visualizer
const visualizerCanvas = document.getElementById('waveform-canvas');
const canvasCtx = visualizerCanvas.getContext('2d');

// --- APPLICATION STATE ---
let appConfig = {
  simulation_mode: true,
  login_token: null
};

let callState = 'idle'; // 'idle' | 'ringing' | 'connected' | 'ended'
let isMuted = false;
let callDuration = 0;
let timerInterval = null;
let telnyxClient = null;
let activeCall = null;

// Audio Context for DTMF, Ringback and microphone analysis
let audioContext = null;
let visualizerAnalyser = null;
let visualizerSource = null;
let visualizerStream = null;
let canvasAnimationId = null;
let simulatedRingbackOscillators = [];
let ringbackInterval = null; // Looping simulator interval

// Local Database
let callHistory = JSON.parse(localStorage.getItem('aerovoice_history') || '[]');
let contactsListDb = JSON.parse(localStorage.getItem('aerovoice_contacts') || '[]');

// DTMF Tone Frequencies Map
const DTMF_FREQ = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

// Prefix-to-Flag/Country Map
const COUNTRY_CODES = [
  { prefix: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { prefix: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { prefix: '+33', flag: '🇫🇷', name: 'France' },
  { prefix: '+49', flag: '🇩🇪', name: 'Germany' },
  { prefix: '+81', flag: '🇯🇵', name: 'Japan' },
  { prefix: '+61', flag: '🇦🇺', name: 'Australia' },
  { prefix: '+86', flag: '🇨🇳', name: 'China' },
  { prefix: '+7', flag: '🇷🇺', name: 'Russia' },
  { prefix: '+91', flag: '🇮🇳', name: 'India' },
  { prefix: '+39', flag: '🇮🇹', name: 'Italy' },
  { prefix: '+34', flag: '🇪🇸', name: 'Spain' },
  { prefix: '+55', flag: '🇧🇷', name: 'Brazil' },
  { prefix: '+52', flag: '🇲🇽', name: 'Mexico' },
  { prefix: '+82', flag: '🇰🇷', name: 'South Korea' }
];

// Default Contacts if DB is empty (premium experience)
const DEFAULT_CONTACTS = [
  { name: "United Nations (Geneva)", phone: "+41229171234" },
  { name: "Telnyx Support", phone: "+18889808257" },
  { name: "UK Emergency Services Proxy", phone: "+44999" }
];

// Live Dev Terminal Logger
function logToTerminal(message, type = 'info') {
  const terminal = document.getElementById('dev-log-terminal');
  if (!terminal) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString() + '.' + String(now.getMilliseconds()).padStart(3, '0');
  
  entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-message">${message}</span>`;
  
  terminal.appendChild(entry);
  terminal.scrollTop = terminal.scrollHeight;
  console.log(`[DevLog] ${message}`);
}

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  logToTerminal("🚀 System initializing...", "success");
  setupAudioContext();
  initializeLocalData();
  setupUIEventListeners();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Render empty visualizer
  drawVisualizerFrame(new Uint8Array(64), true);
  
  // Initialize device selects
  try {
    logToTerminal("Checking microphone hardware & permissions...", "info");
    // Request permission first to reveal device names
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(track => track.stop());
      logToTerminal("🎤 Microphone access allowed.", "success");
    } catch (e) {
      logToTerminal("Microphone access prompt dismissed or denied. Device labels will be anonymous.", "warning");
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Clear default options first before listing real devices
    micSelect.innerHTML = '';
    outputSelect.innerHTML = '';
    
    // Add default system options
    const defaultMic = document.createElement('option');
    defaultMic.value = 'default';
    defaultMic.text = 'Default Microphone (System)';
    micSelect.appendChild(defaultMic);
    
    const defaultSpk = document.createElement('option');
    defaultSpk.value = 'default';
    defaultSpk.text = 'Default Speaker (System)';
    outputSelect.appendChild(defaultSpk);

    devices.forEach(device => {
      if (device.deviceId === 'default' || device.deviceId === '') return;
      
      const option = document.createElement('option');
      option.value = device.deviceId;
      if (device.kind === 'audioinput') {
        option.text = device.label || `Microphone (${device.deviceId.slice(0, 5)}...)`;
        micSelect.appendChild(option);
      } else if (device.kind === 'audiooutput') {
        option.text = device.label || `Speaker (${device.deviceId.slice(0, 5)}...)`;
        outputSelect.appendChild(option);
      }
    });
  } catch (err) {
    console.warn('Cannot enumerate audio devices:', err);
  }

  // Set initial remote audio volume
  const remoteAudio = document.getElementById('remote-audio');
  if (remoteAudio && volumeSlider) {
    remoteAudio.volume = volumeSlider.value;
  }

  // Authenticate with server and load config
  await fetchAppConfig();
});

// Setup audio nodes on demand
function setupAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
    
    // Set initial Web Audio output device if custom one is selected
    if (outputSelect && outputSelect.value !== 'default' && typeof audioContext.setSinkId === 'function') {
      audioContext.setSinkId(outputSelect.value).catch(err => {
        console.warn("Failed to set initial Web Audio context sink:", err);
      });
    }
  }
}

// Load configurations from backend Express server
async function fetchAppConfig() {
  updateStatusUI('connecting', 'Connecting Gateway...');
  logToTerminal("Fetching authentication from local gateway API...", "info");
  
  try {
    const res = await fetch('/api/token');
    appConfig = await res.json();
    
    if (appConfig.verified_number) {
      const val = appConfig.verified_number;
      const badge = document.getElementById('caller-id-number');
      if (badge) {
        badge.textContent = `Verified (${val})`;
      }
      logToTerminal(`Outbound Caller Identity set to: ${val}`, "success");
    }

    if (appConfig.simulation_mode) {
      logToTerminal("No credentials found in .env. Sandbox Simulation mode activated.", "warning");
      updateStatusUI('simulating', 'Simulating Sandbox');
    } else {
      logToTerminal("Token fetched successfully. Initializing production client...", "success");
      updateStatusUI('ready', 'Connected to Telnyx');
      initializeTelnyxSDK(appConfig.login_token);
    }
  } catch (err) {
    console.error('Error fetching config:', err);
    logToTerminal("Gateway Error: Failed to contact token API. Gateway is Offline.", "error");
    updateStatusUI('error', 'Gateway Offline');
  }
}

// Setup standard contacts list & call logs
function initializeLocalData() {
  if (contactsListDb.length === 0) {
    contactsListDb = DEFAULT_CONTACTS;
    localStorage.setItem('aerovoice_contacts', JSON.stringify(contactsListDb));
  }
  renderContactsList();
  renderHistoryList();
}

function updateStatusUI(state, text) {
  statusPill.className = `status-pill status-${state}`;
  statusText.textContent = text;
  
  if (state === 'error') {
    callStatusText.textContent = "Gateway Offline - Retry Later";
    callStatusText.style.color = 'var(--rose)';
  } else {
    callStatusText.textContent = callState === 'idle' ? "Ready to call" : callStatusText.textContent;
    callStatusText.style.color = 'var(--text-secondary)';
  }
}

/* ==========================================================================
   Telnyx WebRTC SDK Integration
   ========================================================================== */
// Helper function to dynamically load javascript packages from CDN
function loadScript(url) {
  return new Promise((resolve, reject) => {
    logToTerminal(`Loading WebRTC SDK fallback from CDN: ${url}...`, "info");
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = () => {
      logToTerminal(`Fallback SDK loaded successfully from CDN!`, "success");
      resolve();
    };
    script.onerror = (err) => {
      logToTerminal(`Failed to load SDK from CDN!`, "error");
      reject(err);
    };
    document.head.appendChild(script);
  });
}

async function initializeTelnyxSDK(token) {
  logToTerminal("Initializing Telnyx WebRTC SDK context...", "info");
  
  function getTelnyxClass() {
    if (window.TelnyxRTC) {
      if (typeof window.TelnyxRTC === 'function') return window.TelnyxRTC;
      if (window.TelnyxRTC.TelnyxRTC && typeof window.TelnyxRTC.TelnyxRTC === 'function') return window.TelnyxRTC.TelnyxRTC;
    }
    if (window.TelnyxWebRTC) {
      if (typeof window.TelnyxWebRTC === 'function') return window.TelnyxWebRTC;
      if (window.TelnyxWebRTC.TelnyxRTC && typeof window.TelnyxWebRTC.TelnyxRTC === 'function') return window.TelnyxWebRTC.TelnyxRTC;
    }
    return null;
  }

  let TelnyxClientClass = getTelnyxClass();

  if (!TelnyxClientClass) {
    logToTerminal("Local SDK script not found or failed to initialize. Attempting CDN fallback...", "warning");
    try {
      await loadScript("https://unpkg.com/@telnyx/webrtc@2.26.4/lib/bundle.js");
      TelnyxClientClass = getTelnyxClass();
    } catch (e) {
      logToTerminal(`Primary CDN fallback failed: ${e.message}. Trying secondary CDN...`, "warning");
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@telnyx/webrtc@2.26.4/lib/bundle.js");
        TelnyxClientClass = getTelnyxClass();
      } catch (e2) {
        logToTerminal(`Secondary CDN fallback also failed: ${e2.message}`, "error");
      }
    }
  }

  if (!TelnyxClientClass) {
    logToTerminal("Fatal: Telnyx WebRTC SDK class is missing from window context.", "error");
    console.error("Telnyx RTC SDK is not loaded.");
    updateStatusUI('error', 'SDK Load Error');
    return;
  }

  try {
    logToTerminal("Instantiating TelnyxRTC signaling client...", "info");
    const remoteAudio = document.getElementById('remote-audio');
    telnyxClient = new TelnyxClientClass({
      login_token: token
    });
    if (remoteAudio) {
      telnyxClient.remoteElement = remoteAudio;
      logToTerminal("🔗 Telnyx client default remoteElement registered.", "success");
    }

    logToTerminal("Connecting client to secure signaling servers (wss://rtc.telnyx.com)...", "info");
    telnyxClient.connect();

    telnyxClient.on('telnyx.ready', () => {
      logToTerminal("⚡ Gateway Connection Established: Ready to make outbound calls!", "success");
      console.log('⚡ Telnyx signaling ready.');
      updateStatusUI('ready', 'Connected to Telnyx');
    });

    telnyxClient.on('telnyx.error', (err) => {
      logToTerminal(`⚠️ SDK error occurred: ${err.message || JSON.stringify(err)}`, "error");
      console.error('Telnyx SDK Error:', err);
      updateStatusUI('error', 'Telnyx Error');
    });

    // Handle incoming calls or state changes on the client level if required
    telnyxClient.on('telnyx.notification', (notification) => {
      console.log('Notification received:', notification);
      
      if (notification.type === 'userMediaError') {
        logToTerminal("❌ Media Error: Permission denied or microphone hardware not found.", "error");
      } else if (notification.type === 'peerConnectionFailureError') {
        logToTerminal("❌ ICE Connection Error: Could not negotiate media channel through firewall.", "error");
      } else if (notification.type === 'vertoClientReady') {
        logToTerminal("WebRTC signaling handshake completed successfully.", "success");
      } else {
        logToTerminal(`Signal event received: ${notification.type}`, "info");
      }
      
      if (notification.type === 'callUpdate') {
        const call = notification.call;
        activeCall = call;
        logToTerminal(`Call Session State update: '${call.state}'`, "info");

        switch (call.state) {
          case 'requesting':
          case 'trying':
          case 'ringing':
            handleCallRinging(call.remoteStream, call.state);
            break;
          case 'active':
            logToTerminal("Voice channel open! Remote stream connected.", "success");
            handleCallConnected(call.remoteStream);
            break;
          case 'hangup': {
            const cause = call.cause || 'Unknown Cause';
            const causeCode = call.causeCode || 'N/A';
            const sipCode = call.sipCode || 'N/A';
            const sipReason = call.sipReason || 'N/A';
            logToTerminal(`⚠️ Network Disconnect: ${cause} (SIP Code: ${sipCode}, Reason: ${sipReason}, Cause Code: ${causeCode})`, "warning");
            // Treat hangup as terminal — prevents ghost calls from session resurrection
            handleCallEnded();
            activeCall = null;
            break;
          }
          case 'destroy':
            logToTerminal("Outbound session terminated.", "info");
            handleCallEnded();
            activeCall = null;
            break;
        }
      }
    });

  } catch (error) {
    logToTerminal(`Fatal SDK instantiation error: ${error.message}`, "error");
    console.error('Failed to instantiate Telnyx Client:', error);
    updateStatusUI('error', 'Config Error');
  }
}

/* ==========================================================================
   Call State Machine & Control Handlers
   ========================================================================== */
async function triggerCall() {
  setupAudioContext();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  // Prime remote audio element to prevent mobile autoplay restrictions
  const remoteAudio = document.getElementById('remote-audio');
  if (remoteAudio) {
    try {
      remoteAudio.play().then(() => {
        remoteAudio.pause();
        remoteAudio.currentTime = 0;
      }).catch(() => {});
    } catch (e) {}
  }

  const destination = phoneNumberInput.value.trim();
  if (!destination) {
    logToTerminal("Dial canceled: No phone number entered.", "warning");
    callStatusText.textContent = "Please enter a number";
    callStatusText.style.color = 'var(--rose)';
    return;
  }

  // Standard E.164 sanitization (removing spaces/dashes)
  let formattedDest = destination.replace(/[\s\-\(\)]/g, '');
  if (!formattedDest.startsWith('+')) {
    formattedDest = '+' + formattedDest;
    logToTerminal(`Auto-formatting destination to E.164: ${formattedDest}`, "info");
  }
  logToTerminal(`Initiating outbound call to: ${formattedDest}`, "info");

  if (appConfig.simulation_mode) {
    logToTerminal("Mock Routing: Simulating sandbox call routing profile...", "info");
    transitionCallState('ringing');
    startSimulatedRingback();
    
    // Simulate answering delay (3 seconds)
    setTimeout(() => {
      if (callState === 'ringing') {
        stopSimulatedRingback();
        playSimulatedChime();
        transitionCallState('connected');
        setupSimulatedVisualizer();
      }
    }, 3200);

  } else {
    // ----------------- LIVE PRODUCTION DIAL -----------------
    if (!telnyxClient) {
      logToTerminal("Dial Error: Signaling client is offline or not authenticated.", "error");
      console.warn("Client not ready. Dialing unavailable.");
      return;
    }
    
    transitionCallState('ringing');
    
    try {
      // Configure microphone constraints
      const selectedMicId = micSelect.value;
      const audioConstraints = selectedMicId && selectedMicId !== 'default'
        ? { deviceId: { exact: selectedMicId } }
        : true;

      logToTerminal("Sending dial INVITE payload to carrier network...", "info");
      activeCall = telnyxClient.newCall({
        destinationNumber: formattedDest,
        callerNumber: appConfig.verified_number || undefined,
        audio: audioConstraints,
        remoteElement: document.getElementById('remote-audio')
      });
      
      logToTerminal("Outbound session successfully established locally.", "info");
      // The state updates will be pushed via 'telnyx.notification' in initializeTelnyxSDK
    } catch (e) {
      logToTerminal(`Outbound call failed: ${e.message}`, "error");
      console.error('Outgoing call setup failed:', e);
      handleCallEnded();
      callStatusText.textContent = "Dialing failed: " + e.message;
      callStatusText.style.color = 'var(--rose)';
    }
  }
}

function hangUpCall() {
  logToTerminal("Hanging up current call session...", "info");
  if (appConfig.simulation_mode) {
    stopSimulatedRingback();
    playSimulatedHangup();
    
    // Add simulated call record to logs
    const destination = phoneNumberInput.value.trim();
    saveCallRecord(destination, 'outgoing', callDuration, 'connected');
    
    transitionCallState('idle');
  } else {
    if (activeCall) {
      activeCall.hangup();
    }
    transitionCallState('idle');
  }
}

// Manages all visual states during calling phases
function transitionCallState(state) {
  callState = state;
  console.log(`Call state transitioned: ${state}`);

  if (state === 'idle') {
    // UI cleanups
    btnCall.className = 'control-btn primary-btn call-trigger';
    btnCall.title = "Initiate Call";
    btnCall.style.transform = '';
    
    callStatusText.textContent = "Ready to call";
    callStatusText.style.color = 'var(--text-secondary)';
    
    flagIcon.className = 'flag-icon';
    callTimer.classList.add('hidden');
    btnMute.disabled = true;
    btnMute.classList.remove('muted-active');
    isMuted = false;
    
    // Media & Timers cleanup
    stopTimer();
    cleanupVisualizer();
    
    // Clear remote audio stream
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio) {
      remoteAudio.srcObject = null;
      remoteAudio.pause();
    }
    
  } else if (state === 'ringing') {
    btnCall.className = 'control-btn primary-btn hangup-trigger';
    btnCall.title = "End Call";
    
    callStatusText.textContent = "Ringing...";
    callStatusText.style.color = 'var(--accent-light)';
    flagIcon.classList.add('ringing');
    
  } else if (state === 'connected') {
    btnCall.className = 'control-btn primary-btn hangup-trigger';
    btnCall.title = "End Call";
    
    callStatusText.textContent = "Call Active";
    callStatusText.style.color = 'var(--emerald)';
    flagIcon.classList.remove('ringing');
    
    callTimer.classList.remove('hidden');
    btnMute.disabled = false;
    
    startTimer();
  }
}

// Fallback handlers if SDK emits updates asynchronously
function handleCallRinging(remoteStream, state) {
  logToTerminal(`State transition: ${state.toUpperCase()}. Routing call session...`, "warning");
  transitionCallState('ringing');
  
  if (remoteStream) {
    logToTerminal("Early media stream detected. Routing carrier ringback to speaker...", "info");
    stopSimulatedRingback();
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio) {
      if (remoteAudio.srcObject !== remoteStream) {
        remoteAudio.srcObject = remoteStream;
      }
      remoteAudio.play().then(() => {
        logToTerminal("🔊 Ringback audio playback started successfully.", "success");
      }).catch(err => {
        logToTerminal(`⚠️ Early media playback blocked: ${err.message}`, "warning");
      });
    }
  } else {
    if (!ringbackInterval && simulatedRingbackOscillators.length === 0) {
      logToTerminal("No early media. Playing local simulated ringback tone...", "info");
      startSimulatedRingback();
    }
  }
}

function handleCallConnected(remoteStream) {
  logToTerminal("State transition: ACTIVE. Destination answered the call.", "success");
  stopSimulatedRingback();
  playSimulatedChime();
  transitionCallState('connected');
  if (remoteStream) {
    logToTerminal("Hooking up audio stream to Web Audio visualizer...", "info");
    setupProductionVisualizer(remoteStream);
    
    // Route voice audio track directly to the hidden audio element
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio) {
      remoteAudio.srcObject = remoteStream;
      logToTerminal("🔊 Voice channel linked successfully to system audio outputs.", "success");
      remoteAudio.play().then(() => {
        logToTerminal("🔊 Live voice audio playback started successfully.", "success");
      }).catch(err => {
        logToTerminal(`⚠️ Live voice audio playback blocked: ${err.message}`, "warning");
      });
    } else {
      logToTerminal("Error: Hidden playback <audio> element not found in DOM.", "error");
    }
  } else {
    logToTerminal("Warning: Connected without inbound audio stream tracks.", "warning");
  }
}

function handleCallEnded() {
  logToTerminal("State transition: DESTROYED. Call session ended.", "info");
  stopSimulatedRingback();
  playSimulatedHangup();
  const destination = phoneNumberInput.value.trim();
  saveCallRecord(destination, 'outgoing', callDuration, 'connected');
  transitionCallState('idle');
}

/* ==========================================================================
   Timer / Call Duration Tracker
   ========================================================================== */
function startTimer() {
  stopTimer();
  callDuration = 0;
  callTimer.textContent = "00:00";
  
  timerInterval = setInterval(() => {
    callDuration++;
    const minutes = Math.floor(callDuration / 60).toString().padStart(2, '0');
    const seconds = (callDuration % 60).toString().padStart(2, '0');
    callTimer.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* ==========================================================================
   DTMF & Audio Synthesis Engine (100% Standalone Tones)
   ========================================================================== */

// Plays real analog Touch-Tones on dial pad click
function playDTMF(digit) {
  setupAudioContext();
  if (!DTMF_FREQ[digit] || audioContext.state === 'suspended') return;

  const [f1, f2] = DTMF_FREQ[digit];

  // Create two oscillators to blend the dual tones
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  osc1.frequency.value = f1;
  osc2.frequency.value = f2;

  osc1.type = 'sine';
  osc2.type = 'sine';

  // Output level balancing
  gainNode.gain.setValueAtTime(0.0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(audioContext.destination);

  osc1.start();
  osc2.start();

  osc1.stop(audioContext.currentTime + 0.4);
  osc2.stop(audioContext.currentTime + 0.4);
}

// USA standard ringback tone (440Hz + 480Hz, pulsed 2s on / 4s off)
function startSimulatedRingback() {
  setupAudioContext();
  if (audioContext.state === 'suspended') return;

  stopSimulatedRingback(); // Ensure any existing one is cleared

  function playSingleRing() {
    if (callState !== 'ringing') return;

    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc1.frequency.value = 440;
    osc2.frequency.value = 480;

    osc1.type = 'sine';
    osc2.type = 'sine';

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    
    let time = audioContext.currentTime;
    gainNode.gain.linearRampToValueAtTime(0.08, time + 0.1);
    gainNode.gain.setValueAtTime(0.08, time + 2.0);
    gainNode.gain.linearRampToValueAtTime(0, time + 2.15);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc1.start();
    osc2.start();

    osc1.stop(time + 2.2);
    osc2.stop(time + 2.2);

    simulatedRingbackOscillators.push(osc1, osc2, gainNode);
  }

  // Play the first ring instantly
  playSingleRing();

  // Loop the ring every 6 seconds (2s ring + 4s silence)
  ringbackInterval = setInterval(() => {
    playSingleRing();
  }, 6000);
}

function stopSimulatedRingback() {
  if (ringbackInterval) {
    clearInterval(ringbackInterval);
    ringbackInterval = null;
  }
  if (simulatedRingbackOscillators.length > 0) {
    simulatedRingbackOscillators.forEach(node => {
      try {
        node.stop();
      } catch(e) {}
      try {
        node.disconnect();
      } catch(e) {}
    });
    simulatedRingbackOscillators = [];
  }
}

// Connecting successful call chime
function playSimulatedChime() {
  setupAudioContext();
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(660, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15);

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + 0.45);
}

// Hangup chime
function playSimulatedHangup() {
  setupAudioContext();
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioContext.currentTime);
  osc.frequency.linearRampToValueAtTime(300, audioContext.currentTime + 0.25);

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + 0.35);
}

/* ==========================================================================
   Real-Time Canvas Microphone Visualizer
   ========================================================================== */
function resizeCanvas() {
  visualizerCanvas.width = visualizerCanvas.parentElement.clientWidth;
  visualizerCanvas.height = visualizerCanvas.parentElement.clientHeight;
}

// Set up active visualizer for simulated audio
function setupSimulatedVisualizer() {
  cleanupVisualizer();
  
  visualizerAnalyser = audioContext.createAnalyser();
  visualizerAnalyser.fftSize = 64;
  const bufferLength = visualizerAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  let waveOffset = 0;

  function renderSimWave() {
    if (callState !== 'connected') return;

    waveOffset += 0.15;
    
    // Simulate nice synthetic audio waves using cosine transformations
    for (let i = 0; i < bufferLength; i++) {
      const baseAmp = Math.sin((i / bufferLength) * Math.PI * 2 + waveOffset);
      const subAmp = Math.cos((i / bufferLength) * Math.PI * 4 - waveOffset * 0.7);
      
      // Generate voice packet jitter dynamics
      const simulatedVol = 12 + Math.abs(baseAmp + subAmp * 0.5) * 35;
      dataArray[i] = simulatedVol + (Math.random() * 4);
    }

    drawVisualizerFrame(dataArray, false);
    canvasAnimationId = requestAnimationFrame(renderSimWave);
  }

  renderSimWave();
}

// Production Stream Hookup
async function setupProductionVisualizer(stream) {
  cleanupVisualizer();
  
  try {
    visualizerStream = stream;
    visualizerAnalyser = audioContext.createAnalyser();
    visualizerAnalyser.fftSize = 128;
    
    visualizerSource = audioContext.createMediaStreamSource(stream);
    visualizerSource.connect(visualizerAnalyser);
    
    const bufferLength = visualizerAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function renderProdWave() {
      if (callState !== 'connected') return;
      
      visualizerAnalyser.getByteFrequencyData(dataArray);
      drawVisualizerFrame(dataArray, false);
      
      canvasAnimationId = requestAnimationFrame(renderProdWave);
    }
    
    renderProdWave();
  } catch (e) {
    console.error('Failed to initialize microphone visualizer stream:', e);
    setupSimulatedVisualizer();
  }
}

// Beautiful canvas renderer rendering a sleek digital voice aura
function drawVisualizerFrame(dataArray, isIdle) {
  const width = visualizerCanvas.width;
  const height = visualizerCanvas.height;
  
  canvasCtx.clearRect(0, 0, width, height);

  // Background grid mesh lines
  canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  canvasCtx.lineWidth = 1;
  for (let i = 0; i < width; i += 20) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(i, 0);
    canvasCtx.lineTo(i, height);
    canvasCtx.stroke();
  }

  const barWidth = (width / dataArray.length) * 1.35;
  let barHeight;
  let x = 0;

  // Draw symmetric glowing wave bands from center out
  for (let i = 0; i < dataArray.length; i++) {
    // Normalization factor
    const amplitude = isIdle ? 2 : dataArray[i] / 255 * height * 1.1;
    barHeight = Math.max(2, amplitude);

    const gradient = canvasCtx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
    
    if (callState === 'connected') {
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
      gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.85)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
    } else {
      gradient.addColorStop(0, 'rgba(79, 70, 229, 0.02)');
      gradient.addColorStop(0.5, 'rgba(129, 140, 248, 0.35)');
      gradient.addColorStop(1, 'rgba(79, 70, 229, 0.02)');
    }

    canvasCtx.fillStyle = gradient;
    
    // Rounded soft pill bars centered vertically
    const yPosition = (height / 2) - (barHeight / 2);
    canvasCtx.beginPath();
    canvasCtx.roundRect(x, yPosition, barWidth - 3, barHeight, 4);
    canvasCtx.fill();

    x += barWidth;
  }
}

function cleanupVisualizer() {
  if (canvasAnimationId) {
    cancelAnimationFrame(canvasAnimationId);
    canvasAnimationId = null;
  }
  if (visualizerSource) {
    visualizerSource.disconnect();
    visualizerSource = null;
  }
  visualizerAnalyser = null;
  visualizerStream = null;
  
  // Reset back to idle flat state
  drawVisualizerFrame(new Uint8Array(64), true);
}

/* ==========================================================================
   UI Event Bindings & Helpers
   ========================================================================== */
function setupUIEventListeners() {
  
  // Dialpad Key Clicks
  const keys = document.querySelectorAll('.key-btn');
  keys.forEach(key => {
    key.addEventListener('click', () => {
      const val = key.getAttribute('data-value');
      playDTMF(val);
      if (callState === 'connected' && !appConfig.simulation_mode && activeCall) {
        // In-call: send digit to carrier, do not modify dial field
        activeCall.dtmf(val);
        logToTerminal(`DTMF sent to carrier: ${val}`, "info");
      } else {
        phoneNumberInput.value += val;
        detectCountryFlag();
      }
    });
  });

  // Physical Keyboard Input Hook
  window.addEventListener('keydown', (e) => {
    const key = e.key;

    // Only intercept if we are not focused inside a modal input
    if (document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'phone-number') {
      return;
    }

    if (/[0-9\*#\+]/.test(key)) {
      e.preventDefault();
      const digit = key === '+' ? '0' : key;
      playDTMF(digit);
      if (callState === 'connected' && !appConfig.simulation_mode && activeCall) {
        activeCall.dtmf(digit);
        logToTerminal(`DTMF sent to carrier: ${digit}`, "info");
      } else {
        phoneNumberInput.value += key;
        detectCountryFlag();
      }

      // Visual feedback on dialer
      const matchingBtn = document.querySelector(`.key-btn[data-value="${key}"]`);
      if (matchingBtn) {
        matchingBtn.classList.add('active-press');
        setTimeout(() => matchingBtn.classList.remove('active-press'), 120);
      }
    } else if (key === 'Backspace') {
      e.preventDefault();
      backspaceInput();
    } else if (key === 'Enter') {
      e.preventDefault();
      if (callState === 'idle') triggerCall();
      else if (callState === 'connected' || callState === 'ringing') hangUpCall();
    }
  });

  // Backspace click
  btnBackspace.addEventListener('click', backspaceInput);

  // Big Call Trigger click
  btnCall.addEventListener('click', () => {
    if (callState === 'idle') {
      triggerCall();
    } else {
      hangUpCall();
    }
  });

  // Mute control click
  btnMute.addEventListener('click', () => {
    if (callState !== 'connected') return;

    if (appConfig.simulation_mode) {
      isMuted = !isMuted;
      btnMute.classList.toggle('muted-active', isMuted);
      callStatusText.textContent = isMuted ? "Voice Muted" : "Call Active";
      callStatusText.style.color = isMuted ? 'var(--rose)' : 'var(--emerald)';
    } else {
      if (activeCall) {
        if (isMuted) {
          activeCall.unmute();
          isMuted = false;
          btnMute.classList.remove('muted-active');
        } else {
          activeCall.mute();
          isMuted = true;
          btnMute.classList.add('muted-active');
        }
      }
    }
  });

  // Toggle speaker settings drawer
  btnSpeaker.addEventListener('click', () => {
    audioDrawer.classList.toggle('hidden');
    btnSpeaker.classList.toggle('drawer-active');
  });

  // Close speaker settings drawer
  if (btnCloseAudio) {
    btnCloseAudio.addEventListener('click', () => {
      audioDrawer.classList.add('hidden');
      btnSpeaker.classList.remove('drawer-active');
    });
  }

  // Close speaker settings drawer when clicking outside
  document.addEventListener('click', (e) => {
    if (!audioDrawer.classList.contains('hidden')) {
      if (!audioDrawer.contains(e.target) && !btnSpeaker.contains(e.target)) {
        audioDrawer.classList.add('hidden');
        btnSpeaker.classList.remove('drawer-active');
      }
    }
  });

  // Clear Phone Display actions
  phoneNumberInput.addEventListener('input', detectCountryFlag);

  // Audio Device and Volume Control Listeners
  outputSelect.addEventListener('change', async () => {
    const deviceId = outputSelect.value;
    logToTerminal(`Redirecting speaker output hardware to: ${deviceId}`, "info");
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio && typeof remoteAudio.setSinkId === 'function') {
      try {
        await remoteAudio.setSinkId(deviceId);
        logToTerminal("🔊 Output speaker switched successfully.", "success");
      } catch (err) {
        logToTerminal(`Failed to switch output speaker: ${err.message}`, "error");
      }
    } else {
      logToTerminal("Speaker routing redirect (setSinkId) not supported on this browser.", "warning");
    }

    // Redirect Web Audio Context output speaker if supported
    if (audioContext && typeof audioContext.setSinkId === 'function') {
      try {
        await audioContext.setSinkId(deviceId);
        logToTerminal("🔊 Web Audio context speaker redirected.", "success");
      } catch (err) {
        console.warn("Failed to redirect Web Audio context:", err);
      }
    }
  });

  micSelect.addEventListener('change', () => {
    logToTerminal(`Selected microphone source: ${micSelect.value}`, "info");
  });

  volumeSlider.addEventListener('input', () => {
    const volume = volumeSlider.value;
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio) {
      remoteAudio.volume = volume;
    }
  });

  // Sidebar Panel tab switches
  tabHistory.addEventListener('click', () => switchPane('history'));
  tabContacts.addEventListener('click', () => switchPane('contacts'));

  // Clear Developer Logs
  const btnClearLogs = document.getElementById('btn-clear-logs');
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
      const terminal = document.getElementById('dev-log-terminal');
      if (terminal) {
        terminal.innerHTML = '';
        logToTerminal("🧹 Logs cleared by developer.", "success");
      }
    });
  }

  // Event delegation for call buttons in history and contacts lists
  historyList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-item-call');
    if (btn) quickDial(btn.dataset.number);
  });
  contactsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-item-call');
    if (btn) quickDial(btn.dataset.number);
  });

  // Database actions triggers
  btnClearHistory.addEventListener('click', clearCallHistory);
  btnAddContact.addEventListener('click', () => modalContact.classList.remove('hidden'));
  btnModalCancel.addEventListener('click', () => modalContact.classList.add('hidden'));

  // Save new contact
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = contactNameInput.value.trim();
    const phone = contactPhoneInput.value.trim();
    
    if (name && phone) {
      contactsListDb.push({ name, phone });
      localStorage.setItem('aerovoice_contacts', JSON.stringify(contactsListDb));
      renderContactsList();
      contactForm.reset();
      modalContact.classList.add('hidden');
    }
  });
}

function backspaceInput() {
  const current = phoneNumberInput.value;
  phoneNumberInput.value = current.substring(0, current.length - 1);
  detectCountryFlag();
}

function detectCountryFlag() {
  const number = phoneNumberInput.value.trim();
  
  if (!number) {
    flagIcon.textContent = '🌐';
    return;
  }

  // Find country matching the dialed country code
  const match = COUNTRY_CODES.find(cc => number.startsWith(cc.prefix) || number.replace('+', '').startsWith(cc.prefix.replace('+', '')));
  
  if (match) {
    flagIcon.textContent = match.flag;
  } else {
    flagIcon.textContent = '🌐';
  }
}

function switchPane(target) {
  if (target === 'history') {
    tabHistory.classList.add('active');
    tabContacts.classList.remove('active');
    paneHistory.classList.add('active');
    paneContacts.classList.remove('active');
  } else {
    tabHistory.classList.remove('active');
    tabContacts.classList.add('active');
    paneHistory.classList.remove('active');
    paneContacts.classList.add('active');
  }
}

/* ==========================================================================
   Data Rendering: History & Contacts (localStorage)
   ========================================================================== */

// Escape user-controlled strings before inserting into innerHTML
function sanitize(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function saveCallRecord(number, direction, duration, status) {
  const cId = activeCall?.callId || 'sim-' + Date.now();
  const record = {
    id: Date.now(),
    callId: cId,
    number: number || "Unknown Number",
    name: getContactName(number),
    direction,
    duration,
    status,
    timestamp: new Date().toISOString(),
    costStatus: 'pending' // 'pending' | 'final' | 'error'
  };

  callHistory.unshift(record);
  
  // Bound list to 50 logs max
  if (callHistory.length > 50) {
    callHistory.pop();
  }
  
  localStorage.setItem('aerovoice_history', JSON.stringify(callHistory));
  renderHistoryList();

  // Trigger call cost retrieval in background
  if (duration > 0 && status === 'connected') {
    fetchCallCost(record.id, cId, duration);
  } else {
    record.costStatus = 'error';
    record.cost = '0.0000';
    localStorage.setItem('aerovoice_history', JSON.stringify(callHistory));
    renderHistoryList();
  }
}

async function fetchCallCost(recordId, callId, duration) {
  logToTerminal(`Checking billing records for call...`, "info");
  try {
    const res = await fetch(`/api/call-cost/${callId}?duration=${duration}`);
    const data = await res.json();
    
    // Find the record in our in-memory list
    const index = callHistory.findIndex(item => item.id === recordId);
    if (index !== -1) {
      if (data.success) {
        callHistory[index].costStatus = 'final';
        callHistory[index].cost = data.cost;
        callHistory[index].currency = data.currency || 'USD';
        callHistory[index].attempts = data.attempts;
        logToTerminal(`Billing record loaded in ${data.attempts} checks. Cost: ${data.cost} ${data.currency}`, "success");
      } else {
        callHistory[index].costStatus = 'error';
        callHistory[index].cost = 'N/A';
        logToTerminal(`⚠️ Billing record not available after 10 checks. Marked as N/A.`, "warning");
      }
      localStorage.setItem('aerovoice_history', JSON.stringify(callHistory));
      renderHistoryList();
    }
  } catch (err) {
    console.error("Error fetching call cost:", err);
    const index = callHistory.findIndex(item => item.id === recordId);
    if (index !== -1) {
      callHistory[index].costStatus = 'error';
      callHistory[index].cost = 'N/A';
      localStorage.setItem('aerovoice_history', JSON.stringify(callHistory));
      renderHistoryList();
    }
  }
}

function getContactName(number) {
  const sanitizedInput = number.replace(/[\s\-\(\)\+]/g, '');
  const match = contactsListDb.find(c => c.phone.replace(/[\s\-\(\)\+]/g, '') === sanitizedInput);
  return match ? match.name : null;
}

function renderHistoryList() {
  historyList.innerHTML = '';
  
  if (callHistory.length === 0) {
    historyList.innerHTML = `<div class="empty-state"><p>No recent calls logged</p></div>`;
    return;
  }

  callHistory.forEach(item => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    const minutes = Math.floor(item.duration / 60);
    const seconds = item.duration % 60;
    const durationStr = `${minutes}m ${seconds}s`;

    const displayName = item.name || item.number;
    const initial = sanitize(displayName.charAt(0).toUpperCase());

    // Determine cost HTML (cost/currency come from Telnyx API response — numeric, safe)
    let costBadgeHtml = '';
    if (item.costStatus === 'pending') {
      costBadgeHtml = `<span title="Polling Telnyx CDR...">Checking...</span>`;
    } else if (item.costStatus === 'final') {
      const formattedCost = `${item.currency === 'USD' ? '$' : ''}${item.cost} ${item.currency !== 'USD' ? item.currency : ''}`;
      costBadgeHtml = `<span style="font-family: var(--font-mono); color: var(--text-secondary);" title="Fetched in ${item.attempts || 1} checks">${formattedCost}</span>`;
    } else if (item.costStatus === 'error' && item.cost === 'N/A') {
      costBadgeHtml = `<span title="CDR not compiled by carrier">N/A</span>`;
    }

    const card = document.createElement('div');
    card.className = 'list-item-card';
    card.innerHTML = `
      <div class="item-left-info">
        <div class="avatar">${initial}</div>
        <div class="meta-details">
          <span class="meta-name">${sanitize(displayName)}</span>
          <span class="meta-phone">${item.name ? sanitize(item.number) : ''}</span>
          <div class="meta-sub-row">
            <span class="call-log-icon icon-outgoing">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 2 22 9"></polygon>
              </svg>
            </span>
            <span>Outgoing</span>
            <span>•</span>
            <span>${dateStr}, ${timeStr}</span>
            <span>•</span>
            <span>${durationStr}</span>
            ${costBadgeHtml ? `<span>•</span> ${costBadgeHtml}` : ''}
          </div>
        </div>
      </div>
      <div class="item-right-actions">
        <button class="btn-item-call" data-number="${sanitize(item.number)}" title="Redial">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </button>
      </div>
    `;
    historyList.appendChild(card);
  });
}

function renderContactsList() {
  contactsList.innerHTML = '';
  
  if (contactsListDb.length === 0) {
    contactsList.innerHTML = `<div class="empty-state"><p>No contacts saved yet</p></div>`;
    return;
  }

  // Sort contacts alphabetically
  const sorted = [...contactsListDb].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(c => {
    const initial = sanitize(c.name.charAt(0).toUpperCase());
    const card = document.createElement('div');
    card.className = 'list-item-card';
    card.innerHTML = `
      <div class="item-left-info">
        <div class="avatar">${initial}</div>
        <div class="meta-details">
          <span class="meta-name">${sanitize(c.name)}</span>
          <span class="meta-phone">${sanitize(c.phone)}</span>
        </div>
      </div>
      <div class="item-right-actions">
        <button class="btn-item-call" data-number="${sanitize(c.phone)}" title="Call">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </button>
      </div>
    `;
    contactsList.appendChild(card);
  });
}

function clearCallHistory() {
  if (confirm("Are you sure you want to clear your local call history?")) {
    callHistory = [];
    localStorage.removeItem('aerovoice_history');
    renderHistoryList();
  }
}

function quickDial(number) {
  if (callState !== 'idle') return;
  phoneNumberInput.value = number;
  detectCountryFlag();
  switchPane('history');
  triggerCall();
}
