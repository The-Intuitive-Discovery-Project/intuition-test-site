(() => {
  'use strict';
  const MANIFEST_URL = 'sounds.json';
  const STORAGE_KEY = 'soundIntuition.v1';
  const RECENT_LIMIT = 12;
  const HISTORY_LIMIT = 100;
  const COUNT_WEIGHTS = [0.56, 0.29, 0.15];

  const $ = id => document.getElementById(id);
  const els = {
    gentle: $('gentleMode'), volume: $('volumeSlider'), volumeText: $('volumeText'), impressions: $('impressions'), charCount: $('charCount'),
    lock: $('lockButton'), replay: $('replayButton'), reveal: $('revealButton'), next: $('nextButton'), playPanel: $('playPanel'), revealPanel: $('revealPanel'),
    revealList: $('revealList'), error: $('errorMessage'), roundBadge: $('roundBadge'), roundTitle: $('roundTitle'), roundHelp: $('roundHelp'), playStatus: $('playStatus'),
    roundsCompleted: $('roundsCompleted'), libraryCount: $('libraryCount'), historyButton: $('historyButton'), historyDialog: $('historyDialog'), historyList: $('historyList'),
    closeHistory: $('closeHistory'), closeHistoryBottom: $('closeHistoryBottom'), clearHistory: $('clearHistory')
  };

  let library = [];
  let state = loadState();
  let currentTargets = [];
  let currentAudios = [];
  let phase = 'writing';

  function defaultState() {
    return { version: 1, gentleMode: false, volume: 75, usage: {}, recent: [], history: [], completed: 0 };
  }
  function loadState() {
    try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return defaultState(); }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    els.roundsCompleted.textContent = state.completed || state.history.length || 0;
  }
  function showError(message) { els.error.textContent = message; els.error.classList.remove('hidden'); }
  function clearError() { els.error.textContent = ''; els.error.classList.add('hidden'); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function randInt(max) { return Math.floor(Math.random() * max); }
  function weightedCount() {
    const r = Math.random();
    if (r < COUNT_WEIGHTS[0]) return 1;
    if (r < COUNT_WEIGHTS[0] + COUNT_WEIGHTS[1]) return 2;
    return 3;
  }

  function eligibleLibrary() {
    const gentle = els.gentle.checked;
    return library.filter(s => s.enabled !== false && s.production_file && (!gentle || Number(s.startle_level || 1) <= 1));
  }

  function balancedPick(pool, count) {
    const chosen = [];
    const blocked = new Set(state.recent || []);
    const usedCats = new Set();
    for (let i = 0; i < count; i++) {
      let candidates = pool.filter(s => !chosen.some(c => c.id === s.id) && !blocked.has(s.id));
      if (!candidates.length) candidates = pool.filter(s => !chosen.some(c => c.id === s.id));
      if (!candidates.length) break;

      const minUse = Math.min(...candidates.map(s => Number(state.usage[s.id] || 0)));
      let fair = candidates.filter(s => Number(state.usage[s.id] || 0) <= minUse + 1);
      const diverse = fair.filter(s => !usedCats.has(s.category));
      if (diverse.length) fair = diverse;
      const pick = fair[randInt(fair.length)];
      chosen.push(pick);
      usedCats.add(pick.category);
    }
    return chosen;
  }

  function selectTargets() {
    const pool = eligibleLibrary();
    if (!pool.length) throw new Error('No playable sounds are available for the current settings.');
    const count = Math.min(weightedCount(), pool.length);
    return balancedPick(pool, count);
  }

  function stopAudio() {
    currentAudios.forEach(a => { try { a.pause(); a.currentTime = 0; } catch {} });
    currentAudios = [];
  }

  function volumeFor(sound, count) {
    const master = clamp(Number(els.volume.value) / 100, .25, 1);
    const mixScale = count === 1 ? .86 : count === 2 ? .56 : .42;
    const startle = Number(sound.startle_level || 1);
    const startleScale = startle >= 3 ? .58 : startle === 2 ? .72 : 1;
    return clamp(master * mixScale * startleScale, .08, .9);
  }

  function pathFor(sound) {
    return sound.production_file.replace(/^audio-normalized\//, 'audio-normalized/');
  }

  async function playTargets() {
    clearError();
    stopAudio();
    if (!currentTargets.length) return;
    const audios = currentTargets.map(sound => {
      const a = new Audio();
      a.preload = 'auto';
      a.src = pathFor(sound);
      a.volume = volumeFor(sound, currentTargets.length);
      return a;
    });
    currentAudios = audios;
    els.playStatus.textContent = currentTargets.length === 1 ? 'Playing your hidden sound…' : `Playing a hidden mix of ${currentTargets.length} sounds…`;
    const results = await Promise.allSettled(audios.map(a => a.play()));
    if (results.every(r => r.status === 'rejected')) {
      showError('The audio files are not staged on this test build yet. The Sound Intuition engine is ready, but the normalized audio folder must be copied into this app path before playback can work.');
    } else if (results.some(r => r.status === 'rejected')) {
      showError('One sound in this mix could not play. You can reveal this round or move to the next one.');
    }
  }

  function recordUsage(targets) {
    targets.forEach(t => { state.usage[t.id] = Number(state.usage[t.id] || 0) + 1; });
    state.recent = [...targets.map(t => t.id), ...(state.recent || []).filter(id => !targets.some(t => t.id === id))].slice(0, RECENT_LIMIT);
  }

  function lockRound() {
    if (phase !== 'writing') return;
    clearError();
    const text = els.impressions.value.trim();
    if (!text) { showError('Write at least one impression before locking in.'); els.impressions.focus(); return; }
    try { currentTargets = selectTargets(); } catch (e) { showError(e.message); return; }
    phase = 'locked';
    els.impressions.disabled = true;
    els.lock.classList.add('hidden');
    els.playPanel.classList.remove('hidden');
    els.roundBadge.textContent = 'Locked in';
    els.roundTitle.textContent = 'Listen without changing your impressions';
    els.roundHelp.textContent = 'Replay if you want, then reveal when you are ready.';
    recordUsage(currentTargets);
    saveState();
    playTargets();
  }

  function revealRound() {
    if (phase !== 'locked') return;
    stopAudio();
    phase = 'revealed';
    els.revealList.innerHTML = '';
    currentTargets.forEach(t => {
      const item = document.createElement('div'); item.className = 'reveal-item';
      const strong = document.createElement('strong'); strong.textContent = t.reveal_label || t.id;
      const small = document.createElement('small'); small.textContent = t.category || 'sound';
      item.append(strong, small); els.revealList.appendChild(item);
    });
    els.revealPanel.classList.remove('hidden');
    els.reveal.disabled = true;
    els.roundBadge.textContent = 'Revealed';
    const entry = {
      at: new Date().toISOString(),
      impressions: els.impressions.value.trim(),
      gentleMode: els.gentle.checked,
      targetIds: currentTargets.map(t => t.id),
      targets: currentTargets.map(t => t.reveal_label || t.id)
    };
    state.history.unshift(entry);
    state.history = state.history.slice(0, HISTORY_LIMIT);
    state.completed = Number(state.completed || 0) + 1;
    saveState();
  }

  function newRound() {
    stopAudio(); currentTargets = []; phase = 'writing'; clearError();
    els.impressions.disabled = false; els.impressions.value = ''; els.charCount.textContent = '0';
    els.lock.classList.remove('hidden'); els.playPanel.classList.add('hidden'); els.revealPanel.classList.add('hidden'); els.reveal.disabled = false;
    els.roundBadge.textContent = 'Ready'; els.roundTitle.textContent = 'What do you notice?'; els.roundHelp.textContent = 'Type any impressions that come to you before hearing the sound.';
    els.impressions.focus({ preventScroll: true });
  }

  function renderHistory() {
    els.historyList.innerHTML = '';
    if (!state.history.length) { const p=document.createElement('p'); p.textContent='No saved rounds yet.'; els.historyList.appendChild(p); return; }
    state.history.forEach(entry => {
      const item=document.createElement('article'); item.className='history-item';
      const time=document.createElement('time'); time.dateTime=entry.at; time.textContent=new Date(entry.at).toLocaleString();
      const p=document.createElement('p'); p.textContent=entry.impressions;
      const targets=document.createElement('div'); targets.className='history-targets'; targets.textContent='Revealed: '+(entry.targets||[]).join(' + ');
      item.append(time,p,targets); els.historyList.appendChild(item);
    });
  }

  async function init() {
    els.gentle.checked = Boolean(state.gentleMode);
    els.volume.value = Number(state.volume || 75); els.volumeText.textContent = `${els.volume.value}%`; saveState();
    try {
      const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
      const manifest = await response.json();
      library = Array.isArray(manifest) ? manifest : manifest.sounds || [];
      els.libraryCount.textContent = library.length;
    } catch (e) {
      showError('The sound manifest could not load. This test page needs sounds.json beside app.js.');
      els.lock.disabled = true;
    }
  }

  els.impressions.addEventListener('input', () => els.charCount.textContent = els.impressions.value.length);
  els.lock.addEventListener('click', lockRound);
  els.replay.addEventListener('click', playTargets);
  els.reveal.addEventListener('click', revealRound);
  els.next.addEventListener('click', newRound);
  els.gentle.addEventListener('change', () => { state.gentleMode = els.gentle.checked; saveState(); });
  els.volume.addEventListener('input', () => { state.volume = Number(els.volume.value); els.volumeText.textContent = `${els.volume.value}%`; currentAudios.forEach((a,i)=>{ if(currentTargets[i]) a.volume=volumeFor(currentTargets[i],currentTargets.length); }); saveState(); });
  els.historyButton.addEventListener('click', () => { renderHistory(); els.historyDialog.showModal(); });
  els.closeHistory.addEventListener('click', () => els.historyDialog.close());
  els.closeHistoryBottom.addEventListener('click', () => els.historyDialog.close());
  els.clearHistory.addEventListener('click', () => { if (confirm('Clear all saved Sound Intuition history on this device?')) { state.history=[]; state.completed=0; saveState(); renderHistory(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
  window.addEventListener('pagehide', stopAudio);
  init();
})();
