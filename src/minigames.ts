
/** Two original, offline-friendly 2D street mini-games. No external assets or libraries. */
export type MiniKind='snack'|'skate'|'volley';
type Result={kind:MiniKind;score:number;coins:number;xp:number};
type Options={onReward:(result:Result)=>void;onClose:()=>void};
type Falling={x:number;y:number;vy:number;emoji:string;good:boolean;size:number;spin:number};
type Obstacle={x:number;kind:'gap'|'cone'|'coin'|'barrier'|'ramp'|'star';size:number;y?:number;collected?:boolean};
type SnackEat={emoji:string;x:number;y:number;fromX:number;fromY:number;t:number};
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
 let snackEating:SnackEat[]=[],snackMouth=0,skateJumps=0,skateCombo=0,skateShield=0,skateFlash=0;
 let volleyPlayerX=105,volleyTargetX=105,volleyCpuX=315,volleyPlayerY=0,volleyCpuY=0,volleyPlayerVY=0,volleyCpuVY=0;
 let volleyBallX=125,volleyBallY=250,volleyBallVX=155,volleyBallVY=-155,volleyPlayerScore=0,volleyCpuScore=0,volleyServe=.8,volleyLastHit=0;
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
 function drawDaniela(x:number,y:number,scale=1,skating=false,mouthOpen=false){
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
  if(mouthOpen){ellipse(1,-9,9,11,'#67334d');ellipse(1,-5,6,3,'#f49ab8');}else ellipse(1,-10,5,3,'#bd6089');
  ctx.fillStyle='#f4a1cf';ctx.beginPath();ctx.moveTo(-28,8);ctx.lineTo(28,8);ctx.lineTo(38,39);ctx.lineTo(-38,39);ctx.closePath();ctx.fill();
  round(-15,36,11,12,5,'#fff');round(5,36,11,12,5,'#fff');
  if(skating){round(-42,48,84,9,5,'#8055ad');for(const wx of [-27,27])ellipse(wx,61,7,7,'#3b335d');}
  ctx.restore();
 }
 function drawSnack(dt:number){
  backdrop();worldX+=dt*22;
  const tableY=548;
  round(0,tableY,W,H-tableY,0,'#ffd8ea');
  for(let x=0;x<W;x+=45)round(x,tableY,22,19,0,'#fff9ff');
  for(let x=0;x<W;x+=45)round(x+22,tableY+21,23,19,0,'#fff9ff');
  if(dt>0&&spawn<=0){spawn=rand(.38,.78)*Math.max(.44,1-time/100);const good=Math.random()<.82;
   falling.push({x:rand(30,W-30),y:-30,vy:rand(135,198)+time*3.0,emoji:good?['🍓','🍉','🍰','🍪','🍎','🧁','🍒','🥐','🥕','🍇','🍑','🍙'][Math.floor(Math.random()*12)]:['🧦','🧼','🪨','👟','🔩'][Math.floor(Math.random()*5)],good,size:rand(31,43),spin:rand(-.24,.24)});
  }spawn-=dt;
  for(let i=falling.length-1;i>=0;i--){
   const f=falling[i];f.y+=f.vy*dt;f.x+=Math.sin(time*3+i)*dt*10;
   ctx.save();ctx.translate(f.x,f.y);ctx.rotate(Math.sin(time*2+i)*f.spin);ctx.font=f.size+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.emoji,0,0);ctx.restore();
   if(f.y>470&&f.y<565&&Math.abs(f.x-playerX)<50){
    falling.splice(i,1);
    if(f.good){snackEating.push({emoji:f.emoji,x:f.x,y:f.y,fromX:f.x,fromY:f.y,t:0});snackMouth=.48;}
    else lives--;
   }else if(f.y>610){falling.splice(i,1);if(f.good)lives--;}
  }
  snackMouth=Math.max(0,snackMouth-dt);
  drawDaniela(playerX,500,1.18,false,snackMouth>0);
  // Captured food visibly flies into Daniela's open mouth before it disappears.
  for(let i=snackEating.length-1;i>=0;i--){
   const e=snackEating[i];e.t+=dt*3.15;const t=clamp(e.t,0,1),ease=1-Math.pow(1-t,3);
   e.x=e.fromX+(playerX-e.fromX)*ease;e.y=e.fromY+(488-e.fromY)*ease;
   ctx.save();ctx.translate(e.x,e.y);ctx.scale(1-t*.62,1-t*.62);ctx.font='34px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.emoji,0,0);ctx.restore();
   if(t>=1){snackEating.splice(i,1);score+=10;snackMouth=.22;}
  }
  text('¡A LA BOCA! 🍓',W/2,43,19,'#fff');
  text('Comidas '+Math.floor(score/10),18,77,13,'#fff','left');
 }
 function drawSkate(dt:number){
  // A faster, more arcade 2.5D city run with ramps, barriers, double jumps and power-ups.
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#72d8ff');sky.addColorStop(.55,'#b9efff');sky.addColorStop(1,'#ffd2ea');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const speed=245+Math.min(300,time*7.4);worldX+=speed*dt;
  // Parallax skyline.
  for(let layer=0;layer<2;layer++)for(let i=0;i<9;i++){
   const span=72+layer*28,x=((i*span-worldX*(layer?.28:.14))%(span*9)+span*9)%(span*9)-span;
   const h=130+(i%4)*26+layer*25,y=480-h;
   round(x,y,span-8,h,8,layer?'#caa7e8':'#ead0f5');
   for(let r=0;r<3;r++)for(let c=0;c<2;c++)round(x+12+c*25,y+20+r*30,10,14,2,(i+r+c)%3?'#fff2a9':'#9ee8f2');
  }
  const ground=516;
  round(0,ground,W,H-ground,0,'#5f5278');round(0,ground-9,W,12,0,'#98ef8e');
  for(let x=-(worldX%70);x<W;x+=70){round(x,ground+22,38,5,3,'#ffd36d');round(x+45,ground+22,18,5,3,'#ffffffb8');}
  // Decorative moving signs and rails.
  for(let i=0;i<4;i++){const x=((i*150-worldX*.55)%650+650)%650-100;round(x,390,82,42,9,['#ff9ecc','#8fdacc','#b99bea','#ffd978'][i],);text(['KPOP','DANI','★','CITY'][i],x+41,411,13,'#fff');}
  if(dt>0&&spawn<=0){
   spawn=rand(.48,1.03)*Math.max(.52,1-time/115);
   const roll=Math.random();
   let k:Obstacle['kind']=roll<.16?'gap':roll<.34?'barrier':roll<.50?'cone':roll<.61?'ramp':roll<.87?'coin':'star';
   if(time<6&&(k==='gap'||k==='barrier'))k='coin';
   const size=k==='gap'?rand(72,125):k==='barrier'?rand(42,58):k==='ramp'?58:34;
   const y=k==='coin'?rand(ground-155,ground-65):k==='star'?ground-150:0;
   obstacles.push({x:W+65,kind:k,size,y});
   if(k==='coin'&&Math.random()<.55)for(let n=1;n<3;n++)obstacles.push({x:W+65+n*42,kind:'coin',size:30,y:(y||ground-90)-n*12});
  }spawn-=dt;
  for(const o of obstacles)o.x-=speed*dt;
  obstacles=obstacles.filter(o=>o.x+o.size>-55);
  for(const o of obstacles){
   if(o.kind==='gap'){round(o.x,ground-4,o.size,H-ground+4,0,'#70c8ef');for(let q=0;q<3;q++)ellipse(o.x+15+q*25,ground+18,14,4,'#c7f5ff');}
   if(o.kind==='cone')text('🚧',o.x+17,ground-19,38,'#fff');
   if(o.kind==='barrier'){round(o.x,ground-56,o.size,54,8,'#ff8eae');for(let q=0;q<3;q++)round(o.x+8+q*15,ground-48,7,37,2,'#fff0ba');}
   if(o.kind==='ramp'){ctx.fillStyle='#b99bea';ctx.beginPath();ctx.moveTo(o.x,ground);ctx.lineTo(o.x+o.size,ground);ctx.lineTo(o.x+o.size,ground-42);ctx.closePath();ctx.fill();text('★',o.x+38,ground-18,18,'#fff');}
   if(o.kind==='coin'&&!o.collected){ellipse(o.x+15,o.y||ground-95,14,19,'#f7ad1d');ellipse(o.x+15,o.y||ground-95,9,14,'#ffe768');}
   if(o.kind==='star'&&!o.collected){text('🌟',o.x+15,o.y||ground-150,31,'#fff');}
  }
  if(!grounded||skateV!==0){skateV+=920*dt;skateY+=skateV*dt;if(skateY>=0){skateY=0;skateV=0;grounded=true;skateJumps=0;}}
  const center=107,danielaY=ground-57+skateY;
  const hurt=()=>{if(skateShield>0){skateShield=0;skateFlash=.5;return;}lives--;skateCombo=0;skateFlash=.65;};
  const overGap=obstacles.find(o=>o.kind==='gap'&&!o.collected&&center>o.x+10&&center<o.x+o.size-10);
  if(dt>0&&grounded&&overGap){overGap.collected=true;hurt();skateV=-370;grounded=false;skateJumps=1;}
  for(const o of obstacles){
   if(o.collected)continue;
   const dx=Math.abs(center-(o.x+o.size*.5));
   if(dt>0&&o.kind==='cone'&&dx<24&&skateY>-45){o.collected=true;hurt();}
   if(dt>0&&o.kind==='barrier'&&dx<o.size*.52&&skateY>-70){o.collected=true;hurt();}
   if(dt>0&&o.kind==='ramp'&&dx<30&&grounded){o.collected=true;grounded=false;skateV=-610;skateJumps=1;score+=20;skateCombo++;}
   if(dt>0&&o.kind==='coin'&&Math.hypot(center-(o.x+15),danielaY-(o.y||ground-95))<47){o.collected=true;score+=25+skateCombo*2;skateCombo=Math.min(12,skateCombo+1);}
   if(dt>0&&o.kind==='star'&&Math.hypot(center-(o.x+15),danielaY-(o.y||ground-150))<52){o.collected=true;skateShield=7;score+=60;skateCombo=Math.min(12,skateCombo+2);}
  }
  skateShield=Math.max(0,skateShield-dt);skateFlash=Math.max(0,skateFlash-dt);
  score+=dt*(5+Math.min(12,time*.16));
  if(skateFlash>0&&Math.floor(time*12)%2===0)ctx.globalAlpha=.45;
  drawDaniela(center,danielaY,.95,true);
  ctx.globalAlpha=1;
  if(skateShield>0){ctx.strokeStyle='#fff2a6';ctx.lineWidth=4;ctx.beginPath();ctx.arc(center,danielaY-16,52,0,Math.PI*2);ctx.stroke();text('✨',center+44,danielaY-65,16,'#fff');}
  text('DANIELA CITY SKATE',W/2,42,19,'#fff');
  text('×'+Math.max(1,skateCombo)+' COMBO',W-18,78,13,skateCombo>3?'#fff19c':'#fff','right');
  text(Math.round(speed)+' km/h',18,78,12,'#fff','left');
 }
 function drawRival(x:number,y:number,scale=1){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ellipse(0,43,42,8,'#4b2c7560');ellipse(0,-28,34,34,'#ffd9c6');
  ellipse(-29,-27,15,25,'#35426d');ellipse(29,-27,15,25,'#35426d');ellipse(0,-51,35,17,'#35426d');
  ellipse(-13,-25,8,11,'#fff');ellipse(13,-25,8,11,'#fff');ellipse(-12,-24,4,8,'#35506d');ellipse(12,-24,4,8,'#35506d');
  ellipse(0,-10,6,3,'#bf6b88');ctx.fillStyle='#8fdacc';ctx.beginPath();ctx.moveTo(-27,8);ctx.lineTo(27,8);ctx.lineTo(36,39);ctx.lineTo(-36,39);ctx.closePath();ctx.fill();
  round(-15,36,11,12,5,'#fff');round(5,36,11,12,5,'#fff');ctx.restore();
 }
 function resetVolleyBall(server:'player'|'cpu'='player'){
  volleyServe=.72;volleyBallX=server==='player'?118:302;volleyBallY=250;volleyBallVX=server==='player'?145:-145;volleyBallVY=-120;
 }
 function volleyJump(cpu=false){
  if(paused||finished)return;
  if(cpu){if(volleyCpuY===0){volleyCpuVY=-430;}}
  else if(volleyPlayerY===0)volleyPlayerVY=-455;
 }
 function drawVolley(dt:number){
  backdrop();worldX+=dt*18;
  const ground=535,netTop=335;
  round(0,ground,W,H-ground,0,'#ffd78f');
  round(8,ground-14,W/2-17,12,6,'#f5a9d0');round(W/2+9,ground-14,W/2-17,12,6,'#9adbe9');
  // net
  round(W/2-5,netTop,10,ground-netTop,4,'#fff8ef');
  for(let y=netTop+14;y<ground-10;y+=21)round(W/2-35,y,70,3,2,'#ffffffc9');
  for(let x=W/2-33;x<W/2+34;x+=13)round(x,netTop,2,ground-netTop,1,'#ffffffa8');
  text('DANIELA',87,575,15,'#f071b1');text('CPU',334,575,15,'#6d75c9');
  // movement + jumps
  const moveSpeed=205;
  const delta=clamp(volleyTargetX-volleyPlayerX,-moveSpeed*dt,moveSpeed*dt);volleyPlayerX+=delta;
  const cpuTarget=volleyBallX>W/2?clamp(volleyBallX,252,370):315;
  volleyCpuX+=clamp(cpuTarget-volleyCpuX,-165*dt,165*dt);
  if(volleyPlayerY<0||volleyPlayerVY!==0){volleyPlayerVY+=980*dt;volleyPlayerY+=volleyPlayerVY*dt;if(volleyPlayerY>=0){volleyPlayerY=0;volleyPlayerVY=0;}}
  if(volleyCpuY<0||volleyCpuVY!==0){volleyCpuVY+=980*dt;volleyCpuY+=volleyCpuVY*dt;if(volleyCpuY>=0){volleyCpuY=0;volleyCpuVY=0;}}
  if(dt>0&&volleyBallX>W/2+18&&volleyBallVY>40&&volleyBallY>335&&Math.abs(volleyBallX-volleyCpuX)<80&&volleyCpuY===0)volleyJump(true);
  if(volleyServe>0){volleyServe-=dt;}else if(dt>0){
   volleyBallVY+=465*dt;volleyBallX+=volleyBallVX*dt;volleyBallY+=volleyBallVY*dt;
   if(volleyBallX<14){volleyBallX=14;volleyBallVX=Math.abs(volleyBallVX);}
   if(volleyBallX>W-14){volleyBallX=W-14;volleyBallVX=-Math.abs(volleyBallVX);}
   if(Math.abs(volleyBallX-W/2)<12&&volleyBallY>netTop-7){
    volleyBallX=volleyBallX<W/2?W/2-13:W/2+13;volleyBallVX*=-.78;volleyBallVY=Math.min(volleyBallVY,-95);
   }
   const now=time;
   const playerCY=ground-105+volleyPlayerY,cpuCY=ground-105+volleyCpuY;
   const hitPlayer=Math.hypot(volleyBallX-volleyPlayerX,volleyBallY-playerCY)<52&&volleyBallX<W/2+6;
   const hitCpu=Math.hypot(volleyBallX-volleyCpuX,volleyBallY-cpuCY)<52&&volleyBallX>W/2-6;
   if(hitPlayer&&now-volleyLastHit>.16){
    volleyLastHit=now;volleyBallVX=165+Math.min(90,score*.8);volleyBallVY=-330-Math.max(0,-volleyPlayerY)*1.3;score+=8;
   }else if(hitCpu&&now-volleyLastHit>.16){
    volleyLastHit=now;volleyBallVX=-(145+Math.min(80,time*1.3));volleyBallVY=-300-Math.max(0,-volleyCpuY);score+=3;
   }
   if(volleyBallY>ground-10){
    if(volleyBallX<W/2){volleyCpuScore++;resetVolleyBall('cpu');}
    else{volleyPlayerScore++;score+=35;resetVolleyBall('player');}
    if(volleyPlayerScore>=7||volleyCpuScore>=7)finish();
   }
  }
  // ball and characters
  ctx.save();ctx.translate(volleyBallX,volleyBallY);ctx.rotate(time*3.5);ellipse(0,0,14,14,'#fff');ctx.strokeStyle='#a66bb0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,11,-.7,1.3);ctx.stroke();ctx.beginPath();ctx.arc(0,0,11,2.1,4.2);ctx.stroke();ctx.restore();
  drawDaniela(volleyPlayerX,ground-57+volleyPlayerY,.82);
  drawRival(volleyCpuX,ground-57+volleyCpuY,.82);
  text('PRIMERO A 7',W/2,44,18,'#fff');
 }
 function jump(force=false){
  if(kind!=='skate'||paused||finished)return;
  if(force){grounded=false;skateV=-400;skateJumps=Math.max(1,skateJumps);return;}
  if(grounded||skateJumps<2){grounded=false;skateJumps++;skateV=skateJumps===1?-535:-455;if(skateJumps===2){score+=8;skateCombo=Math.min(12,skateCombo+1);}}
 }
 function hud(){
  scoreEl.textContent=String(Math.floor(score));
  livesEl.textContent=kind==='volley'?'🏐 Daniela '+volleyPlayerScore+' · '+volleyCpuScore+' CPU':'💗 '+Math.max(0,lives);
  const limit=kind==='volley'?90:60;timeEl.textContent=Math.max(0,Math.ceil(limit-time))+'s';
 }
 function finish(){
  if(finished)return;finished=true;paused=true;
  let coins:number,xp:number;
  if(kind==='volley'){
   const won=volleyPlayerScore>volleyCpuScore;
   coins=Math.min(180,(won?95:35)+Math.floor(score/18));xp=Math.min(170,(won?90:40)+Math.floor(score/14));
   endTitle.textContent=won?'🏆 ¡Daniela gana el partido!':'💜 ¡Casi! La CPU gana esta vez';
   endText.textContent='Daniela '+volleyPlayerScore+' · '+volleyCpuScore+' CPU · '+Math.floor(score)+' puntos · +'+coins+' ★ · +'+xp+' XP';
  }else{
   coins=Math.min(100,Math.floor(score/15));xp=Math.min(120,Math.floor(score/10));
   endTitle.textContent=lives<=0?'¡Buen intento, Daniela! 💜':'¡Minijuego completado! 🌟';
   endText.textContent=Math.floor(score)+' puntos · +'+coins+' ★ · +'+xp+' XP';
  }
  options.onReward({kind,score:Math.floor(score),coins,xp});endEl.hidden=false;pauseBtn.textContent='▶';
 }
 function drawCurrent(dt:number){if(kind==='snack')drawSnack(dt);else if(kind==='skate')drawSkate(dt);else drawVolley(dt);}
 function update(now:number){
  if(!active)return;resize();
  const dt=last?Math.min(.04,(now-last)/1000):0;last=now;
  if(!paused&&!document.hidden){
   time+=dt;drawCurrent(dt);hud();
   if((kind!=='volley'&&time>=60)||(kind!=='volley'&&lives<=0)||(kind==='volley'&&time>=90))finish();
  }else drawCurrent(0);
  if(paused&&!finished){round(65,280,290,90,22,'#ffffffdc');text('⏸ PAUSA',210,323,28,'#a15ac5');}
  frame++;raf=requestAnimationFrame(update);
 }
 function start(next:MiniKind){
  stop(false);kind=next;active=true;paused=false;finished=false;score=0;lives=kind==='snack'?8:3;time=0;spawn=.8;playerX=210;skateY=0;skateV=0;grounded=true;worldX=0;falling=[];obstacles=[];last=0;
  snackEating=[];snackMouth=0;skateJumps=0;skateCombo=0;skateShield=0;skateFlash=0;volleyPlayerX=105;volleyTargetX=105;volleyCpuX=315;volleyPlayerY=0;volleyCpuY=0;volleyPlayerVY=0;volleyCpuVY=0;volleyPlayerScore=0;volleyCpuScore=0;volleyLastHit=-1;resetVolleyBall('player');
  titleEl.textContent=kind==='snack'?'🍓 Lluvia de snacks':kind==='skate'?'🛹 Daniela City Skate':'🏐 Daniela Volley vs CPU';
  hintEl.textContent=kind==='snack'?'Desliza a Daniela: la comida debe entrar en su boca. ¡Evita basura!':kind==='skate'?'Doble salto, rampas, escudos, huecos y velocidad creciente. ¡Haz combo!':'Desliza en tu mitad para moverte y toca para saltar. ¡Primero a 7!';
  endEl.hidden=true;pauseBtn.textContent='⏸';overlay.hidden=false;overlay.setAttribute('aria-hidden','false');document.body.classList.add('minigame-playing');
  hud();resize();raf=requestAnimationFrame(update);
 }
 function stop(notify=true){if(raf)cancelAnimationFrame(raf);raf=0;active=false;paused=false;overlay.hidden=true;overlay.setAttribute('aria-hidden','true');document.body.classList.remove('minigame-playing');if(notify)options.onClose();}
 function pointer(e:PointerEvent,jumpOnTap=true){
  if(!active||paused)return;
  const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*W;
  if(kind==='skate'){if(jumpOnTap)jump();return;}
  if(kind==='volley'){volleyTargetX=clamp(x,48,W/2-34);if(jumpOnTap)volleyJump(false);return;}
  playerX=clamp(x,42,W-42);
 }
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();pointer(e,true);});
 canvas.addEventListener('pointermove',e=>{if((kind==='snack'||kind==='volley')&&e.buttons===1){e.preventDefault();pointer(e,false);}});
 document.querySelector('#minigame-close')?.addEventListener('click',()=>stop());
 pauseBtn.addEventListener('click',()=>{if(finished)return;paused=!paused;pauseBtn.textContent=paused?'▶':'⏸';last=0;});
 document.querySelector('#minigame-retry')?.addEventListener('click',()=>start(kind));
 document.querySelector('#minigame-finish')?.addEventListener('click',()=>stop());
 document.addEventListener('keydown',e=>{
  if(!active)return;if(e.key==='Escape'){stop();return;}
  if((e.key===' '||e.key==='ArrowUp')&&!paused){e.preventDefault();if(kind==='volley')volleyJump(false);else jump();}
  if(kind==='snack'&&!paused){if(e.key==='ArrowLeft')playerX=clamp(playerX-35,42,W-42);if(e.key==='ArrowRight')playerX=clamp(playerX+35,42,W-42);}
  if(kind==='volley'&&!paused){if(e.key==='ArrowLeft')volleyTargetX=clamp(volleyTargetX-34,48,W/2-34);if(e.key==='ArrowRight')volleyTargetX=clamp(volleyTargetX+34,48,W/2-34);}
 });
 window.addEventListener('resize',resize);
 return {start,stop,isActive:()=>active};
}
