import test from 'node:test';
import assert from 'node:assert/strict';
import {angle,measurePose,summarizeVideo,sampleTimes,quantile,visible,timeLabel} from '../dist/video-metrics.js';
const p=(x,y,visibility=1)=>({x,y,visibility,presence:1});
test('2D angles are aspect-correct and degenerate joints are rejected',()=>{
 assert.equal(Math.round(angle(p(0,0),p(0,1),p(1,1),1920,1080)),90);
 assert.equal(Math.round(angle(p(0,.5),p(.5,.5),p(1,.5),1920,1080)),180);
 const corrected=angle(p(.1,.3),p(.2,.2),p(.3,.3),2,1);assert.ok(corrected>120&&corrected<130);
 assert.equal(angle(p(0,0),p(0,0),p(1,1)),null);assert.equal(angle(p(0,0,.1),p(.5,.5),p(1,0)),null);
});
test('visibility requires confidence, presence, finite values, and in-frame coordinates',()=>{
 assert.equal(visible(p(.2,.3)),true);assert.equal(visible(p(.2,.3,.3)),false);assert.equal(visible(p(1.1,.3)),false);assert.equal(visible({...p(.2,.3),presence:.4}),false);assert.equal(visible(p(NaN,.3)),false);
});
test('pose measurements distinguish body availability from joint availability',()=>{
 const lm=Array.from({length:33},()=>p(.5,.5,0));assert.equal(measurePose(null,100,100),null);
 for(const i of [11,12,23,24])lm[i]=p(i%2?.4:.6,i<20?.3:.55);
 const m=measurePose(lm,100,100);assert.equal(m.core,true);assert.equal(m.hipX,.5);assert.equal(m.kneeFlex,null);assert.equal(m.elbow,null);
 lm[23]=p(.4,.5);lm[25]=p(.4,.7);lm[27]=p(.4,.9);assert.equal(Math.round(measurePose(lm,100,100).kneeFlex),0);
});
test('hitting hand selects the matching anatomical arm',()=>{
 const lm=Array.from({length:33},()=>p(.5,.5,0));lm[11]=p(.1,.2);lm[13]=p(.1,.5);lm[15]=p(.4,.5);lm[12]=p(.7,.2);lm[14]=p(.7,.5);lm[16]=p(.7,.8);
 assert.equal(Math.round(measurePose(lm,100,100,'left').elbow),90);assert.equal(Math.round(measurePose(lm,100,100,'right').elbow),180);
});
test('summary excludes unclear torsos and requires at least 5 observations per timestamp metric',()=>{
 const s=Array.from({length:10},(_,i)=>({time:i,metrics:{core:i<8,kneeFlex:i,elbow:i<4?90:null,hipX:i/10}}));
 const report=summarizeVideo(s);assert.equal(report.valid,8);assert.equal(report.coverage,.8);assert.equal(report.metrics.kneeFlex.count,8);assert.equal(report.metrics.elbow.count,4);assert.ok(!report.events.some(e=>e.type==='elbow'));assert.equal(report.events.find(e=>e.type==='kneeFlex'&&e.edge==='high').time,7);
});
test('no detections yield no fabricated measurements or events',()=>{
 const report=summarizeVideo([{time:0,metrics:null},{time:1,metrics:{core:false,kneeFlex:35,elbow:90,hipX:.5}}]);assert.equal(report.valid,0);assert.equal(report.metrics.kneeFlex.low,null);assert.deepEqual(report.events,[]);assert.equal(summarizeVideo([]).coverage,0);
});
test('sample windows are bounded and timestamps increase, ending before the cutoff',()=>{
 const t=sampleTimes(2,3,8);assert.equal(t.length,8);assert.equal(t[0],2);assert.equal(t.at(-1),2.875);assert.equal(sampleTimes(0,60,8).length,480);
 for(const args of [[0,61,8],[4,3,8],[-1,3,8],[0,10,30],[NaN,2,8]])assert.throws(()=>sampleTimes(...args));
});
test('quantiles do not mutate input; empty values remain unavailable',()=>{
 const a=[10,0,5];assert.equal(quantile(a,.5),5);assert.deepEqual(a,[10,0,5]);assert.equal(quantile([], .5),null);assert.equal(timeLabel(75.5),'1:15.5');assert.equal(timeLabel(59.999),'1:00.0');
});
