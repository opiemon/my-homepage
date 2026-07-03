'use strict';

/* =========================================================
   common.js — 全ページ共通
   ナビ / カーソルグロー / スクロール表示 / お問い合わせ / プレビュー
   ========================================================= */
(function () {
  var BLOG_KEY = 'ikedaya.blog.v1';

  function load(key) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
    catch (e) { return []; }
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function timeAgo(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'たった今';
    if (d < 3600) return Math.floor(d / 60) + '分前';
    if (d < 86400) return Math.floor(d / 3600) + '時間前';
    if (d < 604800) return Math.floor(d / 86400) + '日前';
    var t = new Date(ts);
    return t.getFullYear() + '.' + String(t.getMonth() + 1).padStart(2, '0') + '.' + String(t.getDate()).padStart(2, '0');
  }

  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    void toastEl.offsetWidth;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2200);
  }
  window.__toast = toast;

  /* ---- ナビ：スクロールで背景 ---- */
  var nav = document.getElementById('nav');
  function onScroll() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 20); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- ナビ：現在地 ---- */
  var page = document.body.getAttribute('data-page');
  var active = document.querySelector('.nav__menu a[data-nav="' + page + '"]');
  if (active) active.classList.add('is-active');

  /* ---- ナビ：モバイル開閉 ---- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- カーソルグロー ---- */
  var cursor = document.getElementById('cursor');
  if (cursor && window.matchMedia('(hover: hover)').matches) {
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy;
    cursor.style.opacity = '0';
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      cursor.style.opacity = '1';
    });
    (function loop() {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      cursor.style.left = cx + 'px';
      cursor.style.top = cy + 'px';
      requestAnimationFrame(loop);
    })();
  }

  /* ---- スクロール表示 ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- フッター年号 ---- */
  document.querySelectorAll('.footer__bottom span').forEach(function (el) {
    if (/\d{4}/.test(el.textContent)) el.textContent = el.textContent.replace(/\d{4}/, new Date().getFullYear());
  });

  /* ---- ホーム：ブログ最新プレビュー ---- */
  var pv = document.getElementById('previewBlog');
  if (pv) {
    var blog = load(BLOG_KEY).slice(0, 4);
    if (blog.length === 0) {
      pv.innerHTML = '<p class="blog-empty">まだ記事がありません。' +
        '<a href="blog.html" style="text-decoration:underline">最初の一本</a>を書いてみよう。</p>';
    } else {
      pv.innerHTML = blog.map(function (a) {
        var ex = a.body.replace(/\s+/g, ' ');
        ex = ex.length > 80 ? ex.slice(0, 80) + '…' : ex;
        return '<a class="blog-card" href="blog.html">' +
          '<div class="blog-card__meta">' + timeAgo(a.ts) + (a.tag ? ' · ' + esc(a.tag) : '') + '</div>' +
          '<div class="blog-card__title">' + esc(a.title) + '</div>' +
          '<div class="blog-card__excerpt">' + esc(ex) + '</div></a>';
      }).join('');
    }
  }

  /* ---- お問い合わせ：メールコピー ---- */
  var copyMail = document.getElementById('copyMail');
  if (copyMail) {
    copyMail.addEventListener('click', function () {
      var addr = 'bokuopiemon@gmail.com';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () { toast('メールアドレスをコピーしました'); },
          function () { toast(addr); });
      } else { toast(addr); }
    });
  }

  /* ---- お問い合わせ：mailto 生成 ---- */
  var form = document.getElementById('contactForm');
  if (form) {
    var status = document.getElementById('formStatus');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('cName').value.trim();
      var email = document.getElementById('cEmail').value.trim();
      var msg = document.getElementById('cMsg').value.trim();
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!name || !email || !msg) { status.textContent = 'すべての項目をご記入ください。'; status.className = 'form-status'; return; }
      if (!emailRe.test(email)) { status.textContent = 'メールアドレスの形式をご確認ください。'; status.className = 'form-status'; return; }

      var subject = '【お問い合わせ】' + name + ' 様より';
      var body = 'お名前：' + name + '\nメール：' + email + '\n\n' + msg + '\n';
      var url = 'mailto:bokuopiemon@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      window.location.href = url;
      status.textContent = 'メールソフトを開きました。開かない場合は bokuopiemon@gmail.com まで直接どうぞ。';
      status.className = 'form-status ok';
    });
  }
})();
