import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,demoMatch,replay,analytics,advance,pointLabel,validateMatch,pct} from '../dist/engine.js';
const start=(options={})=>replay(createMatch(options)).state;
const point=(winner,other={})=>({winner,serve:1,result:'winner',rally:4,target:null,time:1000,...other});
const game=(s,winner)=>{for(let i=0;i<4;i++)s=advance(s,winner);return s;};
test('love, 15, 30, 40, deuce, advantage, and game',()=>{
 let s=start();assert.equal(pointLabel(s,0),'0');
 for(const expected of ['15','30','40']){s=advance(s,0);assert.equal(pointLabel(s,0),expected);}
 for(let i=0;i<3;i++)s=advance(s,1);assert.equal(pointLabel(s,0),'40');
 s=advance(s,0);assert.equal(pointLabel(s,0),'AD');s=advance(s,1);assert.equal(pointLabel(s,0),'40');
 s=advance(advance(s,1),1);assert.deepEqual(s.games,[0,1]);assert.deepEqual(s.points,[0,0]);assert.equal(s.server,1);
});
test('6–4 and 7–5 set endings retain correct server',()=>{
 let s=start();for(let i=0;i<4;i++){s=game(s,0);s=game(s,1);}s=game(game(s,0),0);assert.deepEqual(s.sets[0].games,[6,4]);assert.equal(s.server,0);
 s=start();for(let i=0;i<5;i++){s=game(s,0);s=game(s,1);}s=game(game(s,1),1);assert.deepEqual(s.sets[0].games,[5,7]);assert.equal(s.server,0);
});
test('tiebreak serves follow 1–2–2 rotation and next set starts with receiver',()=>{
 let s=start();for(let i=0;i<6;i++){s=game(s,0);s=game(s,1);}assert.equal(s.tiebreak,true);
 const servers=[];for(const w of [0,1,0,1,0,1]){servers.push(s.server);s=advance(s,w);}assert.deepEqual(servers,[0,1,1,0,0,1]);
 for(let i=0;i<4;i++)s=advance(s,0);assert.deepEqual(s.sets[0].games,[7,6]);assert.deepEqual(s.sets[0].tiebreak,[7,3]);assert.equal(s.server,1);assert.equal(s.tiebreak,false);
});
test('tiebreak must be won by two',()=>{
 let s=start();for(let i=0;i<6;i++){s=game(s,0);s=game(s,1);}for(let i=0;i<6;i++){s=advance(s,0);s=advance(s,1);}
 s=advance(s,0);assert.equal(s.sets.length,0);s=advance(s,1);s=advance(s,1);s=advance(s,1);assert.deepEqual(s.sets[0].tiebreak,[7,9]);
});
test('best of three ends at two sets, best of five at three',()=>{
 for(const bestOf of [3,5]){let s=start({bestOf});for(let set=0;set<Math.ceil(bestOf/2);set++){assert.equal(s.complete,false);for(let g=0;g<6;g++)s=game(s,0);}assert.equal(s.complete,true);assert.equal(s.winner,0);assert.equal(advance(s,1),s);}
});
test('replay supports undo across a game and set boundary',()=>{
 const m=createMatch();for(let i=0;i<24;i++)m.points.push(point(0));assert.equal(replay(m).state.sets.length,1);m.points.pop();const s=replay(m).state;assert.equal(s.sets.length,0);assert.deepEqual(s.games,[5,0]);assert.deepEqual(s.points,[3,0]);
});
test('first server is configurable and empty stats never divide by zero',()=>{
 const a=analytics(createMatch({firstServer:1}));assert.equal(a.state.server,1);assert.equal(pct(a.players[0].firstIn),null);assert.equal(a.log.length,0);
});
test('service, return, breaks, errors and rallies attribute to correct player',()=>{
 const m=createMatch();m.points=[point(1),point(1),point(1),point(1,{result:'double-fault',serve:2,rally:0}),point(1,{result:'ace',rally:1}),point(0,{result:'unforced',serve:2})];
 validateMatch(m);const a=analytics(m);assert.deepEqual(a.players[1].breaks,[1,1]);assert.equal(a.players[0].doubleFaults,1);assert.equal(a.players[1].aces,1);assert.equal(a.players[1].unforced,1);assert.deepEqual(a.players[0].firstIn,[3,4]);assert.equal(a.players[0].won,1);assert.equal(a.rallies.reduce((n,r)=>n+r.wins[0]+r.wins[1],0),m.points.length);
});
test('valid demo is deterministic and exports/imports losslessly',()=>{
 const a=demoMatch(),b=demoMatch();assert.deepEqual(a,b);validateMatch(a);assert.deepEqual(replay(JSON.parse(JSON.stringify(a))).state,replay(a).state);
});
test('imports reject impossible events, coordinates, settings, and points after match',()=>{
 for(const patch of [{winner:2},{serve:3},{result:'banana'},{rally:-1},{rally:1.5},{time:NaN},{target:{x:2,y:0}},{result:'ace',winner:1,rally:1},{result:'double-fault',winner:1,serve:1,rally:0}]){const m=createMatch();m.points=[point(0,patch)];assert.throws(()=>validateMatch(m));}
 assert.throws(()=>validateMatch({...createMatch(),bestOf:2}));assert.throws(()=>validateMatch({...createMatch(),players:['','B']}));
 const m=createMatch();for(let i=0;i<49;i++)m.points.push(point(0));assert.throws(()=>validateMatch(m));
});
test('every scoring prefix has a valid server, consistent sets, and nonnegative score',()=>{
 let seed=77;for(let run=0;run<25;run++){let s=start({firstServer:run%2,bestOf:run%2?3:5});for(let n=0;n<4000&&!s.complete;n++){seed=(seed*1664525+1013904223)>>>0;s=advance(s,seed>>>31);assert.ok([0,1].includes(s.server));assert.ok(s.points.every(p=>p>=0));assert.ok(s.games.every(g=>g>=0&&g<=6));assert.ok(s.sets.every(set=>set.games[set.winner]>=6));}assert.ok(s.complete);}
});
