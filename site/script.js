(() => {
  'use strict';

  const DATA_URL = 'data/projects.json';
  const FALLBACK_GITHUB_USER = 'Loadingname91';

  let state = { projects: [], writing: [], filter: 'All', open: null };

  // ---------------------------------------------------------------
  // Scroll progress bar
  // ---------------------------------------------------------------
  function initProgress() {
    const bar = document.getElementById('prog');
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      const p = h > 0 ? scrollY / h : 0;
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------------------------------------------------------------
  // Custom cursor
  // ---------------------------------------------------------------
  function initCursor() {
    if (matchMedia('(hover: none)').matches) return;
    const dot = document.getElementById('curd'), ring = document.getElementById('curr');
    if (!dot || !ring) return;
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, shown = false;
    const HOT = 'a,button,.btn,.exp-row,.cell,img,.wr,.chip,.fcard,.scard';
    addEventListener('mousemove', e => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; dot.classList.add('on'); ring.classList.add('on'); }
      ring.classList.toggle('hot', !!(e.target.closest && e.target.closest(HOT)));
    }, { passive: true });
    addEventListener('mouseout', e => {
      if (!e.relatedTarget) { shown = false; dot.classList.remove('on'); ring.classList.remove('on'); }
    });
    const tick = () => {
      requestAnimationFrame(tick);
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
    };
    requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------
  // WebGL "slow drift" ambient background
  // ---------------------------------------------------------------
  function initGL() {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.35 : 1;
    const cv = document.getElementById('bgfx');
    const gl = cv && cv.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) return;

    const FS = [
      '#version 300 es',
      'precision highp float;',
      'out vec4 fragColor;',
      'uniform vec2 uRes; uniform float uT; uniform vec2 uM; uniform float uS; uniform float uAmt;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
      ' return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}',
      'float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*noise(p);p*=2.03;a*=0.5;}return s;}',
      'void main(){',
      ' vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;',
      ' vec3 base=vec3(0.098,0.094,0.090);',
      ' vec3 deep=vec3(0.235,0.121,0.086);',
      ' vec3 warm=vec3(0.851,0.467,0.341);',
      ' vec2 m=(uM-0.5)*0.12;',
      ' float t=uT*0.012;',
      ' vec2 q=vec2(fbm(uv*1.1+vec2(t,uS*0.25)),fbm(uv*1.1+vec2(4.2,1.7)-t));',
      ' float f=fbm(uv*1.3+2.0*q+m);',
      ' vec3 col=base;',
      ' col=mix(col,deep,smoothstep(0.42,0.98,f)*0.75);',
      ' col+=warm*pow(smoothstep(0.66,1.08,f),3.0)*0.10;',
      ' col=mix(base,col,uAmt);',
      ' col*=1.0-0.32*length(uv*vec2(0.5,0.9));',
      ' col+=(hash(gl_FragCoord.xy+uT)-0.5)*0.010;',
      ' fragColor=vec4(col,1.0);',
      '}'
    ].join('\n');
    const VS = [
      '#version 300 es',
      'void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0.0,1.0);}'
    ].join('\n');

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const uRes = gl.getUniformLocation(prog, 'uRes'),
          uT = gl.getUniformLocation(prog, 'uT'),
          uM = gl.getUniformLocation(prog, 'uM'),
          uS = gl.getUniformLocation(prog, 'uS'),
          uAmt = gl.getUniformLocation(prog, 'uAmt');

    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const resize = () => {
      cv.width = Math.floor(innerWidth * dpr);
      cv.height = Math.floor(innerHeight * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
    };
    resize();
    addEventListener('resize', resize);

    let mxT = 0.5, myT = 0.5, mx = 0.5, my = 0.5, scT = 0, sc = 0;
    addEventListener('mousemove', e => { mxT = e.clientX / innerWidth; myT = 1 - e.clientY / innerHeight; }, { passive: true });
    addEventListener('scroll', () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      scT = h > 0 ? scrollY / h : 0;
    }, { passive: true });

    const t0 = performance.now();
    const loop = now => {
      requestAnimationFrame(loop);
      mx += (mxT - mx) * 0.045; my += (myT - my) * 0.045; sc += (scT - sc) * 0.08;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, ((now - t0) / 1000) * calm);
      gl.uniform2f(uM, mx, my);
      gl.uniform1f(uS, sc);
      gl.uniform1f(uAmt, 0.55);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    requestAnimationFrame(loop);
    requestAnimationFrame(() => cv.classList.add('on'));
  }

  // ---------------------------------------------------------------
  // Scroll-reveal for .rv elements
  // ---------------------------------------------------------------
  function initReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    setTimeout(() => document.querySelectorAll('.rv').forEach(n => n.classList.add('in')), 2600);
    observeNewReveals(io);
    return io;
  }
  function observeNewReveals(io) {
    requestAnimationFrame(() => {
      document.querySelectorAll('.rv:not(.in)').forEach((n, i) => {
        if (n.dataset.obs) return;
        n.dataset.obs = '1';
        n.style.animationDelay = (i % 6) * 0.06 + 's';
        io.observe(n);
      });
    });
  }

  // ---------------------------------------------------------------
  // Project data → DOM
  // ---------------------------------------------------------------
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function tagsHtml(tags, cls) {
    return (tags || []).map(t => `<span class="tag ${cls}">${esc(t)}</span>`).join('');
  }

  function archHtml(arch) {
    return (arch || []).map((label, i, arr) =>
      `<span class="archnode">${esc(label)}</span>` + (i < arr.length - 1 ? `<span class="archarrow">→</span>` : '')
    ).join('');
  }

  function metricsHtml(metrics) {
    return (metrics || []).map(([label, value]) => `
      <div style="padding:12px 16px;border-right:1px solid var(--color-divider);border-bottom:1px solid var(--color-divider)">
        <div class="mono" style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--color-neutral-600)">${esc(label)}</div>
        <div style="font:600 20px/1.2 var(--font-heading);color:var(--color-accent-700)">${esc(value)}</div>
      </div>`).join('');
  }

  function featuredCardHtml(p, idx) {
    const gifs = Array.isArray(p.gifs) && p.gifs.length ? p.gifs : (p.gif ? [p.gif] : []);
    const gifLayers = gifs.map((g, i) => `<div class="gif${i === 0 ? ' active' : ''}" style="background-image:url(${esc(g)})"></div>`).join('');
    const gifDots = gifs.length > 1 ? `
      <div class="gif-dots">
        ${gifs.map((_, i) => `<button type="button" class="gif-dot${i === 0 ? ' active' : ''}" data-gif-i="${i}" aria-label="Demo clip ${i + 1}"></button>`).join('')}
      </div>` : '';
    const gifNote = gifs.length > 1 ? 'Hover for the demo · click a dot to switch clips' : gifs.length === 1 ? 'Hover for the demo' : 'Add a demo GIF in projects.json to replace this diagram';
    const study = p.study || { problem: '', approach: '', hard: '', outcome: '' };
    return `
    <article class="fcard rv" data-title="${esc(p.title)}">
      <div class="feat-grid" style="display:grid;grid-template-columns:1.15fr 1fr">
        <div style="padding:26px 28px;display:flex;flex-direction:column;gap:12px">
          <span class="card-kicker">${esc(p.kicker)}</span>
          <h3 style="margin:0;font-size:27px;letter-spacing:-.02em">${esc(p.title)}</h3>
          <p style="margin:0;font-size:14.5px;line-height:1.55;color:var(--color-neutral-800);text-wrap:pretty">${esc(p.blurb)}</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:2px">${tagsHtml(p.tags, 'tag-outline')}</div>
          <div style="display:flex;gap:16px;align-items:center;margin-top:auto;padding-top:16px;font-size:13px">
            <button type="button" class="mono toggle-case" data-idx="${idx}" style="font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:8px 14px;cursor:pointer;background:var(--color-accent);color:#191817;border:0">Case study ↓</button>
            <a href="${esc(p.repo || '#')}" class="mono" style="font-weight:600" target="_blank" rel="noopener">Repository ↗</a>
            <a href="${esc(p.writeup || p.repo || '#')}" class="mono" style="font-weight:600" target="_blank" rel="noopener">Write-up ↗</a>
          </div>
        </div>
        <div class="feat-media" style="border-left:2px solid var(--color-divider);display:flex;flex-direction:column">
          <div class="media" style="flex:1;min-height:200px;padding:20px;background:var(--color-bg);display:flex;flex-direction:column;justify-content:center;gap:12px;position:relative;overflow:hidden">
            ${gifLayers}${gifDots}
            <div class="mono" style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--color-neutral-600)">Pipeline</div>
            <div class="archbox">${archHtml(p.arch)}</div>
            <div class="mono" style="font-size:10px;color:var(--color-neutral-600);margin-top:4px">${esc(gifNote)}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--color-divider)">${metricsHtml(p.metrics)}</div>
        </div>
      </div>
      <div class="case-study" data-idx="${idx}" style="grid-template-columns:repeat(4,1fr)">
        <div style="padding:20px 22px;border-right:1px solid var(--color-divider)">
          <div class="card-kicker" style="margin-bottom:8px">Problem</div>
          <p style="margin:0;font-size:13px;line-height:1.55;color:var(--color-neutral-800)">${esc(study.problem)}</p>
        </div>
        <div style="padding:20px 22px;border-right:1px solid var(--color-divider)">
          <div class="card-kicker" style="margin-bottom:8px">Approach</div>
          <p style="margin:0;font-size:13px;line-height:1.55;color:var(--color-neutral-800)">${esc(study.approach)}</p>
        </div>
        <div style="padding:20px 22px;border-right:1px solid var(--color-divider)">
          <div class="card-kicker" style="margin-bottom:8px">What was hard</div>
          <p style="margin:0;font-size:13px;line-height:1.55;color:var(--color-neutral-800)">${esc(study.hard)}</p>
        </div>
        <div style="padding:20px 22px;background:var(--color-accent-100)">
          <div class="card-kicker" style="margin-bottom:8px">Outcome</div>
          <p style="margin:0;font-size:13px;line-height:1.55;color:var(--color-accent-800)">${esc(study.outcome)}</p>
        </div>
      </div>
    </article>`;
  }

  function restCardHtml(p) {
    return `
    <a class="scard rv" href="${esc(p.repo || '#')}" target="_blank" rel="noopener">
      <span class="card-kicker">${esc(p.kicker)}</span>
      <h4 style="margin:0;font-size:18px;letter-spacing:-.01em;color:var(--color-text)">${esc(p.title)}</h4>
      <p style="margin:0;font-size:13px;line-height:1.5;color:var(--color-neutral-800);flex:1;text-wrap:pretty">${esc(p.blurb)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${tagsHtml(p.tags, 'tag-neutral')}</div>
    </a>`;
  }

  function writingRowHtml(w) {
    return `
    <a class="wr writing-row" href="${esc(w.url || '#')}" target="_blank" rel="noopener" style="grid-template-columns:150px 1fr 90px">
      <div class="mono wr-meta" style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--color-accent-700)">${esc(w.venue)}<br><span style="color:var(--color-neutral-600)">${esc(w.date)}</span></div>
      <div>
        <h4 style="margin:0 0 5px;font-size:17px;letter-spacing:-.01em">${esc(w.title)}</h4>
        <p style="margin:0;font-size:13.5px;line-height:1.5;color:var(--color-neutral-800);max-width:74ch;text-wrap:pretty">${esc(w.blurb)}</p>
      </div>
      <div class="mono wr-cta" style="font-size:12px;text-align:right;color:var(--color-accent-700)">Read ↗</div>
    </a>`;
  }

  function renderFilters(io) {
    const el = document.getElementById('work-filters');
    const counts = { All: state.projects.length };
    state.projects.forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    const cats = ['All', 'AI/ML', 'Agents', 'Distributed', 'Full-stack'].filter(c => counts[c]);

    el.querySelectorAll('.chip').forEach(n => n.remove());
    cats.forEach(c => {
      const active = c === state.filter;
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.type = 'button';
      btn.style.border = '1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-divider)');
      btn.style.background = active ? 'var(--color-accent)' : 'transparent';
      btn.style.color = active ? '#191817' : 'var(--color-neutral-800)';
      btn.innerHTML = `${esc(c)} <span style="opacity:.6">${counts[c]}</span>`;
      btn.addEventListener('click', () => {
        state.filter = c;
        state.open = null;
        renderAll(io);
      });
      el.appendChild(btn);
    });
  }

  function renderWork(io) {
    const filtered = state.projects.filter(p => state.filter === 'All' || p.cat === state.filter);
    const featured = filtered.filter(p => p.featured).slice(0, 3);
    const rest = filtered.filter(p => !p.featured);

    const featEl = document.getElementById('work-featured');
    featEl.innerHTML = featured.map((p, i) => featuredCardHtml(p, i)).join('');
    featEl.querySelectorAll('.toggle-case').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.idx;
        const panel = featEl.querySelector(`.case-study[data-idx="${idx}"]`);
        const isOpen = panel.classList.toggle('open');
        btn.textContent = isOpen ? 'Close case study ↑' : 'Case study ↓';
      });
    });
    featEl.querySelectorAll('.gif-dot').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const media = btn.closest('.media');
        const i = btn.dataset.gifI;
        media.querySelectorAll('.gif').forEach((g, gi) => g.classList.toggle('active', String(gi) === i));
        media.querySelectorAll('.gif-dot').forEach(d => d.classList.toggle('active', d === btn));
      });
    });

    const restEl = document.getElementById('work-rest');
    restEl.innerHTML = rest.map(restCardHtml).join('');

    const noteEl = document.getElementById('work-filter-note');
    noteEl.textContent = state.filter === 'All'
      ? state.projects.length + ' projects. Add another by appending to data/projects.json.'
      : (featured.length + rest.length) + ' of ' + state.projects.length + ' projects match ' + state.filter + '.';

    observeNewReveals(io);
  }

  function renderWriting() {
    document.getElementById('writing-list').innerHTML = state.writing.map(writingRowHtml).join('');
  }

  function renderAll(io) {
    renderFilters(io);
    renderWork(io);
  }

  // ---------------------------------------------------------------
  // GitHub contribution graph
  // ---------------------------------------------------------------
  function fallbackContributions() {
    const out = [];
    let seed = 20260809;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 370);
    start.setDate(start.getDate() - start.getDay());
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      const weekend = dow === 0 || dow === 6 ? 0.45 : 1;
      const r = rnd();
      let count = 0;
      if (r > 0.28) count = Math.round(rnd() * 11 * weekend) + 1;
      out.push({ date: new Date(d), count });
    }
    return out;
  }

  function renderActivity(days) {
    const cellsEl = document.getElementById('activity-cells');
    const ramp = ['var(--color-neutral-300)', 'var(--color-accent-200)', 'var(--color-accent-400)', 'var(--color-accent-500)', 'var(--color-accent-700)'];
    const lvl = c => (c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 9 ? 3 : 4);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let html = '';
    for (let i = 0; i < days.length; i += 7) {
      const w = i / 7;
      html += '<div style="display:flex;flex-direction:column;gap:3px">';
      days.slice(i, i + 7).forEach((d, j) => {
        const delay = (w * 0.011 + j * 0.02).toFixed(3) + 's';
        const title = d.count + (d.count === 1 ? ' contribution on ' : ' contributions on ') + fmt(d.date);
        html += `<div class="cell" title="${esc(title)}" style="width:12px;height:12px;background:${ramp[lvl(d.count)]};animation-delay:${delay}"></div>`;
      });
      html += '</div>';
    }
    cellsEl.innerHTML = html;

    let streak = 0, run = 0, active = 0, total = 0;
    days.forEach(d => {
      total += d.count;
      if (d.count > 0) { active++; run++; streak = Math.max(streak, run); } else run = 0;
    });

    document.getElementById('activity-total').textContent = total.toLocaleString();
    document.getElementById('activity-range').textContent = fmt(days[0].date).toUpperCase() + ' to ' + fmt(days[days.length - 1].date).toUpperCase();
    document.getElementById('activity-streak').textContent = streak + ' days';
    document.getElementById('activity-activedays').textContent = active;
  }

  function loadActivity(githubUser) {
    const fallback = fallbackContributions();
    renderActivity(fallback);
    fetch('https://github-contributions-api.jogruber.de/v4/' + encodeURIComponent(githubUser) + '?y=last')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        const days = (d.contributions || []).map(c => ({ date: new Date(c.date), count: c.count }));
        if (days.length > 300) renderActivity(days.slice(-371));
      })
      .catch(() => {});
  }

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initProgress();
    initCursor();
    initGL();
    const io = initReveal();

    fetch(DATA_URL)
      .then(r => r.json())
      .then(d => {
        state.projects = d.projects || [];
        state.writing = d.writing || [];
        renderWriting();
        renderAll(io);
        loadActivity(d.github || FALLBACK_GITHUB_USER);
      })
      .catch(err => {
        document.getElementById('work-filter-note').textContent = 'Could not load data/projects.json: ' + err;
      });
  });
})();
