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
    legend.innerHTML = '<span class="lg-dot lg-judge"><i></i>Answer accuracy</span><span class="lg-dot lg-f1"><i></i>Source routing F1</span><span><i></i>Open-source</span><span class="legend-proprietary"><i></i>Proprietary</span>';
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
      const track = el('div', 'm-track'); const bar = el('i', 'm-bar ' + r.group.toLowerCase());
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
let resizeTimer; window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (dataset) render(); }, 150); });
metric.addEventListener('change', render); slice.addEventListener('change', render);
fetch('results.json').then(r => { if (!r.ok) throw Error('Data unavailable'); return r.json(); }).then(d => { dataset = d; render(); }).catch(() => { document.querySelector('#chart').innerHTML = '<p>Results could not load. <a href="https://arxiv.org/pdf/2610.25096v2">View the published tables in the paper ↗</a></p>'; });
document.querySelector('#copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(document.querySelector('#bib').textContent); document.querySelector('#copy-status').textContent = 'BibTeX copied.'; } catch { const range = document.createRange(); range.selectNodeContents(document.querySelector('#bib')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); document.querySelector('#copy-status').textContent = 'Citation selected. Press Ctrl+C (or ⌘C) to copy.'; } });
