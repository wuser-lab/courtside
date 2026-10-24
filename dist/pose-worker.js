/* MediaPipe runs off the UI thread. No video data is sent to a server. */
self.exports={};
let model=null;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      importScripts('./vendor/mediapipe/vision.js');
      const {FilesetResolver,PoseLandmarker}=self.exports;
      const files=await FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm',self.location.href).href);
      model=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/mediapipe/pose_landmarker_lite.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5,outputSegmentationMasks:false});
      self.postMessage({id:data.id,ready:true});
    }else if(data.type==='frame'){
      if(!model)throw Error('Pose model is not ready.');
      try{const result=model.detectForVideo(data.bitmap,data.timestamp);self.postMessage({id:data.id,landmarks:result.landmarks[0]??null});}finally{data.bitmap.close();}
    }
  }catch(error){self.postMessage({id:data.id,error:error?.message||String(error)});}
};
