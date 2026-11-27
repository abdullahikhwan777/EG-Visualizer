(() => {
'use strict';
const registry=new Set([1,2,3,4,5]);
let engine;
function loadEngine(){
  if(!engine)engine=(async()=>{
    const urls=[];
    function moduleURL(source){const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'})); urls.push(url);return url;}
    try{
      if(!document.querySelector('#trace-three-source')) {
 const [T,{OrbitControls}]=await Promise.all([import(new URL('./vendor/three-r160.mjs',document.baseURI).href),import(new URL('./vendor/orbit-r160.mjs',document.baseURI).href)]);return {T,OrbitControls};
} const three=moduleURL(document.querySelector('#trace-three-source').textContent);
      const orbit=moduleURL(document.querySelector('#trace-orbit-source').textContent.replace("from 'three'","from '"+three+"'"));
      const [T,{OrbitControls}]=await Promise.all([import(three),import(orbit)]);
      return {T,OrbitControls};
    }finally{urls.forEach(url=>URL.revokeObjectURL(url));}
  })().catch(e=>{engine=null;throw e});
  return engine;
}
// Engineering coordinates use x across the sheet, y above HP and z in front of VP.
const sectionHatch=[[-8.388166666666669, 14.528716666666668, -4.14551666666667, 10.286083333333332], [-11.285933333333332, 19.547816666666666, -2.8006499999999996, 11.062533333333334], [-14.183716666666669, 24.566916666666668, -1.4557833333333292, 11.838983333333337], [-17.081483333333335, 29.586016666666666, -0.1109333333333306, 12.615450000000001], [-19.97926666666667, 34.6051, 1.2339333333333304, 13.391900000000001], [2.578800000000001, 14.168366666666666, -19.382733333333334, 36.12988333333333], [3.923666666666662, 14.944816666666668, -18.037866666666662, 36.90635], [5.26851666666667, 15.721283333333332, -16.693, 37.68279999999999], [6.613383333333331, 16.497733333333333, -15.348133333333331, 38.45925], [7.958250000000002, 17.274183333333337, -14.00326666666667, 39.23571666666667], [9.303116666666662, 18.05065, -12.658416666666662, 40.012166666666666], [10.647983333333324, 18.8271, -11.313550000000001, 40.78863333333334], [11.992833333333332, 19.603566666666666, -9.968683333333331, 41.56508333333333], [13.337700000000003, 20.380016666666666, -8.62381666666667, 42.341550000000005], [14.682566666666673, 21.15648333333333, -7.278949999999999, 43.117999999999995], [16.027433333333324, 21.932933333333335, -5.934100000000001, 43.894450000000006], [17.372299999999996, 22.709383333333335, -4.58923333333333, 44.67091666666666], [18.717150000000004, 23.48585, -3.2443666666666693, 45.447366666666674], [20.062016666666675, 24.2623, -1.8994999999999986, 46.223833333333324], [18.515600000000006, 27.930050000000005, -0.5546333333333374, 47.000283333333336], [15.61781666666667, 32.94915, 0.7902166666666707, 47.77674999999999], [12.720033333333333, 37.968250000000005, 2.135083333333332, 48.553200000000004], [9.82226666666667, 42.98734999999999, 3.4799500000000023, 49.329649999999994], [6.924483333333332, 48.006449999999994, 4.824816666666663, 50.10611666666667]];
// Engineering coordinates: x across the sheet, y above HP, z in front of VP.
function buildSectionCube(T) {
  const point = (x, y, z) => new T.Vector3(x, y, z);
  const edge = 30;
  const height = edge / 2 - 5;
  const radians = Math.PI / 6;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const points = {};
  // The plan runs from the far-left corner d to c, then b and a.
  const corners = [
    ['4', 'q', -15, -15], ['3', 's', 15, -15],
    ['2', 'r', 15, 15], ['1', 'p', -15, 15]
  ];
  for (const [base, cut, u, w] of corners) {
    const x = u*cos - w*sin, z = 30 + u*sin + w*cos;
    points[base] = point(x, 0, z);
    points[cut] = point(x, height, z);
  }
  return {
    points, faces: ['4321','qsrp','43sq','32rs','21pr','14qp'],
    centre: point(0,height/2,30), diameter: Math.hypot(edge,edge,height),
    dimensions: [['r','s',point(5,3,0),'30 mm'],['1','p',point(-5,0,0),'10 mm']],
    angles: [[points.q,point(1,0,0),point(cos,0,sin),9,'face / VP']],
    hatch: sectionHatch.map(([x1,z1,x2,z2])=>[point(x1,height,z1),point(x2,height,z2)])
  };
}

function buildModel(T, id) {
  if(id==="section-III-1")return buildSectionCube(T);
  const v=(x,y,z)=>new T.Vector3(x,y,z), add=(a,b)=>a.clone().add(b);
  const midpoint=(a,b)=>a.clone().lerp(b,.5);
  let points={}, faces, dimensions=[], angles=[], axis, centre, diameter;
  if(id<=2){
    const r=30/Math.SQRT2;
    const base=id===1?[[-r,0],[0,r],[r,0],[0,-r]]:[[-15,-15],[-15,15],[15,15],[15,-15]];
    const t=id===1?Math.PI-Math.atan2(60,r):Math.atan2(15,60);
    const rotate=(x,h,d)=>v(x*Math.cos(t)+h*Math.sin(t),h*Math.cos(t)-x*Math.sin(t),d);
    base.forEach(([x,d],i)=>points['abcd'[i]]=rotate(x,0,d));
    points.p=rotate(0,0,0);points.o=rotate(0,60,0);
    const lift=-points.c.y;
    Object.values(points).forEach(p=>p.y+=lift);
    faces=['abcd','abo','bco','cdo','dao'];
    axis=['p','o'];centre=midpoint(points.p,points.o);diameter=66;
    dimensions=[['a','b',v(-5,3,2),'30 mm'],['p','o',v(0,0,-9),'60 mm']];
    const direction=points.o.clone().sub(points.p).normalize();
    angles.push([points.p,v(1,0,0),direction,14,'axis / HP']);
    if(id===2)angles.push([points.c,v(-1,0,0),v(0,1,0),7,'face / HP']);
  }else{
    const s=id===5?60/Math.sqrt(3):40;
    let u,w,h;
    if(id===3){
      points['1']=v(0,0,0);
      u=v(s/Math.sqrt(6),s/Math.sqrt(3),s/Math.sqrt(2));
      w=v(u.x,u.y,-u.z);h=v(-2*u.x,u.y,0);
      points['2']=add(points['1'],u);points['4']=add(points['1'],w);points['3']=add(points['2'],w);
    }else{
      points['3']=v(0,0,0);
      u=v(s/Math.sqrt(2),s/Math.sqrt(6),s/Math.sqrt(3));
      w=v(-u.x,u.y,u.z);h=v(0,2*u.y,-u.z);
      points['2']=add(points['3'],u);points['4']=add(points['3'],w);points['1']=add(points['2'],w);
    }
    'abcd'.split('').forEach((k,i)=>points[k]=add(points[i+1],h));
    faces=['abcd','1234','ab21','bc32','cd43','da14'];
    axis=['1','c'];centre=midpoint(points['1'],points.c);points.p=centre;diameter=s*Math.sqrt(3);
    dimensions.push(['a','b',v(0,6,2),id===5?'20√3 mm':'40 mm']);
    if(id===5)dimensions.push(['1','c',v(7,3,0),'60 mm']);
    const tip=id===3?points['1']:points.c;
    angles.push([tip,id===3?v(1,0,0):v(0,1,0),id===3?v(0,1,0):v(0,0,1),9,id===3?'diagonal / HP':'diagonal / VP']);
  }
  return {points,faces,axis,centre,dimensions,angles,diameter};
}

function scene(engine,host,id){
  const {T,OrbitControls}=engine,{points,faces,axis,centre,dimensions,angles,diameter,hatch}=buildModel(T,id);
  const camera=new T.OrthographicCamera(-1,1,1,-1,.01,4000);
  const svg=host.querySelector('svg'),tool=host.querySelector('.t3-tools');
  const controls=new OrbitControls(camera,svg);
  controls.minZoom=.2;controls.maxZoom=12;
  let labels=true,planes=true,wire=false,frame=0,disposed=false,width,height;
  const col='#272B28',sage='#65765D',ivory='#F7F6F0',soft='#DCDDD2',green='#C6D3AC';
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  const faceData=faces.map(names=>{
    const vertices=[...names].map(n=>points[n]);
    const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
    if(normal.dot(vertices[0].clone().sub(centre))<0)normal.negate();
    return {names,vertices,normal};
  });
  const edges=new Map();
  faceData.forEach((face,i)=>[...face.names].forEach((a,j)=>{
    const b=face.names[(j+1)%face.names.length],key=[a,b].sort().join('');
    if(!edges.has(key))edges.set(key,{a,b,faces:[]});edges.get(key).faces.push(i);
  }));
  function preset(name){
    const dirs={Iso:[1,1,1],Front:[0,0,1],Top:[0,1,0],Side:[1,0,0]};
    controls.target.copy(centre);camera.up.set(0,1,0);
    camera.position.copy(centre).add(v(...dirs[name]).normalize().multiplyScalar(500));
    camera.zoom=1;camera.updateProjectionMatrix();controls.update();schedule();
  }
  function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(draw);}
  function draw(){
    frame=0;if(!width||!height)return;
    camera.updateMatrixWorld();
    const project=p=>{const q=p.clone().project(camera);return [(q.x+1)*width/2,(1-q.y)*height/2]};
    const dir=camera.getWorldDirection(v(0,0,0)).negate();
    const visible=faceData.map(f=>f.normal.dot(dir)>1e-7);
    const out=[],notes=[];
    const path=(ps,attr)=>out.push('<path d="M'+ps.map(p=>project(p).join(',')).join(' L')+'" '+attr+'/>');
    const line=(a,b,color=col,dash='',w=1.4)=>path([a,b],'fill="none" stroke="'+color+'" stroke-width="'+w+'" stroke-dasharray="'+dash+'"');
    const fill=(ps,c,opacity=1)=>path([...ps,ps[0]],'fill="'+c+'" opacity="'+opacity+'"');
    const note=(p,s)=>labels&&notes.push([project(p),s]);
    const span=diameter*.72,back=hatch?0:Math.min(...Object.values(points).map(p=>p.z))-11;
    const left=centre.x-span,right=centre.x+span,far=back+span*1.7;
    if(planes){
      const L=v(left,0,back),R=v(right,0,back);
      fill([L,R,v(right,0,far),v(left,0,far)],green,.28);
      fill([L,R,v(right,span*1.4,back),v(left,span*1.4,back)],soft,.39);
      line(L,R,sage,'',1);note(v(right-5,0,back),'XY');note(v(left+6,0,far-4),'HP');note(v(left+6,span*1.25,back),'VP');
    }
    if(!wire)faceData.forEach((f,i)=>{if(visible[i]){fill(f.vertices,ivory);fill(f.vertices,green,.25+.55*Math.abs(f.normal.dot(v(.23,.9,.35))));}});
    if(hatch && !wire && visible[1]){
      for(const [a,b] of hatch)line(a,b,sage,'',1);
    }
    for(const hidden of [true,false])for(const edge of edges.values()){
      if(edge.faces.every(i=>!visible[i])===hidden)line(points[edge.a],points[edge.b],hidden?sage:col,hidden?'4 4':'',hidden?1:1.65);
    }
    if(axis)line(points[axis[0]],points[axis[1]],sage,'9 3 2 3',1);
    if(labels){
      for(const [a,b,offset,value] of dimensions){
        const A=points[a].clone().add(offset),B=points[b].clone().add(offset);
        line(points[a],A,sage,'',.8);line(points[b],B,sage,'',.8);
        const [ax,ay]=project(A),[bx,by]=project(B);
        if(Math.hypot(bx-ax,by-ay)>14){
          path([A,B],'stroke="'+sage+'" fill="none" marker-start="url(#t3-arrow)" marker-end="url(#t3-arrow)"');
          note(A.clone().lerp(B,.5),value);
        }
      }
      for(const [origin,u,w,r,title] of angles){
        const theta=u.angleTo(w),perp=w.clone().addScaledVector(u,-u.dot(w)).normalize();
        const at=t=>origin.clone().addScaledVector(u,r*Math.cos(t)).addScaledVector(perp,r*Math.sin(t));
        line(origin,at(0),sage,'2 3',1);line(origin,at(theta),sage,'2 3',1);
        path(Array.from({length:25},(_,i)=>at(theta*i/24)),'fill="none" stroke="'+sage+'"');
        note(at(theta/2),title+' '+Number((theta*180/Math.PI).toFixed(3))+'°');
      }
      if(id===1)note(points.c.clone().lerp(points.o,.52),'co on HP · axis ∥ VP');
      if(id===2)note(points.c.clone().lerp(points.d,.5),'cd on HP · ⟂ VP');
      if(id>=4)note(points.c.clone().lerp(points['1'],.29),'1c ∥ HP');
      const groups=[];
      for(const [key,p] of Object.entries(points)){
        const xy=project(p),g=groups.find(t=>Math.hypot(xy[0]-t.xy[0],xy[1]-t.xy[1])<1.5);
        if(g)g.items.push([key,p]);else groups.push({xy,items:[[key,p]]});
      }
      groups.forEach(g=>{g.items.sort((a,b)=>b[1].dot(dir)-a[1].dot(dir));const names=g.items.map(t=>t[0]);notes.unshift([g.xy,names[0]+names.slice(1).map(n=>'('+n+')').join('')]);});
    }
    const taken=[];
    for(const [[x,y],s] of notes){
      if(x<0||y<0||x>width||y>height)continue;
      const w=Math.max(12,s.length*7.1),h=17;
      let X,Y;
      for(let k=0;k<32;k++){
        const angle=k*Math.PI/4-Math.PI/3,rad=14+12*Math.floor(k/8);
        X=Math.min(width-w-3,Math.max(3,x+rad*Math.cos(angle)-(Math.cos(angle)<0?w:0)));
        Y=Math.min(height-4,Math.max(h,y+rad*Math.sin(angle)));
        if(taken.every(b=>X+w+3<b[0]||X>b[0]+b[2]+3||Y+3<b[1]-h||Y-h>b[1]+3))break;
      }
      taken.push([X,Y,w]);const tx=Math.max(X,Math.min(x,X+w));
      if(Math.hypot(tx-x,Y-5-y)>21)out.push('<path d="M'+x+','+y+' L'+tx+','+(Y-5)+'" stroke="'+sage+'" opacity=".65" stroke-width=".7"/>');
      out.push('<text x="'+X+'" y="'+Y+'" fill="'+col+'" stroke="'+ivory+'" stroke-width="3" paint-order="stroke">'+s+'</text>');
    }
    svg.querySelector('g').innerHTML=out.join('');
  }
  const resize=new ResizeObserver(()=>{
    ({width,height}=svg.getBoundingClientRect());if(!width||!height)return;
    const half=diameter*.74,aspect=width/height;
    camera.left=-half*Math.max(1,aspect);camera.right=-camera.left;camera.top=half*Math.max(1,1/aspect);camera.bottom=-camera.top;camera.updateProjectionMatrix();schedule();
  });
  resize.observe(svg);
  controls.addEventListener('change',schedule);
  tool.onchange=e=>preset(e.target.value);
  tool.onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    const key=b.dataset.act;
    if(key==='reset'){preset('Iso');tool.querySelector('select').value='Iso';}
    if(key==='in'||key==='out'){camera.zoom=T.MathUtils.clamp(camera.zoom*(key==='in'?1.25:.8),.2,12);camera.updateProjectionMatrix();}
    if(key==='pan'){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);controls.mouseButtons.LEFT=on?T.MOUSE.PAN:T.MOUSE.ROTATE;controls.touches.ONE=on?T.TOUCH.PAN:T.TOUCH.ROTATE;}
    if(key==='labels')b.setAttribute('aria-pressed',labels=!labels);
    if(key==='planes')b.setAttribute('aria-pressed',planes=!planes);
    if(key==='wire')b.setAttribute('aria-pressed',wire=!wire);
    if(key==='full'){
      if(document.fullscreenElement===host)document.exitFullscreen();
      else if(host.classList.contains('t3-full'))host.classList.remove('t3-full');
      else if(host.requestFullscreen)host.requestFullscreen().catch(()=>host.classList.add('t3-full'));
      else host.classList.add('t3-full');
    }
    schedule();
  };
  preset('Iso');
  return ()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();tool.onclick=tool.onchange=null;host.classList.remove('t3-full');};
}
class FinalView extends HTMLElement{
  static get observedAttributes(){return ['question'];}
  connectedCallback(){this.owner=this.parentElement;this.setup();}
  attributeChangedCallback(){if(this.isConnected)this.setup();}
  disconnectedCallback(){this.close();}
  close(){
    this.ticket=(this.ticket||0)+1;this.cleanup?.();this.cleanup=null;
    (this.parentElement||this.owner)?.classList.remove('t3-active');
    this.removeAttribute('data-open');
    this.querySelector('.t3-host')?.remove();
    this.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode==='2'));
  }
  setup(){
    this.close();this.replaceChildren();
    const key=this.getAttribute('question');
    const section=this.id==='tf-final-view' && key==='section-III-1';
    const id=section?key:Number(key);if(!section && !registry.has(id)){this.hidden=true;return;}
    this.hidden=false;
    this.innerHTML='<nav class="t3-switch" aria-label="Drawing view"><button type="button" data-mode="2" aria-pressed="true">2D Drawing</button><button type="button" data-mode="3" aria-pressed="false">Final 3D View</button></nav>';
    this.querySelector('nav').onclick=e=>{const mode=e.target.closest('button')?.dataset.mode;if(mode==='2')this.close();if(mode==='3'&&!this.hasAttribute('data-open'))this.open(id);};
  }
  async open(id){
    const token=++this.ticket;this.dispatchEvent(new CustomEvent('trace-3d-open',{bubbles:true}));
    this.setAttribute('data-open','');this.parentElement.classList.add('t3-active');
    this.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode==='3'));
    const host=document.createElement('section');host.className='t3-host';this.append(host);
    const button=(key,name,toggle)=>'<button type="button" data-act="'+key+'" '+(toggle===undefined?'':'aria-pressed="'+toggle+'"')+'>'+name+'</button>';
    host.innerHTML='<div class="t3-stage"><svg role="img" aria-label="Interactive final solid with engineering annotations"><defs><marker id="t3-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill="#65765D"/></marker></defs><g></g></svg><img class="t3-mark" alt=""><span class="t3-status" role="status">Opening 3D view…</span></div><div class="t3-tools"><select aria-label="Projection view"><option value="Iso">Isometric view</option><option value="Front">Front view</option><option value="Top">Top view</option><option value="Side">Side view</option></select>'+button('out','−')+button('in','+')+button('pan','Pan',false)+button('labels','Labels',true)+button('planes','Planes',true)+button('wire','Wireframe',false)+button('reset','Reset view')+button('full','Fullscreen')+'</div>';
    host.querySelector('.t3-mark').src='./assets/image-a02d58579a0a.png';
    host.querySelector('[data-act=in]').ariaLabel='Zoom in';host.querySelector('[data-act=out]').ariaLabel='Zoom out';
    try{
      const api=await loadEngine();if(token!==this.ticket||!host.isConnected)return;
      this.cleanup=scene(api,host,id);host.querySelector('.t3-status').remove();
    }catch(error){if(host.isConnected)host.querySelector('.t3-status').textContent='3D view could not open. Select 2D Drawing and try again.';console.error(error);}
  }
}
customElements.define('trace-final-view',FinalView);
document.querySelector('#trace-free')?.addEventListener('close',()=>document.querySelector('#tf-final-view')?.close());
})();
