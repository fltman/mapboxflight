const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY;

const NARRATION_INTERVAL = 30_000; // ms between narrations
const LOOK_AHEAD_DIST = 0.005; // ~500m ahead

let lastNarrationTime = 0;
let lastNarrationText = '';
let pendingRequest = false;

let narrationEl = null;

function getNarrationEl() {
  if (!narrationEl) narrationEl = document.getElementById('hud-narration');
  return narrationEl;
}

async function reverseGeocode(lng, lat) {
  // Try POIs first, fallback to place names
  for (const type of ['poi', 'neighborhood', 'place']) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=${type}&limit=3&language=sv&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      return data.features.map((f) => ({
        name: f.text_sv || f.text,
        type: f.place_type?.[0] || type,
        full: f.place_name_sv || f.place_name || f.text,
      }));
    }
  }
  return null;
}

async function askNarrator(places, heading, altitude) {
  if (!OPENROUTER_KEY || OPENROUTER_KEY === 'YOUR_OPENROUTER_KEY_HERE') return null;

  const directionName = headingToDirection(heading);
  const placeList = places.map((p) => `${p.name} (${p.type})`).join(', ');

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
      messages: [
        {
          role: 'system',
          content:
            'Du ar en flygguide. Beskriv kort (max 10 ord) vad piloten narmar sig. Svara pa svenska. Var poetisk och koncis. Bara en mening, ingen punkt pa slutet.',
        },
        {
          role: 'user',
          content: `Flyger ${directionName} pa ${Math.round(altitude)}m hojd. Narliggande platser: ${placeList}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.warn('Narrator API error:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

function headingToDirection(h) {
  const dirs = ['norr', 'nordost', 'ost', 'sydost', 'soder', 'sydvast', 'vast', 'nordvast'];
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
    if (!places || places.length === 0) {
      el.textContent = '';
      return;
    }

    // Show fallback immediately while LLM loads
    el.textContent = places[0].name + ' forover';

    const text = await askNarrator(places, flightState.heading, flightState.altitude);
    if (text && text !== lastNarrationText) {
      lastNarrationText = text;
      el.textContent = text;
    }
  } catch (e) {
    console.warn('Narrator error:', e);
  } finally {
    pendingRequest = false;
  }
}
