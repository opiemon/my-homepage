'use strict';

/* =========================================================
   blog.js — Blog（localStorage 保存）
   ========================================================= */
(function () {
  var KEY = 'ikedaya.blog.v1';
  var $ = function (id) { return document.getElementById(id); };

  var form = $('blogForm'), title = $('blogTitle'), tag = $('blogTag'), body = $('blogBody');
  var articles = $('articles'), empty = $('blogEmpty'), tpl = $('articleTpl');
  var head = $('editorHead'), toggle = $('editorToggle'), seed = $('blogSeed');

  var posts = load();

  function load() {
    try { var r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
    catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(posts)); }
    catch (e) { toast('保存できませんでした（容量制限かも）'); }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  function toast(m) { if (window.__toast) window.__toast(m); }

  function setEditor(open) {
    form.hidden = !open;
    toggle.textContent = open ? '閉じる' : '開く';
    head.setAttribute('aria-expanded', String(open));
  }
  head.addEventListener('click', function () { setEditor(form.hidden); });
  head.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditor(form.hidden); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = title.value.trim(), b = body.value.trim();
    if (!t || !b) { toast('タイトルと本文を入れてください'); return; }
    posts.unshift({ id: uid(), title: t, tag: tag.value.trim(), body: b, ts: Date.now() });
    save();
    title.value = ''; tag.value = ''; body.value = '';
    render();
    toast('投稿しました');
    articles.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function render() {
    articles.innerHTML = '';
    if (posts.length === 0) { empty.hidden = false; return; }
    empty.hidden = true;
    posts.forEach(function (p) {
      var node = card(p);
      articles.appendChild(node);
      requestAnimationFrame(function () { node.classList.add('in'); });
    });
  }

  function card(p) {
    var node = tpl.content.firstElementChild.cloneNode(true);
    var tagEl = node.querySelector('.article__tag');
    if (p.tag) { tagEl.hidden = false; tagEl.textContent = '#' + p.tag; }
    var dateEl = node.querySelector('.article__date');
    dateEl.textContent = fmtDate(p.ts);
    dateEl.dateTime = new Date(p.ts).toISOString();
    node.querySelector('.article__title').textContent = p.title;

    var bodyEl = node.querySelector('.article__body');
    bodyEl.textContent = p.body;

    var more = node.querySelector('.article__more');
    if (p.body.length < 100 && p.body.indexOf('\n') === -1) {
      bodyEl.classList.remove('is-clamped');
      more.hidden = true;
    }
    more.addEventListener('click', function () {
      var clamped = bodyEl.classList.toggle('is-clamped');
      more.textContent = clamped ? '続きを読む' : '閉じる';
    });

    node.querySelector('.article__del').addEventListener('click', function () {
      if (!confirm('この記事を削除しますか？')) return;
      posts = posts.filter(function (x) { return x.id !== p.id; });
      save(); render();
      toast('削除しました');
    });
    return node;
  }

  if (seed) {
    seed.addEventListener('click', function () {
      var now = Date.now();
      var samples = [
        { title: 'つくる前に、決めること', tag: 'Note', body: '仕事の質は、手を動かす前でほとんど決まる。\n\n何をつくるかより、何をつくらないか。事業のゴールから逆算し、削れるものを削る。残ったものだけに、全力を注ぐ。\n\nシンプルさは、機能を減らすことではない。本質だけを残すことだ。' },
        { title: '戦略とデザインは、地続き', tag: 'Design', body: '経営戦略とデザインを別々の話にしない。ブランドの姿は、事業の意志そのもの。\n\n上流の判断が、最後の一画素まで効いてくる。だから、端から端まで見通す。' }
      ];
      samples.forEach(function (s, i) {
        posts.unshift({ id: uid(), title: s.title, tag: s.tag, body: s.body, ts: now - (i + 1) * 86400000 });
      });
      save(); render();
      toast('サンプル記事を追加しました');
    });
  }

  render();
})();
