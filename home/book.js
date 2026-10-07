/* Homepage call booking. Uses the same public calendar as /start, in Pacific time. */
(function(){
  var API = 'https://dashboard.boyerscales.com/api/public/schedule/boyerscales';
  var TZ = 'America/Los_Angeles';
  var SERVICE = { id: 'kickoff', label: 'Intro call' };
  var form = document.getElementById('bookForm'); if (!form) return;
  var $ = function(s){ return document.querySelector(s); };
  var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var pad = function(n){ return String(n).padStart(2, '0'); };
  var cfg = null, picked = null;

  function parts(ts){
    var p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ts));
    var g = function(k){ return +p.find(function(x){ return x.type === k; }).value; };
    return { y: g('year'), m: g('month'), d: g('day'), h: g('hour') % 24, mi: g('minute') };
  }
  function offset(ts){ var q = parts(ts); return Date.UTC(q.y, q.m - 1, q.d, q.h, q.mi) - Math.floor(ts / 60000) * 60000; }
  function epoch(key){
    var y = +key.slice(0,4), m = +key.slice(5,7), d = +key.slice(8,10), h = +key.slice(11,13), mi = +key.slice(14,16);
    var wall = Date.UTC(y, m - 1, d, h, mi), t = wall - offset(wall);
    var o2 = offset(t); return o2 === offset(wall) ? t : wall - o2;
  }
  var hm = function(s){ return (+s.slice(0,2)) * 60 + (+s.slice(3,5)); };
  function label(min){ var h = Math.floor(min / 60), mm = min % 60; return (h % 12 || 12) + (mm ? ':' + pad(mm) : '') + (h >= 12 ? ' PM' : ' AM'); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function days(){
    var t = parts(Date.now()), out = [];
    for (var i = 0; i < (cfg.horizonDays || 14); i++){
      var u = new Date(Date.UTC(t.y, t.m - 1, t.d + i));
      out.push({ key: u.getUTCFullYear() + '-' + pad(u.getUTCMonth() + 1) + '-' + pad(u.getUTCDate()), dow: u.getUTCDay(), date: u, i: i });
    }
    return out;
  }
  function busy(){
    return (cfg.booked || []).map(function(b){
      var s = typeof b === 'string' ? b : b && b.start; if (!s) return null;
      var from = epoch(s); return { from: from, to: from + ((b && b.minutes) || cfg.slotMinutes || 30) * 60000 };
    }).filter(Boolean);
  }
  function slotsFor(day){
    var span = cfg.hours && cfg.hours[day.dow]; if (!span) return [];
    var job = (cfg.services || []).reduce(function(a, s){ return s.id === SERVICE.id ? s.minutes : a; }, cfg.slotMinutes || 30);
    var step = cfg.stepMinutes || 30, floor = Date.now() + (cfg.leadHours || 0) * 3600000, b = busy(), out = [];
    for (var m = hm(span[0]); m + job <= hm(span[1]); m += step){
      var key = day.key + 'T' + pad(Math.floor(m / 60)) + ':' + pad(m % 60), from = epoch(key);
      if (from < floor) continue;
      var to = from + job * 60000;
      if (!b.some(function(x){ return x.from < to && from < x.to; })) out.push({ key: key, text: label(m), at: from });
    }
    return out;
  }
  function renderDays(){
    var el = $('#days'), MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], first = null;
    el.innerHTML = '';
    days().forEach(function(d){
      var open = slotsFor(d).length > 0;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'day' + (open ? '' : ' off'); b.disabled = !open;
      b.innerHTML = '<span class="dow">' + (d.i === 0 ? 'Today' : DOW[d.dow]) + '</span><span class="num">' + d.date.getUTCDate() + '</span><span class="mon">' + MON[d.date.getUTCMonth()] + '</span>';
      b.addEventListener('click', function(){ pickDay(d, b); });
      el.appendChild(b);
      if (open && !first) first = [d, b];
    });
    if (first) pickDay(first[0], first[1]);
    else $('#slots').innerHTML = '<p class="empty">No open times in the next two weeks. Text me at (916) 708-2759 and we\'ll find one.</p>';
  }
  function pickDay(d, btn){
    picked = null; $('#picked').hidden = true;
    $$('#days .day').forEach(function(x){ x.classList.toggle('sel', x === btn); });
    var el = $('#slots'); el.innerHTML = '';
    slotsFor(d).forEach(function(s){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'slot'; b.textContent = s.text;
      b.addEventListener('click', function(){
        picked = s;
        $$('#slots .slot').forEach(function(x){ x.classList.toggle('sel', x === b); });
        $('#picked').hidden = false;
        if (window.bsTrack) bsTrack.event('PickedCallTime', { day: s.key.slice(0, 10), time: s.text });
        $('#picked').innerHTML = esc(whenText(s)) + (localText(s) ? '<span>' + esc(localText(s)) + '</span>' : '');
      });
      el.appendChild(b);
    });
  }
  function whenText(s){ return new Date(s.at).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + s.text + ' Pacific'; }
  function localText(s){
    if (offset(s.at) === -new Date(s.at).getTimezoneOffset() * 60000) return '';
    return 'That\'s ' + new Date(s.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) + ' your time.';
  }
  function showFallback(){
    var v = function(id){ return $('#' + id).value.trim(); };
    var body = 'Hi Elijah, I\'d like a call.' + (v('bName') ? ' I\'m ' + v('bName') : '') + (v('bBiz') ? ' with ' + v('bBiz') : '') + '.';
    $('#bookSms').href = 'sms:+19167082759?&body=' + encodeURIComponent(body);
    $('#bookFallback').classList.add('on');
  }

  fetch(API).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(j){ cfg = j; renderDays(); })
    .catch(function(){ $('#slots').innerHTML = ''; $('#tznote').hidden = true; showFallback(); });

  var started = false;
  function startedForm(e){
    if (started || !e.target.matches('input')) return;
    started = true; if (window.bsTrack) bsTrack.event('StartedBookingForm');
  }
  form.addEventListener('focusin', startedForm);
  form.addEventListener('input', startedForm);

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var err = $('#bookErr'); err.textContent = '';
    if (!cfg){ showFallback(); err.textContent = 'The calendar isn\'t loading. Text me below instead.'; return; }
    if (!picked){ err.textContent = 'Pick a time for the call.'; $('#days').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    var need = [['bName','your name'],['bPhone','your mobile'],['bBiz','your business name']];
    for (var i = 0; i < need.length; i++){
      if (!$('#' + need[i][0]).value.trim()){ err.textContent = 'Add ' + need[i][1] + ' first.'; $('#' + need[i][0]).focus(); return; }
    }
    if ($('#bPhone').value.replace(/\D/g, '').length < 10){ err.textContent = 'That mobile number looks short.'; $('#bPhone').focus(); return; }

    var biz = $('#bBiz').value.trim(), leak = $('#bLeak').value.trim();
    var intake = [{ q: 'Business name', a: biz }, { q: 'Booked from', a: 'boyerscales.com homepage' }];
    if (leak) intake.push({ q: 'What\'s costing them customers', a: leak });
    if (window.bsTrack) intake = intake.concat(bsTrack.intake());
    var btn = $('#bookBtn'); btn.disabled = true; btn.textContent = 'Booking your call';
    var eventId = 'call-' + (window.bsTrack ? bsTrack.vid : 'x') + '-' + picked.key;
    fetch(API + '/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: $('#bName').value.trim(), phone: $('#bPhone').value.trim(), start: picked.key,
      service_id: SERVICE.id, service: SERVICE.label + ': ' + biz, intake: intake,
      meta: window.bsTrack ? bsTrack.meta(eventId) : undefined
    }) })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if (!r.ok || j.ok === false) throw new Error(j.error || 'That time was just taken. Pick another.'); }); })
      .then(function(){
        if (window.bsTrack){
          bsTrack.user({ name: $('#bName').value, phone: $('#bPhone').value });
          bsTrack.event('Schedule', { content_name: 'Free 30-minute call' }, { eventID: eventId });
        }
        form.hidden = true; $('#bookDone').hidden = false;
        $('#bookWhen').textContent = 'I\'ll call you at ' + $('#bPhone').value.trim() + ' on ' + whenText(picked) + '.';
      })
      .catch(function(ex){
        btn.disabled = false; btn.textContent = 'Book my free call';
        if (window.bsTrack) bsTrack.event('BookingError', { reason: String(ex && ex.message || '').slice(0, 80) });
        err.textContent = (ex && ex.message && !/fetch|network/i.test(ex.message)) ? ex.message : 'Couldn\'t book that. Try again, or text me at (916) 708-2759.';
      });
  });
})();
