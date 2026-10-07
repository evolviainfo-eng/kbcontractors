/* signature-web · base/motion.js (from the AKMIRA reference build, 2026-10-01)
   Studio motion as behaviour only; the look stays per client.
   Markup hooks: [data-nav] header, [data-hero] first screen, .rv text/UI blocks (never photos),
   [data-par="4"] wrapper around a framed photo (amplitude in percent), .intro overlay with .intro__mark,
   [data-menu], [data-menu-open], [data-menu-close], gallery: [data-lb] dialog, [data-open="key"][data-index],
   window.GALLERY = { key: [{src,w,h}] }, window.GALLERY_TITLES = { key: 'Title · Place' }.
   Load lenis.min.js before this file (defer both). In <head>, before any CSS paints:
   <script>(function(d){d.classList.add('js');var r=matchMedia('(prefers-reduced-motion: reduce)').matches,s;try{s=sessionStorage.getItem('intro-seen')}catch(e){}if(r||s)d.classList.add('no-intro')})(document.documentElement)</script>
   Without the .intro element the page simply skips it. */
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var nav = document.querySelector('[data-nav]');
  var hero = document.querySelector('[data-hero]');
  var hasIntro = !!document.querySelector('.intro');
  if (!hasIntro) root.classList.add('no-intro');

  /* smooth scroll: wheel only, touch stays native */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  var navH = function () { return nav ? nav.offsetHeight : 0; };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href'); if (id.length < 2) return;
    var t = document.querySelector(id); if (!t) return;
    e.preventDefault();
    var off = (hero && t === hero) ? 0 : -navH() + 1;
    if (lenis) lenis.scrollTo(t, { offset: off, duration: 1.4 }); else window.scrollTo({ top: t.getBoundingClientRect().top + scrollY + off, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* reveals: text and UI only, once; the hero waits for the intro */
  var els = [].slice.call(document.querySelectorAll('.rv'));
  var heroEls = els.filter(function (el) { return hero && hero.contains(el); });
  var restEls = els.filter(function (el) { return heroEls.indexOf(el) < 0; });
  var show = function (el) { el.classList.add('in'); };
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(show); }
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting || e.boundingClientRect.top < 0) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    restEls.forEach(function (el) { io.observe(el); });
    var sweep = function () { restEls.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) show(el); }); };
    setTimeout(sweep, 3200);
    addEventListener('pageshow', sweep);
    addEventListener('beforeprint', function () { els.forEach(show); });
  }

  /* intro: the client's mark once per session, then the hero settles */
  var ready = function () {
    root.classList.add('is-ready');
    setTimeout(function () { heroEls.forEach(show); }, root.classList.contains('no-intro') ? 120 : 380);
    try { sessionStorage.setItem('intro-seen', '1'); } catch (e) {}
  };
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  if (root.classList.contains('no-intro')) { fontsReady.then(function () { requestAnimationFrame(ready); }); }
  else {
    if (lenis) lenis.stop();
    var t0 = Date.now();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2000); })]).then(function () {
      setTimeout(function () { ready(); if (lenis) lenis.start(); }, Math.max(0, 1250 - (Date.now() - t0)));
    });
  }
  setTimeout(function () { if (!root.classList.contains('is-ready')) { ready(); if (lenis) lenis.start(); } }, 3500);

  /* parallax inside the frame: desktop with a fine pointer only */
  var pars = [].slice.call(document.querySelectorAll('[data-par]'));
  var parOn = !reduce && finePointer && innerWidth >= 1024 && pars.length;
  var updatePar = function () {
    var vh = innerHeight;
    for (var i = 0; i < pars.length; i++) {
      var el = pars[i], box = el.parentElement.getBoundingClientRect();
      if (box.bottom < -100 || box.top > vh + 100) continue;
      var p = ((box.top + box.height / 2) - vh / 2) / (vh / 2 + box.height / 2);
      el.style.setProperty('--py', (-p * (+(el.getAttribute('data-par') || 4))).toFixed(3) + '%');
    }
  };
  if (parOn) { root.classList.add('has-par'); updatePar(); }

  /* nav: solid after the hero, steps away while reading down, returns on the way up */
  var lastY = scrollY, menuOpen = false;
  var onScroll = function (y) {
    if (parOn) updatePar();
    if (!nav) return;
    nav.classList.toggle('is-solid', hero ? hero.getBoundingClientRect().bottom <= navH() + 1 : true);
    var dy = y - lastY;
    if (!menuOpen && !reduce) {
      if (y > innerHeight * 0.9 && dy > 4) nav.classList.add('is-away');
      else if (dy < -4 || y < innerHeight * 0.5) nav.classList.remove('is-away');
    }
    lastY = y;
  };
  if (lenis) lenis.on('scroll', function (l) { onScroll(l.scroll); });
  else addEventListener('scroll', function () { onScroll(scrollY); }, { passive: true });
  addEventListener('resize', function () { onScroll(scrollY); });
  onScroll(scrollY);
  nav && nav.addEventListener('focusin', function () { nav.classList.remove('is-away'); });

  /* menu */
  var menu = document.querySelector('[data-menu]');
  var openBtn = document.querySelector('[data-menu-open]');
  var setMenu = function (open) {
    if (!menu) return;
    menuOpen = open; menu.hidden = !open;
    openBtn && openBtn.setAttribute('aria-expanded', String(open));
    if (lenis) { open ? lenis.stop() : lenis.start(); } else document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var first = menu.querySelector('a'); first && first.focus(); } else { openBtn && openBtn.focus(); }
  };
  openBtn && openBtn.addEventListener('click', function () { setMenu(true); });
  menu && menu.addEventListener('click', function (e) { if (e.target.closest('[data-menu-close]')) setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && !menu.hidden) setMenu(false); });

  /* gallery */
  var G = window.GALLERY || {}, titles = window.GALLERY_TITLES || {};
  var lb = document.querySelector('[data-lb]');
  if (!lb || typeof lb.showModal !== 'function') return;
  var img = lb.querySelector('[data-lb-img]'), tEl = lb.querySelector('[data-lb-title]'), cEl = lb.querySelector('[data-lb-count]');
  var cur = { key: null, i: 0 };
  var render = function () {
    var list = G[cur.key] || []; if (!list.length) return;
    var it = list[cur.i];
    img.classList.add('is-loading');
    var pre = new Image(); pre.onload = pre.onerror = function () { img.src = it.src; img.width = it.w; img.height = it.h; img.classList.remove('is-loading'); };
    pre.src = it.src;
    img.alt = (titles[cur.key] || '') + ', ' + (cur.i + 1) + ' / ' + list.length;
    if (tEl) tEl.textContent = titles[cur.key] || '';
    if (cEl) cEl.textContent = (cur.i + 1) + ' / ' + list.length;
    var nx = list[(cur.i + 1) % list.length]; if (nx) { var p2 = new Image(); p2.src = nx.src; }
  };
  var go = function (d) { var n = (G[cur.key] || []).length; if (!n) return; cur.i = (cur.i + d + n) % n; render(); };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-open]'); if (!a) return;
    var key = a.getAttribute('data-open'); if (!G[key]) return;
    e.preventDefault(); cur.key = key; cur.i = +a.getAttribute('data-index') || 0; render();
    lb.showModal(); if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
  });
  var q = function (s) { return lb.querySelector(s); };
  q('[data-lb-prev]') && q('[data-lb-prev]').addEventListener('click', function () { go(-1); });
  q('[data-lb-next]') && q('[data-lb-next]').addEventListener('click', function () { go(1); });
  q('[data-lb-close]') && q('[data-lb-close]').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('close', function () { if (lenis) lenis.start(); else document.body.style.overflow = ''; });
  lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); sx = null; });
})();

/* KB Contractors · page behaviour: hero reels, reel wall, quote form, call bar */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var ua = navigator.userAgent;
  var safariLike = /iP(hone|ad|od)/.test(ua) || (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|SamsungBrowser/.test(ua));
  var pick = function (v) {
    var webm = v.getAttribute('data-webm'), mp4 = v.getAttribute('data-mp4');
    return (!safariLike && webm && v.canPlayType('video/webm; codecs="vp9"')) ? webm : mp4;
  };

  /* ---- services: the open row plays its job clip on screen, muted; everything else stays a still ---- */
  var rows = [].slice.call(document.querySelectorAll('.svc__row'));
  var sync = function () {
    rows.forEach(function (row) {
      var ph = row.querySelector('[data-clip]'); if (!ph) return;
      var v = ph.querySelector('video');
      var r = row.getBoundingClientRect();
      var want = row.open && !reduce && r.top < innerHeight && r.bottom > 0;
      if (want) {
        if (!v.src) v.src = pick(v);
        if (v.paused) { var p = v.play(); p && p.then && p.then(function () { ph.classList.add('is-playing'); }, function () {}); }
      } else if (!v.paused) { v.pause(); ph.classList.remove('is-playing'); }
    });
  };
  rows.forEach(function (row) {
    row.addEventListener('toggle', sync);
    var v = row.querySelector('[data-clip] video');
    v && v.addEventListener('playing', function () { v.parentNode.classList.add('is-playing'); });
    v && v.addEventListener('loadeddata', sync);
  });
  if (rows.length) { addEventListener('scroll', function () { requestAnimationFrame(sync); }, { passive: true }); setTimeout(sync, 400); }
  /* accordion: one row open at a time; the closing row folds while the clicked one unfolds, and the clicked
     row's heading stays where it was on screen, so nothing jumps under the pointer */
  var ACC_DUR = 560, ACC_EASE = 'cubic-bezier(.33, 1, .68, 1)';
  var accPanel = function (row) { return row.querySelector('.svc__panel'); };
  var accEnd = function (row) { var p = accPanel(row); if (row._a) { row._a.cancel(); row._a = null; } p.style.height = ''; row.classList.remove('is-animating', 'is-closing'); };
  var accFold = function (row) {
    if (!row.open || row.classList.contains('is-closing')) return;
    var p = accPanel(row), h = p.getBoundingClientRect().height;
    if (row._a) row._a.cancel();
    row.classList.add('is-animating', 'is-closing');
    if (reduce || !p.animate) { row.open = false; accEnd(row); return; }
    var an = row._a = p.animate([{ height: h + 'px' }, { height: '0px' }], { duration: ACC_DUR, easing: ACC_EASE, fill: 'forwards' });
    an.onfinish = function () { row.open = false; accEnd(row); };
  };
  var accUnfold = function (row) {
    var p = accPanel(row);
    if (row._a) row._a.cancel();
    row.classList.remove('is-closing');
    row.open = true;
    if (reduce || !p.animate) { accEnd(row); return; }
    var h = p.scrollHeight;
    row.classList.add('is-animating');
    var an = row._a = p.animate([{ height: '0px' }, { height: h + 'px' }], { duration: ACC_DUR, easing: ACC_EASE });
    an.onfinish = function () { accEnd(row); sync(); };
    var copy = row.querySelector('.svc__copy');
    copy && copy.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 140, easing: ACC_EASE, fill: 'backwards' });
  };
  var accHold = function (row) {
    /* keep this row's heading still on screen while rows above it accFold */
    var sum = row.querySelector('.svc__sum'), y0 = sum.getBoundingClientRect().top, t0 = performance.now();
    var step = function (t) {
      var dy = sum.getBoundingClientRect().top - y0;
      if (Math.abs(dy) > .5) scrollBy(0, dy);
      if (t - t0 < ACC_DUR + 80) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  rows.forEach(function (row) {
    row.querySelector('.svc__sum').addEventListener('click', function (e) {
      e.preventDefault();
      if (row.open && !row.classList.contains('is-closing')) { accFold(row); return; }
      var above = false;
      rows.forEach(function (r) { if (r !== row && r.open) { if (r.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING) above = true; accFold(r); } });
      accUnfold(row);
      if (above && !reduce) accHold(row);
    });
  });

  /* ---- before / after: range input drives the split; pointer drag anywhere on the photo; view switcher ---- */
  var ba = document.querySelector('[data-ba]');
  if (ba) {
    var range = ba.querySelector('.ba__range');
    var setX = function (v) { ba.style.setProperty('--x', v + '%'); range.value = v; };
    range.addEventListener('input', function () { setX(+range.value); });
    var dragging = false;
    var fromEvent = function (e) { var r = ba.getBoundingClientRect(); return Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)); };
    ba.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; dragging = true; ba.classList.add('is-drag'); setX(fromEvent(e)); });
    addEventListener('pointermove', function (e) { if (dragging) setX(fromEvent(e)); });
    addEventListener('pointerup', function () { dragging = false; ba.classList.remove('is-drag'); });
    var pairs = window.KB_PAIRS || [];
    var bImg = ba.querySelector('.ba__before'), aImg = ba.querySelector('.ba__after');
    [].forEach.call(document.querySelectorAll('[data-pair]'), function (btn) {
      btn.addEventListener('click', function () {
        var d = pairs[+btn.getAttribute('data-pair')]; if (!d) return;
        [].forEach.call(document.querySelectorAll('[data-pair]'), function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        bImg.srcset = d.b; bImg.src = d.bs; aImg.srcset = d.a; aImg.src = d.as;
        setX(50);
      });
    });
  }

  /* ---- quote form: inline validation, then a real post to the inbox ---- */
  var form = document.querySelector('[data-qf]');
  if (form) {
    var done = form.parentNode.querySelector('.qf__done');
    var fail = form.querySelector('[data-fail]');
    var send = form.querySelector('button[type="submit"]');
    var label = send.innerHTML;
    var fields = [].slice.call(form.querySelectorAll('[data-field]'));
    var ctl = function (f) { return f.querySelector('input, textarea, select'); };
    var ok = function (el) {
      var v = (el.value || '').trim();
      if (el.type === 'tel') { var n = v.replace(/\D/g, ''); return n.length >= 10 && n.length <= 14; }
      if (el.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (el.tagName === 'SELECT') return v !== '';
      if (el.tagName === 'TEXTAREA') return v.length >= 6;
      return v.length >= 2;
    };
    var mark = function (f, good) {
      var el = ctl(f), m = f.querySelector('[data-msg]');
      if (good) { f.removeAttribute('data-state'); el.removeAttribute('aria-invalid'); m.textContent = ''; }
      else { f.setAttribute('data-state', 'error'); el.setAttribute('aria-invalid', 'true'); m.textContent = el.getAttribute('data-error') || ''; }
      return good;
    };
    fields.forEach(function (f) {
      var el = ctl(f);
      el.addEventListener('blur', function () { if ((el.value || '').trim() || f.getAttribute('data-state') === 'error') mark(f, ok(el)); });
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { if (f.getAttribute('data-state') === 'error' && ok(el)) mark(f, true); });
    });
    var files = form.querySelector('input[type="file"]'), fname = form.querySelector('[data-files]');
    files && files.addEventListener('change', function () {
      var n = files.files.length;
      fname.textContent = n ? (n === 1 ? files.files[0].name : n + ' photos added') : 'JPG or PNG, up to 5 MB each';
    });
    var finish = function (tel) {
      var t = done.querySelector('[data-done-tel]'); if (t) t.textContent = tel || 'the number you gave';
      form.hidden = true; done.hidden = false; done.focus();
    };
    if (/[?&]sent=1/.test(location.search)) { finish(''); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (fail) fail.hidden = true;
      var first = null;
      fields.forEach(function (f) { if (!mark(f, ok(ctl(f))) && !first) first = ctl(f); });
      if (first) { first.focus(); return; }
      if (form.elements._honey && form.elements._honey.value) { finish(''); return; }
      var next = form.querySelector('input[name="_next"]');
      if (!next) { next = document.createElement('input'); next.type = 'hidden'; next.name = '_next'; form.appendChild(next); }
      next.value = location.origin + location.pathname + '?sent=1#quote';
      send.disabled = true; send.textContent = 'Sending';
      HTMLFormElement.prototype.submit.call(form);
    });
    addEventListener('pageshow', function () { send.disabled = false; send.innerHTML = label; });
  }

  /* ---- phone call bar: after the hero, gone again at the quote form ---- */
  var cb = document.querySelector('[data-callbar]');
  if (cb && 'IntersectionObserver' in window) {
    var heroGone = false, near = false;
    var render = function () { cb.classList.toggle('is-on', heroGone && !near); };
    var h = document.querySelector('[data-callbar-hero]'), q = document.querySelector('#quote');
    h && new IntersectionObserver(function (es) { var e = es[es.length - 1]; heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; render(); }).observe(h);
    q && new IntersectionObserver(function (es) { var e = es[es.length - 1]; near = e.isIntersecting || e.boundingClientRect.top < 0; render(); }, { rootMargin: '0px 0px 40px 0px' }).observe(q);
  }
})();
