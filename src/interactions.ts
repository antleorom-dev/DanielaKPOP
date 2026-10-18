import {Scene,Mesh,MeshBuilder,StandardMaterial,Color3,Vector3,TransformNode,ArcRotateCamera,Matrix} from '@babylonjs/core';
import './interactions.css';
import {installRoomAssets,installHeldFood} from './assets';
import {createBath} from './bath';
import {makeVolleyball} from './volleyball';
// The player's own song is extracted from DanielaKPOP-recursos-v0.4.zip during Pages deployment.

type Room='bedroom'|'kitchen'|'bathroom'|'stage'|'closet'|'arena';
type Move='idle'|'eat'|'drink'|'bath'|'volley'|'sing'|'dance'|'dance2'|'dance3'|'dance4'|'dance5';
type Dependencies={
 scene:Scene;canvas:HTMLCanvasElement;camera:ArcRotateCamera;
 idol:TransformNode;body:TransformNode;head:TransformNode;dress:Mesh;groups:Record<Room,TransformNode>;
 skin:StandardMaterial;arms:TransformNode[];isEditing:()=>boolean;
 getRoom:()=>Room;getHygiene:()=>number;changeHygiene:(amount:number)=>void;
 onVolleyHit:()=>void;
 perform:(index:number)=>void;animate:(name:Move,duration?:number)=>void;
 toast:(msg:string)=>void;reward:(msg:string)=>void;sound:(notes?:number[])=>void;
};
export function createInteractions(c:Dependencies){
 const bubbleMaterial=new StandardMaterial('shower pearlescent',c.scene);
 bubbleMaterial.diffuseColor=Color3.FromHexString('#cdf3ff');
 bubbleMaterial.alpha=.88;
 const pink=new StandardMaterial('stereo pink',c.scene);
 pink.diffuseColor=Color3.FromHexString('#f1a3d3');
 const bright=new StandardMaterial('stereo bright',c.scene);
 bright.diffuseColor=Color3.FromHexString('#a7f0ff');
 bright.emissiveColor=Color3.FromHexString('#38cde6');
 const white=new StandardMaterial('volleyball white',c.scene);
 white.diffuseColor=Color3.FromHexString('#fffdf9');
 const skinPink=new StandardMaterial('bathing suit',c.scene);
 skinPink.diffuseColor=Color3.FromHexString('#f7a0c9');
 const seams=new StandardMaterial('volleyball piping',c.scene);
 seams.diffuseColor=Color3.FromHexString('#8d97d9');
 const toy=new StandardMaterial('food fallback',c.scene);
 toy.diffuseColor=Color3.FromHexString('#f99cba');
 function sphere(n:string,d:number,x:number,y:number,z:number,m:StandardMaterial,parent:TransformNode){
  const mesh=MeshBuilder.CreateSphere(n,{diameter:d,segments:14},c.scene);
  mesh.parent=parent;mesh.position.set(x,y,z);mesh.material=m;return mesh;
 }
 const bath=createBath({scene:c.scene,canvas:c.canvas,camera:c.camera,body:c.body,head:c.head,
  getHygiene:c.getHygiene,changeHygiene:c.changeHygiene,toast:c.toast,sound:c.sound});
 // On entering the bath, Daniela changes her outfit (all pieces, not only the dress).
 const swimsuitTop=sphere('bikini top',.94,0,1.55,-.025,skinPink,c.body);
 swimsuitTop.scaling.set(.89,.46,.83);
 const swimsuitBottom=MeshBuilder.CreateCylinder('bikini bottom',{diameterTop:.91,diameterBottom:1.12,height:.41,tessellation:20},c.scene);
 swimsuitBottom.parent=c.body;swimsuitBottom.position.set(0,.94,0);swimsuitBottom.material=skinPink;
 const outfitMeshes=c.body.getChildMeshes(false).filter(m=>['dress','shirt','collar','puff sleeve','lace','dress badge'].includes(m.name)&&m!==swimsuitTop&&m!==swimsuitBottom);
 const stereo=new TransformNode('interactive stereo',c.scene);
 stereo.parent=c.groups.stage;
 function stereoBox(n:string,w:number,h:number,d:number,x:number,y:number,z:number,mat:StandardMaterial){
  const mesh=MeshBuilder.CreateBox('stereo '+n,{width:w,height:h,depth:d},c.scene);
  mesh.parent=stereo;mesh.position.set(x,y,z);mesh.material=mat;return mesh;
 }
 stereoBox('case',1.5,.98,.62,3.1,1.06,1.07,white);
 stereoBox('front',1.38,.83,.10,3.1,1.08,.71,pink);
 stereoBox('top',1.53,.13,.7,3.1,1.6,1.07,white);
 const stereoScreen=stereoBox('display',.40,.22,.05,3.1,1.29,.62,bright);
 const speakerParts=[-1,1].map(s=>{
  const p=MeshBuilder.CreateCylinder('stereo speaker',{diameter:.41,height:.1,tessellation:24},c.scene);
  p.parent=stereo;p.position.set(3.1+s*.43,1.04,.61);p.rotation.x=Math.PI/2;p.material=skinPink;return p;
 });
 const audio=new Audio(import.meta.env.BASE_URL+'assets/studio-song.mp3');
 audio.loop=true;audio.volume=.65;audio.preload='auto';
 let musicPlaying=false,lastDance=0,danceIndex=0,concertStartedMusic=false;
 const volleyball=sphere('volleyball 3D',.58,-2.6,.35,-3.0,white,c.groups.bedroom);
 for(let i=0;i<3;i++){
  const strip=MeshBuilder.CreateTorus('volleyball stripe',{diameter:.59,thickness:.025,tessellation:32},c.scene);
  strip.parent=volleyball;strip.rotation.set(i*Math.PI/3,i*Math.PI/5,0);strip.material=seams;
 }
 const volley=makeVolleyball({
  scene:c.scene,canvas:c.canvas,camera:c.camera,ball:volleyball,isHome:()=>c.getRoom()==='bedroom'&&!c.isEditing(),
  animateHit:()=>{c.animate('volley',1.25);c.sound([480,670,940]);},
  onHit:(combo)=>{c.onVolleyHit();c.reward(combo>1?'🏐 COMBO ×'+combo:'🏐 ¡PUNTAZO!');c.toast(combo>1?'¡'+combo+' toques seguidos! 🏐':'¡Daniela te devuelve la pelota! 🏐');}
 });
 const tools=document.createElement('div');tools.id='activity-tools';tools.setAttribute('aria-live','polite');
 document.querySelector('#app')!.append(tools);
 const musicButton=document.createElement('button');musicButton.type='button';musicButton.className='music-switch';
 musicButton.setAttribute('aria-label','Encender o apagar la minicadena del estudio');
 musicButton.textContent='🎵 Encender música';
 musicButton.addEventListener('click',()=>void toggleStereo());
 tools.append(musicButton);
 const washHint=document.createElement('span');washHint.className='wash-hint';
 washHint.textContent='🧽 Elige jabón y frota';tools.append(washHint);
 const ballButton=document.createElement('button');ballButton.type='button';ballButton.className='volley-switch';
 ballButton.textContent='🏐 Tira la pelota';tools.append(ballButton);
 const ghost=document.createElement('div');ghost.id='drag-ghost';document.querySelector('#app')!.append(ghost);
 let currentDrag:{pointer:number;x:number;y:number;at:number;moved:boolean}|null=null;
 ballButton.style.touchAction='none';
 ballButton.addEventListener('pointerdown',e=>{
  currentDrag={pointer:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),moved:false};
  ballButton.setPointerCapture(e.pointerId);
 });
 ballButton.addEventListener('pointermove',e=>{
  if(!currentDrag||currentDrag.pointer!==e.pointerId)return;
  if(Math.hypot(e.clientX-currentDrag.x,e.clientY-currentDrag.y)>10)currentDrag.moved=true;
  if(currentDrag.moved){ghost.textContent='🏐';ghost.classList.add('dragging');ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';e.preventDefault();}
 });
 ballButton.addEventListener('pointerup',e=>{
  if(!currentDrag||currentDrag.pointer!==e.pointerId)return;
  const shot=currentDrag;currentDrag=null;ghost.classList.remove('dragging','over-target');
  if(!volley.launch(e.clientX-shot.x,e.clientY-shot.y,performance.now()-shot.at))c.toast('Espera a que vuelva la pelota 🏐');
  ballButton.dataset.ignoreClick='1';
  setTimeout(()=>delete ballButton.dataset.ignoreClick,100);
 });
 ballButton.addEventListener('pointercancel',()=>{currentDrag=null;ghost.classList.remove('dragging','over-target');});
 ballButton.addEventListener('click',e=>{if(ballButton.dataset.ignoreClick==='1')return;if((e as MouseEvent).detail===0)volley.launch();});
 let feeding:{holder:TransformNode;started:number;drink:boolean}|null=null;
 function feed(index:number){
  if(feeding){feeding.holder.dispose(false,true);feeding=null;}
  const isDrink=index===1;
  const holder=new TransformNode('food held in Daniela hand',c.scene);holder.parent=c.arms[1];
  holder.position.set(.2,-.72,-.33);
  const dummy=sphere('food while model loads',isDrink?.32:.35,0,0,0,isDrink?bright:toy,holder);
  dummy.scaling.set(isDrink?.70:1,isDrink?1.40:.82,1);
  const model=['strawberry','soda-can','cupcake'][index]||'strawberry';
  void installHeldFood(c.scene,model,holder).then(success=>{
   if(success&&!holder.isDisposed())dummy.setEnabled(false);
  });
  feeding={holder,started:performance.now(),drink:isDrink};
  c.animate(isDrink?'drink':'eat',3.25);
  c.toast(isDrink?'¡Daniela está bebiendo! 🥤':'¡Daniela ha cogido la comida! 🍓');
 }
 function sync(){
  const room=c.getRoom(),isBath=room==='bathroom';
  tools.dataset.room=room;
  washHint.hidden=!isBath;musicButton.hidden=!['stage','arena'].includes(room);ballButton.hidden=room!=='bedroom';
  swimsuitTop.setEnabled(isBath);swimsuitBottom.setEnabled(isBath);
  outfitMeshes.forEach(m=>m.setEnabled(!isBath));
  musicButton.textContent=musicPlaying?'⏹ Apagar música':'🎵 Encender música';
  musicButton.classList.toggle('music-on',musicPlaying);
  stereoScreen.material=musicPlaying?bright:pink;
  washHint.textContent=bath.getTool()==='water'?'🚿 Agua elegida: frota para aclarar':bath.getTool()==='soap'?'🧽 Jabón elegido: frota sobre Daniela':'🫧 Elige jabón o agua';
  document.querySelectorAll<HTMLButtonElement>('#actions .action-card').forEach((el,i)=>{
   if(isBath&&i<2)el.classList.toggle('bath-selected',bath.getTool()===(i===0?'soap':'water'));
   else el.classList.remove('bath-selected');
  });
 }
 async function startConcertMusic(){
  if(!['stage','arena'].includes(c.getRoom())||musicPlaying)return;
  // Called directly from the Concierto tap so mobile browsers permit audio playback.
  concertStartedMusic=true;
  try{
   await audio.play();
   musicPlaying=true;lastDance=performance.now();danceIndex=0;sync();
  }catch{
   concertStartedMusic=false;musicPlaying=false;sync();
   c.toast('No se ha podido activar el audio. Comprueba el volumen y pulsa 🎵');
  }
 }
 function stopConcertMusic(){
  if(!concertStartedMusic)return;
  concertStartedMusic=false;
  audio.pause();audio.currentTime=0;musicPlaying=false;sync();
 }
 async function toggleStereo(){
  if(!['stage','arena'].includes(c.getRoom()))return;
  if(musicPlaying){
   audio.pause();audio.currentTime=0;musicPlaying=false;concertStartedMusic=false;
   sync();c.toast('¡Música apagada! 🎵');return;
  }
  concertStartedMusic=false;
  try{
   await audio.play();musicPlaying=true;lastDance=performance.now();danceIndex=0;
   c.animate('dance',3.5);c.toast('¡Que empiece la música! 🎶');
  }catch{musicPlaying=false;c.toast('No se puede reproducir la canción en este navegador');}
  sync();
 }
 function selectBath(index:number){
  bath.setTool(index===0?'soap':'water');
  sync();
 }
 function beforeAction(room:Room,index:number):boolean{
  if(room!=='bathroom'||index>1)return false;
  selectBath(index);
  return true;
 }
 function afterAction(room:Room,index:number){
  if(room==='kitchen')feed(index);
  if(room==='stage'){
   const actions:Move[]=['dance','sing','dance2','dance3','dance4','dance5','sing'];
   c.animate(actions[index]||'dance',index===6?4.9:3.7);
  }
  sync();
 }
 function playerHit(x:number,y:number){
  const r=c.canvas.getBoundingClientRect();
  const hit=c.scene.pick(x-r.left,y-r.top,m=>m.isDescendantOf(c.body)&&m.isEnabled()&&m.isVisible&&m.isPickable);
  if(hit?.hit)return true;
  // Slightly generous touch target on small displays.
  const center=Vector3.Project(new Vector3(c.idol.position.x,1.6,c.idol.position.z),Matrix.Identity(),c.scene.getTransformMatrix(),c.camera.viewport.toGlobal(c.scene.getEngine().getRenderWidth(),c.scene.getEngine().getRenderHeight()));
  const sx=r.left+center.x*r.width/c.scene.getEngine().getRenderWidth();
  const sy=r.top+center.y*r.height/c.scene.getEngine().getRenderHeight();
  const dx=(x-sx)/Math.min(185,r.width*.29),dy=(y-sy)/Math.min(245,r.height*.38);
  return dx*dx+dy*dy<1;
 }
 function decorateActions(room:Room,row:HTMLElement){
  row.classList.toggle('has-five-actions',room==='stage');
  row.querySelectorAll<HTMLButtonElement>('button').forEach((button,i)=>{
   button.dataset.dragged='0';
   const directDrag=room==='kitchen'||(room==='bathroom'&&i<2);
   button.style.touchAction=directDrag?'none':'pan-x';
   let sourcePointer=-1,startX=0,startY=0,dragging=false,touchedDaniela=false;
   button.addEventListener('pointerdown',e=>{
    sourcePointer=e.pointerId;startX=e.clientX;startY=e.clientY;dragging=false;touchedDaniela=false;
    if(directDrag)button.setPointerCapture(e.pointerId);
    ghost.textContent=button.querySelector('.action-emoji')?.textContent||'💗';
    if(room==='bathroom'&&i<2)selectBath(i);
   });
   button.addEventListener('pointermove',e=>{
    if(sourcePointer!==e.pointerId)return;
    const distance=Math.hypot(e.clientX-startX,e.clientY-startY);
    const verticalIntent=Math.abs(e.clientY-startY)>Math.abs(e.clientX-startX)*.55;
    if(!dragging&&distance>(directDrag?7:12)&&(directDrag||verticalIntent)){
     dragging=true;button.dataset.dragged='1';button.setPointerCapture(e.pointerId);ghost.classList.add('dragging');
    }
    if(dragging){
     ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
     if(room==='kitchen'&&playerHit(e.clientX,e.clientY)){touchedDaniela=true;ghost.classList.add('over-target');}else ghost.classList.remove('over-target');
     if(room==='bathroom'&&i<2)bath.paint(e.clientX,e.clientY);
     e.preventDefault();
    }
   });
   const finish=(e:PointerEvent)=>{
    if(sourcePointer!==e.pointerId)return;
    sourcePointer=-1;
    if(!dragging)return;
    dragging=false;ghost.classList.remove('dragging','over-target');
    if(room==='bathroom'&&i<2){
     bath.paint(e.clientX,e.clientY,true);bath.finish();
    }else if(playerHit(e.clientX,e.clientY)||touchedDaniela){
     // Successful food drag is tolerant near Daniela and triggers once.
     if(room==='kitchen')c.perform(i);
     else if(room==='bedroom'&&i===2)volley.launch();
     else c.perform(i);
    }else c.toast('¡Suéltalo encima de Daniela! ✨');
    setTimeout(()=>button.dataset.dragged='0',350);
   };
   button.addEventListener('pointerup',finish);
   button.addEventListener('pointercancel',()=>{sourcePointer=-1;dragging=false;ghost.classList.remove('dragging','over-target');setTimeout(()=>button.dataset.dragged='0',300);});
  });
  sync();
 }
 // Direct finger-painting after selecting sponge or shower.
 let brushPointer=-1;
 c.canvas.addEventListener('pointerdown',e=>{
  if(c.isEditing()||c.getRoom()!=='bathroom'||!bath.getTool())return;
  brushPointer=e.pointerId;
  bath.startAt(e.clientX,e.clientY);
  c.canvas.setPointerCapture(e.pointerId);
 });
 c.canvas.addEventListener('pointermove',e=>{
  if(e.pointerId===brushPointer)bath.moveAt(e.clientX,e.clientY);
 });
 c.canvas.addEventListener('pointerup',e=>{if(e.pointerId===brushPointer){brushPointer=-1;bath.finish();}});
 c.canvas.addEventListener('pointercancel',()=>{brushPointer=-1;bath.finish();});
 // Physical stereo meshes also respond to touches and clicks.
 c.canvas.addEventListener('pointerup',e=>{
  if(c.isEditing()||!['stage','arena'].includes(c.getRoom()))return;
  const r=c.canvas.getBoundingClientRect();
  const hit=c.scene.pick(e.clientX-r.left,e.clientY-r.top,m=>m.isDescendantOf(stereo));
  if(hit?.hit)void toggleStereo();
 });
 function enterRoom(room:Room){
  if(!['stage','arena'].includes(room)&&musicPlaying){audio.pause();audio.currentTime=0;musicPlaying=false;concertStartedMusic=false;}
  if(room!=='kitchen'&&feeding){feeding.holder.dispose(false,true);feeding=null;}
  brushPointer=-1;
  bath.enter(room==='bathroom');
  void installRoomAssets(room,c.scene,c.groups[room]);
  sync();
 }
 function tick(now:number){
  if(musicPlaying&&['stage','arena'].includes(c.getRoom())&&now-lastDance>3600){
   lastDance=now;danceIndex++;
   const choreography:Move[]=['dance2','dance4','dance3','dance5','dance','sing'];
   c.animate(choreography[danceIndex%choreography.length],3.45);
  }
  speakerParts.forEach((m,i)=>m.scaling.setAll(musicPlaying?1+Math.sin(now/155+i*3)*.12:1));
  bath.tick(now);volley.tick(now);
  if(feeding){
   const seconds=(now-feeding.started)/1000;
   const chew=Math.max(0,Math.min(1,(seconds-1)/1.4));
   const done=Math.max(0,Math.min(1,(seconds-2.55)/.53));
   feeding.holder.rotation.x=feeding.drink?-.52*chew*(1-done):Math.sin(seconds*14)*.07;
   feeding.holder.scaling.setAll(Math.max(.045,1-chew*(feeding.drink?.18:.46)-done*.6));
   if(seconds>3.2){feeding.holder.dispose(false,true);feeding=null;c.reward('¡ÑAM! 💗');}
  }
 }
 function throwBall(){if(!volley.launch())c.toast('¡Espera que la pelota vuelva! 🏐');}
 return {beforeAction,afterAction,decorateActions,enterRoom,tick,throwBall,startConcertMusic,stopConcertMusic,isPainting:()=>brushPointer!==-1||bath.isPainting(),sync};
}
