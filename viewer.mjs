import {add, clamp, dot, formatNumber, length, mix, sub, models} from './models.mjs';
import {arcFromRays, planeXY, projectSolid, viewBasis, views} from './projection.mjs';

const logo = new URL('./trace-mark.png', import.meta.url);
const colors = ['#E8EBDC', '#D9E2CD', '#C6D3AC'];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const n = value => Number(value.toFixed(2));
const coord = ([x,y]) => `${n(x)},${n(y)}`;
let instance = 0;

function renderScene(svg, model, basis, view, options, size, state, arrow) {
  const { width, height } = size;
  const { labels, planes, hidden, solid } = options;
  const plane = projectSolid(model,basis);
  const span = Math.min(width,height);
  const projectedCentre = planeXY(model.centre,basis);
  const diameter = 2 * Math.max(...model.physicalNames.map(key => length(sub(model.vertices[key],model.centre))));
  const ratio = span * .63 * state.zoom / diameter;
  const xy = p => [
    width / 2 + state.x + ratio * (p[0] - projectedCentre[0]),
    height / 2 + state.y + ratio * (p[1] - projectedCentre[1]),
  ];
  const project = p => xy(planeXY(p,basis));
  const layers = [];
  const notes = [];
  const path = (ps, cls, extra='') => {
    layers.push(`<path class="${cls}" d="M${ps.map(coord).join('L')}" ${extra}/>`);
  };
  const polygon = (ps, cls, extra='') => {
    layers.push(`<polygon class="${cls}" points="${ps.map(coord).join(' ')}" ${extra}/>`);
  };
  const guideLine = (a,b,cls,extra) => path([project(a),project(b)],cls,extra);
  const note = (p,text,kind) => notes.push({p:project(p),text,kind});
  const direct = view === 'front' || view === 'top' || view === 'right';

  if (planes) {
    const [x,y,z] = model.centre, reach = diameter * .64;
    const left = x - reach, right = x + reach, front = z + diameter * .58;
    const hp = [[left,0,0],[right,0,0],[right,0,front],[left,0,front]];
    const top = y + diameter * .50;
    const vp = [[left,0,0],[right,0,0],[right,top,0],[left,top,0]];
    if (!direct) {
      polygon(vp.map(project),'t3-vp');
      polygon(hp.map(project),'t3-hp');
    }
    if (view !== 'right') guideLine(hp[0],hp[1],'t3-xy');
    if (labels) {
      if (!direct) {
        note([left+diameter*.07,0,front],'HP','plane');
        note([x+diameter*.29,top-diameter*.10,0],'VP','plane');
      }
      if (view !== 'right') note([right,0,0],'XY','plane');
    }
  }

  plane.visibleFaces.forEach(face => {
    if (!solid) return;
    const sun = dot(face.normal,[.28,.86,.43]);
    const tone = sun > .52 ? 0 : sun > .08 ? 1 : 2;
    polygon([...face.names].map(key => xy(plane.points[key])),'t3-face',`fill="${colors[tone]}"`);
  });
  const edge = ({a,b,key},cls) => path([xy(a),xy(b)],cls,key ? `data-edge="${key}"` : '');
  if (hidden) plane.hidden.forEach(line => edge(line,'t3-edge t3-edge-hidden'));
  plane.centreLine.forEach(line => edge(line,'t3-centre'));
  plane.visible.forEach(line => edge(line,
    't3-edge t3-edge-visible' + (line.contact && !direct ? ' t3-edge-contact' : '')
  ));

  if (labels) {
    const groups = [];
    for (const [key,position] of Object.entries(plane.points)) {
      const location = xy(position);
      let group = groups.find(item => length(sub(item.p,location)) < 1.3);
      if (!group) {
        group = {p:location, vertices:[]};
        groups.push(group);
      }
      group.vertices.push(key);
    }
    for (const {p,vertices} of groups) {
      vertices.sort((a,b) => dot(sub(model.vertices[b],model.vertices[a]),basis.towardViewer));
      const name = key => view === 'front' || view === 'right' ? key + '′' : key;
      const [first,...others] = vertices.map(name);
      const label = first + others.map(key => `(${key})`).join('');
      const contact = vertices.some(key => model.contact.includes(key));
      const isBehind = !vertices.some(key => model.edges.some(edge => (
        (edge.a === key || edge.b === key) && plane.visible.some(line => line.key === edge.key)
      )));
      layers.push(`<circle class="t3-vertex${contact ? ' t3-contact' : ''}${isBehind ? ' t3-vertex-hidden' : ''}" cx="${n(p[0])}" cy="${n(p[1])}" r="${contact ? 3.6 : 2.45}"/>`);
      notes.unshift({p,text:label,kind:'vertex'});
    }
  }

  // Keep the orthographic presets clear for comparing the lines and vertices.
  if (labels && !direct) {
    for (const dimension of model.dimensions) {
      const [a,b] = dimension.ends.map(key => model.vertices[key]);
      const from = add(a,dimension.offset), to = add(b,dimension.offset);
      if (length(sub(project(from),project(to))) < 20) continue;
      guideLine(a,from,'t3-guide');
      guideLine(b,to,'t3-guide');
      guideLine(from,to,'t3-dimension',`marker-start="url(#${arrow})" marker-end="url(#${arrow})"`);
      note(mix(from,to,.5),dimension.label,'measure');
    }
    for (const guide of model.angleGuides) {
      const origin = model.vertices[guide.origin];
      const arc = arcFromRays(origin,guide.u,guide.v,guide.radius);
      if (!arc || length(sub(project(arc.points[0]),project(arc.points.at(-1)))) < 8) continue;
      guideLine(origin,arc.points[0],'t3-angle-ray');
      guideLine(origin,arc.points.at(-1),'t3-angle-ray');
      path(arc.points.map(project),'t3-dimension');
      note(arc.middle,`${formatNumber(arc.degrees)}°`,'measure');
    }
  }

  const occupied = [];
  for (const {p:[x,y],text,kind} of notes) {
    if (x < 0 || y < 0 || x > width || y > height) continue;
    const w = 7.5 * text.length + 4, h = 16;
    let left, top, clear;
    for (let i=0; i<24; i++) {
      const theta = -Math.PI/3 + i*Math.PI/4;
      const radius = 12 + 10*Math.floor(i/8);
      left = clamp(x+radius*Math.cos(theta)-(Math.cos(theta)<0?w:0), 5, width-w-5);
      top = clamp(y+radius*Math.sin(theta)-h/2, 3, height-h-4);
      clear = occupied.every(box => left+w+3 < box.left || left > box.left+box.w+3 ||
        top+h+2 < box.top || top > box.top+h+2);
      if (clear) break;
    }
    if (!clear && kind !== 'vertex') continue;
    occupied.push({left,top,w});
    if (kind === 'vertex' && length(sub([clamp(x,left,left+w),top+h/2],[x,y])) > 15) {
      path([[x,y],[clamp(x,left,left+w),top+h/2]],'t3-leader');
    }
    layers.push(`<text class="t3-note t3-note-${kind}" x="${n(left)}" y="${n(top+13)}">${text}</text>`);
  }
  svg.querySelector('.t3-art').innerHTML = layers.join('');
}

function inspect(host, model, name) {
  const svg = host.querySelector('svg');
  const toolbar = host.querySelector('.t3-tools');
  const select = toolbar.querySelector('select');
  const zoomLabel = toolbar.querySelector('output');
  const fullButton = toolbar.querySelector('[data-act=fullscreen]');
  const arrow = svg.querySelector('marker').id;
  const abort = new AbortController();
  const on = (target,type,callback,options={}) => target.addEventListener(type,callback,{...options,signal:abort.signal});
  const options = {labels:true, planes:true, hidden:true, solid:true};
  const pointers = new Map();
  let view = 'iso', azimuth = views.iso[0], elevation = views.iso[1], pan = false;
  let size, frame, priorFrame;
  let target = {zoom:1,x:0,y:0}, state = {...target};
  const viewport = () => svg.getBoundingClientRect();

  function schedule() {
    if (frame === undefined) frame = requestAnimationFrame(draw);
  }

  function draw(time) {
    frame = undefined;
    if (!size?.width || !size.height) { priorFrame = undefined; return; }
    const elapsed = priorFrame === undefined ? 16 : time - priorFrame;
    const ease = reducedMotion.matches || pointers.size ? 1 : 1 - Math.exp(-elapsed/48);
    for (const key of Object.keys(target)) {
      const delta = target[key] - state[key];
      const tolerance = key === 'zoom' ? .0005 : .08;
      state[key] = Math.abs(delta) <= tolerance ? target[key] : state[key] + delta * ease;
    }
    svg.setAttribute('viewBox',`0 0 ${size.width} ${size.height}`);
    svg.dataset.view = view;
    renderScene(svg,model,viewBasis(azimuth,elevation),view,options,size,state,arrow);
    zoomLabel.textContent = `${Math.round(state.zoom*100)}%`;
    const moving = Object.keys(target).some(key => target[key] !== state[key]);
    priorFrame = moving ? time : undefined;
    if (moving) schedule();
  }

  function preset(value) {
    [azimuth,elevation] = views[value];
    select.value = view = value;
    target = {zoom:1,x:0,y:0};
    state = {...target};
    schedule();
  }

  function zoomBy(factor, anchor) {
    const zoom = clamp(target.zoom * factor,.55,8);
    if (anchor && size) {
      const ratio = zoom/target.zoom;
      const [x,y] = anchor;
      target.x = x + (target.x-x)*ratio;
      target.y = y + (target.y-y)*ratio;
    }
    target.zoom = zoom;
    schedule();
  }

  function rotate(dx,dy) {
    azimuth -= dx;
    elevation = clamp(elevation + dy, -Math.PI/2, Math.PI/2);
    view = select.value = 'custom';
    schedule();
  }

  const resize = new ResizeObserver(() => {
    const {width,height} = viewport();
    size = {width,height};
    schedule();
  });
  resize.observe(svg);
  on(select,'change',() => {
    if (Object.hasOwn(views,select.value)) preset(select.value);
  });

  function fullscreenLabel() {
    const active = document.fullscreenElement === host || host.classList.contains('t3-full');
    fullButton.setAttribute('aria-pressed',String(active));
    fullButton.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
  }
  async function fullscreen() {
    if (document.fullscreenElement === host) {
      await document.exitFullscreen();
    } else if (host.classList.contains('t3-full')) {
      host.classList.remove('t3-full');
    } else {
      try {
        if (!host.requestFullscreen) throw new Error('Fullscreen unavailable');
        await host.requestFullscreen();
      } catch {
        host.classList.add('t3-full');
      }
    }
    fullscreenLabel();
  }
  on(document,'fullscreenchange',fullscreenLabel);
  on(document,'keydown',event => {
    if (event.key === 'Escape' && host.classList.contains('t3-full')) {
      event.preventDefault();
      host.classList.remove('t3-full');
      fullscreenLabel();
    }
  }, {capture:true});

  on(toolbar,'click',event => {
    const button = event.target.closest('button');
    if (!button) return;
    const act = button.dataset.act;
    if (act === 'zoom-in') zoomBy(1.25);
    else if (act === 'zoom-out') zoomBy(.8);
    else if (act === 'reset') preset(view === 'custom' ? 'iso' : view);
    else if (act === 'fullscreen') void fullscreen();
    else if (act === 'pan') {
      pan = !pan;
      svg.classList.toggle('t3-panning',pan);
      button.setAttribute('aria-pressed',String(pan));
    } else if (Object.hasOwn(options,act)) {
      options[act] = !options[act];
      button.setAttribute('aria-pressed',String(options[act]));
      schedule();
    }
  });

  on(svg,'wheel',event => {
    event.preventDefault();
    const box = viewport();
    const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.height : 1;
    zoomBy(Math.exp(-clamp(event.deltaY*units,-160,160)*.0025), [
      event.clientX-box.left-box.width/2,event.clientY-box.top-box.height/2,
    ]);
  }, {passive:false});
  on(svg,'contextmenu',event => event.preventDefault());
  on(svg,'pointerdown',event => {
    if (pointers.size === 2 || (event.pointerType === 'mouse' && event.button > 2)) return;
    svg.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,[event.clientX,event.clientY]);
  });
  on(svg,'pointermove',event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const next = [event.clientX,event.clientY];
    const [dx,dy] = sub(next,previous);
    pointers.set(event.pointerId,next);
    if (pointers.size === 2) {
      const other = [...pointers].find(([id]) => id !== event.pointerId)[1];
      const before = Math.max(4,length(sub(other,previous)));
      const after = Math.max(4,length(sub(other,next)));
      const [cx,cy] = mix(other,previous,.5);
      const box = viewport();
      zoomBy(after/before,[cx-box.left-box.width/2,cy-box.top-box.height/2]);
      target.x += dx/2;
      target.y += dy/2;
    } else if (pan || event.shiftKey || (event.buttons & 6)) {
      target.x += dx;
      target.y += dy;
      schedule();
    } else {
      rotate(dx*.008,dy*.008);
    }
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    on(svg,type,event => pointers.delete(event.pointerId));
  }
  on(svg,'keydown',event => {
    const directions = {ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
    const direction = directions[event.key];
    if (direction) {
      if (pan || event.shiftKey) {
        target.x -= direction[0]*18;
        target.y -= direction[1]*18;
        schedule();
      } else rotate(direction[0]*.12,direction[1]*.12);
    } else if (event.key === '+' || event.key === '=') zoomBy(1.25);
    else if (event.key === '-') zoomBy(.8);
    else if (event.key === 'Home') preset('iso');
    else return;
    event.preventDefault();
  });

  svg.setAttribute('aria-label',`${name}. Drag or use arrow keys to rotate. Use plus and minus to zoom.`);
  return () => {
    abort.abort();
    resize.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (document.fullscreenElement === host) document.exitFullscreen().catch(()=>{});
  };
}

const toggle = (act,label,on) => `<button type="button" data-act="${act}" aria-pressed="${on}">${label}</button>`;
const button = (act,label,title=label) => `<button type="button" data-act="${act}" aria-label="${title}">${label}</button>`;

class FinalView extends HTMLElement {
  static observedAttributes = ['module','question','presentation'];

  connectedCallback() { this.setup(); }
  attributeChangedCallback() { if (this.isConnected) this.setup(); }
  disconnectedCallback() { this.close(); }

  close() {
    this.cleanup?.();
    this.cleanup = undefined;
    this.container?.classList.remove('t3-active');
    this.removeAttribute('data-open');
    this.querySelector('.t3-host')?.remove();
    for (const item of this.querySelectorAll('[data-mode]')) {
      item.setAttribute('aria-pressed',String(item.dataset.mode === '2d'));
    }
  }

  setup() {
    this.close();
    this.replaceChildren();
    this.container = this.parentElement;
    const entry = models.get(`${this.getAttribute('module')}:${this.getAttribute('question')}`);
    this.hidden = !entry;
    if (!entry) return;
    if (this.getAttribute('presentation') === 'standalone') {
      this.open(entry);
      return;
    }
    const switcher = document.createElement('nav');
    switcher.className = 't3-switch';
    switcher.setAttribute('aria-label','Drawing view');
    switcher.innerHTML = '<button type="button" data-mode="2d" aria-pressed="true">2D Drawing</button><button type="button" data-mode="3d" aria-pressed="false">Final 3D View</button>';
    switcher.addEventListener('click',event => {
      const mode = event.target.closest('button')?.dataset.mode;
      if (mode === '2d') this.close();
      if (mode === '3d' && !this.hasAttribute('data-open')) this.open(entry);
    });
    this.append(switcher);
  }

  open(entry) {
    const model = entry.build();
    const marker = `t3-arrow-${++instance}`;
    const host = document.createElement('section');
    host.className = 't3-host';
    host.setAttribute('aria-label','Final 3D view');
    host.innerHTML = `
      <div class="t3-stage">
        <svg role="img" tabindex="0">
          <defs><marker id="${marker}" viewBox="0 0 7 7" refX="6" refY="3.5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z"/></marker></defs>
          <g class="t3-art"></g>
        </svg>
        <img class="t3-mark" alt="" draggable="false" src="${logo.href}">
      </div>
      <div class="t3-tools" role="group" aria-label="Model controls">
        <select aria-label="Projection view">
          <option value="iso">3D orientation</option><option value="front">Front elevation</option>
          <option value="top">Top plan</option><option value="right">Right side</option>
          <option value="custom" hidden>Custom angle</option>
        </select>
        <div class="t3-zoom">${button('zoom-out','−','Zoom out')}<output aria-label="Zoom level">100%</output>${button('zoom-in','+','Zoom in')}</div>
        ${toggle('pan','Pan',false)}${toggle('labels','Labels',true)}${toggle('hidden','Hidden edges',true)}
        ${toggle('planes','HP / VP',true)}${toggle('solid','Faces',true)}
        ${button('reset','Reset view')}${toggle('fullscreen','Fullscreen',false)}
      </div>
      <div class="t3-facts">
        <span>${model.dimensionText}</span>
        <span>${model.contactText}</span>
        <span>${model.axisName} <strong>${formatNumber(model.hpAngle)}° to HP · ${formatNumber(model.vpAngle)}° to VP</strong></span>
        ${model.extraText ? `<span>${model.extraText}</span>` : ''}
      </div>`;
    this.dispatchEvent(new CustomEvent('trace-3d-open',{bubbles:true}));
    this.setAttribute('data-open','');
    this.container?.classList.add('t3-active');
    for (const item of this.querySelectorAll('[data-mode]')) {
      item.setAttribute('aria-pressed',String(item.dataset.mode === '3d'));
    }
    this.append(host);
    this.cleanup = inspect(host,model,entry.name);
  }
}

customElements.define('trace-final-view',FinalView);
document.querySelector('#trace-free')?.addEventListener('close',() => document.querySelector('#tf-final-view')?.close());

const picker = document.querySelector('#t3-validation-pick');
if (picker) {
  const statements = document.querySelectorAll('[data-statement]');
  const viewer = document.querySelector('trace-final-view');
  const update = () => {
    for (const statement of statements) statement.hidden = statement.dataset.statement !== picker.value;
    viewer.setAttribute('question',picker.value);
  };
  const value = new URLSearchParams(location.search).get('q');
  if (models.has(`II:${value}`)) picker.value = value;
  picker.addEventListener('change',() => {
    const url = new URL(location.href);
    url.searchParams.set('q',picker.value);
    history.replaceState(null,'',url);
    update();
  });
  update();
}
