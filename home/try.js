/* boyerscales.com homepage: one phone that holds the live dashboard, a text thread, a call and the booking page,
   and a free week form that never leaves the page. */
(() => {
  const FREE_API = 'https://dashboard.boyerscales.com/api/public/schedule/boyerscales/free-week';
  const ELIJAH_SMS = '+19167082759';
  // The two things in the phone that are the real product, not a recording.
  const LIVE = {
    dash: { url: 'https://dashboard.boyerscales.com/?demo', open: 'https://dashboard.boyerscales.com/?demo', title: 'Demo · sample customers' },
    page: { url: 'https://valleydetails.site/?demo=1', open: 'https://valleydetails.site/?demo=1', title: 'Demo · nothing gets booked' },
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = () => matchMedia('(min-width: 900px)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const track = (name, data) => { try { window.bsTrack && window.bsTrack.event(name, data || {}); } catch (_) {} };
  const el = (tag, cls, text) => { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; };
  const root = document.documentElement;
  // One lock for everything that opens over the page, so the page behind can't scroll or bounce.
  let locks = 0;
  const lock = on => { locks = Math.max(0, locks + (on ? 1 : -1)); root.classList.toggle('lock', locks > 0); };

  /* ---------- scroll reveals and the bottom bar ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(n => io.observe(n));
  // The bar shows once the first free week button has scrolled away, and steps aside while the second one is on screen.
  const bar = $('#bar'), heroBtn = $('.hero-foot .btn'), weekBtn = $('.week-go .btn');
  let ticking = false;
  function setBar() {
    ticking = false;
    const vh = innerHeight, a = heroBtn.getBoundingClientRect(), b = weekBtn.getBoundingClientRect();
    bar.classList.toggle('on', a.bottom < 0 && !(b.top < vh && b.bottom > 0));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(setBar); } }, { passive: true });
  addEventListener('resize', setBar);
  setBar();

  /* ================= the stage: four things in one phone ================= */
  const seg = $('.seg'), tabs = $$('.seg [role=tab]'), cap = $('#stageCap'), phone = $('#phone');
  const ORDER = ['dash', 'texts', 'calls', 'page'];
  const CAPS = {
    dash: 'The real owner dashboard, running on sample customers.',
    texts: 'You are the customer. Tap a question to send it.',
    calls: 'A sample call. It answers, quotes the price and books.',
    page: '',
  };
  let current = 'dash', touched = false, tour = null;
  const stopTour = () => { touched = true; clearTimeout(tour); seg.classList.remove('auto'); };

  function select(tab, byUser) {
    if (byUser) { stopTour(); track('DemoTab', { tab }); }
    if (tab === current && byUser) return restart(tab);
    current = tab;
    seg.style.setProperty('--i', ORDER.indexOf(tab));
    tabs.forEach(t => { const on = t.dataset.tab === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    ORDER.forEach(k => { $('#pane-' + k).hidden = k !== tab; });
    if (CAPS[tab]) cap.textContent = CAPS[tab];
    restart(tab);
    if (!touched) schedule();
  }
  function restart(tab) {
    stopCall(); stopStory();
    if (tab === 'texts') startTexts();
    if (tab === 'calls') startCall();
    if (tab === 'page') startStory();
  }
  tabs.forEach(t => t.addEventListener('click', () => select(t.dataset.tab, true)));
  seg.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const n = ORDER[(ORDER.indexOf(current) + (fwd ? 1 : 3)) % 4];
    select(n, true); $('#tab-' + n).focus();
  });
  // Until they touch the phone, it walks through all four on its own so nobody has to guess what is in there.
  const DWELL = { dash: 7000, texts: 11000, calls: 21000, page: 14000 };
  function schedule() {
    clearTimeout(tour);
    if (reduce || touched) return;
    seg.style.setProperty('--dwell', DWELL[current] + 'ms');
    seg.classList.remove('auto'); void seg.offsetWidth; seg.classList.add('auto');
    tour = setTimeout(() => { if (!touched && inView && !document.hidden) select(ORDER[(ORDER.indexOf(current) + 1) % 4], false); else schedule(); }, DWELL[current]);
  }
  let inView = true;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: .4 }).observe(phone);
  phone.addEventListener('pointerdown', stopTour, { passive: true });

  /* ---------- the live things: the dashboard and the booking page, right in the phone ---------- */
  const sheet = $('#sheet'), sheetBody = $('#sheetBody'), sheetTitle = $('#sheetTitle'), sheetOpen = $('#sheetOpen');
  const live = { dash: { box: $('#dashLive'), pill: $('#dashUse'), pane: $('#pane-dash'), frame: null, sheetFrame: null },
                 page: { box: $('#pageLive'), pill: $('#pageUse'), pane: $('#pane-page'), frame: null, sheetFrame: null } };
  let lastFocus = null;
  const mkFrame = kind => { const f = document.createElement('iframe'); f.src = LIVE[kind].url; f.title = LIVE[kind].title; return f; };
  // The phone on the page is narrower than a real one, so the live page is laid out at 390 wide and scaled to fit.
  function fit(kind) {
    const L = live[kind]; if (!L.frame || !L.box.clientWidth) return;
    const k = L.box.clientWidth / 390;
    L.frame.style.width = '390px'; L.frame.style.height = Math.ceil(L.box.clientHeight / k) + 'px'; L.frame.style.transform = 'scale(' + k + ')';
  }
  function mount(kind) {
    const L = live[kind]; if (L.frame) return;
    L.frame = mkFrame(kind); L.frame.tabIndex = -1; L.frame.setAttribute('aria-hidden', 'true');
    L.frame.addEventListener('load', () => setTimeout(() => L.box.classList.add('on'), kind === 'dash' ? 900 : 300));
    L.box.append(L.frame); fit(kind);
    new ResizeObserver(() => fit(kind)).observe(L.box);
  }
  function use(kind) {
    const L = live[kind];
    stopTour(); track(kind === 'dash' ? 'DemoDashboardOpen' : 'DemoBookingOpen', {});
    if (wide()) { // big screen: use it right there in the phone
      mount(kind);
      L.box.classList.add('on', 'use'); L.frame.removeAttribute('aria-hidden'); L.frame.tabIndex = 0;
      L.pill.hidden = true; L.pane.classList.add('using');
      if (kind === 'page') { stopStory(); cap.textContent = 'My real booking page. Pick a job and a time. Book is switched off here, so nothing lands on my calendar.'; }
      return;
    }
    // phone: full screen, with a way back and a way out to the real thing
    lastFocus = document.activeElement;
    $$('iframe', sheetBody).forEach(f => { f.hidden = true; });
    if (!L.sheetFrame) { L.sheetFrame = mkFrame(kind); sheetBody.append(L.sheetFrame); }
    L.sheetFrame.hidden = false;
    sheetTitle.textContent = LIVE[kind].title; sheetOpen.href = LIVE[kind].open;
    sheet.hidden = false; lock(true);
    $('#sheetClose').focus();
  }
  function closeSheet() { if (sheet.hidden) return; sheet.hidden = true; lock(false); if (lastFocus) lastFocus.focus(); }
  live.dash.pane.addEventListener('click', () => { if (!live.dash.box.classList.contains('use')) use('dash'); });
  live.page.pill.addEventListener('click', e => { e.stopPropagation(); use('page'); });
  $('#sheetClose').addEventListener('click', closeSheet);
  const warm = () => setTimeout(() => mount('dash'), 200);
  if (document.readyState === 'complete') warm(); else addEventListener('load', warm);

  /* ---------- texts: tap what a customer would send ---------- */
  // Prices are Valley Details' real ones (full detail: $250 car, $280 SUV, $310 truck). The open times are examples.
  const QA = [
    { q: 'How much for a full detail on an SUV?', a: 'A full detail on an SUV is $280, inside and out, and we come to you. Want me to find you a time?' },
    { q: 'Do you come to me?', a: "Yep, we're mobile. We come to your driveway around Elk Grove and south Sacramento. We just need an outlet and a spigot." },
    { q: 'Anything open Saturday?', a: 'Saturday has 9:00 AM and 1:00 PM open. Want one of those?',
      next: { q: '9 works', a: "You're booked with Valley Details on Saturday at 9:00 AM. I'll text you a reminder the day before." } },
  ];
  const thread = $('#thread'), chips = $('#chips');
  let textRun = 0, left = [];
  const down = () => { thread.scrollTop = thread.scrollHeight; };
  function renderChips(my) {
    chips.innerHTML = '';
    if (my !== textRun) return;
    if (!left.length) {
      thread.append(el('div', 'note', 'On your shop it answers with your prices and your calendar.')); down();
      const b = el('button', '', 'Start over'); b.type = 'button'; b.addEventListener('click', () => { track('DemoTextRestart', {}); startTexts(true); }); chips.append(b);
      return;
    }
    left.forEach(item => { const b = el('button', '', item.q); b.type = 'button'; b.addEventListener('click', () => { track('DemoTextSend', { q: item.q }); send(item, my); }); chips.append(b); });
  }
  async function send(item, my) {
    chips.innerHTML = '';
    left = left.filter(x => x !== item);
    thread.append(el('div', 'bub out', item.q)); down();
    await wait(650); if (my !== textRun) return;
    const dots = el('div', 'dots'); dots.innerHTML = '<i></i><i></i><i></i>'; thread.append(dots); down();
    await wait(1100 + Math.min(900, item.a.length * 6)); if (my !== textRun) return;
    dots.remove(); thread.append(el('div', 'bub in', item.a)); down();
    if (item.next) left.unshift(item.next);
    await wait(500); renderChips(my);
  }
  async function startTexts(skipIntro) {
    const my = ++textRun; thread.innerHTML = ''; chips.innerHTML = ''; left = QA.slice();
    thread.append(el('div', 'note', 'Demo thread. Prices are Valley Details’ real ones, times are examples.'));
    if (skipIntro || touched) return renderChips(my);
    await wait(700); if (my !== textRun) return;
    send(left[0], my); // play the first one on its own so the screen is never just sitting there
  }

  /* ---------- calls: a call gets answered and booked ---------- */
  // The caller talks the way people do on the phone: half sentences, a change of mind, a question out of order.
  const CALL = [
    { who: 'Caller', t: "Hey, uh, yeah. Do you guys do Saturdays? I got a Tahoe that's, honestly, it's pretty bad. Kids.", ms: 4300 },
    { who: 'AI receptionist', ai: 1, t: 'We see a lot of those. Yes, Saturday at 9 is open. A full detail on an SUV is $280, inside and out.', ms: 4400 },
    { who: 'Caller', t: 'Okay. Wait, do I gotta bring it somewhere?', ms: 2300 },
    { who: 'AI receptionist', ai: 1, t: 'No, we come to your driveway. We just need an outlet and a spigot. Want the 9?', ms: 3700 },
    { who: 'Caller', t: "Oh nice. Yeah, yeah, let's do that.", ms: 2100 },
    { who: 'AI receptionist', ai: 1, t: "You're set for Saturday at 9. I just texted you the confirmation.", ms: 3200 },
  ];
  const lines = $('#callLines'), wave = $('#wave'), callTime = $('#callTime');
  let callRun = 0, clock = null;
  function stopCall() { callRun++; clearInterval(clock); wave.classList.remove('talk'); }
  async function startCall() {
    stopCall(); const my = callRun; lines.innerHTML = '';
    let s = 0; callTime.textContent = '0:00';
    clock = setInterval(() => { s++; callTime.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 1000);
    await wait(900);
    for (const l of CALL) {
      if (my !== callRun) return;
      $$('.cl', lines).forEach(n => n.classList.add('old'));
      const d = el('div', 'cl ' + (l.ai ? 'ai' : 'who')); d.append(el('small', '', l.who), document.createTextNode(l.t)); lines.append(d);
      wave.classList.add('talk');
      await wait(l.ms); wave.classList.remove('talk'); await wait(l.ai ? 450 : 250);
    }
    if (my !== callRun) return;
    clearInterval(clock);
    $$('.cl', lines).forEach(n => n.classList.add('old'));
    const b = el('div', 'cl booked'); b.append(el('small', '', 'On the calendar before they hung up'), document.createTextNode('Saturday 9:00 AM · Full detail, SUV · $280')); lines.append(b);
  }

  /* ---------- booking page: four screens play, and the real page is one tap away ---------- */
  const story = $('#pane-page'), shots = $$(':scope > img', story), bars = $$('.story-bars i', story);
  const SHOT_CAPS = ['Their photos, the price and a Book button on the first screen.', 'Two prices, shown by photo. They tap the one that looks like their car.', 'Step 1: pick a time. Taken times are crossed out.', 'Step 2: name and number. Booked, and it lands in the dashboard.'];
  let shot = 0, storyTimer = null;
  const usingPage = () => story.classList.contains('using');
  function stopStory() { clearTimeout(storyTimer); }
  function show(n) {
    shot = (n + shots.length) % shots.length;
    shots.forEach((im, k) => im.classList.toggle('on', k === shot));
    bars.forEach((b, k) => { b.className = ''; void b.offsetWidth; b.className = k < shot ? 'done' : k === shot ? 'cur' : ''; });
    cap.textContent = SHOT_CAPS[shot];
    clearTimeout(storyTimer); if (!reduce) storyTimer = setTimeout(() => { if (current === 'page' && !usingPage()) show(shot + 1); }, 3400);
  }
  function startStory() { if (usingPage()) { cap.textContent = 'My real booking page. Book is switched off here, so nothing lands on my calendar.'; return; } show(0); }
  story.addEventListener('click', e => { if (usingPage()) return; const r = story.getBoundingClientRect(); show(e.clientX - r.left < r.width * .3 ? shot - 1 : shot + 1); track('DemoBookingStory', { screen: shot + 1 }); });
  story.addEventListener('keydown', e => { if (usingPage() || e.target !== story) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(shot + 1); } });

  select('dash', false);

  /* ---------- free week: two boxes, sent from this page. Nobody leaves the site. ---------- */
  const free = $('#free'), form = $('#freeForm'), fShop = $('#fShop'), fPhone = $('#fPhone'), err = $('#freeErr'), go = $('#freeGo');
  const ask = $('#freeAsk'), done = $('#freeDone');
  let freeFrom = 'page', freeFocus = null, sending = false;
  const coarse = matchMedia('(pointer: coarse)').matches;
  function openFree(from) {
    if (!free.hidden) return;
    freeFrom = from || 'page'; freeFocus = document.activeElement;
    free.hidden = false; lock(true); bar.classList.remove('on');
    track('FreeWeekOpen', { from: freeFrom });
    // On a phone the keyboard jumping up by itself is jarring, so they tap the box. On a computer the cursor is ready.
    if (!coarse && !ask.hidden) fShop.focus(); else $('.free-x', free).focus({ preventScroll: true });
  }
  function closeFree() { if (free.hidden) return; free.hidden = true; lock(false); setBar(); if (freeFocus && freeFocus.focus) freeFocus.focus({ preventScroll: true }); }
  $$('[data-free]').forEach(b => b.addEventListener('click', () => openFree(b.dataset.free)));
  $$('[data-free-close]').forEach(b => b.addEventListener('click', closeFree));
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!free.hidden) closeFree(); else closeSheet(); });
  const fail = html => { err.innerHTML = html; err.hidden = false; };
  const pretty = d => '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  [fShop, fPhone].forEach(i => i.addEventListener('input', () => { err.hidden = true; }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    const shop = fShop.value.replace(/\s+/g, ' ').trim();
    let d = fPhone.value.replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1);
    if (shop.length < 2) { fail('Type your shop name or Instagram first.'); fShop.focus(); return; }
    if (d.length !== 10) { fail('That number looks short. Use your 10 digit cell.'); fPhone.focus(); return; }
    err.hidden = true; sending = true; go.disabled = true; go.textContent = 'Sending';
    let ok = false;
    try {
      const r = await fetch(FREE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shop, phone: d, source: 'home-' + freeFrom }) });
      const j = await r.json().catch(() => ({}));
      ok = r.ok && j.ok === true;
      if (!ok && r.status === 400 && j.error) { fail(String(j.error).slice(0, 120)); }
    } catch (_) {}
    sending = false; go.disabled = false; go.textContent = 'Send it';
    if (!ok) {
      if (err.hidden) {
        const body = encodeURIComponent('Hey Elijah, set up my free week. My shop is ' + shop);
        fail('That didn’t go through on my end. Text me instead and I’ll take it from there: <a href="sms:' + ELIJAH_SMS + '?&body=' + body + '">(916) 708-2759</a>');
      }
      track('FreeWeekError', { from: freeFrom });
      return;
    }
    track('FreeWeekStart', { via: 'form', from: freeFrom });
    try { window.fbq && window.fbq('track', 'Lead', { content_name: 'free week' }); } catch (_) {}
    $('#freeDoneP').textContent = 'I have ' + shop + ' and I’ll text ' + pretty(d) + ' within 2 days. Nothing to pay. If I need your prices, I’ll ask you there.';
    ask.hidden = true; done.hidden = false; done.focus({ preventScroll: true });
  });
  $$('[data-try]').forEach(n => n.addEventListener('click', () => track('DemoTap', { demo: n.dataset.try })));
})();
