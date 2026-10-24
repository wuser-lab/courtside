import {createMatch,demoMatch,validateMatch,replay,analytics,pointLabel,pct} from './engine.js';
import {mountVideoStudio} from './video-studio.js';
const $=id=>document.getElementById(id),KEY='courtside.match.v1';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=['winner','unforced','forced','ace','double-fault'];
const resultLabels={winner:'Winner',unforced:'Unforced error',forced:'Forced error',ace:'Ace','double-fault':'Double fault'};
let match=demoMatch(),view='overview',selectedWinner=0,selectedTarget=null,pendingReplacement=null,toastTimer;
try{const stored=localStorage.getItem(KEY);if(stored)match=validateMatch(JSON.parse(stored));}catch{setTimeout(()=>toast('Saved match could not be read. Showing a fresh demo.'),100);}
let analysis=analytics(match);
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(match));$('saved-status').innerHTML='<i></i> Saved on device';}catch{$('saved-status').textContent='Storage unavailable · export a backup';toast('Browser storage is unavailable or full. Export a backup to keep your match.');}}
function formatPercent(tuple){const v=pct(tuple);return v===null?'—':v+'%';}
function insightData(){
  const p=analysis.players[0],n=match.players[0];
  return [
    {key:'serve',ready:p.secondWon[1]>=8,title:pct(p.secondWon)!==null&&pct(p.secondWon)<50?'Give the second serve a little more.':'Build a second serve you can trust.',evidence:`${n} won ${p.secondWon[0]} of ${p.secondWon[1]} points behind a second serve (${formatPercent(p.secondWon)}).`,drill:'Serve + 1: play 20 points starting with a second serve. Aim for a generous target, then recover for the next ball.',context:'Second-serve points',count:p.secondWon[1],goal:'20 points · controlled depth'},
    {key:'return',ready:p.returnWon[1]>=8,title:pct(p.returnWon)!==null&&pct(p.returnWon)<40?'Make the return a better first ball.':'Keep the pressure on the return.',evidence:`${n} won ${p.returnWon[0]} of ${p.returnWon[1]} return points (${formatPercent(p.returnWon)}).`,drill:'Return + 1: alternate 10 returns from each side. Aim deep through the middle, then play out the point.',context:'Return points',count:p.returnWon[1],goal:'20 returns · depth before pace'},
    {key:'rally',ready:analysis.rallies[2].wins.reduce((a,b)=>a+b,0)>=8,title:'Give the long rally a purpose.',evidence:`${n} won ${analysis.rallies[2].wins[0]} of ${analysis.rallies[2].wins.reduce((a,b)=>a+b,0)} points with 9 or more shots.`,drill:'Crosscourt patience: rally 8 balls crosscourt before opening the court. Play 10 points; use height and depth to build your chance.',context:'Rallies of 9+ shots',count:analysis.rallies[2].wins.reduce((a,b)=>a+b,0),goal:'10 points · patience with intent'}
  ];
}
function render(){
  analysis=analytics(match);const {state,players,log}=analysis;
  $('demo-strip').hidden=!match.demo;
  $('match-format').textContent=`SINGLES · BEST OF ${match.bestOf}`;
  $('match-status').innerHTML=state.complete?'✓ MATCH COMPLETE':'<i></i> '+(match.points.length?'IN PROGRESS':'READY TO PLAY');
  $('scoreboard').innerHTML=match.players.map((name,i)=>`<div class="score-row"><span class="player-name">${!state.complete&&state.server===i?'<i class="server-dot" title="Serving"></i>':''}${escape(name)}${state.winner===i?' ✓':''}</span>${state.sets.map(s=>`<span class="score-num ${s.winner===i?'won':''}">${s.games[i]}</span>`).join('')}${!state.complete?`<span class="score-num current">${state.games[i]}</span>`:''}<span class="score-num point">${pointLabel(state,i)}</span></div>`).join('');
  $('surface-label').textContent=`◈ ${match.surface.toUpperCase()} COURT`;
  $('match-summary').textContent=`${log.length} POINTS LOGGED${state.tiebreak?' · TIEBREAK':''}`;
  $('nav-count').textContent=log.length;
  $('dock-server').textContent=state.complete?`${match.players[state.winner]} wins the match`:`${match.players[state.server]} serving · ${pointLabel(state,0)}–${pointLabel(state,1)}`;
  [0,1].forEach(i=>{const b=$('point-'+i);b.innerHTML=`${escape(match.players[i])} <span class="key">${i+1}</span>`;b.disabled=state.complete;});
  $('undo-button').disabled=!log.length;
  const metrics=[
    ['Points won',players[0].won,`<small> / ${log.length}</small>`,`${players[1].won} by ${escape(match.players[1])}`,'◔'],
    ['First serve in',formatPercent(players[0].firstIn),'',`${players[0].firstIn[0]} of ${players[0].firstIn[1]} service points`,'↗'],
    ['Winners',players[0].winners,'',`${players[0].unforced} unforced errors`,'◎'],
    ['Break points won',`${players[0].breaks[0]}<small> / ${players[0].breaks[1]}</small>`,'',`${formatPercent(players[0].breaks)} conversion`,'⚑']
  ];
  $('metric-grid').innerHTML=metrics.map(([label,value,suffix,caption,icon])=>`<article class="metric"><div class="metric-top"><span>${label}</span><span>${icon}</span></div><div class="metric-value">${value}${suffix}</div><div class="metric-bottom"><strong>${escape(match.players[0])}</strong><span>· ${caption}</span></div></article>`).join('');
  $('momentum-legend').innerHTML=match.players.map((n,i)=>`<span><i class="dot ${i?'orange':'lime'}"></i>${escape(n)}</span>`).join('');
  renderMomentum();renderCourt();renderComparison();
  const ready=insightData().filter(x=>x.ready),insight=ready.find(x=>x.key==='serve'&&pct(players[0].secondWon)<50)||ready[0];
  $('coach-insight').innerHTML=insight?`<div class="insight-kicker">${insight.context.toUpperCase()} · ${insight.count} OBSERVATIONS</div><h4>${escape(insight.title)}</h4><p>${escape(insight.evidence)} Try the focused drill in your practice plan.</p>`:'<div class="insight-kicker">LET THE PATTERNS DEVELOP</div><h4>A few points. A clearer picture.</h4><p>Log at least 8 second-serve points, return points, or long rallies to surface an observation. Every point adds context.</p>';
  $('rally-bars').innerHTML=analysis.rallies.map(r=>{const total=r.wins[0]+r.wins[1];return `<div><div class="rally-header"><span>${r.label}</span><b>${r.wins[0]}<span> / ${r.wins[1]}</span></b></div><div class="rally-bar"><div style="width:${total?r.wins[0]/total*100:50}%;opacity:${total?1:.25}"></div><div style="width:${total?r.wins[1]/total*100:50}%;opacity:${total?1:.25}"></div></div><div class="rally-sub">${total} points · ${escape(match.players[0])} / ${escape(match.players[1])}</div></div>`;}).join('');
  $('point-table').innerHTML=log.length?[...log].reverse().map(p=>`<tr><td>${p.index+1}</td><td>${p.set} / ${p.game}</td><td>${escape(match.players[p.winner])}</td><td class="point-result">${resultLabels[p.result]}</td><td>${p.serve===1?'First':'Second'}</td><td>${p.rally}</td><td>${p.breakPoint?'<span class="break-tag">Break point</span>':'—'}</td></tr>`).join(''):'<tr><td colspan="7" class="empty-state">Your first point starts the story. Use the buttons below to log it.</td></tr>';
  $('practice-cards').innerHTML=insightData().map((x,i)=>`<article class="practice-card"><span class="practice-number">0${i+1} / ${x.context.toUpperCase()}</span><h4>${escape(x.title)}</h4><p>${x.ready?escape(x.evidence):`Log at least 8 relevant points to add a match observation. Currently ${x.count} logged.`}</p><div class="drill">${x.drill}</div><small>${x.goal}</small></article>`).join('');
  if(document.activeElement!==$('coach-notes'))$('coach-notes').value=match.notes||'';
}
function renderMomentum(){
  const data=analysis.momentum,W=620,H=138,pad=14,n=data.length;
  if(!n){$('momentum-chart').innerHTML='<div class="empty-state">Log points to see momentum build.</div>';return;}
  const y=v=>H/2-v*49,x=i=>pad+i/Math.max(1,n-1)*(W-2*pad);
  const path=data.map((d,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(d.y).toFixed(2)}`).join(' ');
  const area=`${path} L${x(n-1)},${H/2} L${pad},${H/2} Z`;
  const ticks=[0,Math.floor((n-1)/2),n-1].filter((v,i,a)=>a.indexOf(v)===i);
  $('momentum-chart').innerHTML=`<svg role="img" aria-label="Rolling 12-point momentum. Last window: ${Math.round((data[n-1].y+1)*50)} percent won by ${escape(match.players[0])}." viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><clipPath id="top-clip"><rect width="620" height="69"/></clipPath><clipPath id="bottom-clip"><rect y="69" width="620" height="69"/></clipPath></defs><path d="M14 20H606M14 69H606M14 118H606" stroke="#e8ebdf" stroke-width="1" stroke-dasharray="3 5"/><path d="${area}" fill="#dfe9c7" clip-path="url(#top-clip)"/><path d="${area}" fill="#efdfd2" clip-path="url(#bottom-clip)"/><path d="${path}" fill="none" stroke="#8fa65f" stroke-width="2" clip-path="url(#top-clip)"/><path d="${path}" fill="none" stroke="#c79572" stroke-width="2" clip-path="url(#bottom-clip)"/>${ticks.map(i=>`<text x="${x(i)}" y="136" text-anchor="middle" fill="#a0a58f" font-size="8">${i+1}</text>`).join('')}</svg>`;
}
function courtSVG(points=[],picker=false){
  return `<svg viewBox="0 0 220 300" ${picker?'tabindex="0" role="application" aria-label="Optional final ball location. Press Enter to select the center; arrow keys move the marker."':'role="img" aria-label="Manually logged point-ending locations. Green dots: player 1 won; terracotta dots: player 2 won."'}><rect x="9" y="0" width="202" height="300" rx="4" fill="#e8eddb"/><rect x="27" y="16" width="166" height="268" fill="#a5b887"/><g stroke="#f7f9e9" stroke-width="1.5" fill="none"><rect x="27" y="16" width="166" height="268"/><path d="M48 16V284M172 16V284M48 80H172M48 220H172M110 80V220M18 150H202M110 16V21M110 279V284"/></g><path d="M18 150H202" stroke="#445d3d" stroke-width="3"/><path d="M18 148.5H202" stroke="#f5f7e8" stroke-width="1"/>${points.map(p=>`<circle cx="${27+p.target.x*166}" cy="${16+p.target.y*268}" r="${picker?6:3.6}" fill="${p.winner===0?'#e6f8a5':'#ce926b'}" stroke="${picker?'#344c2d':'#fff9e9'}" stroke-width="${picker?2:.6}" opacity="${picker?1:.85}"/>`).join('')}${picker?'<text x="110" y="298" text-anchor="middle" font-size="7" fill="#687d4e">FULL COURT · OBSERVER’S VIEW</text>':''}</svg>`;
}
function renderCourt(){const filter=$('shot-filter').value;const points=analysis.log.filter(p=>p.target&&(filter==='all'||filter==='unforced'&&p.result==='unforced'||String(p.winner)===filter));$('court-map').innerHTML=courtSVG(points);$('court-count').textContent=points.length;}
function renderComparison(){
  const p=analysis.players;const rows=[['First serve in',...p.map(x=>formatPercent(x.firstIn)),...p.map(x=>pct(x.firstIn)||0)],['First serve points won',...p.map(x=>formatPercent(x.firstWon)),...p.map(x=>pct(x.firstWon)||0)],['Second serve points won',...p.map(x=>formatPercent(x.secondWon)),...p.map(x=>pct(x.secondWon)||0)],['Return points won',...p.map(x=>formatPercent(x.returnWon)),...p.map(x=>pct(x.returnWon)||0)],['Aces',p[0].aces,p[1].aces,p[0].aces,p[1].aces],['Double faults',p[0].doubleFaults,p[1].doubleFaults,p[0].doubleFaults,p[1].doubleFaults]];
  $('comparison').innerHTML=`<div class="compare-names"><span>● ${escape(match.players[0])}</span><span>${escape(match.players[1])} ●</span></div>`+rows.map(([label,a,b,av,bv])=>`<div class="compare-row"><div class="compare-label"><span>${a}</span><span>${label}</span><span>${b}</span></div><div class="comparison-track"><span style="width:${av+bv?av/(av+bv)*100:50}%;opacity:${av+bv?1:.25}"></span><span style="width:${av+bv?bv/(av+bv)*100:50}%;opacity:${av+bv?1:.25}"></span></div></div>`).join('');
}
function setView(next){view=next;for(const key of ['overview','log','practice','video'])$(key+'-view').hidden=key!==view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('breadcrumb').textContent={overview:'Match overview',log:'Point journal',practice:'Practice plan',video:'Video studio'}[view];document.querySelector('.point-dock').hidden=view==='video';$('demo-strip').hidden=view==='video'||!match.demo;$('new-match-button').hidden=view==='video';$('export-button').hidden=view==='video';$('saved-status').hidden=view==='video';document.querySelector('.page-heading').hidden=view==='video';history.replaceState(null,'','#'+view);window.scrollTo({top:0,behavior:'smooth'});}
function replaceMatch(next){pendingReplacement=next;$('confirm-dialog').showModal();}
function applyReplacement(next){match=next;save();render();setView('overview');toast(match.demo?'Sample match loaded.':'Match ready. Make the first point count.');}
function openPoint(winner){
  if(analysis.state.complete)return;selectedWinner=winner;selectedTarget=null;
  $('point-form').reset();$('point-title').textContent=`Point for ${match.players[winner]}.`;$('point-server').textContent=`${match.players[analysis.state.server]} serving · ${pointLabel(analysis.state,0)}–${pointLabel(analysis.state,1)}`;
  $('result-input').innerHTML=names.filter(r=>r!==(winner===analysis.state.server?'double-fault':'ace')).map(r=>`<option value="${r}">${resultLabels[r]}</option>`).join('');
  adjustResult();renderPicker();$('point-dialog').showModal();
}
function renderPicker(){$('target-picker').innerHTML=courtSVG(selectedTarget?[{winner:selectedWinner,target:selectedTarget}]:[],true);const svg=$('target-picker').querySelector('svg');
  svg.addEventListener('click',e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());if(p.x<27||p.x>193||p.y<16||p.y>284)return;selectedTarget={x:(p.x-27)/166,y:(p.y-16)/268};renderPicker();});
  svg.addEventListener('keydown',e=>{if(!['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();selectedTarget=selectedTarget||{x:.5,y:.5};const {x,y}=selectedTarget;selectedTarget={x:Math.max(0,Math.min(1,x+(e.key==='ArrowRight'?.05:e.key==='ArrowLeft'?-.05:0))),y:Math.max(0,Math.min(1,y+(e.key==='ArrowDown'?.05:e.key==='ArrowUp'?-.05:0)))};renderPicker();$('target-picker').querySelector('svg').focus();});
}
function download(content,type,extension){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));link.href=url;link.download=`courtside-${match.players.map(n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-')).join('-vs-')}.${extension}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportJSON(){download(JSON.stringify(match,null,2),'application/json','json');toast('Match archive exported.');}
function exportCSV(){const cell=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';const rows=[['point','set','game','server','winner','serve','result','rally_shots','break_point','court_x','court_y','timestamp'],...analysis.log.map(p=>[p.index+1,p.set,p.game,match.players[p.server],match.players[p.winner],p.serve,p.result,p.rally,p.breakPoint,p.target?.x??'',p.target?.y??'',new Date(p.time).toISOString()])];download(rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8','csv');toast('Point data exported.');}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelector('.brand').addEventListener('click',()=>setView('overview'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('practice-link').onclick=()=>setView('practice');$('about-button').onclick=()=>$('about-dialog').showModal();
for(const id of ['new-match-button','demo-start'])$(id).onclick=()=>$('new-dialog').showModal();
$('new-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const next=createMatch({players:[f.get('player0').trim(),f.get('player1').trim()],surface:f.get('surface'),bestOf:Number(f.get('bestOf')),firstServer:Number(f.get('firstServer'))});try{validateMatch(next);}catch(error){toast(error.message);return;}$('new-dialog').close();if(match.points.length)replaceMatch(next);else applyReplacement(next);};
$('demo-button').onclick=()=>{if(match.points.length&&!match.demo)replaceMatch(demoMatch());else applyReplacement(demoMatch());};
$('confirm-export').onclick=exportJSON;$('confirm-replace').onclick=()=>{$('confirm-dialog').close();if(pendingReplacement)applyReplacement(pendingReplacement);pendingReplacement=null;};
[0,1].forEach(i=>$('point-'+i).onclick=()=>openPoint(i));
function adjustResult(){const result=$('result-input').value;$('serve-input').disabled=result==='double-fault';$('rally-input').readOnly=['ace','double-fault'].includes(result);if(result==='double-fault'){$('serve-input').value='2';$('rally-input').value='0';}else if(result==='ace'){$('rally-input').value='1';}else if(Number($('rally-input').value)<2)$('rally-input').value='4';}
$('result-input').onchange=adjustResult;
$('point-form').onsubmit=e=>{e.preventDefault();const p={winner:selectedWinner,serve:Number($('serve-input').value),result:$('result-input').value,rally:Number($('rally-input').value),target:selectedTarget,time:Date.now()};try{validateMatch({...match,points:[...match.points,p]});}catch(error){toast(error.message);return;}match.points.push(p);save();$('point-dialog').close();render();toast(analysis.state.complete?`${match.players[analysis.state.winner]} wins. Match complete.`:'Point logged.');};
$('clear-target').onclick=()=>{selectedTarget=null;renderPicker();};
function undo(){if(!match.points.length)return;match.points.pop();save();render();toast('Last point undone.');}$('undo-button').onclick=undo;
$('shot-filter').onchange=renderCourt;
$('coach-notes').oninput=()=>{match.notes=$('coach-notes').value.slice(0,20000);save();};
$('coach-notes').maxLength=20000;
$('export-button').onclick=()=>$('export-dialog').showModal();$('download-json').onclick=exportJSON;$('download-csv').onclick=exportCSV;$('csv-button').onclick=exportCSV;
$('import-button').onclick=()=>$('import-input').click();
$('import-input').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('Choose a JSON file smaller than 5 MB.');const raw=validateMatch(JSON.parse(await file.text()));const clean={version:1,players:[...raw.players],surface:raw.surface,bestOf:raw.bestOf,firstServer:raw.firstServer,points:raw.points.map(p=>({winner:p.winner,serve:p.serve,result:p.result,rally:p.rally,target:p.target?{x:p.target.x,y:p.target.y}:null,time:p.time})),notes:typeof raw.notes==='string'?raw.notes.slice(0,20000):'',demo:raw.demo===true};if(match.points.length)replaceMatch(clean);else applyReplacement(clean);}catch(error){toast(error instanceof SyntaxError?'This file is not valid JSON.':error.message);}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if(view==='video'||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.key==='1'||e.key==='2'){e.preventDefault();openPoint(Number(e.key)-1);}else if(e.key.toLowerCase()==='z'){e.preventDefault();undo();}});
render();save();mountVideoStudio({toast});setView(['overview','log','practice','video'].includes(location.hash.slice(1))?location.hash.slice(1):'video');
