/* BoyerScales Tour. No framework, no build step.
   Every text-message string below is the real template from the Valley Details
   system (Client Dash server.js) filled in for an example customer. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Underline anything that reads as a link inside a text bubble.
  const linkify = s => esc(s).replace(/((?:dashboard\.boyerscales\.com|valleydetails\.site|g\.page)[^\s]*)/g, '<u>$1</u>');
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));

  /* ---------------- clean URLs, refresh starts at the top ---------------- */
  // In-page links scroll without writing #section into the address bar, and a
  // refresh (or an old link that still has a #hash) always opens at the top.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  toTop();
  addEventListener('load', toTop, { once: true });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!id || !target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (id === 'main') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });

  /* ---------------- nav state ---------------- */
  const nav = $('#nav');
  const darkSecs = $$('.sec-dark');
  const stageSecs = $$('section[data-stage]');
  const railItems = $$('#stageRail li');
  const mcta = $('#mcta');
  const themeMeta = $('meta[name="theme-color"]');
  const hero = $('.hero');
  const start = $('#start');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, navH = nav.offsetHeight;
    nav.classList.toggle('scrolled', y > 8);
    const onDark = darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= navH && r.bottom > navH; });
    nav.classList.toggle('on-dark', onDark);
    // Safari tints its top bar from theme-color, so keep it matching the section under the nav.
    const tint = onDark ? '#0b0d11' : '#f4f2ee';
    if (themeMeta && themeMeta.content !== tint) themeMeta.content = tint;
    const first = stageSecs[0].getBoundingClientRect(), last = stageSecs[stageSecs.length - 1].getBoundingClientRect();
    nav.classList.toggle('in-stages', first.top <= navH + 40 && last.bottom > navH + 40);
    let cur = null;
    for (const s of stageSecs) if (s.getBoundingClientRect().top <= innerHeight * 0.4) cur = s.dataset.stage;
    railItems.forEach(li => li.classList.toggle('on', li.dataset.stage === cur));
    if (mcta) {
      const pastHero = hero.getBoundingClientRect().bottom < 0;
      const atStart = start.getBoundingClientRect().top < innerHeight;
      mcta.classList.toggle('show', pastHero && !atStart);
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- reveal on scroll ---------------- */
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---------------- the loop ---------------- */
  const LOOP = [
    { k: '01', stage: 'Get found', label: 'Found', title: 'Someone finds you',
      body: 'A Google search, a map result, a friend\'s link. What they see there decides whether they tap through.',
      vd: 'A complete Google Business Profile, a phone-first site with prices up front, and markup search engines can read.', href: '#found' },
    { k: '02', stage: 'Get booked', label: 'Booked', title: 'They book without calling',
      body: 'Pick a time, add the car, done. No account, no deposit, no phone tag. If they\'d rather call, the call gets answered and booked too.',
      vd: 'Online booking against the live schedule, including two-car and drop-off jobs.', href: '#booked' },
    { k: '03', stage: 'Follow up', label: 'Confirmed', title: 'They get a text right away',
      body: 'A confirmation from the business\'s own number, with a private link to change the time.',
      vd: 'Blue SMS confirmation with a reschedule link, plus an ask to opt in to deals.', href: '#follow-up' },
    { k: '03', stage: 'Follow up', label: 'Reminded', title: 'They don\'t forget',
      body: 'A reminder the day before and an hour before, so showing up is the easy thing to do.',
      vd: 'Automatic texts 1 day and 1 hour out, each guaranteed to send only once.', href: '#follow-up' },
    { k: '··', stage: 'Your part', label: 'Detailed', yours: true, title: 'You do the detail',
      body: 'No system does this part. Everything around it exists so you can focus on the car.',
      vd: 'The owner marks the job complete in the dashboard. That starts everything after it.', href: '#owner' },
    { k: '04', stage: 'Bring them back', label: 'Reviewed', chord: 0, title: 'They\'re asked for a review',
      body: 'A thank-you text with the review link while the car still looks new. Reviews help the next stranger trust you, which feeds straight back into getting found.',
      vd: 'Review request sent automatically when a job is marked complete.', href: '#back' },
    { k: '04', stage: 'Bring them back', label: 'Referred', chord: 1, title: 'They send a friend',
      body: 'Their own link: $20 off for the friend, and $20 off for them once the friend\'s job is done. A new customer who arrives already trusting you.',
      vd: 'Referral links and credits tracked per customer and applied automatically.', href: '#back' },
    { k: '04', stage: 'Bring them back', label: 'Rebooked', title: 'They come back',
      body: 'A nudge when they\'re due, a win-back if they go quiet, and offers like a prepaid pack. The next booking comes from someone you already earned.',
      vd: 'Texts at 14, 28, 45 and 75 days, the Valley 3-Pack, and open-slot deals. Promos only go to people who opted in.', href: '#back' },
  ];
  (function loop() {
    const svg = $('.ring'); if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const C = 200, R = 138, N = LOOP.length;
    svg.setAttribute('viewBox', '-70 -8 540 416');
    $('.ring-track').setAttribute('r', R);
    const ang = i => -Math.PI / 2 + (i / N) * Math.PI * 2;
    const pt = (a, r = R) => [C + Math.cos(a) * r, C + Math.sin(a) * r];
    const arcs = $('#ringArcs'), nodes = $('#ringNodes'), runner = $('#runner'), chord = $('#chord');
    const arcEls = [], nodeEls = [];
    const gap = 0.16;
    for (let i = 0; i < N; i++) {
      const a0 = ang(i) + gap, a1 = ang(i + 1) - gap;
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}`);
      p.setAttribute('class', 'ring-arc');
      arcs.appendChild(p); arcEls.push(p);

      const [nx, ny] = pt(ang(i));
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'ring-node' + (LOOP[i].yours ? ' yours' : ''));
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${LOOP[i].label}: ${LOOP[i].title}`);
      const hit = document.createElementNS(NS, 'circle');
      hit.setAttribute('cx', (nx + pt(ang(i), R + 30)[0]) / 2); hit.setAttribute('cy', (ny + pt(ang(i), R + 30)[1]) / 2);
      hit.setAttribute('r', 34); hit.setAttribute('class', 'hit');
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'dot');
      c.setAttribute('cx', nx); c.setAttribute('cy', ny); c.setAttribute('r', 15);
      const n = document.createElementNS(NS, 'text');
      n.setAttribute('x', nx); n.setAttribute('y', ny + 3.5); n.setAttribute('text-anchor', 'middle'); n.setAttribute('class', 'n');
      n.textContent = String(i + 1);
      const [lx, ly] = pt(ang(i), R + 30);
      const t = document.createElementNS(NS, 'text');
      const cos = Math.cos(ang(i));
      t.setAttribute('x', lx); t.setAttribute('y', ly + 4.5);
      t.setAttribute('text-anchor', Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end');
      if (Math.abs(cos) < 0.2) t.setAttribute('y', ly + (Math.sin(ang(i)) < 0 ? -2 : 12));
      t.textContent = LOOP[i].label;
      g.append(hit, c, n, t);
      nodes.appendChild(g); nodeEls.push(g);
      const choose = () => { stopAuto(); select(i, true); };
      g.addEventListener('click', choose);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
    }

    let cur = 0, runAngle = ang(0), animId = 0;
    // Autoplay always moves forward around the loop. A tap takes the shorter way,
    // so picking the previous step slides back instead of lapping the whole ring.
    function moveRunner(target, shortest) {
      cancelAnimationFrame(animId);
      const TAU = Math.PI * 2, from = runAngle;
      let delta = ((target - from) % TAU + TAU) % TAU;
      if (shortest && delta > Math.PI) delta -= TAU;
      const to = from + delta;
      const place = a => { const [x, y] = pt(a); runner.setAttribute('cx', x); runner.setAttribute('cy', y); };
      const settle = () => { runAngle = ((to % TAU) + TAU) % TAU; place(runAngle); };
      if (reduce || Math.abs(delta) < 0.001) { settle(); return; }
      const t0 = performance.now(), dur = 600 + Math.abs(delta) * 160;
      const step = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        runAngle = from + delta * e;
        place(runAngle);
        if (k < 1) animId = requestAnimationFrame(step); else settle();
      };
      animId = requestAnimationFrame(step);
    }
    function select(i, shortest = false) {
      cur = i;
      const d = LOOP[i];
      nodeEls.forEach((g, j) => g.classList.toggle('on', j === i));
      arcEls.forEach((a, j) => a.classList.toggle('on', j < i));
      moveRunner(ang(i), shortest);
      if (d.chord != null) {
        // Bow the arrow toward the ring's edge so it never crosses the center label.
        const a0 = ang(i), a1 = ang(d.chord), TAU = Math.PI * 2;
        const diff = ((a1 - a0) % TAU + TAU + Math.PI) % TAU - Math.PI;
        const [x0, y0] = pt(a0 + diff * 0.12, R - 20), [x1, y1] = pt(a1 - diff * 0.12, R - 20);
        const [cx, cy] = pt(a0 + diff / 2, R * 0.9);
        chord.setAttribute('d', `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`);
        chord.classList.add('on');
      } else chord.classList.remove('on');
      $('#ringK').textContent = d.k === '··' ? '' : d.k;
      $('#ringL').textContent = d.stage;
      const panel = $('#loopPanel');
      $('#lpTag').innerHTML = `<i>${d.k === '··' ? '—' : d.k}</i>${esc(d.stage)}`;
      $('#lpTitle').textContent = d.title;
      $('#lpBody').textContent = d.body;
      $('#lpVd').textContent = d.vd;
      const link = $('#lpLink'); link.href = d.href;
      panel.classList.remove('fade'); void panel.offsetWidth; panel.classList.add('fade');
    }
    let auto = null, stopped = false;
    function stopAuto() { stopped = true; clearInterval(auto); auto = null; }
    function startAuto() { if (stopped || auto || reduce) return; auto = setInterval(() => select((cur + 1) % N), 4200); }
    select(0);
    const w = $('#loop-widget');
    new IntersectionObserver(([e]) => { if (e.isIntersecting) startAuto(); else { clearInterval(auto); auto = null; } }, { threshold: 0.4 }).observe(w);
  })();

  /* ---------------- booked: pins follow the notes ---------------- */
  (function pins() {
    const notes = $$('.notes li'), pinEls = $$('.pin'), phones = $('.booked-phones');
    const hot = n => {
      if (phones) phones.classList.toggle('has-hot', n > 0);
      notes.forEach((li, i) => li.classList.toggle('hot', i + 1 === n));
      pinEls.forEach(p => p.classList.toggle('hot', +p.textContent === n));
    };
    notes.forEach((li, i) => {
      li.addEventListener('mouseenter', () => hot(i + 1));
      li.addEventListener('focusin', () => hot(i + 1));
    });
    if (matchMedia('(max-width: 900px)').matches || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) hot(notes.indexOf(e.target) + 1); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    notes.forEach(li => io.observe(li));
  })();

  /* ---------------- Blue SMS player ---------------- */
  const OPT_IN = ' Want first dibs on open slots and deals? Reply YES and get $10 off your next detail.';
  const STOP = ' Reply STOP to opt out.';
  const SCENES = {
    booked: [
      { when: 'At booking', what: 'Confirmation', why: 'Goes out the moment they book, from the business\'s own number, with a private link to that one appointment.',
        msgs: [{ stamp: 'Wed, Sep 16 at 4:12 PM' },
          { out: 'Hi Marcus, you\'re booked with Valley Details on Saturday, October 3 at 10:00 AM. Confirm or change your time here: dashboard.boyerscales.com/schedule/valleydetails?appt=…' + OPT_IN }] },
      { when: 'Their reply', what: 'They opt in', why: 'A recorded YES is the only thing that lets promos reach this customer later.',
        msgs: [{ in: 'YES' }] },
      { when: '1 day before', what: 'Reminder', why: 'Sent automatically. Each reminder is stamped so it can only ever go out once.',
        msgs: [{ stamp: 'Fri, Oct 2 at 10:00 AM' },
          { out: 'Hi Marcus, a reminder about your Valley Details appointment on Saturday, October 3 at 10:00 AM. See you then!' }] },
      { when: '1 hour before', what: 'Final reminder', why: 'One more heads-up while there\'s still time to move the car or open the gate.',
        msgs: [{ stamp: 'Sat, Oct 3 at 9:00 AM' },
          { out: 'Hi Marcus, your Valley Details appointment is coming up on Saturday, October 3 at 10:00 AM. See you soon!' }] },
      { when: 'Any time', what: 'A real conversation', why: 'Replies land on the business\'s phone and in the customer\'s record in the dashboard. Same thread either way.',
        msgs: [{ in: 'Is it ok if the car is parked on the street?' },
          { out: 'Street is fine, we just need to reach an outlet and a spigot. See you at 10.', meta: 'Typed by the owner' }] },
    ],
    after: [
      { when: 'Job marked complete', what: 'Review request', why: 'Sent when the owner closes the job, while the car still looks new. Guarded so it can\'t double-send.',
        msgs: [{ stamp: 'Sat, Oct 3 at 12:14 PM' },
          { out: 'Thanks Marcus for choosing Valley Details! If we did right by you, a quick review means a lot: g.page/r/…/review' }] },
      { when: 'Next day', what: 'Referral link', why: 'Their own link. The friend gets $20 off, and Marcus gets $20 off once the friend\'s job is done.',
        msgs: [{ stamp: 'Sun, Oct 4 at 10:30 AM' },
          { out: 'Hi Marcus, glad the car came out right. Your link gives friends $20 off their first detail with Valley Details, and you get $20 off your next one when they book: valleydetails.site/?ref=…' + STOP }] },
      { when: 'Day 14', what: 'Rebook nudge', why: 'Only if Marcus said YES, isn\'t already booked, and hasn\'t had a promo this week.',
        msgs: [{ stamp: 'Sat, Oct 17 at 11:00 AM' },
          { out: 'Hi Marcus, it\'s been a couple weeks since your last visit with Valley Details. Want to get back on the calendar? valleydetails.site' + STOP }] },
      { when: 'Day 45', what: 'Win-back', why: 'If he still hasn\'t come back. The moment he books, the sequence resets around his next detail.',
        msgs: [{ stamp: 'Tue, Nov 17 at 11:00 AM' },
          { out: 'Hi Marcus, Valley Details here. It\'s been a while. We have openings this week if you need us: valleydetails.site' + STOP }] },
    ],
    missed: [
      { when: 'Call ends, no booking', what: 'Follow-up text', why: 'For shops using the AI receptionist: if a call ends without a time on the calendar, this goes out on its own.',
        msgs: [{ stamp: 'Tue, Sep 15 at 2:47 PM' },
          { out: 'Hi Priya, it\'s Valley Details. Looks like we didn\'t get you on the calendar just now. You can grab a time here: dashboard.boyerscales.com/schedule/valleydetails Or just reply with a day that works and I\'ll set it up.' + OPT_IN }] },
      { when: 'She replies', what: 'The owner takes it from there', why: 'A lead that would have been a missed call is now a text conversation the owner can finish between jobs.',
        msgs: [{ in: 'Saturday morning works' },
          { out: 'Saturday at 9 is open. Want me to put you down?', meta: 'Typed by the owner' },
          { in: 'Yes please' }] },
      { when: 'Booked', what: 'Confirmation', why: 'From here she\'s on the same track as any other booking: confirmation, reminders, and everything after.',
        msgs: [{ stamp: 'Tue, Sep 15 at 3:02 PM' },
          { out: 'Hi Priya, you\'re booked with Valley Details on Saturday, September 19 at 9:00 AM. Confirm or change your time here: dashboard.boyerscales.com/schedule/valleydetails?appt=…' + OPT_IN }] },
    ],
  };
  (function sms() {
    const root = $('#sms'); if (!root) return;
    const tabs = $$('.tabs button', root), stepsEl = $('#smsSteps'), thread = $('#smsThread');
    const next = $('#smsNext'), replay = $('#smsReplay');
    let scene = 'booked', shown = -1, rendered = 0, token = 0, auto = true, started = false;

    function renderSteps() {
      stepsEl.innerHTML = SCENES[scene].map((s, i) =>
        `<li data-i="${i}" class="${i < shown ? 'done' : ''}${i === shown ? ' cur' : ''}" tabindex="0" role="button" aria-label="${esc(s.when)}: ${esc(s.what)}">
          <span class="when">${esc(s.when)}</span><span class="what">${esc(s.what)}</span><span class="why">${esc(s.why)}</span></li>`).join('');
    }
    function bubble(m) {
      if (m.stamp) { const d = document.createElement('div'); d.className = 'stamp'; const [a, b] = m.stamp.split(' at '); d.innerHTML = `<b>${esc(a)}</b> at ${esc(b)}`; return [d]; }
      const d = document.createElement('div');
      d.className = 'bub ' + (m.out ? 'out' : 'in');
      d.innerHTML = linkify(m.out || m.in);
      const out = [d];
      if (m.meta) { const t = document.createElement('div'); t.className = 'bub-meta'; t.textContent = m.meta; out.push(t); }
      return out;
    }
    const scrollDown = () => { thread.scrollTop = thread.scrollHeight; };
    // Messages for steps 0..i, in order. `rendered` counts how many are on screen, so a
    // step that gets interrupted mid-animation is finished instantly, never skipped.
    const msgsThrough = i => SCENES[scene].slice(0, i + 1).flatMap(st => st.msgs);
    async function showStep(i, animate = true) {
      const my = ++token;
      thread.querySelectorAll('.typing').forEach(t => t.remove());
      if (i <= shown) { // going back: rebuild quietly
        thread.innerHTML = '';
        const all = msgsThrough(i);
        all.forEach(m => thread.append(...bubble(m)));
        rendered = all.length; shown = i; renderSteps(); scrollDown(); setNext(); return;
      }
      const done = msgsThrough(shown);
      for (; rendered < done.length; rendered++) thread.append(...bubble(done[rendered]));
      scrollDown();
      const all = msgsThrough(i);
      let k = done.length;
      for (let j = shown + 1; j <= i; j++) {
        shown = j; renderSteps(); setNext();
        for (const m of SCENES[scene][j].msgs) {
          if (my !== token) return;
          if (animate && !m.stamp && !reduce) {
            const t = document.createElement('div');
            t.className = 'typing' + (m.in ? ' in' : '');
            t.innerHTML = '<i></i><i></i><i></i>';
            thread.append(t); scrollDown();
            await wait(m.in ? 900 : 650 + Math.min(900, (m.out || '').length * 3));
            if (my !== token) return; // the next call removes the dots and flushes this message
            t.remove();
          }
          thread.append(...bubble(all[k])); rendered = ++k; scrollDown();
          if (animate) await wait(m.stamp ? 250 : 450);
        }
      }
    }
    function setNext() { replay.hidden = shown >= SCENES[scene].length - 1; next.innerHTML = shown >= SCENES[scene].length - 1 ? 'Play again' : 'Next text <span aria-hidden="true">→</span>'; }
    async function autoplay() {
      while (auto && shown < SCENES[scene].length - 1) {
        await showStep(shown + 1);
        await wait(2400);
        if (!auto) return;
      }
    }
    function reset(sc) {
      token++; scene = sc; shown = -1; rendered = 0; thread.innerHTML = ''; renderSteps();
      tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.sc === sc)));
      setNext();
    }
    tabs.forEach(t => t.addEventListener('click', () => { auto = false; reset(t.dataset.sc); showStep(0); }));
    stepsEl.addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; auto = false; showStep(+li.dataset.i); });
    stepsEl.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const li = e.target.closest('li'); if (!li) return; e.preventDefault(); auto = false; showStep(+li.dataset.i); });
    next.addEventListener('click', () => {
      auto = false;
      if (shown >= SCENES[scene].length - 1) { reset(scene); showStep(0); } else showStep(shown + 1);
    });
    replay.addEventListener('click', () => { auto = false; reset(scene); showStep(0); });
    reset('booked');
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { started = true; autoplay(); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(root);
  })();

  /* ---------------- retention timeline ---------------- */
  const MARKS = [
    { d: 0, l: 'Detail done', tag: 'Day 0', title: 'The job is marked complete',
      body: 'The review request goes out and the customer\'s clock starts. Everything after this is timed from their last detail.',
      text: 'Thanks Marcus for choosing Valley Details! If we did right by you, a quick review means a lot: g.page/r/…/review' },
    { d: 1, l: 'Referral', tag: 'Day 1', title: 'Their referral link',
      body: 'While the car still looks new. Sent once per customer, only for businesses that run referrals.',
      text: 'Hi Marcus, glad the car came out right. Your link gives friends $20 off their first detail with Valley Details, and you get $20 off your next one when they book: valleydetails.site/?ref=…' + STOP },
    { d: 3, l: 'Offer', tag: 'Day 3', title: 'A package or membership offer',
      body: 'For businesses with a package or membership to sell, a pitch can go out a few days after a customer\'s first or second detail. Each business writes its own, so there\'s no stock wording.',
      text: null },
    { d: 14, l: 'Rebook', tag: 'Day 14', title: 'A friendly nudge',
      body: 'Not a coupon blast. A short text from a business they already know, with a link to book.',
      text: 'Hi Marcus, it\'s been a couple weeks since your last visit with Valley Details. Want to get back on the calendar? valleydetails.site' + STOP },
    { d: 28, l: 'Rebook', tag: 'Day 28', title: 'A second nudge',
      body: 'Only if the first didn\'t land. If they replied to the first, the system waits instead of stacking another.',
      text: 'Hi Marcus, it\'s been about a month since your last visit with Valley Details. We have openings this week: valleydetails.site' + STOP },
    { d: 45, l: 'Win-back', tag: 'Day 45', title: 'Win back a quiet customer',
      body: 'Someone who hasn\'t come back in six weeks hears from you before they settle on another detailer.',
      text: 'Hi Marcus, Valley Details here. It\'s been a while. We have openings this week if you need us: valleydetails.site' + STOP },
    { d: 75, l: 'Last try', tag: 'Day 75', title: 'One last win-back',
      body: 'That\'s the end of the scheduled texts. Nobody gets nudged forever, and a single booking starts the cycle over.',
      text: 'Hi Marcus, Valley Details here. It\'s been a couple months. We\'d love to see you again: valleydetails.site' + STOP },
  ];
  (function timeline() {
    const list = $('#tlMarks'); if (!list) return;
    const pos = d => Math.sqrt(d / 75) * 100;
    list.innerHTML = MARKS.map((m, i) =>
      `<li style="--p:${pos(m.d)}%" role="presentation"><button role="tab" aria-selected="false" data-i="${i}"><span class="dot"></span><span class="d">${m.tag}</span><span class="l">${esc(m.l)}</span></button></li>`).join('');
    const lis = $$('li', list), fill = $('#tlFill');
    function select(i, focus) {
      const m = MARKS[i];
      lis.forEach((li, j) => { li.classList.toggle('on', j === i); li.classList.toggle('past', j < i); li.firstChild.setAttribute('aria-selected', String(j === i)); });
      fill.style.width = pos(m.d) + '%';
      $('#tlTag').textContent = m.tag + ' after a detail';
      $('#tlTitle').textContent = m.title;
      $('#tlBody').textContent = m.body;
      const b = $('#tlBubble');
      b.innerHTML = m.text ? `<div class="bub out">${linkify(m.text)}</div>` : '<p class="none">Written by each business, in its own words.</p>';
      if (focus && matchMedia('(max-width: 640px)').matches) lis[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
    list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) select(+b.dataset.i, true); });
    list.addEventListener('keydown', e => {
      const cur = lis.findIndex(li => li.classList.contains('on'));
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = Math.max(0, Math.min(MARKS.length - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)));
        select(n, true); lis[n].firstChild.focus();
      }
    });
    select(0);
  })();

  /* ---------------- dashboard tabs ---------------- */
  (function dash() {
    const root = $('#dash'); if (!root) return;
    const tabs = $$('.dash-tabs button', root), imgs = $$('.dash-stage picture', root);
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.setAttribute('aria-selected', String(x === t)));
      imgs.forEach(im => im.classList.toggle('on', im.dataset.d === t.dataset.d));
    }));
  })();

  /* ---------------- ad tracking (Meta Pixel, same events as the previous homepage) ---------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="tel:"], a[href^="sms:"], a[href^="mailto:"]');
    if (!a || !window.fbq) return;
    const kind = a.href.split(':')[0];
    fbq('trackCustom', kind === 'tel' ? 'CallButtonTap' : kind === 'sms' ? 'TextButtonTap' : 'EmailLinkTap');
  });

  /* ---------------- self-check ---------------- */
  (function check() {
    const root = $('#checklist'); if (!root) return;
    const boxes = $$('input', root), out = $('#checkResult'), fill = $('#meterFill');
    function update() {
      const n = boxes.filter(b => b.checked).length, total = boxes.length;
      fill.style.width = (n / total * 100) + '%';
      const touched = boxes.some(b => b.dataset.touched);
      let msg;
      if (!touched) msg = `<b>0 of ${total}.</b> Check what's already handled.`;
      else if (n === total) msg = `<b>All ${total}.</b> Honestly, you probably don't need me. If something custom is slowing you down, I'm still happy to look at it.`;
      else if (n >= 5) msg = `<b>${n} of ${total}.</b> You're in good shape. The ${total - n === 1 ? 'one you left unchecked is' : `${total - n} you left unchecked are`} where customers slip through. That's where I'd start.`;
      else if (n >= 2) msg = `<b>${n} of ${total}.</b> There are a few spots where interested customers are likely slipping away. Worth a 15-minute conversation.`;
      else msg = `<b>${n} of ${total}.</b> Lots of room here, which also means the first fixes tend to be simple ones. Worth a 15-minute conversation.`;
      out.innerHTML = msg;
    }
    boxes.forEach(b => b.addEventListener('change', () => { b.dataset.touched = '1'; update(); }));
    update();
  })();
})();
