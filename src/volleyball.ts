import {ArcRotateCamera,Mesh,Scene,Vector3} from '@babylonjs/core';

type Props={
 scene:Scene;canvas:HTMLCanvasElement;camera:ArcRotateCamera;ball:Mesh;
 isHome:()=>boolean;
 animateHit:()=>void;onHit:(combo:number)=>void;
};
type Phase='idle'|'outgoing'|'returning'|'landing';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const ease=(t:number)=>t*t*(3-2*t);

/** A real drag-and-release ball, with timed outward flight, hit, return and bounce. */
export function makeVolleyball(c:Props){
 let phase:Phase='idle';
 let pointerId=-1;
 let grabX=0,grabY=0,grabAt=0;
 let launchAt=0,phaseAt=0,duration=.73,power=1;
 let combo=0,lastHit=0;
 let start=new Vector3(-2.6,.37,-3.0);
 const target=new Vector3(.05,1.78,-1.92);
 const landing=new Vector3(-2.25,.35,-3.0);
 const rest=()=>c.ball.position.set(-2.6,.35,-3.0);
 rest();
 const ballPick=(x:number,y:number)=>{
  const rect=c.canvas.getBoundingClientRect();
  const hit=c.scene.pick(x-rect.left,y-rect.top,m=>m===c.ball||m.isDescendantOf(c.ball));
  return !!hit?.hit;
 };
 function launch(dx=165,dy=-170,time=400){
  if(!c.isHome())return false;
  if(phase!=='idle')return false;
  // Bigger, faster flicks make the ball fly higher, but aim assistance keeps it fun on mobile.
  const speed=Math.hypot(dx,dy)/Math.max(100,time)*1000;
  power=clamp(speed/700,.7,1.55);
  duration=clamp(.88-power*.18,.48,.85);
  start=c.ball.position.clone();start.y=Math.max(.33,start.y);
  launchAt=performance.now();
  phase='outgoing';
  c.ball.setEnabled(true);
  return true;
 }
 function pointerDown(e:PointerEvent){
  if(!c.isHome()||phase!=='idle'||pointerId!==-1)return;
  if(!ballPick(e.clientX,e.clientY))return;
  pointerId=e.pointerId;grabX=e.clientX;grabY=e.clientY;grabAt=performance.now();
  c.camera.detachControl();
  c.canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
 }
 function pointerMove(e:PointerEvent){
  if(e.pointerId!==pointerId||pointerId===-1)return;
  const r=c.canvas.getBoundingClientRect();
  c.ball.position.x=clamp(-2.6+(e.clientX-grabX)/r.width*8,-3.5,2);
  c.ball.position.y=clamp(.35+(grabY-e.clientY)/r.height*4,.35,2.7);
  c.ball.position.z=-3.05;
  c.ball.rotation.z+=(e.movementX||0)*.013;
  e.preventDefault();
 }
 function pointerUp(e:PointerEvent){
  if(e.pointerId!==pointerId||pointerId===-1)return;
  pointerId=-1;c.camera.attachControl(c.canvas,true);
  const dx=e.clientX-grabX,dy=e.clientY-grabY,time=performance.now()-grabAt;
  if(Math.hypot(dx,dy)>22)launch(dx,dy,time);
  else {rest();launch();}
 }
 function pointerCancel(e:PointerEvent){
  if(e.pointerId!==pointerId)return;
  pointerId=-1;rest();c.camera.attachControl(c.canvas,true);
 }
 c.canvas.addEventListener('pointerdown',pointerDown);
 c.canvas.addEventListener('pointermove',pointerMove);
 c.canvas.addEventListener('pointerup',pointerUp);
 c.canvas.addEventListener('pointercancel',pointerCancel);
 function tick(now:number){
  if(!c.isHome()){if(pointerId!==-1){pointerId=-1;c.camera.attachControl(c.canvas,true);}phase='idle';rest();return;}
  if(phase==='idle')return;
  if(phase==='outgoing'){
   const t=clamp((now-launchAt)/(duration*1000),0,1);
   const p=Vector3.Lerp(start,target,ease(t));
   p.y+=Math.sin(Math.PI*t)*(1+power*.26);
   c.ball.position.copyFrom(p);
   c.ball.rotation.x+=.10;
   c.ball.rotation.z+=.08;
   if(t===1){
    c.animateHit();
    const next=now-lastHit<4500?combo+1:1;
    combo=next;lastHit=now;
    c.onHit(combo);
    phase='returning';phaseAt=now;
   }
  }else if(phase==='returning'){
   const t=clamp((now-phaseAt)/850,0,1);
   const p=Vector3.Lerp(target,landing,ease(t));
   p.y+=Math.sin(Math.PI*t)*(1.15+power*.27);
   c.ball.position.copyFrom(p);
   c.ball.rotation.x+=.15;c.ball.rotation.y+=.06;
   if(t===1){phase='landing';phaseAt=now;}
  }else if(phase==='landing'){
   const t=clamp((now-phaseAt)/700,0,1);
   const bounce=(1-t)*.48*Math.abs(Math.sin(t*Math.PI*3.2));
   c.ball.position.set(landing.x,.35+bounce,landing.z);
   if(t===1){phase='idle';rest();}
  }
 }
 return{launch,tick,isGrabbing:()=>pointerId!==-1};
}
