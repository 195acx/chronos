/**
 * CHRONOS — Time-Travel Debugger
 * Frontend Application Logic
 */

(function () {
  'use strict';

  // =========================================================================
  // State Management (All in-memory, no localStorage)
  // =========================================================================
  const state = {
    recording: null,        // Loaded recording data { file, note, source, steps }
    currentStep: 0,         // 0-based index of current step (0 to steps.length - 1)
    isPlaying: false,       // Playback state
    playIntervalId: null,   // setInterval timer id for playback (~500ms)
    selectedHistoryVar: '', // Currently tracked variable in history chart
    inspectedFrameIndex: -1,// If user clicked a specific frame (-1 means top/current)
    theme: 'auto',          // 'auto' | 'dark' | 'light'
    allVariableNames: []    // All unique variable names found across all steps
  };

  // Built-in 19-step factorial sample (matches recording.json)
  const FACT_SAMPLE = {
    file: "fact.cpp",
    note: "",
    source: [
      "#include <iostream>",
      "",
      "int fact(int n) {",
      "    if (n == 0)",
      "        return 0;          // bug: should return 1",
      "    int r = n * fact(n - 1);",
      "    return r;",
      "}",
      "",
      "int main() {",
      "    int result = fact(3);",
      "    std::cout << result << \"\\n\";",
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
  };

  // Expose sample on window for testing purposes if needed
  window.CHRONOS_SAMPLE_RECORDING = FACT_SAMPLE;

  // =========================================================================
  // DOM Element References
  // =========================================================================
  const dom = {
    // Header & Meta
    currentFilename: document.getElementById('current-filename'),
    crashBanner: document.getElementById('crash-note-banner'),
    crashText: document.getElementById('crash-text'),
    themeToggle: document.getElementById('theme-toggle'),
    themeLabel: document.getElementById('theme-label'),

    // Error Screen
    errorScreen: document.getElementById('error-screen'),
    errorMessageText: document.getElementById('error-message-text'),
    btnRetryFetch: document.getElementById('btn-retry-fetch'),
    btnLoadSample: document.getElementById('btn-load-sample'),

    // Timeline Controls
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

    // Call Depth Graph
    peakDepthLabel: document.getElementById('peak-depth-label'),
    depthGraphBox: document.getElementById('depth-graph-box'),
    depthGraphSvg: document.getElementById('depth-graph-svg'),
    depthArea: document.getElementById('depth-area'),
    depthLine: document.getElementById('depth-line'),
    depthCursorLine: document.getElementById('depth-cursor-line'),
    depthCursorDot: document.getElementById('depth-cursor-dot'),
    depthTooltip: document.getElementById('depth-tooltip'),

    // Source Code
    sourceFileTitle: document.getElementById('source-file-title'),
    currentLocationChip: document.getElementById('current-location-chip'),
    sourceViewBody: document.getElementById('source-view-body'),
    sourceLines: document.getElementById('source-lines'),

    // Variables Panel
    varFuncChip: document.getElementById('var-func-chip'),
    variablesTbody: document.getElementById('variables-tbody'),
    variablesEmpty: document.getElementById('variables-empty'),

    // Call Stack Panel
    stackDepthChip: document.getElementById('stack-depth-chip'),
    stackBoxes: document.getElementById('stack-boxes'),

    // Variable History Panel
    historyVarSelect: document.getElementById('history-var-select'),
    btnPrevChange: document.getElementById('btn-prev-change'),
    btnNextChange: document.getElementById('btn-next-change'),
    historySummaryText: document.getElementById('history-summary-text'),
    historyChartWrapper: document.getElementById('history-chart-wrapper'),
    historyChartSvg: document.getElementById('history-chart-svg'),
    historyTooltip: document.getElementById('history-tooltip'),
    historyTextList: document.getElementById('history-text-list'),
    historyTextItems: document.getElementById('history-text-items'),

    // Compare Two Steps Panel
    compareStepA: document.getElementById('compare-step-a'),
    compareStepB: document.getElementById('compare-step-b'),
    btnSetStepA: document.getElementById('btn-set-step-a'),
    btnSetStepB: document.getElementById('btn-set-step-b'),
    btnRunCompare: document.getElementById('btn-run-compare'),
    compareTbody: document.getElementById('compare-tbody'),
    compareEmpty: document.getElementById('compare-empty')
  };

  // =========================================================================
  // Utility Functions
  // =========================================================================

  /**
   * Escape all HTML characters to prevent XSS / render issues with <iostream>, < and >
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Check if a string parses cleanly as a decimal number.
   * "All values in 'locals' are STRINGS. Only treat a value as a number if it parses cleanly."
   */
  function isCleanNumber(str) {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed === '') return false;
    // Decimal integer or float (optional exponent)
    if (/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      return !Number.isNaN(num) && Number.isFinite(num);
    }
    return false;
  }

  /**
   * Extract locals map from a frame object (supports .locals or .vars array)
   */
  function getFrameLocals(frame) {
    if (!frame) return {};
    if (frame.locals && typeof frame.locals === 'object') {
      return frame.locals;
    }
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

  /**
   * Collect all unique variable names seen across the whole execution
   */
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

  /**
   * Resolve the value of variable `varName` at step index `stepIdx`.
   * Searches the stack from top (innermost) to bottom (main).
   * Returns undefined if variable was not in scope / defined at that step.
   */
  function getVariableValueAtStep(stepIdx, varName) {
    if (!state.recording || !state.recording.steps) return undefined;
    const step = state.recording.steps[stepIdx];
    if (!step || !Array.isArray(step.stack)) return undefined;

    // Search stack top-down
    for (let f = step.stack.length - 1; f >= 0; f--) {
      const locals = getFrameLocals(step.stack[f]);
      if (Object.prototype.hasOwnProperty.call(locals, varName)) {
        return locals[varName];
      }
    }
    return undefined;
  }

  // =========================================================================
  // Data Loading & Initialization
  // =========================================================================

  /**
   * Show global error screen with message
   */
  function showError(msg) {
    dom.errorMessageText.textContent = msg;
    dom.errorScreen.classList.remove('hidden');
  }

  /**
   * Hide global error screen
   */
  function hideError() {
    dom.errorScreen.classList.add('hidden');
  }

  /**
   * Load recording data from /api/recording or fallback
   */
  async function loadRecording() {
    try {
      hideError();
      const rec = await (await fetch("/api/recording")).json();
      if (!rec || !Array.isArray(rec.steps) || rec.steps.length === 0) {
        throw new Error("Recording data is empty or missing steps array.");
      }
      initRecording(rec);
    } catch (err) {
      showError(`Failed to load recording: ${err.message}`);
    }
  }

  /**
   * Initialize and prepare UI for a loaded recording
   */
  function initRecording(rec) {
    state.recording = rec;
    state.currentStep = 0;
    state.inspectedFrameIndex = -1;
    pause();

    const totalSteps = rec.steps.length;

    // Header metadata
    dom.currentFilename.textContent = rec.file || 'unknown.cpp';
    dom.sourceFileTitle.textContent = rec.file || 'Source Code';

    // Note / Crash warning banner
    if (rec.note && String(rec.note).trim().length > 0) {
      dom.crashText.textContent = String(rec.note).trim();
      dom.crashBanner.classList.remove('hidden');
    } else {
      dom.crashBanner.classList.add('hidden');
    }

    // Slider & Jump input bounds
    dom.timelineSlider.min = '1';
    dom.timelineSlider.max = String(totalSteps);
    dom.timelineSlider.value = '1';

    dom.jumpInput.min = '1';
    dom.jumpInput.max = String(totalSteps);
    dom.jumpInput.value = '1';

    dom.compareStepA.min = '1';
    dom.compareStepA.max = String(totalSteps);
    dom.compareStepA.value = '1';

    dom.compareStepB.min = '1';
    dom.compareStepB.max = String(totalSteps);
    dom.compareStepB.value = String(Math.min(2, totalSteps));

    dom.totalStepCounter.textContent = String(totalSteps);

    // Collect all variable names across run
    state.allVariableNames = collectAllVariableNames(rec.steps);
    populateHistoryVariableSelect();

    // Render source code once
    renderSourceCode(rec.source || []);

    // Render Call Depth Graph
    renderCallDepthGraph();

    // Update to step 0
    goToStep(0);

    // Initial compare
    runComparison();

    hideError();
  }

  // =========================================================================
  // Playback & Step Navigation
  // =========================================================================

  function goToStep(stepIndex) {
    if (!state.recording || !state.recording.steps) return;
    const totalSteps = state.recording.steps.length;
    if (totalSteps === 0) return;

    // Clamp index
    const clamped = Math.max(0, Math.min(stepIndex, totalSteps - 1));
    state.currentStep = clamped;
    state.inspectedFrameIndex = -1; // Reset frame inspection override

    // Update UI components
    updateTimelineControls();
    updateCallDepthCursor();
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
      pause(); // Stop when reaching the end
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
      // If at end, wrap around to start
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
    }, 500); // ~500 ms per step
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
    const totalSteps = state.recording.steps.length;
    const humanStep = state.currentStep + 1;

    dom.curStepCounter.textContent = String(humanStep);
    dom.timelineSlider.value = String(humanStep);
    dom.jumpInput.value = String(humanStep);

    // Disable/enable boundaries
    dom.btnFirst.disabled = (state.currentStep === 0);
    dom.btnPrev.disabled = (state.currentStep === 0);
    dom.btnNext.disabled = (state.currentStep === totalSteps - 1);
    dom.btnLast.disabled = (state.currentStep === totalSteps - 1);
  }

  // =========================================================================
  // Call-Depth Graph (Recursion Mountain)
  // =========================================================================

  function renderCallDepthGraph() {
    const steps = state.recording.steps;
    const n = steps.length;
    if (n === 0) return;

    let maxDepth = 1;
    for (const s of steps) {
      const d = (s && s.stack) ? s.stack.length : 1;
      if (d > maxDepth) maxDepth = d;
    }

    dom.peakDepthLabel.textContent = `Peak Depth: ${maxDepth}`;

    // SVG coordinate space
    const w = 1000;
    const h = 52;
    const padTop = 6;
    const padBot = 4;
    const chartHeight = h - padTop - padBot;

    // Build step points
    // When d is 1, y = bottom of chart; when d is maxDepth, y = top
    function getY(depth) {
      if (maxDepth === 1) return h - padBot;
      const norm = (depth - 1) / (maxDepth - 1);
      return h - padBot - (norm * chartHeight);
    }

    function getX(idx) {
      if (n <= 1) return w / 2;
      return (idx / (n - 1)) * w;
    }

    // Polyline points
    const points = [];
    for (let i = 0; i < n; i++) {
      const d = (steps[i] && steps[i].stack) ? steps[i].stack.length : 1;
      points.push({ x: getX(i), y: getY(d), depth: d });
    }

    // Stepped line looks great for stack depths:
    let lineD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < n; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      // Stepped connection: horizontal to cur.x, then vertical to cur.y
      lineD += ` H ${cur.x} V ${cur.y}`;
    }

    const areaD = lineD + ` V ${h} H ${points[0].x} Z`;

    dom.depthGraphSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    dom.depthArea.setAttribute('d', areaD);
    dom.depthLine.setAttribute('d', lineD);

    updateCallDepthCursor();
  }

  function updateCallDepthCursor() {
    const steps = state.recording.steps;
    const n = steps.length;
    if (n === 0) return;

    const w = 1000;
    const h = 52;
    const padTop = 6;
    const padBot = 4;
    const chartHeight = h - padTop - padBot;

    let maxDepth = 1;
    for (const s of steps) {
      const d = (s && s.stack) ? s.stack.length : 1;
      if (d > maxDepth) maxDepth = d;
    }

    const cur = steps[state.currentStep];
    const d = (cur && cur.stack) ? cur.stack.length : 1;

    const x = (n <= 1) ? (w / 2) : ((state.currentStep / (n - 1)) * w);
    const y = (maxDepth === 1) ? (h - padBot) : (h - padBot - ((d - 1) / (maxDepth - 1)) * chartHeight);

    dom.depthCursorLine.setAttribute('x1', String(x));
    dom.depthCursorLine.setAttribute('x2', String(x));
    dom.depthCursorDot.setAttribute('cx', String(x));
    dom.depthCursorDot.setAttribute('cy', String(y));
  }

  // =========================================================================
  // Source Code View
  // =========================================================================

  function renderSourceCode(sourceLines) {
    let html = '';
    for (let i = 0; i < sourceLines.length; i++) {
      const lineNum = i + 1;
      const rawText = sourceLines[i];
      const escaped = escapeHtml(rawText);

      html += `
        <div class="code-line" id="code-line-${lineNum}" data-line="${lineNum}">
          <span class="line-num">${lineNum}</span>
          <span class="line-content">${escaped}</span>
        </div>
      `;
    }
    dom.sourceLines.innerHTML = html;
  }

  function updateSourceHighlight() {
    const step = state.recording.steps[state.currentStep];
    if (!step || !Array.isArray(step.stack) || step.stack.length === 0) return;

    // Frame to highlight: if user clicked a specific frame in stack panel, use it; else use top frame
    const frameIdx = (state.inspectedFrameIndex >= 0 && state.inspectedFrameIndex < step.stack.length)
      ? state.inspectedFrameIndex
      : step.stack.length - 1;

    const activeFrame = step.stack[frameIdx];
    const activeLineNum = activeFrame ? activeFrame.line : 0;
    const rawFuncName = activeFrame ? activeFrame.func : 'unknown';
    const cleanFuncName = rawFuncName ? rawFuncName.replace(/\(\)$/, '') : 'unknown';

    // Remove old highlights and badges
    const oldLines = dom.sourceLines.querySelectorAll('.code-line.active-line');
    oldLines.forEach(l => {
      l.classList.remove('active-line');
      const badge = l.querySelector('.active-line-badge');
      if (badge) badge.remove();
    });

    if (activeLineNum > 0) {
      const targetEl = document.getElementById(`code-line-${activeLineNum}`);
      if (targetEl) {
        targetEl.classList.add('active-line');

        // Add badge near line: e.g. "fact() at line 4"
        const contentSpan = targetEl.querySelector('.line-content');
        if (contentSpan) {
          const badgeEl = document.createElement('span');
          badgeEl.className = 'active-line-badge';
          badgeEl.textContent = `${cleanFuncName}() at line ${activeLineNum}`;
          contentSpan.appendChild(badgeEl);
        }

        // Auto-scroll into view smoothly
        targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      dom.currentLocationChip.textContent = `${cleanFuncName}() at line ${activeLineNum}`;
    } else {
      dom.currentLocationChip.textContent = `${cleanFuncName}()`;
    }
  }

  // =========================================================================
  // Variables Panel
  // =========================================================================

  function updateVariablesPanel() {
    const step = state.recording.steps[state.currentStep];
    if (!step || !Array.isArray(step.stack) || step.stack.length === 0) {
      dom.variablesTbody.innerHTML = '';
      dom.variablesEmpty.classList.remove('hidden');
      dom.varFuncChip.textContent = '—';
      return;
    }

    // Current top frame (or user-inspected frame)
    const frameIdx = (state.inspectedFrameIndex >= 0 && state.inspectedFrameIndex < step.stack.length)
      ? state.inspectedFrameIndex
      : step.stack.length - 1;

    const curFrame = step.stack[frameIdx];
    const funcName = curFrame.func || 'frame';
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
        // Try to find matching frame in prevStep (innermost frame with same function)
        let foundFrame = null;
        for (let i = prevStep.stack.length - 1; i >= 0; i--) {
          if (prevStep.stack[i].func === curFrame.func) {
            foundFrame = prevStep.stack[i];
            break;
          }
        }
        // Fallback to top frame if not found
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
      dom.stackBoxes.innerHTML = '<div class="empty-state">Stack is empty</div>';
      dom.stackDepthChip.textContent = 'depth 0';
      return;
    }

    const depth = step.stack.length;
    dom.stackDepthChip.textContent = `depth ${depth}`;

    let html = '';
    // Display top of stack (innermost running function) at top of list
    for (let i = depth - 1; i >= 0; i--) {
      const frame = step.stack[i];
      const isTop = (i === depth - 1);
      const isSelected = (state.inspectedFrameIndex === i);
      const funcName = escapeHtml(frame.func || 'anonymous');
      const lineNum = frame.line || '?';

      // Arguments / locals summary string
      const locals = getFrameLocals(frame);
      const pairs = [];
      for (const [k, v] of Object.entries(locals)) {
        pairs.push(`${escapeHtml(k)} = ${escapeHtml(v)}`);
      }
      const localsSummary = pairs.length > 0 ? pairs.join(', ') : 'no locals';

      html += `
        <div class="stack-frame-box ${isTop ? 'is-top' : ''} ${isSelected ? 'is-selected' : ''}" data-frame-index="${i}">
          <div class="frame-header">
            <span class="frame-func-name">${funcName}()</span>
            <span class="chip ${isTop ? 'chip-accent' : 'chip-subtle'}">${isTop ? 'CURRENT' : '#' + i}</span>
          </div>
          <div class="frame-line">line ${lineNum}</div>
          <div class="frame-vars" title="${localsSummary}">${localsSummary}</div>
        </div>
      `;
    }

    dom.stackBoxes.innerHTML = html;

    // Attach click listeners to inspect frame
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
  // Variable History Chart & Navigation
  // =========================================================================

  function populateHistoryVariableSelect() {
    const names = state.allVariableNames;
    if (names.length === 0) {
      dom.historyVarSelect.innerHTML = '<option value="">No variables found</option>';
      state.selectedHistoryVar = '';
      return;
    }

    let html = '';
    for (const name of names) {
      html += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }
    dom.historyVarSelect.innerHTML = html;

    // Default to first variable or keep existing if present
    if (!names.includes(state.selectedHistoryVar)) {
      state.selectedHistoryVar = names[0];
    }
    dom.historyVarSelect.value = state.selectedHistoryVar;
  }

  function updateHistoryChart() {
    const varName = state.selectedHistoryVar;
    if (!varName || !state.recording || !state.recording.steps) {
      dom.historySummaryText.textContent = '—';
      dom.btnPrevChange.disabled = true;
      dom.btnNextChange.disabled = true;
      return;
    }

    const steps = state.recording.steps;
    const n = steps.length;

    // Gather history points
    const history = []; // array of { step: i, val: string, isNumeric: bool, numVal: number }
    let hasNonNumeric = false;
    let definedCount = 0;

    for (let i = 0; i < n; i++) {
      const v = getVariableValueAtStep(i, varName);
      if (v !== undefined) {
        definedCount++;
        const numeric = isCleanNumber(v);
        if (!numeric) hasNonNumeric = true;
        history.push({
          step: i,
          val: v,
          isNumeric: numeric,
          numVal: numeric ? Number(v) : NaN
        });
      } else {
        history.push({
          step: i,
          val: undefined,
          isNumeric: false,
          numVal: NaN
        });
      }
    }

    // Determine change steps (where value changed from previous step)
    const changeSteps = [];
    for (let i = 0; i < n; i++) {
      const nowVal = history[i].val;
      const prevVal = (i > 0) ? history[i - 1].val : undefined;
      // Step i is a change if variable is defined and differs from before
      if (nowVal !== undefined && nowVal !== prevVal) {
        changeSteps.push(i);
      }
    }

    // Update Previous / Next Change buttons
    // Closest change step < state.currentStep
    let prevChangeStep = -1;
    for (let i = changeSteps.length - 1; i >= 0; i--) {
      if (changeSteps[i] < state.currentStep) {
        prevChangeStep = changeSteps[i];
        break;
      }
    }

    // Closest change step > state.currentStep
    let nextChangeStep = -1;
    for (let i = 0; i < changeSteps.length; i++) {
      if (changeSteps[i] > state.currentStep) {
        nextChangeStep = changeSteps[i];
        break;
      }
    }

    dom.btnPrevChange.disabled = (prevChangeStep === -1);
    dom.btnNextChange.disabled = (nextChangeStep === -1);

    dom.btnPrevChange.onclick = () => {
      if (prevChangeStep !== -1) goToStep(prevChangeStep);
    };
    dom.btnNextChange.onclick = () => {
      if (nextChangeStep !== -1) goToStep(nextChangeStep);
    };

    const curVal = history[state.currentStep] ? history[state.currentStep].val : undefined;
    dom.historySummaryText.textContent = (curVal !== undefined)
      ? `Step ${state.currentStep + 1}: ${varName} = ${curVal} (${changeSteps.length} changes)`
      : `Step ${state.currentStep + 1}: ${varName} out of scope`;

    // Render line chart if numeric, or text list if non-numeric
    if (definedCount > 0 && !hasNonNumeric) {
      // Numeric Chart
      dom.historyChartWrapper.classList.remove('hidden');
      dom.historyTextList.classList.add('hidden');
      renderNumericHistoryChart(history, changeSteps);
    } else {
      // Non-numeric text list
      dom.historyChartWrapper.classList.add('hidden');
      dom.historyTextList.classList.remove('hidden');
      renderTextHistoryList(history);
    }
  }

  function renderNumericHistoryChart(history, changeSteps) {
    const svg = dom.historyChartSvg;
    const w = 540;
    const h = 150;
    const padL = 40;
    const padR = 20;
    const padT = 16;
    const padB = 26;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const numericPoints = history.filter(p => !Number.isNaN(p.numVal));
    if (numericPoints.length === 0) {
      svg.innerHTML = '<text x="270" y="80" text-anchor="middle" fill="var(--text-muted)">No numeric values</text>';
      return;
    }

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const p of numericPoints) {
      if (p.numVal < minVal) minVal = p.numVal;
      if (p.numVal > maxVal) maxVal = p.numVal;
    }

    // Add margin to Y axis if minVal === maxVal
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }

    const n = history.length;
    function getX(stepIdx) {
      if (n <= 1) return padL + plotW / 2;
      return padL + (stepIdx / (n - 1)) * plotW;
    }

    function getY(val) {
      const norm = (val - minVal) / (maxVal - minVal);
      return h - padB - (norm * plotH);
    }

    // Grid lines and labels (Min, Mid, Max)
    const midVal = (minVal + maxVal) / 2;
    const yMin = getY(minVal);
    const yMid = getY(midVal);
    const yMax = getY(maxVal);

    let svgHtml = `
      <!-- Grid lines -->
      <line class="chart-grid-line" x1="${padL}" y1="${yMin}" x2="${w - padR}" y2="${yMin}" />
      <line class="chart-grid-line" x1="${padL}" y1="${yMid}" x2="${w - padR}" y2="${yMid}" />
      <line class="chart-grid-line" x1="${padL}" y1="${yMax}" x2="${w - padR}" y2="${yMax}" />

      <!-- Y Axis labels -->
      <text class="chart-axis-label" x="${padL - 6}" y="${yMin + 3}" text-anchor="end">${Number(minVal.toFixed(1))}</text>
      <text class="chart-axis-label" x="${padL - 6}" y="${yMid + 3}" text-anchor="end">${Number(midVal.toFixed(1))}</text>
      <text class="chart-axis-label" x="${padL - 6}" y="${yMax + 3}" text-anchor="end">${Number(maxVal.toFixed(1))}</text>

      <!-- X Axis labels (Step 1 and Step N) -->
      <text class="chart-axis-label" x="${padL}" y="${h - 8}" text-anchor="start">step 1</text>
      <text class="chart-axis-label" x="${w - padR}" y="${h - 8}" text-anchor="end">step ${n}</text>
    `;

    // Path connecting numeric points
    let pathD = '';
    let inSegment = false;
    for (let i = 0; i < n; i++) {
      const p = history[i];
      if (!Number.isNaN(p.numVal)) {
        const x = getX(i);
        const y = getY(p.numVal);
        if (!inSegment) {
          pathD += `M ${x} ${y} `;
          inSegment = true;
        } else {
          pathD += `L ${x} ${y} `;
        }
      } else {
        inSegment = false; // Discontinuous if variable was undefined
      }
    }

    svgHtml += `<path class="chart-line" d="${pathD}" />`;

    // Current step vertical guide line
    const curX = getX(state.currentStep);
    svgHtml += `<line class="chart-current-vguide" x1="${curX}" y1="${padT}" x2="${curX}" y2="${h - padB}" />`;

    // Points on the chart
    for (let i = 0; i < n; i++) {
      const p = history[i];
      if (!Number.isNaN(p.numVal)) {
        const x = getX(i);
        const y = getY(p.numVal);
        const isCur = (i === state.currentStep);
        svgHtml += `
          <circle class="chart-dot ${isCur ? 'is-current' : ''}" 
                  data-step="${i}" 
                  data-val="${escapeHtml(p.val)}" 
                  cx="${x}" cy="${y}" r="${isCur ? 5.5 : 3.5}" />
        `;
      }
    }

    svg.innerHTML = svgHtml;

    // Attach click listeners to dots to jump to that step
    const dots = svg.querySelectorAll('.chart-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const step = parseInt(dot.getAttribute('data-step'), 10);
        goToStep(step);
      });
      dot.addEventListener('mouseenter', (e) => {
        const step = parseInt(dot.getAttribute('data-step'), 10);
        const val = dot.getAttribute('data-val');
        showHistoryTooltip(e, `Step ${step + 1}: ${state.selectedHistoryVar} = ${val}`);
      });
      dot.addEventListener('mouseleave', hideHistoryTooltip);
    });

    // Also clicking anywhere on the history chart X axis jumps to closest step
    svg.onclick = (e) => {
      const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, (clickX - (padL / w) * rect.width) / ((plotW / w) * rect.width)));
      const targetStep = Math.round(ratio * (n - 1));
      goToStep(targetStep);
    };
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

    // Click to jump
    const rows = dom.historyTextItems.querySelectorAll('.history-text-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const step = parseInt(row.getAttribute('data-step'), 10);
        goToStep(step);
      });
    });

    // Scroll active item into view
    const activeRow = dom.historyTextItems.querySelector('.history-text-row.is-current');
    if (activeRow) {
      activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function showHistoryTooltip(e, text) {
    const wrapper = dom.historyChartWrapper.getBoundingClientRect();
    const x = e.clientX - wrapper.left;
    const y = e.clientY - wrapper.top - 24;
    dom.historyTooltip.textContent = text;
    dom.historyTooltip.style.left = `${x}px`;
    dom.historyTooltip.style.top = `${y}px`;
    dom.historyTooltip.classList.remove('hidden');
  }

  function hideHistoryTooltip() {
    dom.historyTooltip.classList.add('hidden');
  }

  // =========================================================================
  // Compare Two Steps
  // =========================================================================

  /**
   * Collect all in-scope variables across stack frames for a step,
   * with inner/top frames overriding outer frames for shadowed variables.
   */
  function getStepVariables(step) {
    if (!step || !Array.isArray(step.stack)) return {};
    const map = {};
    for (let i = 0; i < step.stack.length; i++) {
      const locals = getFrameLocals(step.stack[i]);
      for (const [k, v] of Object.entries(locals)) {
        map[k] = v;
      }
    }
    return map;
  }

  function runComparison() {
    if (!state.recording || !state.recording.steps) return;
    const steps = state.recording.steps;
    const total = steps.length;
    if (total === 0) return;

    let stepAIdx = parseInt(dom.compareStepA.value, 10) - 1;
    let stepBIdx = parseInt(dom.compareStepB.value, 10) - 1;

    // Bounds checking
    stepAIdx = Math.max(0, Math.min(stepAIdx, total - 1));
    stepBIdx = Math.max(0, Math.min(stepBIdx, total - 1));

    dom.compareStepA.value = String(stepAIdx + 1);
    dom.compareStepB.value = String(stepBIdx + 1);

    const stepA = steps[stepAIdx];
    const stepB = steps[stepBIdx];

    // Gather variables for both steps
    const localsA = getStepVariables(stepA);
    const localsB = getStepVariables(stepB);

    const allNames = new Set([...Object.keys(localsA), ...Object.keys(localsB)]);

    const diffs = [];
    for (const name of Array.from(allNames).sort()) {
      const valA = localsA[name];
      const valB = localsB[name];

      if (valA !== valB) {
        let diffType = 'Modified';
        let diffClass = 'diff-modified';

        if (valA === undefined) {
          diffType = 'Added in B';
          diffClass = 'diff-added';
        } else if (valB === undefined) {
          diffType = 'Removed in B';
          diffClass = 'diff-removed';
        }

        diffs.push({
          name,
          valA: valA !== undefined ? valA : '—',
          valB: valB !== undefined ? valB : '—',
          type: diffType,
          cssClass: diffClass
        });
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
            <td><span class="diff-tag ${d.cssClass}">${escapeHtml(d.type)}</span></td>
          </tr>
        `;
      }
      dom.compareTbody.innerHTML = html;
    }
  }

  // =========================================================================
  // Theme Management
  // =========================================================================

  function toggleTheme() {
    if (state.theme === 'auto') {
      state.theme = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');
      dom.themeLabel.textContent = 'Dark';
    } else if (state.theme === 'dark') {
      state.theme = 'light';
      document.documentElement.setAttribute('data-theme', 'light');
      dom.themeLabel.textContent = 'Light';
    } else {
      state.theme = 'auto';
      document.documentElement.removeAttribute('data-theme');
      dom.themeLabel.textContent = 'Auto';
    }
    // Re-render graphs to match theme colors
    renderCallDepthGraph();
    updateHistoryChart();
  }

  // =========================================================================
  // Event Listeners Setup
  // =========================================================================

  function setupEventListeners() {
    // Playback Controls
    dom.btnFirst.addEventListener('click', goToStart);
    dom.btnPrev.addEventListener('click', stepBackward);
    dom.btnPlay.addEventListener('click', togglePlay);
    dom.btnNext.addEventListener('click', stepForward);
    dom.btnLast.addEventListener('click', goToEnd);

    // Slider scrubbing
    dom.timelineSlider.addEventListener('input', (e) => {
      pause();
      const step = parseInt(e.target.value, 10) - 1;
      goToStep(step);
    });

    // Jump Input & Button
    dom.btnJump.addEventListener('click', () => {
      const val = parseInt(dom.jumpInput.value, 10);
      if (!Number.isNaN(val)) {
        goToStep(val - 1);
      }
    });

    dom.jumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = parseInt(dom.jumpInput.value, 10);
        if (!Number.isNaN(val)) {
          goToStep(val - 1);
        }
      }
    });

    // Call Depth Graph Interaction (Clicking anywhere jumps to step)
    dom.depthGraphBox.addEventListener('click', (e) => {
      if (!state.recording || !state.recording.steps) return;
      const totalSteps = state.recording.steps.length;
      if (totalSteps <= 1) return;

      const rect = dom.depthGraphBox.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetStep = Math.round(ratio * (totalSteps - 1));
      goToStep(targetStep);
    });

    dom.depthGraphBox.addEventListener('mousemove', (e) => {
      if (!state.recording || !state.recording.steps) return;
      const totalSteps = state.recording.steps.length;
      if (totalSteps === 0) return;

      const rect = dom.depthGraphBox.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const hoverStep = Math.round(ratio * (totalSteps - 1));
      const step = state.recording.steps[hoverStep];

      const depth = (step && step.stack) ? step.stack.length : 1;
      const topFrame = (step && step.stack && step.stack.length > 0) ? step.stack[step.stack.length - 1] : null;
      const func = topFrame ? topFrame.func : 'unknown';
      const line = topFrame ? topFrame.line : '?';

      dom.depthTooltip.textContent = `Step ${hoverStep + 1}: ${func}() line ${line} (depth ${depth})`;
      dom.depthTooltip.style.left = `${clickX}px`;
      dom.depthTooltip.classList.remove('hidden');
    });

    dom.depthGraphBox.addEventListener('mouseleave', () => {
      dom.depthTooltip.classList.add('hidden');
    });

    // History Variable Selector
    dom.historyVarSelect.addEventListener('change', (e) => {
      state.selectedHistoryVar = e.target.value;
      updateHistoryChart();
    });

    // Compare Two Steps Controls
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

    // Theme Toggle
    dom.themeToggle.addEventListener('click', toggleTheme);

    // Error Screen Actions
    dom.btnRetryFetch.addEventListener('click', loadRecording);
    dom.btnLoadSample.addEventListener('click', () => {
      initRecording(FACT_SAMPLE);
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if user is currently typing inside an input or select
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea') {
        return;
      }

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

    // Window resize handler (updates responsive graphs)
    window.addEventListener('resize', () => {
      if (state.recording) {
        renderCallDepthGraph();
        updateHistoryChart();
      }
    });
  }

  // =========================================================================
  // Bootstrap Application
  // =========================================================================
  setupEventListeners();

  // Check URL parameters for explicit demo request (?demo=1 or ?sample=1)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo') === '1' || urlParams.get('sample') === '1') {
    initRecording(FACT_SAMPLE);
  } else {
    // Default: fetch from /api/recording as specified
    loadRecording();
  }

})();
