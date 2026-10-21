/*
 * Tu equipo IA: simulación del CEO digital.
 * Vista esquema (CEO + agentes + herramientas) y vista oficina al pulsar el
 * CEO, con zoom de cámara. El motor solo corre con la demo en pantalla y la
 * pestaña visible; fuera de eso se para todo (rAF, intervalos y CSS).
 */
(()=>{
const root=document.getElementById('cd-equipo');
if(!root)return;
const NS='http://www.w3.org/2000/svg';
const $=s=>root.querySelector(s);
const svg=$('#cd-svg'), logEl=$('#cd-log'), scene=$('#cd-scene');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const CL=['Laura','Marcos','Ana','Javi','Lucía','Pedro','Carmen','Sergio','Elena','Raúl'];
const EMP=['Talleres Martín','Clínica Sanz','Hotel Mar Azul','Construcciones Pérez','Bodega Las Viñas','Grupo Levante'];
const PROV=['Distribuciones Sur','Papelería Gómez','Hnos. Ruiz','Logística Vega'];
const DIAS=['lunes','martes','miércoles','jueves','viernes'];
let inv=2040, pre=318;
const hh=()=>`${rnd(9,17)}:${pick(['00','15','30','45'])}`;
const eur=n=>n.toLocaleString('es-ES')+' €';

const DEP=['Operaciones','Comercial','Administración y finanzas'];
const AG=[
 {d:0,n:'Atención',r:'responde clientes',t:'WhatsApp',in:'Mensaje nuevo por WhatsApp',doing:'Contestando a cliente',ic:'M4 5h16v11H9l-5 4z M8 10h8 M8 13h5',msg:()=>`Respondió a ${pick(CL)}: ${pick(['horario y precios','disponibilidad','cómo hacer un pedido'])}`},
 {d:0,n:'Ventas',r:'cualifica leads',t:'Formulario web',in:'Lead nuevo desde la web',doing:'Cualificando lead',ic:'M3 17l6-6 4 4 8-8 M15 7h6v6',msg:()=>`Lead de ${pick(CL)} cualificado en 2 min`,next:2},
 {d:0,n:'Agenda',r:'reserva citas',t:'Calendario',in:'Petición de cita',doing:'Buscando hueco libre',ic:'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5',msg:()=>`Cita reservada: ${pick(DIAS)} a las ${hh()}`,next:0},
 {d:0,n:'Facturación',r:'pasa facturas',t:'Excel / ERP',in:'Factura recibida',doing:'Leyendo factura',ic:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',msg:()=>`Factura #${++inv} leída y pasada al Excel`},
 {d:0,n:'Correo',r:'ordena el email',t:'Correo',in:'Email nuevo de proveedor',doing:'Clasificando email',ic:'M3 6h18v12H3z M3 6l9 7 9-7',msg:()=>`Pedido de ${pick(PROV)} clasificado`,next:3},
 {d:1,n:'Propuestas',t:'Documentos',in:'Oportunidad lista para propuesta',doing:'Redactando propuesta',msg:()=>`Propuesta para ${pick(EMP)} redactada y enviada`,next:7},
 {d:1,n:'Oportunidades',t:'CRM',in:'Actividad nueva en el CRM',doing:'Analizando el CRM',msg:()=>`${pick(EMP)} reabrió el presupuesto: oportunidad marcada`,next:5},
 {d:1,n:'Presentaciones',t:'Diapositivas',in:'Reunión comercial mañana',doing:'Montando diapositivas',msg:()=>`Presentación de ${rnd(7,12)} diapositivas lista para ${pick(EMP)}`},
 {d:2,n:'Reporting',t:'Panel de datos',in:'Cierre del día',doing:'Cruzando datos',msg:()=>`Informe de ${pick(['ventas','caja','actividad'])} enviado al dueño`},
 {d:2,n:'Presupuestos',t:'Excel',in:'Solicitud de presupuesto',doing:'Calculando importes',msg:()=>`Presupuesto P-${++pre} para ${pick(EMP)}: ${eur(rnd(4,48)*50)}`},
 {d:2,n:'Costes',t:'Contabilidad',in:'Factura de proveedor nueva',doing:'Comparando costes',msg:()=>`${pick(PROV)} subió un ${rnd(3,9)} %: aviso enviado`,next:8},
];
// nodos del esquema: 5 de operaciones + 2 departamentos
const RN=[0,1,2,3,4,
 {dept:1,n:'Comercial',r:'3 agentes IA',t:'CRM',ic:'M4 8h16v11H4z M9 8V5h6v3 M4 13h16'},
 {dept:2,n:'Admin. y finanzas',r:'3 agentes IA',t:'Contabilidad',ic:'M3 10l9-6 9 6 M5 10v8 M10 10v8 M14 10v8 M19 10v8 M3 20h18'}];
const nodeOf=i=>AG[i].d===0?i:(AG[i].d===1?5:6);
const busy=AG.map(()=>false);
function el(tag,at,p){const e=document.createElementNS(NS,tag);for(const k in at)e.setAttribute(k,at[k]);if(p)p.appendChild(e);return e}
function txt(p,at,s){const t=el('text',at,p);t.textContent=s;return t}

let N, gP, packets=[], view='ring', moving=false;
const narrow=()=>(scene.clientWidth||760)<560;
function flush(){packets.forEach(p=>{p.g.remove();p.res()});packets=[]}
function setVB(a){svg.setAttribute('viewBox',a.join(' '))}

/* ---------- Vista esquema ---------- */
function buildRing(){
  const c=narrow();
  // En estrecho, el centro sube y queda hueco abajo para el aviso "Pulsa el CEO";
  // los radios evitan que las herramientas laterales tapen a su agente.
  const W=c?400:760,H=c?680:540,cx=W/2,cy=c?320:H/2;
  const ar=c?[95,160]:[210,158], tr=c?[150,305]:[318,236];
  const S={c,ceo:c?40:52,ag:c?20:25,pw:c?92:128,ph:c?24:28,fs:c?8.5:11,ic:c?.8:.95};
  const gL=el('g',{},svg),gT=el('g',{},svg),gA=el('g',{},svg),gC=el('g',{},svg);gP=el('g',{},svg);
  const nodes=[],tools=[];
  RN.forEach((nd,k)=>{
    const a=typeof nd==='number'?AG[nd]:nd;
    const an=(-90+k*360/RN.length)*Math.PI/180, co=Math.cos(an), si=Math.sin(an);
    const A={x:cx+ar[0]*co,y:cy+ar[1]*si}, T={x:cx+tr[0]*co,y:cy+tr[1]*si};
    el('line',{x1:A.x,y1:A.y,x2:T.x,y2:T.y,class:'cd-ln cd-ln--dash'},gL);
    el('line',{x1:A.x,y1:A.y,x2:cx,y2:cy,class:'cd-ln'},gL);
    const tg=el('g',{class:'cd-tool'},gT);
    el('rect',{x:T.x-S.pw/2,y:T.y-S.ph/2,width:S.pw,height:S.ph,rx:S.ph/2},tg);
    el('circle',{class:'cd-dot',cx:T.x-S.pw/2+12,cy:T.y,r:2.5},tg);
    txt(tg,{x:T.x+5,y:T.y+S.fs*.36,'text-anchor':'middle','font-size':S.fs},a.t);
    T.el=tg;tools.push(T);
    const ag=el('g',{class:'cd-ag'},gA), R=S.ag;
    if(nd.dept){
      el('rect',{class:'cd-stack',x:A.x-R+8,y:A.y-R-8,width:2*R,height:2*R,rx:R*.42},ag);
      el('rect',{class:'cd-stack',x:A.x-R+4,y:A.y-R-4,width:2*R,height:2*R,rx:R*.42},ag);
    }
    el('rect',{class:'cd-core',x:A.x-R,y:A.y-R,width:2*R,height:2*R,rx:R*.42},ag);
    const ring=el('rect',{class:'cd-ring',x:A.x-R-5,y:A.y-R-5,width:2*R+10,height:2*R+10,rx:R*.42+5,pathLength:100,'stroke-dasharray':100,'stroke-dashoffset':100},ag);
    el('path',{class:'cd-ico',d:a.ic,transform:`translate(${A.x-12*S.ic} ${A.y-12*S.ic}) scale(${S.ic})`},ag);
    if(nd.dept){el('circle',{class:'cd-badge',cx:A.x+R+6,cy:A.y-R-6,r:8},ag);txt(ag,{class:'cd-badge-t',x:A.x+R+6,y:A.y-R-2.6,'text-anchor':'middle'},'3')}
    const lf=c?11:13; let lx,ly,ry,anchor='middle';
    // Etiquetas centradas bajo el nodo; en los de abajo, encima, para que
    // no choquen entre sí ni con su herramienta.
    if(c){lx=A.x;ly=A.y-R-(nd.dept?16:9);ry=0}
    else if(k===0){lx=A.x;ly=A.y+R+lf+8;ry=ly+15}
    else if(si>.5){lx=A.x;ly=A.y-R-24;ry=ly+15}
    else{lx=A.x;ly=A.y+R+lf+8;ry=ly+15}
    txt(gA,{class:'cd-lbl',x:lx,y:ly,'text-anchor':anchor,'font-size':lf},a.n);
    if(!c&&a.r)txt(gA,{class:'cd-role',x:lx,y:ry,'text-anchor':anchor,'font-size':10.5},a.r);
    A.el=ag;A.ring=ring;nodes.push(A);
  });
  const cg=el('g',{class:'cd-ceo',tabindex:0,role:'button','aria-label':'Entrar en la oficina del CEO digital'},gC), R=S.ceo;
  el('circle',{class:'cd-halo',cx,cy,r:R+34},cg);
  el('rect',{class:'cd-call',x:cx-R-9,y:cy-R-9,width:2*R+18,height:2*R+18,rx:R*.38+9},cg);
  el('rect',{class:'cd-edge',x:cx-R-9,y:cy-R-9,width:2*R+18,height:2*R+18,rx:R*.38+9},cg);
  el('rect',{class:'cd-beam',x:cx-R-9,y:cy-R-9,width:2*R+18,height:2*R+18,rx:R*.38+9,pathLength:100},cg);
  el('rect',{class:'cd-core',x:cx-R,y:cy-R,width:2*R,height:2*R,rx:R*.38},cg);
  txt(cg,{class:'cd-ceo-t',x:cx,y:cy+(c?4:6),'text-anchor':'middle','font-size':c?20:26},'CEO');
  txt(cg,{class:'cd-ceo-s',x:cx,y:cy+(c?18:24),'text-anchor':'middle','font-size':c?7.5:9},'DIGITAL');
  cg.addEventListener('click',e=>go('office',svgPoint(e)));
  cg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go('office')}});
  N={S,base:[0,0,W,H],ceo:{x:cx,y:cy},ceoEl:cg,
     ag:AG.map((_,i)=>nodes[nodeOf(i)]),tl:AG.map((_,i)=>tools[nodeOf(i)])};
}

/* ---------- Vista oficina ---------- */
function desk(g,cx,top,o){
  const d=el('g',{class:'cd-desk'},g);
  el('path',{class:'cd-person',d:`M${cx-40} ${top+80}Q${cx-40} ${top+58} ${cx-22} ${top+58}Q${cx-4} ${top+58} ${cx-4} ${top+80}Z M${cx-22} ${top+34}a10 10 0 1 1 0 20a10 10 0 1 1 0-20z`},d);
  if(o.boss)el('circle',{class:'cd-head-ring',cx:cx-22,cy:top+44,r:13.5},d);
  el('rect',{class:'cd-scr',x:cx+2,y:top+40,width:46,height:32,rx:3},d);
  const sg=el('g',{},d);
  [['cd-s1',30],['cd-s2',22],['cd-s3',26]].forEach(([s,w],j)=>el('rect',{class:'cd-sl '+s,x:cx+8,y:top+47+j*6,width:w,height:2.5,rx:1},sg));
  const prog=el('line',{class:'cd-prog',x1:cx+8,y1:top+67,x2:cx+42,y2:top+67,pathLength:100,'stroke-dasharray':100,'stroke-dashoffset':100},d);
  el('rect',{class:'cd-stand',x:cx+22,y:top+72,width:6,height:6},d);
  el('rect',{class:'cd-table',x:cx-(o.boss?62:50),y:top+78,width:o.boss?124:100,height:22,rx:3},d);
  txt(d,{class:'cd-dname',x:cx,y:top+118,'text-anchor':'middle'},o.name);
  const tg=el('g',{class:'cd-otool'},d);
  txt(tg,{x:cx,y:top+134,'text-anchor':'middle'},o.sub);
  const b=el('g',{class:'cd-bub'+(o.boss?' cd-boss':'')},d);
  const br=el('rect',{x:cx-50,y:top,width:100,height:22,rx:11},b);
  const bt=txt(b,{x:cx,y:top+15,'text-anchor':'middle'},'');
  return {x:cx,y:top+80,el:d,ring:prog,bub:{g:b,r:br,t:bt,cx},tool:{x:cx,y:top+128,el:tg}};
}
function buildOffice(){
  const c=narrow(), W=c?400:1000;
  let H,room,zones,step;
  if(!c){H=710;step=186;room={x:350,y:34,w:300,h:196};
    zones=[{d:0,x:20,w:430,cols:3,y0:262},{d:1,x:470,w:255,cols:2,y0:262},{d:2,x:745,w:235,cols:2,y0:262}];}
  else{H=1094;step=180;room={x:80,y:34,w:240,h:196};
    zones=[{d:0,x:10,w:380,cols:3,y0:258},{d:1,x:10,w:380,cols:3,y0:658},{d:2,x:10,w:380,cols:3,y0:878}];}
  const gZ=el('g',{},svg),gN=el('g',{},svg),gD=el('g',{},svg);gP=el('g',{},svg);
  // despacho
  el('rect',{class:'cd-room',x:room.x,y:room.y,width:room.w,height:room.h,rx:16},gZ);
  txt(gZ,{class:'cd-zlbl',x:room.x+4,y:room.y-10},'DESPACHO · CEO DIGITAL');
  const rcx=room.x+room.w/2;
  const boss=desk(gD,rcx,room.y+26,{boss:true,name:'CEO digital',sub:'orquestando al equipo'});
  const ag=[],tl=[];
  zones.forEach(z=>{
    const list=AG.map((a,i)=>i).filter(i=>AG[i].d===z.d), rows=Math.ceil(list.length/z.cols), cw=z.w/z.cols;
    const h=36+(rows-1)*step+140+8;
    el('rect',{class:'cd-zone',x:z.x,y:z.y0+10,width:z.w,height:h,rx:16},gZ);
    const zn=z.d===2?'Admin. y finanzas':DEP[z.d];
    txt(gZ,{class:'cd-zlbl',x:z.x+4,y:z.y0},`${zn.toUpperCase()} · ${list.length} AGENTES`);
    list.forEach((i,j)=>{
      const r=Math.floor(j/z.cols), inRow=Math.min(z.cols,list.length-r*z.cols), off=z.x+(z.w-inRow*cw)/2;
      const cx=off+cw*(j%z.cols+.5), top=z.y0+36+r*step;
      el('line',{class:'cd-net',x1:boss.x,y1:boss.y,x2:cx,y2:top+80},gN);
      const D=desk(gD,cx,top,{name:AG[i].n,sub:AG[i].t});
      ag[i]=D;tl[i]=D.tool;
    });
  });
  N={S:{c},base:[0,0,W,H],ceo:{x:boss.x,y:boss.y},ceoEl:boss.el,boss,ag,tl};
}

function build(){
  flush();svg.innerHTML='';
  view==='ring'?buildRing():buildOffice();
  setVB(N.base);
  // La vista esquema usa el aspect-ratio reservado en CSS; la oficina, el suyo.
  scene.style.aspectRatio=view==='ring'?'':`${N.base[2]} / ${N.base[3]}`;
}

/* ---------- Cámara ---------- */
function svgPoint(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return{x:q.x,y:q.y}}
function animVB(from,to,ms,ez){return new Promise(res=>{const t0=performance.now();
  (function f(t){const k=Math.min(1,Math.max(0,(t-t0)/ms)),e=ez(k);setVB(from.map((v,i)=>v+(to[i]-v)*e));k<1?requestAnimationFrame(f):res()})(t0)})}
const zoomBox=(p,b,s)=>{const w=b[2]/s,h=b[3]/s;return[p.x-w/2,p.y-h/2,w,h]};
const easeIn=k=>k*k*k, easeOut=k=>1-Math.pow(1-k,3);
function ui(){const o=view==='office';$('#cd-hint').hidden=o;$('#cd-back').hidden=!o;$('#cd-olbl').hidden=!o}
async function go(target,p){
  if(moving||view===target)return;moving=true;
  if(!RM){
    const b=N.base, run=animVB(b,zoomBox(p||N.ceo,b,10),850,easeIn);
    setTimeout(()=>svg.style.opacity=0,560);await run;
  }
  view=target;build();ui();
  if(!RM){
    const start=zoomBox(N.ceo,N.base,5);setVB(start);svg.style.opacity=1;
    await animVB(start,N.base,1100,easeOut);
  }else svg.style.opacity=1;
  moving=false;
  if(target==='ring')N.ceoEl.focus({preventScroll:true});else $('#cd-back').focus({preventScroll:true});
}
$('#cd-back').addEventListener('click',()=>go('ring'));

/* ---------- Motor de tareas ---------- */
function send(a,b,color,dur){
  return new Promise(res=>{
    if(RM){setTimeout(res,dur);return}
    const g=el('g',{},gP);
    const tr=el('line',{style:`stroke:${color}`,'stroke-width':2,'stroke-linecap':'round',opacity:.45},g);
    const h=el('circle',{r:N.S.c?2.8:3.2,style:`fill:${color}`},g);
    packets.push({a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},g,tr,h,t0:performance.now(),dur,res});
  });
}
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
function loop(t){
  if(!running)return;
  for(let i=packets.length-1;i>=0;i--){
    const p=packets[i],k=Math.min(1,Math.max(0,(t-p.t0)/p.dur)),e=ease(k),e2=ease(Math.max(0,k-.16));
    const x=p.a.x+(p.b.x-p.a.x)*e,y=p.a.y+(p.b.y-p.a.y)*e;
    p.h.setAttribute('cx',x);p.h.setAttribute('cy',y);
    p.tr.setAttribute('x1',p.a.x+(p.b.x-p.a.x)*e2);p.tr.setAttribute('y1',p.a.y+(p.b.y-p.a.y)*e2);p.tr.setAttribute('x2',x);p.tr.setAttribute('y2',y);
    if(k>=1){p.g.remove();packets.splice(i,1);p.res()}
  }
  raf=requestAnimationFrame(loop);
}
function say(B,s,cls,ttl){
  if(!B)return;const {g,r,t,cx}=B;
  clearTimeout(B.tm);t.textContent=s;
  let w=100;try{w=t.getComputedTextLength()+22}catch(e){}
  r.setAttribute('x',cx-w/2);r.setAttribute('width',w);
  g.classList.remove('cd-done');if(cls)g.classList.add(cls);g.classList.add('cd-show');
  if(ttl)B.tm=setTimeout(()=>g.classList.remove('cd-show'),ttl);
}
function flash(i,cls){const e=N.tl[i].el;e.classList.add(cls);setTimeout(()=>e.classList.remove(cls),900)}
function think(i){
  const e=N.ceoEl;e.classList.remove('cd-think');void e.getBBox();e.classList.add('cd-think');
  if(N.boss)say(N.boss.bub,'Asignando → '+AG[i].n,null,1500);
}
async function work(i,ms){
  const A=N.ag[i];A.cnt=(A.cnt||0)+1;A.el.classList.add('cd-busy');
  say(A.bub,AG[i].doing+'…');
  const R=A.ring;R.style.transition='none';R.style.strokeDashoffset=100;void R.getBBox();
  R.style.transition=`stroke-dashoffset ${ms}ms linear`;R.style.strokeDashoffset=0;
  await wait(ms);
  A.cnt=Math.max(0,A.cnt-1);if(!A.cnt)A.el.classList.remove('cd-busy');
  say(A.bub,'Hecho ✓','cd-done',1200);
}

let m=6*1440+3*60+12, tasks=37, hours=9.6;
const SEM=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const pad=n=>String(n).padStart(2,'0');
const now=()=>{const x=m%1440;return `${pad(Math.floor(x/60))}:${pad(x%60)}`};
function tick(){
  m=(m+1)%(7*1440);
  const d=Math.floor(m/1440),h=Math.floor(m%1440/60),open=d<5&&h>=9&&h<18;
  $('#cd-clock').textContent=now();
  $('#cd-shift').innerHTML=`${SEM[d]}<span class="cd-tag">${open?'abierto':'cerrado'}</span>`;
}
function log(who,msg,isCeo){
  const li=document.createElement('li');
  li.innerHTML=`<span class="cd-t">${now()}</span><span class="cd-who${isCeo?' cd-who--ceo':''}"></span><span class="cd-msg"></span>`;
  li.querySelector('.cd-who').textContent=who;
  li.querySelector('.cd-msg').textContent=msg;
  logEl.prepend(li);while(logEl.children.length>3)logEl.lastChild.remove();
}
function count(){tasks++;hours+=.1+Math.random()*.25;$('#cd-tasks').textContent=tasks;$('#cd-hours').textContent=hours.toFixed(1).replace('.',',')+' h'}

async function task(i,chained){
  busy[i]=true;const a=AG[i];
  if(!chained){
    flash(i,'cd-in');
    await send(N.tl[i],N.ag[i],'var(--cd-fg)',650);
    await send(N.ag[i],N.ceo,'var(--cd-fg)',650);
    think(i);log('CEO digital',`${a.in} → ${a.n}`,true);
  }
  await send(N.ceo,N.ag[i],'var(--cd-accent)',650);
  await work(i,1500+Math.random()*1100);
  await send(N.ag[i],N.tl[i],'var(--cd-done)',600);
  flash(i,'cd-out');log(a.n,a.msg());count();
  if(a.next!=null&&!busy[a.next]&&Math.random()<.55){
    await send(N.ag[i],N.ceo,'var(--cd-accent)',600);
    think(a.next);log('CEO digital',`${a.n} terminó → relevo a ${AG[a.next].n}`,true);
    busy[i]=false;task(a.next,true);return;
  }
  busy[i]=false;
}
function spawn(){
  if(moving)return;
  const idle=AG.map((_,i)=>i).filter(i=>!busy[i]);
  if(AG.length-idle.length<4)task(pick(idle));
}

/* ---------- Arranque perezoso y pausa ---------- */
let running=false, started=false, raf=0, iTick=0, iSpawn=0, pausedAt=0, onScreen=false;
function start(){
  if(running)return;running=true;
  root.classList.remove('cd-paused');
  // Los paquetes en vuelo retoman donde se quedaron, sin saltar al final.
  if(pausedAt){const d=performance.now()-pausedAt;packets.forEach(p=>p.t0+=d);pausedAt=0}
  raf=requestAnimationFrame(loop);
  iTick=setInterval(tick,90);
  iSpawn=setInterval(spawn,RM?3000:1100);
  if(!started){started=true;task(3);setTimeout(()=>task(6),500);setTimeout(()=>task(9),1000)}
}
function stop(){
  if(!running)return;running=false;
  pausedAt=performance.now();
  cancelAnimationFrame(raf);clearInterval(iTick);clearInterval(iSpawn);
  root.classList.add('cd-paused');
}
const sync=()=>onScreen&&!document.hidden?start():stop();

root.classList.add('cd-paused');
build();ui();
let rt,lastNarrow=narrow();
addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(narrow()!==lastNarrow&&!moving){lastNarrow=narrow();build()}},200)});
document.addEventListener('visibilitychange',sync);
if('IntersectionObserver' in window){
  new IntersectionObserver(es=>{es.forEach(e=>{onScreen=e.isIntersecting});sync()},{threshold:0}).observe(root);
}else{onScreen=true;sync()}
})();
