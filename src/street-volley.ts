import {ArcRotateCamera,Color3,Mesh,MeshBuilder,Scene,StandardMaterial,TransformNode,Vector3} from '@babylonjs/core';

type Options={
 scene:Scene;canvas:HTMLCanvasElement;camera:ArcRotateCamera;idol:TransformNode;street:TransformNode;
 animate:(move:'volley'|'jump'|'wave'|'giggle',seconds?:number)=>void;
 toast:(message:string)=>void;
 onFinish:(won:boolean,player:number,cpu:number,rally:number)=>void;
};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

export function createStreetVolley3D(o:Options){
 const root=new TransformNode('Daniela City 3D volleyball',o.scene);root.parent=o.street;root.setEnabled(false);
 const mat=(name:string,color:string)=>{const m=new StandardMaterial(name,o.scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=new Color3(.2,.2,.2);return m;};
 const pink=mat('volley pink','#f4a1cf'),mint=mat('volley mint','#8fdacc'),white=mat('volley white','#fffaf5'),purple=mat('volley purple','#76518d'),gold=mat('volley gold','#ffd06b'),skin=mat('rival skin','#ffd9c5'),hair=mat('rival hair','#5b527e');
 const put=(mesh:Mesh,x:number,y:number,z:number,m:StandardMaterial,parent:TransformNode=root)=>{mesh.position.set(x,y,z);mesh.material=m;mesh.parent=parent;mesh.isPickable=false;return mesh;};
 const box=(n:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial,p?:TransformNode)=>put(MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},o.scene),x,y,z,m,p);
 const ball=(n:string,d:number,x:number,y:number,z:number,m:StandardMaterial,p?:TransformNode)=>put(MeshBuilder.CreateSphere(n,{diameter:d,segments:16},o.scene),x,y,z,m,p);
 const cyl=(n:string,d:number,h:number,x:number,y:number,z:number,m:StandardMaterial,p?:TransformNode)=>put(MeshBuilder.CreateCylinder(n,{diameter:d,height:h,tessellation:16},o.scene),x,y,z,m,p);

 // A proper outdoor court inside Daniela City.
 box('street volley court',10.7,.08,4.9,0,.02,.15,white);
 for(const x of [-4.95,4.95])box('court sideline',.07,.025,4.45,x,.075,.15,pink);
 for(const z of [-2,2])box('court endline',9.95,.025,.07,0,.075,z,pink);
 box('court center line',.07,.026,4.45,0,.078,.15,gold);
 for(const x of [-5.55,5.55]){cyl('court lamp post',.12,3.7,x,1.85,1.9,purple);ball('court lamp glow',.42,x,3.78,1.9,gold);}
 const netHeight=2.15;
 for(const z of [-2.05,2.05])cyl('volley net post',.13,2.75,0,1.37,z,purple);
 for(let y=.42;y<netHeight;y+=.24)box('volley net horizontal',.04,.022,4.1,0,y,.15,white);
 for(let z=-1.82;z<2;z+=.3)box('volley net vertical',.04,1.78,.025,0,1.28,z,white);
 box('volley top tape',.09,.09,4.18,0,netHeight,.15,gold);

 // Stylised CPU rival, deliberately distinct from Daniela.
 const cpu=new TransformNode('CPU volleyball rival',o.scene);cpu.parent=root;
 ball('cpu head',1.18,0,2.65,0,skin,cpu).scaling.set(.9,1,.82);
 ball('cpu hair cap',1.22,0,2.93,.05,hair,cpu).scaling.set(.94,.56,.84);
 for(const x of [-.2,.2]){ball('cpu eye',.15,x,2.65,-.49,purple,cpu);ball('cpu eye glint',.045,x-.025,2.69,-.56,white,cpu);}
 ball('cpu smile',.13,0,2.42,-.51,pink,cpu).scaling.y=.38;
 const cpuBody=box('cpu sporty shirt',.9,.85,.62,0,1.65,0,mint,cpu);cpuBody.scaling.y=1.1;
 box('cpu shorts',1,.35,.68,0,1.08,0,purple,cpu);
 for(const side of [-1,1]){
  const arm=ball('cpu arm',.27,side*.56,1.72,-.02,skin,cpu);arm.scaling.y=1.9;
  const leg=ball('cpu leg',.3,side*.27,.64,0,skin,cpu);leg.scaling.y=1.7;
  const shoe=ball('cpu shoe',.33,side*.28,.22,-.11,white,cpu);shoe.scaling.set(1.25,.52,1.38);
 }
 const volleyBall=ball('3D city volleyball',.42,-2.4,3,-.2,white);
 const stripe1=MeshBuilder.CreateTorus('3D volley stripe 1',{diameter:.44,thickness:.018,tessellation:28},o.scene);stripe1.parent=volleyBall;stripe1.material=purple;
 const stripe2=MeshBuilder.CreateTorus('3D volley stripe 2',{diameter:.44,thickness:.018,tessellation:28},o.scene);stripe2.parent=volleyBall;stripe2.rotation.x=Math.PI/2;stripe2.material=pink;

 const ui=document.createElement('div');ui.className='street-volley-ui';ui.hidden=true;ui.innerHTML=
  '<div class="street-volley-score"><span>💜 DANIELA <b id="sv-player">0</b></span><em>PRIMERO A 7</em><span><b id="sv-cpu">0</b> CPU 🩵</span></div>'+
  '<div class="street-volley-tip">Muévete y salta para bloquear o rematar</div>'+
  '<div class="street-volley-controls"><button data-vmove="-1" aria-label="Mover izquierda">◀</button><button id="sv-jump">🏐 SALTAR / REMATAR</button><button data-vmove="1" aria-label="Mover derecha">▶</button></div>'+
  '<button id="sv-exit" class="street-volley-exit">✕ Salir</button>';
 document.querySelector('#app')?.append(ui);
 const playerEl=ui.querySelector<HTMLElement>('#sv-player')!,cpuEl=ui.querySelector<HTMLElement>('#sv-cpu')!;
 let active=false,finished=false,last=0,moveDir=0,playerScore=0,cpuScore=0,rally=0,bestRally=0;
 let playerY=0,playerVY=0,cpuY=0,cpuVY=0,ballVX=2.4,ballVY=-2,serveDelay=0;
 let saved={alpha:0,beta:0,radius:0,target:new Vector3(),pos:new Vector3(),rotation:new Vector3(),scale:new Vector3(1,1,1)};
 const resetBall=(server:'player'|'cpu')=>{volleyBall.position.set(server==='player'?-2.7:2.7,2.8,-.2);ballVX=server==='player'?2.55:-2.55;ballVY=-1.3;serveDelay=.65;rally=0;};
 const score=()=>{playerEl.textContent=String(playerScore);cpuEl.textContent=String(cpuScore);};

 function start(){
  if(active)return;
  active=true;finished=false;root.setEnabled(true);ui.hidden=false;document.body.classList.add('street-volley-playing');playerScore=0;cpuScore=0;rally=0;bestRally=0;moveDir=0;playerY=0;cpuY=0;playerVY=0;cpuVY=0;
  saved={alpha:o.camera.alpha,beta:o.camera.beta,radius:o.camera.radius,target:o.camera.target.clone(),pos:o.idol.position.clone(),rotation:o.idol.rotation.clone(),scale:o.idol.scaling.clone()};
  o.idol.position.set(-3.0,0,-.25);o.idol.rotation.set(0,0,0);o.idol.scaling.setAll(.82);
  cpu.position.set(3.0,0,-.25);
  o.camera.alpha=-Math.PI/2;o.camera.beta=1.25;o.camera.radius=10.8;o.camera.target.set(0,1.65,.15);
  resetBall('player');score();last=performance.now();o.animate('wave',1);o.toast('🏐 Daniela vs CPU · ¡primero a 7!');
 }
 function jump(cpuJump=false){
  if(!active||finished)return;
  if(cpuJump){if(cpuY===0){cpuVY=5.8;}}
  else if(playerY===0){playerVY=6.25;o.animate('volley',.7);}
 }
 function hitPlayer(){
  const dx=volleyBall.position.x-o.idol.position.x,dy=volleyBall.position.y-(2.05+playerY);
  if(Math.hypot(dx,dy)<1.0&&volleyBall.position.x<.2){
   ballVX=3.1+Math.min(1.3,rally*.08);ballVY=4.9+Math.max(0,playerY)*.45;rally++;bestRally=Math.max(bestRally,rally);o.animate('volley',.55);return true;
  }return false;
 }
 function hitCpu(){
  const dx=volleyBall.position.x-cpu.position.x,dy=volleyBall.position.y-(2.05+cpuY);
  if(Math.hypot(dx,dy)<.98&&volleyBall.position.x>-.2){
   const aim=-2.6+(Math.random()-.5)*1.7;ballVX=-Math.min(4.1,2.65+rally*.07);ballVY=4.4+Math.random()*.7+(aim<-2.8?.25:0);rally++;bestRally=Math.max(bestRally,rally);return true;
  }return false;
 }
 function point(to:'player'|'cpu'){
  if(to==='player')playerScore++;else cpuScore++;score();
  if(playerScore>=7||cpuScore>=7){
   finished=true;const won=playerScore>cpuScore;o.animate(won?'giggle':'wave',1.4);o.onFinish(won,playerScore,cpuScore,bestRally);
   ui.querySelector<HTMLElement>('.street-volley-tip')!.textContent=won?'🏆 ¡Daniela gana! Pulsa Salir o juega otra vez desde Calle':'💜 Buena partida. ¡La revancha te espera!';
   return;
  }
  resetBall(to==='player'?'player':'cpu');
 }
 function tick(now:number){
  if(!active||finished)return;
  const dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;
  // Player movement and jump physics.
  o.idol.position.x=clamp(o.idol.position.x+moveDir*3.1*dt,-4.45,-.65);
  if(playerY>0||playerVY!==0){playerVY-=12.5*dt;playerY+=playerVY*dt;if(playerY<=0){playerY=0;playerVY=0;}}o.idol.position.y=playerY;
  // CPU tracks the ball but has a reaction delay / limited speed.
  const target=volleyBall.position.x>0?clamp(volleyBall.position.x,.7,4.4):2.7;
  cpu.position.x+=clamp(target-cpu.position.x,-2.35*dt,2.35*dt);
  if(cpuY>0||cpuVY!==0){cpuVY-=12.5*dt;cpuY+=cpuVY*dt;if(cpuY<=0){cpuY=0;cpuVY=0;}}cpu.position.y=cpuY;
  if(volleyBall.position.x>.45&&volleyBall.position.y<3.15&&volleyBall.position.y>1.6&&volleyBall.position.x-cpu.position.x<1.25&&cpuY===0&&Math.random()<dt*7)jump(true);
  if(serveDelay>0){serveDelay-=dt;return;}
  ballVY-=8.2*dt;volleyBall.position.x+=ballVX*dt;volleyBall.position.y+=ballVY*dt;volleyBall.rotation.z+=dt*4;volleyBall.rotation.x+=dt*2;
  // Net collision.
  if(Math.abs(volleyBall.position.x)<.16&&volleyBall.position.y<netHeight+.22){volleyBall.position.x=ballVX>0?-.19:.19;ballVX*=-.62;ballVY=Math.max(ballVY,1.1);}
  if(volleyBall.position.x<-5.15){volleyBall.position.x=-5.15;ballVX=Math.abs(ballVX)*.72;}
  if(volleyBall.position.x>5.15){volleyBall.position.x=5.15;ballVX=-Math.abs(ballVX)*.72;}
  hitPlayer();hitCpu();
  if(volleyBall.position.y<=.3){point(volleyBall.position.x<0?'cpu':'player');}
 }
 function stop(){
  if(!active)return;active=false;finished=false;root.setEnabled(false);ui.hidden=true;document.body.classList.remove('street-volley-playing');moveDir=0;
  o.idol.position.copyFrom(saved.pos);o.idol.rotation.copyFrom(saved.rotation);o.idol.scaling.copyFrom(saved.scale);
  o.camera.alpha=saved.alpha;o.camera.beta=saved.beta;o.camera.radius=saved.radius;o.camera.target.copyFrom(saved.target);
 }
 for(const button of ui.querySelectorAll<HTMLButtonElement>('[data-vmove]')){
  const dir=Number(button.dataset.vmove)||0;
  const begin=(e:PointerEvent)=>{e.preventDefault();moveDir=dir;button.setPointerCapture(e.pointerId);};
  const end=()=>{if(moveDir===dir)moveDir=0;};
  button.addEventListener('pointerdown',begin);button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);button.addEventListener('pointerleave',end);
 }
 ui.querySelector<HTMLButtonElement>('#sv-jump')!.addEventListener('pointerdown',e=>{e.preventDefault();jump(false);});
 ui.querySelector<HTMLButtonElement>('#sv-exit')!.addEventListener('click',stop);
 const keyDown=(e:KeyboardEvent)=>{if(!active)return;if(e.key==='ArrowLeft')moveDir=-1;if(e.key==='ArrowRight')moveDir=1;if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();jump(false);}if(e.key==='Escape')stop();};
 const keyUp=(e:KeyboardEvent)=>{if(!active)return;if((e.key==='ArrowLeft'&&moveDir<0)||(e.key==='ArrowRight'&&moveDir>0))moveDir=0;};
 document.addEventListener('keydown',keyDown);document.addEventListener('keyup',keyUp);
 return {start,stop,tick,isActive:()=>active};
}
