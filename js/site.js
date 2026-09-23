/* 이돈휘 · PROJECT BB 포트폴리오 — 아티팩트 밖에서 붙이는 동작.
   index.html 은 tools/export_bb.py 가 뽑는 산출물이라 여기 따로 둔다. 손으로 관리하는 파일이다.
   영상 지연 재생과 게임 덮개는 index.html 안의 스크립트가 맡는다. */
(function () {
  'use strict';

  /* ── 1. 좌측 목차: 지금 읽고 있는 구간을 밝힌다 ─────────────── */
  function spy() {
    var links = [].slice.call(document.querySelectorAll('aside[data-side-index] a[href^="#"]'));
    var map = links.map(function (a) {
      return { a: a, el: document.getElementById(a.getAttribute('href').slice(1)) };
    }).filter(function (m) { return m.el; });
    if (!map.length) return;
    var cur = null, waiting = false;
    function mark() {
      var line = window.scrollY + window.innerHeight * 0.32, best = map[0];
      for (var i = 0; i < map.length; i++) {
        if (map[i].el.getBoundingClientRect().top + window.scrollY <= line) best = map[i];
      }
      if (best === cur) return;
      if (cur) cur.a.removeAttribute('aria-current');
      best.a.setAttribute('aria-current', 'true');
      cur = best;
    }
    addEventListener('scroll', function () {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(function () { waiting = false; mark(); });
    }, { passive: true });
    addEventListener('resize', mark);
    mark();
  }

  /* ── 2. BT 뷰어: 끌어서 옮기고, 버튼이나 Ctrl+휠로 확대한다 ─────
     트리가 틀보다 훨씬 커서(1102x1420) 이 동작이 없으면 절반 넘게 잘려 보인다. */
  function btViewer() {
    var box = document.getElementById('bt-viewer');
    var stage = box && box.firstElementChild;
    if (!stage) return;
    var z = 1, x = 0, y = 0, MIN = 0.25, MAX = 4;
    function apply() {
      stage.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) scale(' + z + ')';
    }
    // 처음 화면은 폭에 맞추고 위에서 시작한다. 좁은 화면에서는 글자가 읽히는 배율(0.7)을 지킨다
    function fitAll() {
      var w = stage.offsetWidth, h = stage.offsetHeight, r = box.getBoundingClientRect();
      if (!w || !h || !r.width) return;
      z = Math.max(Math.min(1, (r.width - 16) / w), 0.7);
      x = Math.max(0, (r.width - w * z) / 2);
      // 위쪽 46px 은 「끌어서 옮기고…」 안내 칩이 덮는 자리다
      y = h * z <= r.height ? Math.max(0, (r.height - h * z) / 2) : 46;
      apply();
    }
    function zoomAt(f, cx, cy) {
      var nz = Math.min(MAX, Math.max(MIN, z * f));
      if (nz === z) return;
      x = cx - (cx - x) * nz / z;
      y = cy - (cy - y) * nz / z;
      z = nz;
      apply();
    }
    // 그냥 굴리면 페이지가 내려가야 한다. Ctrl 을 눌렀을 때만 확대한다
    box.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var r = box.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    var drag = null;
    box.style.touchAction = 'none';
    box.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('button')) return;
      drag = { px: e.clientX, py: e.clientY };
      box.classList.add('is-drag');
      box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', function (e) {
      if (!drag) return;
      x += e.clientX - drag.px;
      y += e.clientY - drag.py;
      drag.px = e.clientX; drag.py = e.clientY;
      apply();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      box.addEventListener(t, function () { drag = null; box.classList.remove('is-drag'); });
    });

    // 확대 · 축소 · 처음 크기로 (버튼은 틀 바깥 형제 칸에 있다)
    var btns = box.parentElement.querySelectorAll('[data-btbtn]');
    function mid() { var r = box.getBoundingClientRect(); return [r.width / 2, r.height / 2]; }
    if (btns[0]) btns[0].addEventListener('click', function () { var m = mid(); zoomAt(1.25, m[0], m[1]); });
    if (btns[1]) btns[1].addEventListener('click', function () { var m = mid(); zoomAt(1 / 1.25, m[0], m[1]); });
    if (btns[2]) btns[2].addEventListener('click', fitAll);
    fitAll();
    addEventListener('resize', fitAll);
  }

  /* ── 3. 기믹 카드: 노드에 올리면 그 노드가 맡는 코드 줄만 밝아진다 ──
     카드별 [노드 순서] → 발췌 코드의 줄 번호. 발췌에 없는 노드는 빈 칸으로 둔다.
     카드의 코드 발췌를 바꾸면 이 표도 같이 고친다. */
  var LINES = [
    // TickChase — 추격 사다리 · 무접촉 시간 · 돌진 · 돌 던지기 · 예측 이동
    [[11, 12, 13, 14, 15, 16, 17], [3, 4, 5, 6, 7, 8, 9], [], [], []],
    // WipeRoutine — 전멸기 · 시전 예고 · 폭발 판정 · 발화 전파 · 지형 기록
    [[1], [8, 9, 10, 11, 12, 13, 15, 16], [3, 4, 5, 6, 17], [17], []],
    // BlueFlameHoming — 푸른 도깨비불 · 발사 예고 · 유도탄 생성 · 추적 갱신 · 명중 분기
    [[1, 2, 3, 4], [], [6, 10, 11, 12, 13, 14, 15, 16, 17], [7, 8, 9], []]
  ];
  function peek() {
    [].slice.call(document.querySelectorAll('[data-gimcard]')).forEach(function (card, ci) {
      var nodes = [].slice.call(card.querySelectorAll('[data-btnode]'));
      var lines = [].slice.call(card.querySelectorAll('[data-line]'));
      if (!nodes.length || !lines.length || !LINES[ci]) return;
      function off() {
        card.classList.remove('is-peek');
        lines.forEach(function (l) { l.classList.remove('is-lit'); });
      }
      function on(i) {
        var want = LINES[ci][i] || [];
        if (!want.length) { off(); return; }
        card.classList.add('is-peek');
        lines.forEach(function (l) {
          l.classList.toggle('is-lit', want.indexOf(+l.getAttribute('data-line')) >= 0);
        });
      }
      nodes.forEach(function (n, i) {
        n.tabIndex = 0;
        n.addEventListener('mouseenter', function () { on(i); });
        n.addEventListener('focus', function () { on(i); });
        n.addEventListener('mouseleave', off);
        n.addEventListener('blur', off);
      });
    });
  }

  spy();
  btViewer();
  peek();
})();
