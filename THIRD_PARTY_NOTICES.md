# Third-party software and models

The COURTSIDE application code is MIT licensed. Vendored runtime and model assets retain their own licenses.

## MediaPipe Tasks Vision 0.10.32

- Publisher: Google / Google AI Edge.
- Original package: `@mediapipe/tasks-vision@0.10.32` from the npm registry.
- Source: https://github.com/google-ai-edge/mediapipe
- License: Apache License 2.0, included in `dist/vendor/mediapipe/LICENSE`.
- Files: `vision.js` (the original `vision_bundle.cjs`, renamed without code changes), and `wasm/vision_wasm*_internal.js` / `.wasm`.

## Pose Landmarker Lite

- Publisher: Google / Google AI Edge.
- Bundle: `pose_landmarker_lite/float16/1/pose_landmarker_lite.task`.
- Original: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
- Model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf
- License: Apache License 2.0, as identified in the model card.

The sample pose photograph used for local QA is not included in the application or source archive. Application court illustrations are original SVGs. The optional DM Sans and Manrope webfonts are served by Google Fonts under their respective open font licenses.
