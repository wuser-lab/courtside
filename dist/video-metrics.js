/** Camera-plane measurements only. These are not calibrated biomechanics. */
export const BODY_CONNECTIONS=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[28,30],[30,32]];
export const visible=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??0)>=.6&&(p.presence??1)>=.6&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
export function angle(a,b,c,width=1,height=1){
  if(![a,b,c].every(visible))return null;
  const u={x:(a.x-b.x)*width,y:(a.y-b.y)*height},v={x:(c.x-b.x)*width,y:(c.y-b.y)*height};
  const denominator=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y);
  return denominator>1e-8?Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/denominator)))*180/Math.PI:null;
}
export function measurePose(landmarks,width,height,hand='right'){
  if(!landmarks||landmarks.length!==33)return null;
  const kneeAngles=[[23,25,27],[24,26,28]].map(ids=>angle(...ids.map(i=>landmarks[i]),width,height)).filter(v=>v!==null);
  const arm=hand==='left'?[11,13,15]:[12,14,16];
  const core=[11,12,23,24].every(i=>visible(landmarks[i]));
  return {core,kneeFlex:kneeAngles.length?kneeAngles.reduce((s,v)=>s+180-v,0)/kneeAngles.length:null,elbow:angle(...arm.map(i=>landmarks[i]),width,height),hipX:core?(landmarks[23].x+landmarks[24].x)/2:null};
}
export function quantile(values,q){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),pos=(sorted.length-1)*q,low=Math.floor(pos);return sorted[low]+(sorted[Math.ceil(pos)]-sorted[low])*(pos-low);}
export function summarizeVideo(samples){
  const core=samples.filter(s=>s.metrics?.core),valid=core.length;
  const summary={total:samples.length,valid,coverage:samples.length?valid/samples.length:0,metrics:{},events:[]};
  for(const key of ['kneeFlex','elbow','hipX']){
    const measured=core.filter(s=>Number.isFinite(s.metrics[key]));const values=measured.map(s=>s.metrics[key]);
    summary.metrics[key]={count:values.length,low:quantile(values,.1),high:quantile(values,.9),median:quantile(values,.5)};
    if(values.length>=5){const ordered=[...measured].sort((a,b)=>a.metrics[key]-b.metrics[key]);summary.events.push({type:key,edge:'low',time:ordered[0].time,value:ordered[0].metrics[key]},{type:key,edge:'high',time:ordered.at(-1).time,value:ordered.at(-1).metrics[key]});}
  }
  return summary;
}
export function sampleTimes(start,end,fps=8){
  if(![start,end,fps].every(Number.isFinite)||start<0||end<=start||end-start>60||![4,8].includes(fps))throw Error('Choose a clip window of up to 60 seconds, with the end after the start.');
  const count=Math.ceil((end-start)*fps);return Array.from({length:count},(_,i)=>start+i/fps);
}
export const timeLabel=t=>{const tenths=Math.round(Math.max(0,t)*10),m=Math.floor(tenths/600),s=((tenths%600)/10).toFixed(1).padStart(4,'0');return `${m}:${s}`;};
