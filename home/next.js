/* BoyerScales homepage, free setup version. No framework, no build step.
   Loaded with home/track.js (ad tracking) and home/book.js (call times). */
(() => {
  /* ---------------- config ---------------- */
  // Where the free setup form POSTs. Empty means dry run: nothing is sent, the payload is
  // logged to the browser console, and the page behaves exactly as it will for real.
  const SETUP_ENDPOINT = '';
  // How long until the page is live. Every place the page says it reads this one value.
  const TURNAROUND = 'within 2 days';
  const SEND_TIMEOUT_MS = 20000;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  $$('[data-turnaround]').forEach(el => {
    el.textContent = el.dataset.turnaround === 'cap' ? TURNAROUND.charAt(0).toUpperCase() + TURNAROUND.slice(1) : TURNAROUND;
  });

  /* ---------------- in-page links ---------------- */
  // Scroll without writing #section into the address bar. This also keeps in-page links
  // working while the preview copy of this page carries <base href="/">.
  const nameInput = $('#suName');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    // Every free setup button lands on the form with the first field ready to type in.
    if (id === 'setup' && nameInput && !$('#setupForm').hidden) nameInput.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (id === 'main') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });

  /* ---------------- nav and sticky bar ---------------- */
  const nav = $('#nav'), mcta = $('#mcta'), setupBox = $('#setup'), repeat = $('#repeatGo');
  const darkSecs = $$('.sec-dark');
  const themeMeta = $('meta[name="theme-color"]');
  let ticking = false, sent = false;
  const onScreen = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  function onScroll() {
    ticking = false;
    const navH = nav.offsetHeight;
    nav.classList.toggle('scrolled', scrollY > 8);
    const onDark = darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= navH && r.bottom > navH; });
    nav.classList.toggle('on-dark', onDark);
    const tint = onDark ? '#0b0d11' : '#f4f2ee';
    if (themeMeta && themeMeta.content !== tint) themeMeta.content = tint;
    // One accent button on screen at a time: the bar and the nav copy take the accent only
    // once the form has scrolled away and the repeat button by the price is not showing.
    const formGone = setupBox.getBoundingClientRect().bottom < navH;
    const show = formGone && !onScreen(repeat) && !sent;
    if (mcta) mcta.classList.toggle('show', show);
    nav.classList.toggle('cta-on', show);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- reveal on scroll ---------------- */
  // Only elements still below the screen when this runs are hidden, so a slow script never
  // leaves anything invisible.
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('rv-wait'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    $$('.rv').forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('rv-wait');
      requestAnimationFrame(() => el.classList.add('rv-go'));
      io.observe(el);
    });
  }

  /* ---------------- proof: notes light up their pins ---------------- */
  (function proof() {
    const shots = $('#proofShots'), notes = $$('#proofNotes li');
    if (!shots || !notes.length) return;
    const pins = $$('.pin', shots);
    const hot = n => {
      shots.classList.toggle('has-hot', n > 0);
      notes.forEach((li, i) => li.classList.toggle('hot', i + 1 === n));
      pins.forEach(p => p.classList.toggle('hot', +p.textContent === n));
    };
    notes.forEach((li, i) => {
      li.addEventListener('mouseenter', () => hot(i + 1));
      // On phones the screenshots sit in a strip: tapping a note slides its phone into view.
      li.addEventListener('click', () => {
        hot(i + 1);
        const ph = $('.phone[data-shot="' + li.dataset.shot + '"]', shots);
        if (ph && shots.scrollWidth > shots.clientWidth + 4) {
          shots.scrollTo({ left: ph.offsetLeft - (shots.clientWidth - ph.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
        }
      });
    });
    $('#proofNotes').addEventListener('mouseleave', () => hot(0));
  })();

  /* ---------------- the free setup form ---------------- */
  (function setup() {
    const form = $('#setupForm'); if (!form) return;
    const done = $('#setupDone'), btn = $('#suGo'), phoneInput = $('#suPhone');
    const errBox = $('#suErr'), errMsg = $('#suErrMsg'), errText = $('#suErrText');
    const label = btn.textContent;
    const MSG = {
      name: 'Type your Instagram handle or business name.',
      phone: 'Type a 10-digit US mobile number.',
      rejected: 'That did not go through. Check both fields and try again.',
      busy: 'Too many tries from here. Wait a minute and try again.',
      server: 'Something broke on my end, not yours. Try again in a minute.',
      network: 'It did not send. Check your connection and try again.'
    };
    let sending = false;

    // 10 digits, with or without a leading 1. Area codes never start with 0 or 1.
    function tenDigits(v) {
      let d = String(v).replace(/\D/g, '');
      if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
      return /^[2-9]\d{9}$/.test(d) ? d : '';
    }
    function fieldError(input, text) {
      const p = document.getElementById(input.id + 'Err');
      p.textContent = text || ''; p.hidden = !text;
      if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    function formError(text, offerText) {
      errMsg.textContent = text || '';
      errText.hidden = !offerText;
      errBox.hidden = !text;
    }
    [nameInput, phoneInput].forEach(inp => inp.addEventListener('input', () => { fieldError(inp, ''); formError(''); }));

    function succeed(real) {
      sent = true;
      form.hidden = true; done.hidden = false;
      document.documentElement.classList.add('setup-sent');
      onScroll();
      done.focus({ preventScroll: true });
      const r = done.getBoundingClientRect();
      if (r.top < nav.offsetHeight || r.bottom > innerHeight) setupBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      // Same pattern as the text and email links in home/track.js: one Lead event, named for what it was.
      if (real && window.bsTrack) bsTrack.event('Lead', { content_name: 'Free 7-day setup' });
    }
    function release() { sending = false; btn.disabled = false; btn.textContent = label; }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending || sent) return;
      formError('');
      const typed = nameInput.value.trim(), phone = tenDigits(phoneInput.value);
      fieldError(nameInput, typed.length < 2 ? MSG.name : '');
      fieldError(phoneInput, phone ? '' : MSG.phone);
      if (typed.length < 2) { nameInput.focus(); return; }
      if (!phone) { phoneInput.focus(); return; }

      const payload = { name: typed, phone: phone, source: 'homepage-free-setup', need: 'Free 7-day setup', note: typed };
      sending = true; btn.disabled = true; btn.textContent = 'Sending';

      if (!SETUP_ENDPOINT) {
        console.info('[free setup] DRY RUN. SETUP_ENDPOINT is empty in home/next.js, so nothing was sent. Would POST:', payload);
        await new Promise(r => setTimeout(r, 500));
        sending = false;
        succeed(false);
        return;
      }

      const ctl = 'AbortController' in window ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), SEND_TIMEOUT_MS) : 0;
      let res;
      try {
        res = await fetch(SETUP_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined });
      } catch (_) {
        clearTimeout(timer); release(); formError(MSG.network, true); return;
      }
      clearTimeout(timer);
      let j = {};
      try { j = await res.json(); } catch (_) {}
      if (res.ok && j && j.ok !== false) { sending = false; succeed(true); return; }
      release();
      if (res.status === 429) formError(MSG.busy, true);
      else if (res.status >= 500) formError(MSG.server, true);
      else {
        const said = j && (typeof j.error === 'string' ? j.error : typeof j.message === 'string' ? j.message : '');
        formError(said ? said.slice(0, 200) : MSG.rejected, !said);
      }
    });
  })();
})();
