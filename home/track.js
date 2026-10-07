/* Ad tracking for boyerscales.com.
 * Remembers which ad (or site) each visitor came from, sends funnel steps to the Meta Pixel,
 * tags Stripe checkout links with the visitor, and lets bookings carry the ad that brought them.
 * Load it on any page that has the pixel. Other scripts use window.bsTrack. */
(function(){
  var FIELDS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid','gclid'];
  function read(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } }
  function write(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }

  // Visitor id: the same one the pixel snippet in <head> sends to Meta as external_id.
  var vid = null;
  try { vid = localStorage.getItem('bsVid'); } catch (_) {}
  if (!vid){ vid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); try { localStorage.setItem('bsVid', vid); } catch (_) {} }

  // First touch is kept forever. Last touch updates whenever they arrive from an ad or another site.
  var q = new URLSearchParams(location.search), tags = {};
  FIELDS.forEach(function(f){ var v = q.get(f); if (v) tags[f] = v.slice(0, 200); });
  var refHost = '';
  try { refHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (_) {}
  // Coming back from Stripe checkout is not a new visit from somewhere else.
  var fromStripe = /(^|\.)stripe\.com$/.test(refHost);
  if (fromStripe) tags = {};
  var fromOutside = refHost && refHost !== location.hostname && !fromStripe;
  var touch = Object.assign({ landing: location.pathname, referrer: refHost || 'direct', at: new Date().toISOString() }, tags);
  if (!read('bsAttrFirst')) write('bsAttrFirst', touch);
  if (Object.keys(tags).length || fromOutside || !read('bsAttrLast')) write('bsAttrLast', touch);
  var visits = (read('bsVisits') || 0) + (sessionStorageFlag() ? 0 : 1); write('bsVisits', visits);
  function sessionStorageFlag(){ try { if (sessionStorage.getItem('bsSeen')) return true; sessionStorage.setItem('bsSeen', '1'); } catch (_) {} return false; }

  function attr(){ return read('bsAttrLast') || touch; }
  function source(a){
    if (!a) return 'unknown';
    if (a.utm_source) return a.utm_source + (a.utm_medium ? ' / ' + a.utm_medium : '');
    if (a.fbclid) return 'facebook / ad (no utm tags)';
    if (a.gclid) return 'google / ad';
    return a.referrer || 'direct';
  }
  // Ad details sent with every pixel event, so Events Manager can split results by campaign and ad.
  function adData(){
    var a = attr(), d = { traffic_source: source(a), visit_number: visits };
    if (a.utm_campaign) d.utm_campaign = a.utm_campaign;
    if (a.utm_term) d.utm_adset = a.utm_term;
    if (a.utm_content) d.utm_ad = a.utm_content;
    return d;
  }
  function event(name, data, opts){
    if (!window.fbq) return;
    var payload = Object.assign(adData(), data || {});
    var std = ['PageView','ViewContent','Lead','Contact','Schedule','InitiateCheckout','Purchase','CompleteRegistration','SubmitApplication'];
    if (std.indexOf(name) > -1) fbq('track', name, payload, opts || {});
    else fbq('trackCustom', name, payload, opts || {});
  }
  // Rows for the dashboard intake, so every booking shows which ad brought it.
  function intake(compact){
    var a = attr(), f = read('bsAttrFirst') || a, rows = [];
    if (compact){
      var ad = [source(a), a.utm_campaign, a.utm_term, a.utm_content].filter(Boolean).join(' / ');
      return [{ q: 'Came from', a: ad + ', landed ' + a.at.slice(0, 10) + ', visit ' + visits }, { q: 'Visitor id', a: vid }];
    }
    rows.push({ q: 'Came from', a: source(a) });
    if (a.utm_campaign) rows.push({ q: 'Ad campaign', a: a.utm_campaign });
    if (a.utm_term) rows.push({ q: 'Ad set', a: a.utm_term });
    if (a.utm_content) rows.push({ q: 'Ad', a: a.utm_content });
    if (a.fbclid) rows.push({ q: 'Facebook click id', a: a.fbclid });
    rows.push({ q: 'Landed on', a: a.landing + ' on ' + a.at.slice(0, 10) });
    if (f.at !== a.at) rows.push({ q: 'First visit', a: source(f) + ' on ' + f.at.slice(0, 10) });
    rows.push({ q: 'Visits before booking', a: String(visits) });
    rows.push({ q: 'Visitor id', a: vid });
    return rows;
  }
  // Send hashed contact details to Meta so it can match the person to the ad they saw. The pixel hashes these itself.
  function user(d){
    if (!window.fbq || !d) return;
    var m = { external_id: vid };
    if (d.phone){ var p = d.phone.replace(/\D/g, ''); if (p.length === 10) p = '1' + p; m.ph = p; }
    if (d.email) m.em = d.email.trim().toLowerCase();
    if (d.name){ var n = d.name.trim().toLowerCase().split(/\s+/); m.fn = n[0]; if (n.length > 1) m.ln = n[n.length - 1]; }
    fbq('init', '1995055151120545', m);
  }
  function cookie(n){ var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  // Meta's click cookie. The pixel normally sets it; build it from the stored click id if it hasn't.
  function fbc(){
    var c = cookie('_fbc'); if (c) return c;
    var a = attr(); return a.fbclid ? 'fb.1.' + new Date(a.at).getTime() + '.' + a.fbclid : '';
  }
  // Sent with a booking so the server can report the same event to Meta (Conversions API).
  function meta(eventId){ return { event_id: eventId || '', external_id: vid, fbc: fbc(), fbp: cookie('_fbp'), page_url: location.href }; }
  window.bsTrack = { vid: vid, attr: attr, source: source, event: event, intake: intake, user: user, meta: meta };

  /* ---------- Stripe links carry the visitor and the ad into checkout ---------- */
  function tagStripe(){
    var a = attr();
    document.querySelectorAll('a[href^="https://buy.stripe.com/"]').forEach(function(link){
      var u = new URL(link.href);
      u.searchParams.set('client_reference_id', vid);
      // Stripe silently drops tags with spaces or symbols, so clean them first.
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
        var v = String(a[k] || '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 150);
        if (v) u.searchParams.set(k, v);
      });
      link.href = u.toString();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tagStripe); else tagStripe();

  /* ---------- Clicks ---------- */
  document.addEventListener('click', function(e){
    var a = e.target.closest('a'); if (!a) return;
    var href = a.getAttribute('href') || '', label = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (/^(tel|sms|mailto):/.test(href)){
      var kind = href.split(':')[0];
      event(kind === 'tel' ? 'CallButtonTap' : kind === 'sms' ? 'TextButtonTap' : 'EmailLinkTap', { button: label });
      event('Contact', { content_name: kind });
      event('Lead', { content_name: kind });
    } else if (href.indexOf('https://buy.stripe.com/') === 0){
      event('InitiateCheckout', { value: 250, currency: 'USD', content_name: 'Setup $250', button: label });
    } else if (href.indexOf('https://ig.me/') === 0 || href.indexOf('instagram.com') > -1){
      event('Lead', { content_name: 'instagram dm', button: label });
    } else if (href.charAt(0) === '#' && a.classList.contains('btn')){
      event('ButtonClick', { button: label, goes_to: href });
    }
  });

  /* ---------- How far they get ---------- */
  function seen(sel, name, data){
    var el = document.querySelector(sel); if (!el || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(es){
      if (es.some(function(x){ return x.isIntersecting; })){ io.disconnect(); event(name, data); }
    }, { rootMargin: '0px 0px -40% 0px' });
    io.observe(el);
  }
  function watchSections(){
    seen('#pay', 'ViewContent', { content_name: 'Offer: $250 setup, 30 day refund', value: 250, currency: 'USD' });
    seen('#book', 'SawBookingCalendar');
    seen('#valley', 'SawValleyDetails');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchSections); else watchSections();

  var marks = [25, 50, 75, 90], hitMarks = {};
  addEventListener('scroll', function(){
    var h = document.documentElement.scrollHeight - innerHeight; if (h <= 0) return;
    var pct = scrollY / h * 100;
    marks.forEach(function(m){ if (pct >= m && !hitMarks[m]){ hitMarks[m] = 1; event('ScrollDepth', { percent: m }); } });
  }, { passive: true });

  // Time actually looking at the page, not time in a background tab.
  var shown = 0, last = Date.now(), timeMarks = [15, 60, 180], hitTime = {};
  setInterval(function(){
    var now = Date.now(); if (document.visibilityState === 'visible') shown += now - last; last = now;
    timeMarks.forEach(function(s){ if (shown >= s * 1000 && !hitTime[s]){ hitTime[s] = 1; event('TimeOnPage', { seconds: s }); } });
  }, 1000);

  /* ---------- Video page ---------- */
  var video = document.querySelector('video');
  if (video){
    var vm = {};
    video.addEventListener('play', function(){ if (!vm.play){ vm.play = 1; event('VideoPlay'); event('ViewContent', { content_name: 'Promo video' }); } });
    video.addEventListener('timeupdate', function(){
      if (!video.duration) return;
      var p = video.currentTime / video.duration * 100;
      [25, 50, 75, 95].forEach(function(m){ if (p >= m && !vm[m]){ vm[m] = 1; event('VideoProgress', { percent: m }); } });
    });
  }
})();
