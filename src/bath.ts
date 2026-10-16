import {Color3,Mesh,MeshBuilder,Scene,StandardMaterial,TransformNode,Vector3,ArcRotateCamera} from '@babylonjs/core';

export type BathTool='soap'|'water'|null;
type Bubble={mesh:Mesh;parent:TransformNode};
type Dirt={mesh:Mesh;parent:TransformNode;cleaned:boolean};
type Context={
 scene:Scene;canvas:HTMLCanvasElement;camera:ArcRotateCamera;
 body:TransformNode;head:TransformNode;
 getHygiene:()=>number;changeHygiene:(amount:number)=>void;
 toast:(message:string)=>void;sound:(notes?:number[])=>void;
};

/** A touch-by-touch bath: bubbles stay precisely where the player scrubs. */
export function createBath(c:Context){
 const makeMaterial=(name:string,hex:string,alpha=1)=>{
  const mat=new StandardMaterial(name,c.scene);
  mat.diffuseColor=Color3.FromHexString(hex);
  mat.specularColor=Color3.FromHexString('#ffffff');
  mat.alpha=alpha;
  return mat;
 };
 const foamMat=makeMaterial('local pearlescent foam','#daf9ff',.81);
 foamMat.emissiveColor=Color3.FromHexString('#285268');
 const shineMat=makeMaterial('foam highlight','#ffffff',.95);
 const dirtMat=makeMaterial('dirty little stains','#986e76',.69);
 const waterMat=makeMaterial('moving water sparkle','#8adbf5',.7);
 waterMat.emissiveColor=Color3.FromHexString('#286689');
 let tool:BathTool=null;
 let active=false;
 let painting=false;
 let lastStroke=-1000;
 let washStrokes=0;
 const bubbles:Bubble[]=[];
 const dirt:Dirt[]=[];
 const specks:{mesh:Mesh;expires:number;vx:number;vy:number}[]=[];
 const spots=[
  {parent:c.head,x:-.47,y:-.28,z:-.78,size:.20},
  {parent:c.head,x:.50,y:-.42,z:-.73,size:.15},
  {parent:c.body,x:-.3,y:1.58,z:-.54,size:.25},
  {parent:c.body,x:.32,y:1.23,z:-.67,size:.23},
  {parent:c.body,x:-.1,y:.90,z:-.78,size:.20},
  {parent:c.head,x:.02,y:-.55,z:-.82,size:.10},
  {parent:c.body,x:.38,y:1.70,z:-.52,size:.15},
  {parent:c.head,x:-.62,y:-.46,z:-.60,size:.15}
 ];
 function makeSphere(n:string,d:number,mat:StandardMaterial,parent:TransformNode,x:number,y:number,z:number){
  const result=MeshBuilder.CreateSphere(n,{diameter:d,segments:12},c.scene);
  result.parent=parent;result.position.set(x,y,z);result.material=mat;result.isPickable=false;
  return result;
 }
 for(const p of spots){
  const patch=makeSphere('localized dirt stain',p.size,dirtMat,p.parent,p.x,p.y,p.z);
  patch.scaling.set(1.2,.54,.24);dirt.push({mesh:patch,parent:p.parent,cleaned:false});
 }
 function seedVisibleDirt(){
  // Dirt builds up as needs decrease. Washed-off patches remain clean this session.
  const count=Math.max(0,Math.min(dirt.length,Math.ceil((98-c.getHygiene())/9)));
  dirt.forEach((spot,i)=>spot.mesh.setEnabled(i<count&&!spot.cleaned));
 }
 function setTool(next:BathTool){
  tool=next;
  painting=false;
  c.canvas.style.cursor=next?'crosshair':'';
  c.toast(next==='soap'?'🧽 Pasa el dedo por Daniela para formar burbujas':next==='water'?'🚿 Pasa el agua por la espuma para aclararla':'¡Lista para jugar!');
  return tool;
 }
 const mark = (parent:TransformNode,local:Vector3,d:number,material:StandardMaterial)=>{
  const p=makeSphere('localized bath foam',d,material,parent,local.x,local.y,local.z-.055);
  p.scaling.set(.97,.84,.53);
  return p;
 };
 function pickModel(x:number,y:number){
  const r=c.canvas.getBoundingClientRect();
  if(x<r.left||x>r.right||y<r.top||y>r.bottom)return null;
  const hit=c.scene.pick(x-r.left,y-r.top,m=>{
   if(!m.isEnabled()||!m.isVisible||!m.isPickable)return false;
   if(!m.isDescendantOf(c.body))return false;
   return /^(face|shirt|dress|puff sleeve|arm|hand|leg|collar|cheek|nose|smile|big eye|hair cap|fringe|side hair|bang|twin tail|bow left|bow right|shoe|sock)/.test(m.name);
  });
  if(!hit?.hit||!hit.pickedPoint||!hit.pickedMesh)return null;
  const parent=hit.pickedMesh.isDescendantOf(c.head)?c.head:c.body;
  const inverse=parent.getWorldMatrix().clone();inverse.invert();
  const local=Vector3.TransformCoordinates(hit.pickedPoint,inverse);
  return{parent,local,world:hit.pickedPoint.clone()};
 }
 function bubbleWorldPosition(b:Bubble){b.mesh.computeWorldMatrix(true);return b.mesh.getAbsolutePosition();}
 function splash(parent:TransformNode,local:Vector3,mat:StandardMaterial,count:number,now:number){
  for(let i=0;i<count;i++){
   const theta=i*2.399+washStrokes*.73;
   const pos=local.add(new Vector3(Math.cos(theta)*.13,Math.sin(theta)*.13,-.11));
   const p=makeSphere('bath water glint',.075+(i%2)*.05,mat,parent,pos.x,pos.y,pos.z);
   specks.push({mesh:p,expires:now+500+i*65,vx:Math.cos(theta)*.28,vy:-.24-Math.sin(theta)*.16});
  }
 }
 function paint(screenX:number,screenY:number,force=false){
  if(!active||!tool)return false;
  const now=performance.now();
  if(!force&&now-lastStroke<65)return false;
  const hit=pickModel(screenX,screenY);
  if(!hit)return false;
  lastStroke=now;washStrokes++;
  if(tool==='soap'){
   if(bubbles.length>100){const old=bubbles.shift();old?.mesh.dispose();}
   for(let i=0;i<3;i++){
    const theta=washStrokes*2.14+i*2.1;
    const local=hit.local.add(new Vector3(Math.cos(theta)*.12,Math.sin(theta)*.13,0));
    const b=mark(hit.parent,local,.11+(washStrokes+i)%4*.025,i===0?shineMat:foamMat);
    bubbles.push({mesh:b,parent:hit.parent});
   }
   if(washStrokes%4===0)c.sound([840,1040]);
   return true;
  }
  // Water ONLY washes the surface near the touch. Remote foam and grime remain.
  const radius=.48,world=hit.world;
  let removed=0;
  for(let i=bubbles.length-1;i>=0;i--){
   if(Vector3.Distance(world,bubbleWorldPosition(bubbles[i]))<radius){
    bubbles[i].mesh.dispose();bubbles.splice(i,1);removed++;
   }
  }
  let grime=0;
  for(const spot of dirt){
   if(spot.cleaned||!spot.mesh.isEnabled())continue;
   if(Vector3.Distance(world,spot.mesh.getAbsolutePosition())<radius*.95){
    spot.cleaned=true;spot.mesh.setEnabled(false);grime++;
   }
  }
  splash(hit.parent,hit.local,waterMat,3,now);
  if(removed||grime)c.changeHygiene(Math.min(9,removed+grime*4));
  if(washStrokes%5===0)c.sound([630,820,990]);
  return true;
 }
 function startAt(x:number,y:number){
  if(!tool||!active)return false;
  painting=true;
  return paint(x,y,true);
 }
 function moveAt(x:number,y:number){
  if(!painting)return false;
  return paint(x,y);
 }
 function finish(){painting=false;}
 function clearFoam(){
  while(bubbles.length)bubbles.pop()?.mesh.dispose();
  for(const p of specks)p.mesh.dispose();specks.length=0;
 }
 function enter(isBath:boolean){
  active=isBath;painting=false;
  if(isBath){seedVisibleDirt();setTool('soap');c.camera.detachControl(c.canvas);}
  else {setTool(null);clearFoam();c.camera.attachControl(c.canvas,true);c.canvas.style.cursor='';}
  dirt.forEach(p=>p.mesh.setEnabled(isBath&&p.mesh.isEnabled()));
  if(isBath)seedVisibleDirt();
 }
 function tick(now:number){
  for(let i=specks.length-1;i>=0;i--){
   const p=specks[i];
   if(now>=p.expires){p.mesh.dispose();specks.splice(i,1);continue;}
   p.mesh.position.x+=p.vx*.007;
   p.mesh.position.y+=p.vy*.007;
   p.mesh.scaling.scaleInPlace(.99);
  }
  for(let i=0;i<bubbles.length;i++){
   const p=bubbles[i].mesh;
   if(p.isDisposed())continue;
   p.scaling.y=.82+Math.sin(now/320+i*.89)*.06;
  }
 }
 return{setTool,paint,startAt,moveAt,finish,enter,tick,getTool:()=>tool,isPainting:()=>painting,seedVisibleDirt};
}
