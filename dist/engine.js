/** Pure, replayable scoring and analytics. Player indices are always 0 or 1. */
export const RESULTS = ['winner','unforced','forced','ace','double-fault'];
export function validateMatch(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.players) || data.players.length !== 2 || data.players.some(p=>typeof p !== 'string'||!p.trim()||p.length>40)) throw Error('Use a COURTSIDE match JSON with two player names (1–40 characters).');
  if (![0,1].includes(data.firstServer) || ![3,5].includes(data.bestOf) || !['Hard','Clay','Grass'].includes(data.surface)) throw Error('Invalid match settings.');
  if (!Array.isArray(data.points) || data.points.length > 10000) throw Error('A match can contain up to 10,000 points.');
  for (const p of data.points) {
    if (![0,1].includes(p.winner)||![1,2].includes(p.serve)||!RESULTS.includes(p.result)||!Number.isInteger(p.rally)||p.rally<0||p.rally>100||!Number.isFinite(p.time)||Math.abs(p.time)>8640000000000000||(p.rally===0&&p.result!=='double-fault')) throw Error('Invalid point data.');
    if (p.target !== null && (!p.target || !Number.isFinite(p.target.x)||!Number.isFinite(p.target.y)||p.target.x<0||p.target.x>1||p.target.y<0||p.target.y>1)) throw Error('Shot coordinates must be inside the court.');
  }
  let state = initial(data);
  for (const p of data.points) { if(state.complete) throw Error('Points cannot follow a completed match.'); if(p.result==='ace' && (p.winner!==state.server||p.rally!==1)) throw Error('An ace must be won by the server with a rally length of 1.'); if(p.result==='double-fault' && (p.winner===state.server||p.serve!==2||p.rally!==0)) throw Error('A double fault must be lost by the server on a second serve, with a rally length of 0.'); state=advance(state,p.winner); }
  return data;
}
function initial(match) {return {games:[0,0],points:[0,0],sets:[],server:match.firstServer,firstServer:match.firstServer,setServer:match.firstServer,bestOf:match.bestOf,tiebreak:false,tieFirst:null,complete:false,winner:null};}
export function advance(previous,winner) {
  if (previous.complete) return previous;
  const s = {...previous,games:[...previous.games],points:[...previous.points],sets:[...previous.sets]};
  const loser=1-winner;
  s.points[winner]++;
  const finished = s.tiebreak ? s.points[winner]>=7 && s.points[winner]-s.points[loser]>=2 : s.points[winner]>=4 && s.points[winner]-s.points[loser]>=2;
  if (finished) {
    s.games[winner]++;
    const setDone = s.tiebreak || (s.games[winner]>=6 && s.games[winner]-s.games[loser]>=2);
    const nextServer=s.tiebreak ? 1-s.tieFirst : 1-s.server;
    if(setDone){
      s.sets.push({games:[...s.games],winner,tiebreak:s.tiebreak?[...s.points]:null});
      if(s.sets.filter(x=>x.winner===winner).length>Math.floor(s.bestOf/2)){s.complete=true;s.winner=winner;}
      s.games=[0,0];s.tiebreak=false;s.tieFirst=null;s.setServer=nextServer;
    }
    s.points=[0,0];s.server=nextServer;
    if(!setDone && s.games[0]===6&&s.games[1]===6){s.tiebreak=true;s.tieFirst=s.server;}
  } else if(s.tiebreak){const n=s.points[0]+s.points[1];s.server=n%4===1||n%4===2?1-s.tieFirst:s.tieFirst;}
  return s;
}
export function replay(match) {
  let state=initial(match);const log=[];
  for(const [index,p] of match.points.entries()) {
    const before=state;state=advance(state,p.winner);
    log.push({...p,index,server:before.server,set:before.sets.length+1,game:before.games[0]+before.games[1]+1,breakPoint:!before.tiebreak&&before.points[1-before.server]>=3&&before.points[1-before.server]>before.points[before.server],after:state});
  }
  return {state,log};
}
export function pointLabel(state,player){
  if(state.complete)return '—';
  if(state.tiebreak)return String(state.points[player]);
  const [a,b]=state.points;
  if(a>=3&&b>=3)return a===b?'40':state.points[player]>state.points[1-player]?'AD':'40';
  return ['0','15','30','40'][state.points[player]];
}
export function analytics(match) {
  const {state,log}=replay(match);
  const players=[0,1].map(i=>{
    const service=log.filter(p=>p.server===i),returned=log.filter(p=>p.server!==i),first=service.filter(p=>p.serve===1),second=service.filter(p=>p.serve===2),breaks=returned.filter(p=>p.breakPoint);
    return {won:log.filter(p=>p.winner===i).length,aces:service.filter(p=>p.result==='ace').length,doubleFaults:service.filter(p=>p.result==='double-fault').length,winners:log.filter(p=>p.winner===i&&p.result==='winner').length,unforced:log.filter(p=>p.winner!==i&&p.result==='unforced').length,firstIn:[first.length,service.length],firstWon:[first.filter(p=>p.winner===i).length,first.length],secondWon:[second.filter(p=>p.winner===i).length,second.length],returnWon:[returned.filter(p=>p.winner===i).length,returned.length],breaks:[breaks.filter(p=>p.winner===i).length,breaks.length],serviceWon:[service.filter(p=>p.winner===i).length,service.length]};
  });
  const rallies=[[0,4],[5,8],[9,100]].map(([min,max])=>({label:min===9?'9+ shots':`${min}–${max} shots`,wins:[0,1].map(i=>log.filter(p=>p.rally>=min&&p.rally<=max&&p.winner===i).length)}));
  const momentum=log.map((p,i)=>{const window=log.slice(Math.max(0,i-11),i+1);return {x:i+1,y:window.reduce((s,x)=>s+(x.winner===0?1:-1),0)/window.length};});
  return {state,log,players,rallies,momentum};
}
export const pct=([n,d])=>d?Math.round(n/d*100):null;
export function createMatch({players=['Alex Morgan','Jamie Rivera'],surface='Hard',bestOf=3,firstServer=0}={}){return {version:1,players,surface,bestOf,firstServer,points:[],notes:'',demo:false};}
export function demoMatch(){
  const m=createMatch();m.demo=true;let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  let state=initial(m),time=Date.UTC(2026,9,24,9);
  const gameWinners=[0,1,0,1,0,1,0,1,0,0,1,0,1,0,1];
  for(const gw of gameWinners){let game=false;let safety=0;while(!game&&safety++<100){
    const oldGame=state.games[0]+state.games[1],oldSets=state.sets.length;
    const winner=state.points[gw]>=3?gw:random()<.77?gw:1-gw;
    let serve=random()<.66?1:2;const roll=random();let result=roll<.42?'winner':roll<.76?'unforced':'forced';let rally=2+Math.floor(random()*11);
    if(winner===state.server&&roll>.88){result='ace';rally=1;}else if(winner!==state.server&&serve===2&&roll>.88){result='double-fault';rally=0;}
    const target=result==='ace'||result==='double-fault'?null:{x:.08+random()*.84,y:.06+random()*.86};time+=21000+Math.round(random()*16000);
    m.points.push({winner,serve,result,rally,target,time});state=advance(state,winner);game=state.sets.length!==oldSets||state.games[0]+state.games[1]!==oldGame;
  }}
  for(const winner of [0,1,0]){const server=state.server;m.points.push({winner,serve:1,result:winner===server?'winner':'forced',rally:5,target:{x:.7,y:.22},time:time+=26000});state=advance(state,winner);}
  m.notes='Look for the early forehand after a wide serve. Review second-serve return depth between sets.';
  return m;
}
