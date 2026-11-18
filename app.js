'use strict';
// Results: LLM-judge accuracy (Muse Ember) and source routing F1 per backbone, as a chart or a heatmap.
let dataset, selectedModel = null, view = 'chart';
const metric = document.querySelector('#metric');
const slice = document.querySelector('#slice');
const SLICES = [5, 0, 1, 2, 3, 4];
const SLICE_SHORT = {5: 'Overall', 0: 'L1', 1: 'L2 · single', 2: 'L2 · multi', 3: 'L3 · single', 4: 'L3 · multi'};
const LOGOS = [[/^GPT/, 'openai'], [/^Gemma/, 'gemma-color'], [/^Gemini/, 'gemini-color'], [/^DeepSeek/, 'deepseek-color'], [/^Kimi/, 'kimi-color'], [/^Qwen/, 'qwen-color'], [/^Claude/, 'claude-color'], [/^MiMo/, 'xiaomimimo'], [/^GLM/, 'zai']];
const pct = v => (v * 100).toFixed(1);
const f1 = v => v.toFixed(3);
const NARROW = window.matchMedia('(max-width: 760px)');

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function nameCell(row, chosenName, best) {
  const b = el('button', 'm-name'); b.type = 'button';
  b.setAttribute('aria-pressed', String(row.name === chosenName));
  const hit = LOGOS.find(([re]) => re.test(row.name));
  if (hit) { const img = el('img'); img.src = `assets/logos/${hit[1]}.svg`; img.alt = ''; img.width = 20; img.height = 20; b.append(img); }
  b.append(row.name);
  if (best) b.append(crownEl());
  b.addEventListener('click', () => { selectedModel = row.name; render(); });
  return b;
}
const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#f5b800" stroke="#c98a00" stroke-width="1.2" stroke-linejoin="round"/><circle cx="3" cy="8" r="1.6" fill="#f5b800"/><circle cx="12" cy="5" r="1.6" fill="#f5b800"/><circle cx="21" cy="8" r="1.6" fill="#f5b800"/></svg>';
function crownEl() { const c = el('span', 'crown'); c.innerHTML = CROWN; c.title = 'Best'; return c; }
// chart heading: metric label on top, the question that metric answers below
const QUESTION = {judge: 'Do they reach the right answer?', f1: 'Do they find the right sources?', calls: 'How many calls does it take?'};
function setHeading(h, label, q) { h.replaceChildren(el('span', 'ch-sub', label), el('span', 'ch-q', q)); }
function niceMax(v, step) { return Math.max(step, Math.ceil(v / step) * step); }

function render() {
  if (typeof renderCost === 'function' && dataset) setTimeout(renderCost, 0);
  if (!dataset) return;
  // the table shows LLM-judge or routing F1 per slice; API calls always has its own column
  ['calls', 'all'].forEach(v => { const o = metric.querySelector(`option[value="${v}"]`); o.disabled = o.hidden = view === 'table'; });
  if (view === 'table' && (metric.value === 'calls' || metric.value === 'all')) metric.value = 'judge';
  const all = metric.value === 'all', calls = metric.value === 'calls', isF1 = metric.value === 'f1';
  const table = view === 'table';
  slice.disabled = calls || table;
  document.querySelector('.result-panel').classList.toggle('view-table', table);
  const index = Number(slice.value);
  const rows = dataset.models.map(r => ({...r, v: (isF1 ? r.f1 : r.judge)[index]}))
    .sort((x, y) => calls ? x.calls - y.calls : y.v - x.v);
  const chosen = rows.find(r => r.name === selectedModel) || rows[0];
  const chosenName = chosen.name;

  // insight card
  document.querySelector('#insight-label').textContent = selectedModel ? 'SELECTED BACKBONE' : calls ? 'FEWEST API CALLS' : 'LEADING BACKBONE';
  const score = document.querySelector('#insight-score');
  score.textContent = calls ? chosen.calls.toFixed(2) : isF1 ? f1(chosen.v) : pct(chosen.v);
  score.append(el('span', '', calls ? ' calls' : isF1 ? '' : '%'));
  const iname = document.querySelector('#insight-name'); iname.replaceChildren();
  const ihit = LOGOS.find(([re]) => re.test(chosen.name));
  if (ihit) { const chip = el('span', 'insight-logo'); const img = el('img'); img.src = `assets/logos/${ihit[1]}.svg`; img.alt = ''; chip.append(img); iname.append(chip); }
  iname.append(chosen.name);
  const rank = rows.filter(r => calls ? r.calls < chosen.calls : r.v > chosen.v).length + 1;
  document.querySelector('#insight-description').textContent = all
    ? `Answer accuracy · ${slice.options[slice.selectedIndex].text}. Rank ${rank} of ${rows.length}. Source routing F1 ${f1(chosen.f1[index])} · efficiency ${chosen.calls.toFixed(2)} API calls per query.`
    : calls
    ? 'Mean LLM API calls per query. Lower call counts indicate fewer API requests, not necessarily lower monetary cost.'
    : `${isF1 ? 'Source routing F1' : 'Answer accuracy'} · ${slice.options[slice.selectedIndex].text}. Rank ${rank} of ${rows.length} by ${isF1 ? 'source routing F1' : 'answer accuracy'}.`;

  const chart = document.querySelector('#chart');
  chart.replaceChildren();
  chart.className = table ? 'is-table' : all ? 'is-all' : calls ? 'is-calls' : 'is-metric';
  document.querySelector('#ticks').replaceChildren();
  const legend = document.querySelector('#legend');
  const heading = document.querySelector('#chart-title');
  const direction = document.querySelector('#direction');
  direction.className = '';

  if (table) {
    const mName = isF1 ? 'Source routing F1' : 'Answer accuracy (LLM-judge, %)';
    setHeading(heading, `${mName} · All slices`, QUESTION[metric.value]);
    direction.className = 'chart-legend hm-legend';
    direction.innerHTML = `<span class="lg-heat"><i></i>${isF1 ? 'Source routing F1' : 'Answer accuracy'}: darker = higher</span><span class="lg-calls"><i></i>Efficiency (API calls): darker = more calls</span>`;
    legend.replaceChildren();
    const wrap = el('div', 'hm-wrap'); const t = el('table', 'hm');
    const head = el('tr'); const corner = el('th', 'hm-corner'); corner.textContent = ''; head.append(corner);
    SLICES.forEach(i => head.append(el('th', '', SLICE_SHORT[i])));
    head.append(el('th', 'hm-calls', 'Efficiency (calls)'));
    t.append(head);
    const key = isF1 ? 'f1' : 'judge';
    const all = dataset.models.slice().sort((x, y) => y[key][5] - x[key][5]);
    const cmin = Math.min(...all.map(r => r.calls)), cmax = Math.max(...all.map(r => r.calls));
    all.forEach(r => {
      const tr = el('tr', r.name === chosenName ? 'is-selected' : '');
      const th = el('td', 'hm-name'); th.append(nameCell(r, chosenName, r === all[0])); tr.append(th);
      SLICES.forEach(i => {
        const v = r[key][i], td = el('td', v > 0.5 ? 'dark' : '');
        td.style.background = `rgba(184,76,46,${(0.07 + 0.83 * Math.min(1, v / 0.78)).toFixed(3)})`;
        td.append(el('b', '', isF1 ? f1(v) : pct(v)));
        td.title = `${r.name} · ${SLICE_SHORT[i]}: ${isF1 ? 'source routing F1 ' + f1(v) : 'answer accuracy ' + pct(v) + '%'}`;
        tr.append(td);
      });
      const ct = el('td', 'hm-calls', r.calls.toFixed(2)); const cv = (r.calls - cmin) / (cmax - cmin);
      ct.style.background = `rgba(77,104,138,${(0.10 + 0.70 * cv).toFixed(3)})`; if (cv > 0.6) ct.classList.add('dark');
      ct.title = `${r.name}: ${r.calls.toFixed(2)} LLM calls per query`; tr.append(ct);
      t.append(tr);
    });
    wrap.append(t); chart.append(wrap);
  } else if (all) {
    // dumbbell: LLM-judge and routing F1 share one 0-1 axis (accuracy 51.1% = 0.511); API calls get their own column and scale
    setHeading(heading, `All metrics · ${slice.options[slice.selectedIndex].text}`, 'Answer accuracy, source routing, and efficiency at a glance');
    direction.textContent = 'EFFICIENCY: OVERALL ONLY';
    legend.innerHTML = '<span class="lg-dot lg-judge"><i></i>Answer accuracy</span><span class="lg-dot lg-f1"><i></i>Source routing F1</span>';
    const J = r => r.judge[index], F = r => r.f1[index];
    // dot plot, so the axis need not start at zero: fit it to the data in 0.1 steps
    const sv = rows.flatMap(r => [J(r), F(r)]);
    const lo = Math.max(0, Math.floor((Math.min(...sv) - 0.02) * 10) / 10), hi = Math.min(1, Math.ceil((Math.max(...sv) + 0.02) * 10) / 10);
    const nT = Math.round((hi - lo) * 10);
    const cmax = niceMax(Math.max(...rows.map(r => r.calls)), 4);
    const bestJ = Math.max(...rows.map(J)), bestF = Math.max(...rows.map(F)), bestC = Math.min(...rows.map(r => r.calls));
    const head = el('div', 'db-row db-head');
    const hp = el('span', 'db-hplot'); hp.innerHTML = '<span class="lg-dot lg-judge"><i></i>Answer accuracy</span><span class="lg-dot lg-f1"><i></i>Source routing F1</span><em>higher is better</em>';
    head.append(el('span'), hp, el('span', 'db-num', 'Accuracy'), el('span', 'db-num', 'Routing F1'), el('span', '', 'Efficiency · calls ↓'));
    chart.append(head);
    const at = v => `${(v - lo) / (hi - lo) * 100}%`;
    rows.forEach(r => {
      const j = J(r), f = F(r);
      const row = el('div', 'db-row' + (r.name === chosenName ? ' selected' : ''));
      const plot = el('div', 'db-plot');
      plot.title = `${r.name} · answer accuracy ${pct(j)}% · source routing F1 ${f1(f)}`;
      const line = el('i', 'db-line'); line.style.left = at(Math.min(j, f)); line.style.width = `${Math.abs(j - f) / (hi - lo) * 100}%`;
      const dj = el('i', 'db-dot db-j'); dj.style.left = at(j);
      const df = el('i', 'db-dot db-f'); df.style.left = at(f);
      plot.style.setProperty('--n', nT);
      if (Math.abs(j - f) < (hi - lo) * 0.025) { dj.classList.add('up'); df.classList.add('down'); }
      plot.append(line, dj, df);
      const cc = el('div', 'mm-cell db-calls'); cc.title = `${r.name} · efficiency: ${r.calls.toFixed(2)} LLM calls per query`;
      // efficiency bars share one colour here; the open-source/proprietary split is shown elsewhere
      const track = el('div', 'm-track'); const bar = el('i', 'm-bar db-cbar');
      bar.style.width = `${r.calls / cmax * 100}%`; track.append(bar);
      cc.append(track, el('b', r.calls === bestC ? 'mm-best' : '', r.calls.toFixed(2)));
      const nj = el('b', 'db-num db-vj' + (j === bestJ ? ' mm-best' : ''), pct(j) + '%');
      const nf = el('b', 'db-num db-vf' + (f === bestF ? ' mm-best' : ''), f1(f));
      row.append(nameCell(r, chosenName, r === rows[0]), plot, nj, nf, cc);
      chart.append(row);
    });
    const ax = el('div', 'db-row db-axis'); ax.append(el('span'));
    const ticks = el('div', 'm-ticks');
    ticks.classList.add('db-ticks');
    for (let i = 0; i <= nT; i++) { const s = el('span', '', (lo + i / 10).toFixed(1)); s.style.left = `${i / nT * 100}%`; ticks.append(s); }
    ax.append(ticks); chart.append(ax);
  } else if (calls) {
    setHeading(heading, 'Efficiency · API calls per query · Overall', QUESTION.calls);
    direction.textContent = 'FEWER CALLS = LOWER API USAGE';
    legend.innerHTML = '<span><i></i>Open-source</span><span class="legend-proprietary"><i></i>Proprietary</span>';
    const max = niceMax(Math.max(...rows.map(r => r.calls)), 4);
    rows.forEach(r => {
      const row = el('div', 'm-row' + (r.name === chosenName ? ' selected' : ''));
      const track = el('div', 'm-track'); const bar = el('i', 'm-bar ' + r.group.toLowerCase());
      bar.style.width = `${r.calls / max * 100}%`; track.append(bar);
      const val = el('span', 'm-val'); val.append(el('b', '', r.calls.toFixed(2)));
      row.append(nameCell(r, chosenName, r === rows[0]), track, val); chart.append(row);
    });
    chart.append(axis(max, ''));
  } else {
    // one metric at a time: LLM-judge accuracy (%) or routing F1 (0-1)
    const M = isF1 ? {name: 'Source routing F1', fmt: f1} : {name: 'Answer accuracy (LLM-judge)', fmt: v => pct(v) + '%'};
    setHeading(heading, `${M.name} · ${slice.options[slice.selectedIndex].text}`, QUESTION[metric.value]);
    direction.textContent = NARROW.matches ? 'HIGHER IS BETTER →' : 'HIGHER IS BETTER ↑';
    legend.innerHTML = '<span><i></i>Open-source</span><span class="legend-proprietary"><i></i>Proprietary</span>';
    const vmax = niceMax(Math.max(...rows.map(r => r.v)), 0.2);
    const tick = v => isF1 ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v * 100) + '%';
    // vertical bars only when every backbone gets a column wide enough for its label
    if (!NARROW.matches && chart.clientWidth >= rows.length * 64) {
      const plot = el('div', 'vb vb-single'); const yax = el('div', 'vb-y');
      [4, 3, 2, 1, 0].forEach(i => yax.append(el('span', '', tick(vmax * i / 4))));
      const grid = el('div', 'vb-grid'); const labs = el('div', 'vb-lab');
      grid.style.gridTemplateColumns = labs.style.gridTemplateColumns = `repeat(${rows.length},minmax(0,1fr))`; // one column per backbone
      rows.forEach(r => {
        const col = el('div', 'vb-col ' + r.group.toLowerCase() + (r.name === chosenName ? ' selected' : ''));
        const b = el('i', 'vb-b j'); b.style.height = `${r.v / vmax * 100}%`;
        b.append(el('span', '', isF1 ? f1(r.v) : pct(r.v))); col.append(b);
        col.title = `${r.name}: ${M.name} ${M.fmt(r.v)}`;
        col.addEventListener('click', () => { selectedModel = r.name; render(); });
        if (r === rows[0]) b.prepend(crownEl());
        grid.append(col); labs.append(nameCell(r, chosenName));
      });
      plot.append(yax, grid); chart.append(plot, labs);
      return;
    }
    rows.forEach(r => {
      const row = el('div', 'm-row' + (r.name === chosenName ? ' selected' : ''));
      const track = el('div', 'm-track'); const bar = el('i', 'm-bar ' + r.group.toLowerCase());
      bar.style.width = `${r.v / vmax * 100}%`; track.append(bar);
      const val = el('span', 'm-val'); val.append(el('b', '', M.fmt(r.v)));
      row.append(nameCell(r, chosenName, r === rows[0]), track, val); chart.append(row);
    });
    const ax = axis(1, ''); ax.querySelectorAll('.m-ticks span').forEach((t, i) => { t.textContent = tick(vmax * i / 4); });
    chart.append(ax);
  }
}
function axis(max, unit) {
  const row = el('div', 'm-row m-axis'); row.append(el('span'));
  const ticks = el('div', 'm-ticks');
  [0, 1, 2, 3, 4].forEach(i => { const s = el('span', '', (Math.round(max * i / 4 * 100) / 100) + unit); s.style.left = `${i * 25}%`; ticks.append(s); });
  row.append(ticks, el('span')); return row;
}
document.querySelectorAll('.res-tabs [data-view]').forEach(b => b.addEventListener('click', () => {
  view = b.dataset.view;
  document.querySelectorAll('.res-tabs [data-view]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  render();
}));
NARROW.addEventListener('change', render);
let resizeTimer; window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (dataset) { render(); renderCost(); } }, 150); });
metric.addEventListener('change', render); slice.addEventListener('change', render);
fetch('results.json').then(r => { if (!r.ok) throw Error('Data unavailable'); return r.json(); }).then(d => { dataset = d; render(); renderCost(); }).catch(() => { document.querySelector('#chart').innerHTML = '<p>Results could not load. <a href="https://arxiv.org/pdf/2610.25096v2">View the published tables in the paper ↗</a></p>'; });
document.querySelector('#copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(document.querySelector('#bib').textContent); document.querySelector('#copy-status').textContent = 'BibTeX copied.'; } catch { const range = document.createRange(); range.selectNodeContents(document.querySelector('#bib')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); document.querySelector('#copy-status').textContent = 'Citation selected. Press Ctrl+C (or ⌘C) to copy.'; } });

// Answer accuracy vs. cost per query: log-x scatter with Pareto frontier and attractive quadrant.
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, text) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; return e; }
function median(a) { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function usd(v) { return v >= 0.1 ? '$' + v.toFixed(2) : v >= 0.01 ? '$' + v.toFixed(3) : '$' + v.toFixed(4); }
function renderCost() {
  const box = document.querySelector('#cost-chart');
  if (!box || !dataset) return;
  const pts = dataset.models.filter(m => typeof m.cost === 'number').map(m => ({...m, acc: m.judge[5]}));
  box.replaceChildren();
  if (!pts.length) return;
  const W = Math.max(320, box.clientWidth), narrow = W < 640;
  const H = narrow ? 520 : 500, M = {l: narrow ? 48 : 58, r: narrow ? 10 : 30, t: 20, b: narrow ? 46 : 54};
  // axes fitted to the data: log x with a little padding, y in 5-point steps
  const lx0 = Math.log10(Math.min(...pts.map(p => p.cost)) / 1.35), lx1 = Math.log10(Math.max(...pts.map(p => p.cost)) * 1.35);
  const y0 = Math.floor((Math.min(...pts.map(p => p.acc)) - 0.02) * 20) / 20, y1 = Math.ceil((Math.max(...pts.map(p => p.acc)) + 0.02) * 20) / 20;
  const X = v => M.l + (Math.log10(v) - lx0) / (lx1 - lx0) * (W - M.l - M.r);
  const Y = v => M.t + (1 - (v - y0) / (y1 - y0)) * (H - M.t - M.b);
  const svg = sv('svg', {viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Scatter plot of answer accuracy against cost per query for each LLM backbone'});
  const gy = sv('g', {class: 'cy-axis'});
  for (let v = y0; v <= y1 + 1e-9; v += 0.05) {
    const y = Y(v), major = Math.round(v * 100) % 10 === 0;
    svg.append(sv('line', {class: 'c-grid' + (major ? '' : ' minor'), x1: M.l, x2: W - M.r, y1: y, y2: y}));
    if (major || !narrow) gy.append(sv('text', {x: M.l - 10, y: y + 4, 'text-anchor': 'end'}, Math.round(v * 100) + '%'));
  }
  const gx = sv('g', {class: 'cx-axis'});
  for (let e = Math.floor(lx0); e <= Math.ceil(lx1); e++) [1, 2, 5].forEach(k => {
    const v = k * 10 ** e; if (Math.log10(v) < lx0 || Math.log10(v) > lx1) return;
    const x = X(v);
    svg.append(sv('line', {class: 'c-grid' + (k === 1 ? '' : ' minor'), x1: x, x2: x, y1: M.t, y2: H - M.b}));
    if (narrow && k === 2) return;
    gx.append(sv('text', {x, y: H - M.b + 20, 'text-anchor': 'middle'}, '$' + (v >= 1 ? v : +v.toPrecision(1))));
  });
  svg.append(sv('line', {class: 'c-base', x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b}), gy, gx);
  svg.append(sv('text', {class: 'cx-title', x: (M.l + W - M.r) / 2, y: H - 6, 'text-anchor': 'middle'}, 'Cost per query (USD, log scale)'));
  svg.append(sv('text', {class: 'cy-title', x: -(M.t + H - M.b) / 2, y: narrow ? 11 : 14, transform: 'rotate(-90)', 'text-anchor': 'middle'}, 'Answer accuracy'));
  // Pareto frontier: best accuracy reachable at or below each cost
  const byCost = [...pts].sort((a, b) => a.cost - b.cost); let best = -1; const front = [];
  byCost.forEach(p => { if (p.acc > best) { best = p.acc; front.push(p); } });
  // a frontier line only says something once it passes three or more backbones
  const showLine = front.length >= 3;
  if (showLine) svg.append(sv('polyline', {class: 'c-pareto', points: front.map(p => `${X(p.cost)},${Y(p.acc)}`).join(' ')}));
  const legendLine = document.querySelector('#cost-legend .cl-pareto'); if (legendLine) legendLine.hidden = !showLine;
  // short tags instead: the most accurate backbone, and the cheapest backbone on the frontier
  const mostAcc = front[front.length - 1], bestValue = front[0];
  const TAG = new Map([[mostAcc.name, 'Most accurate']]);
  if (bestValue !== mostAcc) TAG.set(bestValue.name, 'Best value');
  // markers: the brand logo in a white chip; ring colour = open-source / proprietary,
  // dashed ring = estimated cost. Names sit beside the chip, placed to avoid overlaps.
  const R = narrow ? 9 : 13, LOGO = narrow ? 11 : 16, LH = narrow ? 16 : 19, CW = narrow ? 6.6 : 7.8;
  const boxes = pts.map(p => ({x: X(p.cost) - R - 2, y: Y(p.acc) - R - 2, w: 2 * R + 4, h: 2 * R + 4}));
  const hits = b => boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
  const inside = b => b.x >= M.l + 2 && b.x + b.w <= W - M.r && b.y >= M.t - 8 && b.y + b.h <= H - M.b - 2;
  const topAcc = Math.max(...pts.map(p => p.acc));
  const labels = [];
  [...pts].sort((a, b) => b.acc - a.acc).forEach(p => {
    const tag = TAG.get(p.name), x = X(p.cost), y = Y(p.acc), lw = p.name.length * CW + (tag && !narrow ? tag.length * CW * 0.82 + 18 : 0);
    const cands = [];
    for (const dy of [0, -0.9, 0.9, -1.8, 1.8]) for (const side of [1, -1])
      cands.push({side, x: side > 0 ? x + R + 7 : x - R - 7 - lw, y: y - LH / 2 + dy * LH, w: lw, h: LH});
    const spot = cands.find(b => inside(b) && !hits(b)) || cands[0];
    boxes.push(spot); labels.push({p, x, y, spot});
  });
  if (!narrow) labels.forEach(({p, x, y, spot}) => {
    const tx = spot.side > 0 ? spot.x : spot.x + spot.w, cy = spot.y + spot.h / 2;
    if (Math.abs(cy - y) > 4) {
      // label moved off the chip's row: connect it so the pairing stays clear
      const ex = spot.side > 0 ? spot.x - 3 : spot.x + spot.w + 3, ang = Math.atan2(cy - y, ex - x);
      svg.append(sv('line', {class: 'c-lead', x1: x + Math.cos(ang) * (R + 1), y1: y + Math.sin(ang) * (R + 1), x2: ex, y2: cy}));
    }
    const t = sv('text', {class: 'c-lab' + (TAG.has(p.name) ? ' top' : ''), x: tx, y: spot.y + spot.h / 2 + 5,
      'text-anchor': spot.side > 0 ? 'start' : 'end'}, p.name);
    if (TAG.has(p.name)) t.append(sv('tspan', {class: 'c-tag', dx: 8}, TAG.get(p.name)));
    svg.append(t);
  });
  // draw higher-accuracy chips last so they sit on top where they touch
  [...pts].sort((a, b) => a.acc - b.acc).forEach(p => {
    const x = X(p.cost), y = Y(p.acc);
    const g = sv('g', {class: `c-mk ${p.group.toLowerCase()}${p.cost_measured ? '' : ' est'}${p.name === selectedModel ? ' sel' : ''}`});
    g.append(sv('circle', {class: 'c-chip', cx: x, cy: y, r: R}));
    const hit = LOGOS.find(([re]) => re.test(p.name));
    if (hit) g.append(sv('image', {href: `assets/logos/${hit[1]}.svg`, x: x - LOGO / 2, y: y - LOGO / 2, width: LOGO, height: LOGO}));
    g.append(sv('title', {}, `${p.name} · answer accuracy ${pct(p.acc)}% · ${usd(p.cost)} per query${p.cost_measured ? '' : ' (estimated)'}`));
    g.addEventListener('click', () => { selectedModel = p.name; render(); });
    svg.append(g);
  });
  box.append(svg);
  if (narrow) {
    // phones: names would collide in the dense middle, so list them under the chart instead
    const list = el('ol', 'cost-list');
    [...pts].sort((a, b) => b.acc - a.acc).forEach(p => {
      const li = el('li'); const dot = el('i', `${p.group.toLowerCase()}${p.cost_measured ? '' : ' est'}`);
      li.append(dot, el('span', 'cl-name', p.name), el('span', 'cl-val', `${pct(p.acc)}% · ${usd(p.cost)}${p.cost_measured ? '' : '*'}`));
      list.append(li);
    });
    box.append(list, el('p', 'cost-list-note', '* estimated cost'));
  }
}
