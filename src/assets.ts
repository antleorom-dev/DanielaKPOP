import {Scene,SceneLoader,TransformNode,AbstractMesh,Vector3} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

const base=import.meta.env.BASE_URL;
type Room='bedroom'|'kitchen'|'bathroom'|'stage'|'closet';
type Prop={name:string;x:number;z:number;height:number;replace?:string[]};
const positions:Partial<Record<Room,Prop[]>>={
 bedroom:[
  {name:'Bed_King',x:3,z:3.7,height:1.65,replace:['bed base','mattress','blanket','pillow','headboard']},
  {name:'Bookshelf',x:4.9,z:5.45,height:2.9},
  {name:'Carpet_Round',x:-.5,z:.9,height:.09},
  {name:'Houseplant_1',x:-5,z:2.3,height:1.8},
  {name:'Light_Floor1',x:5.4,z:2.15,height:1.9},
  {name:'Table_RoundSmall',x:-3.5,z:2.0,height:1.05}
 ],
 kitchen:[
  {name:'Kitchen_Fridge',x:-4.2,z:4.45,height:3.1,replace:['fridge','fridge color']},
  {name:'Kitchen_Sink',x:3.5,z:3.75,height:1.36},
  {name:'Houseplant_5',x:-3.4,z:2.4,height:1.35},
  {name:'Table_RoundSmall',x:-1.7,z:2.6,height:1.1}
 ],
 bathroom:[
  {name:'Bathroom_Shower1',x:4.5,z:4.2,height:2.8},
  {name:'Bathroom_Sink',x:-3.7,z:4.15,height:1.55,replace:['bath sink','sink top']},
  {name:'Bathroom_Bathtub',x:3,z:4.2,height:1.2,replace:['bathtub','water']}
 ],
 closet:[{name:'Houseplant_5',x:4.85,z:2.1,height:1.65}]
};
const attempted=new Set<Room>();
const okCache=new Map<string,boolean>();
async function exists(url:string){
 if(okCache.has(url))return okCache.get(url)!;
 try{const r=await fetch(url,{method:'HEAD'});okCache.set(url,r.ok);return r.ok;}catch{return false;}
}
function bounds(root:AbstractMesh){
 root.computeWorldMatrix(true);
 return root.getHierarchyBoundingVectors(true);
}
export async function installRoomAssets(room:Room,scene:Scene,group:TransformNode){
 if(attempted.has(room))return;
 attempted.add(room);
 let loadedCount=0;
 for(const p of positions[room]??[]){
  const file=p.name+'.glb',folder=base+'assets/interior/';
  if(!await exists(folder+file))continue;
  try{
   const imported=await SceneLoader.ImportMeshAsync('',folder,file,scene);
   const root=imported.meshes[0];
   if(!root)continue;
   const before=bounds(root);
   const height=before.max.y-before.min.y;
   const scale=p.height/Math.max(height,.001);
   if(!Number.isFinite(scale)||scale<.01||scale>500){root.dispose(false,true);continue;}
   root.scaling.scaleInPlace(scale);
   const after=bounds(root);
   const center=after.min.add(after.max).scale(.5);
   // Determine world-origin correction *before* reparenting so exported asset offsets don't hide furniture.
   root.position.addInPlace(new Vector3(p.x-center.x,-after.min.y,p.z-center.z));
   root.parent=group;
   root.isPickable=false;
   imported.meshes.forEach(m=>m.isPickable=false);
   // Only replace our primitive placeholder if the real imported model loaded successfully.
   if(p.replace){
    group.getChildMeshes(false).filter(m=>p.replace!.some(n=>m.name===n)).forEach(m=>{if(!imported.meshes.includes(m))m.setEnabled(false);});
   }
   loadedCount++;
  }catch(error){console.warn('Could not display interior model',p.name,error);}
 }
 console.info('DanielaKPOP 3D room',room,'imported',loadedCount,'of',(positions[room]??[]).length,'models');
}
export async function installHeldFood(scene:Scene,name:string,holder:TransformNode):Promise<boolean>{
 const folder=base+'assets/food/',url=folder+name+'.glb';
 if(!await exists(url)||holder.isDisposed())return false;
 try{
  const loaded=await SceneLoader.ImportMeshAsync('',folder,name+'.glb',scene);
  const root=loaded.meshes[0];
  if(!root)return false;
  if(holder.isDisposed()){root.dispose(false,true);return false;}
  const before=bounds(root);
  const span=before.max.subtract(before.min);
  const targetHeight=name==='soda-can'?.42:name==='cupcake'?.31:.34;
  const size=Math.max(span.x,span.y,span.z,.001);
  const factor=targetHeight/size;
  root.scaling.scaleInPlace(factor);
  const b=bounds(root);
  root.position.subtractInPlace(b.min.add(b.max).scale(.5));
  root.parent=holder;
  loaded.meshes.forEach(m=>m.isPickable=false);
  return true;
 }catch(error){console.warn('Could not display food GLB',name,error);return false;}
}
