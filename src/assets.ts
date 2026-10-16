
import {Scene,SceneLoader,TransformNode} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
const base=import.meta.env.BASE_URL;
type Room='bedroom'|'kitchen'|'bathroom'|'stage'|'closet';
type Prop={name:string,x:number,z:number,height:number};
const positions:Partial<Record<Room,Prop[]>>={
 bedroom:[{name:'Houseplant_1',x:-5,z:1.9,height:1.6},{name:'Bookshelf',x:4.9,z:4.3,height:2.35},{name:'Carpet_Round',x:0,z:1.2,height:.12},{name:'Light_Floor1',x:5.3,z:1.2,height:2.1}],
 kitchen:[{name:'Kitchen_Fridge',x:-4.4,z:4.4,height:3.1},{name:'Kitchen_Sink',x:3.8,z:3.6,height:1.3},{name:'Houseplant_5',x:-3.7,z:2.5,height:1.2}],
 bathroom:[{name:'Bathroom_Shower1',x:4.6,z:3.5,height:3},{name:'Bathroom_Sink',x:-3.9,z:3.6,height:1.6},{name:'Bathroom_Bathtub',x:3,z:4.1,height:1.1}],
 closet:[{name:'Houseplant_5',x:4.9,z:2.4,height:1.6}]
};
const attempted=new Set<Room>();
const available=new Map<string,boolean>();
async function exists(url:string){
 if(available.has(url))return available.get(url)!;
 try{const r=await fetch(url,{method:'HEAD'});available.set(url,r.ok);return r.ok;}catch{return false;}
}
export async function installRoomAssets(room:Room,scene:Scene,group:TransformNode){
 if(attempted.has(room))return;attempted.add(room);
 for(const p of positions[room]??[]){
  const file=p.name+'.glb',url=base+'assets/interior/'+file;
  if(!await exists(url))continue;
  try{
   const loaded=await SceneLoader.ImportMeshAsync('',base+'assets/interior/',file,scene);
   const root=loaded.meshes[0];if(!root)continue;root.parent=group;root.computeWorldMatrix(true);
   const bounds=root.getHierarchyBoundingVectors(true);
   const span=bounds.max.subtract(bounds.min);
   const scale=p.height/Math.max(span.y,.001);
   if(!Number.isFinite(scale)||scale<=.01||scale>=500){root.dispose(false,true);continue;}
   root.scaling.setAll(scale);root.computeWorldMatrix(true);
   const b=root.getHierarchyBoundingVectors(true);
   root.position.set(p.x-(b.min.x+b.max.x)/2,-b.min.y,p.z-(b.min.z+b.max.z)/2);
  }catch(e){console.debug('Decoration unavailable:',p.name,e);}
 }
}
export async function installHeldFood(scene:Scene,name:string,holder:TransformNode):Promise<boolean>{
 const url=base+'assets/food/'+name+'.glb';
 if(!await exists(url)||holder.isDisposed())return false;
 try{
  const result=await SceneLoader.ImportMeshAsync('',base+'assets/food/',name+'.glb',scene);
  const root=result.meshes[0];if(!root)return false;
  if(holder.isDisposed()){root.dispose(false,true);return false;}
  root.parent=holder;root.scaling.setAll(name==='soda-can'?.55:.52);
  return true;
 }catch(e){console.debug('Food asset unavailable:',name,e);return false;}
}
