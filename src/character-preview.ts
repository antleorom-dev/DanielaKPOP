import {
 ArcRotateCamera,Color3,Color4,DirectionalLight,Engine,HemisphericLight,
 MeshBuilder,Scene,SceneLoader,StandardMaterial,Vector3,AnimationGroup
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import './character-preview.css';

const canvas=document.querySelector<HTMLCanvasElement>('#lab-canvas')!;
const loader=document.querySelector<HTMLElement>('#lab-loading')!;
const info=document.querySelector<HTMLElement>('#lab-info')!;
const clips=document.querySelector<HTMLElement>('#lab-clips')!;
const base=import.meta.env.BASE_URL;
const engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:false});
engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.75));
const scene=new Scene(engine);
scene.clearColor=new Color4(.984,.916,.976,1);
const camera=new ArcRotateCamera('Daniela rig lab camera',-Math.PI/2,1.28,7.15,new Vector3(0,1.88,0),scene);
camera.attachControl(canvas,true);
camera.lowerRadiusLimit=4.35;camera.upperRadiusLimit=10.5;
camera.lowerBetaLimit=.45;camera.upperBetaLimit=1.69;
camera.wheelPrecision=40;camera.pinchPrecision=120;
const ambient=new HemisphericLight('warm soft light',new Vector3(0,1,0),scene);
ambient.intensity=.91;ambient.diffuse=Color3.FromHexString('#fff2fa');
const key=new DirectionalLight('studio soft light',new Vector3(-1.1,-2,-2),scene);
key.intensity=.42;
const floorMat=new StandardMaterial('pastel ground',scene);
floorMat.diffuseColor=Color3.FromHexString('#f5d8ed');floorMat.specularColor=Color3.Black();
const ground=MeshBuilder.CreateGround('studio stage',{width:8,height:8},scene);
ground.position.y=-.025;ground.material=floorMat;ground.isPickable=false;
const ringMat=new StandardMaterial('white ring',scene);ringMat.diffuseColor=Color3.FromHexString('#fff9ff');
const ring=MeshBuilder.CreateTorus('round podium border',{diameter:4.6,thickness:.065,tessellation:48},scene);
ring.position.y=.025;ring.material=ringMat;ring.isPickable=false;
const stageMat=new StandardMaterial('lilac podium',scene);stageMat.diffuseColor=Color3.FromHexString('#dec7f1');
const stage=MeshBuilder.CreateCylinder('display platform',{diameter:4.5,height:.1,tessellation:48},scene);
stage.position.y=-.055;stage.material=stageMat;stage.isPickable=false;
const icons:Record<string,string>={
 Idle:'💗',Wave:'👋',Giggle:'💕',Laugh:'😂',
 DancePop:'🎤',DanceCute:'🎀',DanceHipHop:'🔥',DanceDisco:'🪩',
 Sing:'🎶',Eat:'🍓',Drink:'🧋',Volley:'🏐',Sleep:'🌙',Bath:'🫧',Jump:'⭐',Celebrate:'🎉'
};
const titles:Record<string,string>={
 Idle:'Reposo',Wave:'Saludar',Giggle:'Risita',Laugh:'Reír',
 DancePop:'Pop K-pop',DanceCute:'Cute dance',DanceHipHop:'Hip-hop',DanceDisco:'Disco',
 Sing:'Cantar',Eat:'Comer',Drink:'Beber',Volley:'Voleibol',Sleep:'Dormir',Bath:'Ducha',
 Jump:'Saltar',Celebrate:'Celebrar'
};
const repeat=new Set(['Idle','DancePop','DanceCute','DanceHipHop','DanceDisco','Sleep','Sing']);
let current:AnimationGroup|null=null;
let idle:AnimationGroup|null=null;
function status(message:string,error=false){
 loader.textContent=message;
 loader.classList.toggle('lab-error',error);
 loader.hidden=false;
}
async function boot(){
 try{
  const manifest=await fetch(base+'assets/characters/daniela-manifest.json',{cache:'no-store'});
  if(!manifest.ok)throw new Error('El modelo todavía no se ha generado en GitHub Actions.');
  const meta=await manifest.json() as {animation_count:number;joint_count:number;mesh_count:number};
  status('Cargando a Daniela en 3D…');
  const res=await SceneLoader.ImportMeshAsync('',base+'assets/characters/','daniela-rigged.glb',scene);
  if(!res.animationGroups.length)throw new Error('El modelo no contiene clips de animación.');
  idle=res.animationGroups.find(a=>a.name==='Idle')??res.animationGroups[0];
  for(const group of res.animationGroups)group.stop();
  info.textContent=meta.joint_count+' huesos · '+res.animationGroups.length+' animaciones · Generado con Blender en GitHub';
  const anims=[...res.animationGroups].sort((a,b)=>Object.keys(icons).indexOf(a.name)-Object.keys(icons).indexOf(b.name));
  function play(clip:AnimationGroup){
   for(const group of res.animationGroups)group.stop();
   current=clip;
   const isLoop=repeat.has(clip.name);
   clip.start(isLoop,1,clip.from,clip.to,false);
   for(const btn of clips.querySelectorAll<HTMLButtonElement>('button')){
    const active=btn.dataset.clip===clip.name;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
   }
   if(!isLoop){
    clip.onAnimationGroupEndObservable.addOnce(()=>{
     if(current===clip&&idle&&clip!==idle)play(idle);
    });
   }
  }
  clips.replaceChildren();
  for(const group of anims){
   const btn=document.createElement('button');btn.type='button';
   btn.className='lab-clip';btn.dataset.clip=group.name;
   const emoji=document.createElement('span');emoji.textContent=icons[group.name]??'✨';
   const label=document.createElement('strong');label.textContent=titles[group.name]??group.name;
   btn.append(emoji,label);
   btn.addEventListener('click',()=>play(group));
   clips.append(btn);
  }
  loader.hidden=true;
  if(idle)play(idle);
 }catch(error){
  console.error('Blender rig preview failed:',error);
  status(error instanceof Error?error.message:'No se pudo cargar el personaje 3D.',true);
  info.textContent='El juego original sigue disponible y no ha sido modificado.';
 }
}
void boot();
engine.runRenderLoop(()=>scene.render());
window.addEventListener('resize',()=>engine.resize());
