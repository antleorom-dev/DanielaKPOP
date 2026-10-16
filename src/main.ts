import {Engine,Scene,ArcRotateCamera,Vector3,HemisphericLight,DirectionalLight,MeshBuilder,StandardMaterial,Color3,Color4,TransformNode} from '@babylonjs/core';
import './style.css';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});
const scene=new Scene(engine);scene.clearColor=new Color4(.11,.07,.19,1);
const camera=new ArcRotateCamera('camera',Math.PI/2,Math.PI/2.6,8,new Vector3(0,1.3,0),scene);camera.attachControl(canvas,true);camera.lowerRadiusLimit=5;camera.upperRadiusLimit=11;camera.lowerBetaLimit=.5;camera.upperBetaLimit=1.4;
new HemisphericLight('amb',new Vector3(0,1,0),scene).intensity=.9;new DirectionalLight('sun',new Vector3(-1,-2,-1),scene).intensity=.7;
function mat(n:string,color:string){const m=new StandardMaterial(n,scene);m.diffuseColor=Color3.FromHexString(color);return m;}
const pink=mat('pink','#ef83b7'),cream=mat('skin','#ffe2cc'),dark=mat('hair','#332047'),white=mat('white','#ffffff'),floor=mat('floor','#bba7e7'),purple=mat('wall','#8766c2');
MeshBuilder.CreateGround('floor',{width:12,height:12},scene).material=floor;
function box(n:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial){const o=MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);o.position.set(x,y,z);o.material=m;}
box('wall',12,5,.2,0,2.5,4.5,purple);box('side wall',.2,5,9,-5.9,2.5,0,pink);box('bed',2.6,.4,1.6,3,.45,2.3,white);box('blanket',2.3,.1,1.1,3,.72,2.55,pink);box('table',1.5,.15,1.2,-3,.85,2,white);
const avatar=new TransformNode('avatar',scene);
function ball(n:string,d:number,x:number,y:number,z:number,m:StandardMaterial){const o=MeshBuilder.CreateSphere(n,{diameter:d,segments:24},scene);o.parent=avatar;o.position.set(x,y,z);o.material=m;return o;}
ball('body',1.05,0,1.03,0,pink).scaling.y=1.25;ball('head',1.35,0,2.13,0,cream);ball('hair',1.4,0,2.42,.06,dark).scaling.y=.55;
ball('eye left',.12,-.25,2.18,-.62,dark);ball('eye right',.12,.25,2.18,-.62,dark);ball('smile',.11,0,1.91,-.66,pink).scaling.y=.35;
const left=ball('left arm',.38,-.72,1.2,0,cream);left.scaling.y=1.5;const right=ball('right arm',.38,.72,1.2,0,cream);right.scaling.y=1.5;ball('left leg',.38,-.32,.36,0,white).scaling.y=1.45;ball('right leg',.38,.32,.36,0,white).scaling.y=1.45;
type Mode='idle'|'dance'|'wave'|'rest';let mode:Mode='idle',start=performance.now(),mood=85,energy=90;
const hint=document.querySelector<HTMLElement>('#hint')!,moodLabel=document.querySelector<HTMLElement>('#mood')!,energyLabel=document.querySelector<HTMLElement>('#energy')!;
function action(next:Mode,text:string){mode=next;start=performance.now();hint.textContent=text;moodLabel.textContent=String(mood);energyLabel.textContent=String(energy);}
document.querySelector('#wave')!.addEventListener('click',()=>{mood=Math.min(100,mood+3);action('wave','¡Hola! ✨');});
document.querySelector('#dance')!.addEventListener('click',()=>{mood=Math.min(100,mood+5);energy=Math.max(0,energy-5);action('dance','¡A bailar! 🎶');});
document.querySelector('#rest')!.addEventListener('click',()=>{energy=Math.min(100,energy+10);action('rest','Hora de descansar 🌙');});
engine.runRenderLoop(()=>{const t=(performance.now()-start)/1000;avatar.position.y=mode==='dance'?Math.abs(Math.sin(t*7))*.25:mode==='rest'?-.2:Math.sin(t*2)*.035;avatar.rotation.y=mode==='dance'?Math.sin(t*8)*.4:0;left.rotation.z=mode==='dance'?Math.sin(t*9)*.7:0;right.rotation.z=mode==='wave'?Math.sin(t*10)*.8:mode==='dance'?-Math.sin(t*9)*.7:0;if(t>2.8&&mode!=='idle'){mode='idle';hint.textContent='¡Vamos a jugar!';}scene.render();});
window.addEventListener('resize',()=>engine.resize());