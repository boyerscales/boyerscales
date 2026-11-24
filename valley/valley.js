// boyerscales.com/valley/ : reveal on scroll, count the stat numbers up once, and show the bottom
// "Text me" bar on phones after the first screen. Everything still reads fine if this never runs.
window.__vOK = 1;
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countUp(el) {
    var end = +el.getAttribute('data-count'), pre = el.getAttribute('data-pre') || '';
    if (!end || reduce) return;
    var t0 = null, dur = 1100;
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(end * e).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var items = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('on'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('on');
        var n = en.target.querySelector('[data-count]');
        if (n) countUp(n);
        io.unobserve(en.target);
      });
    }, { threshold: 0.18 });
    items.forEach(function (el) { io.observe(el); });
  }

  var dock = document.getElementById('dock'), hero = document.querySelector('.hero'), offer = document.getElementById('offer');
  function onScroll() {
    var past = hero.getBoundingClientRect().bottom < 0;
    var r = offer.getBoundingClientRect();
    var atOffer = r.top < innerHeight && r.bottom > 0;
    var show = past && !atOffer;
    dock.classList.toggle('on', show);
    document.body.classList.toggle('docked', show && innerWidth < 700);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

})();
