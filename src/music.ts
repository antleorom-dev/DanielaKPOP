/**
 * Tiny self-contained K-pop-inspired instrumental loop.
 * No network audio file is needed (the old studio-song.mp3 was absent).
 * AudioContext is created/resumed directly inside the user's click handler.
 */
export function createStudioMusic(){
 let context:AudioContext|null=null;
 let master:GainNode|null=null;
 let timer:number|null=null;
 let nextNote=0,step=0,generation=0;
 const bpm=118,beat=60/bpm,interval=beat/4;
 const roots=[130.81,110,87.31,98]; // C3, A2, F2, G2
 const melody=[
  659.25,0,783.99,0,880,783.99,659.25,0,587.33,0,659.25,0,523.25,0,587.33,0,
  659.25,0,783.99,880,987.77,0,880,783.99,659.25,0,587.33,0,659.25,0,523.25,0,
  698.46,0,880,0,1046.5,880,698.46,0,659.25,0,698.46,0,523.25,0,659.25,0,
  783.99,0,987.77,0,1174.66,987.77,783.99,0,698.46,0,783.99,0,587.33,0,783.99,0
 ];
 function voice(frequency:number,at:number,length:number,volume:number,type:OscillatorType='triangle'){
  if(!context||!master)return;
  const oscillator=context.createOscillator(),envelope=context.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);
  envelope.gain.setValueAtTime(.0001,at);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.012);
  envelope.gain.exponentialRampToValueAtTime(.0001,at+length);
  oscillator.connect(envelope);envelope.connect(master);
  oscillator.start(at);oscillator.stop(at+length+.02);
 }
 function kick(at:number){
  if(!context||!master)return;
  const o=context.createOscillator(),g=context.createGain();
  o.type='sine';o.frequency.setValueAtTime(145,at);
  o.frequency.exponentialRampToValueAtTime(49,at+.16);
  g.gain.setValueAtTime(.27,at);
  g.gain.exponentialRampToValueAtTime(.0001,at+.2);
  o.connect(g);g.connect(master);o.start(at);o.stop(at+.21);
 }
 function noise(at:number,length:number,volume:number,highpass:number){
  if(!context||!master)return;
  const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.22),context.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain();
  source.buffer=buffer;filter.type='highpass';filter.frequency.value=highpass;
  g.gain.setValueAtTime(volume,at);
  g.gain.exponentialRampToValueAtTime(.0001,at+length);
  source.connect(filter);filter.connect(g);g.connect(master);
  source.start(at);source.stop(at+length+.01);
 }
 function schedule(index:number,at:number){
  const beatIndex=index%16,bar=Math.floor(index/16)%4,root=roots[bar];
  if(beatIndex===0||beatIndex===8)kick(at);
  if(beatIndex===4||beatIndex===12)noise(at,.12,.12,1300);
  if(beatIndex%2===0)noise(at,.055,.035,6500);
  if(beatIndex===0||beatIndex===8)voice(root,at,beat*.85,.17,'sawtooth');
  if(beatIndex===0){
   voice(root*2,at,beat*2.6,.033,'sine');
   voice(root*2.5,at,beat*2.6,.026,'sine');
   voice(root*3,at,beat*2.6,.026,'sine');
  }
  const note=melody[index%melody.length];
  if(note)voice(note,at,interval*1.65,.075,'triangle');
 }
 function scheduleAhead(){
  if(!context)return;
  while(nextNote<context.currentTime+.18){
   schedule(step,nextNote);
   step=(step+1)%melody.length;
   nextNote+=interval;
  }
 }
 async function start(){
  if(context?.state==='running')return;
  const id=++generation;
  const audio=new AudioContext();
  context=audio;master=audio.createGain();master.gain.value=.28;master.connect(audio.destination);
  try{
   await audio.resume();
   if(generation!==id){void audio.close();return;}
   step=0;nextNote=audio.currentTime+.06;
   scheduleAhead();
   timer=window.setInterval(scheduleAhead,85);
  }catch(error){
   if(context===audio){context=null;master=null;}
   void audio.close().catch(()=>{});
   throw error;
  }
 }
 function stop(){
  generation++;
  if(timer!==null){clearInterval(timer);timer=null;}
  const audio=context;context=null;master=null;
  if(audio&&audio.state!=='closed')void audio.close().catch(()=>{});
 }
 return {start,stop};
}
