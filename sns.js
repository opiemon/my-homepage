'use strict';

/* =========================================================
   sns.js — つぶやきルーレット（お題ルーレット + 匿名TL）
   localStorage 保存。お題は「毎日やっていること」中心にリニューアル。
   ========================================================= */
(function () {
  var STORE_KEY = 'tsubuyaki.posts.v1';
  var STAT_KEY = 'tsubuyaki.stats.v1';

  /* お題プール — 人が毎日やっていそうなことを幅広く */
  var TOPICS = [
    // 食
    '今日の朝ごはん、何食べた？',
    'お昼は何にした？',
    '今夜の晩ごはんの予定は？',
    'コーヒー派？お茶派？今日の一杯',
    '今日いちばん美味しかったもの',
    'つい買っちゃうコンビニのアレ',
    '冷蔵庫にいま入っているもの',
    // 生活・ルーティン
    '朝いちばんにやること',
    '寝る前に必ずやること',
    'お風呂は朝派？夜派？',
    '今日の睡眠時間、足りてる？',
    '今日やった家事はなに？',
    '通勤・通学中に考えていたこと',
    '今日いちばん時間を使ったこと',
    '今日の「ちょっとめんどくさい」',
    'つい後回しにしていること',
    '今日サボりたかった瞬間',
    '帰りに寄り道した？したい？',
    '今のデスク・部屋の散らかり具合',
    // 気分・感情
    '今日ちょっと嬉しかったこと',
    '今日いちばん笑ったこと',
    '今日のイラッとした瞬間',
    '今日の天気で気分どうだった？',
    '今いちばんテンション上がること',
    '最近ちょっと疲れてること',
    'いま地味に幸せを感じる瞬間',
    // 趣味・時間
    '今日聴いていた音楽',
    '最近ハマって見てるもの',
    '今日いちばん開いたアプリ',
    'スマホでつい見ちゃうもの',
    '最近読んでる・気になる本',
    'ながらでやってしまうこと',
    '今日の運動、した？さぼった？',
    // ちょっと先のこと
    '週末にやりたい地味なこと',
    '今いちばん欲しいもの',
    '次の休みにしたいこと',
    '明日の自分への申し送り',
    'ちょっと先に楽しみにしてること',
    // 人・考え
    '最近、誰かに言われて嬉しかった言葉',
    '最近ちょっと考えが変わったこと',
    'これだけは譲れない、というもの',
    '密かにこだわっていること',
    '最近やめてよかったこと',
    '自分をひとことで表すと',
    'こっそり自慢したいこと',
    '今日、誰かに感謝したいこと'
  ];

  var ADJ = ['ねむい', 'はらぺこ', 'きまぐれ', 'しずかな', 'あわてんぼう', 'ごきげん',
    'とおくの', 'あまえんぼう', 'まよえる', 'ひみつの', 'よふかしの', 'ひなたの'];
  var NOUN = ['カメ', 'ねこ', 'ペンギン', 'たぬき', 'こぐま', 'いるか', 'ふくろう',
    'きつね', 'うさぎ', 'はりねずみ', 'らっこ', 'あざらし'];
  var AV_COLORS = ['#d0ff2e', '#ff3b3b', '#ff2e93', '#22c1c3', '#8b5cf6',
    '#f59e0b', '#34d399', '#60a5fa', '#fb7185', '#a3e635'];

  var $ = function (id) { return document.getElementById(id); };
  var reel = $('reel'), reelText = $('reelText');
  var spinBtn = $('spinBtn'), spinCount = $('spinCount'), jumpPost = $('jumpPost');
  var composerTopic = $('composerTopic'), topicChip = $('topicChip'), topicClear = $('topicClear');
  var postForm = $('postForm'), postText = $('postText'), postName = $('postName');
  var charCount = $('charCount'), postBtn = $('postBtn');
  var feed = $('feed'), emptyState = $('emptyState'), sortSelect = $('sortSelect'), seedBtn = $('seedBtn');
  var filterBar = $('filterBar'), activeFilter = $('activeFilter'), filterClear = $('filterClear');
  var statPosts = $('statPosts'), statLikes = $('statLikes');
  var resetAll = $('resetAll'), tpl = $('postTpl');

  var posts = load(STORE_KEY, []);
  var stats = load(STAT_KEY, { posts: 0, likes: 0, spins: 0 });
  var currentTopic = null;
  var filterTopic = null;

  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(posts));
      localStorage.setItem(STAT_KEY, JSON.stringify(stats));
    } catch (e) { toast('保存できませんでした（容量制限かも）'); }
  }

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function randomName() { return rand(ADJ) + rand(NOUN); }
  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }
  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'たった今';
    if (diff < 60) return diff + '秒前';
    if (diff < 3600) return Math.floor(diff / 60) + '分前';
    if (diff < 86400) return Math.floor(diff / 3600) + '時間前';
    if (diff < 604800) return Math.floor(diff / 86400) + '日前';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
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

  function renderStats() {
    statPosts.textContent = stats.posts;
    statLikes.textContent = stats.likes;
    spinCount.textContent = stats.spins;
  }

  /* ---- ルーレット ---- */
  var spinning = false;
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    reel.classList.add('is-spinning');
    reel.classList.remove('is-hit');
    jumpPost.hidden = true;

    var final = rand(TOPICS);
    if (currentTopic) { while (final === currentTopic) final = rand(TOPICS); }

    var ticks = 16, i = 0;
    var timer = setInterval(function () {
      reelText.textContent = rand(TOPICS);
      i++;
      if (i >= ticks) {
        clearInterval(timer);
        reelText.textContent = final;
        reel.classList.remove('is-spinning');
        reel.classList.add('is-hit');
        currentTopic = final;
        topicChip.textContent = '🎯 ' + final;
        composerTopic.hidden = false;
        jumpPost.hidden = false;
        spinning = false;
        spinBtn.disabled = false;
        spinBtn.textContent = '🎲 もう一度回す';
        stats.spins++;
        renderStats();
        save();
      }
    }, 70);
  }

  spinBtn.addEventListener('click', spin);
  jumpPost.addEventListener('click', function () {
    $('composer').scrollIntoView({ behavior: 'smooth', block: 'center' });
    postText.focus();
  });
  topicClear.addEventListener('click', function () {
    currentTopic = null;
    composerTopic.hidden = true;
  });

  /* ---- 投稿 ---- */
  postText.addEventListener('input', function () {
    var len = postText.value.length;
    charCount.textContent = len;
    charCount.parentNode.classList.toggle('is-over', len > 260);
    postBtn.disabled = postText.value.trim() === '';
  });
  postBtn.disabled = true;

  postForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = postText.value.trim();
    if (!text) return;
    var name = postName.value.trim() || randomName();
    posts.unshift({ id: uid(), name: name, text: text, topic: currentTopic || null, likes: 0, liked: false, ts: Date.now() });
    stats.posts++;
    save();
    postText.value = '';
    charCount.textContent = '0';
    postBtn.disabled = true;
    render();
    renderStats();
    toast('つぶやきました 🎉');
    var first = feed.querySelector('.post');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---- TL ---- */
  function visiblePosts() {
    var list = posts.slice();
    if (filterTopic) list = list.filter(function (p) { return p.topic === filterTopic; });
    if (sortSelect.value === 'like') list.sort(function (a, b) { return b.likes - a.likes || b.ts - a.ts; });
    else list.sort(function (a, b) { return b.ts - a.ts; });
    return list;
  }

  function render() {
    var list = visiblePosts();
    feed.innerHTML = '';
    if (filterTopic) { filterBar.hidden = false; activeFilter.textContent = '🎯 ' + filterTopic; }
    else filterBar.hidden = true;
    if (list.length === 0) { emptyState.hidden = false; return; }
    emptyState.hidden = true;
    list.forEach(function (p) { feed.appendChild(buildCard(p)); });
  }

  function buildCard(p) {
    var node = tpl.content.firstElementChild.cloneNode(true);
    var av = node.querySelector('.post__avatar');
    av.textContent = Array.from(p.name)[0] || '?';
    av.style.background = AV_COLORS[hashCode(p.name) % AV_COLORS.length];

    node.querySelector('.post__name').textContent = p.name;
    var timeEl = node.querySelector('.post__time');
    timeEl.textContent = timeAgo(p.ts);
    timeEl.dateTime = new Date(p.ts).toISOString();
    node.querySelector('.post__text').textContent = p.text;

    var topicBtn = node.querySelector('.post__topic');
    if (p.topic) {
      topicBtn.hidden = false;
      topicBtn.textContent = '🎯 ' + p.topic;
      topicBtn.addEventListener('click', function () {
        filterTopic = p.topic; render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    var like = node.querySelector('.like');
    var likeIcon = node.querySelector('.like__icon');
    var likeCount = node.querySelector('.like__count');
    likeCount.textContent = p.likes;
    if (p.liked) { like.classList.add('is-liked'); likeIcon.textContent = '❤️'; }
    like.addEventListener('click', function () {
      p.liked = !p.liked;
      if (p.liked) { p.likes++; stats.likes++; likeIcon.textContent = '❤️'; }
      else { p.likes = Math.max(0, p.likes - 1); stats.likes = Math.max(0, stats.likes - 1); likeIcon.textContent = '🤍'; }
      like.classList.toggle('is-liked', p.liked);
      likeCount.textContent = p.likes;
      renderStats();
      save();
    });

    node.querySelector('.post__del').addEventListener('click', function () {
      if (!confirm('この投稿を削除しますか？')) return;
      posts = posts.filter(function (x) { return x.id !== p.id; });
      save(); render();
      toast('削除しました');
    });

    return node;
  }

  sortSelect.addEventListener('change', render);
  filterClear.addEventListener('click', function () { filterTopic = null; render(); });

  setInterval(function () {
    var els = feed.querySelectorAll('.post__time');
    var list = visiblePosts();
    els.forEach(function (el, i) { if (list[i]) el.textContent = timeAgo(list[i].ts); });
  }, 60000);

  /* ---- サンプル ---- */
  seedBtn.addEventListener('click', function () {
    var samples = [
      { name: 'はらぺこカメ', text: '朝ごはんは結局トーストとコーヒー。毎日同じでも飽きないから不思議。', topic: '今日の朝ごはん、何食べた？', likes: 4 },
      { name: 'よふかしのふくろう', text: '寝る前のスマホ、やめたいのに今日も見てしまった…明日こそ。', topic: '寝る前に必ずやること', likes: 6 },
      { name: 'きまぐれねこ', text: '通勤中ずっと週末の予定を妄想してた。まだ火曜なのに。', topic: '通勤・通学中に考えていたこと', likes: 3 },
      { name: 'ごきげんらっこ', text: 'コンビニの新作プリン、今日も買っちゃった。これが小さな幸せ。', topic: 'つい買っちゃうコンビニのアレ', likes: 8 }
    ];
    var now = Date.now();
    samples.forEach(function (s, i) {
      posts.unshift({ id: uid(), name: s.name, text: s.text, topic: s.topic, likes: s.likes, liked: false, ts: now - (i + 1) * 5400000 });
    });
    save(); render();
    toast('サンプルを追加しました');
  });

  /* ---- 全消去 ---- */
  resetAll.addEventListener('click', function () {
    if (!confirm('つぶやきの保存データ・記録をすべて消します。よろしいですか？')) return;
    posts = [];
    stats = { posts: 0, likes: 0, spins: 0 };
    try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(STAT_KEY); } catch (e) {}
    filterTopic = null; currentTopic = null; composerTopic.hidden = true;
    render(); renderStats();
    toast('すべて消去しました');
  });

  render();
  renderStats();
})();
