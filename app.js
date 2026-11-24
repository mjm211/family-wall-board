/* Family Wall Board prototype. Plain JavaScript, no build step. */
(() => {
  'use strict';

  const D = window.BOARD_DATA;
  const T = D.settings.times;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const MODES = {
    planner: { icon: '🗓️', label: 'Planner', hello: 'Our week', bg: '#1f3a6e' },
    morning: { icon: '☀️', label: 'Morning', hello: 'Good morning!', bg: '#f29f1c' },
    menu: { icon: '🍽️', label: 'Menu', hello: 'Dinner time!', bg: '#8a3324' },
    bedtime: { icon: '🌙', label: 'Bedtime', hello: 'Time for bed', bg: '#3b3a7a' },
    sleep: { icon: '💤', label: 'Sleep', hello: 'Good night', bg: '#05060a' }
  };

  const MOM = {
    home: { icon: '🏠', text: 'Mom is home' },
    work: { icon: '💼', text: 'Mom is at work' },
    sleep: { icon: '😴', text: 'Mom is sleeping' }
  };

  const NOTE_SCREENS = [
    ['planner', 'Planner'], ['morning', 'Kid morning'], ['menu', 'Menu and dinner vote'],
    ['bedtime', 'Kid bedtime'], ['other', 'Anything else']
  ];

  /* ---------- small helpers ---------- */

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  // Saved taps live in this browser only. Falls back to memory if storage is blocked.
  const mem = {};
  const store = {
    get(key, fallback) {
      if (key in mem) return mem[key];
      try {
        const raw = localStorage.getItem('fwb:' + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      mem[key] = value;
      try { localStorage.setItem('fwb:' + key, JSON.stringify(value)); } catch (e) { /* memory only */ }
    }
  };

  // The preview bar can pretend it is another time of day.
  let simOffset = 0;
  const now = () => new Date(Date.now() + simOffset);
  function pretendTime(hhmm) {
    if (!hhmm) { simOffset = 0; return; }
    const [h, m] = hhmm.split(':').map(Number);
    const t = new Date();
    t.setHours(h, m, 0, 0);
    simOffset = t.getTime() - Date.now();
  }

  const mins = (d) => d.getHours() * 60 + d.getMinutes();
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dayData = (d) => D.week[d.getDay()];
  const longDate = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

  function clockHTML(d) {
    const h = d.getHours();
    return `${h % 12 || 12}:${pad(d.getMinutes())}<small>${h < 12 ? 'am' : 'pm'}</small>`;
  }

  /* ---------- which screen, by the clock ---------- */

  function autoMode(d) {
    const t = mins(d);
    if (t >= toMin(T.sleepStart) || t < toMin(T.sleepEnd)) return 'sleep';
    if (t >= toMin(T.morningStart) && t < toMin(T.morningEnd)) return 'morning';
    if (t >= toMin(T.menuStart) && t < toMin(T.bedtimeStart)) return 'menu';
    if (t >= toMin(T.bedtimeStart) && t < toMin(T.bedtimeEnd)) return 'bedtime';
    return 'planner';
  }
  const isEvening = (d) => mins(d) >= toMin(T.eveningStart) || mins(d) < toMin(T.sleepEnd);

  let manualMode = null; // null means follow the clock
  let mode = null;
  let overlay = null;    // { type, offset }
  let kidFoodAway = null;
  let curtainTimers = [];

  /* ---------- sound ---------- */

  let audio;
  function tone(freq, start, dur, type = 'triangle', vol = 0.14) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const t = audio.currentTime + start;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch (e) { /* no sound available */ }
  }
  const sfx = {
    done() { tone(660, 0, 0.15); tone(990, 0.1, 0.28); },
    undo() { tone(300, 0, 0.2, 'sine', 0.1); },
    pick() { tone(784, 0, 0.22); },
    kidDone() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.32)); },
    party() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.13, 0.36, 'square', 0.06)); }
  };

  function confetti() {
    const box = $('#confetti');
    const colors = ['#2b7de9', '#ee7a1f', '#d64545', '#1f8a8a', '#f2c230', '#7fb38a'];
    let html = '';
    for (let i = 0; i < 90; i++) {
      const style = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};` +
        `animation-delay:${(Math.random() * 0.9).toFixed(2)}s;animation-duration:${(2.4 + Math.random() * 1.8).toFixed(2)}s;` +
        `transform:rotate(${Math.floor(Math.random() * 360)}deg)`;
      html += `<i style="${style}"></i>`;
    }
    box.innerHTML = html;
    setTimeout(() => { box.innerHTML = ''; }, 5200);
  }

  /* ---------- dinner and votes ---------- */

  const votesFor = (date) => store.get('vote:' + dayKey(date), {});

  // Returns the winning option number, 'tie', or null while a vote is still open.
  function voteResult(date) {
    const votes = votesFor(date);
    const picks = D.kids.map((k) => votes[k.id]);
    if (picks.some((p) => p == null)) return null;
    return picks.every((p) => p === picks[0]) ? picks[0] : 'tie';
  }

  function dinnerLabel(date) {
    const dinner = dayData(date).dinner;
    if (!dinner.vote) return { text: dinner.dish, note: dinner.note, vote: false };
    const res = voteResult(date);
    if (typeof res === 'number') return { text: dinner.vote[res].name, note: 'the kids voted', vote: false };
    return { text: dinner.vote.map((o) => o.name).join(' or '), vote: true };
  }

  /* ---------- planner ---------- */

  function buildPlannerShell() {
    $('#screen-planner').innerHTML = `
      <header class="topbar">
        <div class="brand"><h1>Our Week</h1><span>Organized &amp; Connected</span></div>
        <div class="countdown" id="p-countdown"></div>
        <div class="clock" data-clock></div>
      </header>
      <div class="planner-grid">
        <article class="today" id="p-today"></article>
        <div class="week" id="p-week"></div>
        <aside class="rail">
          <h2><i class="dot red"></i>Dinner this week</h2>
          <ol class="dinners" id="p-dinners"></ol>
          <figure class="photo" id="p-photo"></figure>
          <button class="groc-btn" data-action="groceries">
            <span class="groc-icon">🛒</span><span>Groceries</span><span class="groc-count" id="p-groc-count"></span>
          </button>
        </aside>
      </div>`;

    const photo = $('#p-photo');
    photo.innerHTML = D.photos.map((src, i) => `<img src="${esc(src)}" alt="" class="${i === 0 ? 'on' : ''}">`).join('');
    let shown = 0;
    setInterval(() => {
      const imgs = $$('img', photo);
      if (imgs.length < 2) return;
      imgs[shown].classList.remove('on');
      shown = (shown + 1) % imgs.length;
      imgs[shown].classList.add('on');
    }, D.settings.photoSeconds * 1000);
  }

  function countdownHTML(d) {
    const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const next = D.countdowns
      .map((c) => ({ ...c, when: new Date(c.date + 'T00:00:00') }))
      .filter((c) => c.when >= today)
      .sort((a, b) => a.when - b.when)[0];
    if (!next) return '';
    const sleeps = Math.round((next.when - today) / 86400000);
    if (sleeps === 0) return `<span class="cd-pic">${next.pic}</span><b>Today is ${esc(next.name)}!</b>`;
    return `<span class="cd-pic">${next.pic}</span><b>${sleeps}</b> ${sleeps === 1 ? 'sleep' : 'sleeps'} until ${esc(next.name)}`;
  }

  function eventsHTML(events, emptyText) {
    if (!events.length) return `<p class="quiet">${emptyText}</p>`;
    return `<ul class="events">${events.map((e) => `<li><time>${esc(e.time)}</time><span>${esc(e.what)}</span></li>`).join('')}</ul>`;
  }

  function groceryCount() {
    const checked = store.get('groceries', {});
    return D.groceries.reduce((n, g) => n + g.items.filter((item) => !checked[item]).length, 0);
  }

  function renderPlanner() {
    const d = now();
    const today = dayData(d);
    const mom = MOM[today.mom.status];
    const away = mins(d) >= toMin(T.kidFoodAway);
    if (kidFoodAway === null) kidFoodAway = away;
    const tonight = dinnerLabel(d);

    $('#p-countdown').innerHTML = countdownHTML(d);

    $('#p-today').innerHTML = `
      <header class="today-head">
        <div class="eyebrow">Today</div>
        <h2>${DAYS[d.getDay()]}</h2>
        <div class="date">${longDate(d)}</div>
      </header>
      <div class="mom-pill mom-${today.mom.status}">
        <span class="mom-icon">${mom.icon}</span>
        <span><b>${mom.text}</b>${today.mom.shift ? `<em>${esc(today.mom.shift)}</em>` : ''}</span>
      </div>
      ${today.star ? `<div class="star"><span>★</span>${esc(today.star)}</div>` : ''}
      <section class="kidfood ${kidFoodAway ? 'away' : ''}" id="p-kidfood"><div class="kidfood-in">
        <h3><i class="dot red"></i>Kids' breakfast &amp; lunch</h3>
        <p><b>Breakfast</b>${esc(today.breakfast)}</p>
        <p><b>Lunch</b>${esc(today.lunch)}</p>
      </div></section>
      <section class="block grow">
        <h3><i class="dot teal"></i>Today's plan</h3>
        ${eventsHTML(today.events, 'Nothing on the calendar.')}
      </section>
      <section class="block tonight">
        <h3><i class="dot red"></i>Dinner tonight</h3>
        <p>${esc(tonight.text)}${tonight.vote ? ' <button class="chip-btn" data-action="vote" data-offset="0">Vote</button>' : ''}</p>
      </section>`;

    // Render with the old state first, then flip it, so the box visibly slides.
    if (away !== kidFoodAway) {
      kidFoodAway = away;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const box = $('#p-kidfood');
        if (box) box.classList.toggle('away', away);
      }));
    }

    let cards = '';
    let dinners = '';
    for (let i = 0; i < 7; i++) {
      const date = addDays(d, i);
      const day = dayData(date);
      const label = dinnerLabel(date);
      dinners += `
        <li class="${i === 0 ? 'is-today' : ''}">
          <span class="d">${i === 0 ? 'Today' : DAYS_SHORT[date.getDay()]}</span>
          <span class="dish">${esc(label.text)}</span>
          ${label.vote ? `<button class="chip-btn" data-action="vote" data-offset="${i}">Vote</button>` : ''}
        </li>`;
      if (i === 0) continue;
      const m = MOM[day.mom.status];
      cards += `
        <article class="day">
          <header>
            <h3>${i === 1 ? 'Tomorrow' : DAYS[date.getDay()]}<span>${date.getDate()}</span></h3>
            <span class="mom-icon" title="${m.text}">${m.icon}</span>
          </header>
          ${day.mom.shift ? `<div class="shift-chip">${esc(day.mom.shift)}</div>` : ''}
          ${day.star ? `<div class="star small"><span>★</span>${esc(day.star)}</div>` : ''}
          <div class="mini-food"><i class="dot red"></i><span><b>B</b> ${esc(day.breakfast)}<br><b>L</b> ${esc(day.lunch)}</span></div>
          <div class="mini-events"><i class="dot teal"></i>${eventsHTML(day.events, 'Nothing planned')}</div>
        </article>`;
    }
    $('#p-week').innerHTML = cards;
    $('#p-dinners').innerHTML = dinners;

    const count = groceryCount();
    $('#p-groc-count').textContent = count;
    $('#p-groc-count').classList.toggle('zero', count === 0);
  }

  /* ---------- kid modes ---------- */

  const taskState = () => store.get('tasks:' + dayKey(now()), {});
  const kidTasksDone = (state, which, kidId) =>
    D.routines[which].every((t) => state[which] && state[which][kidId] && state[which][kidId][t.id]);

  function renderKid(which, popped) {
    const state = taskState();
    const tasks = D.routines[which];
    const today = dayData(now());
    const showVote = which === 'morning' && today.dinner.vote && voteResult(now()) === null;

    const halves = D.kids.map((k) => {
      const mine = (state[which] && state[which][k.id]) || {};
      const doneCount = tasks.filter((t) => mine[t.id]).length;
      const allDone = doneCount === tasks.length;
      const stars = tasks.map((t, i) => `<span class="${i < doneCount ? 'lit' : ''}">★</span>`).join('');
      const buttons = tasks.map((t) => `
        <button class="task ${mine[t.id] ? 'done' : ''} ${popped === k.id + ':' + t.id ? 'pop' : ''}"
                data-action="task" data-which="${which}" data-kid="${k.id}" data-task="${t.id}">
          <span class="pic">${t.pic}</span><span class="word">${esc(t.word)}</span><span class="check">✓</span>
        </button>`).join('');
      return `
        <div class="half ${allDone ? 'all-done' : ''}" style="--kid:${k.color};--kid-soft:${k.soft};--kid-dark:${k.dark}">
          <header>
            <span class="character">${k.character}</span>
            <div><h2>${esc(k.name)}</h2><div class="stars">${stars}</div></div>
            <div class="cheer">${allDone ? 'All done!' : ''}</div>
          </header>
          <div class="tasks">${buttons}</div>
        </div>`;
    }).join('');

    $('#screen-' + which).innerHTML = `
      <header class="kid-top ${which}">
        <h1>${which === 'morning' ? '☀️ Good morning!' : '🌙 Time for bed'}</h1>
        ${showVote ? '<button class="kid-vote" data-action="vote" data-offset="0">🍽️ Pick tonight\'s dinner</button>' : ''}
        <div class="clock" data-clock>${clockHTML(now())}</div>
      </header>
      <div class="kid-halves">${halves}</div>`;
  }

  function tapTask(which, kidId, taskId) {
    const key = 'tasks:' + dayKey(now());
    const state = store.get(key, {});
    const wasEveryone = D.kids.every((k) => kidTasksDone(state, which, k.id));
    state[which] = state[which] || {};
    state[which][kidId] = state[which][kidId] || {};
    const nowDone = !state[which][kidId][taskId];
    state[which][kidId][taskId] = nowDone;
    store.set(key, state);
    renderKid(which, kidId + ':' + taskId);

    const everyone = D.kids.every((k) => kidTasksDone(state, which, k.id));
    if (!nowDone) sfx.undo();
    else if (everyone && !wasEveryone) celebrate(which);
    else if (kidTasksDone(state, which, kidId)) sfx.kidDone();
    else sfx.done();
  }

  function celebrate(which) {
    sfx.party();
    confetti();
    openOverlay('party', { which });
    setTimeout(() => { if (overlay && overlay.type === 'party') closeOverlay(); }, 6000);
  }

  /* ---------- menu ---------- */

  function renderMenu() {
    const d = now();
    const dinner = dayData(d).dinner;
    const label = dinnerLabel(d);
    const tomorrow = dinnerLabel(addDays(d, 1));

    const body = label.vote
      ? `<div class="menu-vs">${dinner.vote.map((o) => `<div><span class="menu-pic">${o.pic}</span><h1>${esc(o.name)}</h1></div>`).join('<em>or</em>')}</div>
         <button class="menu-vote" data-action="vote" data-offset="0">Kids, cast your vote</button>`
      : `<h1 class="menu-dish">${esc(label.text)}</h1>
         ${label.note ? `<p class="menu-note">${esc(label.note)}</p>` : ''}`;

    $('#screen-menu').innerHTML = `
      <div class="menu-card">
        <div class="menu-orn">✦ &nbsp; ✦ &nbsp; ✦</div>
        <div class="menu-eyebrow">Tonight's Dinner</div>
        <div class="menu-date">${DAYS[d.getDay()]}, ${longDate(d)}</div>
        <div class="menu-rule"></div>
        ${body}
        <div class="menu-rule"></div>
        <footer>
          ${dinner.recipe ? `<a href="${esc(dinner.recipe)}" target="_blank" rel="noopener">Recipe for the grown-ups ›</a>` : '<span></span>'}
          <span>Tomorrow: ${esc(tomorrow.text)}</span>
        </footer>
      </div>`;
  }

  function renderSleep() {
    $('#screen-sleep').innerHTML = `<div class="sleep-clock" data-clock>${clockHTML(now())}</div>`;
  }

  /* ---------- overlays: groceries, vote, party, notes ---------- */

  function groceriesHTML() {
    const checked = store.get('groceries', {});
    const groups = D.groceries.map((g) => `
      <h3>${esc(g.group)}</h3>
      <ul>${g.items.map((item) => `
        <li><button class="groc-item ${checked[item] ? 'got' : ''}" data-action="grocery" data-item="${esc(item)}">
          <span class="box">${checked[item] ? '✓' : ''}</span><span>${esc(item)}</span>
        </button></li>`).join('')}</ul>`).join('');
    return `
      <aside class="panel groceries">
        <header><div><h2>Grocery &amp; ingredients</h2><span>Weekly shopping · ${groceryCount()} to get</span></div>
          <button class="close" data-action="close" aria-label="Close">✕</button></header>
        <div class="panel-body">${groups}</div>
      </aside>`;
  }

  function voteHTML(offset) {
    const date = addDays(now(), offset);
    const options = dayData(date).dinner.vote;
    const votes = votesFor(date);
    const res = voteResult(date);
    const result = res === null ? ''
      : res === 'tie' ? "It's a tie! A grown-up gets to pick."
      : `${esc(options[res].name)} wins! 🎉`;
    const cards = options.map((o, i) => `
      <div class="vote-opt ${res === i ? 'winner' : ''}">
        <div class="vote-pic">${o.pic}</div>
        <div class="vote-dish">${esc(o.name)}</div>
        <div class="vote-kids">${D.kids.map((k) => `
          <button class="vote-kid ${votes[k.id] === i ? 'picked' : ''}" style="--kid:${k.color};--kid-soft:${k.soft}"
                  data-action="vote-pick" data-offset="${offset}" data-kid="${k.id}" data-opt="${i}">
            <span>${k.character}</span>${esc(k.name)}
          </button>`).join('')}</div>
      </div>`).join('<div class="vote-or">or</div>');
    return `
      <div class="card vote">
        <h2>What's for dinner ${offset === 0 ? 'tonight' : 'on ' + DAYS[date.getDay()]}?</h2>
        <p>Tap your name under the dinner you want.</p>
        <div class="vote-opts">${cards}</div>
        <div class="vote-result">${result}</div>
        <button class="btn" data-action="close">Done</button>
      </div>`;
  }

  function partyHTML(which) {
    return `
      <div class="card party" data-action="close">
        <div class="party-chars">${D.kids.map((k) => `<span>${k.character}</span>`).join('')}</div>
        <h2>${which === 'morning' ? 'Ready to go!' : 'Ready for bed!'}</h2>
        <p>Great job, ${D.kids.map((k) => esc(k.name)).join(' and ')}!</p>
      </div>`;
  }

  function notesHTML() {
    const notes = store.get('notes', {});
    return `
      <div class="card notes">
        <header><h2>Notes for Matt</h2><button class="close" data-action="close" aria-label="Close">✕</button></header>
        <p>Jot down what works and what doesn't. Notes save on this device as you type. Tap Send when you're done.</p>
        <div class="notes-grid">${NOTE_SCREENS.map(([id, name]) => `
          <label><span>${name}</span><textarea data-note="${id}" rows="3" placeholder="What do you think?">${esc(notes[id] || '')}</textarea></label>`).join('')}
        </div>
        <footer><span id="notes-status"></span><button class="btn" data-action="send-notes">Send my notes</button></footer>
      </div>`;
  }

  function renderOverlay() {
    const root = $('#overlay-root');
    if (!overlay) { root.className = ''; root.innerHTML = ''; return; }
    root.className = 'open ' + overlay.type;
    if (overlay.type === 'groceries') root.innerHTML = groceriesHTML();
    if (overlay.type === 'vote') root.innerHTML = voteHTML(overlay.offset);
    if (overlay.type === 'party') root.innerHTML = partyHTML(overlay.which);
    if (overlay.type === 'notes') root.innerHTML = notesHTML();
  }
  function openOverlay(type, extra = {}) { overlay = { type, ...extra }; renderOverlay(); }
  function closeOverlay() { overlay = null; renderOverlay(); }

  async function sendNotes() {
    const notes = store.get('notes', {});
    const text = 'Family Wall Board notes\n\n' + NOTE_SCREENS
      .filter(([id]) => (notes[id] || '').trim())
      .map(([id, name]) => `${name}:\n${notes[id].trim()}`)
      .join('\n\n');
    const status = $('#notes-status');
    try {
      if (navigator.share) { await navigator.share({ title: 'Family Wall Board notes', text }); status.textContent = ''; return; }
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied. Paste it into a text or email.';
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      status.textContent = 'Could not copy. Select the text in the boxes and copy it by hand.';
    }
  }

  /* ---------- switching screens ---------- */

  function showScreen(next) {
    $$('.screen').forEach((el) => el.classList.toggle('active', el.id === 'screen-' + next));
    document.body.dataset.mode = next;
  }

  function switchMode(next, instant) {
    if (next === mode) return;
    mode = next;
    if (overlay && overlay.type !== 'notes') closeOverlay();
    curtainTimers.forEach(clearTimeout);
    const curtain = $('#curtain');
    curtain.classList.remove('run');
    if (instant) { showScreen(next); return; }
    $('#curtain-icon').textContent = MODES[next].icon;
    $('#curtain-text').textContent = MODES[next].hello;
    curtain.style.background = MODES[next].bg;
    void curtain.offsetWidth; // restart the animation
    curtain.classList.add('run');
    curtainTimers = [
      setTimeout(() => showScreen(next), 600),
      setTimeout(() => curtain.classList.remove('run'), 1700)
    ];
  }

  function renderAll() {
    renderPlanner();
    renderKid('morning');
    renderKid('bedtime');
    renderMenu();
    renderSleep();
    if (overlay && overlay.type !== 'notes') renderOverlay();
  }

  /* ---------- preview bar (prototype only) ---------- */

  const PRETEND_TIMES = [
    ['', 'right now'], ['06:30', '6:30 am'], ['07:25', '7:25 am'], ['08:45', '8:45 am'],
    ['12:00', 'noon'], ['17:15', '5:15 pm'], ['18:30', '6:30 pm'],
    ['19:10', '7:10 pm'], ['21:00', '9:00 pm'], ['23:30', '11:30 pm']
  ];

  function buildPreviewBar() {
    const modeButtons = [['auto', '⏱️ By the clock'], ...Object.entries(MODES).map(([id, m]) => [id, `${m.icon} ${m.label}`])]
      .map(([id, label]) => `<button data-action="mode" data-mode="${id}">${label}</button>`).join('');
    $('#preview-bar').innerHTML = `
      <span class="pb-title">Preview</span>
      <div class="pb-modes">${modeButtons}</div>
      <label class="pb-time">Pretend it's
        <select id="pb-clock">${PRETEND_TIMES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      </label>
      <button data-action="reset">↺ Reset taps</button>
      <button class="pb-notes" data-action="notes">✏️ Notes</button>`;
    $('#pb-clock').addEventListener('change', (e) => {
      pretendTime(e.target.value);
      manualMode = null;
      lastMinute = null;
      tick();
    });
  }

  function updatePreviewBar() {
    const active = manualMode || 'auto';
    $$('#preview-bar [data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === active));
  }

  /* ---------- clock tick ---------- */

  let lastMinute = null;
  function tick() {
    const d = now();
    const html = clockHTML(d);
    $$('[data-clock]').forEach((el) => { if (el.innerHTML !== html) el.innerHTML = html; });
    const minute = dayKey(d) + ' ' + mins(d);
    if (minute === lastMinute) return;
    const first = lastMinute === null && mode === null;
    lastMinute = minute;
    document.body.classList.toggle('evening', isEvening(d));
    renderAll();
    switchMode(manualMode || autoMode(d), first);
    updatePreviewBar();
  }

  // Nudge the whole board a few pixels now and then, to spare an always-on screen.
  function driftAgainstBurnIn() {
    const px = () => (Math.random() * 6 - 3).toFixed(1) + 'px';
    $('#stage').style.transform = `translate(${px()}, ${px()})`;
  }

  /* ---------- taps ---------- */

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) {
      if (overlay && e.target.id === 'overlay-root') closeOverlay();
      return;
    }
    const a = el.dataset;
    switch (a.action) {
      case 'mode':
        manualMode = a.mode === 'auto' ? null : a.mode;
        switchMode(manualMode || autoMode(now()));
        updatePreviewBar();
        break;
      case 'task':
        tapTask(a.which, a.kid, a.task);
        break;
      case 'groceries':
        openOverlay('groceries');
        break;
      case 'grocery': {
        const checked = store.get('groceries', {});
        checked[a.item] = !checked[a.item];
        store.set('groceries', checked);
        renderOverlay();
        renderPlanner();
        break;
      }
      case 'vote':
        openOverlay('vote', { offset: Number(a.offset) });
        break;
      case 'vote-pick': {
        const date = addDays(now(), Number(a.offset));
        const votes = votesFor(date);
        votes[a.kid] = Number(a.opt);
        store.set('vote:' + dayKey(date), votes);
        const res = voteResult(date);
        if (typeof res === 'number') { sfx.kidDone(); confetti(); } else sfx.pick();
        renderAll();
        break;
      }
      case 'notes':
        openOverlay('notes');
        break;
      case 'send-notes':
        sendNotes();
        break;
      case 'reset': {
        const d = now();
        store.set('tasks:' + dayKey(d), {});
        for (let i = 0; i < 7; i++) store.set('vote:' + dayKey(addDays(d, i)), {});
        store.set('groceries', {});
        renderAll();
        break;
      }
      case 'close':
        closeOverlay();
        if (mode) renderAll();
        break;
    }
  });

  document.addEventListener('input', (e) => {
    const id = e.target.dataset && e.target.dataset.note;
    if (!id) return;
    const notes = store.get('notes', {});
    notes[id] = e.target.value;
    store.set('notes', notes);
  });

  /* ---------- go ---------- */

  buildPlannerShell();
  buildPreviewBar();
  tick();
  setInterval(tick, 1000);
  setInterval(driftAgainstBurnIn, 4 * 60 * 1000);
})();
