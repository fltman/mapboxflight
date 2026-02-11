const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY;
const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_KEY;

const NARRATION_INTERVAL = 10_000; // ms between lookups
const LOOK_AHEAD_DIST = 0.005; // ~500m ahead
const LS_PROMPT_KEY = 'mapboxflight_prompt';
const LS_VOICE_KEY = 'mapboxflight_voice_id';
const LS_SAVED_KEY = 'mapboxflight_saved_prompts';
const MAX_HISTORY = 20; // keep last N exchanges to avoid token overflow

const DEFAULT_PROMPT =
  'You are Captain Sky, a cheerful and adventurous flight explorer narrating a live flyover. Talk like a friendly pilot chatting with passengers. Always mention the place name. Reference earlier places you flew over when relevant ("and just like we saw back at..."). Keep it to ONE short sentence (max 15 words). No period at the end. Be excited and warm!';

let systemPrompt = localStorage.getItem(LS_PROMPT_KEY) || DEFAULT_PROMPT;
let currentVoiceId = localStorage.getItem(LS_VOICE_KEY) || '';
let lastNarrationTime = 0;
let lastNarrationText = '';
let lastPlaceKey = '';
let pendingRequest = false;
let narrationEl = null;
let currentAudio = null;

// Conversation history for context
let conversationHistory = [];

// --- Prompt settings UI ---
export function initPromptUI() {
  const panel = document.getElementById('prompt-panel');
  const textarea = document.getElementById('prompt-text');
  const voiceInput = document.getElementById('voice-id');
  const toggle = document.getElementById('prompt-toggle');
  const closeBtn = document.getElementById('prompt-close');
  const savedSelect = document.getElementById('prompt-saved');
  const nameInput = document.getElementById('prompt-name');
  const saveBtn = document.getElementById('prompt-save');
  const deleteBtn = document.getElementById('prompt-delete');

  textarea.value = systemPrompt;
  voiceInput.value = currentVoiceId;

  // Toggle panel
  toggle.addEventListener('click', () => panel.classList.toggle('hidden'));
  closeBtn.addEventListener('click', () => panel.classList.add('hidden'));

  // Live update prompt on edit
  textarea.addEventListener('input', () => {
    systemPrompt = textarea.value;
    localStorage.setItem(LS_PROMPT_KEY, systemPrompt);
    lastPlaceKey = ''; // force re-narration with new prompt
    conversationHistory = []; // reset history on prompt change
  });

  // Live update voice id on edit
  voiceInput.addEventListener('input', () => {
    currentVoiceId = voiceInput.value.trim();
    localStorage.setItem(LS_VOICE_KEY, currentVoiceId);
  });

  // Save prompt (with voice id)
  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    const saved = getSavedPrompts();
    saved[name] = { prompt: textarea.value, voiceId: voiceInput.value.trim() };
    localStorage.setItem(LS_SAVED_KEY, JSON.stringify(saved));
    nameInput.value = '';
    refreshSavedList(savedSelect);
  });

  // Load saved prompt
  savedSelect.addEventListener('change', () => {
    const name = savedSelect.value;
    if (!name) return;
    const saved = getSavedPrompts();
    const entry = saved[name];
    if (!entry) return;
    // Backwards compat: old entries are plain strings
    const profile = typeof entry === 'string' ? { prompt: entry, voiceId: '' } : entry;
    textarea.value = profile.prompt;
    systemPrompt = profile.prompt;
    localStorage.setItem(LS_PROMPT_KEY, systemPrompt);
    voiceInput.value = profile.voiceId || '';
    currentVoiceId = profile.voiceId || '';
    localStorage.setItem(LS_VOICE_KEY, currentVoiceId);
    lastPlaceKey = '';
    conversationHistory = [];
  });

  // Delete saved prompt
  deleteBtn.addEventListener('click', () => {
    const name = savedSelect.value;
    if (!name) return;
    const saved = getSavedPrompts();
    delete saved[name];
    localStorage.setItem(LS_SAVED_KEY, JSON.stringify(saved));
    refreshSavedList(savedSelect);
  });

  refreshSavedList(savedSelect);
}

function getSavedPrompts() {
  try {
    return JSON.parse(localStorage.getItem(LS_SAVED_KEY) || '{}');
  } catch {
    return {};
  }
}

function refreshSavedList(select) {
  const saved = getSavedPrompts();
  select.innerHTML = '<option value="">-- Sparade --</option>';
  for (const name of Object.keys(saved)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
}

// --- TTS via ElevenLabs ---
async function speakText(text) {
  if (!currentVoiceId || !ELEVENLABS_KEY || ELEVENLABS_KEY === 'YOUR_KEY') return;

  // Stop previous audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${currentVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
        }),
      }
    );

    if (!res.ok) {
      console.warn('[TTS] ElevenLabs error:', res.status, await res.text());
      return;
    }

    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    currentAudio = audio;
    audio.play();
  } catch (e) {
    console.warn('[TTS] error:', e);
  }
}

// --- Geocoding & narration ---
function getNarrationEl() {
  if (!narrationEl) narrationEl = document.getElementById('hud-narration');
  return narrationEl;
}

async function reverseGeocode(lng, lat) {
  for (const type of ['poi', 'neighborhood', 'place']) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=${type}&limit=3&language=en&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      return data.features.map((f) => ({
        name: f.text,
        type: f.place_type?.[0] || type,
        full: f.place_name || f.text,
      }));
    }
  }
  return null;
}

async function askNarrator(places, heading, altitude) {
  if (!OPENROUTER_KEY || OPENROUTER_KEY === 'YOUR_OPENROUTER_KEY_HERE') return null;

  const directionName = headingToDirection(heading);
  const placeList = places.map((p) => `${p.name} (${p.type})`).join(', ');
  const userMsg = `Flying ${directionName} at ${Math.round(altitude)}m altitude. Nearby: ${placeList}`;

  // Build messages: system + conversation history + new user message
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMsg },
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MapboxFlight',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4.5',
      max_tokens: 60,
      messages,
    }),
  });

  if (!res.ok) {
    console.warn('[Narrator] API error:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || null;

  if (reply) {
    // Append exchange to history
    conversationHistory.push({ role: 'user', content: userMsg });
    conversationHistory.push({ role: 'assistant', content: reply });

    // Trim history to avoid token overflow
    while (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory.shift();
      conversationHistory.shift();
    }
  }

  return reply;
}

function headingToDirection(h) {
  const dirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  return dirs[Math.round(h / 45) % 8];
}

export async function updateNarration(flightState) {
  const now = Date.now();
  if (pendingRequest || now - lastNarrationTime < NARRATION_INTERVAL) return;

  pendingRequest = true;
  lastNarrationTime = now;

  const el = getNarrationEl();
  if (!el) return;

  try {
    const headingRad = (flightState.heading * Math.PI) / 180;
    const aheadLng = flightState.lng + Math.sin(headingRad) * LOOK_AHEAD_DIST;
    const aheadLat = flightState.lat + Math.cos(headingRad) * LOOK_AHEAD_DIST;

    const places = await reverseGeocode(aheadLng, aheadLat);
    console.log('[Narrator] lookup:', { lng: aheadLng.toFixed(4), lat: aheadLat.toFixed(4), places });
    if (!places || places.length === 0) {
      el.textContent = '';
      return;
    }

    // Skip LLM call if same places as last time
    const placeKey = places.map((p) => p.name).join('|');
    if (placeKey === lastPlaceKey) {
      console.log('[Narrator] same places, skipping LLM');
      return;
    }
    lastPlaceKey = placeKey;
    console.log('[Narrator] new places, calling LLM (history:', conversationHistory.length / 2, 'exchanges)');

    // Show fallback immediately while LLM loads
    el.textContent = places[0].name + ' ahead!';

    const text = await askNarrator(places, flightState.heading, flightState.altitude);
    if (text && text !== lastNarrationText) {
      lastNarrationText = text;
      el.textContent = text;
      speakText(text);
    }
  } catch (e) {
    console.warn('[Narrator] error:', e);
  } finally {
    pendingRequest = false;
  }
}
