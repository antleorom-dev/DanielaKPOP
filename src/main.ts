import '@babylonjs/loaders/glTF';
import {SceneLoader,AnimationGroup,PBRMaterial,Engine,Scene,ArcRotateCamera,Vector3,HemisphericLight,DirectionalLight,PointLight,MeshBuilder,StandardMaterial,Color3,Color4,TransformNode,GlowLayer,Mesh} from '@babylonjs/core';
import './style.css';
import {createInteractions} from './interactions';
import {dressRooms} from './decor';
import {setupSceneEditor} from './editor';
import {readLayout} from './assets';
type Room='bedroom'|'kitchen'|'bathroom'|'stage'|'closet';
type Need='hunger'|'happiness'|'energy'|'hygiene';
type Move='idle'|'wave'|'dance'|'sleep'|'eat'|'drink'|'spin'|'bath'|'jump'|'giggle'|'laugh'|'surprised'|'volley'|'sing'|'dance2'|'dance3'|'dance4'|'dance5';
type State={hunger:number;happiness:number;energy:number;hygiene:number;coins:number;xp:number;level:number;outfit:number;hair:number;lastSaved:number;lastGift:string};
type Action={emoji:string;title:string;subtitle:string;colors:string[];move:Move;effect:Partial<Record<Need,number>>;coins:number;xp:number;message:string};
const initial:State={hunger:82,happiness:90,energy:88,hygiene:96,coins:250,xp:0,level:1,outfit:0,hair:0,lastSaved:Date.now(),lastGift:''};
let state={...initial};
try{const old=JSON.parse(localStorage.getItem('danielakpop-v2')||'null') as State|null;if(old&&typeof old.coins==='number'){state={...initial,...old};const mins=Math.min(240,Math.max(0,(Date.now()-(old.lastSaved||Date.now()))/60000));state.hunger=Math.max(0,state.hunger-mins*.13);state.energy=Math.max(0,state.energy-mins*.08);state.hygiene=Math.max(0,state.hygiene-mins*.05);state.happiness=Math.max(0,state.happiness-mins*.06);}}catch{}
const $=(s:string)=>document.querySelector(s) as HTMLElement;
const num=(n:number)=>Math.round(Math.max(0,Math.min(100,n)));
let room:Room='bedroom';let move:Move='idle';let started=performance.now();let duration=2;let toastTimer=0;let soundEnabled=true;let play:ReturnType<typeof createInteractions>|undefined;let editor:ReturnType<typeof setupSceneEditor>|undefined;let lastTouch=0;let touchStreak=0;let touchStart:{x:number;y:number;time:number}|null=null;let reactionTimer=0;
function act(emoji:string,title:string,subtitle:string,colors:string[],move:Move,effect:Partial<Record<Need,number>>,coins:number,xp:number,message:string):Action{return{emoji,title,subtitle,colors,move,effect,coins,xp,message};}
const rooms:Record<Room,{title:string;kicker:string;sub:string;accent:string;actions:Action[]}>={
bedroom:{title:'Mi habitación',kicker:'✦ BIENVENIDA A CASA ✦',sub:'Un rinconcito lleno de sueños',accent:'#f7b4df',actions:[
act('🧸','Mimos','+ felicidad',['#ffa6c9','#ef77b8'],'wave',{happiness:12},0,9,'¡Qué abrazo tan bonito! 💖'),
act('💤','Dormir','+ energía',['#b7a5fb','#8b84ed'],'sleep',{energy:24,hunger:-4},0,11,'¡Una siesta reparadora! 🌙'),
act('🏐','Voleibol','¡Golpea la pelota!',['#ffcf82','#ffa76b'],'volley',{happiness:14,energy:-6,hunger:-3},0,14,'¡Punto para Daniela! 🏐')]},
kitchen:{title:'Cocina dulce',kicker:'✦ SWEET LITTLE CAFÉ ✦',sub:'¡El menú favorito de Daniela!',accent:'#ffc4a8',actions:[
act('🍓','Fresas','10 monedas',['#ff9fb4','#f77d8c'],'eat',{hunger:22,happiness:4},-10,9,'¡Ñam! Fresas deliciosas 🍓'),
act('🥤','Refresco','15 monedas',['#d1acf4','#a47de0'],'drink',{hunger:14,happiness:10},-15,13,'¡Qué refrescante! 🥤'),
act('🧁','Cupcake','20 monedas',['#ffc891','#fa9db4'],'eat',{hunger:26,happiness:12},-20,17,'¡Un cupcake mágico! 🧁')]},
bathroom:{title:'Baño burbuja',kicker:'✦ GLOW UP TIME ✦',sub:'Brilla por dentro y por fuera',accent:'#a8e6eb',actions:[
act('🧽','Esponja','Arrastra hasta Daniela',['#99dcef','#77bdea'],'bath',{},0,2,'¡Espuma! 🫧'),
act('🚿','Agua','Aclarar las burbujas',['#e4bbff','#b69bee'],'bath',{},0,2,'¡Agüita fresca! 🚿'),
act('🧴','Skincare','+ higiene',['#a3f1dc','#70c8bb'],'wave',{hygiene:14,happiness:4},0,8,'¡Sonrisa brillante! ✨')]},
stage:{title:'Dance studio',kicker:'✦ DREAMS COME TRUE ✦',sub:'El escenario es todo tuyo',accent:'#c2a1fc',actions:[
act('🎶','Bailar','+ 12 monedas',['#e7a4ff','#aa82ed'],'dance',{happiness:12,energy:-9,hunger:-5,hygiene:-3},12,18,'¡Dale al ritmo! 🎶'),
act('🎤','Cantar','+ 18 monedas',['#ff9dc8','#e577ba'],'sing',{energy:-10,hunger:-4,happiness:8},18,23,'¡Qué voz de estrella! 🎤'),
act('🪩','Dance pop','+ 15 monedas',['#aa9efb','#d7a4ff'],'dance2',{energy:-12,happiness:12},15,20,'¡Coreografía perfecta! 🪩'),
act('💃','Dance cute','+ 15 monedas',['#f3a4bb','#ea80c2'],'dance3',{energy:-12,happiness:12},15,20,'¡Qué adorable! 💃'),
act('🔥','Hip-hop','+ 20 monedas',['#db9ffd','#a47eec'],'dance4',{energy:-14,happiness:14},20,24,'¡Daniela domina el ritmo! 🔥'),
act('🪩','Disco','+ 17 monedas',['#f6b889','#e78ac8'],'dance5',{energy:-12,happiness:11},17,22,'¡Pura energía disco! ✨'),
act('🌟','Concierto','+ 35 monedas',['#ffd18c','#f6a36c'],'sing',{energy:-22,hunger:-10,happiness:20},35,40,'¡El público te adora! 🌟')]},
closet:{title:'Fashion room',kicker:'✦ DRESS LIKE A STAR ✦',sub:'Cada look cuenta una historia',accent:'#f7a7da',actions:[
act('👗','Nuevo look','Cambiar ropa',['#ffb2dc','#e989c6'],'spin',{happiness:7},0,8,'¡Nuevo outfit! 🎀'),
act('🎀','Peinado','Cambiar pelo',['#bfaafb','#9f89ed'],'spin',{happiness:6},0,8,'¡Nuevo peinado! 💜'),
act('📸','Selfie','+ 8 monedas',['#ffce91','#ff9cb8'],'wave',{happiness:9},8,12,'¡Una selfie preciosa! 📸')]}};
const canvas=document.querySelector('#game') as HTMLCanvasElement;
const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,adaptToDeviceRatio:false});
engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.8));
const scene=new Scene(engine);scene.clearColor=new Color4(.97,.81,.92,1);
const camera=new ArcRotateCamera('camera',-Math.PI/2,1.23,9.25,new Vector3(0,1.8,-.35),scene);
camera.attachControl(canvas,true);camera.lowerRadiusLimit=6.8;camera.upperRadiusLimit=12.5;camera.lowerBetaLimit=.85;camera.upperBetaLimit=1.48;camera.lowerAlphaLimit=-Math.PI/2-.48;camera.upperAlphaLimit=-Math.PI/2+.48;camera.wheelPrecision=48;camera.pinchPrecision=140;
const amb=new HemisphericLight('ambient',new Vector3(0,1,-.3),scene);amb.intensity=.83;amb.diffuse=new Color3(1,.92,1);
const sun=new DirectionalLight('sun',new Vector3(-1.5,-4,1.5),scene);sun.intensity=.47;
const rim=new PointLight('rim',new Vector3(2,4,1),scene);rim.intensity=1.35;rim.diffuse=new Color3(1,.45,.76);rim.range=12;
new GlowLayer('fairytale glow',scene).intensity=.15;
function setSceneLighting(factor:number){
 const f=Math.max(.45,Math.min(1.55,factor));
 amb.intensity=.83*f;sun.intensity=.47*f;rim.intensity=1.35*f;
}
setSceneLighting((readLayout().lighting??70)/70);
function mat(n:string,c:string,e?:string){const m=new StandardMaterial(n,scene);m.diffuseColor=Color3.FromHexString(c);m.specularColor=new Color3(.3,.23,.32);if(e)m.emissiveColor=Color3.FromHexString(e);return m;}
const skin=mat('peach','#ffe3cb'),blush=mat('blush','#f7a9b8'),dark=mat('eyes','#46305a'),white=mat('white','#fff9ff'),trim=mat('cream','#fff7ee'),gold=mat('gold','#ffd277','#65401c'),pink=mat('shiny pink','#ffc5ed','#603b58');
const hairColors=['#684a79','#d889a8','#a59acc','#c19c75'].map((s,i)=>mat('hair'+i,s));
const dressColors=['#f49ccb','#ae91ed','#8fdacc','#ffb38f'].map((s,i)=>mat('dress'+i,s));
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
const groups:Record<Room,TransformNode>={bedroom:new TransformNode('bedroom',scene),kitchen:new TransformNode('kitchen',scene),bathroom:new TransformNode('bathroom',scene),stage:new TransformNode('stage',scene),closet:new TransformNode('closet',scene)};
dressRooms(scene,groups);
const bed=groups.bedroom;
box('bed base',3.2,.48,1.85,3,.36,3.75,wood,bed);box('mattress',3.05,.32,1.72,3,.71,3.7,white,bed);box('blanket',3,.12,1.02,3,.92,3.44,lilac,bed);
for(const x of [2.25,3.25])ball('pillow',.63,x,.94,4.14,white,bed).scaling.set(1.17,.37,.75);
box('headboard',3.3,1.2,.18,3,.91,4.7,pink,bed);for(let i=0;i<3;i++)star(2.1+i*.65,2.1+(i%2)*.35,4.8,.27,gold,bed);
box('vanity',1.65,.19,1.05,-3.7,1.05,3.5,white,bed);for(const x of [-4.3,-3.1])box('vanity leg',.14,.95,.14,x,.52,3.5,lilac,bed);
box('mirror frame',1.08,1.25,.09,-3.7,2,4.15,wood,bed);box('mirror glass',.88,1.06,.12,-3.7,2,4.03,blue,bed);
box('poster frame',1.65,1.65,.12,0,3.65,6.07,white,bed);box('poster',1.46,1.45,.14,0,3.65,5.96,lilac,bed);star(0,3.65,5.85,.95,pink,bed);
box('window frame',2.45,2.3,.15,-4.7,3.55,6.04,white,bed);box('sky',2.15,2.03,.16,-4.7,3.55,5.93,blue,bed);
for(const x of [-4.97,-4.67,-4.38])ball('cloud',.45,x,3.5,5.79,white,bed);
box('left curtain',.42,2.5,.23,-5.85,3.53,5.83,dressColors[0],bed);box('right curtain',.42,2.5,.23,-3.54,3.53,5.83,dressColors[0],bed);
const kit=groups.kitchen;box('kitchen cabinet',5.1,1.65,1.7,2.1,.75,4.27,white,kit);box('counter',5.2,.22,1.9,2.1,1.67,4.27,yellow,kit);
for(let x=.4;x<4.4;x+=1.2){box('cabinet door',.96,1.3,.08,x,.73,3.34,mint,kit);ball('handle',.09,x,1,3.28,gold,kit);}
box('upper cabinet',3.1,1.25,.72,2.5,3.95,5.9,white,kit);
for(const x of [1.5,2.5,3.5])box('upper door',.9,1.05,.13,x,3.95,5.48,mint,kit);
cyl('cake stand',1.15,1.15,.13,1.4,1.88,4,white,kit);cyl('cake',.9,.9,.45,1.4,2.16,4,dressColors[0],kit);ball('icing',.84,1.4,2.42,4,white,kit).scaling.y=.3;ball('cherry',.23,1.4,2.6,4,gold,kit);
box('fridge',1.75,3.1,1.5,-4.2,1.55,4.6,white,kit);box('fridge color',1.59,1.7,.06,-4.2,2.13,3.82,mint,kit);
const bath=groups.bathroom;box('bathtub',3.5,1.3,2.1,3.1,.72,4.12,white,bath);box('water',3.16,.08,1.8,3.1,1.39,4.1,blue,bath);
for(let i=0;i<13;i++)ball('bubble',.12+(i%4)*.07,1.8+(i*37%25)/10,1.5+(i%3)*.24,3.4+(i*19%15)/10,white,bath).visibility=.7;
box('bath sink',1.7,1.22,1.05,-3.8,.63,4.1,mint,bath);box('sink top',1.9,.21,1.21,-3.8,1.36,4.1,white,bath);box('bath mirror',1.75,2.1,.12,-3.8,3,5.88,gold,bath);box('mirror surface',1.53,1.89,.12,-3.8,3,5.77,blue,bath);
const stage=groups.stage;box('riser',10,.52,5.7,0,.23,3,purple,stage);box('dance floor',8.7,.06,4.7,0,.53,2.65,stageMat,stage);box('neon wall',10,5,.15,0,3.4,5.9,purple,stage);
for(let i=0;i<3;i++)ring('concert neon',1.2+i*.9,.075,0,3.2,5.7,i%2?pink:gold,stage);
for(const x of [-4.1,4.1]){cyl('speaker',1,1,2.1,x,1.9,4.9,purple,stage);ring('woofer rim',.64,.12,x,1.6,4.37,pink,stage);ball('woofer',.4,x,1.6,4.31,lilac,stage);ring('tweeter',.35,.09,x,2.36,4.37,gold,stage);}
for(let i=0;i<9;i++)star(-4+i,4.9+(i%3)*.18,5.7,.22,i%2?gold:pink,stage);
const closet=groups.closet;box('wardrobe',3.6,4,1.3,3.5,2,4.8,white,closet);box('wardrobe back',3.2,3.64,.14,3.5,2,4.07,lilac,closet);
for(const x of [2.75,3.5,4.25]){box('dress display',.6,1.15,.14,x,2.6,3.97,dressColors[Math.round(x*3)%4],closet);ball('hanger',.12,x,3.32,3.96,gold,closet);}
box('fancy mirror',2.4,3.9,.13,-3.8,2.18,5.8,gold,closet);box('mirror glass',2.12,3.62,.14,-3.8,2.18,5.69,blue,closet);box('bench',2.4,.38,1,0,.43,4,dressColors[0],closet);
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
const dress=cyl('dress',.98,1.53,.93,0,1,0,dressColors[state.outfit%4],body);
ball('collar',.3,0,1.92,-.46,trim,body).scaling.set(1.05,.5,.3);
for(let i=0;i<8;i++){const a=Math.PI*2*i/8;ball('lace',.23,Math.cos(a)*.7,.56,Math.sin(a)*.71,trim,body).scaling.y=.45;}
ball('dress badge',.17,0,1.38,-.51,gold,body).scaling.set(1.1,.96,.3);
ring('sparkly skirt trim',1.48,.036,0,.56,0,white,body);
for(const side of [-1,1]){
 ball('tiny sleeve shine',.12,side*.74,1.77,-.26,white,body).scaling.set(.52,.62,.21);
 ball('dress star',.09,side*.30,.9,-.62,gold,body).scaling.set(.7,.9,.36);
}
const arms:TransformNode[]=[];const sleeves:Mesh[]=[];
for(const s of [-1,1]){const pivot=new TransformNode('arm pivot',scene);pivot.parent=body;pivot.position.set(s*.67,1.79,0);arms.push(pivot);sleeves.push(ball('puff sleeve',.46,s*.13,-.18,0,dressColors[state.outfit%4],pivot));ball('arm',.4,s*.2,-.43,0,skin,pivot).scaling.y=1.45;ball('hand',.36,s*.2,-.72,0,skin,pivot);}
const microphone=new TransformNode('microphone in hand',scene);microphone.parent=arms[1];
cyl('microphone handle',.14,.14,.45,.2,-.83,-.23,dark,microphone);
ball('microphone head',.27,.2,-1.08,-.23,gold,microphone);
microphone.setEnabled(false);
const head=new TransformNode('head',scene);head.parent=body;head.position.set(0,2.56,0);
ball('face',1.65,0,0,-.055,skin,head).scaling.set(.97,1.03,.89);
const hairParts:Mesh[]=[];function hair(n:string,d:number,x:number,y:number,z:number){const o=ball(n,d,x,y,z,hairColors[state.hair%4],head);hairParts.push(o);return o;}
hair('hair cap',1.77,0,.28,.065).scaling.set(1.02,.78,.94);hair('fringe',1.43,0,.59,-.43).scaling.set(1,.39,.63);
for(const x of [-.46,-.18,.15,.45])hair('bang',.48,x,.39,-.69).scaling.set(.88,.76,.49);
const eyelids:Mesh[]=[];
const eyeGlints:Mesh[]=[];
const twinTails:Mesh[]=[];
const eyeMeshes:Mesh[]=[];
for(const s of [-1,1]){hair('side hair',.53,s*.78,-.25,-.08).scaling.set(.62,1.9,.85);
 const tail=hair('twin tail',.9,s*1.04,-.21,.2);tail.scaling.set(.7,1.18,.7);twinTails.push(tail);
ball('hair tie',.27,s*.87,.15,.02,pink,head);
const eye=ball('big eye',.33,s*.33,-.08,-.755,dark,head);eye.scaling.set(.8,1.1,.25);eyeMeshes.push(eye);
const lid=ball('soft eyelid',.35,s*.33,-.08,-.784,skin,head);lid.scaling.set(.83,.025,.25);lid.visibility=0;eyelids.push(lid);
const glint=ball('eye light',.11,s*.33-.055,-.005,-.823,white,head);glint.scaling.z=.35;eyeGlints.push(glint);
 eyeGlints.push(ball('eye sparkle',.05,s*.33+.055,-.17,-.829,white,head));
ball('cheek',.3,s*.62,-.31,-.68,blush,head).scaling.set(.85,.35,.2);
 ball('eye outer lash',.12,s*.48,.02,-.77,dark,head).scaling.set(.58,.22,.22);
 ball('eyebrow',.17,s*.32,.22,-.74,hairColors[state.hair%4],head).scaling.set(1,.20,.22);
 ball('cheek twinkle',.07,s*.66,-.25,-.716,white,head).scaling.set(.5,.56,.21);
}
const mouth=ball('smile',.18,0,-.41,-.79,mat('smile pink','#b95e89'),head);mouth.scaling.set(1,.42,.27);const laughingMouth=ball('laughing mouth',.22,0,-.41,-.8,dark,head);laughingMouth.scaling.set(.88,.72,.32);laughingMouth.setEnabled(false);ball('nose',.09,0,-.25,-.817,blush,head).scaling.set(.66,.6,.3);
const bow=new TransformNode('hair bow',scene);bow.parent=head;bow.position.set(.57,.91,-.22);
ball('bow left',.43,-.21,0,0,pink,bow).scaling.set(1,.6,.45);ball('bow right',.43,.21,0,0,pink,bow).scaling.set(1,.6,.45);ball('bow knot',.21,0,0,-.12,gold,bow);star(-.12,.95,-.6,.18,gold,head);
function fashion(){
 dress.material=dressColors[state.outfit%4];
 sleeves.forEach(s=>s.material=dressColors[state.outfit%4]);
 hairParts.forEach(s=>s.material=hairColors[state.hair%4]);
 // Blender exports a single skinned mesh with named PBR material slots.
 // Keep its closet colors in sync without changing the original model.
 for(const material of scene.materials){
  if(!(material instanceof PBRMaterial))continue;
  if(material.name.includes('Strawberry pink dress'))material.albedoColor.copyFrom(dressColors[state.outfit%4].diffuseColor);
  if(material.name.includes('Deep lavender purple hair'))material.albedoColor.copyFrom(hairColors[state.hair%4].diffuseColor);
 }
}
function save(){state.lastSaved=Date.now();try{localStorage.setItem('danielakpop-v2',JSON.stringify(state));}catch{}}
function render(){for(const n of ['hunger','happiness','energy','hygiene'] as Need[]){$('#'+n+'-value').textContent=num(state[n])+'%';$('#'+n+'-meter').style.width=num(state[n])+'%';}
$('#coins').textContent=String(state.coins);$('#level').textContent=String(state.level);$('#xp').textContent=String(state.xp);$('#xp-target').textContent=String(state.level*100);$('#xp-bar').style.width=state.xp/(state.level*100)*100+'%';
const weak=(['hunger','happiness','energy','hygiene'] as Need[]).reduce((a,b)=>state[a]<state[b]?a:b);
const msg:Record<Need,string>={hunger:'Tiene hambre 🍓',happiness:'Quiere mimos 💗',energy:'Necesita dormir 🌙',hygiene:'Hora del baño 🫧'};
$('#care-status').textContent=state[weak]<40?'¡Necesita cuidados!':state[weak]<65?'Un poquito de atención':'¡Todo genial!';
$('#mood-message').textContent=state[weak]<55?msg[weak]:move==='dance'?'¡Daniela siente la música! 🎶':move==='sleep'?'Shhh… está descansando 💤':'Daniela está feliz ✨';}
function animate(next:Move,length=2.8){move=next;started=performance.now();duration=length;}
function showRoom(next:Room){room=next;play?.enterRoom(next);void editor?.onRoomChanged(next);for(const [k,g] of Object.entries(groups))g.setEnabled(k===room);
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-room]')){const active=button.dataset.room===room;button.classList.toggle('selected',active);button.setAttribute('aria-current',active?'page':'false');}
const entry=rooms[room];$('#scene-name').textContent=entry.title;$('#scene-kicker').textContent=entry.kicker;$('#scene-desc').textContent=entry.sub;const title=$('.scene-title');title.classList.remove('enter');void title.offsetWidth;title.classList.add('enter');$('#character-tag').classList.remove('visible');
$('#action-label').textContent=room==='stage'?'¡Es hora de brillar!':room==='kitchen'?'¿Qué le apetece comer?':room==='closet'?'¡Cambia tu estilo!':'¿Qué hacemos hoy?';$('.action-hint').textContent=entry.actions.length>3?'DESLIZA PARA VER MÁS →':'ARRASTRA O TOCA ↗';
wall.diffuseColor=Color3.FromHexString(room==='stage'?'#b8a1da':room==='bathroom'?'#dcedf3':room==='kitchen'?'#f9e5db':room==='closet'?'#f5deeb':'#f5dfeb');
floorMat.diffuseColor=Color3.FromHexString(room==='stage'?'#b9b1dc':room==='bathroom'?'#d8eaf0':room==='kitchen'?'#efdfcf':'#eadfeb');rim.diffuse=Color3.FromHexString(entry.accent);
const row=$('#actions');row.replaceChildren();
entry.actions.forEach((a,i)=>{const button=document.createElement('button');button.className='action-card';button.style.setProperty('--a',a.colors[0]);button.style.setProperty('--b',a.colors[1]);
button.innerHTML='<span class="action-emoji" aria-hidden="true">'+a.emoji+'</span><span class="action-text"><strong>'+a.title+'</strong><small>'+a.subtitle+'</small></span>';button.setAttribute('aria-label',a.title+', '+a.subtitle);button.addEventListener('click',()=>{if(button.dataset.dragged!=='1')perform(i);});row.append(button);});play?.decorateActions(room,row);
animate('wave',1.1);}
function toast(msg:string){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('#toast').classList.remove('show'),2400);}
function reward(msg:string){const el=$('#reward');el.textContent=msg;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function reactionBubble(text:string){$('#mood-message').textContent=text;const tag=$('#character-tag');tag.classList.add('visible');clearTimeout(reactionTimer);reactionTimer=window.setTimeout(()=>tag.classList.remove('visible'),1700);}
function heartBurst(x:number,y:number,strong=false){const el=$('#touch-effects');const icons=strong?['💖','💗','✨','💕','🌟','💜','🎀']:['💗','✨','💕','💖'];icons.forEach((icon,i)=>{const particle=document.createElement('span');particle.className='touch-heart';particle.textContent=icon;particle.style.left=x+'px';particle.style.top=y+'px';const angle=-Math.PI*(.15+.7*i/Math.max(1,icons.length-1));particle.style.setProperty('--dx',Math.cos(angle)*(45+i%3*17)+'px');particle.style.setProperty('--dy',(-60-i%3*20)+'px');particle.style.setProperty('--rot',(-24+i*11)+'deg');particle.style.animationDelay=(i%3)*65+'ms';el.append(particle);window.setTimeout(()=>particle.remove(),1450);});}
function touchDaniela(x:number,y:number,headTap:boolean){const now=performance.now();touchStreak=now-lastTouch<1300?touchStreak+1:1;lastTouch=now;const bigLaugh=touchStreak>=3||headTap;animate(bigLaugh?'laugh':'giggle',bigLaugh?1.75:1.25);state.happiness=num(state.happiness+(bigLaugh?2:1));heartBurst(x,y,bigLaugh);reactionBubble(touchStreak>=5?'¡Para, que me da la risa! 😂':bigLaugh?'¡Jijijí! 😂💖':'¡Jeje! 💕');if(touchStreak===5)reward('+5 💗');render();save();sound(bigLaugh?[784,988,1175,988]:[880,1046]);if('vibrate' in navigator)navigator.vibrate?.(bigLaugh?[12,24,12]:12);$('#tutorial').classList.add('hidden');try{localStorage.setItem('danielakpop-tutorial','yes');}catch{}}

function sound(notes:number[]=[523,659,784]){if(!soundEnabled)return;try{const ctx=new AudioContext();notes.forEach((hz,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime+i*.095;osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.045,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+.23);osc.connect(gain);gain.connect(ctx.destination);osc.start(time);osc.stop(time+.24);});setTimeout(()=>void ctx.close(),900);}catch{}}
function gainXP(amount:number){state.xp+=amount;while(state.xp>=state.level*100){state.xp-=state.level*100;state.level++;state.coins+=50;toast('¡Nivel '+state.level+'! +50 monedas ✨');reward('LEVEL UP! 🌟');}}
function perform(i:number){if(play?.beforeAction(room,i))return;if(room==='bedroom'&&i===2){play?.throwBall();return;}const a=rooms[room].actions[i];if(a.coins<0&&state.coins < -a.coins){toast('¡Necesitas más monedas! Baila para ganar 🎶');sound([350,270]);return;}
if(room==='stage'&&state.energy<10){toast('¡Daniela está agotada! Llévala a descansar 💤');return;}
if(room==='closet'&&i===0)state.outfit=(state.outfit+1)%dressColors.length;
if(room==='closet'&&i===1)state.hair=(state.hair+1)%hairColors.length;
fashion();for(const [need,delta] of Object.entries(a.effect) as [Need,number][])state[need]=num(state[need]+delta);
state.coins=Math.max(0,state.coins+a.coins);gainXP(a.xp);animate(a.move);
const outfitNames=['Fresa pop','Lavender dream','Mint candy','Peach sparkle'],hairNames=['Chocolate','Strawberry','Lavender','Honey'];
toast(room==='closet'&&i===0?outfitNames[state.outfit]+' 🎀':room==='closet'&&i===1?'Pelo '+hairNames[state.hair]+' 💜':a.message);
reward('+'+a.xp+' XP '+(a.coins>0?'· +'+a.coins+' ★':''));sound(room==='stage'?[523,659,784,1046]:[659,784,988]);render();save();play?.afterAction(room,i);}
canvas.addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY,time:performance.now()};});
canvas.addEventListener('pointercancel',()=>{touchStart=null;});
canvas.addEventListener('pointerup',e=>{const start=touchStart;touchStart=null;if(editor?.isEditing()||room==='bathroom'||play?.isPainting()||!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>15||performance.now()-start.time>550)return;const rect=canvas.getBoundingClientRect();const hit=scene.pick(e.clientX-rect.left,e.clientY-rect.top);if(hit?.hit&&hit.pickedMesh&&(hit.pickedMesh.isDescendantOf(body)||hit.pickedMesh===blenderCharacterMesh)){const isHead=hit.pickedMesh===blenderCharacterMesh?(hit.pickedPoint?.y??0)>2:hit.pickedMesh.name.includes('eye')||hit.pickedMesh.name.includes('hair')||hit.pickedMesh.name.includes('face')||hit.pickedMesh.name.includes('bang')||hit.pickedMesh.name.includes('cheek')||hit.pickedMesh.name.includes('smile')||hit.pickedMesh.name.includes('nose')||hit.pickedMesh.name.includes('bow');touchDaniela(e.clientX,e.clientY,isHead);}});
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
showRoom('bedroom');fashion();render();
// Safe in-game art-direction comparison: lazy-load Blender, preserve the current
// room and saved progress, and always keep the procedural original available.
const comparison=new URLSearchParams(location.search);
const comparing=comparison.has('compare');
const initialBlender=comparing&&comparison.get('daniela')==='blender';
let blenderClips:AnimationGroup[]=[];
let blenderLastMove:Move|null=null;
let blenderRoot:TransformNode|null=null;
let blenderCharacterMesh:Mesh|null=null;
let blenderLoading:Promise<void>|null=null;
let blenderSelected=false;
const blenderClipNames:Record<Move,string>={
 idle:'Idle',wave:'Wave',dance:'DancePop',sleep:'Sleep',
 eat:'Eat',drink:'Drink',spin:'Celebrate',bath:'Bath',jump:'Jump',
 giggle:'Giggle',laugh:'Laugh',surprised:'Giggle',volley:'Volley',
 sing:'Sing',dance2:'DancePop',dance3:'DanceCute',
 dance4:'DanceHipHop',dance5:'DanceDisco'
};
function playComparisonAnimation(){
 if(!blenderSelected||!blenderClips.length||move===blenderLastMove)return;
 blenderLastMove=move;
 const clip=blenderClips.find(group=>group.name===blenderClipNames[move])||blenderClips[0];
 for(const animation of blenderClips)animation.stop();
 clip.start(true,1,clip.from,clip.to,false);
}
if(comparing){
 const picker=document.createElement('nav');
 picker.className='daniela-compare-picker';
 picker.setAttribute('aria-label','Comparar diseños de Daniela');
 const loading=document.createElement('div');
 loading.className='daniela-compare-loading';
 loading.setAttribute('role','status');
 loading.setAttribute('aria-live','polite');
 loading.hidden=true;
 const buttons=new Map<'original'|'blender',HTMLButtonElement>();
 for(const [value,label] of [['original','💜 Original'],['blender','✨ Blender 3D']] as const){
  const button=document.createElement('button');
  button.type='button';button.textContent=label;button.className='daniela-compare-button';
  button.addEventListener('click',()=>void selectVariant(value));
  buttons.set(value,button);picker.appendChild(button);
 }
 function updatePicker(){
  for(const [value,button] of buttons){
   const selected=(value==='blender')===blenderSelected;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
  }
 }
 function updateURL(value:'original'|'blender'){
  const url=new URL(location.href);
  if(value==='blender')url.searchParams.set('daniela','blender');
  else url.searchParams.delete('daniela');
  history.replaceState(history.state,'',url);
 }
 async function loadBlender(){
  if(blenderRoot)return;
  if(blenderLoading)return blenderLoading;
  loading.textContent='Preparando a Daniela 3D…';
  loading.hidden=false;
  blenderLoading=(async()=>{
   const result=await SceneLoader.ImportMeshAsync('',import.meta.env.BASE_URL+'assets/characters/','daniela-original-inspired.glb',scene);
   const root=new TransformNode('Daniela Blender A/B root',scene);
   root.position.copyFrom(idol.position);
   for(const node of [...result.meshes,...result.transformNodes]){
    if(!node.parent)node.parent=root;
   }
   for(const mesh of result.meshes){
    if(mesh instanceof Mesh&&mesh.getTotalVertices()>0){
     mesh.isPickable=true;
     if(!blenderCharacterMesh)blenderCharacterMesh=mesh;
    }
   }
   if(!blenderCharacterMesh||!result.animationGroups.length){
    root.dispose(false,true);
    throw new Error('El modelo Blender no contiene geometría o animaciones');
   }
   blenderRoot=root;
   blenderClips=result.animationGroups;
   for(const group of blenderClips)group.stop();
   blenderRoot.setEnabled(false);
   fashion();
  })().finally(()=>{blenderLoading=null;loading.hidden=true;});
  return blenderLoading;
 }
 async function selectVariant(value:'original'|'blender'){
  if(value==='original'){
   blenderSelected=false;
   blenderRoot?.setEnabled(false);
   blenderClips.forEach(group=>group.stop());
   blenderLastMove=null;
   body.setEnabled(true);
   updateURL('original');updatePicker();
   return;
  }
  for(const button of buttons.values())button.disabled=true;
  try{
   await loadBlender();
   if(!blenderRoot)throw new Error('Modelo no disponible');
   body.setEnabled(false);
   blenderRoot.setEnabled(true);
   blenderSelected=true;
   blenderLastMove=null;
   playComparisonAnimation();
   updateURL('blender');updatePicker();
  }catch(error){
   console.error('Daniela Blender A/B failed:',error);
   blenderSelected=false;body.setEnabled(true);
   loading.textContent='No se pudo cargar Blender. Daniela original sigue disponible.';
   loading.hidden=false;updatePicker();
  }finally{
   for(const button of buttons.values())button.disabled=false;
  }
 }
 document.body.append(picker,loading);
 updatePicker();
 if(initialBlender)void selectVariant('blender');
}
engine.runRenderLoop(()=>{
 const now=performance.now(),t=now/1000,e=(now-started)/1000;
 if(e>duration&&move!=='idle')move='idle';
 playComparisonAnimation();
 const a=e;const sin=Math.sin,cos=Math.cos,abs=Math.abs;
 const dance=move==='dance'||move==='dance2'||move==='dance3'||move==='dance4'||move==='dance5';
 const fast=move==='dance2'||move==='dance4';
 const beat=fast?9:move==='dance3'?5.5:move==='dance5'?6.5:7;
 const b=sin(a*beat),step=sin(a*beat*.5);
 const isEating=move==='eat'||move==='drink';
 const isVolley=move==='volley';
 microphone.setEnabled(move==='sing'&&room==='stage');
 // Each choreography uses its own weight shift, bounce, turns, arms and steps.
 body.position.x=dance?move==='dance4'?sin(a*4)*.16:move==='dance5'?sin(a*3)*.2:sin(a*beat*.5)*.12:0;
 body.position.y=dance?(move==='dance2'?abs(sin(a*9))*.27:move==='dance4'?abs(step)*.13:move==='dance3'?abs(sin(a*5))*.13:abs(b)*.17):
  isVolley?abs(sin(a*13))*.22:move==='jump'?abs(sin(a*5))*.32:
  move==='laugh'?abs(sin(a*13))*.09:move==='giggle'?abs(sin(a*8))*.05:
  move==='sleep'?-.23:sin(t*2.1)*.046;
 body.rotation.x=dance?move==='dance4'?.14+sin(a*beat)*.13:move==='dance5'?sin(a*3)*.08:sin(a*beat)*.05:
  isVolley?-.16*sin(a*9):0;
 body.rotation.y=move==='spin'?a*6:move==='dance5'?sin(a*2.4)*.46:
  dance?sin(a*4)*.18:sin(t*.8)*.065;
 body.rotation.z=move==='sleep'?.12:move==='dance4'?sin(a*beat/2)*.16:
  move==='dance3'?sin(a*4)*.11:dance?sin(a*beat)*.075:
  move==='laugh'?sin(a*14)*.09:move==='giggle'?sin(a*9)*.045:sin(t*1.2)*.018;
 legs[0].rotation.x=dance?sin(a*beat)*.35:isVolley?-.22*sin(a*12):0;
 legs[1].rotation.x=dance?-sin(a*beat)*.35:isVolley?.22*sin(a*12):0;
 legs[0].rotation.z=dance?(move==='dance5'?.12+step*.13:step*.1):0;
 legs[1].rotation.z=dance?(move==='dance5'?-.12-step*.13:-step*.1):0;
 // A K-pop routine should not share the same generic arm animation.
 let left=.08,right=-.08,leftX=0,rightX=0;
 if(move==='wave'){right=1.3+sin(a*13)*.65;}
 else if(move==='jump'){left=-.65;right=.65;}
 else if(move==='bath'){left=-.35;right=.35+sin(a*7)*.2;}
 else if(move==='dance'){left=sin(a*8)*.85;right=-sin(a*8)*.85;leftX=.23*cos(a*4);rightX=-.23*cos(a*4);}
 else if(move==='dance2'){left=-1.1+sin(a*10)*.4;right=1.1-cos(a*10)*.4;leftX=cos(a*9)*.53;rightX=-cos(a*9)*.53;}
 else if(move==='dance3'){left=-1.0+sin(a*5.5)*.32;right=1.0-cos(a*5.5)*.32;leftX=.4;rightX=-.4;}
 else if(move==='dance4'){left=-.35+sin(a*10)*.83;right=.35+cos(a*10)*.83;leftX=-.48;rightX=.48;}
 else if(move==='dance5'){left=sin(a*3)>0?-2.2:-.35;right=sin(a*3)>0?.35:2.2;leftX=.17;rightX=-.17;}
 else if(move==='sing'){left=-.34+sin(a*3)*.22;right=-1.7+sin(a*6)*.1;rightX=-.19;}
 else if(isVolley){left=-1.72+sin(a*11)*.32;right=1.72-sin(a*11)*.32;leftX=-.16;rightX=-.16;}
 else if(move==='laugh'){left=-1.05+sin(a*13)*.19;right=1.05-sin(a*13)*.19;}
 else if(move==='giggle'){left=-.5+sin(a*9)*.15;right=.5-sin(a*9)*.15;}
 const gripUp=Math.max(0,Math.min(1,(a-.12)/.69));
 const gripDown=Math.max(0,Math.min(1,(a-2.5)/.57));
 const bringToMouth=gripUp*(1-gripDown);
 arms[0].rotation.z=left;arms[0].rotation.x=leftX;
 arms[1].position.z=isEating?-.43*bringToMouth:0;
 arms[1].rotation.z=isEating?.08-2.44*bringToMouth+(a>1&&a<2.5?sin(a*12)*.045:0):right;
 arms[1].rotation.x=isEating?-.15*bringToMouth:rightX;
 head.rotation.z=move==='laugh'?sin(a*11)*.15:move==='giggle'?sin(a*9)*.08:
  dance?sin(a*beat*.62)*.13:isVolley?sin(a*14)*.12:
  move==='sleep'?.14:sin(t*1.1)*.046;
 head.rotation.x=move==='laugh'?-.07+sin(a*8)*.06:move==='giggle'?-.03:
  move==='sing'?sin(a*10)*.085:move==='drink'?-.09+sin(a*6)*.043:
  move==='eat'?sin(a*12)*.065:move==='sleep'?.15:dance?sin(a*beat)*.07:0;
 const giggling=move==='laugh'||move==='giggle';
 // Soft eyelids and a short double-blink break up the mechanical 4-second loop.
 const phase=t%6.4;
 const blink=Math.max(0,1-Math.abs(phase-2.7)/.12,1-Math.abs(phase-2.94)/.09,1-Math.abs(phase-5.87)/.12);
 const close=move==='sleep'?1:blink;
 eyelids.forEach(lid=>{lid.visibility=close>.025?1:0;lid.scaling.y=.025+close*.94;});
 eyeMeshes.forEach(eye=>eye.scaling.y=(giggling?.27:isEating?.74:1.1)*(1-.94*close));
 eyeGlints.forEach(glint=>glint.visibility=1-close);
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
 bow.rotation.z=sin(t*2)*.08;
 orbs.forEach((o,i)=>o.scaling.setAll(1+sin(t*2+i*.7)*.18));
 play?.tick(now);
 scene.render();
});
addEventListener('resize',()=>engine.resize());
setInterval(()=>{if(document.hidden)return;state.hunger=Math.max(0,state.hunger-.28);state.energy=Math.max(0,state.energy-.16);state.happiness=Math.max(0,state.happiness-.19);state.hygiene=Math.max(0,state.hygiene-.12);render();save();},60000);
addEventListener('pagehide',save);
