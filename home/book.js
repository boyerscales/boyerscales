/* Homepage call times. Shows the same open times as the call page the DM bot sends
   (preview.boyerscales.com/call), and every time links into that page with the time
   already picked. The booking, Elijah's "call booked" text and the DM bot's "they
   booked" check all happen there, the same as for a lead from Instagram.

   WINDOWS is a copy of CALL_WINDOWS in Blue SMS instagram/preview/call.js (Elijah's
   class schedule, Pacific time). Change both together. The call page checks the time
   again before it books, so a stale copy here can't book a blocked time: the visitor
   just lands on the call page and picks another. */
(function(){
  var API = 'https://dashboard.boyerscales.com/api/public/schedule/boyerscales';
  var CALL_PAGE = 'https://preview.boyerscales.com/call';
  var PT = 'America/Los_Angeles';
  var SERVICE_ID = 'kickoff';
  var LEAD_HOURS = 1, OPEN_DAYS = 3;
  var WINDOWS = {
    0: [['07:30', '18:00']],
    1: [['07:30', '08:30'], ['10:00', '11:00'], ['12:00', '18:00']],
    2: [['07:30', '08:30'], ['10:00', '10:30'], ['12:00', '18:00']],
    3: [['07:30', '08:30'], ['10:00', '11:00'], ['12:00', '18:00']],
    4: [['07:30', '10:30'], ['12:00', '18:00']],
    5: [['07:30', '08:30'], ['10:00', '11:00'], ['12:00', '13:00'], ['15:00', '18:00']],
    6: [['07:30', '18:00']]
  };
  var ZONES = { 'America/Los_Angeles': 'Pacific', 'America/Denver': 'Mountain', 'America/Phoenix': 'Arizona', 'America/Chicago': 'Central', 'America/New_York': 'Eastern', 'America/Anchorage': 'Alaska', 'Pacific/Honolulu': 'Hawaii' };
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var card = document.getElementById('book'); if (!card) return;
  var $ = function(s){ return card.querySelector(s); };
  var pad = function(n){ return String(n).padStart(2, '0'); };
  var hm = function(s){ return (+s.slice(0,2)) * 60 + (+s.slice(3,5)); };
  var HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

  // The visitor's own zone, the way the call page shows times.
  var tz = PT;
  try { var own = Intl.DateTimeFormat().resolvedOptions().timeZone; if (own) { new Intl.DateTimeFormat('en-US', { timeZone: own }); tz = own; } } catch (e) {}

  function partsIn(ms, zone){
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms)).forEach(function(x){ p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
  }
  function dayKey(ms, zone){ var p = partsIn(ms, zone); return p.y + '-' + pad(p.mo) + '-' + pad(p.d); }
  // A Pacific "YYYY-MM-DDTHH:MM" as a real instant (DST-safe).
  function ptInstant(key){
    var wall = Date.UTC(+key.slice(0,4), +key.slice(5,7) - 1, +key.slice(8,10), +key.slice(11,13), +key.slice(14,16)), ms = wall;
    for (var i = 0; i < 2; i++){ var p = partsIn(ms, PT); ms = wall - (Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - ms); }
    return ms;
  }
  function timeText(ms){ var p = partsIn(ms, tz), h = p.h % 12 || 12; return h + (p.mi ? ':' + pad(p.mi) : '') + (p.h >= 12 ? ' PM' : ' AM'); }

  // Elijah's windows cut to the dashboard's own hours for that day (call.js clipWindows).
  function clip(hours){
    var out = {};
    for (var d = 0; d < 7; d++){
      var span = hours && hours[String(d)], open = span && HHMM.test(span[0]) && HHMM.test(span[1]) ? span : null;
      out[d] = (WINDOWS[d] || []).map(function(w){ return open ? [w[0] < open[0] ? open[0] : w[0], w[1] > open[1] ? open[1] : w[1]] : null; })
        .filter(function(w){ return w && w[0] < w[1]; });
    }
    return out;
  }

  // Open times over the next two weeks, Pacific keys, minus anything already booked.
  function openSlots(data){
    var svc = (data.services || []).filter(function(s){ return s && s.id === SERVICE_ID; })[0] || (data.services || [])[0];
    var minutes = (svc && +svc.minutes) || +data.slotMinutes || 30, step = +data.stepMinutes || +data.slotMinutes || 30;
    var windows = clip(data.hours || {});
    var booked = (data.booked || []).map(function(b){
      var s = typeof b === 'string' ? b : b && b.start;
      return s && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? { day: s.slice(0, 10), m: hm(s.slice(11, 16)), len: (b && +b.minutes) || minutes } : null;
    }).filter(Boolean);
    var floor = Date.now() + LEAD_HOURS * 3600000, t = partsIn(Date.now(), PT), out = [];
    for (var i = +data.minDaysAhead || 0; i < 15; i++){
      var d = new Date(Date.UTC(t.y, t.mo - 1, t.d + i, 12));
      var day = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
      (windows[d.getUTCDay()] || []).forEach(function(w){
        for (var m = hm(w[0]); m + minutes <= hm(w[1]); m += step){
          var key = day + 'T' + pad(Math.floor(m / 60)) + ':' + pad(m % 60), at = ptInstant(key);
          if (at < floor) continue;
          if (booked.some(function(b){ return b.day === day && m < b.m + b.len && b.m < m + minutes; })) continue;
          out.push({ key: key, at: at, day: dayKey(at, tz), text: timeText(at) });
        }
      });
    }
    return out;
  }

  function render(data){
    var slots = openSlots(data), byDay = {}, order = [];
    slots.forEach(function(s){ if (!byDay[s.day]) { byDay[s.day] = []; order.push(s.day); } byDay[s.day].push(s); });
    order = order.sort().slice(0, OPEN_DAYS);
    var daysEl = $('#days'); daysEl.innerHTML = '';
    if (!order.length){
      $('#slots').innerHTML = '<p class="empty">No open times in the next few days. Text me at (916) 708-2759 and we\'ll find one.</p>';
      return;
    }
    var today = dayKey(Date.now(), tz), tmrw = dayKey(Date.now() + 86400000, tz), first = null;
    order.forEach(function(k){
      var date = new Date(Date.UTC(+k.slice(0,4), +k.slice(5,7) - 1, +k.slice(8,10), 12));
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'day';
      b.innerHTML = '<span class="dow">' + (k === today ? 'Today' : k === tmrw ? 'Tmrw' : DOW[date.getUTCDay()]) + '</span><span class="num">' + date.getUTCDate() + '</span><span class="mon">' + MON[date.getUTCMonth()] + '</span>';
      b.addEventListener('click', function(){ pickDay(byDay[k], b); });
      daysEl.appendChild(b);
      if (!first) first = [byDay[k], b];
    });
    pickDay(first[0], first[1]);
    $('#tznote').textContent = 'Times are in ' + (ZONES[tz] || tz.split('/').pop().replace(/_/g, ' ')) + ' time.';
    $('#tznote').hidden = false;
    $('#bookNext').hidden = false;
  }

  function pickDay(list, btn){
    Array.prototype.forEach.call(card.querySelectorAll('#days .day'), function(x){ x.classList.toggle('sel', x === btn); });
    var el = $('#slots'); el.innerHTML = '';
    list.forEach(function(s){
      var a = document.createElement('a');
      a.className = 'slot'; a.textContent = s.text;
      a.href = CALL_PAGE + '?t=' + encodeURIComponent(s.key);
      a.addEventListener('click', function(){
        if (window.bsTrack) bsTrack.event('PickedCallTime', { day: s.key.slice(0, 10), time: s.key.slice(11) + ' PT' });
      });
      el.appendChild(a);
    });
  }

  function fail(){
    $('#slots').innerHTML = '';
    $('#bookFallback').classList.add('on');
  }

  fetch(API).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(j){ try { render(j); } catch (e) { fail(); } })
    .catch(fail);
})();
