/* =========================================================
   C++ 交互式课堂 · 应用逻辑
   教程导航 / 四区可视化 / C++ 教学模拟实验台
   ========================================================= */

(function () {
  'use strict';

  const COURSE = window.CPP_COURSE;
  const UTIL = window.CPP_UTIL || {};
  if (!COURSE) {
    document.getElementById('card-content').innerHTML =
      '<p style="color:#f85149">课程数据加载失败，请确认 js/content.js 存在。</p>';
    return;
  }

  const ESC = UTIL.escapeHtml || function (value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const HIGHLIGHT = UTIL.highlightCpp || function (value) { return ESC(value); };
  const DEDENT = UTIL.dedent || function (value) { return String(value); };

  const STORAGE_KEY = 'cpp-interactive-tutorial-v1';

  const els = {
    sidebar: document.getElementById('sidebar-chapters'),
    content: document.getElementById('card-content'),
    task: document.getElementById('card-task'),
    taskLabel: document.getElementById('task-label'),
    taskPrompt: document.getElementById('task-prompt'),
    taskSteps: document.getElementById('task-steps'),
    taskRead: document.getElementById('task-read-btn'),
    cardProgress: document.getElementById('card-progress'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    mobileSelect: document.getElementById('mobile-card-select'),
    topbarChapter: document.querySelector('.crumb-chapter'),
    topbarCard: document.querySelector('.crumb-card'),
    globalText: document.getElementById('global-progress-text'),
    globalBar: document.getElementById('global-progress-bar'),
    sidebarProgress: document.getElementById('sidebar-progress'),
    terminal: document.getElementById('terminal-output'),
    input: document.getElementById('terminal-input'),
    suggestions: document.getElementById('lab-suggestions'),
    labMode: document.getElementById('lab-mode'),
    labReset: document.getElementById('lab-reset'),
    run: document.getElementById('run-btn'),
    resetProgress: document.getElementById('reset-progress'),
    sourceBody: document.getElementById('source-body'),
    modelBody: document.getElementById('model-body'),
    memoryBody: document.getElementById('memory-body'),
    outputBody: document.getElementById('output-body'),
    sourceSubtitle: document.getElementById('source-subtitle'),
    modelSubtitle: document.getElementById('model-subtitle'),
    memorySubtitle: document.getElementById('memory-subtitle'),
    outputSubtitle: document.getElementById('output-subtitle'),
    sourceBadge: document.getElementById('source-badge'),
    modelBadge: document.getElementById('model-badge'),
    memoryBadge: document.getElementById('memory-badge'),
    outputBadge: document.getElementById('output-badge'),
    zones: document.getElementById('zones'),
    arrows: document.getElementById('arrows-overlay'),
    toast: document.getElementById('toast')
  };

  /* ---------------- 扁平化课程数据 ---------------- */

  const cards = [];
  COURSE.chapters.forEach(function (chapter, chapterIndex) {
    chapter.cards.forEach(function (card, cardIndex) {
      card.chapterIndex = chapterIndex;
      card.chapterNumber = chapterIndex + 1;
      card.chapterTitle = chapter.title;
      card.cardInChapter = cardIndex + 1;
      card.globalIndex = cards.length;
      cards.push(card);
    });
  });

  let currentIndex = 0;
  let currentCard = null;
  let labMode = null;
  let toastTimer = null;
  let commandHistory = [];
  let historyIndex = 0;
  let lastResult = { error: false };

  /* ---------------- 进度持久化 ---------------- */

  const completed = new Set();
  let chapterOpen = {};
  const stepProgress = {};

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.completed)) {
        saved.completed.forEach(function (id) {
          if (cards.some(function (c) { return c.id === id; })) completed.add(id);
        });
      }
      if (saved.open && typeof saved.open === 'object') chapterOpen = saved.open;
      if (saved.lastCard) {
        const idx = cards.findIndex(function (c) { return c.id === saved.lastCard; });
        if (idx >= 0) currentIndex = idx;
      }
    } catch (err) {
      /* localStorage 不可用时静默降级 */
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completed: Array.from(completed),
        lastCard: currentCard ? currentCard.id : null,
        open: chapterOpen
      }));
    } catch (err) {
      /* ignore */
    }
  }

  /* ---------------- 实验台状态 ---------------- */

  function hexAdd(address, bytes) {
    return '0x' + (parseInt(address, 16) + bytes).toString(16);
  }

  function makeMotor(name, id, address, isConst) {
    return {
      name: name,
      id: id,
      speed: 0,
      enabled: false,
      isConst: !!isConst,
      address: address
    };
  }

  function createMotorState() {
    return {
      objects: {
        motor: makeMotor('motor', 1, '0x61fe10', false)
      },
      order: ['motor'],
      pointers: {},
      log: [],
      lastAction: null,
      lastObject: null,
      addressStep: 1
    };
  }

  function createListNode(id, value, address, next) {
    return {
      id: id,
      value: value,
      address: address,
      next: next || null,
      alive: true,
      visited: false
    };
  }

  function createListState() {
    const nodes = {
      a: createListNode('a', 10, '0x1a2b30', 'b'),
      b: createListNode('b', 20, '0x1a2b50', 'c'),
      c: createListNode('c', 30, '0x1a2b70', null)
    };
    return {
      nodes: nodes,
      order: ['a', 'b', 'c'],
      head: 'a',
      removed: [],
      log: [],
      lastAction: null,
      changedId: null,
      newId: null,
      removedId: null,
      counter: 1,
      addressStep: 3
    };
  }

  function createFilterState() {
    return {
      samples: [null, null, null, null],
      sum: 0,
      index: 0,
      count: 0,
      lastAvg: null,
      lastValue: null,
      lastIndex: null,
      log: [],
      lastAction: null
    };
  }

  function createProjectState() {
    return {
      filter: createFilterState(),
      motor: makeMotor('motor', 1, '0x61fe40', false),
      lastRaw: null,
      lastAvg: null,
      lastOk: null,
      log: [],
      lastAction: null
    };
  }

  const lab = {
    motor: createMotorState(),
    list: createListState(),
    filter: createFilterState(),
    project: createProjectState()
  };

  function activeState() {
    return lab[labMode] || lab.motor;
  }

  function resetModeState(mode) {
    if (mode === 'motor') lab.motor = createMotorState();
    if (mode === 'list') lab.list = createListState();
    if (mode === 'filter') lab.filter = createFilterState();
    if (mode === 'project') lab.project = createProjectState();
  }

  /* ---------------- 通用工具 ---------------- */

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function modeLabel(mode) {
    return {
      motor: 'Motor',
      list: 'LinkedList',
      filter: 'MovingAverage',
      project: 'Pipeline'
    }[mode] || 'Lab';
  }

  function modeInputPlaceholder(mode) {
    return {
      motor: '输入 C++ 语句，如 motor.setSpeed(80)',
      list: '输入链表命令，如 traverse',
      filter: '输入采样，如 push 100',
      project: '输入 update 80，观察完整流水线'
    }[mode] || '输入命令，回车执行…';
  }

  function currentViz() {
    return currentCard ? (currentCard.viz || 'class') : 'class';
  }

  function logToState(mode, type, text) {
    const state = lab[mode];
    if (!state || !state.log) return;
    String(text).split('\n').forEach(function (line) {
      if (!line.trim()) return;
      state.log.push({ type: type, text: line });
    });
    while (state.log.length > 12) state.log.shift();
  }

  function emit(text, cls, opts) {
    const options = opts || {};
    appendTerminal(text, cls || 'output');
    if (options.top !== false) {
      logToState(labMode || 'motor', cls || 'output', text);
    }
  }

  function emitError(text, note) {
    appendTerminal(text, 'err');
    logToState(labMode || 'motor', 'err', text);
    if (note) {
      appendTerminal(note, 'dim');
      logToState(labMode || 'motor', 'dim', note);
    }
  }

  function appendTerminal(text, cls) {
    const lines = String(text).split('\n');
    lines.forEach(function (line) {
      const div = document.createElement('div');
      div.className = 'term-line ' + (cls || 'output');
      div.textContent = line;
      els.terminal.appendChild(div);
    });
    while (els.terminal.children.length > 500) {
      els.terminal.removeChild(els.terminal.firstChild);
    }
    els.terminal.scrollTop = els.terminal.scrollHeight;
  }

  function appendInput(command) {
    const div = document.createElement('div');
    div.className = 'term-line input';
    const prompt = document.createElement('span');
    prompt.className = 'term-prompt';
    prompt.textContent = '$ ';
    div.appendChild(prompt);
    div.appendChild(document.createTextNode(command));
    els.terminal.appendChild(div);
    els.terminal.scrollTop = els.terminal.scrollHeight;
  }

  function clearTerminal() {
    els.terminal.innerHTML = '';
  }

  function printWelcome(mode) {
    appendTerminal('C++ 交互式课堂 · ' + modeLabel(mode) + ' 实验台', 'system');
    appendTerminal('教学模拟器：不会调用真实编译器，但会按 C++ 语义更新对象状态。', 'dim');
    appendTerminal('输入 help 查看命令。跟随右侧任务动手，顶部四区会同步变化。', 'dim');
    if (mode === 'motor') {
      appendTerminal('试试：Motor motor(1)  →  motor.setSpeed(80)', 'info');
    } else if (mode === 'list') {
      appendTerminal('试试：traverse  →  insertAfter 10 15  →  removeAfter 10', 'info');
    } else if (mode === 'filter') {
      appendTerminal('试试：push 100  →  push 101  →  status', 'info');
    } else if (mode === 'project') {
      appendTerminal('试试：update 80  →  update 90  →  status', 'info');
    }
    els.terminal.scrollTop = els.terminal.scrollHeight;
  }

  function setLabMode(mode) {
    if (!mode) return;
    const changed = labMode !== mode;
    labMode = mode;
    els.labMode.textContent = modeLabel(mode);
    els.input.placeholder = modeInputPlaceholder(mode);
    if (changed) {
      clearTerminal();
      printWelcome(mode);
    }
  }

  function resetCurrentLab(silent) {
    if (!labMode) return;
    resetModeState(labMode);
    clearTerminal();
    if (!silent) {
      appendTerminal('实验台已重置。', 'info');
      printWelcome(labMode);
    }
    renderZones();
    renderSuggestions();
    showToast('已重置 ' + modeLabel(labMode) + ' 实验台');
  }

  function activeLog() {
    const state = activeState();
    return state && state.log ? state.log : [];
  }

  /* ---------------- 顶部四区：源码 ---------------- */

  function sourceBadge(file) {
    if (!file) return 'C++';
    const lower = file.toLowerCase();
    if (lower.endsWith('.c') || lower.endsWith('.h')) return 'C';
    if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'TXT';
    return 'C++';
  }

  function renderSource() {
    const file = currentCard.file || 'motor.cpp';
    const raw = DEDENT(currentCard.snippet || '// 暂无源码片段');
    const lines = String(raw).split('\n');
    const focus = currentCard.focus || [];
    const html = [
      '<div class="src-meta"><span class="src-dot"></span>',
      '<span>' + ESC(file) + '</span>',
      '<span class="src-lines-count">' + lines.length + ' 行</span></div>',
      '<div class="src-lines">'
    ];

    lines.forEach(function (line, index) {
      const lineNo = index + 1;
      const isFocus = focus.indexOf(lineNo) >= 0;
      html.push(
        '<div class="src-line' + (isFocus ? ' focus' : '') + '">' +
        '<span class="ln">' + lineNo + '</span>' +
        '<code>' + HIGHLIGHT(line) + '</code></div>'
      );
    });
    html.push('</div>');

    els.sourceBody.innerHTML = html.join('');
    els.sourceSubtitle.textContent = file;
    els.sourceBadge.textContent = sourceBadge(file);
  }

  /* ---------------- 顶部四区：对象模型 ---------------- */

  function renderClassModel() {
    const state = lab.motor;
    let html = '';

    const pointers = Object.keys(state.pointers).map(function (key) {
      return state.pointers[key];
    }).slice(0, 2);

    pointers.forEach(function (ptr) {
      html += '<div class="pointer-strip">' +
        '<strong>' + ESC(ptr.name) + '</strong>' +
        (ptr.isConst ? ' <span class="vis-tag private">const</span>' : '') +
        ' <span class="ptr-arrow">→</span> ' +
        '<span class="ptr-target">' + (ptr.target ? ESC(ptr.target) : 'nullptr') + '</span>' +
        '</div>';
    });

    const objects = state.order.map(function (name) {
      return state.objects[name];
    }).filter(Boolean).slice(0, 3);

    if (!objects.length) {
      return '<div class="zone-empty">还没有对象，输入 Motor motor(1) 创建。</div>';
    }

    objects.forEach(function (obj, index) {
      const focusClass = state.lastObject === obj.name ? ' is-focus' : '';
      const compact = index > 0;
      html += '<div class="obj-card' + focusClass + '" style="margin-bottom:6px">' +
        '<div class="obj-head">' +
        '<span class="obj-name">' + ESC(obj.name) + '</span>' +
        '<span class="obj-type">Motor</span>' +
        (obj.isConst ? '<span class="obj-tag const">const</span>' : '<span class="obj-tag">对象</span>') +
        '</div>';

      html += fieldRow('private', 'id_', obj.id, null, false);
      html += fieldRow('private', 'speed_', obj.speed, null, state.lastObject === obj.name && state.lastAction === 'setSpeed');
      html += fieldRow('private', 'enabled_', obj.enabled ? '1' : '0', obj.enabled, state.lastObject === obj.name && (state.lastAction === 'enable' || state.lastAction === 'disable'));
      if (!compact) {
        html += '<div class="obj-api">' +
          '<span class="api-chip">setSpeed()</span>' +
          '<span class="api-chip">enable()</span>' +
          '<span class="api-chip">speed() const</span>' +
          '</div>';
      }
      html += '</div>';
    });

    if (state.order.length > 3) {
      html += '<div class="obj-note">还有 ' + (state.order.length - 3) + ' 个对象未显示。</div>';
    }
    return html;
  }

  function fieldRow(visibility, name, value, boolValue, changed) {
    return '<div class="obj-field">' +
      '<span class="vis-tag ' + visibility + '">' + visibility + '</span>' +
      '<span class="field-name">' + ESC(name) + '</span>' +
      '<span class="field-val' +
      (boolValue === true ? ' bool-true' : '') +
      (boolValue === false && value === '0' ? ' bool-false' : '') +
      (changed ? ' changed' : '') +
      '">' + ESC(value) + '</span></div>';
  }

  function renderCStructModel() {
    return [
      '<div class="split-panel">',
      '  <div class="panel-box">',
      '    <div class="panel-title">MotorState <span>数据</span></div>',
      '    <div class="panel-row"><span>speed</span><b style="color:var(--red)">-100</b></div>',
      '    <div class="panel-row"><span>enabled</span><b>1</b></div>',
      '    <div class="default-note">字段全部公开</div>',
      '  </div>',
      '  <div class="panel-box">',
      '    <div class="panel-title">外部函数 <span>操作</span></div>',
      '    <span class="fn-chip disconnected">set_speed()</span>',
      '    <span class="fn-chip disconnected">enable()</span>',
      '    <div class="default-note">函数与数据没有绑定；编译器不检查配对。</div>',
      '  </div>',
      '</div>',
      '<div class="obj-note" style="margin-top:6px">调用者可以直接写 <code style="color:var(--red)">motor.speed = -100;</code>，规则只存在于注释和约定里。</div>'
    ].join('');
  }

  function renderCompareModel() {
    return [
      '<div class="split-panel">',
      '  <div class="panel-box">',
      '    <div class="panel-title">class Motor <span>默认 private</span></div>',
      '    <div class="panel-row"><span>speed_</span><b style="color:var(--yellow)">private</b></div>',
      '    <div class="panel-row"><span>setSpeed()</span><b style="color:var(--green)">public</b></div>',
      '    <div class="default-note"><b>private</b> 默认；需要显式 public</div>',
      '  </div>',
      '  <div class="panel-box">',
      '    <div class="panel-title">struct Point <span>默认 public</span></div>',
      '    <div class="panel-row"><span>x</span><b style="color:var(--green)">public</b></div>',
      '    <div class="panel-row"><span>y</span><b style="color:var(--green)">public</b></div>',
      '    <div class="default-note"><b>public</b> 默认；适合透明数据</div>',
      '  </div>',
      '</div>',
      '<div class="obj-note" style="margin-top:6px">两者都能有构造函数、成员函数和任意访问限定符。</div>'
    ].join('');
  }

  function renderRefModel() {
    return [
      '<div class="ref-diagram">',
      '  <div class="ref-row"><span class="ref-name">x</span><span class="ref-kind">int 对象</span><span class="ref-value">5</span></div>',
      '  <div class="alias-strip"><strong>r</strong> <span class="ref-arrow">→</span>',
      '    <span class="alias-box"><b>int&amp;</b>：x 的别名，和 x 使用同一块存储</span>',
      '  </div>',
      '  <div class="ref-row"><span class="ref-name">p</span><span class="ref-kind">int* 指针</span>',
      '    <span class="ref-arrow">→</span><span class="alias-box">保存 x 的地址</span></div>',
      '</div>',
      '<div class="obj-note" style="margin-top:6px"><code>r = 5;</code> 后 <code>x</code> 也是 5；引用不是新的整数对象。</div>'
    ].join('');
  }

  /* ---------------- 顶部四区：链表模型 ---------------- */

  function liveNodes() {
    const state = lab.list;
    return state.order.map(function (id) {
      return state.nodes[id];
    }).filter(function (node) {
      return node && node.alive;
    });
  }

  function chainText() {
    const nodes = liveNodes();
    if (!nodes.length) return 'nullptr';
    return nodes.map(function (n) { return n.value; }).join(' → ') + ' → nullptr';
  }

  function renderListModel() {
    const state = lab.list;
    const nodes = liveNodes();
    let html = '<div class="chain-head">head <b>' +
      (state.head ? '→ ' + ESC(state.head) : '= nullptr') +
      '</b><span class="head-arrow">' + nodes.length + ' 个节点</span></div>';

    if (!nodes.length) {
      html += '<div class="node-null">head == nullptr（空链表）</div>';
    } else {
      nodes.forEach(function (node, index) {
        let cls = 'node-card';
        if (node.id === state.head) cls += ' is-head';
        if (state.lastAction === 'traverse' && node.visited) cls += ' is-visited';
        if (state.lastAction === 'find' && node.visited) cls += ' is-visited';
        if (state.changedId === node.id || state.newId === node.id) cls += ' is-changed';

        html += '<div class="' + cls + '">' +
          '<span class="node-id">' + ESC(node.id) + '</span>' +
          '<span class="node-value">' + node.value + '</span>' +
          '<span class="node-next">next <b>' +
          (node.next ? '→ ' + ESC(node.next) : '→ nullptr') +
          '</b></span></div>';
        if (index < nodes.length - 1) html += '<div class="chain-down">↓</div>';
      });
    }

    if (state.removed.length) {
      state.removed.forEach(function (id) {
        const node = state.nodes[id];
        if (!node) return;
        html += '<div class="node-removed">' + ESC(node.id) + ' · ' + node.value +
          ' <span>已摘除，仍占内存</span></div>';
      });
    }

    html += '<div class="chain-legend">修改 next 就改变了数据之间的连接关系。</div>';
    return html;
  }

  /* ---------------- 顶部四区：滤波模型 ---------------- */

  function windowValues(filter) {
    const f = filter || lab.filter;
    return f.samples.map(function (v) {
      return v === null ? '—' : String(v);
    }).join(', ');
  }

  function renderWindowCells(filter) {
    const f = filter || lab.filter;
    let html = '<div class="window-grid">';
    for (let i = 0; i < 4; i++) {
      const value = f.samples[i];
      const classes = ['window-cell'];
      if (value !== null) classes.push('filled');
      if (i === f.index) classes.push('next');
      html += '<div class="' + classes.join(' ') + '">' +
        '<span class="cell-index">[' + i + ']</span>' +
        '<span class="cell-val' + (value === null ? ' empty' : '') + '">' +
        (value === null ? '—' : value) + '</span></div>';
    }
    html += '</div>';
    return html;
  }

  function filterAverage(filter) {
    const f = filter || lab.filter;
    return f.count > 0 ? Math.floor(f.sum / f.count) : null;
  }

  function renderFilterModel() {
    const f = lab.filter;
    const avg = f.lastAvg === null ? filterAverage(f) : f.lastAvg;
    let html = renderWindowCells(f);

    html += '<div class="filter-stats">' +
      '<div class="stat-chip">sum<b>' + f.sum + '</b></div>' +
      '<div class="stat-chip">count<b>' + f.count + ' / 4</b></div>' +
      '<div class="stat-chip">index<b>' + f.index + '</b></div>' +
      '</div>';

    html += '<div class="avg-box"><span class="avg-label">AVERAGE</span>' +
      '<span class="avg-value">' + (avg === null ? '—' : avg) + '</span>' +
      '<span class="avg-unit">' + (f.count ? 'sum / count' : '等待样本') + '</span></div>';

    html += '<div class="formula">' +
      (f.count ? f.sum + ' / ' + f.count + ' = ' + avg : '窗口为空') +
      '</div>';
    return html;
  }

  /* ---------------- 顶部四区：综合项目 ---------------- */

  function renderProjectModel() {
    const p = lab.project;
    const f = p.filter;
    const avg = p.lastAvg === null ? filterAverage(f) : p.lastAvg;
    return [
      '<div class="pipeline">',
      '  <div class="pipe-node">',
      '    <div class="pipe-title"><b>raw</b> 传感器/指令 <span class="pipe-value">' + (p.lastRaw === null ? '—' : p.lastRaw) + '</span></div>',
      '    <div class="pipe-meta">update(raw)</div>',
      '  </div>',
      '  <div class="pipe-arrow">↓</div>',
      '  <div class="pipe-node filter">',
      '    <div class="pipe-title"><b>SpeedFilter</b> 窗口 4 <span class="pipe-value">avg ' + (avg === null ? '—' : avg) + '</span></div>',
      '    <div class="pipe-meta">[' + windowValues(f) + '] · count=' + f.count + '</div>',
      '  </div>',
      '  <div class="pipe-arrow">↓</div>',
      '  <div class="pipe-node motor">',
      '    <div class="pipe-title"><b>Motor</b> 限幅 0～100 <span class="pipe-value">speed ' + p.motor.speed + '</span></div>',
      '    <div class="pipe-meta">' + (p.lastOk === null ? '等待第一次 update' : (p.lastOk ? 'setSpeed 成功' : 'setSpeed 拒绝：超出范围')) + '</div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  /* ---------------- 顶部四区：内存 ---------------- */

  function memRow(address, name, value, valueClass) {
    return '<tr><td class="mem-addr">' + ESC(address) + '</td>' +
      '<td class="mem-name">' + ESC(name) + '</td>' +
      '<td class="mem-val ' + (valueClass || '') + '">' + ESC(value) + '</td></tr>';
  }

  function renderClassMemory() {
    const state = lab.motor;
    const objects = state.order.map(function (name) {
      return state.objects[name];
    }).filter(Boolean).slice(0, 3);

    let rows = '';
    objects.forEach(function (obj) {
      rows += memRow(obj.address, obj.name + '.id_', obj.id);
      rows += memRow(hexAdd(obj.address, 4), obj.name + '.speed_', obj.speed);
      rows += memRow(hexAdd(obj.address, 8), obj.name + '.enabled_', obj.enabled ? 1 : 0, obj.enabled ? 'bool-true' : 'bool-false');
    });

    Object.keys(state.pointers).slice(0, 2).forEach(function (name) {
      const ptr = state.pointers[name];
      rows += memRow(ptr.address, name, ptr.target ? '→ ' + ptr.target : 'nullptr', 'ptr');
    });

    return '<table class="mem-table"><thead><tr><th>地址</th><th>成员</th><th>值</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<div class="mem-note">示意地址。对象在栈上；成员顺序按声明排列，真实布局可能包含对齐填充。</div>';
  }

  function renderCStructMemory() {
    return '<table class="mem-table"><thead><tr><th>地址</th><th>成员</th><th>值</th></tr></thead><tbody>' +
      memRow('0x61fe10', 'motor.speed', '-100') +
      memRow('0x61fe14', 'motor.enabled', '1') +
      '</tbody></table>' +
      '<div class="mem-note">C 结构体没有访问控制；任何拿到对象的人都能改字段。</div>';
  }

  function renderCompareMemory() {
    return '<table class="mem-table"><thead><tr><th>地址</th><th>成员</th><th>值</th></tr></thead><tbody>' +
      memRow('0x61fe10', 'Motor.speed_', 'private') +
      memRow('0x61fe20', 'Point.x', 'public') +
      memRow('0x61fe24', 'Point.y', 'public') +
      '</tbody></table>' +
      '<div class="mem-note">默认访问权限不同，但两者都能显式写 public/private。</div>';
  }

  function renderRefMemory() {
    return '<table class="mem-table"><thead><tr><th>地址</th><th>名字</th><th>值</th></tr></thead><tbody>' +
      memRow('0x61fe40', 'x', '5') +
      memRow('0x61fe40', 'r (alias)', '同一地址', 'ptr') +
      memRow('0x61fe38', 'p', '→ 0x61fe40', 'ptr') +
      '</tbody></table>' +
      '<div class="mem-note">引用通常不占独立存储；它和绑定对象是同一块存储的别名。</div>';
  }

  function renderListMemory() {
    const state = lab.list;
    let rows = '<tr><td class="mem-addr">0x61fe80</td><td class="mem-name">head</td>' +
      '<td class="mem-val ptr">' + (state.head ? '→ ' + ESC(state.head) : 'nullptr') + '</td></tr>';

    state.order.forEach(function (id) {
      const node = state.nodes[id];
      if (!node) return;
      rows += memRow(node.address, node.id + '.value', node.value);
      rows += memRow(hexAdd(node.address, 8), node.id + '.next',
        node.alive ? (node.next ? '→ ' + node.next : 'nullptr') : '已摘除', 'ptr');
    });

    return '<table class="mem-table"><thead><tr><th>地址</th><th>成员</th><th>值</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<div class="mem-note">节点地址不要求连续；<b>next</b> 保存下一个节点的地址。</div>';
  }

  function renderFilterMemory() {
    const f = lab.filter;
    let rows = '';
    for (let i = 0; i < 4; i++) {
      rows += memRow(hexAdd('0x61fe20', i * 2), 'samples[' + i + ']',
        f.samples[i] === null ? '未写入' : f.samples[i],
        f.samples[i] === null ? 'bool-false' : '');
    }
    rows += memRow('0x61fe2c', 'sum', f.sum);
    rows += memRow('0x61fe30', 'index', f.index);
    rows += memRow('0x61fe31', 'count', f.count);

    return '<table class="mem-table"><thead><tr><th>地址</th><th>成员</th><th>值</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<div class="mem-note">uint16_t 样本数组 + uint32_t sum；index 指向下一次覆盖的位置。</div>';
  }

  function renderProjectMemory() {
    const p = lab.project;
    const f = p.filter;
    return '<table class="mem-table"><thead><tr><th>地址</th><th>成员</th><th>值</th></tr></thead><tbody>' +
      memRow('0x61fe20', 'filter.sum', f.sum) +
      memRow('0x61fe24', 'filter.count', f.count) +
      memRow('0x61fe25', 'filter.index', f.index) +
      memRow('0x61fe40', 'motor.id_', p.motor.id) +
      memRow('0x61fe44', 'motor.speed_', p.motor.speed) +
      memRow('0x61fe48', 'motor.enabled_', p.motor.enabled ? 1 : 0, p.motor.enabled ? 'bool-true' : 'bool-false') +
      '</tbody></table>' +
      '<div class="mem-note">组合对象：filter 与 motor 各自维护状态，Controller 负责把它们串起来。</div>';
  }

  /* ---------------- 顶部四区：输出 ---------------- */

  function defaultOutput() {
    const viz = currentViz();
    if (viz === 'cstruct') {
      return [
        { type: 'output', text: 'speed = -100' },
        { type: 'dim', text: '（C 编译器不会阻止这行赋值）' },
        { type: 'warn', text: '约定被绕过，电机状态可能非法。' }
      ];
    }
    if (viz === 'ref') {
      return [
        { type: 'output', text: 'int x = 1;' },
        { type: 'output', text: 'int& r = x;  // r 是 x 的别名' },
        { type: 'dim', text: 'r = 5; 之后 x 也变成 5。' }
      ];
    }
    if (viz === 'compare') {
      return [
        { type: 'output', text: 'class  Motor → 默认 private' },
        { type: 'output', text: 'struct Point → 默认 public' },
        { type: 'dim', text: '两者都能有成员函数与构造函数。' }
      ];
    }
    if (viz === 'list') {
      return [
        { type: 'dim', text: '输入 traverse 查看遍历输出。' },
        { type: 'dim', text: '输入 status 查看链表结构。' }
      ];
    }
    if (viz === 'filter') {
      return [
        { type: 'dim', text: '窗口为空。输入 push 100 开始。' },
        { type: 'dim', text: '输入 demo 可一次演示一组读数。' }
      ];
    }
    if (viz === 'project') {
      return [
        { type: 'dim', text: '输入 update 80 开始一次完整流水线。' },
        { type: 'dim', text: '输入 status 查看滤波器和电机状态。' }
      ];
    }
    return [
      { type: 'dim', text: '输入 motor.status() 查看当前对象。' },
      { type: 'dim', text: '跟随任务栏完成本节练习。' }
    ];
  }

  function renderOutputZone() {
    const viz = currentViz();
    let lines;
    let isStatic = false;

    if (currentCard.staticOutput && (viz === 'cstruct' || viz === 'ref' || viz === 'compare')) {
      lines = currentCard.staticOutput.map(function (text) {
        return { type: 'output', text: text };
      });
      isStatic = true;
    } else {
      const log = activeLog();
      lines = log.length ? log.slice(-7) : defaultOutput();
    }

    let html = '';
    lines.forEach(function (line) {
      const type = line.type || 'output';
      html += '<div class="out-line ' + type + '">' + ESC(line.text || '') + '</div>';
    });
    html += '<div class="out-line prompt"><span class="out-prompt">$</span> <span class="out-cursor"></span></div>';
    els.outputBody.innerHTML = html;

    const log = activeLog();
    els.outputSubtitle.textContent = isStatic ? '示例输出' : (log.length ? '实时 · ' + log.length + ' 条' : '等待运行');
    els.outputBadge.textContent = isStatic ? 'DEMO' : (log.length ? 'LIVE' : 'IDLE');
    els.outputBadge.classList.toggle('is-idle', !isStatic && !log.length);
  }

  /* ---------------- 顶部四区：总渲染 ---------------- */

  function renderZones() {
    if (!currentCard) return;
    const viz = currentViz();

    renderSource();

    if (viz === 'cstruct') {
      els.modelBody.innerHTML = renderCStructModel();
      els.modelSubtitle.textContent = '结构体 + 外部函数';
      els.modelBadge.textContent = 'C';
      els.memoryBody.innerHTML = renderCStructMemory();
      els.memorySubtitle.textContent = '栈上结构体';
      els.memoryBadge.textContent = 'C';
    } else if (viz === 'compare') {
      els.modelBody.innerHTML = renderCompareModel();
      els.modelSubtitle.textContent = '默认访问权限对照';
      els.modelBadge.textContent = 'A/B';
      els.memoryBody.innerHTML = renderCompareMemory();
      els.memorySubtitle.textContent = '两种对象';
      els.memoryBadge.textContent = '对照';
    } else if (viz === 'ref') {
      els.modelBody.innerHTML = renderRefModel();
      els.modelSubtitle.textContent = '引用 vs 指针';
      els.modelBadge.textContent = '别名';
      els.memoryBody.innerHTML = renderRefMemory();
      els.memorySubtitle.textContent = '同一地址';
      els.memoryBadge.textContent = '别名';
    } else if (viz === 'list') {
      els.modelBody.innerHTML = renderListModel();
      els.modelSubtitle.textContent = liveNodes().length + ' 个节点';
      els.modelBadge.textContent = 'head';
      els.memoryBody.innerHTML = renderListMemory();
      els.memorySubtitle.textContent = '分散节点';
      els.memoryBadge.textContent = '链';
    } else if (viz === 'filter') {
      els.modelBody.innerHTML = renderFilterModel();
      els.modelSubtitle.textContent = lab.filter.count + ' / 4 个样本';
      els.modelBadge.textContent = 'W=4';
      els.memoryBody.innerHTML = renderFilterMemory();
      els.memorySubtitle.textContent = '数组 + 状态';
      els.memoryBadge.textContent = '数组';
    } else if (viz === 'project') {
      els.modelBody.innerHTML = renderProjectModel();
      els.modelSubtitle.textContent = '采样 → 滤波 → 限幅';
      els.modelBadge.textContent = '组合';
      els.memoryBody.innerHTML = renderProjectMemory();
      els.memorySubtitle.textContent = '组合对象';
      els.memoryBadge.textContent = '混合';
    } else {
      els.modelBody.innerHTML = renderClassModel();
      els.modelSubtitle.textContent = lab.motor.order.length + ' 个对象 · ' + Object.keys(lab.motor.pointers).length + ' 个指针';
      els.modelBadge.textContent = 'class';
      els.memoryBody.innerHTML = renderClassMemory();
      els.memorySubtitle.textContent = '64 位示意';
      els.memoryBadge.textContent = '栈';
    }

    renderOutputZone();

    requestAnimationFrame(drawArrows);
  }

  /* ---------------- SVG 箭头 ---------------- */

  function drawArrows() {
    if (!els.arrows || !els.zones) return;
    const zoneEls = Array.prototype.slice.call(els.zones.querySelectorAll('.zone'));
    if (zoneEls.length !== 4) return;

    const containerRect = els.zones.getBoundingClientRect();
    if (containerRect.width < 700 || window.getComputedStyle(els.arrows).display === 'none') {
      els.arrows.innerHTML = '';
      return;
    }

    const rects = zoneEls.map(function (zone) {
      return zone.getBoundingClientRect();
    });

    const parts = [];
    parts.push('<defs><marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">' +
      '<path d="M0,0 L6,3 L0,6 Z" fill="#58a6ff" opacity="0.65"></path></marker></defs>');

    for (let i = 0; i < 3; i++) {
      const startX = rects[i].right - containerRect.left + 4;
      const endX = rects[i + 1].left - containerRect.left - 6;
      if (endX <= startX + 4) continue;
      const y = rects[i].top - containerRect.top + rects[i].height * 0.5;
      parts.push('<path class="arrow-path flow" d="M ' + startX + ' ' + y +
        ' L ' + endX + ' ' + y + '" marker-end="url(#arrowhead)"></path>');
    }

    els.arrows.innerHTML = parts.join('');
  }

  /* ---------------- 侧边栏 ---------------- */

  function chapterCompletedCount(chapter) {
    return chapter.cards.filter(function (card) {
      return completed.has(card.id);
    }).length;
  }

  function renderSidebar() {
    let html = '';
    COURSE.chapters.forEach(function (chapter, chapterIndex) {
      const isOpen = chapterOpen[chapter.id] !== false;
      const isCurrentChapter = currentCard && currentCard.chapterIndex === chapterIndex;
      const done = chapterCompletedCount(chapter);
      html += '<div class="chapter-group">' +
        '<button class="chapter-title' + (isOpen ? ' expanded' : '') +
        (isCurrentChapter ? ' active' : '') + '" type="button" data-chapter="' +
        chapterIndex + '" aria-expanded="' + isOpen + '">' +
        '<span class="chapter-number">' + pad2(chapterIndex + 1) + '</span>' +
        '<span class="chapter-name">' + ESC(chapter.title) + '</span>' +
        '<span class="chapter-count">' + done + '/' + chapter.cards.length + '</span>' +
        '<span class="chapter-chevron" aria-hidden="true">▶</span>' +
        '</button>' +
        '<div class="chapter-cards"' + (isOpen ? '' : ' hidden') + '>';

      chapter.cards.forEach(function (card) {
        const isDone = completed.has(card.id);
        const isActive = currentCard && currentCard.id === card.id;
        html += '<button class="card-item' + (isDone ? ' completed' : '') +
          (isActive ? ' active' : '') + '" type="button" data-card-id="' + ESC(card.id) + '">' +
          '<span class="card-check" aria-hidden="true">' + (isDone ? '✓' : '') + '</span>' +
          '<span class="card-item-label">' + ESC(card.title) + '</span>' +
          '</button>';
      });

      html += '</div></div>';
    });
    els.sidebar.innerHTML = html;

    const active = els.sidebar.querySelector('.card-item.active');
    if (active && !window.matchMedia('(max-width: 720px)').matches) {
      const sidebarRect = els.sidebar.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      if (activeRect.top < sidebarRect.top) {
        els.sidebar.scrollTop += activeRect.top - sidebarRect.top - 6;
      } else if (activeRect.bottom > sidebarRect.bottom) {
        els.sidebar.scrollTop += activeRect.bottom - sidebarRect.bottom + 6;
      }
    }
  }

  /* ---------------- 主内容与任务 ---------------- */

  function estimateReadingTime(card) {
    const plain = String(card.content || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ');
    const cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
    const words = plain.split(' ').filter(Boolean).length;
    return Math.max(3, Math.round(cjk / 280 + words / 180));
  }

  function renderQuiz(card) {
    if (!card.quiz) return '';
    const isDone = completed.has(card.id);

    if (Array.isArray(card.quiz.questions)) {
      let html = '';
      card.quiz.questions.forEach(function (q, qi) {
        html += '<div class="quiz" data-qindex="' + qi + '"' + (isDone ? ' data-correct="1"' : '') + '>' +
          '<div class="quiz-label">CHECK ' + (qi + 1) + ' / ' + card.quiz.questions.length + '</div>' +
          '<div class="quiz-question">' + q.q + '</div>' +
          '<div class="quiz-options">' + renderQuizOptions(q, qi, isDone) + '</div>' +
          '<div class="quiz-feedback"' + (isDone ? '' : ' hidden') + '>' +
          (isDone ? '<strong>已完成。</strong> ' + q.explain : '') +
          '</div></div>';
      });
      html += '<div class="quiz-progress">' +
        (isDone ? '全部答对 · 已完成' : '0 / ' + card.quiz.questions.length + ' 已答对') +
        '</div>';
      return html;
    }

    const q = card.quiz;
    return '<div class="quiz" data-qindex="0"' + (isDone ? ' data-correct="1"' : '') + '>' +
      '<div class="quiz-label">CHECK</div>' +
      '<div class="quiz-question">' + q.q + '</div>' +
      '<div class="quiz-options">' + renderQuizOptions(q, 0, isDone) + '</div>' +
      '<div class="quiz-feedback"' + (isDone ? '' : ' hidden') + '>' +
      (isDone ? '<strong>已完成。</strong> ' + q.explain : '') +
      '</div></div>';
  }

  function renderQuizOptions(q, qIndex, isDone) {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    return q.options.map(function (option, index) {
      const correct = isDone && index === q.answer;
      return '<button class="quiz-option' + (correct ? ' correct' : '') +
        '" type="button" data-option="' + index + '" data-qindex="' + qIndex + '"' +
        (isDone ? ' disabled' : '') + '>' +
        '<span class="quiz-key">' + letters[index] + '</span>' +
        '<span>' + option + '</span></button>';
    }).join('');
  }

  function renderCard() {
    const card = currentCard;
    const minutes = estimateReadingTime(card);
    const tags = (card.tags || []).map(function (tag) {
      return '<span class="meta-chip">' + ESC(tag) + '</span>';
    }).join('');

    els.content.innerHTML = [
      '<div class="card-kicker"><span class="kicker-line"></span>第 ' +
        card.chapterNumber + ' 章 · ' + ESC(card.chapterTitle) + '</div>',
      '<h1 class="card-title">' + ESC(card.title) + '</h1>',
      '<p class="card-lead">' + ESC(card.lead) + '</p>',
      '<div class="card-meta">',
      '<span class="meta-chip accent">' + pad2(card.chapterNumber) + '.' + pad2(card.cardInChapter) + '</span>',
      '<span class="meta-chip">约 ' + minutes + ' 分钟</span>',
      tags,
      '</div>',
      card.content,
      renderQuiz(card)
    ].join('\n');

    els.content.scrollTop = 0;
    hydrateCompletedQuiz();
  }

  function hydrateCompletedQuiz() {
    if (!currentCard || !currentCard.quiz || !completed.has(currentCard.id)) return;
    Array.prototype.forEach.call(els.content.querySelectorAll('.quiz'), function (quiz) {
      quiz.setAttribute('data-correct', '1');
    });
  }

  function currentStepCount(card) {
    if (!card.task || !card.task.steps) return 0;
    if (completed.has(card.id)) return card.task.steps.length;
    return Math.min(stepProgress[card.id] || 0, card.task.steps.length);
  }

  function renderTask() {
    if (!currentCard) return;
    const card = currentCard;
    const isDone = completed.has(card.id);
    const isQuiz = !!card.quiz;
    const hasTask = !!card.task;

    els.task.classList.toggle('completed', isDone);
    els.taskLabel.textContent = isDone ? 'DONE' : (isQuiz ? 'QUIZ' : (hasTask ? 'TASK' : 'READ'));
    els.taskSteps.innerHTML = '';
    els.taskRead.hidden = true;

    if (isQuiz) {
      const qCount = card.quiz.questions ? card.quiz.questions.length : 1;
      els.taskPrompt.innerHTML = isDone
        ? '本节测验已完成。可以继续下一节，或回看错题解析。'
        : '完成下方 ' + qCount + ' 道题；答对后自动记录完成。';
      if (isDone) {
        els.taskPrompt.innerHTML += ' <span class="task-done-mark">✓ 已完成</span>';
      }
      return;
    }

    if (!hasTask) {
      els.taskPrompt.textContent = isDone ? '本节已读。' : '读完这一节后，标记为已读。';
      if (isDone) {
        els.taskPrompt.innerHTML = '本节已读。 <span class="task-done-mark">✓ 已完成</span>';
      } else {
        els.taskRead.hidden = false;
      }
      return;
    }

    els.taskPrompt.innerHTML = card.task.prompt;

    const steps = card.task.steps || [];
    if (steps.length) {
      const count = currentStepCount(card);
      els.taskSteps.innerHTML = steps.map(function (step, index) {
        return '<span class="step-chip' + (index < count ? ' done' : '') + '">' +
          '<span class="step-num">' + (index < count ? '✓' : index + 1) + '</span>' +
          ESC(step.label) + '</span>';
      }).join('');
    }

    if (isDone) {
      els.taskPrompt.innerHTML += ' <span class="task-done-mark">✓ 已完成</span>';
    }
  }

  function updateProgress() {
    const total = cards.length;
    const done = completed.size;
    const percent = total ? (done / total) * 100 : 0;

    els.globalText.textContent = done + ' / ' + total;
    els.globalBar.style.width = percent.toFixed(1) + '%';
    els.sidebarProgress.textContent = done + ' / ' + total;
    els.cardProgress.textContent = (currentIndex + 1) + ' / ' + total;
    els.topbarChapter.textContent = '第 ' + (currentCard ? currentCard.chapterNumber : 1) + ' 章';
    els.topbarCard.textContent = currentCard ? currentCard.title : '';
    els.btnPrev.disabled = currentIndex <= 0;
    els.btnNext.disabled = currentIndex >= total - 1;
  }

  function populateMobileSelect() {
    if (!els.mobileSelect) return;
    let html = '';
    COURSE.chapters.forEach(function (chapter, chapterIndex) {
      html += '<optgroup label="第 ' + (chapterIndex + 1) + ' 章 · ' + ESC(chapter.title) + '">';
      chapter.cards.forEach(function (card, cardIndex) {
        html += '<option value="' + ESC(card.id) + '">' +
          pad2(chapterIndex + 1) + '.' + pad2(cardIndex + 1) + ' ' + ESC(card.title) +
          '</option>';
      });
      html += '</optgroup>';
    });
    els.mobileSelect.innerHTML = html;
  }

  function markComplete(cardId, options) {
    const opts = options || {};
    if (!cardId || completed.has(cardId)) return;
    const card = cards.find(function (c) { return c.id === cardId; });
    if (!card) return;

    completed.add(cardId);
    if (card.task && card.task.steps) {
      stepProgress[cardId] = card.task.steps.length;
    }
    saveProgress();
    renderSidebar();
    updateProgress();
    renderTask();
    if (!opts.silent) showToast('✓ 已完成：' + card.title);

    if (completed.size === cards.length) {
      appendTerminal('', 'output');
      appendTerminal('✓ 全部课程完成。现在可以回到任意章节复习，或继续学习 RAII、STL 与智能指针。', 'ok');
    }
  }

  function checkTask(command) {
    if (!currentCard || !currentCard.task || completed.has(currentCard.id)) return;

    if (lastResult && lastResult.error && labMode !== 'motor') {
      return;
    }

    const steps = currentCard.task.steps;
    if (steps && steps.length) {
      const count = stepProgress[currentCard.id] || 0;
      if (count >= steps.length) return;
      const step = steps[count];
      if (step && typeof step.test === 'function' && step.test(command, lastResult)) {
        stepProgress[currentCard.id] = count + 1;
        renderTask();
        if (count + 1 >= steps.length) {
          markComplete(currentCard.id);
        } else {
          showToast('步骤 ' + (count + 1) + ' / ' + steps.length + ' 完成');
        }
      }
      return;
    }

    if (typeof currentCard.task.test === 'function' &&
        currentCard.task.test(command, lastResult)) {
      markComplete(currentCard.id);
    }
  }

  function renderSuggestions() {
    if (!currentCard) return;
    const commands = [];
    const task = currentCard.task;

    if (task && task.prompt) {
      const matches = task.prompt.match(/<code>([\s\S]*?)<\/code>/g) || [];
      matches.forEach(function (raw) {
        const text = decodeEntities(raw.replace(/<\/?code>/g, '')).trim();
        if (looksLikeCommand(text)) commands.push(text);
      });
    }

    if (!task) {
      commands.push('help');
    } else {
      modeSuggestions().forEach(function (cmd) {
        if (commands.indexOf(cmd) < 0) commands.push(cmd);
      });
    }

    const unique = commands.filter(function (cmd, index) {
      return commands.indexOf(cmd) === index;
    }).slice(0, 4);

    els.suggestions.innerHTML = unique.map(function (cmd) {
      return '<button class="suggest-chip" type="button" data-cmd="' +
        ESC(cmd) + '" title="点击填入命令">' + ESC(cmd) + '</button>';
    }).join('');
  }

  function looksLikeCommand(text) {
    if (!text || text.length > 48) return false;
    if (/^(Motor|const\s+Motor)/.test(text)) return true;
    if (/^(motor|left|right|cm|p|cp)\s*(\.|->)/.test(text)) return true;
    if (/^(traverse|head|status|find|insertAfter|removeAfter|push|pushMany|demo|update|help|reset)$/.test(text)) return true;
    return false;
  }

  function modeSuggestions() {
    if (labMode === 'list') return ['traverse', 'insertAfter 10 15', 'status'];
    if (labMode === 'filter') return ['push 100', 'demo', 'status'];
    if (labMode === 'project') return ['update 80', 'status', 'help'];
    return ['motor.setSpeed(80)', 'motor.speed()', 'help'];
  }

  function decodeEntities(text) {
    const area = document.createElement('textarea');
    area.innerHTML = text;
    return area.value;
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('show');
    }, 2400);
  }

  /* ---------------- 卡片导航 ---------------- */

  function showCard(index) {
    if (index < 0 || index >= cards.length) return;

    currentIndex = index;
    currentCard = cards[index];

    if (currentCard.lab) setLabMode(currentCard.lab);
    chapterOpen[COURSE.chapters[currentCard.chapterIndex].id] = true;

    renderCard();
    renderTask();
    renderSidebar();
    updateProgress();
    renderZones();
    renderSuggestions();

    if (els.mobileSelect) els.mobileSelect.value = currentCard.id;
    saveProgress();

    try {
      history.replaceState(null, '', '#' + currentCard.id);
    } catch (err) {
      /* file:// 下个别环境可能拒绝，忽略 */
    }
  }

  /* ---------------- 实验台：Motor ---------------- */

  function nextMotorAddress() {
    const state = lab.motor;
    const address = hexAdd('0x61fe10', state.addressStep * 0x10);
    state.addressStep++;
    return address;
  }

  function createOrResetMotor(name, id, isConst) {
    const state = lab.motor;
    const existing = state.objects[name];
    const address = existing ? existing.address : nextMotorAddress();

    state.objects[name] = makeMotor(name, id, address, isConst);
    if (!existing) state.order.push(name);

    state.lastObject = name;
    state.lastAction = 'construct';
    emit('Motor ' + name + '(' + id + ') 构造完成', 'ok');
    appendTerminal('  id_=' + id + '  speed_=0  enabled_=false', 'dim');
    logToState('motor', 'dim', 'id_=' + id + ' speed_=0 enabled_=false');
    return state.objects[name];
  }

  function resolveMotorTarget(name, op) {
    const state = lab.motor;
    if (op === '.') {
      if (state.pointers[name]) {
        emitError("error: '" + name + "' 是指针，访问成员请使用 '->'");
        return null;
      }
      const obj = state.objects[name];
      if (!obj) {
        emitError("error: 未声明的标识符 '" + name + "'");
        return null;
      }
      return { obj: obj, pointer: null };
    }

    const ptr = state.pointers[name];
    if (!ptr) {
      if (state.objects[name]) {
        emitError("error: '" + name + "' 是对象，访问成员请使用 '.'");
      } else {
        emitError("error: 未声明的指针 '" + name + "'");
      }
      return null;
    }
    if (!ptr.target) {
      emitError('runtime error: 解引用空指针 ' + name, '未定义行为：程序可能直接崩溃。');
      return null;
    }
    const obj = state.objects[ptr.target];
    if (!obj) {
      emitError('runtime error: 指针 ' + name + ' 指向不存在的对象');
      return null;
    }
    return { obj: obj, pointer: ptr };
  }

  function handleMotorCall(name, op, method, argsRaw) {
    const resolved = resolveMotorTarget(name, op);
    if (!resolved) {
      lastResult = { error: true };
      return;
    }

    const obj = resolved.obj;
    const ptr = resolved.pointer;
    const readonly = obj.isConst || !!(ptr && ptr.isConst);
    const args = argsRaw.trim() ? argsRaw.split(',').map(function (s) { return s.trim(); }) : [];

    lab.motor.lastObject = obj.name;

    if (method === 'setSpeed') {
      if (readonly) {
        emitError("error: 'this' argument to member function 'setSpeed' has type 'const Motor'",
          'note: setSpeed() 没有 const 限定，不能通过 const 对象/指针调用。');
        lastResult = { error: true };
        return;
      }
      if (args.length !== 1) {
        emitError('error: setSpeed 需要 1 个整数参数');
        lastResult = { error: true };
        return;
      }
      if (!/^-?\d+$/.test(args[0])) {
        emitError('error: setSpeed 的参数必须是整数');
        lastResult = { error: true };
        return;
      }
      const value = parseInt(args[0], 10);
      if (value < 0 || value > 100) {
        emit('false', 'output');
        emit('[状态] 输入被拒绝，' + obj.name + '.speed_ 仍为 ' + obj.speed, 'warn');
        lab.motor.lastAction = 'reject';
        lastResult = { error: false, rejected: true };
        return;
      }
      obj.speed = value;
      lab.motor.lastAction = 'setSpeed';
      emit('true', 'output');
      emit('[状态] ' + obj.name + '.speed_ = ' + value, 'info');
      lastResult = { error: false };
      return;
    }

    if (method === 'enable' || method === 'disable') {
      if (readonly) {
        emitError("error: '" + method + "' 不能在 const 对象上调用");
        lastResult = { error: true };
        return;
      }
      if (args.length !== 0) {
        emitError('error: ' + method + ' 不接受参数');
        lastResult = { error: true };
        return;
      }
      obj.enabled = method === 'enable';
      lab.motor.lastAction = method;
      emit('void', 'dim');
      emit('[状态] ' + obj.name + '.enabled_ = ' + (obj.enabled ? 'true' : 'false'), 'info');
      lastResult = { error: false };
      return;
    }

    if (method === 'id' || method === 'speed' || method === 'isEnabled') {
      if (args.length !== 0) {
        emitError('error: ' + method + ' 不接受参数');
        lastResult = { error: true };
        return;
      }
      let value;
      if (method === 'id') value = obj.id;
      if (method === 'speed') value = obj.speed;
      if (method === 'isEnabled') value = obj.enabled ? 1 : 0;
      lab.motor.lastAction = 'read';
      emit(String(value), 'output');
      if (method === 'isEnabled') {
        emit('// ' + (obj.enabled ? 'true' : 'false'), 'dim');
      }
      lastResult = { error: false };
      return;
    }

    if (method === 'status') {
      if (args.length !== 0) {
        emitError('error: status 不接受参数');
        lastResult = { error: true };
        return;
      }
      lab.motor.lastAction = 'status';
      emit('电机' + obj.id + '：使能=' + (obj.enabled ? 1 : 0) + '，速度=' + obj.speed, 'output');
      lastResult = { error: false };
      return;
    }

    emitError("error: 'Motor' 没有名为 '" + method + "' 的成员");
    lastResult = { error: true };
  }

  function handleMotorCommand(cmd) {
    const state = lab.motor;

    let match = cmd.match(/^const\s+Motor\s*\*\s*([A-Za-z_]\w*)\s*=\s*&\s*([A-Za-z_]\w*)$/);
    if (match) {
      if (!state.objects[match[2]]) {
        emitError("error: 未声明的对象 '" + match[2] + "'");
        lastResult = { error: true };
        return true;
      }
      state.pointers[match[1]] = {
        name: match[1],
        target: match[2],
        isConst: true,
        address: hexAdd('0x61fdf0', Object.keys(state.pointers).length * 8)
      };
      emit('const Motor* ' + match[1] + ' = &' + match[2], 'ok');
      emit('[状态] 通过 ' + match[1] + ' 只能调用 const 成员函数', 'info');
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^Motor\s*\*\s*([A-Za-z_]\w*)\s*=\s*&\s*([A-Za-z_]\w*)$/);
    if (match) {
      if (!state.objects[match[2]]) {
        emitError("error: 未声明的对象 '" + match[2] + "'");
        lastResult = { error: true };
        return true;
      }
      state.pointers[match[1]] = {
        name: match[1],
        target: match[2],
        isConst: false,
        address: hexAdd('0x61fdf0', Object.keys(state.pointers).length * 8)
      };
      emit('Motor* ' + match[1] + ' = &' + match[2], 'ok');
      emit('[状态] ' + match[1] + ' 保存 ' + match[2] + ' 的地址', 'info');
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^Motor\s*\*\s*([A-Za-z_]\w*)\s*=\s*nullptr$/);
    if (match) {
      state.pointers[match[1]] = {
        name: match[1],
        target: null,
        isConst: false,
        address: hexAdd('0x61fdf0', Object.keys(state.pointers).length * 8)
      };
      emit('Motor* ' + match[1] + ' = nullptr', 'ok');
      emit('[状态] 空指针；解引用前必须检查', 'warn');
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^([A-Za-z_]\w*)\s*=\s*&\s*([A-Za-z_]\w*)$/);
    if (match && state.pointers[match[1]]) {
      if (!state.objects[match[2]]) {
        emitError("error: 未声明的对象 '" + match[2] + "'");
        lastResult = { error: true };
        return true;
      }
      state.pointers[match[1]].target = match[2];
      emit(match[1] + ' = &' + match[2], 'ok');
      emit('[状态] 指针现在指向 ' + match[2], 'info');
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^([A-Za-z_]\w*)\s*=\s*nullptr$/);
    if (match && state.pointers[match[1]]) {
      state.pointers[match[1]].target = null;
      emit(match[1] + ' = nullptr', 'ok');
      emit('[状态] 指针已置空', 'warn');
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^(const\s+)?Motor\s+([A-Za-z_]\w*)\s*(?:\(\s*(-?\d+)\s*\))?$/);
    if (match) {
      const isConst = !!match[1];
      const name = match[2];
      const id = match[3] === undefined ? 0 : parseInt(match[3], 10);
      createOrResetMotor(name, id, isConst);
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^([A-Za-z_]\w*)\s*(\.|->)\s*(id_|speed_|enabled_)\s*=\s*(.+)$/);
    if (match) {
      emitError("error: '" + match[3] + "' is a private member of 'Motor'",
        'note: 只能在 Motor 的成员函数内部访问。');
      lastResult = { error: true };
      return true;
    }

    match = cmd.match(/^([A-Za-z_]\w*)\s*(\.|->)\s*(id_|speed_|enabled_)$/);
    if (match) {
      emitError("error: '" + match[3] + "' is a private member of 'Motor'",
        'note: 只能在 Motor 的成员函数内部访问。');
      lastResult = { error: true };
      return true;
    }

    match = cmd.match(/^([A-Za-z_]\w*)\s*(\.|->)\s*([A-Za-z_]\w*)\s*\((.*)\)$/);
    if (match) {
      handleMotorCall(match[1], match[2], match[3], match[4]);
      return true;
    }

    match = cmd.match(/^([A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\s*=/);
    if (match) {
      emitError("error: 'Motor' 没有可访问的成员 '" + match[2] + "'");
      lastResult = { error: true };
      return true;
    }

    return false;
  }

  /* ---------------- 实验台：链表 ---------------- */

  function handleListCommand(cmd) {
    const state = lab.list;

    if (cmd === 'traverse') {
      let current = state.head;
      const values = [];
      let guard = 0;
      Object.keys(state.nodes).forEach(function (id) { state.nodes[id].visited = false; });

      while (current && state.nodes[current] && guard < 100) {
        const node = state.nodes[current];
        node.visited = true;
        values.push(String(node.value));
        current = node.next;
        guard++;
      }

      state.lastAction = 'traverse';
      state.changedId = null;
      state.newId = null;
      if (!values.length) {
        emit('（链表为空，循环一次也没有进入）', 'dim');
      } else {
        emit(values.join('\n'), 'output');
        emit('[遍历完成] ' + values.length + ' 个节点；current 最终为 nullptr', 'info');
      }
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'head') {
      if (!state.head) {
        emit('head == nullptr', 'dim');
      } else {
        const node = state.nodes[state.head];
        emit('head → ' + (node ? node.value : 'nullptr'), 'output');
      }
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'status') {
      const nodes = liveNodes();
      emit('head → ' + chainText(), 'output');
      emit('[状态] ' + nodes.length + ' 个节点；已摘除 ' + state.removed.length + ' 个（未释放）', 'info');
      lastResult = { error: false };
      return true;
    }

    let match = cmd.match(/^find\s+(-?\d+)$/i);
    if (match) {
      const target = parseInt(match[1], 10);
      let current = state.head;
      let position = 1;
      let guard = 0;
      Object.keys(state.nodes).forEach(function (id) { state.nodes[id].visited = false; });

      while (current && state.nodes[current] && guard < 100) {
        const node = state.nodes[current];
        node.visited = true;
        if (node.value === target) {
          state.lastAction = 'find';
          emit('找到 ' + target + '：第 ' + position + ' 个节点（' + node.id + '）', 'ok');
          lastResult = { error: false };
          return true;
        }
        current = node.next;
        position++;
        guard++;
      }
      state.lastAction = 'find';
      emit('未找到值为 ' + target + ' 的节点', 'warn');
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^insertAfter\s+(-?\d+)\s+(-?\d+)$/i);
    if (match) {
      const targetValue = parseInt(match[1], 10);
      const newValue = parseInt(match[2], 10);
      const targetId = state.order.find(function (id) {
        return state.nodes[id] && state.nodes[id].alive && state.nodes[id].value === targetValue;
      });

      if (!targetId) {
        emit('未找到值为 ' + targetValue + ' 的节点，链表没有改变。', 'err');
        lastResult = { error: true };
        return true;
      }

      const id = 'n' + state.counter;
      state.counter++;
      const address = hexAdd('0x1a2b30', state.addressStep * 0x20);
      state.addressStep++;
      const node = createListNode(id, newValue, address, state.nodes[targetId].next);
      state.nodes[id] = node;

      const orderIndex = state.order.indexOf(targetId);
      state.order.splice(orderIndex + 1, 0, id);
      state.nodes[targetId].next = id;

      state.lastAction = 'insert';
      state.changedId = targetId;
      state.newId = id;
      state.removedId = null;

      emit('已插入节点 ' + id + '：' + newValue + '（地址 ' + address + '）', 'ok');
      emit('链表现在：' + chainText(), 'info');
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^removeAfter\s+(-?\d+)$/i);
    if (match) {
      const targetValue = parseInt(match[1], 10);
      const targetId = state.order.find(function (id) {
        return state.nodes[id] && state.nodes[id].alive && state.nodes[id].value === targetValue;
      });

      if (!targetId) {
        emit('未找到值为 ' + targetValue + ' 的节点，链表没有改变。', 'err');
        lastResult = { error: true };
        return true;
      }
      if (!state.nodes[targetId].next) {
        emit('节点 ' + targetId + ' 后面没有节点，无法摘除。', 'err');
        lastResult = { error: true };
        return true;
      }

      const removedId = state.nodes[targetId].next;
      const removed = state.nodes[removedId];
      state.nodes[targetId].next = removed.next;
      removed.alive = false;
      state.removed.push(removedId);

      state.lastAction = 'remove';
      state.changedId = targetId;
      state.removedId = removedId;
      state.newId = null;

      emit('已摘除节点 ' + removedId + '：' + removed.value, 'ok');
      emit('[提醒] 只改了 next；节点仍占用内存，未 free/delete。', 'warn');
      emit('链表现在：' + chainText(), 'info');
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'reset') {
      lab.list = createListState();
      emit('链表已重置为 10 → 20 → 30。', 'info');
      lastResult = { error: false };
      return true;
    }

    return false;
  }

  /* ---------------- 实验台：滑动窗口 ---------------- */

  function pushFilter(filter, value) {
    let overwritten = null;
    let usedIndex = filter.index;

    if (filter.count === 4) {
      overwritten = filter.samples[filter.index];
      filter.sum -= filter.samples[filter.index];
    } else {
      filter.count++;
    }

    filter.samples[filter.index] = value;
    filter.sum += value;
    filter.index = (filter.index + 1) % 4;

    const avg = Math.floor(filter.sum / filter.count);
    filter.lastAvg = avg;
    filter.lastValue = value;
    filter.lastIndex = usedIndex;
    filter.lastAction = 'push';
    return { avg: avg, overwritten: overwritten, usedIndex: usedIndex };
  }

  function filterStatusText(filter) {
    return 'samples=[' + filter.samples.map(function (v) {
      return v === null ? '—' : v;
    }).join(', ') + ']  sum=' + filter.sum + '  count=' + filter.count + '  index=' + filter.index;
  }

  function outputPush(value, result) {
    emit('push(' + value + ') → ' + result.avg, 'output');
    emit('[状态] 写入 samples[' + result.usedIndex + ']' +
      (result.overwritten !== null ? '，覆盖旧值 ' + result.overwritten : '') +
      '；sum=' + lab.filter.sum + '，count=' + lab.filter.count + '，index=' + lab.filter.index,
      'info');
  }

  function handleFilterCommand(cmd) {
    let match = cmd.match(/^push\s+(-?\d+)$/i);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value < 0 || value > 65535) {
        emit('采样值必须在 0～65535 之间（uint16_t）。', 'err');
        lastResult = { error: true };
        return true;
      }
      const result = pushFilter(lab.filter, value);
      outputPush(value, result);
      lastResult = { error: false };
      return true;
    }

    match = cmd.match(/^pushMany\s+(.+)$/i);
    if (match) {
      const values = match[1].trim().split(/\s+/).map(function (part) {
        return /^-?\d+$/.test(part) ? parseInt(part, 10) : NaN;
      });
      if (values.some(function (v) { return isNaN(v) || v < 0 || v > 65535; })) {
        emit('pushMany 的每个参数都必须是 0～65535 的整数。', 'err');
        lastResult = { error: true };
        return true;
      }
      values.forEach(function (value) {
        const result = pushFilter(lab.filter, value);
        outputPush(value, result);
      });
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'demo') {
      lab.filter = createFilterState();
      const readings = [100, 101, 99, 102, 100];
      emit('演示读数：100、101、99、102、100', 'system');
      readings.forEach(function (value) {
        const result = pushFilter(lab.filter, value);
        outputPush(value, result);
      });
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'status') {
      const f = lab.filter;
      emit(filterStatusText(f), 'output');
      emit('[平均] ' + (f.count ? Math.floor(f.sum / f.count) : '—') +
        '（窗口 ' + f.count + '/4）', 'info');
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'reset') {
      lab.filter = createFilterState();
      emit('滤波器已重置：samples 全部为空，sum=0，count=0，index=0。', 'info');
      lastResult = { error: false };
      return true;
    }

    return false;
  }

  /* ---------------- 实验台：综合项目 ---------------- */

  function applyMotorSpeed(obj, value) {
    if (value < 0 || value > 100) return false;
    obj.speed = value;
    return true;
  }

  function projectUpdate(value) {
    const p = lab.project;
    const result = pushFilter(p.filter, value);
    const ok = applyMotorSpeed(p.motor, result.avg);
    p.lastRaw = value;
    p.lastAvg = result.avg;
    p.lastOk = ok;
    p.lastAction = 'update';

    emit('raw ' + value + ' → filtered ' + result.avg + ' → speed_ ' + p.motor.speed +
      ' (' + (ok ? 'true' : 'false') + ')', ok ? 'output' : 'warn');
    if (!ok) {
      emit('[提醒] 平均值超出 0～100，Motor::setSpeed() 拒绝；电机保持 ' + p.motor.speed + '。', 'warn');
    } else {
      emit('[状态] filter.count=' + p.filter.count + '，index=' + p.filter.index, 'info');
    }
    return ok;
  }

  function handleProjectCommand(cmd) {
    let match = cmd.match(/^update\s+(-?\d+)$/i);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value < 0 || value > 65535) {
        emit('原始采样必须在 0～65535 之间。', 'err');
        lastResult = { error: true };
        return true;
      }
      projectUpdate(value);
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'demo') {
      lab.project = createProjectState();
      const readings = [80, 90, 85, 95, 88];
      emit('演示：raw = 80, 90, 85, 95, 88', 'system');
      readings.forEach(function (value) {
        projectUpdate(value);
      });
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'status') {
      const p = lab.project;
      emit(filterStatusText(p.filter), 'output');
      emit('motor: id=' + p.motor.id + ' speed=' + p.motor.speed +
        ' enabled=' + (p.motor.enabled ? 1 : 0), 'output');
      emit('[最后更新] raw=' + (p.lastRaw === null ? '—' : p.lastRaw) +
        '  filtered=' + (p.lastAvg === null ? '—' : p.lastAvg) +
        '  accepted=' + (p.lastOk === null ? '—' : (p.lastOk ? 'true' : 'false')), 'info');
      lastResult = { error: false };
      return true;
    }

    if (cmd === 'reset') {
      lab.project = createProjectState();
      emit('综合项目状态已重置。', 'info');
      lastResult = { error: false };
      return true;
    }

    return false;
  }

  /* ---------------- 帮助与命令分发 ---------------- */

  function printHelp() {
    const lines = {
      motor: [
        '可用语句（Motor 模式）',
        '  Motor motor(1)              构造对象，编号默认 0',
        '  const Motor cm(2)           构造 const 对象',
        '  Motor* p = &motor           创建对象指针',
        '  Motor* p = nullptr          空指针；解引用会报错',
        '  motor.setSpeed(80)          设置速度，返回 true / false',
        '  motor.enable() / disable()  修改使能状态',
        '  motor.id() / speed() / isEnabled() / status()',
        '  p->setSpeed(70)             通过指针调用',
        '  cm.setSpeed(50)             观察 const 编译错误',
        '  help / reset / clear'
      ],
      list: [
        '可用命令（LinkedList 模式）',
        '  traverse                    遍历并打印所有值',
        '  head                        查看头节点',
        '  find 20                     查找值为 20 的节点',
        '  insertAfter 10 15           在值为 10 的节点后插入 15',
        '  removeAfter 10              摘除 10 后面的节点（不释放内存）',
        '  status                      查看链表结构',
        '  reset / help / clear'
      ],
      filter: [
        '可用命令（MovingAverage 模式）',
        '  push 100                    放入一个采样，返回滑动平均',
        '  pushMany 100 101 99         连续放入多个采样',
        '  demo                        演示 100、101、99、102、100',
        '  status                      查看 samples / sum / count / index',
        '  reset / help / clear'
      ],
      project: [
        '可用命令（Pipeline 模式）',
        '  update 80                   采样 → 滤波 → 限幅，更新电机',
        '  demo                        演示一组完整流水线',
        '  status                      查看滤波器与电机状态',
        '  reset / help / clear'
      ]
    };

    appendTerminal((lines[labMode] || lines.motor).join('\n'), 'dim');
  }

  function executeCommand(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return;

    appendInput(trimmed);
    commandHistory.push(trimmed);
    if (commandHistory.length > 100) commandHistory.shift();
    historyIndex = commandHistory.length;
    els.input.value = '';

    if (trimmed === 'clear') {
      clearTerminal();
      return;
    }

    const cmd = trimmed.replace(/\s+/g, ' ').replace(/;+\s*$/g, '').trim();
    lastResult = { error: false };

    if (cmd === 'help') {
      printHelp();
      checkTask(cmd);
      return;
    }

    if (cmd === 'reset') {
      resetCurrentLab(true);
      appendTerminal('已重置当前实验台。', 'info');
      printWelcome(labMode);
      renderZones();
      renderSuggestions();
      checkTask(cmd);
      return;
    }

    let handled = false;
    if (labMode === 'motor') handled = handleMotorCommand(cmd);
    else if (labMode === 'list') handled = handleListCommand(cmd);
    else if (labMode === 'filter') handled = handleFilterCommand(cmd);
    else if (labMode === 'project') handled = handleProjectCommand(cmd);

    if (!handled) {
      emitError('无法识别：' + cmd, '输入 help 查看当前实验台支持的语句。');
      lastResult = { error: true };
    }

    checkTask(cmd);
    renderZones();
    renderSuggestions();
    els.input.focus();
  }

  /* ---------------- 测验交互 ---------------- */

  function handleQuizClick(button) {
    if (!currentCard || !currentCard.quiz) return;
    if (completed.has(currentCard.id)) return;

    const quiz = button.closest('.quiz');
    if (!quiz || quiz.getAttribute('data-correct') === '1') return;

    const qIndex = parseInt(button.getAttribute('data-qindex') || '0', 10);
    const chosen = parseInt(button.getAttribute('data-option'), 10);
    const questions = Array.isArray(currentCard.quiz.questions)
      ? currentCard.quiz.questions
      : [currentCard.quiz];
    const question = questions[qIndex];
    if (!question) return;

    const feedback = quiz.querySelector('.quiz-feedback');
    const options = Array.prototype.slice.call(quiz.querySelectorAll('.quiz-option'));

    if (chosen === question.answer) {
      options.forEach(function (opt) {
        opt.disabled = true;
        if (parseInt(opt.getAttribute('data-option'), 10) === question.answer) {
          opt.classList.add('correct');
        }
      });
      quiz.setAttribute('data-correct', '1');
      if (feedback) {
        feedback.hidden = false;
        feedback.classList.remove('error');
        feedback.innerHTML = '<strong>正确。</strong> ' + question.explain;
      }
      updateQuizProgress();

      if (Array.isArray(currentCard.quiz.questions)) {
        const all = els.content.querySelectorAll('.quiz[data-qindex]');
        const done = els.content.querySelectorAll('.quiz[data-correct="1"]');
        if (all.length && all.length === done.length) {
          markComplete(currentCard.id);
        }
      } else {
        markComplete(currentCard.id);
      }
    } else {
      button.classList.add('wrong');
      button.disabled = true;
      if (feedback) {
        feedback.hidden = false;
        feedback.classList.add('error');
        feedback.innerHTML = '<strong>再想一想。</strong> 这个选项不符合本节介绍的规则。可以回到正文查看对应段落，或换一个选项。';
      }
    }
  }

  function updateQuizProgress() {
    if (!currentCard || !currentCard.quiz || !Array.isArray(currentCard.quiz.questions)) return;
    const progress = els.content.querySelector('.quiz-progress');
    if (!progress) return;
    const total = currentCard.quiz.questions.length;
    const done = els.content.querySelectorAll('.quiz[data-correct="1"]').length;
    progress.textContent = done + ' / ' + total + ' 已答对';
  }

  /* ---------------- 事件绑定 ---------------- */

  function bindEvents() {
    els.btnPrev.addEventListener('click', function () {
      showCard(currentIndex - 1);
    });

    els.btnNext.addEventListener('click', function () {
      showCard(currentIndex + 1);
    });

    if (els.mobileSelect) {
      els.mobileSelect.addEventListener('change', function () {
        const index = cards.findIndex(function (card) { return card.id === els.mobileSelect.value; });
        if (index >= 0) showCard(index);
      });
    }

    els.sidebar.addEventListener('click', function (event) {
      const chapterButton = event.target.closest('.chapter-title');
      if (chapterButton) {
        const index = parseInt(chapterButton.getAttribute('data-chapter'), 10);
        const chapter = COURSE.chapters[index];
        if (!chapter) return;
        chapterOpen[chapter.id] = chapterOpen[chapter.id] === false;
        saveProgress();
        renderSidebar();
        return;
      }

      const cardButton = event.target.closest('.card-item');
      if (cardButton) {
        const id = cardButton.getAttribute('data-card-id');
        const index = cards.findIndex(function (card) { return card.id === id; });
        if (index >= 0) showCard(index);
      }
    });

    els.input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        executeCommand(els.input.value);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (historyIndex <= 0) return;
        historyIndex--;
        els.input.value = commandHistory[historyIndex] || '';
        els.input.setSelectionRange(els.input.value.length, els.input.value.length);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex >= commandHistory.length - 1) {
          historyIndex = commandHistory.length;
          els.input.value = '';
          return;
        }
        historyIndex++;
        els.input.value = commandHistory[historyIndex] || '';
      } else if (event.key === 'Escape') {
        els.input.value = '';
      }
    });

    els.run.addEventListener('click', function () {
      executeCommand(els.input.value);
    });

    document.querySelector('.lab').addEventListener('click', function (event) {
      if (event.target.closest('button') || event.target.tagName === 'A') return;
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
      els.input.focus();
    });

    els.suggestions.addEventListener('click', function (event) {
      const chip = event.target.closest('.suggest-chip');
      if (!chip) return;
      els.input.value = chip.getAttribute('data-cmd') || '';
      els.input.focus();
      els.input.setSelectionRange(els.input.value.length, els.input.value.length);
    });

    els.labReset.addEventListener('click', function () {
      resetCurrentLab(false);
    });

    els.taskRead.addEventListener('click', function () {
      if (currentCard && !currentCard.task && !currentCard.quiz) {
        markComplete(currentCard.id);
      }
    });

    els.content.addEventListener('click', function (event) {
      const copyButton = event.target.closest('.copy-btn');
      if (copyButton) {
        const block = copyButton.closest('.code-block');
        const code = block ? block.querySelector('code') : null;
        if (code) copyText(code.textContent, copyButton);
        return;
      }

      const option = event.target.closest('.quiz-option');
      if (option) {
        handleQuizClick(option);
        return;
      }

      const summary = event.target.closest('summary');
      if (summary) {
        /* details 的默认行为即可 */
      }
    });

    els.resetProgress.addEventListener('click', function () {
      const ok = window.confirm('确定清空本机保存的全部学习进度吗？实验台状态不会被清空。');
      if (!ok) return;
      completed.clear();
      Object.keys(stepProgress).forEach(function (key) { delete stepProgress[key]; });
      saveProgress();
      renderSidebar();
      updateProgress();
      renderCard();
      renderTask();
      renderZones();
      renderSuggestions();
      showToast('学习进度已清空');
    });

    document.addEventListener('keydown', function (event) {
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        showCard(currentIndex - 1);
      } else if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        showCard(currentIndex + 1);
      }
    });

    window.addEventListener('resize', debounce(drawArrows, 120));

    window.addEventListener('hashchange', function () {
      const id = window.location.hash.replace('#', '');
      const index = cards.findIndex(function (card) { return card.id === id; });
      if (index >= 0 && index !== currentIndex) showCard(index);
    });
  }

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }

  function copyText(text, button) {
    function done() {
      const original = button.textContent;
      button.textContent = '已复制';
      button.classList.add('copied');
      setTimeout(function () {
        button.textContent = original;
        button.classList.remove('copied');
      }, 1200);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text, done);
      });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      done();
    } catch (err) {
      showToast('复制失败，请手动选择代码');
    }
    document.body.removeChild(area);
  }

  /* ---------------- 初始化 ---------------- */

  function init() {
    loadProgress();

    const hashId = window.location.hash.replace('#', '');
    const hashIndex = cards.findIndex(function (card) { return card.id === hashId; });
    if (hashIndex >= 0) currentIndex = hashIndex;

    bindEvents();
    populateMobileSelect();
    showCard(currentIndex);

    setTimeout(function () {
      drawArrows();
      if (!window.matchMedia('(max-width: 720px)').matches) {
        els.input.focus();
      }
    }, 120);
  }

  init();
})();
