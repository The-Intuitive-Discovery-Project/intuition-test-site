(() => {
  'use strict';
  const MANIFEST_URLS = Array.from({length:8}, (_, i) => `sounds-${String(i + 1).padStart(2, '0')}.json`);
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
  let playbackToken = 0;

  function defaultState() {
    return { version: 1, gentleMode: false, volume: 75, usage: {}, recent: [], history: [], completed: 0 };
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const merged = { ...defaultState(), ...(saved && typeof saved === 'object' ? saved : {}) };
      if (!merged.usage || typeof merged.usage !== 'object' || Array.isArray(merged.usage)) merged.usage = {};
      if (!Array.isArray(merged.recent)) merged.recent = [];
      if (!Array.isArray(merged.history)) merged.history = [];
      merged.volume = clamp(Number(merged.volume) || 75, 25, 100);
      merged.completed = Math.max(0, Number(merged.completed) || 0);
      return merged;
    } catch { return defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
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
    return library.filter(s => s && s.id && s.enabled !== false && typeof s.production_file === 'string' && s.production_file && (!gentle || Number(s.startle_level || 1) <= 1));
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
    return balancedPick(pool, Math.min(weightedCount(), pool.length));
  }

  function stopAudio() {
    playbackToken++;
    currentAudios.forEach(a => { try { a.pause(); a.currentTime = 0; a.removeAttribute('src'); a.load(); } catch {} });
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
    return String(sound.production_file || '').replace(/\\/g, '/').replace(/^\.\//, '');
  }

  async function playTargets() {
    clearError();
    stopAudio();
    if (!currentTargets.length || phase !== 'locked') return;
    const token = playbackToken;
    const audios = currentTargets.map(sound => {
      const a = new Audio();
      a.preload = 'auto';
      a.src = pathFor(sound);
      a.volume = volumeFor(sound, currentTargets.length);
      return a;
    });
    currentAudios = audios;
    els.replay.disabled = true;
    els.playStatus.textContent = currentTargets.length === 1 ? 'Playing your hidden sound…' : `Playing a hidden mix of ${currentTargets.length} sounds…`;
    const results = await Promise.allSettled(audios.map(a => a.play()));
    if (token !== playbackToken || phase !== 'locked') return;
    els.replay.disabled = false;
    const rejected = results.filter(r => r.status === 'rejected').length;
    if (rejected === results.length) {
      showError('The hidden audio could not start. Check that the normalized audio files are present, then tap Play Again.');
    } else if (rejected) {
      showError('One sound in this mix could not play. You can try Play Again, reveal this round, or move to the next one.');
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
    els.gentle.disabled = true;
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
    els.replay.disabled = true;
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
    state.history.unshift({
      at: new Date().toISOString(), impressions: els.impressions.value.trim(), gentleMode: els.gentle.checked,
      targetIds: currentTargets.map(t => t.id), targets: currentTargets.map(t => t.reveal_label || t.id)
    });
    state.history = state.history.slice(0, HISTORY_LIMIT);
    state.completed = Number(state.completed || 0) + 1;
    saveState();
  }

  function newRound() {
    stopAudio(); currentTargets = []; phase = 'writing'; clearError();
    els.impressions.disabled = false; els.gentle.disabled = false; els.impressions.value = ''; els.charCount.textContent = '0';
    els.lock.classList.remove('hidden'); els.playPanel.classList.add('hidden'); els.revealPanel.classList.add('hidden'); els.reveal.disabled = false; els.replay.disabled = false;
    els.roundBadge.textContent = 'Ready'; els.roundTitle.textContent = 'What do you notice?'; els.roundHelp.textContent = 'Type any impressions that come to you before hearing the sound.';
    try { els.impressions.focus({ preventScroll: true }); } catch { els.impressions.focus(); }
  }

  function renderHistory() {
    els.historyList.innerHTML = '';
    if (!state.history.length) { const p=document.createElement('p'); p.textContent='No saved rounds yet.'; els.historyList.appendChild(p); return; }
    state.history.forEach(entry => {
      const item=document.createElement('article'); item.className='history-item';
      const time=document.createElement('time'); time.dateTime=entry.at; time.textContent=new Date(entry.at).toLocaleString();
      const p=document.createElement('p'); p.textContent=entry.impressions || '';
      const targets=document.createElement('div'); targets.className='history-targets'; targets.textContent='Revealed: '+(Array.isArray(entry.targets) ? entry.targets : []).join(' + ');
      item.append(time,p,targets); els.historyList.appendChild(item);
    });
  }

  async function init() {
    els.gentle.checked = Boolean(state.gentleMode);
    els.volume.value = state.volume; els.volumeText.textContent = `${els.volume.value}%`; saveState();
    try {
      const responses = await Promise.all(MANIFEST_URLS.map(url => fetch(url, { cache: 'no-store' })));
      const failed = responses.find(r => !r.ok);
      if (failed) throw new Error(`Manifest returned ${failed.status}`);
      const parts = await Promise.all(responses.map(r => r.json()));
      if (parts.some(part => !Array.isArray(part))) throw new Error('Manifest format is invalid');
      library = parts.flat().filter(Boolean);
      const ids = library.map(s => s.id);
      if (!library.length || new Set(ids).size !== ids.length) throw new Error('Manifest IDs are empty or duplicated');
      els.libraryCount.textContent = library.length;
    } catch (e) {
      showError('The sound library could not load. Refresh this page and try again.');
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
