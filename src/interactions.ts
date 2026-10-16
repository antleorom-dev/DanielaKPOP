
import {Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode, ArcRotateCamera, Matrix} from '@babylonjs/core';
import './interactions.css';
import {installRoomAssets,installHeldFood} from './assets';

type Room='bedroom'|'kitchen'|'bathroom'|'stage'|'closet';
type Mode='sponge'|'water'|null;
type Dependencies={
 scene:Scene;canvas:HTMLCanvasElement;camera:ArcRotateCamera;
 idol:TransformNode;body:TransformNode;head:TransformNode;dress:Mesh;groups:Record<Room,TransformNode>;
 skin:StandardMaterial;arms:TransformNode[];
 getRoom:()=>Room;getHygiene:()=>number;changeHygiene:(amount:number)=>void;
 perform:(index:number)=>void;animate:(name:'eat'|'drink'|'bath'|'volley'|'sing'|'dance'|'dance2'|'dance3',duration?:number)=>void;
 toast:(msg:string)=>void;reward:(msg:string)=>void;sound:(notes?:number[])=>void;
};
const base=import.meta.env.BASE_URL;
export function createInteractions(c:Dependencies){
 const bubbleMat=new StandardMaterial('bath foam pearlescent',c.scene);
 bubbleMat.diffuseColor=Color3.FromHexString('#c7f6ff');bubbleMat.emissiveColor=Color3.FromHexString('#a9dff0');bubbleMat.alpha=.81;
 const grimeMat=new StandardMaterial('visible soft dirt',c.scene);
 grimeMat.diffuseColor=Color3.FromHexString('#9e807f');grimeMat.alpha=.65;
 const aquaMat=new StandardMaterial('shower droplets',c.scene);
 aquaMat.diffuseColor=Color3.FromHexString('#5dcbe8');aquaMat.alpha=.67;
 const swimsuitMat=new StandardMaterial('pink swimsuit',c.scene);swimsuitMat.diffuseColor=Color3.FromHexString('#fb8fbd');
 const white=new StandardMaterial('sport white',c.scene);white.diffuseColor=Color3.FromHexString('#fff9fa');
 const pink=new StandardMaterial('stereo glow',c.scene);pink.diffuseColor=Color3.FromHexString('#e99ed2');pink.emissiveColor=Color3.FromHexString('#34104b');
 function ball(name:string,diameter:number,x:number,y:number,z:number,m:StandardMaterial,parent:TransformNode){
  const mesh=MeshBuilder.CreateSphere(name,{diameter,segments:12},c.scene);mesh.parent=parent;mesh.position.set(x,y,z);mesh.material=m;return mesh;
 }
 const top=MeshBuilder.CreateSphere('swimsuit top',{diameter:.94,segments:14},c.scene);
 top.parent=c.body;top.position.set(0,1.55,-.025);top.scaling.set(.89,.46,.83);top.material=swimsuitMat;
 const bottom=MeshBuilder.CreateCylinder('swimsuit bottoms',{diameterTop:.91,diameterBottom:1.12,height:.41,tessellation:20},c.scene);
 bottom.parent=c.body;bottom.position.set(0,.94,0);bottom.material=swimsuitMat;
 const spots=[
  ball('dirt cheek one',.24,-.45,-.37,-.738,grimeMat,c.head),
  ball('dirt cheek two',.18,.45,-.37,-.745,grimeMat,c.head),
  ball('dirt dress one',.31,-.25,1.15,-.62,grimeMat,c.body),
  ball('dirt dress two',.25,.36,.95,-.64,grimeMat,c.body)
 ];
 spots.forEach((mesh,i)=>mesh.scaling.set(1,.7,.24+(i%2)*.1));
 const foam=Array.from({length:23},(_,i)=>{
  const a=i*2.39996,r=.24+.44*Math.sqrt((i+1)/23),y=.72+(i%7)*.24;
  const b=ball('soap bubble '+i,.12+(i%4)*.055,Math.cos(a)*r,y,-.68-Math.sin(a)*.085,bubbleMat,c.body);
  b.setEnabled(false);return b;
 });
 const waterDrops=Array.from({length:27},(_,i)=>{
  const d=ball('falling water '+i,.06+(i%4)*.02,Math.sin(i*5)*.77,2.6,-.75+Math.cos(i*3)*.21,aquaMat,c.idol);
  d.setEnabled(false);return d;
 });
 let foamLevel=0,waterUntil=0,stagePlaying=false,interactionMode:Mode=null,lastScrub=0,volleyUntil=0,volleyStart=0;
 const audio=new Audio(base+'assets/studio-song.mp3');audio.loop=true;audio.preload='none';audio.volume=.62;
 const stereo=new TransformNode('interactive stereo',c.scene);stereo.parent=c.groups.stage;
 function cube(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial){
  const o=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},c.scene);o.parent=stereo;o.position.set(x,y,z);o.material=m;return o;
 }
 cube('stereo main body',1.44,.85,.54,3.15,1.05,1.15,white);
 cube('stereo front',1.33,.67,.09,3.15,1.05,.85,pink);
 const speakers=[-1,1].map(s=>{
  const o=MeshBuilder.CreateCylinder('stereo speaker', {diameter:.42,height:.10,tessellation:24},c.scene);
  o.parent=stereo;o.position.set(3.15+s*.42,1.04,.76);o.rotation.x=Math.PI/2;o.material=swimsuitMat;return o;
 });
 const screen=cube('stereo screen',.36,.22,.05,3.15,1.27,.76,aquaMat);
 cube('stereo top',1.58,.1,.66,3.15,1.51,1.13,white);
 const volleyball=ball('volleyball 3D',.55,-2,1,-1.2,white,c.groups.bedroom);
 const seams=new StandardMaterial('volleyball seams',c.scene);seams.diffuseColor=Color3.FromHexString('#7c94e5');
 for(let a=0;a<3;a++){
  const ring=MeshBuilder.CreateTorus('volleyball stripe '+a,{diameter:.57,thickness:.027,tessellation:28},c.scene);
  ring.parent=volleyball;ring.rotation.set(a*Math.PI/3,a*Math.PI/4,0);ring.material=seams;
 }
 const tools=document.createElement('div');tools.id='activity-tools';tools.setAttribute('aria-live','polite');document.querySelector('#app')!.append(tools);
 const audioControl=document.createElement('button');audioControl.type='button';audioControl.className='music-switch';audioControl.textContent='🎵 Encender música';audioControl.setAttribute('aria-label','Encender o apagar minicadena del estudio');audioControl.addEventListener('click',toggleStereo);
 tools.append(audioControl);
 const washHint=document.createElement('span');washHint.className='wash-hint';washHint.textContent='🧽 Esponja → 🚿 Agua';tools.append(washHint);
 const volleyButton=document.createElement('button');volleyButton.className='volley-switch';volleyButton.textContent='🏐 Lanzar pelota';volleyButton.addEventListener('click',throwBall);tools.append(volleyButton);
 const dragGhost=document.createElement('div');dragGhost.id='drag-ghost';document.querySelector('#app')!.append(dragGhost);
 let activeDrags=0;
 function sync(){
  const bathroom=c.getRoom()==='bathroom',stage=c.getRoom()==='stage',home=c.getRoom()==='bedroom';
  tools.dataset.room=c.getRoom();
  washHint.hidden=!bathroom;audioControl.hidden=!stage;volleyButton.hidden=!home;
  top.setEnabled(bathroom);bottom.setEnabled(bathroom);c.dress.setEnabled(!bathroom);
  spots.forEach((s,i)=>s.setEnabled(c.getHygiene()<92-(i*13)));
  foam.forEach((m,i)=>m.setEnabled(bathroom&&i<Math.round(foamLevel*foam.length)));
  audioControl.textContent=stagePlaying?'⏹ Apagar música':'🎵 Encender música';
  screen.material=stagePlaying?aquaMat:pink;
 }
 async function toggleStereo(){
  if(c.getRoom()!=='stage')return;
  if(stagePlaying){audio.pause();audio.currentTime=0;stagePlaying=false;c.toast('Minicadena apagada 🎵');sync();return;}
  try{
   audio.currentTime=0;await audio.play();stagePlaying=true;c.toast('¡La música está sonando! 🎶');c.animate('dance',2.5);
  }catch{
   stagePlaying=false;c.toast('La canción aún no está en GitHub: sube assets/studio-song.mp3');
  }
  sync();
 }
 audio.addEventListener('error',()=>{stagePlaying=false;sync();});
 function playerHit(x:number,y:number){
  const r=c.canvas.getBoundingClientRect(),px=x-r.left,py=y-r.top;
  const result=c.scene.pick(px,py,m=>m===volleyball||m===c.dress||m.isDescendantOf(c.body));
  if(result?.hit)return true;
  const center=Vector3.Project(new Vector3(c.idol.position.x,1.7,c.idol.position.z),Matrix.Identity(),c.scene.getTransformMatrix(),c.camera.viewport.toGlobal(c.scene.getEngine().getRenderWidth(),c.scene.getEngine().getRenderHeight()));
  const screenX=r.left+center.x*r.width/c.scene.getEngine().getRenderWidth();
  const screenY=r.top+center.y*r.height/c.scene.getEngine().getRenderHeight();
  return Math.hypot(x-screenX,y-screenY)<Math.min(170,r.width*.26);
 }
 function effectAt(x:number,y:number,icon:string){
  const el=document.createElement('span');el.className='activity-effect';el.textContent=icon;el.style.left=x+'px';el.style.top=y+'px';document.querySelector('#app')!.append(el);setTimeout(()=>el.remove(),950);
 }
 function feed(index:number){
  const isDrink=index===1;
  const emotes=['🍓','🥤','🧁'];
  const holder=new TransformNode('food in hand',c.scene);holder.parent=c.body;holder.position.set(.4,1.35,-.82);
  const item=ball('fallback food',isDrink?.26:.35,0,0,0,isDrink?aquaMat:swimsuitMat,holder);
  item.scaling.set(1,isDrink?1.8:.85,1);
  const asset=['strawberry','soda-can','cupcake'][index]||'strawberry';
  void installHeldFood(c.scene,asset,holder).then(ok=>{if(ok&&!holder.isDisposed())item.setEnabled(false);});
  c.animate(isDrink?'drink':'eat',2.7);
  let n=0;const t=setInterval(()=>{n++;const f=n/20;holder.position.set(.4*(1-f),1.43+f*.45,-.8);holder.scaling.scaleInPlace(.96);if(n>=20){clearInterval(t);holder.dispose(false,true);}},90);
  c.toast(isDrink?'¡Glup, glup! ¡Qué refrescante! 🥤':'¡Ñam, ñam! ¡Qué rico! '+emotes[index]);
 }
 function showBubbles(){foam.forEach((m,i)=>m.setEnabled(c.getRoom()==='bathroom'&&i<Math.round(foamLevel*foam.length)));}
 function scrub(){
  if(c.getRoom()!=='bathroom')return;
  interactionMode='sponge';foamLevel=Math.min(1,foamLevel+.23);
  showBubbles();c.animate('bath',1.5);c.toast(foamLevel>.8?'¡Muchísima espuma! Ahora aclara 🚿':'¡Cosquillitas de jabón! 🫧');
  c.sound([784,980]);lastScrub=performance.now();
 }
 function rinse(){
  if(c.getRoom()!=='bathroom')return;
  interactionMode='water';waterUntil=performance.now()+1400;
  const clean=foamLevel>.05?Math.ceil(foamLevel*38):7;foamLevel=Math.max(0,foamLevel-.38);
  c.changeHygiene(clean);showBubbles();c.animate('bath',1.4);c.reward('+'+clean+' 🫧');
  c.toast(foamLevel===0?'¡Daniela está limpita! 💖':'¡Agüita fresca! Sigue aclarando 🚿');c.sound([620,810,1046]);
 }
 function throwBall(){
  if(c.getRoom()!=='bedroom')return;
  volleyStart=performance.now();volleyUntil=volleyStart+1800;
  volleyball.setEnabled(true);c.animate('volley',2.1);c.reward('🏐 ¡TOQUE!');c.toast('¡Qué remate! ¡Otra vez! 🏐');c.sound([390,655,850]);
 }
 function afterAction(room:Room,index:number){
  if(room==='kitchen')feed(index);
  if(room==='bedroom'&&index===2)throwBall();
  if(room==='stage'&&index===1)c.animate('sing',3.5);
  if(room==='stage'&&index===2)c.animate('dance2',4.1);
  if(room==='stage'&&index===3)c.animate('dance3',4.1);
  if(room==='stage'&&index===4)c.animate('sing',3.5);
  sync();
 }
 function beforeAction(room:Room,index:number):boolean{
  if(room!=='bathroom')return false;
  if(index===0){scrub();return true;}
  if(index===1){rinse();return true;}
  return false;
 }
 function decorateActions(room:Room, row:HTMLElement){
  row.classList.toggle('has-five-actions',room==='stage');
  row.querySelectorAll<HTMLButtonElement>('button').forEach((button,i)=>{
   button.dataset.dragged='0';
   let startX=0,startY=0,dragging=false,pointer=-1;
   button.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY;dragging=false;pointer=e.pointerId;dragGhost.textContent=(button.querySelector('.action-emoji')?.textContent||'💗');});
   button.addEventListener('pointermove',e=>{
    if(pointer!==e.pointerId)return;
    if(!dragging&&Math.hypot(e.clientX-startX,e.clientY-startY)>12){dragging=true;activeDrags++;dragGhost.classList.add('dragging');button.dataset.dragged='1';button.setPointerCapture(e.pointerId);}
    if(dragging){dragGhost.style.left=e.clientX+'px';dragGhost.style.top=e.clientY+'px';e.preventDefault();}
   });
   const done=(e:PointerEvent)=>{
    if(pointer!==e.pointerId)return;
    pointer=-1;
    if(!dragging)return;
    dragging=false;activeDrags=Math.max(0,activeDrags-1);dragGhost.classList.toggle('dragging',activeDrags>0);
    const valid=playerHit(e.clientX,e.clientY);
    if(valid){
     if(room==='bathroom'&&i===0)scrub();
     else if(room==='bathroom'&&i===1)rinse();
     else if(room==='bedroom'&&i===2)c.perform(i);
     else if(room==='kitchen')c.perform(i);
     else if(room==='stage')c.perform(i);
     effectAt(e.clientX,e.clientY,room==='bathroom'?'🫧':room==='bedroom'?'🏐':'💖');
    }else c.toast('¡Arrástralo hasta Daniela! ✨');
    setTimeout(()=>button.dataset.dragged='0',400);
   };
   button.addEventListener('pointerup',done);
   button.addEventListener('pointercancel',()=>{pointer=-1;dragging=false;activeDrags=0;dragGhost.classList.remove('dragging');setTimeout(()=>button.dataset.dragged='0',300);});
  });
 }
 function tap3D(e:PointerEvent){
  if(c.getRoom()!=='stage')return;
  const r=c.canvas.getBoundingClientRect();const hit=c.scene.pick(e.clientX-r.left,e.clientY-r.top);
  if(hit?.hit&&hit.pickedMesh&&(hit.pickedMesh.isDescendantOf(stereo)))void toggleStereo();
 }
 c.canvas.addEventListener('pointerup',tap3D);
 function enterRoom(room:Room){
  void installRoomAssets(room,c.scene,c.groups[room]);
  if(room!=='stage'&&stagePlaying){audio.pause();audio.currentTime=0;stagePlaying=false;}
  if(room!=='bathroom'){foamLevel=0;interactionMode=null;waterUntil=0;}
  sync();
 }
 function tick(now:number){
  const bath=c.getRoom()==='bathroom';
  foam.forEach((b,i)=>{if(!b.isEnabled())return;b.position.y=.72+(i%7)*.24+Math.sin(now/400+i)*.045;});
  waterDrops.forEach((d,i)=>{const on=bath&&now<waterUntil;d.setEnabled(on);if(on)d.position.y=2.8-((now/130+i*.31)%2.8);});
  const active=c.getRoom()==='bedroom'&&now<volleyUntil;
  if(active){
   const t=(now-volleyStart)/1800;
   volleyball.position.set(-3.4+6.5*t,.47+Math.sin(t*Math.PI)*2.1,-1.2);
   volleyball.rotation.x+=.16;volleyball.rotation.z+=.1;
  }else volleyball.position.set(-2.5,.3,-1.3);
 }
 sync();
 return{enterRoom,decorateActions,afterAction,beforeAction,tick,sync,throwBall,scrub,rinse,toggleStereo};
}
