import {ArcRotateCamera,Matrix,Scene,TransformNode,Vector3} from '@babylonjs/core';
import {Room,Furniture,getCatalog,getFurniture,readLayout,writeLayout,addFurniture,hideFurniture,installRoomAssets} from './assets';
import './editor.css';

type Options={scene:Scene;canvas:HTMLCanvasElement;camera:ArcRotateCamera;groups:Record<Room,TransformNode>;getRoom:()=>Room;showRoom:(room:Room)=>void;notify:(msg:string)=>void;setLighting:(factor:number)=>void};
const roomList:{room:Room;label:string}[]=[
 {room:'bedroom',label:'🏠 Casa'},{room:'kitchen',label:'🍓 Cocina'},
 {room:'bathroom',label:'🫧 Baño'},{room:'stage',label:'🎤 Estudio'},{room:'closet',label:'🎀 Moda'}
];
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));

/** Optional local creator interface, absent unless URL contains ?editor=1. */
export function setupSceneEditor(c:Options){
 if(new URLSearchParams(location.search).get('editor')!=='1')return{isEditing:()=>false,onRoomChanged:(_room:Room)=>{}};
 document.body.classList.add('editor-active');
 const root=document.createElement('aside');root.id='scene-editor';
 root.innerHTML=[
 '<div class="editor-head"><div><small>✦ DANIELAKPOP ✦</small><strong>Mi estudio de decoración</strong></div><a class="editor-exit" href="?">▶ Jugar</a></div>',
 '<div id="editor-rooms" class="editor-room-tabs"></div>',
 '<div class="editor-shelf-head"><strong>🪑 Catálogo de muebles</strong><span>Toca para añadir</span></div>',
 '<div id="editor-catalog" class="editor-catalog"></div>',
 '<div class="editor-object-title"><strong id="editor-selection">Toca un mueble del escenario</strong><span id="editor-coords"></span></div>',
 '<div class="editor-object-tools">',
 '<button id="editor-rotate-left" type="button">↶ Girar</button><button id="editor-rotate-right" type="button">↷ Girar</button>',
 '<button id="editor-scale-down" type="button">− Tamaño</button><button id="editor-scale-up" type="button">＋ Tamaño</button>',
 '<button id="editor-delete" type="button" class="editor-danger">🗑 Quitar</button></div>',
 '<label class="editor-light-row"><span>☀️ Luz</span><input id="editor-light" type="range" min="35" max="110" step="5"><strong id="editor-light-value">70%</strong></label>',
 '<div class="editor-foot"><button id="editor-export" type="button">⬇ Exportar diseño</button>',
 '<button id="editor-import" type="button">⬆ Importar</button>',
 '<button id="editor-reset" type="button" class="editor-secondary">↺ Restaurar sala</button>',
 '<input id="editor-file" type="file" accept=".json,application/json" hidden></div>',
 '<p class="editor-help">Arrastra un mueble con el dedo. Se guarda en este dispositivo; exporta el diseño JSON para conservarlo o mandármelo.</p>'
 ].join('');
 root.setAttribute('aria-label','Editor de decoración');
 document.querySelector('#app')!.append(root);
 const el=(id:string)=>root.querySelector('#'+id) as HTMLElement;
 let activeRoom=c.getRoom(),selected:Furniture|null=null,dragId=-1,offset=Vector3.Zero(),dragging=false,dragX=0,dragY=0;
 const roomTabs=el('editor-rooms'),catalog=el('editor-catalog');
 function save(){
  const layout=readLayout();
  for(const item of getFurniture())layout.transforms[item.id]={
   x:+item.root.position.x.toFixed(3),z:+item.root.position.z.toFixed(3),
   rotation:+item.root.rotation.y.toFixed(4),scale:+item.root.scaling.x.toFixed(3)
  };
  writeLayout(layout);
 }
 function refreshSelection(){
  if(selected&&selected.room!==activeRoom)selected=null;
  el('editor-selection').textContent=selected?selected.emoji+' '+selected.label:'Toca un mueble del escenario';
  el('editor-coords').textContent=selected?'X '+selected.root.position.x.toFixed(1)+' · Z '+selected.root.position.z.toFixed(1):'';
  root.querySelectorAll<HTMLButtonElement>('.editor-object-tools button').forEach(button=>button.disabled=!selected);
 }
 function select(item:Furniture|null){
  selected=item;refreshSelection();
  for(const f of getFurniture())for(const m of f.root.getChildMeshes(false))m.showBoundingBox=selected?.id===f.id;
 }
 function drawRooms(){
  roomTabs.replaceChildren();
  for(const item of roomList){
   const btn=document.createElement('button');btn.type='button';btn.textContent=item.label;
   btn.className=activeRoom===item.room?'active':'';
   btn.addEventListener('click',()=>c.showRoom(item.room));roomTabs.append(btn);
  }
 }
 function drawCatalog(){
  catalog.replaceChildren();
  for(const item of getCatalog(activeRoom)){
   const btn=document.createElement('button');btn.type='button';btn.className='editor-catalog-item';
   const icon=document.createElement('span');icon.textContent=item.emoji;
   const label=document.createElement('strong');label.textContent=item.label;
   btn.append(icon,label);btn.addEventListener('click',()=>void addItem(item.name));
   catalog.append(btn);
  }
 }
 async function addItem(name:string){
  const room=activeRoom;
  const id='custom:'+Date.now().toString(36)+':'+Math.floor(Math.random()*1e6).toString(36);
  const position={x:2,z:0};
  const item=await addFurniture(c.scene,c.groups[room],room,name,id,position);
  if(!item){c.notify('No está disponible ese modelo 3D');return;}
  const data=readLayout();data.added.push({id,name,room,position});writeLayout(data);
  select(item);save();c.notify(item.emoji+' Añadido: ahora arrástralo por el escenario');
 }
 function getAt(x:number,y:number){
  const rect=c.canvas.getBoundingClientRect();
  const hit=c.scene.pick(x-rect.left,y-rect.top,m=>!!m.metadata?.furnitureId&&m.isEnabled()&&m.isVisible);
  const id=hit?.pickedMesh?.metadata?.furnitureId;
  return getFurniture(activeRoom).find(f=>f.id===id)??null;
 }
 function floorAt(x:number,y:number){
  const rect=c.canvas.getBoundingClientRect();
  const ray=c.scene.createPickingRay(x-rect.left,y-rect.top,Matrix.Identity(),c.camera);
  if(Math.abs(ray.direction.y)<.00001)return null;
  const t=-ray.origin.y/ray.direction.y;
  if(t<0)return null;
  const p=ray.origin.add(ray.direction.scale(t));
  return new Vector3(clamp(p.x,-6.1,6.1),0,clamp(p.z,-4.1,5.4));
 }
 c.canvas.addEventListener('pointerdown',e=>{
  const found=getAt(e.clientX,e.clientY);
  if(!found){select(null);return;}
  select(found);
  dragId=e.pointerId;dragging=false;dragX=e.clientX;dragY=e.clientY;
  const pos=floorAt(e.clientX,e.clientY);
  offset=pos?found.root.position.subtract(pos):Vector3.Zero();
  c.camera.detachControl();
  c.canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
 },true);
 c.canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==dragId||!selected)return;
  const pos=floorAt(e.clientX,e.clientY);if(!pos)return;
  dragging=dragging||Math.hypot(e.clientX-dragX,e.clientY-dragY)>5;
  if(!dragging)return;
  selected.root.position.x=clamp(pos.x+offset.x,-6.1,6.1);
  selected.root.position.z=clamp(pos.z+offset.z,-4.1,5.4);
  refreshSelection();e.preventDefault();
 },true);
 const end=(e:PointerEvent)=>{
  if(e.pointerId!==dragId)return;
  dragId=-1;c.camera.attachControl(c.canvas,true);
  if(dragging)save();dragging=false;
 };
 c.canvas.addEventListener('pointerup',end,true);
 c.canvas.addEventListener('pointercancel',end,true);
 function adjust(rot:number,scale:number){
  if(!selected)return;
  selected.root.rotation.y+=rot;
  const size=clamp(selected.root.scaling.x*scale,.35,2.5);
  selected.root.scaling.setAll(size);save();refreshSelection();
 }
 const light=el('editor-light') as HTMLInputElement;
 const initialLight=readLayout().lighting??70;
 light.value=String(initialLight);
 function applyLight(){
  const value=clamp(Number(light.value)||70,35,110);
  c.setLighting(value/70);
  el('editor-light-value').textContent=value+'%';
  const data=readLayout();data.lighting=value;writeLayout(data);
 }
 light.addEventListener('input',applyLight);
 applyLight();
 el('editor-rotate-left').addEventListener('click',()=>adjust(-Math.PI/8,1));
 el('editor-rotate-right').addEventListener('click',()=>adjust(Math.PI/8,1));
 el('editor-scale-down').addEventListener('click',()=>adjust(0,.85));
 el('editor-scale-up').addEventListener('click',()=>adjust(0,1.17));
 el('editor-delete').addEventListener('click',()=>{
  if(!selected)return;
  const id=selected.id,data=readLayout();
  if(selected.isDefault){if(!data.hidden.includes(id))data.hidden.push(id);}
  else data.added=data.added.filter(v=>v.id!==id);
  delete data.transforms[id];writeLayout(data);hideFurniture(id);select(null);
  c.notify('Mueble retirado');
 });
 el('editor-export').addEventListener('click',()=>{
  save();const blob=new Blob([JSON.stringify(readLayout(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='danielakpop-decoracion.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  c.notify('Diseño exportado como JSON');
 });
 el('editor-import').addEventListener('click',()=>el('editor-file').click());
 (el('editor-file') as HTMLInputElement).addEventListener('change',async e=>{
  const f=(e.currentTarget as HTMLInputElement).files?.[0];if(!f)return;
  try{
   const data=JSON.parse(await f.text());
   if(data.version!==1||!data.transforms||!Array.isArray(data.added)||!Array.isArray(data.hidden))throw Error('Bad format');
   const validNames=new Set(getCatalog().map(x=>x.name)),validRooms=new Set(roomList.map(x=>x.room));
   data.added=data.added.filter((v:any)=>validNames.has(v.name)&&validRooms.has(v.room)&&typeof v.id==='string'&&v.position&&Number.isFinite(v.position.x)&&Number.isFinite(v.position.z)).slice(0,200);
   data.hidden=data.hidden.filter((x:any)=>typeof x==='string').slice(0,200);
   writeLayout(data);c.notify('¡Importado! Recargando...');setTimeout(()=>location.reload(),500);
  }catch{c.notify('El archivo JSON no tiene formato de DanielaKPOP');}
 });
 el('editor-reset').addEventListener('click',()=>{
  if(!confirm('¿Restaurar los muebles de esta sala?'))return;
  const data=readLayout();for(const item of getFurniture(activeRoom))delete data.transforms[item.id];
  data.added=data.added.filter(x=>x.room!==activeRoom);
  data.hidden=data.hidden.filter(x=>!x.startsWith('base:'+activeRoom+':'));
  writeLayout(data);location.reload();
 });
 async function onRoomChanged(room:Room){
  activeRoom=room;select(null);drawRooms();drawCatalog();
  await installRoomAssets(room,c.scene,c.groups[room]);refreshSelection();
 }
 drawRooms();drawCatalog();refreshSelection();
 c.notify('¡Modo creador! Arrastra un mueble o toca el catálogo.');
 return{isEditing:()=>true,onRoomChanged};
}
