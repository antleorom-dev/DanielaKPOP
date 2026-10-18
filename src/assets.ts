import {Scene,SceneLoader,TransformNode,AbstractMesh,Vector3,StandardMaterial,Color3,Mesh} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export type Room='bedroom'|'kitchen'|'bathroom'|'stage'|'closet'|'arena';
export type Furniture={id:string;room:Room;name:string;label:string;emoji:string;root:TransformNode;height:number;isDefault:boolean};
type CatalogEntry={name:string;label:string;emoji:string;height:number;rooms:Room[]};
type Position={x:number;z:number;rotation?:number;scale?:number};
type Prop={name:string;x:number;z:number;height:number;replace?:string[]};
const base=import.meta.env.BASE_URL;
const all:Room[]=['bedroom','kitchen','bathroom','stage','closet'];
export const FURNITURE_CATALOG:CatalogEntry[]=[
 {name:'Bed_King',label:'Cama',emoji:'🛏️',height:1.55,rooms:['bedroom']},
 {name:'Carpet_Round',label:'Alfombra',emoji:'🟣',height:.055,rooms:all},
 {name:'Bookshelf',label:'Estantería',emoji:'📚',height:2.65,rooms:all},
 {name:'Curtains_Double',label:'Cortinas',emoji:'🪟',height:2.8,rooms:['bedroom','closet']},
 {name:'Houseplant_1',label:'Planta',emoji:'🌿',height:1.65,rooms:all},
 {name:'Houseplant_5',label:'Maceta',emoji:'🪴',height:1.15,rooms:all},
 {name:'Light_Floor1',label:'Lámpara',emoji:'💡',height:1.95,rooms:all},
 {name:'Table_RoundSmall',label:'Mesa redonda',emoji:'🪑',height:1.14,rooms:all},
 {name:'Kitchen_Fridge',label:'Nevera',emoji:'🧊',height:3.05,rooms:['kitchen']},
 {name:'Kitchen_Sink',label:'Fregadero',emoji:'🚰',height:1.35,rooms:['kitchen']},
 {name:'Bathroom_Bathtub',label:'Bañera',emoji:'🛁',height:1.14,rooms:['bathroom']},
 {name:'Bathroom_Shower1',label:'Ducha',emoji:'🚿',height:2.85,rooms:['bathroom']},
 {name:'Bathroom_Sink',label:'Lavabo',emoji:'🫧',height:1.5,rooms:['bathroom']},
 {name:'Bathroom_Mirror1',label:'Espejo',emoji:'🪞',height:1.65,rooms:['bathroom','closet']}
];
const initial:Partial<Record<Room,Prop[]>>={
 bedroom:[
  {name:'Bed_King',x:3,z:3.7,height:1.55,replace:['bed base','mattress','blanket','pillow','headboard']},
  {name:'Bookshelf',x:5.15,z:5.20,height:2.65},{name:'Carpet_Round',x:-.5,z:.9,height:.055},
  {name:'Houseplant_1',x:-5,z:2.3,height:1.6},{name:'Light_Floor1',x:5.4,z:2.15,height:1.95},
  {name:'Table_RoundSmall',x:-3.5,z:2,height:1.05}
 ],
 kitchen:[
  {name:'Kitchen_Fridge',x:-4.2,z:4.45,height:3.05,replace:['fridge','fridge color']},
  {name:'Kitchen_Sink',x:3.5,z:3.75,height:1.35},{name:'Houseplant_5',x:-3.4,z:2.4,height:1.15},
  {name:'Table_RoundSmall',x:-1.7,z:2.6,height:1.1}
 ],
 bathroom:[
  {name:'Bathroom_Shower1',x:4.5,z:4.2,height:2.8},{name:'Bathroom_Sink',x:-3.7,z:4.15,height:1.5,replace:['bath sink','sink top']},
  {name:'Bathroom_Bathtub',x:3,z:4.2,height:1.14,replace:['bathtub','water']}
 ],
 closet:[{name:'Houseplant_5',x:4.85,z:2.1,height:1.65}]
};
const attempted=new Set<Room>();
const furniture=new Map<string,Furniture>();
const existsCache=new Map<string,boolean>();
const materialCache=new Map<string,StandardMaterial>();
export const LAYOUT_KEY='danielakpop-scene-layout-v1';
type Layout={version:number;transforms:Record<string,Position>;added:{id:string;name:string;room:Room;position:Position}[];hidden:string[];lighting?:number};
export function readLayout():Layout{
 try{
  const v=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'null');
  if(v?.version===1&&v.transforms&&Array.isArray(v.added)&&Array.isArray(v.hidden))return v as Layout;
 }catch{}
 return{version:1,transforms:{},added:[],hidden:[]};
}
export function writeLayout(value:Layout){try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(value));}catch{}}
export function getFurniture(room?:Room){return [...furniture.values()].filter(item=>!room||item.room===room)}
export function hideFurniture(id:string){const item=furniture.get(id);if(item){item.root.setEnabled(false);furniture.delete(id);}}
export function getCatalog(room?:Room){return FURNITURE_CATALOG.filter(item=>!room||item.rooms.includes(room));}
function niceMaterial(scene:Scene,key:string,hex:string){
 if(materialCache.has(key))return materialCache.get(key)!;
 const m=new StandardMaterial('pastel furniture '+key,scene);
 m.diffuseColor=Color3.FromHexString(hex);
 m.ambientColor=Color3.FromHexString(hex).scale(.16);
 m.specularColor=new Color3(.08,.07,.09);
 materialCache.set(key,m);return m;
}
function recolor(scene:Scene,assetName:string,meshes:AbstractMesh[]){
 const palette:Record<string,string>={
  darkred:'#e2a7c5',red:'#f6b4d3',grey:'#f0dce8',white:'#fff7f2',
  wood:'#d4b0ba',lightorange:'#d9c6e9',brown:'#cdb8a2',
  black:'#8c789b',green:'#a7d6bc',plant_green:'#9bccad',
  plant:'#b8dfbd',lightgreen:'#b5e4cb'
 };
 for(const mesh of meshes){
  if(!(mesh instanceof Mesh)||!mesh.material)continue;
  const id=(mesh.name+' '+mesh.parent?.name).toLowerCase();
  let color=palette.white;
  for(const [name,hex] of Object.entries(palette)){
   if(id.includes(name))color=hex;
  }
  if(assetName==='Bed_King'){
   if(id.includes('darkred'))color='#edb3c9';
   if(id.includes('wood'))color='#d5a7bb';
   if(id.includes('grey'))color='#f4dce7';
   if(id.includes('red')&&!id.includes('darkred'))color='#f5c0d9';
  }else if(assetName==='Carpet_Round')color=id.includes('darkred')?'#bd9eda':'#efd7ed';
  else if(assetName==='Bookshelf')color='#e0bfd0';
  else if(assetName==='Kitchen_Fridge')color=id.includes('black')?'#f1bbd6':'#fffbf5';
  else if(assetName.startsWith('Bathroom'))color=id.includes('black')?'#a4b3cc':id.includes('grey')?'#bde0eb':'#f8fcff';
  else if(assetName.startsWith('Kitchen'))color=id.includes('black')?'#a78ca1':id.includes('wood')?'#d5abbd':'#e6f6f2';
  else if(assetName.startsWith('Houseplant'))color=id.includes('green')?'#99d3ac':id.includes('black')?'#a68a9d':'#d6b09e';
  const key=assetName+'-'+mesh.name+'-'+color;
  mesh.material=niceMaterial(scene,key,color);
  mesh.isPickable=true;
 }
}
async function exists(url:string){
 if(existsCache.has(url))return existsCache.get(url)!;
 try{const r=await fetch(url,{method:'HEAD'});existsCache.set(url,r.ok);return r.ok;}catch{return false;}
}
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export async function addFurniture(scene:Scene,group:TransformNode,room:Room,name:string,id:string,position:Position,height?:number,isDefault=false):Promise<Furniture|null>{
 if(furniture.has(id))return furniture.get(id)!;
 const catalog=FURNITURE_CATALOG.find(p=>p.name===name);
 if(!catalog)return null;
 const dir=base+'assets/interior/';
 if(!await exists(dir+name+'.glb'))return null;
 try{
  const imported=await SceneLoader.ImportMeshAsync('',dir,name+'.glb',scene);
  const root=imported.meshes[0];if(!root)return null;
  const initialBound=root.getHierarchyBoundingVectors(true);
  const size=initialBound.max.subtract(initialBound.min);
  const factor=(height??catalog.height)/Math.max(size.y,.001);
  if(!Number.isFinite(factor)||factor<.001||factor>2000){root.dispose(false,true);return null;}
  root.scaling.scaleInPlace(factor);
  root.computeWorldMatrix(true);
  const bound=root.getHierarchyBoundingVectors(true);
  const middle=bound.min.add(bound.max).scale(.5);
  const pivot=new TransformNode('furniture pivot '+id,scene);
  pivot.parent=group;
  root.position.subtractInPlace(new Vector3(middle.x,bound.min.y,middle.z));
  root.parent=pivot;
  root.computeWorldMatrix(true);
  pivot.position.set(clamp(position.x,-6.15,6.15),.015,clamp(position.z,-4.2,5.5));
  pivot.rotation.y=position.rotation??0;
  pivot.scaling.setAll(clamp(position.scale??1,.35,2.5));
  recolor(scene,name,imported.meshes);
  imported.meshes.forEach(mesh=>{mesh.metadata={...(mesh.metadata||{}),furnitureId:id};});
  const item:Furniture={id,room,name,label:catalog.label,emoji:catalog.emoji,root:pivot,height:height??catalog.height,isDefault};
  furniture.set(id,item);return item;
 }catch(e){console.warn('Furniture asset failed',name,e);return null;}
}
export async function installRoomAssets(room:Room,scene:Scene,group:TransformNode){
 if(attempted.has(room))return;
 attempted.add(room);
 const layout=readLayout();
 let n=0;
 for(const p of initial[room]??[]){
  const id='base:'+room+':'+p.name;
  if(layout.hidden.includes(id))continue;
  const override=layout.transforms[id];
  const config=override??{x:p.x,z:p.z};
  const item=await addFurniture(scene,group,room,p.name,id,config,p.height,true);
  if(item){
   n++;
   // Only hide the primitive stand-in after its nicer pastel model has appeared.
   if(p.replace)for(const mesh of group.getChildMeshes(false)){
    if(p.replace.some(name=>name===mesh.name)&&mesh.metadata?.furnitureId===undefined)mesh.setEnabled(false);
   }
  }
 }
 for(const extra of layout.added.filter(item=>item.room===room)){
  const cfg=layout.transforms[extra.id]??extra.position;
  await addFurniture(scene,group,room,extra.name,extra.id,cfg,undefined,false);
 }
 console.info('DanielaKPOP:',room,n,'pastel furniture models loaded');
}
export async function installHeldFood(scene:Scene,name:string,holder:TransformNode):Promise<boolean>{
 const dir=base+'assets/food/';if(!await exists(dir+name+'.glb')||holder.isDisposed())return false;
 try{
  const loaded=await SceneLoader.ImportMeshAsync('',dir,name+'.glb',scene);
  const root=loaded.meshes[0];if(!root)return false;
  if(holder.isDisposed()){root.dispose(false,true);return false;}
  const bound=root.getHierarchyBoundingVectors(true);
  const size=bound.max.subtract(bound.min);
  const factor=(name==='soda-can'?.42:name==='cupcake'?.31:.34)/Math.max(size.x,size.y,size.z,.001);
  root.scaling.scaleInPlace(factor);
  root.computeWorldMatrix(true);
  const b=root.getHierarchyBoundingVectors(true);
  root.position.subtractInPlace(b.min.add(b.max).scale(.5));
  root.parent=holder;
  loaded.meshes.forEach(mesh=>mesh.isPickable=false);
  return true;
 }catch(error){console.warn('Could not display food',name,error);return false;}
}
