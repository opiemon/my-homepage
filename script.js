'use strict';

/* =========================================================
   つぶやきルーレット — script.js
   お題ルーレット + 匿名タイムライン（localStorage 保存）
   ========================================================= */
(function () {
  var STORE_KEY = 'tsubuyaki.posts.v1';
  var STAT_KEY = 'tsubuyaki.stats.v1';

  /* お題プール（人の考え・思想がのぞけるものを中心に） */
  var TOPICS = [
    '最近ひそかにハマっているもの',
    '実はどうでもいいと思っていること',
    '10年後の自分に一言',
    '密かにこだわっていること',
    '人生でいちばんの失敗',
    '明日、誰かに話したいこと',
    '今いちばん欲しいもの',
    '最近、考えが変わったこと',
    '誰にも言えない小さな野望',
    '世界をひとつだけ変えられるなら',
    '今日ちょっと嬉しかったこと',
    '子どもの頃の夢、覚えてる？',
    'これだけは譲れない、というもの',
    '実は苦手なこと',
    '生まれ変わったら何になりたい？',
    '最近もらった、心に残る言葉',
    '無人島に一つ持っていくなら',
    'つい後回しにしてしまうこと',
    '幸せを感じる、地味な瞬間',
    'もし1日だけ休みが増えたら',
    '自分をひとことで表すと',
    '最近やめてよかったこと',
    'こっそり自慢したいこと',
    '5年前の自分に教えてあげたいこと'
  ];

  /* 匿名ネームの部品 */
  var ADJ = ['ねむい', 'はらぺこ', 'きまぐれ', 'しずかな', 'あわてんぼう', 'ごきげん',
    'とおくの', 'あまえんぼう', 'まよえる', 'ひみつの', 'よふかしの', 'ひなたの'];
  var NOUN = ['カメ', 'ねこ', 'ペンギン', 'たぬき', 'こぐま', 'いるか', 'ふくろう',
    'きつね', 'うさぎ', 'はりねずみ', 'らっこ', 'あざらし'];
  var AV_COLORS = ['#6d5efc', '#ff5a86', '#ffb020', '#22c1c3', '#8b5cf6',
    '#f472b6', '#34d399', '#f59e0b', '#60a5fa', '#fb7185'];

  /* ---------- DOM ---------- */
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

  /* ---------- State ---------- */
  var posts = load(STORE_KEY, []);
  var stats = load(STAT_KEY, { posts: 0, likes: 0, spins: 0 });
  var currentTopic = null;
  var filterTopic = null;

  /* ---------- Storage ---------- */
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(posts));
      localStorage.setItem(STAT_KEY, JSON.stringify(stats));
    } catch (e) { toast('保存できませんでした（容量制限かも）'); }
  }

  /* ---------- Utils ---------- */
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function randomName() { return rand(ADJ) + rand(NOUN); }

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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

  /* ---------- Toast ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    // reflow して再アニメーション
    void toastEl.offsetWidth;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2200);
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    statPosts.textContent = stats.posts;
    statLikes.textContent = stats.likes;
    spinCount.textContent = stats.spins;
  }

  /* =======================================================
     お題ルーレット
     ======================================================= */
  var spinning = false;
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    reel.classList.add('is-spinning');
    reel.classList.remove('is-hit');
    jumpPost.hidden = true;

    var final = rand(TOPICS);
    // 直前と同じお題は避ける
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
        showComposerTopic(final);
        jumpPost.hidden = false;
        spinning = false;
        spinBtn.disabled = false;
        spinBtn.innerHTML = '<span class="btn__icon">🎲</span> もう一度回す';
        stats.spins++;
        renderStats();
        save();
      }
    }, 70);
  }

  function showComposerTopic(topic) {
    topicChip.textContent = '🎯 ' + topic;
    composerTopic.hidden = false;
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

  /* =======================================================
     投稿フォーム
     ======================================================= */
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
    var post = {
      id: uid(),
      name: name,
      text: text,
      topic: currentTopic || null,
      likes: 0,
      liked: false,
      ts: Date.now()
    };
    posts.unshift(post);
    stats.posts++;
    save();

    postText.value = '';
    charCount.textContent = '0';
    postBtn.disabled = true;
    render();
    renderStats();
    toast('つぶやきました 🎉');

    // 投稿後、自分の投稿までスクロール
    var first = feed.querySelector('.post');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* =======================================================
     タイムライン描画
     ======================================================= */
  function visiblePosts() {
    var list = posts.slice();
    if (filterTopic) list = list.filter(function (p) { return p.topic === filterTopic; });
    if (sortSelect.value === 'like') {
      list.sort(function (a, b) { return b.likes - a.likes || b.ts - a.ts; });
    } else {
      list.sort(function (a, b) { return b.ts - a.ts; });
    }
    return list;
  }

  function render() {
    var list = visiblePosts();
    feed.innerHTML = '';

    // フィルタ表示
    if (filterTopic) {
      filterBar.hidden = false;
      activeFilter.textContent = '🎯 ' + filterTopic;
    } else {
      filterBar.hidden = true;
    }

    if (list.length === 0) {
      emptyState.hidden = false;
      return;
    }
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
        filterTopic = p.topic;
        render();
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
      save();
      render();
      toast('削除しました');
    });

    return node;
  }

  sortSelect.addEventListener('change', render);
  filterClear.addEventListener('click', function () { filterTopic = null; render(); });

  /* 相対時間を定期更新 */
  setInterval(function () {
    var els = feed.querySelectorAll('.post__time');
    var list = visiblePosts();
    els.forEach(function (el, i) { if (list[i]) el.textContent = timeAgo(list[i].ts); });
  }, 60000);

  /* =======================================================
     サンプル投稿
     ======================================================= */
  seedBtn.addEventListener('click', function () {
    var samples = [
      { name: 'よふかしのふくろう', text: '夜中の静けさがいちばん落ち着く。誰にも邪魔されない時間って贅沢だと思う。', topic: '幸せを感じる、地味な瞬間', likes: 5 },
      { name: 'はらぺこカメ', text: 'コンビニの新作スイーツを制覇するのが密かな目標。今週は3勝。', topic: '誰にも言えない小さな野望', likes: 3 },
      { name: 'きまぐれねこ', text: '「完璧じゃなくていい」って言葉に最近すごく救われてる。', topic: '最近もらった、心に残る言葉', likes: 8 },
      { name: 'まよえるたぬき', text: '昔は一人が寂しいと思ってたけど、今は一人の時間が好きになった。人って変わるな。', topic: '最近、考えが変わったこと', likes: 6 }
    ];
    var now = Date.now();
    samples.forEach(function (s, i) {
      posts.unshift({
        id: uid(), name: s.name, text: s.text, topic: s.topic,
        likes: s.likes, liked: false, ts: now - (i + 1) * 3600000 * (i + 1)
      });
    });
    save();
    render();
    toast('サンプルを追加しました');
  });

  /* =======================================================
     全消去
     ======================================================= */
  resetAll.addEventListener('click', function () {
    if (!confirm('保存された投稿・記録をすべて消します。よろしいですか？')) return;
    posts = [];
    stats = { posts: 0, likes: 0, spins: 0 };
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(STAT_KEY);
    } catch (e) {}
    filterTopic = null;
    currentTopic = null;
    composerTopic.hidden = true;
    render();
    renderStats();
    toast('すべて消去しました');
  });

  /* ---------- Init ---------- */
  render();
  renderStats();
})();
