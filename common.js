'use strict';

/* =========================================================
   common.js — 全ページ共通
   ・ナビ（モバイル開閉・現在地ハイライト）
   ・フッターの年号
   ・ホームの最新プレビュー（ブログ / つぶやき）
   ========================================================= */
(function () {
  var BLOG_KEY = 'ikedaya.blog.v1';
  var SNS_KEY = 'tsubuyaki.posts.v1';

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
    return (t.getMonth() + 1) + '月' + t.getDate() + '日';
  }

  /* ---- ナビ：現在地ハイライト ---- */
  var page = document.body.getAttribute('data-page');
  var active = document.querySelector('.nav__menu a[data-nav="' + page + '"]');
  if (active) active.classList.add('is-active');

  /* ---- ナビ：モバイル開閉 ---- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'CLOSE' : 'MENU';
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'MENU';
      }
    });
  }

  /* ---- フッター年号 ---- */
  document.querySelectorAll('.foot__copy').forEach(function (el) {
    el.innerHTML = el.innerHTML.replace(/\d{4}/, new Date().getFullYear());
  });

  /* ---- ホームのプレビュー ---- */
  var pvBlog = document.getElementById('previewBlog');
  var pvTalk = document.getElementById('previewTalk');

  if (pvBlog) {
    var blog = load(BLOG_KEY).slice(0, 3);
    if (blog.length === 0) {
      pvBlog.innerHTML = '<p class="preview__empty">まだ記事がありません。最初の一本を書いてみよう。</p>';
    } else {
      pvBlog.innerHTML = blog.map(function (a) {
        return '<div class="preview__item"><div class="t">' + esc(a.title) +
          '</div><div class="m">' + timeAgo(a.ts) + (a.tag ? ' ・ ' + esc(a.tag) : '') + '</div></div>';
      }).join('');
    }
  }

  if (pvTalk) {
    var talk = load(SNS_KEY).slice(0, 3);
    if (talk.length === 0) {
      pvTalk.innerHTML = '<p class="preview__empty">まだつぶやきがありません。ルーレットを回してみよう。</p>';
    } else {
      pvTalk.innerHTML = talk.map(function (p) {
        var text = p.text.length > 40 ? p.text.slice(0, 40) + '…' : p.text;
        return '<div class="preview__item"><div class="t">' + esc(text) +
          '</div><div class="m">' + esc(p.name) + ' ・ ' + timeAgo(p.ts) +
          (p.topic ? ' ・ 🎯' + esc(p.topic) : '') + '</div></div>';
      }).join('');
    }
  }
})();
