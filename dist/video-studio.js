import {BODY_CONNECTIONS,visible,measurePose,summarizeVideo,sampleTimes,timeLabel} from './video-metrics.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountVideoStudio({toast}){
  const video=$('review-video'),overlay=$('pose-overlay'),ctx=overlay.getContext('2d');
  let clip=null,clipURL=null,samples=[],report=null,notes=[],busy=false,abort=null,worker=null,nextId=0,requests=new Map(),runSettings=null,reviewDirty=false;
  const status=message=>{$('analysis-status').textContent=message;};
  function stopWorker(){worker?.terminate();worker=null;for(const {reject,timer} of requests.values()){clearTimeout(timer);reject(new Error('Analysis stopped.'));}requests.clear();}
  function callWorker(message,transfer=[],timeout=20000){return new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{requests.delete(id);reject(new Error('The analysis engine did not respond. Try a shorter clip or a desktop browser.'));},timeout);requests.set(id,{resolve,reject,timer});worker.postMessage({...message,id},transfer);});}
  async function prepareWorker(){
    worker=new Worker(new URL('./pose-worker.js',import.meta.url));
    worker.onmessage=({data})=>{const pending=requests.get(data.id);if(!pending)return;clearTimeout(pending.timer);requests.delete(data.id);data.error?pending.reject(new Error(data.error)):pending.resolve(data);};
    worker.onerror=()=>{for(const {reject,timer} of requests.values()){clearTimeout(timer);reject(new Error('The body-tracking engine could not start. Reload and try a recent Chrome, Edge, or Safari browser.'));}requests.clear();};
    await callWorker({type:'init'},[],90000);
  }
  function setBusy(value){busy=value;video.controls=!value;for(const id of ['analyse-video','clip-start','clip-end','hitting-hand','sample-rate','stroke-focus','step-back','step-forward','video-input'])$(id).disabled=value||!clip;$('cancel-analysis').hidden=!value;$('analysis-progress').hidden=!value;}
  async function loadClip(file){
    if(busy){toast('Stop analysis before choosing another clip.');return;}
    if(!file)return;
    if(file.size>250*1024*1024){toast('Choose a video smaller than 250 MB. A 10–30 second clip is a good start.');return;}
    if(!file.type.startsWith('video/')&&!/\.(mp4|mov|webm|m4v)$/i.test(file.name)){toast('Choose a video file, such as MP4, MOV, or WebM.');return;}
    if(reviewDirty&&!window.confirm('Changing clips clears this review and its notes. Export your report first if you want to keep it. Change clip?'))return;
    video.pause();if(clipURL)URL.revokeObjectURL(clipURL);stopWorker();
    clip=file;samples=[];report=null;notes=[];runSettings=null;reviewDirty=false;drawOverlay();renderNotes();renderReport();
    $('clip-title').textContent=file.name;$('video-empty').hidden=true;video.hidden=false;$('export-video-report').disabled=true;
    clipURL=URL.createObjectURL(file);video.src=clipURL;video.load();status('Reading your clip…');for(const id of ['analyse-video','step-back','step-forward','clip-start','clip-end','add-video-note','video-note'])$(id).disabled=true;
  }
  video.addEventListener('loadedmetadata',()=>{
    if(!Number.isFinite(video.duration)||video.duration<=0||!video.videoWidth||!video.videoHeight){status('This video has no readable video track or duration. Export a standard MP4 from your phone and try again.');return;}
    $('clip-start').value='0';$('clip-end').value=Math.min(20,Math.floor(video.duration*10)/10||video.duration).toString();
    $('clip-start').max=video.duration;$('clip-end').max=video.duration;
    const w=Math.min(1280,video.videoWidth);overlay.width=w;overlay.height=Math.round(w*video.videoHeight/video.videoWidth);
    $('clip-meta').textContent=`${timeLabel(video.duration)} · ${video.videoWidth} × ${video.videoHeight} · ${(clip.size/1024/1024).toFixed(1)} MB · file stays on your device`;
    setBusy(false);$('video-note').disabled=false;$('add-video-note').disabled=false;status('Ready. Choose your window, then analyse your movement.');
  });
  video.addEventListener('error',()=>{status('Your browser cannot decode this video. Try MP4 with H.264 video, or a WebM clip.');$('analyse-video').disabled=true;});
  async function seek(time,signal){
    if(signal?.aborted)throw new DOMException('Stopped','AbortError');
    const target=Math.min(Math.max(0,time),Math.max(0,video.duration-.001));
    if(Math.abs(video.currentTime-target)<.0001&&video.readyState>=2)return;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(new Error('The video could not seek to a frame. Try exporting a standard MP4.')),15000);
      const done=()=>{if(video.readyState>=2&&!video.seeking)finish();};
      const cancel=()=>finish(new DOMException('Stopped','AbortError'));
      function finish(error){clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('loadeddata',done);video.removeEventListener('error',failed);signal?.removeEventListener('abort',cancel);error?reject(error):resolve();}
      const failed=()=>finish(new Error('The browser could not decode a video frame.'));
      video.addEventListener('seeked',done);video.addEventListener('loadeddata',done);video.addEventListener('error',failed);signal?.addEventListener('abort',cancel,{once:true});
      video.currentTime=target;done();
    });
  }
  function drawOverlay(){
    ctx.clearRect(0,0,overlay.width,overlay.height);$('overlay-label').hidden=true;
    if(!$('show-skeleton').checked||!samples.length)return;
    let lo=0,hi=samples.length-1;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(samples[mid].time<video.currentTime)lo=mid+1;else hi=mid;}
    const sample=[samples[lo],samples[Math.max(0,lo-1)]].sort((a,b)=>Math.abs(a.time-video.currentTime)-Math.abs(b.time-video.currentTime))[0];
    if(!sample?.landmarks||Math.abs(sample.time-video.currentTime)>1/Number(runSettings?.fps||8)*.55+.03)return;
    const lm=sample.landmarks,w=overlay.width,h=overlay.height;ctx.lineWidth=Math.max(2,w/450);ctx.strokeStyle='#d9f585';ctx.fillStyle='#e4ff9c';ctx.shadowColor='#102820';ctx.shadowBlur=3;
    for(const [a,b] of BODY_CONNECTIONS){if(!visible(lm[a])||!visible(lm[b]))continue;ctx.beginPath();ctx.moveTo(lm[a].x*w,lm[a].y*h);ctx.lineTo(lm[b].x*w,lm[b].y*h);ctx.stroke();}
    for(const i of new Set(BODY_CONNECTIONS.flat())){const p=lm[i];if(!visible(p))continue;ctx.beginPath();ctx.arc(p.x*w,p.y*h,Math.max(3,w/260),0,2*Math.PI);ctx.fill();}
    $('overlay-label').hidden=false;
  }
  let lastDraw=0;
  function playbackDraw(){if(!video.paused){if(performance.now()-lastDraw>45){drawOverlay();lastDraw=performance.now();}requestAnimationFrame(playbackDraw);}}
  video.addEventListener('play',()=>requestAnimationFrame(playbackDraw));video.addEventListener('seeked',drawOverlay);video.addEventListener('timeupdate',()=>{$('note-time').textContent=timeLabel(video.currentTime);if(video.paused)drawOverlay();});$('show-skeleton').onchange=drawOverlay;
  async function analyse(){
    if(!clip||busy||!Number.isFinite(video.duration))return;
    let times;const start=Number($('clip-start').value),end=Number($('clip-end').value),fps=Number($('sample-rate').value);
    try{if(end>video.duration+.001)throw Error('The end time must be inside your video.');times=sampleTimes(start,end,fps);}catch(error){toast(error.message);return;}
    if(typeof Worker==='undefined'||typeof createImageBitmap==='undefined'){status('This browser does not support the analysis engine. Try a current desktop Chrome or Edge browser. You can still play the clip and add notes.');return;}
    video.pause();const previousTime=video.currentTime;abort=new AbortController();const signal=abort.signal;setBusy(true);samples=[];report=null;renderReport();drawOverlay();$('export-video-report').disabled=true;$('analysis-progress').value=0;
    runSettings={start,end,fps,hand:$('hitting-hand').value,focus:$('stroke-focus').value};
    const canvas=document.createElement('canvas');canvas.width=Math.min(video.videoWidth,960);canvas.height=Math.round(canvas.width*video.videoHeight/video.videoWidth);const frame=canvas.getContext('2d',{alpha:false});
    try{
      status('Loading the on-device body-tracking model… First use may take a moment.');await prepareWorker();
      for(let i=0;i<times.length;i++){
        if(signal.aborted)throw new DOMException('Stopped','AbortError');
        await seek(times[i],signal);frame.drawImage(video,0,0,canvas.width,canvas.height);const bitmap=await createImageBitmap(canvas);
        if(signal.aborted){bitmap.close();throw new DOMException('Stopped','AbortError');}
        const result=await callWorker({type:'frame',bitmap,timestamp:Math.round(times[i]*1000)+1},[bitmap]);
        const metrics=measurePose(result.landmarks,canvas.width,canvas.height,runSettings.hand);samples.push({time:times[i],landmarks:result.landmarks,metrics});
        $('analysis-progress').value=(i+1)/times.length;if(i%4===0||i===times.length-1)status(`Analysing frame ${i+1} of ${times.length} · ${timeLabel(times[i])}`);drawOverlay();
      }
      report=summarizeVideo(samples);reviewDirty=true;renderReport();$('export-video-report').disabled=false;
      status(report.valid>=5?`Analysis complete. Body visible in ${report.valid} of ${report.total} sampled frames.`:'Analysis complete, but there are too few clear body detections for a movement summary. Try a closer, brighter full-body clip.');
      await seek(previousTime);drawOverlay();
    }catch(error){
      samples=[];report=null;renderReport();drawOverlay();status(signal.aborted?'Analysis stopped. No partial measurements were published.':`Analysis could not finish. ${error.message}`);
    }finally{stopWorker();setBusy(false);$('export-video-report').disabled=!report&&!notes.length;}
  }
  function metricCard(label,value,caption){return `<article class="video-metric"><span>${label}</span><strong>${value}</strong><small>${caption}</small></article>`;}
  function renderReport(){
    const container=$('video-report-content');container.className=report?'':'video-report-empty';
    if(!report){container.innerHTML='<span>◎</span><p>Your report appears after analysis.<br>Every observation links back to a moment in your clip.</p>';return;}
    const {metrics:m,valid,total,coverage}=report,range=k=>m[k].count>=5?`${Math.round(m[k].low)}°–${Math.round(m[k].high)}°`:'—';
    if(valid<5){container.innerHTML=`<div class="tracking-notice"><strong>A closer view will help.</strong><p>Clear torso landmarks were found in ${valid} of ${total} sampled frames. The report needs at least 5 clear samples. Film one player closer to the camera with feet and head visible; use good light.</p></div>`;return;}
    const position=m.hipX.count>=5?Math.round((m.hipX.high-m.hipX.low)*100)+'%':'—';
    container.innerHTML=`<div class="video-metrics">${metricCard('Body visibility',Math.round(coverage*100)+'%',`${valid} / ${total} frames · not an accuracy score`)}${metricCard('Knee flex · 2D',range('kneeFlex'),`${m.kneeFlex.count} samples · middle 80% range`)}${metricCard('Hitting elbow · 2D',range('elbow'),`${esc(runSettings.hand)} arm · ${m.elbow.count} samples`)}${metricCard('Horizontal span',position,'Hip centre · share of image width')}</div>${coverage<.6?'<div class="tracking-notice">Tracking was intermittent. Treat these measurements cautiously and try a closer full-body view.</div>':''}<div class="video-report-columns"><div><div class="video-section-title">THE MOVEMENT TRACE <span>Knee flex · degrees</span></div><div id="video-trace"></div><p class="subtle">Tap a marked moment below to jump to its frame. Gaps mean a joint was not visible.</p></div><div><div class="video-section-title">MOMENTS TO REVISIT <span>Model estimates</span></div><div class="video-moments">${eventMarkup()}</div></div></div><div class="review-prompt"><span>YOUR NEXT LOOK</span><p>${focusPrompt()}</p></div><p class="video-method">Measurements use visible body landmarks projected into the image, corrected for video aspect ratio. Ranges show the 10th–90th percentiles; marked moments show individual extremes. Perspective, occlusion, loose clothing, and motion blur can change estimates. Body visibility describes landmark availability, not model accuracy. This model is not validated here for tennis technique assessment.</p>`;
    container.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.jump)));renderTrace();
  }
  function eventMarkup(){
    const events=report.events.filter(e=>e.type==='kneeFlex'&&e.edge==='high'||e.type==='elbow'&&e.edge==='high'||e.type==='hipX');
    if(!events.length)return '<p class="subtle">Not enough visible joints for reliable timestamps. Try a closer view.</p>';
    return events.map(e=>{const title=e.type==='kneeFlex'?'Most visible knee flex':e.type==='elbow'?'Most extended hitting elbow':e.edge==='low'?'Leftmost visible position':'Rightmost visible position';const value=e.type==='hipX'?`${Math.round(e.value*100)}% across image`:`${Math.round(e.value)}° estimated`;return `<button class="video-moment" data-jump="${e.time}"><span class="moment-time">${timeLabel(e.time)} ↗</span><span><b>${title}</b><small>${value} · review this frame</small></span></button>`;}).join('');
  }
  function focusPrompt(){return {groundstrokes:'Replay the most extended elbow moment from the side. Where is your contact point relative to your body? The model does not find ball contact; use the video to identify it, then add a note. Compare preparation and recovery across your strokes.',serve:'Replay the knee-flex and elbow-extension moments in slow motion. Watch the order of preparation, leg extension, and reach. Identify toss and contact yourself; the body model does not track the ball or automatically separate serves.',footwork:'Use the leftmost and rightmost moments to review your spacing and recovery. Watch whether you return to your intended ready position between balls. Image movement is affected by camera angle and is not distance travelled on the court.'}[runSettings.focus];}
  function renderTrace(){
    const W=620,H=135,start=runSettings.start,end=runSettings.end;let path='',active=false;
    for(const s of samples){const value=s.metrics?.core?s.metrics.kneeFlex:null;if(!Number.isFinite(value)){active=false;continue;}const x=15+(s.time-start)/(end-start)*(W-30),y=H-20-Math.min(180,value)/180*(H-35);path+=`${active?'L':'M'}${x.toFixed(2)},${y.toFixed(2)} `;active=true;}
    $('video-trace').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated knee flex over time. Gaps indicate missing landmarks."><path d="M15 15H605M15 65H605M15 115H605" stroke="#e4e8d8" fill="none" stroke-dasharray="3 4"/><path d="${path}" stroke="#8aa257" stroke-width="2.5" fill="none"/><text x="15" y="132" font-size="8" fill="#879372">${timeLabel(start)}</text><text x="605" y="132" text-anchor="end" font-size="8" fill="#879372">${timeLabel(end)}</text></svg>`;
  }
  async function jump(time){if(busy)return;video.pause();try{await seek(time);drawOverlay();video.scrollIntoView({behavior:'smooth',block:'center'});}catch(error){toast(error.message);}}
  function renderNotes(){
    $('video-note-list').innerHTML=notes.length?notes.map((n,i)=>`<div class="video-note-row"><button class="text-link" data-note-jump="${n.time}">${timeLabel(n.time)} ↗</button><p>${esc(n.text)}</p><button class="delete-note" data-delete-note="${i}" aria-label="Remove note at ${timeLabel(n.time)}">×</button></div>`).join(''):'<p class="subtle">Pause a moment, write what you see, and keep it with your report. Notes stay in this tab until exported.</p>';
    $('video-note-list').querySelectorAll('[data-note-jump]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.noteJump)));
    $('video-note-list').querySelectorAll('[data-delete-note]').forEach(b=>b.onclick=()=>{notes.splice(Number(b.dataset.deleteNote),1);reviewDirty=true;renderNotes();$('export-video-report').disabled=!report&&!notes.length;});
  }
  function exportReport(){
    if(!clip||(!report&&!notes.length))return;
    const content={version:1,kind:'courtside-video-review',clip:{name:clip.name,duration:video.duration,width:video.videoWidth,height:video.videoHeight},settings:runSettings,summary:report,notes,samples:samples.map(({time,metrics})=>({time,metrics})),method:'MediaPipe Pose Landmarker Lite, 2D image-plane angles. Body visibility is not accuracy. No ball, racket, contact, stroke classification, or calibrated court-distance detection.'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='courtside-video-review.json';document.body.append(a);a.click();a.remove();reviewDirty=false;setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Video report and notes exported. The video file is not included.');
  }
  $('video-input').onchange=e=>{loadClip(e.target.files[0]);e.target.value='';};for(const id of ['choose-video-button','replace-video-button'])$(id).onclick=()=>{if(busy){toast('Stop analysis before choosing another clip.');return;}$('video-input').click();};
  $('video-drop').addEventListener('dragover',e=>{e.preventDefault();$('video-drop').classList.add('drag-over');});$('video-drop').addEventListener('dragleave',()=>$('video-drop').classList.remove('drag-over'));
  $('video-drop').addEventListener('drop',e=>{e.preventDefault();$('video-drop').classList.remove('drag-over');loadClip(e.dataTransfer.files[0]);});
  $('playback-speed').onchange=()=>{video.playbackRate=Number($('playback-speed').value);};
  for(const [id,delta] of [['step-back',-1/60],['step-forward',1/60]])$(id).onclick=()=>jump(video.currentTime+delta);
  $('analyse-video').onclick=analyse;$('cancel-analysis').onclick=()=>{abort?.abort();stopWorker();};
  $('filming-guide-link').onclick=()=>$('filming-guide').scrollIntoView({behavior:'smooth',block:'start'});
  $('add-video-note').onclick=()=>{const text=$('video-note').value.trim();if(!text||!clip)return;notes.push({time:video.currentTime,text});reviewDirty=true;notes.sort((a,b)=>a.time-b.time);$('video-note').value='';renderNotes();$('export-video-report').disabled=false;};
  $('video-note').addEventListener('keydown',e=>{if(e.key==='Enter')$('add-video-note').click();});
  $('export-video-report').onclick=exportReport;
  for(const id of ['hitting-hand','sample-rate','stroke-focus','clip-start','clip-end'])$(id).addEventListener('change',()=>{if(report)status('Review settings changed. Run analysis again to update the report; the current report retains its original settings.');});
  window.addEventListener('beforeunload',e=>{if(reviewDirty){e.preventDefault();e.returnValue='';}});
  window.addEventListener('pagehide',()=>{abort?.abort();stopWorker();if(clipURL)URL.revokeObjectURL(clipURL);});
}
