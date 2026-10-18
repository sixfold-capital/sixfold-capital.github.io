// Growth of 100 chart for the Round 1 backtest. Drawn at the container's real
// width so text stays legible on phones; redrawn on resize and language change.
(() => {
  'use strict';
  const figure = document.querySelector('[data-backtest-chart]');
  if (!figure) return;
  const data = JSON.parse(figure.querySelector('script[type="application/json"]').textContent);
  const plot = figure.querySelector('.chart-plot');
  const tip = figure.querySelector('.chart-tip');
  const colors = ['#2A5DA8', '#C48A2C', '#2E9E7E'];
  const widths = [2.5, 2, 2];
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };
  const names = () => [...figure.querySelectorAll('.chart-legend [data-series]')].map(n => n.textContent.trim());
  const monthLabel = ym => {
    const [y, m] = ym.split('-').map(Number);
    const lang = document.documentElement.lang || 'en';
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(lang, {month: 'short', year: 'numeric', timeZone: 'UTC'});
  };

  function draw() {
    plot.textContent = '';
    const W = plot.clientWidth;
    const small = W < 560;
    const H = small ? 280 : 380;
    const m = {top: 16, right: small ? 44 : 64, bottom: 32, left: small ? 34 : 44};
    const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
    const n = data.dates.length;
    const yMin = 80, yMax = 270;
    const x = i => m.left + (i / (n - 1)) * iw;
    const y = v => m.top + ih - ((v - yMin) / (yMax - yMin)) * ih;
    const svg = el('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-labelledby': 'backtest-chart-title'}, plot);

    // Recessive grid and y labels.
    for (let v = 100; v <= 250; v += 50) {
      el('line', {x1: m.left, x2: W - m.right, y1: y(v), y2: y(v), stroke: v === 100 ? 'rgba(20,40,61,.45)' : 'rgba(20,40,61,.10)', 'stroke-width': 1, 'stroke-dasharray': v === 100 ? '3 4' : ''}, svg);
      const t = el('text', {x: m.left - 10, y: y(v) + 4, 'text-anchor': 'end', class: 'chart-axis'}, svg);
      t.textContent = v;
    }
    // Year ticks.
    const step = small ? 4 : 2;
    data.dates.forEach((d, i) => {
      if (!d.endsWith('-01')) return;
      const yr = Number(d.slice(0, 4));
      if ((yr - 2015) % step) return;
      el('line', {x1: x(i), x2: x(i), y1: m.top + ih, y2: m.top + ih + 5, stroke: 'rgba(20,40,61,.35)'}, svg);
      const t = el('text', {x: x(i), y: H - 8, 'text-anchor': 'middle', class: 'chart-axis'}, svg);
      t.textContent = yr;
    });
    el('line', {x1: m.left, x2: W - m.right, y1: m.top + ih, y2: m.top + ih, stroke: 'rgba(20,40,61,.35)'}, svg);

    // Lines: draw our SAA last so it sits on top.
    [2, 1, 0].forEach(s => {
      const d = data.series[s].map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
      el('path', {d, fill: 'none', stroke: colors[s], 'stroke-width': widths[s], 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, svg);
    });
    // End values as direct labels, nudged apart if they collide.
    const ends = data.series.map((sr, s) => ({s, y: y(sr[n - 1]), v: sr[n - 1]})).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    ends.forEach(e => {
      el('circle', {cx: x(n - 1), cy: y(data.series[e.s][n - 1]), r: 3.5, fill: colors[e.s], stroke: '#fff', 'stroke-width': 2}, svg);
      const t = el('text', {x: x(n - 1) + 8, y: e.y + 4, class: 'chart-end'}, svg);
      t.textContent = Math.round(e.v);
    });

    // Hover layer: crosshair, markers and tooltip.
    const cross = el('line', {y1: m.top, y2: m.top + ih, stroke: 'rgba(20,40,61,.35)', 'stroke-width': 1, visibility: 'hidden'}, svg);
    const dots = colors.map(c => el('circle', {r: 4.5, fill: c, stroke: '#fff', 'stroke-width': 2, visibility: 'hidden'}, svg));
    const hit = el('rect', {x: m.left, y: m.top, width: iw, height: ih, fill: 'transparent'}, svg);
    const labels = names();
    const show = clientX => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left - m.left) / iw) * (n - 1))));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
      dots.forEach((dot, s) => { dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(data.series[s][i])); dot.setAttribute('visibility', 'visible'); });
      tip.innerHTML = '';
      const head = document.createElement('div'); head.className = 'chart-tip-date'; head.textContent = monthLabel(data.dates[i]); tip.appendChild(head);
      data.series.map((sr, s) => ({s, v: sr[i]})).sort((a, b) => b.v - a.v).forEach(({s, v}) => {
        const row = document.createElement('div'); row.className = 'chart-tip-row';
        const sw = document.createElement('i'); sw.style.background = colors[s];
        const name = document.createElement('span'); name.textContent = labels[s];
        const val = document.createElement('b'); val.textContent = v.toFixed(1);
        row.append(sw, name, val); tip.appendChild(row);
      });
      tip.hidden = false;
      const left = x(i) + 14 + tip.offsetWidth > W ? x(i) - 14 - tip.offsetWidth : x(i) + 14;
      tip.style.left = `${Math.max(0, left)}px`;
      tip.style.top = `${m.top}px`;
    };
    const hide = () => { cross.setAttribute('visibility', 'hidden'); dots.forEach(d => d.setAttribute('visibility', 'hidden')); tip.hidden = true; };
    hit.addEventListener('pointermove', e => show(e.clientX));
    hit.addEventListener('pointerdown', e => show(e.clientX));
    hit.addEventListener('pointerleave', hide);
  }

  let frame = 0, lastWidth = 0;
  const redraw = force => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (force || plot.clientWidth !== lastWidth) { lastWidth = plot.clientWidth; draw(); } }); };
  window.addEventListener('resize', () => redraw(true));
  redraw(true);
})();
