/* boyerscales.com "play with it" homepage: one phone that holds the live dashboard, a text thread, a call and the booking page. */
(() => {
  const DASH_URL = 'https://dashboard.boyerscales.com/?demo';
  const ELIJAH_SMS = '+19167082759';
  const ELIJAH_EMAIL = 'elijah@boyerscales.com';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = () => matchMedia('(min-width: 900px)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const track = (name, data) => { try { window.bsTrack && window.bsTrack.event(name, data || {}); } catch (_) {} };
  const el = (tag, cls, text) => { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; };

  /* ---------- scroll reveals and the bottom bar ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(n => io.observe(n));
  const bar = $('#bar'), heroFoot = $('.hero-foot'), week = $('#week');
  let pastHero = false, atWeek = false;
  const setBar = () => bar.classList.toggle('on', pastHero && !atWeek);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; setBar(); }).observe(heroFoot);
  new IntersectionObserver(([e]) => { atWeek = e.isIntersecting; setBar(); }).observe(week);

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

  function select(tab, byUser) {
    if (byUser) { touched = true; clearTimeout(tour); track('DemoTab', { tab }); }
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
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = ORDER[(ORDER.indexOf(current) + (e.key === 'ArrowRight' ? 1 : 3)) % 4];
    select(n, true); $('#tab-' + n).focus();
  });
  // Until they touch the phone, it walks through all four on its own so nobody has to guess what is in there.
  const DWELL = { dash: 7000, texts: 11000, calls: 15000, page: 14000 };
  function schedule() {
    clearTimeout(tour);
    if (reduce || touched) return;
    tour = setTimeout(() => { if (!touched && inView) select(ORDER[(ORDER.indexOf(current) + 1) % 4], false); else schedule(); }, DWELL[current]);
  }
  let inView = true;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: .4 }).observe(phone);
  phone.addEventListener('pointerdown', () => { touched = true; clearTimeout(tour); }, { passive: true });

  /* ---------- dashboard: the live app, right in the phone ---------- */
  const live = $('#dashLive'), sheet = $('#sheet'), sheetBody = $('#sheetBody'), dashUse = $('#dashUse'), paneDash = $('#pane-dash');
  let liveFrame = null, lastFocus = null;
  const mkFrame = () => { const f = document.createElement('iframe'); f.src = DASH_URL; f.title = 'Live owner dashboard, sample data'; return f; };
  function fit() {
    if (!liveFrame) return;
    const k = live.clientWidth / 390;
    liveFrame.style.width = '390px'; liveFrame.style.height = Math.ceil(live.clientHeight / k) + 'px'; liveFrame.style.transform = 'scale(' + k + ')';
  }
  function mountLive() {
    if (liveFrame) return;
    liveFrame = mkFrame(); liveFrame.tabIndex = -1; liveFrame.setAttribute('aria-hidden', 'true');
    liveFrame.addEventListener('load', () => setTimeout(() => live.classList.add('on'), 900));
    live.append(liveFrame); fit();
    new ResizeObserver(fit).observe(live);
  }
  function useDash() {
    touched = true; clearTimeout(tour); track('DemoDashboardOpen', {});
    if (wide()) { mountLive(); live.classList.add('on', 'use'); liveFrame.removeAttribute('aria-hidden'); liveFrame.tabIndex = 0; dashUse.hidden = true; paneDash.style.cursor = 'default'; return; }
    lastFocus = document.activeElement;
    if (!$('iframe', sheetBody)) sheetBody.append(mkFrame());
    sheet.hidden = false; document.documentElement.style.overflow = 'hidden';
    $('#sheetClose').focus();
  }
  function closeDash() { sheet.hidden = true; document.documentElement.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  paneDash.addEventListener('click', () => { if (!live.classList.contains('use')) useDash(); });
  $('#sheetClose').addEventListener('click', closeDash);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeDash(); });
  if (document.readyState === 'complete') setTimeout(mountLive, 200); else addEventListener('load', () => setTimeout(mountLive, 200));

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
  const CALL = [
    { who: 'Caller', t: "Hey, do you have anything Saturday morning? It's a full detail on an SUV.", ms: 3600 },
    { who: 'AI receptionist', ai: 1, t: 'I do. Saturday at 9 is open, and a full detail on an SUV is $280. Want me to book it?', ms: 4300 },
    { who: 'Caller', t: "Yeah, let's do it.", ms: 1900 },
    { who: 'AI receptionist', ai: 1, t: "You're set for Saturday at 9. I just texted you the confirmation.", ms: 3400 },
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
      await wait(l.ms); wave.classList.remove('talk'); await wait(450);
    }
    if (my !== callRun) return;
    clearInterval(clock);
    $$('.cl', lines).forEach(n => n.classList.add('old'));
    const b = el('div', 'cl booked'); b.append(el('small', '', 'On the calendar before they hung up'), document.createTextNode('Saturday 9:00 AM · Full detail, SUV · $280')); lines.append(b);
  }

  /* ---------- booking page: tap through the four screens ---------- */
  const story = $('#pane-page'), shots = $$('img', story), bars = $$('.story-bars i', story);
  const SHOT_CAPS = ['Their photos, the price and a Book button on the first screen. Tap for the next one.', 'Two prices, shown by photo. They tap the one that looks like their car.', 'Step 1: pick a time. Taken times are crossed out.', 'Step 2: name and number. Booked, and it lands in the dashboard.'];
  let shot = 0, storyTimer = null;
  function stopStory() { clearTimeout(storyTimer); }
  function show(n) {
    shot = (n + shots.length) % shots.length;
    shots.forEach((im, k) => im.classList.toggle('on', k === shot));
    bars.forEach((b, k) => { b.className = ''; void b.offsetWidth; b.className = k < shot ? 'done' : k === shot ? 'cur' : ''; });
    cap.textContent = SHOT_CAPS[shot];
    clearTimeout(storyTimer); if (!reduce) storyTimer = setTimeout(() => { if (current === 'page') show(shot + 1); }, 3400);
  }
  function startStory() { show(0); }
  story.addEventListener('click', e => { const r = story.getBoundingClientRect(); show(e.clientX - r.left < r.width * .3 ? shot - 1 : shot + 1); track('DemoBookingStory', { screen: shot + 1 }); });
  story.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(shot + 1); } });

  select('dash', false);

  /* ---------- free week: opens a text to Elijah with the shop filled in. No backend needed. ---------- */
  const form = $('#startForm'), handle = $('#handle'), err = $('#handleErr'), how = $('#startHow');
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (!coarse) { how.textContent = 'On a computer this opens an email to me, Elijah, with your shop filled in. I reply to that email.'; $('#startGo').textContent = 'Email it to me'; }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = handle.value.trim();
    if (v.length < 2) { err.hidden = false; handle.focus(); return; }
    err.hidden = true;
    const msg = 'Hey Elijah, set up my free week. My shop is ' + v;
    track('FreeWeekStart', { via: coarse ? 'sms' : 'email' });
    try { window.fbq && window.fbq('track', 'Lead', { content_name: 'free week' }); } catch (_) {}
    location.href = coarse ? 'sms:' + ELIJAH_SMS + '?&body=' + encodeURIComponent(msg)
      : 'mailto:' + ELIJAH_EMAIL + '?subject=' + encodeURIComponent('Free week for ' + v) + '&body=' + encodeURIComponent(msg);
  });
  handle.addEventListener('input', () => { err.hidden = true; });
  $$('[data-try]').forEach(n => n.addEventListener('click', () => track('DemoTap', { demo: n.dataset.try })));
})();
