/**
 * CHRONOS — Time-Travel Debugger IDE
 * Frontend Application Logic
 */

(function () {
  'use strict';

  // =========================================================================
  // Sample Programs & Built-in Templates
  // =========================================================================
  const EXAMPLES = {
    fact: {
      filename: "fact.cpp",
      title: "Buggy Factorial (fact.cpp)",
      code: `#include <iostream>

int fact(int n) {
    if (n == 0)
        return 0;          // Bug: should return 1!
    int r = n * fact(n - 1);
    return r;
}

int main() {
    int result = fact(3);
    std::cout << "Result: " << result << "\\n";
    return 0;
}
`,
      fallbackRecording: {
        file: "fact.cpp",
        note: "",
        source: [
          "#include <iostream>", "",
          "int fact(int n) {",
          "    if (n == 0)",
          "        return 0;          // Bug: should return 1!",
          "    int r = n * fact(n - 1);",
          "    return r;",
          "}", "",
          "int main() {",
          "    int result = fact(3);",
          "    std::cout << \"Result: \" << result << \"\\n\";",
          "    return 0;",
          "}"
        ],
        steps: [
          { stack: [{ func: "main", line: 11, locals: { result: "32767" } }] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 4,  locals: { n: "3", r: "1819242352" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 4,  locals: { n: "2", r: "0" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 6,  locals: { n: "2", r: "0" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 6,  locals: { n: "2", r: "0" } },
              { func: "fact", line: 4,  locals: { n: "1", r: "32767" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 6,  locals: { n: "2", r: "0" } },
              { func: "fact", line: 6,  locals: { n: "1", r: "32767" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 6,  locals: { n: "2", r: "0" } },
              { func: "fact", line: 6,  locals: { n: "1", r: "32767" } },
              { func: "fact", line: 4,  locals: { n: "0", r: "0" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 6,  locals: { n: "2", r: "0" } },
              { func: "fact", line: 6,  locals: { n: "1", r: "32767" } },
              { func: "fact", line: 5,  locals: { n: "0", r: "0" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 6,  locals: { n: "2", r: "0" } },
              { func: "fact", line: 6,  locals: { n: "1", r: "32767" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 6,  locals: { n: "2", r: "0" } },
              { func: "fact", line: 7,  locals: { n: "1", r: "0" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 6,  locals: { n: "2", r: "0" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } },
              { func: "fact", line: 7,  locals: { n: "2", r: "0" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 6,  locals: { n: "3", r: "1819242352" } }
          ] },
          { stack: [
              { func: "main", line: 11, locals: { result: "32767" } },
              { func: "fact", line: 7,  locals: { n: "3", r: "0" } }
          ] },
          { stack: [{ func: "main", line: 12, locals: { result: "0" } }] },
          { stack: [{ func: "main", line: 13, locals: { result: "0" } }] },
          { stack: [{ func: "main", line: 14, locals: { result: "0" } }] },
          { stack: [{ func: "main", line: 14, locals: { result: "0" } }] }
        ]
      }
    },
    assign: {
      filename: "assign.cpp",
      title: "Variable Assignments (assign.cpp)",
      code: `#include <iostream>

int main() {
    int x = 10;
    int y = 20;
    x = x + 5;
    y = x * 2;
    int z = x + y;
    std::cout << "z: " << z << "\\n";
    return 0;
}
`,
      fallbackRecording: null
    },
    loop: {
      filename: "loop.cpp",
      title: "Loop Counter (loop.cpp)",
      code: `#include <iostream>

int main() {
    int sum = 0;
    int limit = 4;
    for (int i = 1; i <= limit; ++i) {
        sum += i * 2;
    }
    std::cout << "Sum: " << sum << "\\n";
    return 0;
}
`,
      fallbackRecording: null
    },
    funcs: {
      filename: "funcs.cpp",
      title: "Nested Function Calls (funcs.cpp)",
      code: `#include <iostream>

int getRate(int tier) {
    int baseRate = 5;
    if (tier > 2) {
        return baseRate * 2;
    }
    return baseRate;
}

int calculateTax(int income, int tier) {
    int rate = getRate(tier);
    int tax = (income * rate) / 100;
    return tax;
}

int main() {
    int income = 1000;
    int tier = 3;
    int tax = calculateTax(income, tier);
    std::cout << "Tax: " << tax << "\\n";
    return 0;
}
`,
      fallbackRecording: null
    },
    list: {
      filename: "list.cpp",
      title: "Linked List (list.cpp)",
      code: `#include <iostream>

struct Node {
    int data;
    Node* next;
};

Node* push(Node* head, int value) {
    Node* n = new Node{value, head};
    return n;
}

int sum(Node* head) {
    int total = 0;
    Node* cur = head;
    while (cur != nullptr) {
        total += cur->data;
        cur = cur->next;
    }
    return total;
}

int main() {
    Node* head = nullptr;
    for (int i = 1; i <= 3; i++) {
        head = push(head, i * 10);
    }
    int s = sum(head);
    std::cout << "Total: " << s << "\\n";
    return 0;
}
`,
      fallbackRecording: null
    },
    crash: {
      filename: "crash.cpp",
      title: "Null Dereference Crash (crash.cpp)",
      code: `#include <iostream>

struct Person {
    int id;
    int age;
};

int getAge(Person* p) {
    // Bug: p is null when called with nullptr!
    return p->age;
}

int main() {
    Person* ptr = nullptr;
    std::cout << "Dereferencing pointer...\\n";
    int val = getAge(ptr);
    std::cout << "Val: " << val << "\\n";
    return 0;
}
`,
      fallbackRecording: {
        file: "crash.cpp",
        note: "Thread 1 received signal SIGSEGV, Segmentation fault.",
        source: [
          "#include <iostream>", "",
          "struct Person {",
          "    int id;",
          "    int age;",
          "};", "",
          "int getAge(Person* p) {",
          "    // Bug: p is null when called with nullptr!",
          "    return p->age;",
          "}", "",
          "int main() {",
          "    Person* ptr = nullptr;",
          "    std::cout << \"Dereferencing pointer...\\n\";",
          "    int val = getAge(ptr);",
          "    std::cout << \"Val: \" << val << \"\\n\";",
          "    return 0;",
          "}"
        ],
        steps: [
          { stack: [{ func: "main", line: 14, locals: { val: "0" } }] },
          { stack: [{ func: "main", line: 15, locals: { val: "0" } }] },
          { stack: [{ func: "main", line: 16, locals: { val: "0" } }] },
          { stack: [
              { func: "main", line: 16, locals: { val: "0" } },
              { func: "getAge", line: 10, locals: { p: "nullptr" } }
          ] },
          { stack: [
              { func: "main", line: 16, locals: { val: "0" } },
              { func: "getAge", line: 10, locals: { p: "nullptr" } }
          ] },
          { stack: [
              { func: "main", line: 16, locals: { val: "0" } },
              { func: "getAge", line: 10, locals: { p: "nullptr" } }
          ] }
        ]
      }
    }
  };

  // =========================================================================
  // State Management (All in-memory)
  // =========================================================================
  const state = {
    activeTab: 'tab-editor',
    recording: null,
    currentStep: 0,
    isPlaying: false,
    playIntervalId: null,
    selectedHistoryVar: '',
    inspectedFrameIndex: -1,
    allVariableNames: [],
    isBackendOnline: false,
    currentExampleKey: 'fact',
    detectedCrashInfo: null,
    heuristicFindings: []
  };

  // =========================================================================
  // DOM References
  // =========================================================================
  const dom = {
    // Nav tabs
    tabBtnEditor: document.getElementById('tab-btn-editor'),
    tabBtnDebugger: document.getElementById('tab-btn-debugger'),
    tabBtnAnalysis: document.getElementById('tab-btn-analysis'),
    stepCountBadge: document.getElementById('step-count-badge'),
    analysisAlertBadge: document.getElementById('analysis-alert-badge'),
    serverStatus: document.getElementById('server-status'),
    statusLabel: document.getElementById('status-label'),
    themeToggle: document.getElementById('theme-toggle'),

    // Tab panes
    tabEditor: document.getElementById('tab-editor'),
    tabDebugger: document.getElementById('tab-debugger'),
    tabAnalysis: document.getElementById('tab-analysis'),

    // Tab 1: Editor
    editorFilename: document.getElementById('editor-filename'),
    exampleSelect: document.getElementById('example-select'),
    btnClearCode: document.getElementById('btn-clear-code'),
    btnResetCode: document.getElementById('btn-reset-code'),
    btnRunCode: document.getElementById('btn-run-code'),
    runBtnLabel: document.getElementById('run-btn-label'),
    editorGutter: document.getElementById('editor-gutter'),
    codeEditorInput: document.getElementById('code-editor-input'),
    consoleStatusDot: document.getElementById('console-status-dot'),
    consoleStatusTitle: document.getElementById('console-status-title'),
    consoleOutputText: document.getElementById('console-output-text'),
    btnClearConsole: document.getElementById('btn-clear-console'),

    // Tab 2: Debugger Timeline
    btnFirst: document.getElementById('btn-first'),
    btnPrev: document.getElementById('btn-prev'),
    btnPlay: document.getElementById('btn-play'),
    btnNext: document.getElementById('btn-next'),
    btnLast: document.getElementById('btn-last'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    playText: document.getElementById('play-text'),
    timelineSlider: document.getElementById('timeline-slider'),
    curStepCounter: document.getElementById('cur-step-counter'),
    totalStepCounter: document.getElementById('total-step-counter'),
    jumpInput: document.getElementById('jump-input'),
    btnJump: document.getElementById('btn-jump'),

    // Tab 2: Debugger Panels
    sourceFilenameTitle: document.getElementById('source-filename-title'),
    currentLocationChip: document.getElementById('current-location-chip'),
    debuggerSourceBody: document.getElementById('debugger-source-body'),
    debuggerSourceLines: document.getElementById('debugger-source-lines'),

    varFuncChip: document.getElementById('var-func-chip'),
    variablesTbody: document.getElementById('variables-tbody'),
    variablesEmpty: document.getElementById('variables-empty'),

    stackDepthChip: document.getElementById('stack-depth-chip'),
    stackBoxes: document.getElementById('stack-boxes'),

    // Tab 2: Advanced tools
    historyVarSelect: document.getElementById('history-var-select'),
    btnPrevChange: document.getElementById('btn-prev-change'),
    btnNextChange: document.getElementById('btn-next-change'),
    historySummaryText: document.getElementById('history-summary-text'),
    historyChartWrapper: document.getElementById('history-chart-wrapper'),
    historyChartSvg: document.getElementById('history-chart-svg'),
    historyTextList: document.getElementById('history-text-list'),
    historyTextItems: document.getElementById('history-text-items'),

    compareStepA: document.getElementById('compare-step-a'),
    compareStepB: document.getElementById('compare-step-b'),
    btnSetStepA: document.getElementById('btn-set-step-a'),
    btnSetStepB: document.getElementById('btn-set-step-b'),
    btnRunCompare: document.getElementById('btn-run-compare'),
    compareTbody: document.getElementById('compare-tbody'),
    compareEmpty: document.getElementById('compare-empty'),

    // Tab 3: Bug Analysis
    analysisOverviewBanner: document.getElementById('analysis-overview-banner'),
    analysisBannerTitle: document.getElementById('analysis-banner-title'),
    analysisBannerDesc: document.getElementById('analysis-banner-desc'),
    analysisCrashCard: document.getElementById('analysis-crash-card'),
    crashMetaSignal: document.getElementById('crash-meta-signal'),
    crashMetaStep: document.getElementById('crash-meta-step'),
    crashMetaLocation: document.getElementById('crash-meta-location'),
    crashExplanationText: document.getElementById('crash-explanation-text'),
    crashVarsTbody: document.getElementById('crash-vars-tbody'),
    btnJumpCrashStep: document.getElementById('btn-jump-crash-step'),
    findingsList: document.getElementById('findings-list')
  };

  // =========================================================================
  // Utilities
  // =========================================================================
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isCleanNumber(str) {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed === '') return false;
    if (/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      return !Number.isNaN(num) && Number.isFinite(num);
    }
    return false;
  }

  function getFrameLocals(frame) {
    if (!frame) return {};
    if (frame.locals && typeof frame.locals === 'object') return frame.locals;
    if (Array.isArray(frame.vars)) {
      const obj = {};
      for (const v of frame.vars) {
        if (v && v.name !== undefined) {
          obj[v.name] = String(v.value !== undefined ? v.value : '');
        }
      }
      return obj;
    }
    return {};
  }

  function collectAllVariableNames(steps) {
    const set = new Set();
    for (const step of steps) {
      if (!step || !Array.isArray(step.stack)) continue;
      for (const frame of step.stack) {
        const locals = getFrameLocals(frame);
        for (const name of Object.keys(locals)) {
          set.add(name);
        }
      }
    }
    return Array.from(set).sort();
  }

  function getVariableValueAtStep(stepIdx, varName) {
    if (!state.recording || !state.recording.steps) return undefined;
    const step = state.recording.steps[stepIdx];
    if (!step || !Array.isArray(step.stack)) return undefined;
    for (let f = step.stack.length - 1; f >= 0; f--) {
      const locals = getFrameLocals(step.stack[f]);
      if (Object.prototype.hasOwnProperty.call(locals, varName)) {
        return locals[varName];
      }
    }
    return undefined;
  }

  // =========================================================================
  // Tab Navigation
  // =========================================================================
  function switchTab(tabId) {
    state.activeTab = tabId;

    // Update buttons
    dom.tabBtnEditor.classList.toggle('active', tabId === 'tab-editor');
    dom.tabBtnDebugger.classList.toggle('active', tabId === 'tab-debugger');
    dom.tabBtnAnalysis.classList.toggle('active', tabId === 'tab-analysis');

    // Update panes
    dom.tabEditor.classList.toggle('active', tabId === 'tab-editor');
    dom.tabDebugger.classList.toggle('active', tabId === 'tab-debugger');
    dom.tabAnalysis.classList.toggle('active', tabId === 'tab-analysis');

    // If switching to debugger, scroll current line into view
    if (tabId === 'tab-debugger' && state.recording) {
      updateSourceHighlight();
    }
  }

  // =========================================================================
  // TAB 1: CODE EDITOR LOGIC
  // =========================================================================
  function updateEditorGutter() {
    const text = dom.codeEditorInput.value;
    const lineCount = text.split('\n').length;
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      html += `<div class="gutter-num">${i}</div>`;
    }
    dom.editorGutter.innerHTML = html;
  }

  function syncEditorScroll() {
    dom.editorGutter.scrollTop = dom.codeEditorInput.scrollTop;
  }

  function loadExample(key) {
    const ex = EXAMPLES[key];
    if (!ex) return;
    state.currentExampleKey = key;
    dom.editorFilename.textContent = ex.filename;
    dom.codeEditorInput.value = ex.code;
    updateEditorGutter();
    setConsoleMessage(`Loaded preset: ${ex.title}`, 'success');
  }

  function setConsoleMessage(msg, type = 'info') {
    dom.consoleOutputText.textContent = msg;
    dom.consoleOutputText.className = 'console-body';
    dom.consoleStatusDot.className = 'status-indicator-dot';

    if (type === 'error') {
      dom.consoleOutputText.classList.add('has-error');
      dom.consoleStatusDot.classList.add('error');
      dom.consoleStatusTitle.textContent = 'Compilation Error';
    } else if (type === 'success') {
      dom.consoleStatusTitle.textContent = 'Build Succeeded';
    } else {
      dom.consoleStatusTitle.textContent = 'Build & Compiler Output';
    }
  }

  // =========================================================================
  // Compilation & Recording Execution (Run Button)
  // =========================================================================
  async function runCode() {
    const sourceCode = dom.codeEditorInput.value;
    const filename = dom.editorFilename.textContent || "main.cpp";

    if (!sourceCode.trim()) {
      setConsoleMessage("Cannot run: Source code is empty.", 'error');
      return;
    }

    // Set UI to running state
    dom.btnRunCode.disabled = true;
    dom.runBtnLabel.textContent = "Compiling & Recording...";
    setConsoleMessage("Sending source to backend compiler (g++ -g -O0)...", 'info');

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: filename,
          source: sourceCode
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        // Compilation or execution error reported by C++ backend
        setConsoleMessage(data.compileError || "Compilation failed.", 'error');
        dom.btnRunCode.disabled = false;
        dom.runBtnLabel.textContent = "Run & Debug";
        return;
      }

      // Successful compilation & recording!
      setConsoleMessage("Compilation succeeded! GDB execution recording captured successfully.", 'success');
      dom.btnRunCode.disabled = false;
      dom.runBtnLabel.textContent = "Run & Debug";

      // Load recording into state
      initRecording(data.recording);

      // Navigate to Debugger (or Bug Analysis if fatal crash occurred)
      if (data.recording.note && data.recording.note.trim()) {
        switchTab('tab-analysis');
      } else {
        switchTab('tab-debugger');
      }

    } catch (err) {
      // Backend not running / offline fallback
      setConsoleMessage(
        `Backend connection error: ${err.message}.\n` +
        `Note: Make sure './chronos.exe' is running.\n` +
        `Falling back to client-side sample recording for demonstration.`,
        'error'
      );
      dom.btnRunCode.disabled = false;
      dom.runBtnLabel.textContent = "Run & Debug";

      // If this is a known example with fallback data, load it so student can still test
      const currentEx = EXAMPLES[state.currentExampleKey];
      if (currentEx && currentEx.fallbackRecording) {
        initRecording(currentEx.fallbackRecording);
        switchTab('tab-debugger');
      }
    }
  }

  // =========================================================================
  // TAB 2: DEBUGGER INITIALIZATION & CONTROLS
  // =========================================================================
  function initRecording(rec) {
    state.recording = rec;
    state.currentStep = 0;
    state.inspectedFrameIndex = -1;
    pause();

    const totalSteps = rec.steps.length;

    // Header metadata & title
    dom.sourceFilenameTitle.textContent = rec.file || 'main.cpp';
    dom.stepCountBadge.textContent = `${totalSteps} steps`;

    // Timeline Bounds
    dom.timelineSlider.min = '1';
    dom.timelineSlider.max = String(totalSteps);
    dom.timelineSlider.value = '1';

    dom.jumpInput.min = '1';
    dom.jumpInput.max = String(totalSteps);
    dom.jumpInput.value = '1';

    dom.totalStepCounter.textContent = String(totalSteps);

    // Advanced tools bounds
    dom.compareStepA.min = '1';
    dom.compareStepA.max = String(totalSteps);
    dom.compareStepA.value = '1';

    dom.compareStepB.min = '1';
    dom.compareStepB.max = String(totalSteps);
    dom.compareStepB.value = String(Math.min(2, totalSteps));

    // Variable names collection
    state.allVariableNames = collectAllVariableNames(rec.steps);
    populateHistoryVariableSelect();

    // Render Source Code Lines
    renderSourceCode(rec.source || []);

    // Analyze trace for Bug Analysis Tab
    runBugAnalysis(rec);

    // Go to step 0
    goToStep(0);
    runComparison();
  }

  function goToStep(stepIndex) {
    if (!state.recording || !state.recording.steps) return;
    const total = state.recording.steps.length;
    if (total === 0) return;

    state.currentStep = Math.max(0, Math.min(stepIndex, total - 1));
    state.inspectedFrameIndex = -1;

    updateTimelineControls();
    updateSourceHighlight();
    updateVariablesPanel();
    updateCallStackPanel();
    updateHistoryChart();
  }

  function stepForward() {
    if (!state.recording || !state.recording.steps) return;
    if (state.currentStep < state.recording.steps.length - 1) {
      goToStep(state.currentStep + 1);
    } else {
      pause();
    }
  }

  function stepBackward() {
    if (state.currentStep > 0) {
      goToStep(state.currentStep - 1);
    }
  }

  function goToStart() {
    goToStep(0);
  }

  function goToEnd() {
    if (!state.recording || !state.recording.steps) return;
    goToStep(state.recording.steps.length - 1);
  }

  function togglePlay() {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function play() {
    if (!state.recording || !state.recording.steps) return;
    if (state.currentStep >= state.recording.steps.length - 1) {
      goToStep(0);
    }
    state.isPlaying = true;
    dom.btnPlay.classList.add('is-playing');
    dom.iconPlay.classList.add('hidden');
    dom.iconPause.classList.remove('hidden');
    dom.playText.textContent = 'Pause';

    if (state.playIntervalId) clearInterval(state.playIntervalId);
    state.playIntervalId = setInterval(() => {
      stepForward();
    }, 500);
  }

  function pause() {
    state.isPlaying = false;
    dom.btnPlay.classList.remove('is-playing');
    dom.iconPlay.classList.remove('hidden');
    dom.iconPause.classList.add('hidden');
    dom.playText.textContent = 'Play';

    if (state.playIntervalId) {
      clearInterval(state.playIntervalId);
      state.playIntervalId = null;
    }
  }

  function updateTimelineControls() {
    const total = state.recording.steps.length;
    const stepNum = state.currentStep + 1;

    dom.curStepCounter.textContent = String(stepNum);
    dom.timelineSlider.value = String(stepNum);
    dom.jumpInput.value = String(stepNum);

    dom.btnFirst.disabled = (state.currentStep === 0);
    dom.btnPrev.disabled = (state.currentStep === 0);
    dom.btnNext.disabled = (state.currentStep === total - 1);
    dom.btnLast.disabled = (state.currentStep === total - 1);
  }

  // =========================================================================
  // Source Code Viewer
  // =========================================================================
  function renderSourceCode(lines) {
    let html = '';
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const escaped = escapeHtml(lines[i]);
      html += `
        <div class="code-line" id="debugger-line-${lineNum}" data-line="${lineNum}">
          <span class="line-num">${lineNum}</span>
          <span class="line-content">${escaped}</span>
        </div>
      `;
    }
    dom.debuggerSourceLines.innerHTML = html;
  }

  function updateSourceHighlight() {
    const step = state.recording.steps[state.currentStep];
    if (!step || !Array.isArray(step.stack) || step.stack.length === 0) return;

    const frameIdx = (state.inspectedFrameIndex >= 0 && state.inspectedFrameIndex < step.stack.length)
      ? state.inspectedFrameIndex
      : step.stack.length - 1;

    const frame = step.stack[frameIdx];
    const lineNum = frame ? frame.line : 0;
    const rawFunc = frame ? frame.func : 'unknown';
    const cleanFunc = rawFunc ? rawFunc.replace(/\(\)$/, '') : 'unknown';

    // Clear previous highlight
    const oldActive = dom.debuggerSourceLines.querySelectorAll('.code-line.active-line');
    oldActive.forEach(l => {
      l.classList.remove('active-line');
      const badge = l.querySelector('.active-line-badge');
      if (badge) badge.remove();
    });

    if (lineNum > 0) {
      const el = document.getElementById(`debugger-line-${lineNum}`);
      if (el) {
        el.classList.add('active-line');
        const content = el.querySelector('.line-content');
        if (content) {
          const badge = document.createElement('span');
          badge.className = 'active-line-badge';
          badge.textContent = `${cleanFunc}() at line ${lineNum}`;
          content.appendChild(badge);
        }
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      dom.currentLocationChip.textContent = `${cleanFunc}() at line ${lineNum}`;
    } else {
      dom.currentLocationChip.textContent = `${cleanFunc}()`;
    }
  }

  // =========================================================================
  // Variable Inspector Panel
  // =========================================================================
  function updateVariablesPanel() {
    const step = state.recording.steps[state.currentStep];
    if (!step || !Array.isArray(step.stack) || step.stack.length === 0) {
      dom.variablesTbody.innerHTML = '';
      dom.variablesEmpty.classList.remove('hidden');
      dom.varFuncChip.textContent = '—';
      return;
    }

    const frameIdx = (state.inspectedFrameIndex >= 0 && state.inspectedFrameIndex < step.stack.length)
      ? state.inspectedFrameIndex
      : step.stack.length - 1;

    const curFrame = step.stack[frameIdx];
    const funcName = curFrame.func ? curFrame.func.replace(/\(\)$/, '') : 'frame';
    dom.varFuncChip.textContent = `${funcName}()`;

    const currentLocals = getFrameLocals(curFrame);
    const varNames = Object.keys(currentLocals).sort();

    if (varNames.length === 0) {
      dom.variablesTbody.innerHTML = '';
      dom.variablesEmpty.classList.remove('hidden');
      return;
    }

    dom.variablesEmpty.classList.add('hidden');

    // Get locals from previous step to detect changes
    let prevLocals = {};
    if (state.currentStep > 0) {
      const prevStep = state.recording.steps[state.currentStep - 1];
      if (prevStep && Array.isArray(prevStep.stack) && prevStep.stack.length > 0) {
        let foundFrame = null;
        for (let i = prevStep.stack.length - 1; i >= 0; i--) {
          if (prevStep.stack[i].func === curFrame.func) {
            foundFrame = prevStep.stack[i];
            break;
          }
        }
        if (!foundFrame) foundFrame = prevStep.stack[prevStep.stack.length - 1];
        prevLocals = getFrameLocals(foundFrame);
      }
    }

    let rowsHtml = '';
    for (const name of varNames) {
      const val = currentLocals[name];
      const hasPrev = Object.prototype.hasOwnProperty.call(prevLocals, name);
      const prevVal = hasPrev ? prevLocals[name] : undefined;

      const isFirstStep = (state.currentStep === 0);
      const isChanged = !isFirstStep && hasPrev && (prevVal !== val);
      const isNew = !isFirstStep && !hasPrev;

      let changeCellHtml = '';
      if (isChanged) {
        changeCellHtml = `<span class="was-val">was ${escapeHtml(prevVal)}</span>`;
      } else if (isNew) {
        changeCellHtml = `<span class="new-badge">new</span>`;
      } else {
        changeCellHtml = `<span class="unchanged-badge">unchanged</span>`;
      }

      rowsHtml += `
        <tr class="${isChanged ? 'has-changed' : ''}">
          <td class="var-name">${escapeHtml(name)}</td>
          <td class="var-val">${escapeHtml(val)}</td>
          <td>${changeCellHtml}</td>
        </tr>
      `;
    }

    dom.variablesTbody.innerHTML = rowsHtml;
  }

  // =========================================================================
  // Call Stack Panel
  // =========================================================================
  function updateCallStackPanel() {
    const step = state.recording.steps[state.currentStep];
    if (!step || !Array.isArray(step.stack) || step.stack.length === 0) {
      dom.stackBoxes.innerHTML = '<div class="empty-state">Call stack is empty</div>';
      dom.stackDepthChip.textContent = 'depth 0';
      return;
    }

    const depth = step.stack.length;
    dom.stackDepthChip.textContent = `depth ${depth}`;

    let html = '';
    // Top of stack is displayed on top
    for (let i = depth - 1; i >= 0; i--) {
      const frame = step.stack[i];
      const isTop = (i === depth - 1);
      const isSelected = (state.inspectedFrameIndex === i);
      const rawFunc = frame.func || 'anonymous';
      const cleanFunc = rawFunc.replace(/\(\)$/, '');
      const lineNum = frame.line || '?';

      const locals = getFrameLocals(frame);
      const pairs = [];
      for (const [k, v] of Object.entries(locals)) {
        pairs.push(`${escapeHtml(k)} = ${escapeHtml(v)}`);
      }
      const localsSummary = pairs.length > 0 ? pairs.join(', ') : 'no locals';

      html += `
        <div class="stack-frame-box ${isTop ? 'is-top' : ''} ${isSelected ? 'is-selected' : ''}" data-frame-index="${i}">
          <div class="frame-header">
            <span class="frame-func-name">${escapeHtml(cleanFunc)}()</span>
            <span class="chip ${isTop ? 'chip-accent' : 'chip-subtle'}">${isTop ? 'CURRENT' : '#' + i}</span>
          </div>
          <div class="frame-line">line ${lineNum}</div>
          <div class="frame-vars" title="${localsSummary}">${localsSummary}</div>
        </div>
      `;
    }

    dom.stackBoxes.innerHTML = html;

    const boxes = dom.stackBoxes.querySelectorAll('.stack-frame-box');
    boxes.forEach(box => {
      box.addEventListener('click', () => {
        const idx = parseInt(box.getAttribute('data-frame-index'), 10);
        state.inspectedFrameIndex = idx;
        updateSourceHighlight();
        updateVariablesPanel();
        updateCallStackPanel();
      });
    });
  }

  // =========================================================================
  // Optional Advanced Tools: Variable History & Step Compare
  // =========================================================================
  function populateHistoryVariableSelect() {
    const names = state.allVariableNames;
    if (names.length === 0) {
      dom.historyVarSelect.innerHTML = '<option value="">No variables</option>';
      state.selectedHistoryVar = '';
      return;
    }

    let html = '';
    for (const name of names) {
      html += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }
    dom.historyVarSelect.innerHTML = html;

    if (!names.includes(state.selectedHistoryVar)) {
      state.selectedHistoryVar = names[0];
    }
    dom.historyVarSelect.value = state.selectedHistoryVar;
  }

  function updateHistoryChart() {
    const varName = state.selectedHistoryVar;
    if (!varName || !state.recording || !state.recording.steps) return;

    const steps = state.recording.steps;
    const n = steps.length;
    const history = [];
    let hasNonNumeric = false;
    let definedCount = 0;

    for (let i = 0; i < n; i++) {
      const v = getVariableValueAtStep(i, varName);
      if (v !== undefined) {
        definedCount++;
        const numeric = isCleanNumber(v);
        if (!numeric) hasNonNumeric = true;
        history.push({ step: i, val: v, numVal: numeric ? Number(v) : NaN });
      } else {
        history.push({ step: i, val: undefined, numVal: NaN });
      }
    }

    const changeSteps = [];
    for (let i = 0; i < n; i++) {
      const nowVal = history[i].val;
      const prevVal = (i > 0) ? history[i - 1].val : undefined;
      if (nowVal !== undefined && nowVal !== prevVal) {
        changeSteps.push(i);
      }
    }

    let prevChangeStep = -1;
    for (let i = changeSteps.length - 1; i >= 0; i--) {
      if (changeSteps[i] < state.currentStep) {
        prevChangeStep = changeSteps[i];
        break;
      }
    }

    let nextChangeStep = -1;
    for (let i = 0; i < changeSteps.length; i++) {
      if (changeSteps[i] > state.currentStep) {
        nextChangeStep = changeSteps[i];
        break;
      }
    }

    dom.btnPrevChange.disabled = (prevChangeStep === -1);
    dom.btnNextChange.disabled = (nextChangeStep === -1);

    dom.btnPrevChange.onclick = () => { if (prevChangeStep !== -1) goToStep(prevChangeStep); };
    dom.btnNextChange.onclick = () => { if (nextChangeStep !== -1) goToStep(nextChangeStep); };

    const curVal = history[state.currentStep] ? history[state.currentStep].val : undefined;
    dom.historySummaryText.textContent = (curVal !== undefined)
      ? `Step ${state.currentStep + 1}: ${varName} = ${curVal}`
      : `Step ${state.currentStep + 1}: out of scope`;

    if (definedCount > 0 && !hasNonNumeric) {
      dom.historyChartWrapper.classList.remove('hidden');
      dom.historyTextList.classList.add('hidden');
      renderNumericHistoryChart(history);
    } else {
      dom.historyChartWrapper.classList.add('hidden');
      dom.historyTextList.classList.remove('hidden');
      renderTextHistoryList(history);
    }
  }

  function renderNumericHistoryChart(history) {
    const svg = dom.historyChartSvg;
    const w = 540, h = 130, padL = 40, padR = 20, padT = 16, padB = 24;
    const plotW = w - padL - padR, plotH = h - padT - padB;

    const numericPoints = history.filter(p => !Number.isNaN(p.numVal));
    if (numericPoints.length === 0) {
      svg.innerHTML = '<text x="270" y="65" text-anchor="middle" fill="var(--text-muted)">No numeric values</text>';
      return;
    }

    let minVal = Infinity, maxVal = -Infinity;
    for (const p of numericPoints) {
      if (p.numVal < minVal) minVal = p.numVal;
      if (p.numVal > maxVal) maxVal = p.numVal;
    }
    if (minVal === maxVal) { minVal -= 1; maxVal += 1; }

    const n = history.length;
    function getX(i) { return n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW; }
    function getY(v) { return h - padB - ((v - minVal) / (maxVal - minVal)) * plotH; }

    let svgHtml = `
      <line class="chart-grid-line" x1="${padL}" y1="${getY(minVal)}" x2="${w - padR}" y2="${getY(minVal)}" />
      <line class="chart-grid-line" x1="${padL}" y1="${getY(maxVal)}" x2="${w - padR}" y2="${getY(maxVal)}" />
      <text class="chart-axis-label" x="${padL - 6}" y="${getY(minVal) + 3}" text-anchor="end">${Number(minVal.toFixed(1))}</text>
      <text class="chart-axis-label" x="${padL - 6}" y="${getY(maxVal) + 3}" text-anchor="end">${Number(maxVal.toFixed(1))}</text>
    `;

    let pathD = '', inSeg = false;
    for (let i = 0; i < n; i++) {
      if (!Number.isNaN(history[i].numVal)) {
        const x = getX(i), y = getY(history[i].numVal);
        pathD += (!inSeg ? `M ${x} ${y} ` : `L ${x} ${y} `);
        inSeg = true;
      } else { inSeg = false; }
    }
    svgHtml += `<path class="chart-line" d="${pathD}" />`;

    const curX = getX(state.currentStep);
    svgHtml += `<line class="chart-current-vguide" x1="${curX}" y1="${padT}" x2="${curX}" y2="${h - padB}" />`;

    for (let i = 0; i < n; i++) {
      if (!Number.isNaN(history[i].numVal)) {
        const x = getX(i), y = getY(history[i].numVal);
        const isCur = (i === state.currentStep);
        svgHtml += `<circle class="chart-dot ${isCur ? 'is-current' : ''}" data-step="${i}" cx="${x}" cy="${y}" r="${isCur ? 5 : 3.5}" />`;
      }
    }

    svg.innerHTML = svgHtml;
    svg.querySelectorAll('.chart-dot').forEach(d => {
      d.addEventListener('click', () => {
        goToStep(parseInt(d.getAttribute('data-step'), 10));
      });
    });
  }

  function renderTextHistoryList(history) {
    let html = '';
    for (const item of history) {
      if (item.val === undefined) continue;
      const isCur = (item.step === state.currentStep);
      html += `
        <div class="history-text-row ${isCur ? 'is-current' : ''}" data-step="${item.step}">
          <span>Step ${item.step + 1}</span>
          <span>${escapeHtml(item.val)}</span>
        </div>
      `;
    }
    dom.historyTextItems.innerHTML = html || '<div class="empty-state">No values recorded</div>';
    dom.historyTextItems.querySelectorAll('.history-text-row').forEach(r => {
      r.addEventListener('click', () => {
        goToStep(parseInt(r.getAttribute('data-step'), 10));
      });
    });
  }

  function runComparison() {
    if (!state.recording || !state.recording.steps) return;
    const steps = state.recording.steps;
    const total = steps.length;
    if (total === 0) return;

    let stepAIdx = Math.max(0, Math.min(parseInt(dom.compareStepA.value, 10) - 1, total - 1));
    let stepBIdx = Math.max(0, Math.min(parseInt(dom.compareStepB.value, 10) - 1, total - 1));

    dom.compareStepA.value = String(stepAIdx + 1);
    dom.compareStepB.value = String(stepBIdx + 1);

    function getVars(step) {
      const map = {};
      if (step && step.stack) {
        for (let i = 0; i < step.stack.length; i++) {
          const loc = getFrameLocals(step.stack[i]);
          for (const [k, v] of Object.entries(loc)) map[k] = v;
        }
      }
      return map;
    }

    const localsA = getVars(steps[stepAIdx]);
    const localsB = getVars(steps[stepBIdx]);
    const allNames = Array.from(new Set([...Object.keys(localsA), ...Object.keys(localsB)])).sort();

    const diffs = [];
    for (const name of allNames) {
      const valA = localsA[name];
      const valB = localsB[name];
      if (valA !== valB) {
        let type = 'Modified', css = 'diff-modified';
        if (valA === undefined) { type = 'Added in B'; css = 'diff-added'; }
        else if (valB === undefined) { type = 'Removed in B'; css = 'diff-removed'; }
        diffs.push({ name, valA: valA || '—', valB: valB || '—', type, css });
      }
    }

    if (diffs.length === 0) {
      dom.compareTbody.innerHTML = '';
      dom.compareEmpty.classList.remove('hidden');
    } else {
      dom.compareEmpty.classList.add('hidden');
      let html = '';
      for (const d of diffs) {
        html += `
          <tr>
            <td class="var-name">${escapeHtml(d.name)}</td>
            <td>${escapeHtml(d.valA)}</td>
            <td>${escapeHtml(d.valB)}</td>
            <td><span class="diff-tag ${d.css}">${escapeHtml(d.type)}</span></td>
          </tr>
        `;
      }
      dom.compareTbody.innerHTML = html;
    }
  }

  // =========================================================================
  // TAB 3: BUG ANALYSIS ENGINE
  // =========================================================================
  function runBugAnalysis(rec) {
    state.detectedCrashInfo = null;
    state.heuristicFindings = [];

    const note = rec.note ? String(rec.note).trim() : '';
    const hasCrash = note.length > 0 && (
      note.includes('signal') ||
      note.includes('SIGSEGV') ||
      note.includes('Segmentation fault') ||
      note.includes('crash') ||
      note.includes('fault')
    );

    // 1. Analyze Detected Crash
    if (hasCrash) {
      const crashStepIdx = rec.steps.length - 1;
      const crashStep = rec.steps[crashStepIdx];
      const topFrame = (crashStep && crashStep.stack && crashStep.stack.length > 0)
        ? crashStep.stack[crashStep.stack.length - 1]
        : null;

      const crashFunc = topFrame ? topFrame.func.replace(/\(\)$/, '') : 'unknown';
      const crashLine = topFrame ? topFrame.line : '?';
      const crashLocals = topFrame ? getFrameLocals(topFrame) : {};

      state.detectedCrashInfo = {
        signal: note,
        stepIndex: crashStepIdx,
        stepNumber: crashStepIdx + 1,
        func: crashFunc,
        line: crashLine,
        locals: crashLocals
      };

      dom.analysisAlertBadge.classList.remove('hidden');
      dom.analysisAlertBadge.textContent = '!';
    } else {
      dom.analysisAlertBadge.classList.add('hidden');
    }

    // 2. Heuristic Analysis: Suspicious Patterns (Uninitialized Memory, Factorial 0, Infinite recursion)
    const findings = [];

    // Heuristic A: Look for Factorial Base Case bug (fact returning 0 when multiplying)
    for (let i = 0; i < rec.steps.length; i++) {
      const s = rec.steps[i];
      if (!s || !s.stack) continue;
      const top = s.stack[s.stack.length - 1];
      if (top && top.func && top.func.includes('fact')) {
        const locals = getFrameLocals(top);
        if (locals.n === "0" && s.stack.length > 2) {
          // In recursion, fact(0) returning 0 in factorial multiplication
          findings.push({
            type: "Logic Bug (Multiplication by Zero)",
            title: "Suspicious Base Case Return (n == 0 returns 0)",
            description: "At Step " + (i + 1) + ", fact(0) returned 0. Because factorial recursively multiplies previous terms by this return value (n * fact(n - 1)), the entire final product collapses to 0 instead of 6.",
            step: i,
            variables: "n = 0"
          });
          break;
        }
      }
    }

    // Heuristic B: Uninitialized memory / garbage values
    const seenGarbage = new Set();
    for (let i = 0; i < rec.steps.length; i++) {
      const s = rec.steps[i];
      if (!s || !s.stack) continue;
      for (const f of s.stack) {
        const locals = getFrameLocals(f);
        for (const [k, v] of Object.entries(locals)) {
          // Check common uninitialized stack markers
          if (v === "32767" || v === "1819242352" || (Number(v) > 100000000 && !seenGarbage.has(k))) {
            seenGarbage.add(k);
            findings.push({
              type: "Potential Uninitialized Memory",
              title: `Uninitialized Garbage Value in '${k}'`,
              description: `At Step ${i + 1}, variable '${k}' holds raw stack garbage (${v}) prior to assignment. Ensure all variables are initialized before use.`,
              step: i,
              variables: `${k} = ${v}`
            });
          }
        }
      }
    }

    // Heuristic C: Null pointer passed as argument
    for (let i = 0; i < rec.steps.length; i++) {
      const s = rec.steps[i];
      if (!s || !s.stack) continue;
      for (const f of s.stack) {
        const locals = getFrameLocals(f);
        for (const [k, v] of Object.entries(locals)) {
          if (v === "nullptr" || v === "0x0") {
            findings.push({
              type: "Pointer Warning",
              title: `Null Pointer Value in '${k}'`,
              description: `At Step ${i + 1}, '${k}' holds a null pointer (${v}). If dereferenced without a null-check, this causes a fatal segmentation fault.`,
              step: i,
              variables: `${k} = ${v}`
            });
            break;
          }
        }
      }
    }

    state.heuristicFindings = findings;
    renderBugAnalysisTab();
  }

  function renderBugAnalysisTab() {
    const crash = state.detectedCrashInfo;
    const findings = state.heuristicFindings;

    // Overview Banner
    if (crash) {
      dom.analysisOverviewBanner.className = 'analysis-overview-banner has-crash';
      dom.analysisBannerTitle.textContent = "Fatal Runtime Crash Detected";
      dom.analysisBannerDesc.textContent = `The program was terminated by the operating system due to a fatal signal: ${crash.signal}`;
      dom.analysisCrashCard.classList.remove('hidden');

      // Populate Crash Card
      dom.crashMetaSignal.textContent = crash.signal;
      dom.crashMetaStep.textContent = `Step ${crash.stepNumber} of ${state.recording.steps.length}`;
      dom.crashMetaLocation.textContent = `${crash.func}() at line ${crash.line}`;

      let explanation = "";
      if (crash.signal.includes("SIGSEGV") || crash.signal.includes("Segmentation fault")) {
        explanation = `<strong>Segmentation Fault (SIGSEGV):</strong> The program attempted to access an invalid memory address. In function <code>${crash.func}()</code> at line <code>${crash.line}</code>, a pointer was dereferenced when it held null or invalid memory.`;
      } else {
        explanation = `The program received a fatal signal: <code>${escapeHtml(crash.signal)}</code> during execution of function <code>${crash.func}()</code> at line <code>${crash.line}</code>.`;
      }
      dom.crashExplanationText.innerHTML = explanation;

      // Variables at crash point
      let varRows = '';
      const varEntries = Object.entries(crash.locals);
      if (varEntries.length === 0) {
        varRows = '<tr><td colspan="3" class="empty-state">No local variables in crash frame.</td></tr>';
      } else {
        for (const [k, v] of varEntries) {
          const isSuspect = (v === "nullptr" || v === "0x0" || Number(v) > 100000000);
          varRows += `
            <tr class="${isSuspect ? 'has-changed' : ''}">
              <td class="var-name">${escapeHtml(k)}</td>
              <td class="var-val">${escapeHtml(v)}</td>
              <td>${isSuspect ? '<span class="diff-tag diff-removed">High Suspect (Null/Invalid)</span>' : '<span class="diff-tag diff-added">Normal</span>'}</td>
            </tr>
          `;
        }
      }
      dom.crashVarsTbody.innerHTML = varRows;

      dom.btnJumpCrashStep.onclick = () => {
        switchTab('tab-debugger');
        goToStep(crash.stepIndex);
      };

    } else {
      dom.analysisCrashCard.classList.add('hidden');
      if (findings.length > 0) {
        dom.analysisOverviewBanner.className = 'analysis-overview-banner';
        dom.analysisBannerTitle.textContent = "Execution Completed — Potential Logic Issues Detected";
        dom.analysisBannerDesc.textContent = "No fatal crash occurred, but suspicious execution patterns or logical anomalies were identified.";
      } else {
        dom.analysisOverviewBanner.className = 'analysis-overview-banner clean';
        dom.analysisBannerTitle.textContent = "Clean Execution — No Crashes Detected";
        dom.analysisBannerDesc.textContent = "The program ran from start to finish without fatal signals or anomalous memory patterns.";
      }
    }

    // Populate Heuristic Findings
    if (findings.length === 0) {
      dom.findingsList.innerHTML = '<div class="empty-state">No suspicious patterns or logic anomalies detected in this execution.</div>';
    } else {
      let html = '';
      for (const item of findings) {
        html += `
          <div class="finding-item">
            <div class="finding-left">
              <div class="finding-header">
                <span class="diff-tag diff-modified">${escapeHtml(item.type)}</span>
                <span class="finding-title">${escapeHtml(item.title)}</span>
              </div>
              <p class="finding-desc">${escapeHtml(item.description)}</p>
              <div class="finding-meta">Variables: ${escapeHtml(item.variables)}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="window.ChronosJump(${item.step})">
              Jump to Step ${item.step + 1} ➔
            </button>
          </div>
        `;
      }
      dom.findingsList.innerHTML = html;
    }
  }

  // Global helper for jump button in findings list
  window.ChronosJump = function (stepIdx) {
    switchTab('tab-debugger');
    goToStep(stepIdx);
  };

  // =========================================================================
  // Backend Connection Healthcheck
  // =========================================================================
  async function checkBackendConnection() {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        state.isBackendOnline = true;
        dom.serverStatus.innerHTML = '<span class="status-dot online"></span><span class="status-label">Online</span>';
        return true;
      }
    } catch {}
    state.isBackendOnline = false;
    dom.serverStatus.innerHTML = '<span class="status-dot offline"></span><span class="status-label">Offline</span>';
    return false;
  }

  async function loadInitialRecording() {
    const isOnline = await checkBackendConnection();
    if (isOnline) {
      try {
        const res = await fetch("/api/recording");
        if (res.ok) {
          const data = await res.json();
          if (data && data.steps && data.steps.length > 0) {
            initRecording(data);
            return;
          }
        }
      } catch {}
    }
    // Fallback to initial fact.cpp sample
    initRecording(EXAMPLES.fact.fallbackRecording);
  }

  // =========================================================================
  // Event Listeners Setup
  // =========================================================================
  function setupEventListeners() {
    // Tab switching
    dom.tabBtnEditor.addEventListener('click', () => switchTab('tab-editor'));
    dom.tabBtnDebugger.addEventListener('click', () => switchTab('tab-debugger'));
    dom.tabBtnAnalysis.addEventListener('click', () => switchTab('tab-analysis'));

    // Editor Gutter & Input
    dom.codeEditorInput.addEventListener('input', updateEditorGutter);
    dom.codeEditorInput.addEventListener('scroll', syncEditorScroll);

    // Tab key handling in textarea (inserts 4 spaces)
    dom.codeEditorInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = dom.codeEditorInput.selectionStart;
        const end = dom.codeEditorInput.selectionEnd;
        dom.codeEditorInput.value = dom.codeEditorInput.value.substring(0, start) + "    " + dom.codeEditorInput.value.substring(end);
        dom.codeEditorInput.selectionStart = dom.codeEditorInput.selectionEnd = start + 4;
        updateEditorGutter();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runCode();
      }
    });

    // Editor Actions
    dom.btnClearCode.addEventListener('click', () => {
      dom.codeEditorInput.value = '';
      updateEditorGutter();
    });

    dom.btnResetCode.addEventListener('click', () => {
      loadExample(dom.exampleSelect.value);
    });

    dom.exampleSelect.addEventListener('change', (e) => {
      loadExample(e.target.value);
    });

    dom.btnRunCode.addEventListener('click', runCode);

    dom.btnClearConsole.addEventListener('click', () => {
      setConsoleMessage("Console log cleared.", 'info');
    });

    // Timeline Controls
    dom.btnFirst.addEventListener('click', goToStart);
    dom.btnPrev.addEventListener('click', stepBackward);
    dom.btnPlay.addEventListener('click', togglePlay);
    dom.btnNext.addEventListener('click', stepForward);
    dom.btnLast.addEventListener('click', goToEnd);

    dom.timelineSlider.addEventListener('input', (e) => {
      pause();
      goToStep(parseInt(e.target.value, 10) - 1);
    });

    dom.btnJump.addEventListener('click', () => {
      const val = parseInt(dom.jumpInput.value, 10);
      if (!Number.isNaN(val)) goToStep(val - 1);
    });

    dom.jumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = parseInt(dom.jumpInput.value, 10);
        if (!Number.isNaN(val)) goToStep(val - 1);
      }
    });

    // Advanced history dropdown
    dom.historyVarSelect.addEventListener('change', (e) => {
      state.selectedHistoryVar = e.target.value;
      updateHistoryChart();
    });

    // Compare Controls
    dom.btnRunCompare.addEventListener('click', runComparison);
    dom.compareStepA.addEventListener('change', runComparison);
    dom.compareStepB.addEventListener('change', runComparison);
    dom.btnSetStepA.addEventListener('click', () => {
      dom.compareStepA.value = String(state.currentStep + 1);
      runComparison();
    });
    dom.btnSetStepB.addEventListener('click', () => {
      dom.compareStepB.value = String(state.currentStep + 1);
      runComparison();
    });

    // Theme toggle
    dom.themeToggle.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    });

    // Global keyboard shortcuts (when not focused on code editor or text inputs)
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'textarea' || tag === 'input' || tag === 'select') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBackward();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToStart();
      } else if (e.key === 'End') {
        e.preventDefault();
        goToEnd();
      }
    });
  }

  // =========================================================================
  // Initialize Application
  // =========================================================================
  setupEventListeners();
  loadExample('fact');
  loadInitialRecording();

})();
