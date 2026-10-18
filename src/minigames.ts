
/** Two original, offline-friendly 2D street mini-games. No external assets or libraries. */
export type MiniKind='snack'|'skate';
type Result={kind:MiniKind;score:number;coins:number;xp:number};
type Options={onReward:(result:Result)=>void;onClose:()=>void};
type Falling={x:number;y:number;vy:number;emoji:string;good:boolean;size:number;spin:number};
type Obstacle={x:number;kind:'gap'|'cone'|'coin';size:number;collected?:boolean};
const W=420,H=680;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const rand=(min:number,max:number)=>min+Math.random()*(max-min);
export function createMiniGames(options:Options){
 const overlay=document.querySelector<HTMLElement>('#minigame-overlay')!;
 const canvas=document.querySelector<HTMLCanvasElement>('#minigame-canvas')!;
 const ctx=canvas.getContext('2d',{alpha:false})!;
 const scoreEl=document.querySelector<HTMLElement>('#minigame-score')!;
 const livesEl=document.querySelector<HTMLElement>('#minigame-lives')!;
 const timeEl=document.querySelector<HTMLElement>('#minigame-time')!;
 const titleEl=document.querySelector<HTMLElement>('#minigame-title')!;
 const hintEl=document.querySelector<HTMLElement>('#minigame-hint')!;
 const endEl=document.querySelector<HTMLElement>('#minigame-end')!;
 const endTitle=document.querySelector<HTMLElement>('#minigame-end-title')!;
 const endText=document.querySelector<HTMLElement>('#minigame-end-text')!;
 const pauseBtn=document.querySelector<HTMLButtonElement>('#minigame-pause')!;
 let kind:MiniKind='snack',active=false,paused=false,finished=false,frame=0,last=0,score=0,lives=3,time=0,spawn=0,playerX=210,skateY=0,skateV=0,grounded=true,worldX=0,falling:Falling[]=[],obstacles:Obstacle[]=[],raf=0;
 const resize=()=>{
  if(!active)return;
  const rect=canvas.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(w/W,0,0,h/H,0,0);
 };
 function text(str:string,x:number,y:number,size=24,color='#fff',align:CanvasTextAlign='center'){
  ctx.font='900 '+size+'px system-ui, sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';
  ctx.lineWidth=4;ctx.strokeStyle='#5d397b';ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);
 }
 function round(x:number,y:number,w:number,h:number,r:number,color:string){
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
 }
 function ellipse(x:number,y:number,rx:number,ry:number,color:string){
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
 }
 function backdrop(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,kind==='snack'?'#b4f5ff':'#82dafa');g.addColorStop(.73,'#e6f7ff');g.addColorStop(1,'#ffe2ef');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<6;i++){
   const x=(i*115-(worldX*(kind==='skate'?.16:.02))%690+690)%690-110;
   ellipse(x,115+i%2*58,48,20,'#ffffffa8');ellipse(x+30,107+i%2*58,37,16,'#ffffffa8');
  }
  for(let i=0;i<8;i++){
   const x=(i*74-worldX*(kind==='skate'?.32:.04))%620+ (i*74-worldX*(kind==='skate'?.32:.04)<-90?620:0);
   round(x,kind==='skate'?335:400,57,180,7,['#e8c9fa','#ffd4e9','#d8d2ff'][i%3]);
   for(let j=0;j<3;j++)round(x+11,355+j*35,13,17,3,'#fff7d7');
  }
 }
 function drawDaniela(x:number,y:number,scale=1,skating=false){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ellipse(0,43,44,9,'#784c9770');
  // A playful 2D Daniela, inspired by the original game's pigtails, not Pou.
  ellipse(-31,-24,17,29,'#694576');ellipse(31,-24,17,29,'#694576');
  ellipse(-32,-40,8,9,'#f5a9d7');ellipse(32,-40,8,9,'#f5a9d7');
  ellipse(0,-28,35,34,'#ffdfc7');
  ellipse(0,-51,36,18,'#694576');
  for(let i=-2;i<=2;i++)ellipse(i*13,-50+(i%2)*4,12,12,'#785185');
  ellipse(-13,-25,8,11,'#fff');ellipse(13,-25,8,11,'#fff');
  ellipse(-11,-24,4,8,'#483060');ellipse(15,-24,4,8,'#483060');
  ellipse(-23,-12,8,4,'#f6a0b5');ellipse(23,-12,8,4,'#f6a0b5');
  ellipse(1,-10,5,3,'#bd6089');
  ctx.fillStyle='#f4a1cf';ctx.beginPath();ctx.moveTo(-28,8);ctx.lineTo(28,8);ctx.lineTo(38,39);ctx.lineTo(-38,39);ctx.closePath();ctx.fill();
  round(-15,36,11,12,5,'#fff');round(5,36,11,12,5,'#fff');
  if(skating){round(-42,48,84,9,5,'#8055ad');for(const wx of [-27,27])ellipse(wx,61,7,7,'#3b335d');}
  ctx.restore();
 }
 function drawSnack(dt:number){
  backdrop();worldX+=dt*22;
  round(0,548,W,132,0,'#ffd8ea');
  for(let x=0;x<W;x+=45)round(x,548,22,19,0,'#fff9ff');
  for(let x=0;x<W;x+=45)round(x+22,569,23,19,0,'#fff9ff');
  if(dt>0&&spawn<=0){spawn=rand(.42,.88)*Math.max(.48,1-time/105);const good=Math.random()<.81;
   falling.push({x:rand(30,W-30),y:-30,vy:rand(125,185)+time*2.7,emoji:good?['🍓','🍉','🍰','🍪','🍎','🧁','🍒','🥐','🥕','🍇'][Math.floor(Math.random()*10)]:['🧦','🧼','🪨','👟'][Math.floor(Math.random()*4)],good,size:rand(31,43),spin:rand(-.2,.2)});
  }spawn-=dt;
  for(let i=falling.length-1;i>=0;i--){
   const f=falling[i];f.y+=f.vy*dt;f.x+=Math.sin(time*3+i)*dt*9;
   ctx.save();ctx.translate(f.x,f.y);ctx.rotate(Math.sin(time*2+i)*f.spin);ctx.font=f.size+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.emoji,0,0);ctx.restore();
   if(f.y>505&&f.y<580&&Math.abs(f.x-playerX)<47){
    falling.splice(i,1);
    if(f.good)score+=10;else lives--;
   }else if(f.y>610){falling.splice(i,1);if(f.good)lives--;}
  }
  drawDaniela(playerX,500,1.18);
  text('¡ATRAPA LOS DULCES!',W/2,43,19,'#fff');
 }
 function drawSkate(dt:number){
  backdrop();
  const speed=205+Math.min(160,time*5.5);
  worldX+=speed*dt;
  const ground=510;
  if(dt>0&&spawn<=0){spawn=rand(.85,1.55);
   const kind:Obstacle['kind']=Math.random()<.2?'gap':Math.random()<.62?'coin':'cone';
   obstacles.push({x:W+60,kind,size:kind==='gap'?rand(68,105):34});
  }spawn-=dt;
  for(const o of obstacles)o.x-=speed*dt;
  obstacles=obstacles.filter(o=>o.x+o.size>-40);
  round(0,ground,W,H-ground,0,'#ffe18a');
  // Moving ground stripes create motion without textures.
  for(let x=-(worldX%54);x<W;x+=54)round(x,ground,33,8,3,'#b8f05b');
  for(const o of obstacles){
   if(o.kind==='gap'){round(o.x,ground-3,o.size,H-ground+3,0,'#86d9ff');round(o.x-6,ground-3,6,11,0,'#fef3ac');}
   if(o.kind==='cone'){text('🚧',o.x+16,ground-17,35,'#fff');}
   if(o.kind==='coin'&&!o.collected){ellipse(o.x+15,ground-95,14,19,'#f7ad1d');ellipse(o.x+15,ground-95,9,14,'#ffe768');}
  }
  if(!grounded){skateV+=900*dt;skateY+=skateV*dt;if(skateY>=0){skateY=0;skateV=0;grounded=true;}}
  // A gap only hurts if Daniela lands on it; obstacles require a jump.
  const center=107;
  const overGap=obstacles.find(o=>o.kind==='gap'&&!o.collected&&center>o.x+9&&center<o.x+o.size-9);
  if(dt>0&&grounded&&overGap){lives--;overGap.collected=true;jump(true);}
  for(const o of obstacles){
   if(o.collected)continue;
   if(dt>0&&o.kind==='cone'&&Math.abs(center-(o.x+16))<23&&skateY>-43){lives--;o.collected=true;}
   if(dt>0&&o.kind==='coin'&&Math.abs(center-(o.x+15))<31&&skateY<-32){score+=25;o.collected=true;}
  }
  score+=dt*3;
  drawDaniela(center,ground-57+skateY,.95,true);
  text('¡SALTA LOS HUECOS!',W/2,43,19,'#fff');
 }
 function jump(force=false){if(kind!=='skate'||(!grounded&&!force)||paused||finished)return;grounded=false;skateV=-485;if(force)skateV=-400;}
 function hud(){scoreEl.textContent=String(Math.floor(score));livesEl.textContent='💗 '+Math.max(0,lives);timeEl.textContent=Math.max(0,Math.ceil(60-time))+'s';}
 function finish(){
  if(finished)return;finished=true;paused=true;
  const coins=Math.min(100,Math.floor(score/15)),xp=Math.min(120,Math.floor(score/10));
  options.onReward({kind,score:Math.floor(score),coins,xp});
  endTitle.textContent=lives<=0?'¡Buen intento, Daniela! 💜':'¡Minijuego completado! 🌟';
  endText.textContent=Math.floor(score)+' puntos · +'+coins+' ★ · +'+xp+' XP';
  endEl.hidden=false;
  pauseBtn.textContent='▶';
 }
 function update(now:number){
  if(!active)return;
  resize();
  const dt=last?Math.min(.04,(now-last)/1000):0;last=now;
  if(!paused&&!document.hidden){time+=dt;if(kind==='snack')drawSnack(dt);else drawSkate(dt);hud();if(time>=60||lives<=0)finish();}
  else{if(kind==='snack')drawSnack(0);else drawSkate(0);}
  if(paused&&!finished){round(65,280,290,90,22,'#ffffffdc');text('⏸ PAUSA',210,323,28,'#a15ac5');}
  frame++;raf=requestAnimationFrame(update);
 }
 function start(next:MiniKind){
  stop(false);kind=next;active=true;paused=false;finished=false;score=0;lives=kind==='snack'?8:3;time=0;spawn=.8;playerX=210;skateY=0;skateV=0;grounded=true;worldX=0;falling=[];obstacles=[];last=0;
  titleEl.textContent=kind==='snack'?'🍓 Lluvia de snacks':'🛹 Daniela Skate';
  hintEl.textContent=kind==='snack'?'Desliza a Daniela para atrapar comida. ¡Evita los objetos!':'Toca la pantalla para saltar huecos y obstáculos. ¡Coge monedas!';
  endEl.hidden=true;pauseBtn.textContent='⏸';overlay.hidden=false;overlay.setAttribute('aria-hidden','false');document.body.classList.add('minigame-playing');
  hud();resize();raf=requestAnimationFrame(update);
 }
 function stop(notify=true){if(raf)cancelAnimationFrame(raf);raf=0;active=false;paused=false;overlay.hidden=true;overlay.setAttribute('aria-hidden','true');document.body.classList.remove('minigame-playing');if(notify)options.onClose();}
 function pointer(e:PointerEvent){if(!active||paused)return;if(kind==='skate'){jump();return;}const rect=canvas.getBoundingClientRect();playerX=clamp((e.clientX-rect.left)/rect.width*W,42,W-42);}
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();pointer(e);});
 canvas.addEventListener('pointermove',e=>{if(kind==='snack'&&e.buttons===1){e.preventDefault();pointer(e);}});
 document.querySelector('#minigame-close')?.addEventListener('click',()=>stop());
 pauseBtn.addEventListener('click',()=>{if(finished)return;paused=!paused;pauseBtn.textContent=paused?'▶':'⏸';last=0;});
 document.querySelector('#minigame-retry')?.addEventListener('click',()=>start(kind));
 document.querySelector('#minigame-finish')?.addEventListener('click',()=>stop());
 document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){stop();return;}if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();jump();}if(kind==='snack'&&!paused){if(e.key==='ArrowLeft')playerX=clamp(playerX-35,42,W-42);if(e.key==='ArrowRight')playerX=clamp(playerX+35,42,W-42);}});
 window.addEventListener('resize',resize);
 return {start,stop,isActive:()=>active};
}
