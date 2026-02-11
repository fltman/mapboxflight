const TRACKS = [
  '/Untitled (51).mp3',
  '/Untitled (52).mp3',
  '/Untitled (53).mp3',
  '/Untitled (54).mp3',
  '/Untitled (55).mp3',
  '/Untitled (56).mp3',
  '/Untitled (57).mp3',
  '/Untitled (58).mp3',
  '/Untitled (59).mp3',
  '/Untitled (60).mp3',
];

let audio = null;
let playing = false;
let trackIndex = Math.floor(Math.random() * TRACKS.length);

function loadTrack() {
  const wasPlaying = playing;
  if (audio) audio.pause();

  audio = new Audio(TRACKS[trackIndex]);
  audio.volume = 0.35;
  audio.addEventListener('ended', () => {
    trackIndex = (trackIndex + 1) % TRACKS.length;
    loadTrack();
    audio.play();
  });

  if (wasPlaying) {
    audio.play().catch((e) => console.warn('[Music] play failed:', e));
  }
}

export function initMusicPlayer() {
  const btn = document.getElementById('music-toggle');
  const skipBtn = document.getElementById('music-skip');

  btn.addEventListener('click', () => {
    if (!audio) loadTrack();

    if (playing) {
      audio.pause();
      playing = false;
      btn.textContent = 'Music';
      btn.classList.remove('playing');
    } else {
      audio.play().catch((e) => console.warn('[Music] play failed:', e));
      playing = true;
      btn.textContent = 'Music \u25A0';
      btn.classList.add('playing');
    }
  });

  skipBtn.addEventListener('click', () => {
    trackIndex = (trackIndex + 1) % TRACKS.length;
    loadTrack();
    if (playing) {
      audio.play().catch((e) => console.warn('[Music] play failed:', e));
    }
  });
}
