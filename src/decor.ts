import {Color3,DynamicTexture,Mesh,MeshBuilder,Scene,StandardMaterial,TransformNode,Vector3,PointLight} from '@babylonjs/core';

type Room='bedroom'|'kitchen'|'bathroom'|'stage'|'closet';
type Groups=Record<Room,TransformNode>;

/** Extra lightweight set dressing: detail stays attached to the active room. */
export function dressRooms(scene:Scene, groups:Groups){
 const palettes={
  snow:'#fffaf9',rose:'#f7a9cf',roseDeep:'#e97db2',lavender:'#bba7ec',
  lilac:'#8865b0',sky:'#9ce0f0',aqua:'#8dd6d0',butter:'#ffe2a0',
  cream:'#fff4df',wood:'#d6a9ac',ink:'#6a5286',mint:'#b8eee3'
 };
 const material=(name:string,hex:string,emissive?:string)=>{
  const m=new StandardMaterial('decoration '+name,scene);
  m.diffuseColor=Color3.FromHexString(hex);
  m.specularColor=new Color3(.26,.24,.26);
  if(emissive)m.emissiveColor=Color3.FromHexString(emissive).scale(.09);
  return m;
 };
 const m:Record<string,StandardMaterial>={};
 for(const [name,color] of Object.entries(palettes))m[name]=material(name,color);
 m.neonPink=material('neon pink','#ff83d1','#ff65c3');
 m.neonBlue=material('neon blue','#a8edfa','#59cef6');
 m.neonGold=material('neon gold','#ffdc90','#ffbc67');
 m.glass=material('soft mirror glass','#c7e8f5','#294461');m.glass.alpha=.74;
 const group=(room:Room)=>groups[room];
 function cube(room:Room,n:string,w:number,h:number,d:number,x:number,y:number,z:number,mat:StandardMaterial){
  const a=MeshBuilder.CreateBox('decor '+n,{width:w,height:h,depth:d},scene);
  a.position.set(x,y,z);a.material=mat;a.parent=group(room);a.isPickable=false;return a;
 }
 function orb(room:Room,n:string,diameter:number,x:number,y:number,z:number,mat:StandardMaterial){
  const a=MeshBuilder.CreateSphere('decor '+n,{diameter,segments:12},scene);
  a.position.set(x,y,z);a.material=mat;a.parent=group(room);a.isPickable=false;return a;
 }
 function cylinder(room:Room,n:string,r:number,h:number,x:number,y:number,z:number,mat:StandardMaterial){
  const a=MeshBuilder.CreateCylinder('decor '+n,{diameter:r*2,height:h,tessellation:18},scene);
  a.position.set(x,y,z);a.material=mat;a.parent=group(room);a.isPickable=false;return a;
 }
 function torus(room:Room,n:string,diameter:number,thickness:number,x:number,y:number,z:number,mat:StandardMaterial){
  const a=MeshBuilder.CreateTorus('decor '+n,{diameter,thickness,tessellation:24},scene);
  a.position.set(x,y,z);a.material=mat;a.parent=group(room);a.isPickable=false;return a;
 }
 function poster(room:Room,label:string,x:number,y:number,z:number,w:number,h:number,bg:string,fg:string){
  cube(room,'poster frame',w+.16,h+.16,.08,x,y,z+.04,m.snow);
  const panel=cube(room,'poster '+label,w,h,.09,x,y,z,m[bg]);
  const tex=new DynamicTexture('poster texture '+label,{width:512,height:512},scene,false);
  const ctx=tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0,0,512,512);ctx.fillStyle=palettes[bg as keyof typeof palettes]??'#ffffff';ctx.fillRect(0,0,512,512);
  ctx.fillStyle='#ffffff65';ctx.beginPath();ctx.arc(115,120,98,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(390,365,122,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=palettes[fg as keyof typeof palettes]??'#ffffff';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 75px sans-serif';
  const words=label.split('|');words.forEach((word,i)=>ctx.fillText(word,256,256+(i-(words.length-1)/2)*88,470));
  tex.update();const mat=material('print '+label,palettes.snow);mat.diffuseTexture=tex;mat.emissiveColor=new Color3(.025,.025,.025);
  panel.material=mat;
 }
 function garland(room:Room,from:number,to:number,y:number,z:number){
  for(let i=0;i<11;i++){
   const x=from+(to-from)*i/10,curve=Math.sin(i/10*Math.PI)*-.18;
   orb(room,'garland light',.13,x,y+curve,z,i%3===0?m.neonPink:i%3===1?m.neonGold:m.neonBlue);
  }
 }
 function pottedPlant(room:Room,x:number,z:number,scale=1){
  const pot=cylinder(room,'plant pot',.25*scale,.44*scale,x,.23*scale,z,m.rose);
  pot.scaling.y=.87;
  for(let i=0;i<6;i++){
   const theta=i*Math.PI/3;
   const leaf=orb(room,'leaf',.5*scale,x+Math.cos(theta)*.22*scale,.66*scale,z+Math.sin(theta)*.17*scale,m.mint);
   leaf.scaling.set(.42,.88,.28);leaf.rotation.z=(i%2?1:-1)*.47;
  }
  orb(room,'plant flower',.24*scale,x,.95*scale,z,m.butter);
 }
 const bedroom:Room='bedroom';
 // Wainscoting, detailed trim and wall texture give the bedroom depth.
 cube(bedroom,'wainscot',13.6,1.3,.12,0,.72,6.10,m.cream);
 cube(bedroom,'chair rail',13.7,.09,.18,0,1.43,6.0,m.snow);
 for(let x=-6.2;x<=6.2;x+=1.4){
  cube(bedroom,'wall frame',.042,.89,.22,x,.69,5.96,m.wood);
 }
 cube(bedroom,'skirting left',.12,.23,10.3,-6.83,.12,1,m.snow);
 garland(bedroom,-6.1,6.1,5.24,5.98);
 poster(bedroom,'DREAM|BIG',-1.8,3.5,5.88,1.3,1.5,'lavender','snow');
 poster(bedroom,'K POP|STAR',1.9,3.5,5.88,1.4,1.5,'rose','snow');
 cylinder(bedroom,'side rug',1.83,.035,-.5,.022,.8,m.lavender);
 torus(bedroom,'rug edging',3.64,.045,-.5,.07,.8,m.snow).rotation.x=Math.PI/2;
 cube(bedroom,'throw cushion',.83,.38,.63,-2.6,.24,1.8,m.rose);
 cube(bedroom,'throw cushion 2',.68,.35,.7,-3.2,.2,2.2,m.lavender);
 pottedPlant(bedroom,5.8,1.6,1.14);
 pottedPlant(bedroom,-5.9,3.2,.82);
 for(let i=0;i<5;i++){
  const x=4.45+i*.34;
  cube(bedroom,'mini photocard '+i,.25,.38,.05,x,2.2,5.96,i%2?m.lavender:m.rose);
 }
 // Small teddy bear on top of the bed, built from rounded primitives.
 orb(bedroom,'teddy body',.56,3.72,1.18,4.08,m.wood);
 orb(bedroom,'teddy head',.48,3.72,1.6,4.08,m.wood);
 orb(bedroom,'teddy left ear',.22,3.48,1.79,4.09,m.wood);
 orb(bedroom,'teddy right ear',.22,3.96,1.79,4.09,m.wood);
 for(const sx of [-1,1])orb(bedroom,'teddy arm',.21,3.72+sx*.36,1.2,4.08,m.wood);
 orb(bedroom,'teddy nose',.105,3.72,1.51,3.83,m.ink);
 // Kitchen: tiled backsplash, snack bar, shelves, utensils and pendants.
 const kitchen:Room='kitchen';
 cube(kitchen,'backsplash',8.2,1.77,.1,0,2.12,6.0,m.cream);
 for(let x=-3.8;x<=3.8;x+=.69)for(let y=1.56;y<=2.8;y+=.42){
  cube(kitchen,'pastel tile',.64,.35,.11,x,y,5.9,Math.round(x*11+y*9)%3===0?m.rose:Math.round(x*7+y*11)%3===1?m.aqua:m.snow);
 }
 garland(kitchen,-6,6,5.02,5.87);
 poster(kitchen,'SWEET|CAFÉ',-1.7,3.94,5.86,1.65,1.55,'rose','snow');
 for(const y of [2.9,3.5]){
  cube(kitchen,'floating shelf',2.8,.13,.7,-3.1,y,5.51,m.wood);
  for(let i=0;i<4;i++){
   cylinder(kitchen,'treat jar',.13,.36,-4.1+i*.55,y+.24,5.34,i%2?m.aqua:m.rose);
   orb(kitchen,'jar cap',.31,-4.1+i*.55,y+.45,5.34,m.snow).scaling.y=.27;
  }
 }
 for(const x of [-2.7,2.2,4.4]){
  cylinder(kitchen,'pendant ceiling',.08,.61,x,5.55,3.1,m.snow);
  orb(kitchen,'pendant lamp',.54,x,5.13,3.1,m.butter).scaling.y=.58;
 }
 pottedPlant(kitchen,-5.7,1.7,.9);
 cube(kitchen,'tea menu',1.7,.92,.07,-5.02,3.25,5.87,m.lavender);
 for(let i=0;i<3;i++)cylinder(kitchen,'candy cup',.17,.38,-.2+i*.47,1.96,3.9,i%2?m.rose:m.aqua);
 // Bathroom: soft blue mosaic, chrome taps, floating shelves, duckie and bottles.
 const bathroom:Room='bathroom';
 cube(bathroom,'aqua wall stripe',13.3,1.7,.13,0,2.05,6.0,m.sky);
 for(let x=-6.3;x<=6.3;x+=.65)for(let y=1.34;y<2.9;y+=.48)
  cube(bathroom,'mosaic',.56,.39,.13,x,y,5.9,Math.round(x*9+y*7)%3===0?m.mint:m.snow).visibility=.65;
 cube(bathroom,'towel rail',2.1,.09,.13,-4.9,2.06,4.8,m.ink);
 for(let i=0;i<2;i++)cube(bathroom,'fluffy towel',.6,1.14,.12,-5.3+i*.86,1.43,4.72,i?m.rose:m.mint);
 for(const x of [2.2,3.2,4.2]){
  orb(bathroom,'soap bubbles on shelf',.19,x,2.06,5.28,m.snow);
 }
 cube(bathroom,'bathroom rack',1.8,.13,.52,2.6,2.3,5.2,m.snow);
 for(let i=0;i<4;i++){
  cylinder(bathroom,'body wash bottle',.13+(i%2)*.025,.5,1.9+i*.4,2.61,5.16,i%2?m.rose:m.aqua);
  cube(bathroom,'bottle pump',.28,.08,.18,1.9+i*.4,2.9,5.16,m.snow);
 }
 orb(bathroom,'rubber duck body',.51,3.85,1.52,3.5,m.butter).scaling.set(1,.75,.87);
 orb(bathroom,'duck head',.32,3.68,1.81,3.34,m.butter);
 cube(bathroom,'duck beak',.25,.11,.17,3.64,1.76,3.09,m.rose);
 for(let i=0;i<5;i++)torus(bathroom,'glitter bubble',.26+i*.07,.026,-3.0+i*.6,3.55+i*.24,5.7,i%2?m.neonBlue:m.neonPink);
 // Idol studio: rhythmic LED floor lines, spotlights, branded posters and light stands.
 const stage:Room='stage';
 for(let i=-4;i<=4;i++){
  const bar=cube(stage,'led floor stripe',.07,.018,4.6,i*.93,.59,2.72,i%2?m.neonPink:m.neonBlue);
  bar.visibility=.85;
 }
 for(const x of [-5.5,5.5]){
  cube(stage,'light tower',.31,3.8,.34,x,1.9,4.73,m.ink);
  for(let i=0;i<6;i++){
   const lamp=orb(stage,'led stage spot',.35,x,.53+i*.54,4.48,i%2?m.neonGold:m.neonPink);
   lamp.scaling.z=.36;
  }
 }
 poster(stage,'DANIELA|LIVE',-2.4,3.62,5.73,2.05,1.75,'lavender','snow');
 poster(stage,'KPOP|DREAM',2.4,3.62,5.73,2.05,1.75,'rose','snow');
 garland(stage,-5,5,5.56,5.54);
 // Glow is restricted to the active studio instead of coloring the entire world.
 const spot=new PointLight('pink concert accent',new Vector3(2.2,3.8,1.2),scene);
 spot.parent=groups.stage;spot.diffuse=Color3.FromHexString('#ff7fc7');spot.intensity=.12;spot.range=7;
 // Closet: clothing rail, color-coded boxes, vanity bulbs and mirrors.
 const closet:Room='closet';
 cube(closet,'fashion sign',2.8,.53,.12,1.8,4.65,5.83,m.lavender);
 poster(closet,'STYLE|ICON',-1.35,3.4,5.88,1.65,1.8,'rose','snow');
 cube(closet,'fashion rail',3.2,.1,.16,3.4,3.6,3.55,m.ink);
 for(let i=0;i<6;i++){
  const x=2.05+i*.48;
  cube(closet,'dress sleeve',.4,.7,.32,x,2.83,3.6,i%3===0?m.rose:i%3===1?m.aqua:m.lavender);
  orb(closet,'dress collar',.31,x,3.2,3.6,m.snow).scaling.y=.31;
 }
 for(let i=0;i<5;i++)cube(closet,'shoe box',.74,.38,.75,-5.8+i*.88,.21,3.7,i%2?m.rose:m.lavender);
 for(let i=0;i<8;i++){
  const a=(i/8)*Math.PI*2;
  orb(closet,'mirror beauty bulb',.2,-3.8+Math.cos(a)*1.35,2.18+Math.sin(a)*2,5.53,m.neonGold);
 }
 console.info('DanielaKPOP: enhanced room dressing ready');
}
