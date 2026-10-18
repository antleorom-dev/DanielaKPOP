import {Engine,Scene,ArcRotateCamera,Vector3,HemisphericLight,DirectionalLight,PointLight,MeshBuilder,StandardMaterial,Color3,Color4,TransformNode,GlowLayer,Mesh,Matrix,SharpenPostProcess} from '@babylonjs/core';
import './style.css';
import {createInteractions} from './interactions';
import {dressRooms} from './decor';
import {setupSceneEditor} from './editor';
import {readLayout} from './assets';
type Room='bedroom'|'kitchen'|'bathroom'|'stage'|'closet'|'arena';
type Need='hunger'|'happiness'|'energy'|'hygiene';
type Move='idle'|'wave'|'dance'|'sleep'|'eat'|'drink'|'spin'|'bath'|'jump'|'giggle'|'laugh'|'surprised'|'volley'|'sing'|'dance2'|'dance3'|'dance4'|'dance5';
type State={hunger:number;happiness:number;energy:number;hygiene:number;coins:number;xp:number;level:number;outfit:number;hair:number;lastSaved:number;lastGift:string;followers:number;popularity:number;lastConcertAt:number;concerts:number;arenaTickets:number;arenaMilestones:number;arenaShows:number};
type Action={emoji:string;title:string;subtitle:string;colors:string[];move:Move;effect:Partial<Record<Need,number>>;coins:number;xp:number;message:string};
const initial:State={hunger:82,happiness:90,energy:88,hygiene:96,coins:250,xp:0,level:1,outfit:0,hair:0,lastSaved:Date.now(),lastGift:'',followers:0,popularity:0,lastConcertAt:0,concerts:0,arenaTickets:0,arenaMilestones:0,arenaShows:0};
let state={...initial};
try{const old=JSON.parse(localStorage.getItem('danielakpop-v2')||'null') as State|null;if(old&&typeof old.coins==='number'){state={...initial,...old};
 if(old.arenaMilestones===undefined){state.arenaMilestones=Math.floor(state.followers/1000);state.arenaTickets=state.arenaMilestones;}
 const now=Date.now(),mins=Math.min(240,Math.max(0,(now-(old.lastSaved||now))/60000));state.hunger=Math.max(0,state.hunger-mins*.13);state.energy=Math.max(0,state.energy-mins*.015);state.hygiene=Math.max(0,state.hygiene-mins*.05);state.happiness=Math.max(0,state.happiness-mins*.06);
 if(state.lastConcertAt>0){const quietHours=Math.max(0,(now-state.lastConcertAt)/3600000-18);if(state.followers>0){const loss=Math.min(.48,quietHours*.003);state.followers=Math.max(0,Math.floor(state.followers*(1-loss)));}state.popularity=Math.round(Math.max(0,Math.min(100,state.popularity-Math.floor(quietHours/5))));}}}catch{}
const $=(s:string)=>document.querySelector(s) as HTMLElement;
const num=(n:number)=>Math.round(Math.max(0,Math.min(100,n)));
let room:Room='bedroom';let move:Move='idle';let started=performance.now();let duration=2;let toastTimer=0;let needReminderTimer=0;let soundEnabled=true;
let concertActive=false,liveKind:'tiktok'|'arena'|null=null,liveLikes=0,liveComments=0,liveViewers=0,liveFollowerGain=0,liveMomentum=1,lastLiveTick=0,lastComplaintAt=0,lastComplaintNeed='';let concertStartedAt=0,livePerformanceSeconds=0;let play:ReturnType<typeof createInteractions>|undefined;let editor:ReturnType<typeof setupSceneEditor>|undefined;let lastTouch=0;let touchStreak=0;let touchStart:{x:number;y:number;time:number}|null=null;let reactionTimer=0;
function act(emoji:string,title:string,subtitle:string,colors:string[],move:Move,effect:Partial<Record<Need,number>>,coins:number,xp:number,message:string):Action{return{emoji,title,subtitle,colors,move,effect,coins,xp,message};}
const rooms:Record<Room,{title:string;kicker:string;sub:string;accent:string;actions:Action[]}>={
bedroom:{title:'Mi habitación',kicker:'✦ BIENVENIDA A CASA ✦',sub:'Un rinconcito lleno de sueños',accent:'#f7b4df',actions:[
act('🧸','Mimos','+ felicidad',['#ffa6c9','#ef77b8'],'wave',{happiness:12},0,9,'¡Qué abrazo tan bonito! 💖'),
act('💤','Dormir','Hasta recuperar energía',['#b7a5fb','#8b84ed'],'sleep',{},0,11,'Dulces sueños, Daniela 🌙'),
act('🏐','Voleibol','¡Golpea la pelota!',['#ffcf82','#ffa76b'],'volley',{happiness:14,energy:-6,hunger:-3},0,14,'¡Punto para Daniela! 🏐')]},
kitchen:{title:'Cocina dulce',kicker:'✦ SWEET LITTLE CAFÉ ✦',sub:'¡El menú favorito de Daniela!',accent:'#ffc4a8',actions:[
act('🍓','Fresas','10 monedas',['#ff9fb4','#f77d8c'],'eat',{hunger:22,happiness:4},-10,9,'¡Ñam! Fresas deliciosas 🍓'),
act('🥤','Refresco','15 monedas',['#d1acf4','#a47de0'],'drink',{hunger:14,happiness:10},-15,13,'¡Qué refrescante! 🥤'),
act('🧁','Cupcake','20 monedas',['#ffc891','#fa9db4'],'eat',{hunger:26,happiness:12},-20,17,'¡Un cupcake mágico! 🧁'),
act('🍕','Pizza','25 monedas',['#ffc26f','#f28b68'],'eat',{hunger:34,happiness:9},-25,19,'¡Pizza calentita! 🍕'),
act('🍜','Ramen','30 monedas',['#ffd58b','#e79a71'],'eat',{hunger:38,happiness:8},-30,22,'¡Ramen delicioso! 🍜'),
act('🍙','Onigiri','18 monedas',['#c8e6d0','#86c7a0'],'eat',{hunger:25,happiness:5},-18,14,'¡Onigiri de idol! 🍙'),
act('🍦','Helado','16 monedas',['#bfe5ff','#e3b8f4'],'eat',{hunger:16,happiness:15},-16,15,'¡Helado súper kawaii! 🍦'),
act('🥞','Pancakes','28 monedas',['#ffd29c','#ee9db8'],'eat',{hunger:32,happiness:13},-28,20,'¡Pancakes con fresas! 🥞')]},
bathroom:{title:'Baño burbuja',kicker:'✦ GLOW UP TIME ✦',sub:'Brilla por dentro y por fuera',accent:'#a8e6eb',actions:[
act('🧽','Esponja','Arrastra hasta Daniela',['#99dcef','#77bdea'],'bath',{},0,2,'¡Espuma! 🫧'),
act('🚿','Agua','Aclarar las burbujas',['#e4bbff','#b69bee'],'bath',{},0,2,'¡Agüita fresca! 🚿'),
act('🧴','Skincare','+ higiene',['#a3f1dc','#70c8bb'],'wave',{hygiene:14,happiness:4},0,8,'¡Sonrisa brillante! ✨')]},
stage:{title:'Dance studio',kicker:'✦ DREAMS COME TRUE ✦',sub:'El escenario es todo tuyo',accent:'#c2a1fc',actions:[
act('🎶','Bailar','Ensayar · +2 ★',['#e7a4ff','#aa82ed'],'dance',{happiness:12,energy:-1,hunger:-3,hygiene:-2},2,18,'¡Dale al ritmo! 🎶'),
act('🎤','Cantar','Ensayo · +3 ★',['#ff9dc8','#e577ba'],'sing',{energy:-1,hunger:-2,happiness:8},3,23,'¡Qué voz de estrella! 🎤'),
act('🪩','Dance pop','Ensayo · +2 ★',['#aa9efb','#d7a4ff'],'dance2',{energy:-2,happiness:12},2,20,'¡Coreografía perfecta! 🪩'),
act('💃','Dance cute','Ensayo · +2 ★',['#f3a4bb','#ea80c2'],'dance3',{energy:-2,happiness:12},2,20,'¡Qué adorable! 💃'),
act('🔥','Hip-hop','Ensayo · +3 ★',['#db9ffd','#a47eec'],'dance4',{energy:-2,happiness:14},3,24,'¡Daniela domina el ritmo! 🔥'),
act('🪩','Disco','Ensayo · +2 ★',['#f6b889','#e78ac8'],'dance5',{energy:-2,happiness:11},2,22,'¡Pura energía disco! ✨'),
act('📱','Directo TikTok','Gana seguidores en vivo',['#ffd18c','#f6a36c'],'sing',{energy:-2,hunger:-2,happiness:12},0,20,'¡Estamos en directo! 📱')]},
arena:{title:'Gran concierto',kicker:'✦ DANIELA WORLD TOUR ✦',sub:'Un gran escenario para una auténtica idol',accent:'#f39ccc',actions:[
act('🎟️','Empezar concierto','1 entrada por cada 1.000 fans',['#ffc878','#f18cbd'],'wave',{happiness:10,energy:-3},0,28,'¡Comienza el espectáculo! 🎟️'),
act('🎤','Cantar al público','Conquista a tus fans',['#ff9dc8','#e577ba'],'sing',{energy:-2,happiness:8},0,24,'¡El público canta contigo! 🎤'),
act('🪩','K-pop especial','Coreografía de estadio',['#bdacff','#9c85e9'],'dance2',{energy:-2,happiness:9},0,22,'¡El estadio vibra! 🪩'),
act('🔥','Hip-hop épico','¡Desata la energía!',['#f7a8b4','#b78bec'],'dance4',{energy:-2,happiness:10},0,24,'¡Todos saltan! 🔥'),
act('✨','Final de estrella','Gran cierre del show',['#ffe4a6','#ff99ba'],'dance5',{energy:-2,happiness:13},0,26,'¡Un final inolvidable! ✨'),
act('🏁','Terminar show','Guardar resultados',['#9ecfef','#b49cea'],'wave',{},0,8,'¡Hasta pronto, fans! 💜')]},
closet:{title:'Fashion room',kicker:'✦ DRESS LIKE A STAR ✦',sub:'Cada look cuenta una historia',accent:'#f7a7da',actions:[
act('👗','Nuevo look','Cambiar ropa',['#ffb2dc','#e989c6'],'spin',{happiness:7},0,8,'¡Nuevo outfit! 🎀'),
act('🎀','Peinado','Cambiar pelo',['#bfaafb','#9f89ed'],'spin',{happiness:6},0,8,'¡Nuevo peinado! 💜'),
act('📸','Selfie','+ 8 monedas',['#ffce91','#ff9cb8'],'wave',{happiness:9},8,12,'¡Una selfie preciosa! 📸')]}};
const canvas=document.querySelector('#game') as HTMLCanvasElement;
const engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:false});
// Babylon hardware scaling is INVERSE pixel density: 1 = CSS pixels, 0.5 = 2x retina.
// Mobile was rendering at 1 CSS pixel despite 2-3 physical pixels per CSS pixel.
const qualityParam=new URLSearchParams(location.search).get('quality');
const qualityMode=qualityParam==='high'||qualityParam==='performance'?qualityParam:'auto';
const pixelRatio=Math.max(1,window.devicePixelRatio||1);
const targetDensity=qualityMode==='high'?Math.min(pixelRatio,2.75):qualityMode==='performance'?Math.min(pixelRatio,1.3):Math.min(pixelRatio,2.1);
const bestScale=1/targetDensity;
let renderScale=bestScale;engine.setHardwareScalingLevel(renderScale);
const scene=new Scene(engine);scene.skipPointerMovePicking=true;scene.clearColor=new Color4(.97,.81,.92,1);
const camera=new ArcRotateCamera('camera',-Math.PI/2,1.23,9.25,new Vector3(0,1.8,-.35),scene);
camera.attachControl(canvas,true);camera.lowerRadiusLimit=6.8;camera.upperRadiusLimit=12.5;camera.lowerBetaLimit=.85;camera.upperBetaLimit=1.48;camera.lowerAlphaLimit=-Math.PI/2-.48;camera.upperAlphaLimit=-Math.PI/2+.48;camera.wheelPrecision=48;camera.pinchPrecision=140;
// Preserve crisp edges with the engine's native antialiasing (avoid FXAA blur).
const sharpen=new SharpenPostProcess('subtle image clarity',1,camera);
sharpen.edgeAmount=.035;sharpen.colorAmount=1;
const amb=new HemisphericLight('ambient',new Vector3(0,1,-.3),scene);amb.intensity=.8;amb.diffuse=new Color3(1,.95,1);
const sun=new DirectionalLight('sun',new Vector3(-1.5,-4,1.5),scene);sun.intensity=.34;
const rim=new PointLight('rim',new Vector3(2,4,1),scene);rim.intensity=.25;rim.diffuse=new Color3(1,.65,.85);rim.range=8;
const glow=new GlowLayer('fairytale glow',scene);glow.intensity=.01;glow.isEnabled=false;
function setSceneLighting(factor:number){
 const f=Math.max(.6,Math.min(1.13,factor));
 amb.intensity=.8*f;sun.intensity=.34*f;rim.intensity=.25*f;
}
setSceneLighting((readLayout().lighting??70)/70);
function mat(n:string,c:string,e?:string){const m=new StandardMaterial(n,scene);m.diffuseColor=Color3.FromHexString(c);m.specularColor=new Color3(.3,.23,.32);if(e)m.emissiveColor=Color3.FromHexString(e).scale(.13);return m;}
const skin=mat('peach','#ffe3cb'),blush=mat('blush','#f7a9b8'),dark=mat('eyes','#46305a'),white=mat('white','#fff9ff'),trim=mat('cream','#fff7ee'),gold=mat('gold','#ffd277','#65401c'),pink=mat('shiny pink','#ffc5ed','#603b58');
const hairColors=['#684a79','#d889a8','#a59acc','#c19c75','#57385c','#b4a7e4','#704b9b','#e0b9a3'].map((s,i)=>mat('hair'+i,s));
const dressColors=['#f49ccb','#ae91ed','#8fdacc','#ffb38f','#ffdf8b','#7d9bdc','#f4a9ba','#b7a4df'].map((s,i)=>mat('dress'+i,s));
const floorMat=mat('checker','#eddfed'),wall=mat('wall','#f5dfeb'),side=mat('side','#f0e2f2'),lilac=mat('lilac','#bf9de2'),wood=mat('wood','#c59cc8'),mint=mat('mint','#b4e7e1'),yellow=mat('yellow','#ffe1a6'),blue=mat('sky','#a4d7ee'),purple=mat('purple','#5d426f'),stageMat=mat('stage','#aa9bf0');
function put(mesh:Mesh,x:number,y:number,z:number,m:StandardMaterial,p?:TransformNode){mesh.position.set(x,y,z);mesh.material=m;if(p)mesh.parent=p;return mesh;}
function ball(n:string,d:number,x:number,y:number,z:number,m:StandardMaterial,p?:TransformNode){return put(MeshBuilder.CreateSphere(n,{diameter:d,segments:20},scene),x,y,z,m,p);}
function box(n:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial,p?:TransformNode){return put(MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene),x,y,z,m,p);}
function cyl(n:string,top:number,bottom:number,h:number,x:number,y:number,z:number,m:StandardMaterial,p?:TransformNode){return put(MeshBuilder.CreateCylinder(n,{diameterTop:top,diameterBottom:bottom,height:h,tessellation:28},scene),x,y,z,m,p);}
function ring(n:string,d:number,t:number,x:number,y:number,z:number,m:StandardMaterial,p?:TransformNode){return put(MeshBuilder.CreateTorus(n,{diameter:d,thickness:t,tessellation:36},scene),x,y,z,m,p);}
function star(x:number,y:number,z:number,s:number,m:StandardMaterial,p?:TransformNode){ball('star',s*.22,x,y,z,m,p);for(const k of [-1,1])box('spark ray',s*.15,s,.09,x,y,z,m,p).rotation.z=k*Math.PI/4;}
box('floor',14,.26,11,0,-.18,1.05,floorMat);box('back wall',14,7,.3,0,3.25,6.3,wall);box('side wall',.3,7,11,-7,3.25,1.05,side);box('skirting',14,.22,.16,0,.08,6.08,white);
const tileMat=mat('very subtle tile','#eee4ef');for(let i=-6;i<=6;i++)for(let j=-4;j<=5;j++)if((i+j)%2===0)box('tile',.97,.012,.97,i,0,j+.7,tileMat).visibility=.07;
const orbs:Mesh[]=[];for(let i=0;i<12;i++)orbs.push(ball('lights',.13,-5.8+i*1.04,5.15,5.96,i%2?gold:pink));
const roomMotion:{mesh:Mesh;baseY:number;speed:number;phase:number;amp:number}[]=[];
function lively(mesh:Mesh,speed=.0018,amp=.08,phase=0){roomMotion.push({mesh,baseY:mesh.position.y,speed,phase,amp});return mesh;}
const groups:Record<Room,TransformNode>={bedroom:new TransformNode('bedroom',scene),kitchen:new TransformNode('kitchen',scene),bathroom:new TransformNode('bathroom',scene),stage:new TransformNode('stage',scene),closet:new TransformNode('closet',scene),arena:new TransformNode('arena',scene)};
dressRooms(scene,groups);
const bed=groups.bedroom;
// Pillows belong at the NEAR (low-Z) end; Daniela's head rotates toward -Z.
box('bed base',2.35,.48,3.35,3,.36,3.48,wood,bed);
box('mattress',2.22,.32,3.14,3,.71,3.48,white,bed);
box('blanket',2.18,.12,1.65,3,.92,4.08,lilac,bed);
for(const x of [2.48,3.52])ball('pillow',.63,x,.98,2.3,white,bed).scaling.set(.95,.37,.8);
box('headboard',2.55,1.2,.18,3,.91,1.68,pink,bed);
for(let i=0;i<3;i++)star(2.35+i*.65,2.1+(i%2)*.35,1.56,.27,gold,bed);
box('vanity',1.65,.19,1.05,-3.7,1.05,3.5,white,bed);for(const x of [-4.3,-3.1])box('vanity leg',.14,.95,.14,x,.52,3.5,lilac,bed);
box('mirror frame',1.08,1.25,.09,-3.7,2,4.15,wood,bed);box('mirror glass',.88,1.06,.12,-3.7,2,4.03,blue,bed);
box('poster frame',1.65,1.65,.12,0,3.65,6.07,white,bed);box('poster',1.46,1.45,.14,0,3.65,5.96,lilac,bed);star(0,3.65,5.85,.95,pink,bed);
box('window frame',2.45,2.3,.15,-4.7,3.55,6.04,white,bed);box('sky',2.15,2.03,.16,-4.7,3.55,5.93,blue,bed);
for(const x of [-4.97,-4.67,-4.38])ball('cloud',.45,x,3.5,5.79,white,bed);
box('left curtain',.42,2.5,.23,-5.85,3.53,5.83,dressColors[0],bed);box('right curtain',.42,2.5,.23,-3.54,3.53,5.83,dressColors[0],bed);
cyl('soft bedroom rug',3.4,3.4,.035,-.5,.03,2.15,dressColors[0],bed);
for(let i=0;i<7;i++)lively(ball('bedroom fairy light',.11,-2.6+i*.82,4.72,5.78,i%2?gold:pink,bed),.0014,.045,i*.8);
ball('plush bunny body',.65,4.65,.55,3.5,white,bed).scaling.set(.8,1,.7);ball('plush bunny head',.55,4.65,1.02,3.45,white,bed);
for(const x of [4.48,4.82]){const ear=ball('plush bunny ear',.27,x,1.42,3.48,pink,bed);ear.scaling.set(.52,1.35,.5);}
cyl('plant pot',.58,.72,.62,-5.35,.32,3.5,gold,bed);for(let i=0;i<5;i++){const leaf=lively(ball('plant leaf',.45,-5.35+(i-2)*.14,.78+(i%2)*.15,3.5,mint,bed),.0011,.035,i);leaf.scaling.set(.38,1.1,.42);}
const kit=groups.kitchen;box('kitchen cabinet',5.1,1.65,1.7,2.1,.75,4.27,white,kit);box('counter',5.2,.22,1.9,2.1,1.67,4.27,yellow,kit);
for(let x=.4;x<4.4;x+=1.2){box('cabinet door',.96,1.3,.08,x,.73,3.34,mint,kit);ball('handle',.09,x,1,3.28,gold,kit);}
box('upper cabinet',3.1,1.25,.72,2.5,3.95,5.9,white,kit);
for(const x of [1.5,2.5,3.5])box('upper door',.9,1.05,.13,x,3.95,5.48,mint,kit);
cyl('cake stand',1.15,1.15,.13,1.4,1.88,4,white,kit);cyl('cake',.9,.9,.45,1.4,2.16,4,dressColors[0],kit);ball('icing',.84,1.4,2.42,4,white,kit).scaling.y=.3;ball('cherry',.23,1.4,2.6,4,gold,kit);
box('fridge',1.75,3.1,1.5,-4.2,1.55,4.6,white,kit);box('fridge color',1.59,1.7,.06,-4.2,2.13,3.82,mint,kit);
cyl('kitchen round table',2.15,2.15,.16,-1.45,1.02,3.35,white,kit);cyl('table pedestal',.38,.5,1.0,-1.45,.5,3.35,gold,kit);
const fruitBowl=cyl('fruit bowl',.9,.65,.22,-1.45,1.18,3.35,lilac,kit);
for(let i=0;i<6;i++)lively(ball('fruit',.24,-1.72+(i%3)*.27,1.36+Math.floor(i/3)*.12,3.28+(i%2)*.15,i%2?pink:gold,kit),.0015,.025,i);
for(const x of [-2.55,-.35]){cyl('kitchen stool',.75,.75,.18,x,.58,2.8,mint,kit);cyl('stool leg',.16,.16,.55,x,.28,2.8,gold,kit);}
const bath=groups.bathroom;box('bathtub',3.5,1.3,2.1,3.1,.72,4.12,white,bath);box('water',3.16,.08,1.8,3.1,1.39,4.1,blue,bath);
for(let i=0;i<13;i++)ball('bubble',.12+(i%4)*.07,1.8+(i*37%25)/10,1.5+(i%3)*.24,3.4+(i*19%15)/10,white,bath).visibility=.7;
box('bath sink',1.7,1.22,1.05,-3.8,.63,4.1,mint,bath);box('sink top',1.9,.21,1.21,-3.8,1.36,4.1,white,bath);box('bath mirror',1.75,2.1,.12,-3.8,3,5.88,gold,bath);box('mirror surface',1.53,1.89,.12,-3.8,3,5.77,blue,bath);
for(let i=0;i<9;i++)lively(ball('floating bath bubble',.14+(i%3)*.055,-5+i*1.15,2.2+(i%4)*.45,5.55,white,bath),.0011+i*.00005,.12,i*.7);
box('towel rail',2,.09,.1,-1.9,2.45,5.72,gold,bath);box('fluffy towel',1.25,1.25,.12,-1.9,1.88,5.63,dressColors[0],bath);
for(let i=0;i<3;i++){cyl('bath bottle',.25,.3,.65,-4.3+i*.45,1.82,4.25,i%2?pink:mint,bath);}
const stage=groups.stage;box('riser',10,.52,5.7,0,.23,3,purple,stage);box('dance floor',8.7,.06,4.7,0,.53,2.65,stageMat,stage);box('neon wall',10,5,.15,0,3.4,5.9,purple,stage);
for(let i=0;i<3;i++)ring('concert neon',1.2+i*.9,.075,0,3.2,5.7,i%2?pink:gold,stage);
for(const x of [-4.1,4.1]){cyl('speaker',1,1,2.1,x,1.9,4.9,purple,stage);ring('woofer rim',.64,.12,x,1.6,4.37,pink,stage);ball('woofer',.4,x,1.6,4.31,lilac,stage);ring('tweeter',.35,.09,x,2.36,4.37,gold,stage);}
for(let i=0;i<9;i++)star(-4+i,4.9+(i%3)*.18,5.7,.22,i%2?gold:pink,stage);
for(const x of [-3,-1.5,1.5,3]){const spot=lively(ball('stage moving light',.24,x,4.55,5.48,x<0?pink:gold,stage),.0023,.18,x);spot.scaling.set(.75,1.6,.55);}
for(let i=0;i<8;i++){const conf=lively(box('stage confetti',.08,.25,.04,-3.6+i*1.03,2.4+(i%3)*.62,5.35,i%2?gold:pink,stage),.0016,.18,i);conf.rotation.z=i*.7;}
const closet=groups.closet;box('wardrobe',3.6,4,1.3,3.5,2,4.8,white,closet);box('wardrobe back',3.2,3.64,.14,3.5,2,4.07,lilac,closet);
for(const x of [2.75,3.5,4.25]){box('dress display',.6,1.15,.14,x,2.6,3.97,dressColors[Math.round(x*3)%4],closet);ball('hanger',.12,x,3.32,3.96,gold,closet);}
box('fancy mirror',2.4,3.9,.13,-3.8,2.18,5.8,gold,closet);box('mirror glass',2.12,3.62,.14,-3.8,2.18,5.69,blue,closet);box('bench',2.4,.38,1,0,.43,4,dressColors[0],closet);
cyl('closet round rug',3.25,3.25,.035,-.4,.025,2.45,dressColors[0],closet);
for(let i=0;i<6;i++)lively(ball('closet sparkle bulb',.12,-2.1+i*.82,4.55,5.55,i%2?white:gold,closet),.0015,.05,i);
box('shoe shelf',2.25,.12,.75,4.3,.42,2.65,white,closet);for(let i=0;i<4;i++){const shoe=ball('display shoe',.34,3.55+i*.48,.68,2.5,dressColors[i%4],closet);shoe.scaling.set(1.25,.42,.72);}
// Lightweight extra decoration: five themed rooms, no texture downloads or new lights.
const decorMeshStart=scene.meshes.length;
const bookColors=[pink,lilac,mint,gold];
box('bedside table',.82,.65,.72,4.8,.4,2.25,white,bed);
box('bedside drawer',.7,.3,.05,4.8,.48,1.87,pink,bed);
cyl('bedside lamp base',.18,.26,.12,4.8,.79,2.25,gold,bed);
cyl('bedside lamp shade',.62,.34,.48,4.8,1.09,2.25,trim,bed);
box('bookshelf bedroom',2,.14,.55,-2.8,2.35,5.57,white,bed);
for(let i=0;i<5;i++)box('bedroom storybook',.23,.42+(i%2)*.12,.3,-3.5+i*.33,2.62,5.46,bookColors[i%4],bed);
for(const x of [2.55,3.45])ball('bed heart cushion',.35,x,1.1,4.12,pink,bed).scaling.set(.8,.4,.7);
ball('sleepy moon decor',.56,-1.4,4.13,5.77,gold,bed).scaling.z=.25;
box('dreams wall trim',2.8,.07,.1,3.1,3.96,5.78,white,bed);
for(const x of [1.95,2.85,3.75])ball('dreams pearl',.18,x,3.96,5.67,pink,bed);

// Café: recipe board, pastry display, pastel lighting and small kitchen details.
box('cafe chalkboard frame',2.15,1.7,.12,-.45,3.55,5.92,gold,kit);
box('cafe chalkboard',1.91,1.47,.13,-.45,3.55,5.82,purple,kit);
for(let i=0;i<3;i++)box('chalk menu line',1.12-i*.17,.045,.04,-.45,3.96-i*.33,5.73,i===1?pink:white,kit);
cyl('cafe pendant shade',1.1,.48,.4,-1.45,4.65,2.75,pink,kit);
cyl('cafe pendant bulb',.29,.29,.18,-1.45,4.37,2.75,gold,kit);
box('pastry tray',1.15,.09,.68,3.5,1.85,3.72,white,kit);
for(let i=0;i<3;i++){const cake=ball('mini pastry',.3,3.12+i*.35,2.05,3.68,i===1?lilac:pink,kit);cake.scaling.set(1,.55,1);ball('pastry cherry',.09,3.12+i*.35,2.21,3.68,gold,kit);}
box('cafe wall shelf',1.5,.12,.35,-5.25,3.25,5.67,white,kit);
for(let i=0;i<3;i++)cyl('spice jar',.27,.27,.39,-5.65+i*.39,3.5,5.59,i===1?gold:mint,kit);

// Bathroom: soft spa atmosphere and practical accessories.
box('spa wall shelf',2.15,.12,.46,.45,3.5,5.65,white,bath);
for(let i=0;i<4;i++){cyl('spa bottle',.28,.28,.5,-.25+i*.42,3.79,5.56,i%2?pink:mint,bath);ball('spa cap',.16,-.25+i*.42,4.08,5.56,gold,bath);}
box('bath rug',2.4,.045,1.25,1.8,.04,1.5,mint,bath);
for(let i=0;i<4;i++)ball('bath rug tuft',.16,1+i*.42,.11,1.05,white,bath).scaling.y=.3;
box('shower curtain rail',3.6,.08,.08,3.1,3.65,3.05,gold,bath);
for(let i=0;i<5;i++)box('spa curtain fold',.53,1.4,.07,1.9+i*.55,2.85,3.05,i%2?trim:mint,bath).visibility=.55;
cyl('soap dish',.6,.6,.08,-3.2,1.52,3.77,white,bath);
ball('pink soap',.36,-3.2,1.62,3.77,pink,bath).scaling.y=.42;

// Studio: illuminated LED panels, floor strips and backstage props.
for(const x of [-3.25,3.25]){
 box('studio led frame',1.05,2.55,.12,x,3.05,5.7,gold,stage);
 box('studio led panel',.85,2.35,.14,x,3.05,5.58,lilac,stage);
 for(let i=0;i<4;i++)box('studio led stripe',.67,.065,.04,x,2.2+i*.52,5.47,i%2?pink:mint,stage);
}
for(const x of [-3.7,3.7])box('dance floor edge glow',.1,.035,3.3,x,.58,2.6,pink,stage);
box('studio console',1.35,.6,.8,4.75,.95,1.15,purple,stage);
box('studio console screen',.85,.28,.05,4.75,1.26,.72,mint,stage);
for(let i=0;i<3;i++)ball('studio mixer dial',.13,4.35+i*.38,1.3,1.2,gold,stage);

// Closet: fashion accessories and a glowing make-up station.
box('closet accessory shelf',1.65,.12,.48,-.75,2.95,5.58,white,closet);
for(let i=0;i<3;i++){ball('boutique handbag',.36,-1.24+i*.5,3.25,5.49,i%2?pink:lilac,closet).scaling.set(1,.75,.55);ring('bag handle',.24,.045,-1.24+i*.5,3.49,5.47,gold,closet);}
box('makeup counter',1.5,.17,.7,-3.8,1.12,4.35,white,closet);
for(let i=0;i<3;i++)cyl('lipstick case',.14,.14,.3,-4.18+i*.32,1.37,4.12,i===1?gold:pink,closet);
for(const x of [-4.95,-2.65])for(const y of [1.25,2.05,2.85,3.65])ball('mirror bulb',.17,x,y,5.66,white,closet);
box('outfit inspiration frame',1.25,1.35,.12,1.1,3.85,5.88,gold,closet);
box('outfit inspiration print',1.04,1.15,.13,1.1,3.85,5.77,pink,closet);
star(1.1,3.9,5.68,.48,white,closet);
for(const decoration of scene.meshes.slice(decorMeshStart))decoration.isPickable=false;
// A separate low-poly stadium, intentionally light: no new downloads or textures.
const arenaRoot=groups.arena;
const stadiumAudience:{head:Mesh;phase:number;originalY:number}[]=[];
const crowdColors=[pink,lilac,mint,blue,gold,white];
box('arena main podium',9,.58,5.2,0,.26,-.65,purple,arenaRoot);
box('arena luminous runway',3,.09,2.15,0,.6,-3.15,lilac,arenaRoot);
for(const x of [-4.48,4.48])for(let i=0;i<4;i++)ball('arena podium light',.15,x,.63,-2.4+i*1.15,i%2?pink:gold,arenaRoot);
box('arena backdrop',12,5.4,.24,0,2.85,5.72,purple,arenaRoot);
box('arena fan banner',5.9,1.25,.15,0,4.48,5.5,pink,arenaRoot);
for(let i=0;i<14;i++)star(-5.35+i*.82,5.06,5.38,.17,i%2?gold:mint,arenaRoot);
for(const x of [-5.7,5.7]){
 box('arena stage tower',.72,4.45,.85,x,2.35,4.42,stageMat,arenaRoot);
 for(let i=0;i<6;i++)ball('arena neon bulb',.26,x,.73+i*.59,3.97,i%2?lilac:gold,arenaRoot);
}
for(let row=0;row<3;row++){
 const count=12+row*4;
 for(let i=0;i<count;i++){
  const x=(i-(count-1)/2)*(.58-row*.035);
  const y=.95+row*.61;
  const z=4.5+row*.52;
  const color=crowdColors[(i+row*3)%crowdColors.length];
  const head=ball('arena cheering fan',.33,x,y,z,color,arenaRoot);
  const torso=box('arena fan shirt',.29,.32,.2,x,y-.31,z,color,arenaRoot);
  head.isPickable=false;torso.isPickable=false;
  stadiumAudience.push({head,phase:i*.55+row*1.7,originalY:y});
 }
}
for(const z of [1.4,2.65,3.9])for(const x of [-3.9,3.9]){
 const beam=cyl('arena concert spotlight',.24,.48,2.35,x,2.2,z,lilac,arenaRoot);beam.visibility=.27;beam.isPickable=false;
}
// Procedural animated 3D K-pop idol
const idol=new TransformNode('Daniela',scene);idol.position.set(0,0,-1.33);
const body=new TransformNode('animated body',scene);body.parent=idol;
const shadow=cyl('contact shadow',1.6,1.6,.024,0,.015,0,mat('shadow','#d2a2ce'),idol);shadow.visibility=.27;
const legs:TransformNode[]=[];
for(const side of [-1,1]){
 const joint=new TransformNode('animated leg hip',scene);joint.parent=body;joint.position.set(side*.34,.86,0);legs.push(joint);
 ball('shoe',.43,side*.03,-.69,-.14,white,joint).scaling.set(1.1,.5,1.33);
 ball('leg',.43,0,-.27,0,skin,joint).scaling.y=1.15;
 cyl('sock',.41,.41,.3,0,-.53,0,trim,joint);
}
ball('shirt',1.24,0,1.54,0,trim,body).scaling.set(.86,.9,.72);
const dress=cyl('dress',.98,1.53,.93,0,1,0,dressColors[state.outfit%dressColors.length],body);
ball('collar',.3,0,1.92,-.46,trim,body).scaling.set(1.05,.5,.3);
for(let i=0;i<8;i++){const a=Math.PI*2*i/8;ball('lace',.23,Math.cos(a)*.7,.56,Math.sin(a)*.71,trim,body).scaling.y=.45;}
ball('dress badge',.17,0,1.38,-.51,gold,body).scaling.set(1.1,.96,.3);
ring('sparkly skirt trim',1.48,.036,0,.56,0,white,body);
for(const side of [-1,1]){
 ball('tiny sleeve shine',.12,side*.74,1.77,-.26,white,body).scaling.set(.52,.62,.21);
 ball('dress star',.09,side*.30,.9,-.62,gold,body).scaling.set(.7,.9,.36);
}
const arms:TransformNode[]=[];const sleeves:Mesh[]=[];
for(const s of [-1,1]){const pivot=new TransformNode('arm pivot',scene);pivot.parent=body;pivot.position.set(s*.67,1.79,0);arms.push(pivot);sleeves.push(ball('puff sleeve',.46,s*.13,-.18,0,dressColors[state.outfit%dressColors.length],pivot));ball('arm',.4,s*.2,-.43,0,skin,pivot).scaling.y=1.45;ball('hand',.36,s*.2,-.72,0,skin,pivot);}
const microphone=new TransformNode('microphone in hand',scene);microphone.parent=arms[1];
cyl('microphone handle',.14,.14,.45,.2,-.83,-.23,dark,microphone);
ball('microphone head',.27,.2,-1.08,-.23,gold,microphone);
microphone.setEnabled(false);
const head=new TransformNode('head',scene);head.parent=body;head.position.set(0,2.56,0);
ball('face',1.65,0,0,-.055,skin,head).scaling.set(.97,1.03,.89);
const hairParts:Mesh[]=[];function hair(n:string,d:number,x:number,y:number,z:number){const o=ball(n,d,x,y,z,hairColors[state.hair%hairColors.length],head);hairParts.push(o);return o;}
hair('hair cap',1.77,0,.28,.065).scaling.set(1.02,.78,.94);hair('fringe',1.43,0,.59,-.43).scaling.set(1,.39,.63);
for(const x of [-.46,-.18,.15,.45])hair('bang',.48,x,.39,-.69).scaling.set(.88,.76,.49);
const fashionHair:TransformNode[]=[];
for(let style=0;style<8;style++){
 const root=new TransformNode('hair style '+style,scene);root.parent=head;fashionHair.push(root);
 const shade=hairColors[style];
 if(style===0){for(const side of [-1,1]){const curl=ball('soft pony curl',.55,side*1.12,-.58,.24,shade,root);curl.scaling.set(.57,1.35,.65);}}
 if(style===1){for(const side of [-1,1]){const tail=ball('high pony',.65,side*.96,.22,.35,shade,root);tail.scaling.set(.65,1.7,.6);ball('pink scrunchie',.26,side*.9,.7,.25,pink,root);}}
 if(style===2){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const curl=ball('short bob curl',.5,Math.cos(a)*.7,-.4,Math.sin(a)*.55,shade,root);curl.scaling.set(.85,.65,.85);}}
 if(style===3){for(const side of [-1,1]){const long=ball('long silky hair',.67,side*.75,-.78,.27,shade,root);long.scaling.set(.65,2.2,.72);}}
 if(style===4){for(const side of [-1,1]){ball('space bun',.75,side*.94,.8,.12,shade,root);ball('bun pearl',.19,side*.95,.93,-.22,white,root);}}
 if(style===5){const back=ball('low side pony',.8,.96,-.82,.4,shade,root);back.scaling.set(.8,1.7,.7);ball('side ribbon',.32,.82,-.18,-.22,pink,root);}
 if(style===6){for(const side of [-1,1]){const braid=ball('braid',.4,side*.91,-.78,.25,shade,root);braid.scaling.set(.55,2.3,.65);for(let j=0;j<3;j++)ball('braid link',.29,side*.91,-.45-j*.39,.02,shade,root);}}
 if(style===7){const bun=ball('elegant updo',1.1,0,.87,.32,shade,root);bun.scaling.set(1,.68,.7);ball('updo gem',.19,.22,1.03,-.12,gold,root);}
}
const fashionOutfits:TransformNode[]=[];
for(let style=0;style<8;style++){
 const root=new TransformNode('outfit silhouette '+style,scene);root.parent=body;fashionOutfits.push(root);
 const fabric=dressColors[style];
 if(style===0){for(const x of [-.48,.48])ball('heart hem',.22,x,.61,-.51,pink,root);}
 if(style===1){ring('princess tier',1.48,.085,0,.9,0,white,root);ring('princess lace',1.1,.06,0,1.22,0,white,root);}
 if(style===2){box('casual hoodie pocket',.68,.28,.14,0,1.12,-.59,fabric,root);ball('hood',.64,0,1.9,.35,fabric,root).scaling.set(1.6,.58,.7);}
 if(style===3){for(const x of [-.43,.43])box('overall strap',.2,.8,.12,x,1.53,-.48,white,root);box('overall bib',.95,.5,.13,0,1.18,-.58,fabric,root);}
 if(style===4){for(let j=0;j<10;j++){const a=j/10*Math.PI*2;ball('idol sparkle hem',.22,Math.cos(a)*.7,.59,Math.sin(a)*.7,gold,root);}ball('idol chest star',.32,0,1.48,-.6,gold,root);}
 if(style===5){box('sport jersey front',.95,.42,.13,0,1.45,-.58,white,root);for(const x of [-.65,.65])box('sport stripe',.1,.4,.13,x,1.65,-.31,white,root);}
 if(style===6){for(const x of [-.53,.53])ball('ballet tulle',.52,x,.66,-.18,white,root).scaling.set(1.4,.4,1.2);ring('ballet tulle ring',1.6,.11,0,.75,0,white,root);}
 if(style===7){box('retro belt',1.33,.15,.14,0,1.12,-.46,gold,root);for(const x of [-.43,.43])ball('retro button',.13,x,1.48,-.56,white,root);}
}
const eyelids:Mesh[]=[];
const eyeGlints:Mesh[]=[];
const sleepingLashes:Mesh[]=[];
const twinTails:Mesh[]=[];
const eyeMeshes:Mesh[]=[];
const eyeBaseX:number[]=[];
const eyeBaseY:number[]=[];
for(const s of [-1,1]){hair('side hair',.53,s*.78,-.25,-.08).scaling.set(.62,1.9,.85);
 const tail=hair('twin tail',.9,s*1.04,-.21,.2);tail.scaling.set(.7,1.18,.7);twinTails.push(tail);
ball('hair tie',.27,s*.87,.15,.02,pink,head);
const eye=ball('big eye',.33,s*.33,-.08,-.755,dark,head);eye.scaling.set(.8,1.1,.25);eyeMeshes.push(eye);eyeBaseX.push(eye.position.x);eyeBaseY.push(eye.position.y);
const lid=ball('soft eyelid',.35,s*.33,-.08,-.784,skin,head);lid.scaling.set(.83,.025,.25);lid.visibility=0;eyelids.push(lid);
const lash=MeshBuilder.CreateLines('closed eye smile',{points:[
 new Vector3(s*.33-.22,-.11,-.862),new Vector3(s*.33-.11,-.18,-.87),
 new Vector3(s*.33+.04,-.19,-.87),new Vector3(s*.33+.22,-.1,-.862)
]},scene);lash.parent=head;lash.color=Color3.FromHexString('#6b446d');lash.isVisible=false;sleepingLashes.push(lash);
const glint=ball('eye light',.11,s*.33-.055,-.005,-.823,white,head);glint.scaling.z=.35;eyeGlints.push(glint);
 eyeGlints.push(ball('eye sparkle',.05,s*.33+.055,-.17,-.829,white,head));
ball('cheek',.3,s*.62,-.31,-.68,blush,head).scaling.set(.85,.35,.2);
 ball('eye outer lash',.12,s*.48,.02,-.77,dark,head).scaling.set(.58,.22,.22);
 ball('eyebrow',.17,s*.32,.22,-.74,hairColors[state.hair%hairColors.length],head).scaling.set(1,.20,.22);
 ball('cheek twinkle',.07,s*.66,-.25,-.716,white,head).scaling.set(.5,.56,.21);
}
const mouth=ball('smile',.18,0,-.41,-.79,mat('smile pink','#b95e89'),head);mouth.scaling.set(1,.42,.27);const laughingMouth=ball('laughing mouth',.22,0,-.41,-.8,dark,head);laughingMouth.scaling.set(.88,.72,.32);laughingMouth.setEnabled(false);ball('nose',.09,0,-.25,-.817,blush,head).scaling.set(.66,.6,.3);
const bow=new TransformNode('hair bow',scene);bow.parent=head;bow.position.set(.57,.91,-.22);
ball('bow left',.43,-.21,0,0,pink,bow).scaling.set(1,.6,.45);ball('bow right',.43,.21,0,0,pink,bow).scaling.set(1,.6,.45);ball('bow knot',.21,0,0,-.12,gold,bow);star(-.12,.95,-.6,.18,gold,head);
function fashion(){
 const outfit=state.outfit%dressColors.length,hairStyle=state.hair%hairColors.length;
 dress.material=dressColors[outfit];sleeves.forEach(s=>s.material=dressColors[outfit]);
 hairParts.forEach(s=>s.material=hairColors[hairStyle]);
 fashionOutfits.forEach((variant,i)=>variant.setEnabled(i===outfit));
 fashionHair.forEach((variant,i)=>variant.setEnabled(i===hairStyle));
 twinTails.forEach(tail=>tail.setEnabled([0,1,4,6].includes(hairStyle)));
}
fashion();
// A complete sleep cycle: Daniela walks to her bed, lies down, recovers gradually,
// then gets up. Leaving the bedroom cancels safely without losing earned energy.
type SleepPhase='awake'|'walking'|'resting'|'waking';
let sleepPhase:SleepPhase='awake',sleepClock=0,sleepLast=0,sleepRestStart=0,sleepLastPaint=0;
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
function resetSleepPose(){
 idol.position.set(0,0,-1.33);idol.rotation.x=0;idol.scaling.setAll(1);
 shadow.visibility=.27;camera.target.set(0,1.8,-.35);
}
function stopSleep(){
 if(sleepPhase==='awake')return;
 sleepPhase='awake';resetSleepPose();move='idle';started=performance.now();duration=2;
}
function startSleep(){
 if(sleepPhase!=='awake'){toast('Daniela está descansando… 💤');return;}
 if(state.energy>=100){toast('¡Daniela ya tiene toda su energía! 💜');return;}
 sleepPhase='walking';sleepClock=performance.now();sleepLast=sleepClock;sleepLastPaint=0;
 animate('idle',3.5);reactionBubble('Voy a mi camita… 💤',false,2700);
 $('#scene-desc').textContent='🌙 Daniela se dirige a su cama';save();
}
function tickSleep(now:number){
 if(sleepPhase==='awake')return;
 const dt=Math.min(.07,Math.max(0,(now-sleepLast)/1000));sleepLast=now;
 if(sleepPhase==='walking'){
  const walk=smooth((now-sleepClock)/2400),lie=smooth((now-sleepClock-2400)/1400);
  idol.position.set(3*walk,1.05*lie,-1.33+5.48*walk);idol.rotation.x=-Math.PI*.5*lie;
  idol.scaling.setAll(1-.4*lie);shadow.visibility=.27*(1-lie);
  camera.target.set(1.6*walk,1.8-.12*lie,-.35+2.15*walk);
  if(lie>=1){sleepPhase='resting';sleepRestStart=now;move='sleep';started=now;duration=1e9;sfx('sleep');reactionBubble('Zzz… dulces sueños 🌙',false,2200);}
 }else if(sleepPhase==='resting'){
  state.energy=Math.min(100,state.energy+dt*2);
  if(now-sleepLastPaint>320){sleepLastPaint=now;$('#scene-desc').textContent='💤 Descansando… energía '+num(state.energy)+'%';render();}
  if(state.energy>=100&&now-sleepRestStart>6500){
   sleepPhase='waking';sleepClock=now;move='idle';started=now;duration=2.5;
   state.hunger=num(state.hunger-3);gainXP(11);save();toast('¡Daniela ha recuperado toda su energía! 🌞');reactionBubble('¡Qué bien he dormido! 💗',false,2600);
  }
 }else{
  const stand=smooth((now-sleepClock)/900),walk=smooth((now-sleepClock-900)/1700),r=1-walk;
  idol.position.set(3*r,1.05*(1-stand),-1.33+5.48*r);idol.rotation.x=-Math.PI*.5*(1-stand);
  idol.scaling.setAll(1-.4*(1-stand));shadow.visibility=.27*stand;
  camera.target.set(1.6*r,1.8-.12*(1-stand),-.35+2.15*r);
  if(walk>=1){stopSleep();$('#scene-desc').textContent=rooms.bedroom.sub;render();}
 }
}
function save(){state.lastSaved=Date.now();try{localStorage.setItem('danielakpop-v2',JSON.stringify(state));}catch{}}
function updateArenaUnlocks(){
 const reached=Math.floor(state.followers/1000);
 if(reached>state.arenaMilestones){
  const newTickets=reached-state.arenaMilestones;
  state.arenaTickets+=newTickets;state.arenaMilestones=reached;
  toast('🎟️ ¡Has desbloqueado '+newTickets+' entrada(s) para un gran concierto!');
  reward('¡NUEVO CONCIERTO! 🎟️');
 }
}
function renderArenaPass(){
 const el=document.querySelector<HTMLElement>('#arena-tickets');
 if(el)el.textContent=String(state.arenaTickets);
 const next=(state.arenaMilestones+1)*1000;
 const progress=document.querySelector<HTMLElement>('#arena-progress');
 if(progress)progress.textContent=state.arenaTickets>0?'🎟️ '+state.arenaTickets+' entrada(s) disponibles':'Próxima entrada: '+next.toLocaleString('es-ES')+' seguidores';
}
function render(){for(const n of ['hunger','happiness','energy','hygiene'] as Need[]){$('#'+n+'-value').textContent=num(state[n])+'%';$('#'+n+'-meter').style.width=num(state[n])+'%';}
renderArenaPass();$('#coins').textContent=state.coins.toLocaleString('es-ES');$('#followers').textContent=state.followers.toLocaleString('es-ES');$('#followers-live').textContent=concertActive&&liveFollowerGain?'+'+liveFollowerGain+' LIVE':'';
$('#popularity').textContent=String(num(state.popularity));$('#popularity-bar').style.width=num(state.popularity)+'%';
$('#popularity-label').textContent=state.popularity>=90?'SUPERSTAR GLOBAL':state.popularity>=70?'IDOL ESTRELLA':state.popularity>=45?'EN TENDENCIA':state.popularity>=20?'PROMESA K-POP':'NUEVA IDOL';
$('#level').textContent=String(state.level);$('#xp').textContent=String(state.xp);$('#xp-target').textContent=String(state.level*100);$('#xp-bar').style.width=state.xp/(state.level*100)*100+'%';
const weak=(['hunger','happiness','energy','hygiene'] as Need[]).reduce((a,b)=>state[a]<state[b]?a:b);
const msg:Record<Need,string>={hunger:'Tiene hambre 🍓',happiness:'Quiere mimos 💗',energy:'Necesita dormir 🌙',hygiene:'Hora del baño 🫧'};
$('#care-status').textContent=state[weak]<40?'¡Necesita cuidados!':state[weak]<65?'Un poquito de atención':'¡Todo genial!';
$('#mood-message').textContent=state[weak]<55?msg[weak]:move==='dance'?'¡Daniela siente la música! 🎶':move==='sleep'?'Shhh… está descansando 💤':'Daniela está feliz ✨';}
function animate(next:Move,length=2.8){move=next;started=performance.now();duration=length;}
function showRoom(next:Room){if(room==='bedroom'&&next!=='bedroom')stopSleep();if((room==='stage'||room==='arena')&&next!==room&&concertActive)endConcert(true);room=next;play?.enterRoom(next);void editor?.onRoomChanged(next);for(const [k,g] of Object.entries(groups))g.setEnabled(k===room);
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-room]')){const active=button.dataset.room===room;button.classList.toggle('selected',active);button.setAttribute('aria-current',active?'page':'false');}
const entry=rooms[room];$('#scene-name').textContent=entry.title;$('#scene-kicker').textContent=entry.kicker;$('#scene-desc').textContent=entry.sub;const title=$('.scene-title');title.classList.remove('enter');void title.offsetWidth;title.classList.add('enter');$('#character-tag').classList.remove('visible','complaint');
$('#action-label').textContent=room==='arena'?'¡El público te espera!':room==='stage'?'¡Es hora de brillar!':room==='kitchen'?'¿Qué le apetece comer?':room==='closet'?'¡Cambia tu estilo!':'¿Qué hacemos hoy?';$('.action-hint').textContent=entry.actions.length>3?'DESLIZA PARA VER MÁS →':'ARRASTRA O TOCA ↗';
wall.diffuseColor=Color3.FromHexString(room==='arena'?'#9476c5':room==='stage'?'#b8a1da':room==='bathroom'?'#dcedf3':room==='kitchen'?'#f9e5db':room==='closet'?'#f5deeb':'#f5dfeb');
floorMat.diffuseColor=Color3.FromHexString(room==='arena'?'#b995e1':room==='stage'?'#b9b1dc':room==='bathroom'?'#d8eaf0':room==='kitchen'?'#efdfcf':'#eadfeb');rim.diffuse=Color3.FromHexString(entry.accent);
const row=$('#actions');row.replaceChildren();
entry.actions.forEach((a,i)=>{const button=document.createElement('button');button.className='action-card';button.style.setProperty('--a',a.colors[0]);button.style.setProperty('--b',a.colors[1]);
button.innerHTML='<span class="action-emoji" aria-hidden="true">'+a.emoji+'</span><span class="action-text"><strong>'+a.title+'</strong><small>'+a.subtitle+'</small></span>';button.setAttribute('aria-label',a.title+', '+a.subtitle);button.addEventListener('click',()=>{if(button.dataset.dragged!=='1')perform(i);});row.append(button);});play?.decorateActions(room,row);
animate('wave',1.1);}
function toast(msg:string){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('#toast').classList.remove('show'),2400);}
function reward(msg:string){const el=$('#reward');el.textContent=msg;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function reactionBubble(text:string,complaint=false,hold=1700){
 $('#mood-message').textContent=text;const tag=$('#character-tag');tag.classList.toggle('complaint',complaint);
 const app=$('#app').getBoundingClientRect(),r=canvas.getBoundingClientRect(),engine=scene.getEngine();
 const anchor=Vector3.Project(head.getAbsolutePosition().add(new Vector3(.78,.48,-.15)),Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight()));
 const x=r.left-app.left+anchor.x*r.width/engine.getRenderWidth(),y=r.top-app.top+anchor.y*r.height/engine.getRenderHeight();
 tag.style.left=Math.max(82,Math.min(app.width-82,x))+'px';tag.style.top=Math.max(78,Math.min(app.height-205,y))+'px';tag.style.bottom='auto';
 tag.classList.add('visible');clearTimeout(reactionTimer);reactionTimer=window.setTimeout(()=>{tag.classList.remove('visible');tag.classList.remove('complaint');},hold);
}
function heartBurst(x:number,y:number,strong=false){const el=$('#touch-effects');const icons=strong?['💖','💗','✨','💕','🌟','💜','🎀']:['💗','✨','💕','💖'];icons.forEach((icon,i)=>{const particle=document.createElement('span');particle.className='touch-heart';particle.textContent=icon;particle.style.left=x+'px';particle.style.top=y+'px';const angle=-Math.PI*(.15+.7*i/Math.max(1,icons.length-1));particle.style.setProperty('--dx',Math.cos(angle)*(45+i%3*17)+'px');particle.style.setProperty('--dy',(-60-i%3*20)+'px');particle.style.setProperty('--rot',(-24+i*11)+'deg');particle.style.animationDelay=(i%3)*65+'ms';el.append(particle);window.setTimeout(()=>particle.remove(),1450);});}
function touchDaniela(x:number,y:number,headTap:boolean){const now=performance.now();touchStreak=now-lastTouch<1300?touchStreak+1:1;lastTouch=now;const bigLaugh=touchStreak>=3||headTap;animate(bigLaugh?'laugh':'giggle',bigLaugh?1.75:1.25);state.happiness=num(state.happiness+(bigLaugh?2:1));heartBurst(x,y,bigLaugh);reactionBubble(touchStreak>=5?'¡Para, que me da la risa! 😂':bigLaugh?'¡Jijijí! 😂💖':'¡Jeje! 💕');if(touchStreak===5)reward('+5 💗');render();save();sound(bigLaugh?[784,988,1175,988]:[880,1046]);if('vibrate' in navigator)navigator.vibrate?.(bigLaugh?[12,24,12]:12);$('#tutorial').classList.add('hidden');try{localStorage.setItem('danielakpop-tutorial','yes');}catch{}}

let audioCtx:AudioContext|null=null;
function audio(){if(!soundEnabled)return null;try{audioCtx??=new AudioContext();if(audioCtx.state==='suspended')void audioCtx.resume();return audioCtx;}catch{return null;}}
function sound(notes:number[]=[523,659,784]){const ctx=audio();if(!ctx)return;notes.forEach((hz,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime+i*.095;osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.035,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+.23);osc.connect(gain);gain.connect(ctx.destination);osc.start(time);osc.stop(time+.24);});}
type Sfx='eat'|'drink'|'ball'|'sleep'|'wash'|'cheer';
function sfx(kind:Sfx){const ctx=audio();if(!ctx)return;
 const now=ctx.currentTime;
 const voices:Record<Sfx,{freq:number;end:number;type:OscillatorType;duration:number;vol:number}[]>={
 eat:[{freq:390,end:240,type:'triangle',duration:.09,vol:.035},{freq:330,end:200,type:'sine',duration:.12,vol:.03}],
 drink:[{freq:720,end:460,type:'sine',duration:.19,vol:.028},{freq:880,end:600,type:'sine',duration:.13,vol:.018}],
 ball:[{freq:180,end:85,type:'triangle',duration:.13,vol:.065},{freq:420,end:230,type:'sine',duration:.07,vol:.018}],
 sleep:[{freq:330,end:260,type:'sine',duration:.48,vol:.025},{freq:440,end:330,type:'sine',duration:.6,vol:.018}],
 wash:[{freq:700,end:950,type:'sine',duration:.18,vol:.018}],
 cheer:[{freq:600,end:950,type:'triangle',duration:.18,vol:.028}]
 };
 for(const [i,v] of voices[kind].entries()){const osc=ctx.createOscillator(),gain=ctx.createGain(),start=now+i*.065;
 osc.type=v.type;osc.frequency.setValueAtTime(v.freq,start);osc.frequency.exponentialRampToValueAtTime(v.end,start+v.duration);
 gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(v.vol,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+v.duration);
 osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+v.duration+.01);}
}
function gainXP(amount:number){state.xp+=amount;while(state.xp>=state.level*100){state.xp-=state.level*100;state.level++;state.coins+=50;toast('¡Nivel '+state.level+'! +50 monedas ✨');reward('LEVEL UP! 🌟');}}
const liveMessages=[
 '¡Daniela te amooo! 💜','ESA COREO 🔥','queen!! 👑','qué monaaa 😭💕','otra canción porfa 🎤',
 'SLAYYY ✨','el outfit 💖','🔥🔥🔥','acabo de llegar y YA SOY FAN 😭','esa voz!!! 🎤💜',
 '¡Los pasos van con el beat!','¿Cómo se llama esta canción? 🎶','Estoy viendo esto con mi hermana 🥹',
 '¡Saluditos desde España! 🇪🇸','¡Hola desde México! 🇲🇽','La iluminación está preciosa ✨',
 '¿Habrá un bis?','¡El peinado de hoy! 😍','Qué buena energía en el escenario','¿De dónde es el vestido?',
 '¡Ya te sigo! 💜','¡Nueva fan por aquí!','Me salió en para ti y me quedé','La voz me pone la piel de gallina',
 '¡Ese giro fue increíble!','¡Otra vez esa coreo, porfa!','¡Estoy aprendiendo el baile! 💃',
 'Se nota todo el ensayo','El ritmo me tiene atrapada','¡Mi parte favorita de la canción!',
 '¡¡NO ME ESPERABA ESE PASO!!','¡VAMOS DANIELA!','¿Cuándo es el próximo directo?',
 'Esto merece millones de likes','Pongan el volumen a tope 🔊','¡La cámara captó el momento!',
 '¡Qué adorable la sonrisa!','¡Necesito una playlist de Daniela!','¿Alguien más está bailando en casa?',
 'Los corazoncitos no paran 💕','¡La mejor noche!','¡Gracias por cantar para nosotros!',
 'Me encantan las luces lilas','¡El final de la coreo! 👏','¡Dale, que tú puedes!',
 '¡La ropa combina con el escenario!','¿Se puede pedir otra canción?','¡Qué bonito ambiente!',
 '¡Mi primera vez en este LIVE!','¡Ya tengo mi canción favorita!'
];
const liveUsers=['@kpopfan: ','@danielalover: ','@starlight: ','@cutiepop: ','@purplewave: ','@danistars: ','@moonberry: ','@luna_pop: ','@mintcloud: ','@sweetidol: ','@starry_night: ','@berrytea: ','@fan_rosa: ','@melodygirl: ','@neon_dream: ','@cloud9: ','@kawaii_dance: ','@peachy: ','@popcornfan: ','@dani_forever: '];
function paintLiveStats(){
 $('#live-likes').textContent=liveLikes.toLocaleString('es-ES');$('#live-comment-count').textContent=liveComments.toLocaleString('es-ES');
 $('#live-viewers').textContent=liveViewers.toLocaleString('es-ES');$('#live-follower-gain').textContent=liveFollowerGain.toLocaleString('es-ES');
 $('#followers-live').textContent=concertActive&&liveFollowerGain?'+'+liveFollowerGain+' LIVE':'';
}
const recentLiveComments:string[]=[];
function liveReactionBurst(power=1){
 const reactions=$('#live-reactions'),comments=$('#live-comments'),count=Math.min(5,2+Math.round(power));
 for(let i=0;i<count;i++)setTimeout(()=>{if(!concertActive)return;const r=document.createElement('span');r.className='live-reaction';r.textContent=['♥','💜','🔥','✨','😍','👏'][Math.floor(Math.random()*6)];r.style.setProperty('--rx',(8+Math.random()*82)+'%');r.style.setProperty('--drift',(2.1+Math.random()*1.8)+'s');reactions.append(r);while(reactions.children.length>18)reactions.firstElementChild?.remove();setTimeout(()=>r.remove(),2600);},i*90);
 if(Math.random()<Math.min(.92,.32+power*.18)){const c=document.createElement('div');c.className='live-comment';const options=liveMessages.filter(m=>!recentLiveComments.includes(m));const message=options[Math.floor(Math.random()*options.length)]||liveMessages[0];recentLiveComments.push(message);if(recentLiveComments.length>10)recentLiveComments.shift();c.textContent=liveUsers[Math.floor(Math.random()*liveUsers.length)]+message;comments.append(c);while(comments.children.length>5)comments.firstElementChild?.remove();}
}
function socialBoost(kind:'dance'|'sing'|'concert'){
 if(!concertActive)return;
 const power=kind==='concert'?2.8:kind==='sing'?2.25:1.85;
 liveMomentum=Math.min(5.5,liveMomentum+power*.62);
 liveViewers+=Math.floor((8+Math.random()*22)*power);
 liveLikes+=Math.floor((14+Math.random()*34)*power);
 const newComments=Math.max(1,Math.floor((1+Math.random()*2.5)*power));liveComments+=newComments;
 liveFollowerGain+=Math.max(1,Math.floor((1+Math.random()*3.4)*power));
 liveReactionBurst(power);paintLiveStats();render();
}
function startConcert(){
 if(concertActive){socialBoost('sing');return;}
 concertActive=true;liveLikes=0;liveComments=0;liveViewers=0;liveFollowerGain=0;liveMomentum=1.2;lastLiveTick=performance.now();concertStartedAt=lastLiveTick;livePerformanceSeconds=0;
 $('#live-comments').replaceChildren();$('#live-reactions').replaceChildren();const live=$('#studio-live');live.classList.add('visible');live.setAttribute('aria-hidden','false');
 void play?.startConcertMusic();paintLiveStats();toast('🔴 ¡Concierto EN DIRECTO! Baila y canta para crecer');reactionBubble('¡Vamos a darlo todo! 🎤💜',false,2300);
}
function endConcert(announce=true){
 if(!concertActive)return;
 concertActive=false;play?.stopConcertMusic();const eligible=performance.now()-concertStartedAt>=12000;
 const gained=eligible?liveFollowerGain:0;
 const popGain=eligible?Math.max(0,Math.min(3,Math.floor((gained/180)+(liveViewers/1300)+(liveLikes/4200)))):0;
 const effort=Math.min(1,livePerformanceSeconds/35);
 const concertPay=eligible?Math.max(12,Math.floor((liveLikes/14+liveViewers/55+gained*1.7)*(.3+.7*effort))):0;
 state.followers=Math.max(0,state.followers+gained);state.popularity=num(state.popularity+popGain);state.coins+=concertPay;state.lastConcertAt=Date.now();state.concerts++;
 $('#studio-live').classList.remove('visible');$('#studio-live').setAttribute('aria-hidden','true');$('#followers-live').textContent='';
 document.querySelectorAll('.career-card').forEach(card=>{card.classList.remove('career-updated');void (card as HTMLElement).offsetWidth;card.classList.add('career-updated');});
 if(announce){toast(eligible?'¡Concierto terminado! +'+gained+' seguidores · +'+popGain+'% popularidad · +'+concertPay+' ★':'¡Concierto muy corto! Actúa al menos 12 segundos para ganar fans y dinero 💜');if(eligible)reward('¡CARRERA +! ✨');}
 liveFollowerGain=0;render();save();
}
function socialTick(now:number){
 if(!concertActive||room!=='stage'||now-lastLiveTick<1500)return;lastLiveTick=now;
 const performing=move==='sing'||move==='dance'||move==='dance2'||move==='dance3'||move==='dance4'||move==='dance5';
 const singing=move==='sing',power=performing?(singing?2.15:2.45):.45;if(performing)livePerformanceSeconds+=1.5;
 liveMomentum=Math.max(.75,Math.min(5.5,liveMomentum*.91+(performing?.36:-.05)));
 const scale=power*liveMomentum;
 liveViewers=Math.max(0,liveViewers+Math.floor((2+Math.random()*8)*scale)-(performing?0:Math.floor(Math.random()*4)));
 liveLikes+=Math.max(1,Math.floor((2+Math.random()*7)*scale));
 if(Math.random()<Math.min(.9,.12*scale)){liveComments+=1+Math.floor(Math.random()*2);liveReactionBurst(Math.min(2.2,scale/2));}
 if(performing&&Math.random()<Math.min(.9,.16*scale))liveFollowerGain+=1+Math.floor(Math.random()*Math.max(1,Math.round(scale/2)));
 paintLiveStats();
}
function updateNeedAlerts(announce=false){
 const alerts:[Need,string,string][]=[
  ['hunger','🍓','Tengo hambreee… ¿me das algo? 🍓'],
  ['energy','💤','Tengo sueñooo… 💤'],
  ['hygiene','🫧','Creo que necesito un bañito… 🫧'],
  ['happiness','💗','¿Me das un poquito de cariño? 🥺']
 ];
 const active=alerts.filter(([need])=>state[need]<45).sort((a,b)=>state[a[0]]-state[b[0]]);
 if(!announce||!active.length)return;
 const [need,,line]=active[0],now=Date.now();
 if(lastComplaintNeed===need&&now-lastComplaintAt<28000)return;
 lastComplaintNeed=need;lastComplaintAt=now;clearTimeout(needReminderTimer);needReminderTimer=window.setTimeout(()=>reactionBubble(line,true,3200),220);
}
function perform(i:number){if(sleepPhase!=='awake'){toast('Shhh… Daniela está descansando. Cambia de habitación para despertarla 🌙');return;}if(room==='bedroom'&&i===1){startSleep();return;}if(room==='stage'&&i===6&&concertActive){toast('🔴 Ya estás en directo. Sigue cantando o bailando 💜');return;}
if(room==='arena'){
 if(i===0){
  if(concertActive){toast('🎤 ¡Ya estás dando un gran concierto!');return;}
  if(state.arenaTickets<=0){toast('🎟️ Necesitas alcanzar el siguiente hito de 1.000 seguidores para un concierto. ¡Haz Directos TikTok!');return;}
  state.arenaTickets--;startConcert('arena');save();render();return;
 }
 if(i===5){
  if(!concertActive){toast('🎟️ Primero comienza el espectáculo');return;}
  endConcert(true);return;
 }
 if(!concertActive){toast('🎟️ Pulsa Empezar concierto antes de actuar');return;}
}if(play?.beforeAction(room,i))return;if(room==='bedroom'&&i===2){play?.throwBall();sfx('ball');return;}const a=rooms[room].actions[i];if(a.coins<0&&state.coins < -a.coins){toast('¡Necesitas más monedas! Baila para ganar 🎶');sound([350,270]);return;}
if((room==='stage'||room==='arena')&&state.energy<5){toast('¡Daniela está agotada! Descansa un poquito 💤');return;}
if(room==='closet'&&i===0)state.outfit=(state.outfit+1)%dressColors.length;
if(room==='closet'&&i===1)state.hair=(state.hair+1)%hairColors.length;
fashion();for(const [need,delta] of Object.entries(a.effect) as [Need,number][])state[need]=num(state[need]+delta);
state.coins=Math.max(0,state.coins+a.coins);gainXP(a.xp);animate(a.move);
if(room==='kitchen')sfx(a.move==='drink'?'drink':'eat');
else if(a.move==='sleep')sfx('sleep');
else if(room==='bathroom')sfx('wash');
else if((room==='stage'&&i===6)||(room==='arena'&&i===0))sfx('cheer');
if(room==='stage'){if(i===6)startConcert('tiktok');else if(concertActive)socialBoost(a.move==='sing'?'sing':'dance');}else if(room==='arena'&&concertActive)socialBoost(a.move==='sing'?'sing':'dance');
const outfitNames=['Fresa pop','Princesa lavanda','Hoodie mint','Peto melocotón','Idol dorada','Sporty blue','Ballet rosa','Retro disco'],hairNames=['Coletas chocolate','Coletas altas','Bob lavanda','Melena miel','Moños espaciales','Coleta lateral','Trenzas violetas','Recogido elegante'];
toast(room==='closet'&&i===0?outfitNames[state.outfit]+' 🎀':room==='closet'&&i===1?'Pelo '+hairNames[state.hair]+' 💜':a.message);
reward('+'+a.xp+' XP '+(a.coins>0?'· +'+a.coins+' ★':''));sound((room==='stage'||room==='arena')?[523,659,784,1046]:[659,784,988]);render();updateNeedAlerts(true);save();play?.afterAction(room,i);}
canvas.addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY,time:performance.now()};});
canvas.addEventListener('pointercancel',()=>{touchStart=null;});
canvas.addEventListener('pointerup',e=>{const start=touchStart;touchStart=null;if(editor?.isEditing()||room==='bathroom'||play?.isPainting()||!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>15||performance.now()-start.time>550)return;const rect=canvas.getBoundingClientRect();const hit=scene.pick(e.clientX-rect.left,e.clientY-rect.top);if(hit?.hit&&hit.pickedMesh&&hit.pickedMesh.isDescendantOf(body)){const isHead=hit.pickedMesh.name.includes('eye')||hit.pickedMesh.name.includes('hair')||hit.pickedMesh.name.includes('face')||hit.pickedMesh.name.includes('bang')||hit.pickedMesh.name.includes('cheek')||hit.pickedMesh.name.includes('smile')||hit.pickedMesh.name.includes('nose')||hit.pickedMesh.name.includes('bow');touchDaniela(e.clientX,e.clientY,isHead);}});
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-room]'))b.addEventListener('click',()=>{showRoom(b.dataset.room as Room);sound([659,784]);});
$('#camera-reset').addEventListener('click',()=>{camera.alpha=-Math.PI/2;camera.beta=1.23;camera.radius=9.25;camera.target.set(0,1.8,-.35);toast('¡Cámara centrada! 📷');});
$('#sound-toggle').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('#sound-toggle').textContent=soundEnabled?'♫':'♪';toast(soundEnabled?'Sonidos activados 🎵':'Sonidos desactivados 🔕');if(soundEnabled)sound();});
$('#daily-gift').addEventListener('click',()=>{const today=new Date().toLocaleDateString('en-CA');if(state.lastGift===today){toast('¡Ya recogiste tu regalo de hoy! 💕');return;}state.lastGift=today;state.coins+=75;gainXP(15);render();save();toast('¡Regalo diario! +75 monedas 🎁');reward('+75 ★');sound([523,659,784,1046]);});
$('#close-tutorial').addEventListener('click',()=>{$('#tutorial').classList.add('hidden');try{localStorage.setItem('danielakpop-tutorial','yes');}catch{}});
try{if(localStorage.getItem('danielakpop-tutorial'))$('#tutorial').classList.add('hidden');}catch{}
for(let i=0;i<17;i++){const item=document.createElement('span');item.className='particle';item.textContent=i%5===0?'♥':i%2?'✦':'✧';item.style.setProperty('--x',(i*37+11)%98+'%');item.style.setProperty('--y',(i*19+13)%75+'%');item.style.setProperty('--size',(9+i%4*4)+'px');item.style.setProperty('--time',(5+i%5)+'s');item.style.setProperty('--delay',(i%8*-.8)+'s');item.style.color=i%3?'#ffb7dc':'#fff5ce';$('#sparkles').append(item);}
play=createInteractions({scene,canvas,camera,idol,body,head,dress,groups,skin,arms,isEditing:()=>!!editor?.isEditing(),
 getRoom:()=>room,getHygiene:()=>state.hygiene,
 changeHygiene:(amount)=>{state.hygiene=num(state.hygiene+amount);state.happiness=num(state.happiness+1);render();save();},
 onVolleyHit:()=>{state.happiness=num(state.happiness+8);state.energy=num(state.energy-2);state.coins+=4;gainXP(9);render();save();},
 perform,animate,toast,reward,sound});
editor=setupSceneEditor({scene,canvas,camera,groups,getRoom:()=>room,showRoom,notify:toast,setLighting:setSceneLighting});
showRoom('bedroom');fashion();render();updateNeedAlerts();
let performanceCheckAt=performance.now(),slowSamples=0,fastSamples=0;
engine.runRenderLoop(()=>{
 if(document.hidden)return;
 const now=performance.now();
 // Adaptive quality: prefer a stable concert to an expensive postprocessing effect.
 if(now-performanceCheckAt>7500&&qualityMode!=='high'){
  performanceCheckAt=now;const fps=engine.getFps();
  if(fps<39){slowSamples++;fastSamples=0;}else if(fps>55){fastSamples++;slowSamples=0;}else{slowSamples=0;fastSamples=0;}
  if(slowSamples>=2){const next=Math.min(bestScale*1.18,renderScale+.035);if(next>renderScale+.005){renderScale=next;engine.setHardwareScalingLevel(renderScale);}slowSamples=0;}
  if(fastSamples>=3){const next=Math.max(bestScale,renderScale-.035);if(next<renderScale-.005){renderScale=next;engine.setHardwareScalingLevel(renderScale);}fastSamples=0;}
 }
 tickSleep(now);const t=now/1000,e=(now-started)/1000;
 if(e>duration&&move!=='idle')move='idle';
 const a=e;const sin=Math.sin,cos=Math.cos,abs=Math.abs;
 const dance=move==='dance'||move==='dance2'||move==='dance3'||move==='dance4'||move==='dance5';
 const fast=move==='dance2'||move==='dance4';
 const beat=fast?9:move==='dance3'?5.5:move==='dance5'?6.5:7;
 const b=sin(a*beat),step=sin(a*beat*.5);
 const popBeat=sin(a*8.4),cuteBeat=sin(a*5.2),hipBeat=sin(a*10.8),discoBeat=sin(a*6.2);
 const popPhrase=Math.floor(a*2.1)%4,cutePhrase=Math.floor(a*1.7)%4,hipPhrase=Math.floor(a*2.7)%4,discoPhrase=Math.floor(a*1.55)%4;
 const isEating=move==='eat'||move==='drink';const walkingToBed=(sleepPhase==='walking'&&now-sleepClock<2400)||(sleepPhase==='waking'&&now-sleepClock>900);
 const isVolley=move==='volley';
 const singing=move==='sing'&&room==='stage';
 microphone.setEnabled(singing);
 if(singing){const micIn=Math.min(1,e/.34);microphone.scaling.setAll(.15+.85*micIn);}
 // Each choreography uses its own weight shift, bounce, turns, arms and steps.
 body.position.x=dance?move==='dance2'?sin(a*4.2)*.19+(popPhrase===2?.10:0):move==='dance3'?sin(a*2.6)*.15:move==='dance4'?sin(a*5.4)*.22:move==='dance5'?sin(a*3.1)*.25:sin(a*beat*.5)*.12:0;
 body.position.y=dance?(move==='dance2'?abs(sin(a*9))*.27:move==='dance4'?abs(step)*.13:move==='dance3'?abs(sin(a*5))*.13:abs(b)*.17):
  isVolley?abs(sin(a*13))*.22:move==='jump'?abs(sin(a*5))*.32:
  move==='laugh'?abs(sin(a*13))*.09:move==='giggle'?abs(sin(a*8))*.05:
  move==='sleep'?-.23:walkingToBed?abs(sin(t*9))*.07:sin(t*1.75)*.035+sin(t*.63)*.012;
 body.rotation.x=dance?move==='dance4'?.14+sin(a*beat)*.13:move==='dance5'?sin(a*3)*.08:sin(a*beat)*.05:
  isVolley?-.16*sin(a*9):0;
 body.rotation.y=move==='spin'?a*6:move==='dance2'?(popPhrase===3?sin(a*7)*.48:sin(a*3.8)*.16):move==='dance3'?sin(a*2.1)*.22:move==='dance4'?(hipPhrase===1?sin(a*8)*.34:sin(a*4.8)*.18):move==='dance5'?sin(a*2.4)*.58:move==='dance'?sin(a*4)*.18:sin(t*.8)*.065;
 body.rotation.z=move==='sleep'?.12:move==='dance4'?sin(a*beat/2)*.16:
  move==='dance3'?sin(a*4)*.11:dance?sin(a*beat)*.075:
  move==='laugh'?sin(a*14)*.09:move==='giggle'?sin(a*9)*.045:sin(t*1.2)*.018;
 legs[0].rotation.x=move==='dance2'?popBeat*.42:move==='dance3'?cuteBeat*.22:move==='dance4'?hipBeat*.48:move==='dance5'?discoBeat*.28:dance?sin(a*beat)*.35:isVolley?-.22*sin(a*12):walkingToBed?sin(t*9)*.45:0;
 legs[1].rotation.x=move==='dance2'?-popBeat*.42:move==='dance3'?-cuteBeat*.22:move==='dance4'?-hipBeat*.48:move==='dance5'?-discoBeat*.28:dance?-sin(a*beat)*.35:isVolley?.22*sin(a*12):walkingToBed?-sin(t*9)*.45:0;
 legs[0].rotation.z=dance?(move==='dance5'?.12+step*.13:step*.1):0;
 legs[1].rotation.z=dance?(move==='dance5'?-.12-step*.13:-step*.1):0;
 // A K-pop routine should not share the same generic arm animation.
 let left=.08,right=-.08,leftX=0,rightX=0;
 if(move==='wave'){right=1.3+sin(a*13)*.65;}
 else if(move==='jump'){left=-.65;right=.65;}
 else if(move==='bath'){left=-.35;right=.35+sin(a*7)*.2;}
 else if(move==='dance'){left=sin(a*8)*.85;right=-sin(a*8)*.85;leftX=.23*cos(a*4);rightX=-.23*cos(a*4);}
 else if(move==='dance2'){if(popPhrase===0){left=-1.25+popBeat*.28;right=1.25-popBeat*.28;leftX=.52;rightX=-.52;}else if(popPhrase===1){left=-.2+popBeat*.95;right=.2-popBeat*.95;leftX=-.28;rightX=.28;}else if(popPhrase===2){left=-1.75;right=-1.75+popBeat*.25;leftX=.15;rightX=-.15;}else{left=-.55+popBeat*.4;right=.55+popBeat*.4;leftX=.62;rightX=-.62;}}
 else if(move==='dance3'){if(cutePhrase===0){left=-.72+cuteBeat*.22;right=.72-cuteBeat*.22;leftX=.48;rightX=-.48;}else if(cutePhrase===1){left=-1.5;right=1.5;leftX=.18;rightX=-.18;}else if(cutePhrase===2){left=-.22+abs(cuteBeat)*.48;right=.22-abs(cuteBeat)*.48;leftX=.58;rightX=-.58;}else{left=-1.02+cuteBeat*.25;right=1.02-cuteBeat*.25;leftX=.35;rightX=-.35;}}
 else if(move==='dance4'){if(hipPhrase===0){left=-.25+hipBeat*.9;right=.25+cos(a*10.8)*.9;leftX=-.55;rightX=.55;}else if(hipPhrase===1){left=-1.7+hipBeat*.18;right=-.55;leftX=-.22;rightX=.5;}else if(hipPhrase===2){left=.55;right=1.7-hipBeat*.18;leftX=-.5;rightX=.22;}else{left=-.65+hipBeat*.55;right=.65-hipBeat*.55;leftX=-.62;rightX=.62;}}
 else if(move==='dance5'){if(discoPhrase===0){left=-2.2;right=.35+discoBeat*.18;}else if(discoPhrase===1){left=-.35;right=2.2;}else if(discoPhrase===2){left=-1.25+discoBeat*.38;right=1.25-discoBeat*.38;}else{left=-2.05+abs(discoBeat)*.55;right=2.05-abs(discoBeat)*.55;}leftX=.17;rightX=-.17;}
 else if(move==='sing'){const micLift=Math.min(1,a/.46);left=-.34+sin(a*3)*.22;right=-.08-1.62*micLift+sin(a*6)*.1;rightX=-.19*micLift;}
 else if(isVolley){left=-1.72+sin(a*11)*.32;right=1.72-sin(a*11)*.32;leftX=-.16;rightX=-.16;}
 else if(move==='laugh'){left=-1.05+sin(a*13)*.19;right=1.05-sin(a*13)*.19;}
 else if(move==='giggle'){left=-.5+sin(a*9)*.15;right=.5-sin(a*9)*.15;}
 if(move==='idle'){
  left=.08+sin(t*1.15)*.035;
  right=-.08-sin(t*1.15+.7)*.035;
  leftX=sin(t*.72)*.025;rightX=-sin(t*.72+.9)*.025;
 }
 const gripUp=Math.max(0,Math.min(1,(a-.12)/.69));
 const gripDown=Math.max(0,Math.min(1,(a-2.5)/.57));
 const bringToMouth=gripUp*(1-gripDown);
 arms[0].rotation.z=left;arms[0].rotation.x=leftX;
 arms[1].position.z=isEating?-.43*bringToMouth:0;
 arms[1].rotation.z=isEating?.08-2.44*bringToMouth+(a>1&&a<2.5?sin(a*12)*.045:0):right;
 arms[1].rotation.x=isEating?-.15*bringToMouth:rightX;
 head.rotation.z=move==='laugh'?sin(a*11)*.15:move==='giggle'?sin(a*9)*.08:
  move==='dance2'?sin(a*4.2)*.16:move==='dance3'?sin(a*2.6)*.11:move==='dance4'?sin(a*6.1)*.14:move==='dance5'?sin(a*3.1)*.18:
  dance?sin(a*beat*.62)*.13:isVolley?sin(a*14)*.12:
  move==='sleep'?.14:sin(t*.82)*.034+sin(t*.31)*.012;
 head.rotation.x=move==='laugh'?-.07+sin(a*8)*.06:move==='giggle'?-.03:
  move==='sing'?sin(a*10)*.085:move==='drink'?-.09+sin(a*6)*.043:
  move==='eat'?sin(a*12)*.065:move==='sleep'?.15:
  move==='dance2'?sin(a*8.4)*.075:move==='dance3'?-.035+abs(cuteBeat)*.05:move==='dance4'?sin(a*10.8)*.055:move==='dance5'?-.04+sin(a*6.2)*.045:dance?sin(a*beat)*.07:0;
 const giggling=move==='laugh'||move==='giggle';
 // Daniela occasionally looks around instead of staring rigidly at the camera.
 // The target eases between tiny offsets, preserving her original eye design.
 const lookCycle=t%9.6;
 const lookX=lookCycle<2.2?0:lookCycle<4.4?.035:lookCycle<6.1?-.025:lookCycle<7.5?.018:0;
 const lookY=lookCycle>5.4&&lookCycle<7.1?.018:0;
 eyeMeshes.forEach((eye,i)=>{
  eye.position.x+=(eyeBaseX[i]+lookX-eye.position.x)*.055;
  eye.position.y+=(eyeBaseY[i]+lookY-eye.position.y)*.055;
 });
 // Soft eyelids and a short double-blink break up the mechanical 4-second loop.
 const phase=t%6.4;
 const blink=Math.max(0,1-Math.abs(phase-2.7)/.12,1-Math.abs(phase-2.94)/.09,1-Math.abs(phase-5.87)/.12);
 const close=(sleepPhase==='resting'||(sleepPhase==='walking'&&now-sleepClock>2400)||move==='sleep')?1:blink;
 eyelids.forEach(lid=>{lid.visibility=close>.025?1:0;lid.scaling.y=.025+close*.94;});
 eyeMeshes.forEach(eye=>{eye.scaling.y=(giggling?.27:isEating?.74:1.1)*(1-.94*close);eye.visibility=close>.98?0:1;});
 eyeGlints.forEach(glint=>glint.visibility=1-close);
 sleepingLashes.forEach(lash=>lash.isVisible=close>.98);
 // Lightweight secondary motion, driven by the same rhythm as the idle/dance.
 twinTails.forEach((tail,i)=>{
  const side=i===0?-1:1;
  tail.rotation.z=side*(.045+sin(t*2.25+i*1.1)*.05+(dance?sin(a*beat)*.12:0));
  tail.rotation.x=sin(t*1.75+i*1.5)*.045;
 });
 const mouthMoving=giggling||move==='sing'||isEating;
 mouth.setEnabled(!mouthMoving);laughingMouth.setEnabled(mouthMoving);
 laughingMouth.scaling.y=move==='eat'?.34+abs(sin(a*13))*.43:
  move==='drink'?.23+abs(sin(a*7))*.19:move==='sing'?.75+sin(a*11)*.4:
  move==='laugh'?.9+sin(a*15)*.2:.6;
 bow.rotation.z=sin(t*1.7)*.055+sin(t*.43)*.018;
 bow.rotation.x=sin(t*1.1)*.025;
 orbs.forEach((o,i)=>o.scaling.setAll(1+sin(t*2+i*.7)*.18));
 if(Math.floor(now/50)!==Math.floor((now-engine.getDeltaTime())/50))roomMotion.forEach((item,i)=>{if(item.mesh.isEnabled()&&!item.mesh.isDisposed()){item.mesh.position.y=item.baseY+sin(now*item.speed+item.phase)*item.amp;item.mesh.rotation.y+=.0015*((i%3)-1);}});
 socialTick(now);
 play?.tick(now);
 scene.render();
});
addEventListener('resize',()=>engine.resize());
setInterval(()=>{if(document.hidden)return;state.hunger=Math.max(0,state.hunger-.28);state.energy=Math.max(0,state.energy-.025);state.happiness=Math.max(0,state.happiness-.19);state.hygiene=Math.max(0,state.hygiene-.12);render();updateNeedAlerts(true);save();},60000);
setInterval(()=>{if(document.hidden||concertActive||!state.lastConcertAt||Date.now()-state.lastConcertAt<18*3600000)return;
 if(state.followers>0)state.followers=Math.max(0,state.followers-Math.max(1,Math.floor(state.followers*.004)));
 state.popularity=Math.max(0,state.popularity-.2);render();save();},3600000);
addEventListener('pagehide',()=>{if(concertActive)endConcert(false);save();});
