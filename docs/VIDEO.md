# Film it. Review it. Take it to practice.

## Your first video

1. Use your phone's rear camera, held horizontally at 1×. Choose 1080p / 60 fps if available; 30 fps also works.
2. Put the phone on a steady tripod around hip or chest height, about 3–4 metres away. Keep it clear of play.
3. Film from your hitting side, side-on or slightly behind. Keep feet, head, racket, and the whole swing in frame. For serves, leave space above the racket.
4. Record 10–20 seconds of one player: five comfortable forehands, five backhands, or a few serves. Use good light. Keep the camera fixed, without zooming or edits.
5. Keep the original video at normal speed. Choose it in **Video studio**, select your hitting hand and the section to analyse, then press **Analyse my movement**.

A small, distant player in a full-court broadcast view is a difficult input. Start with a closer technique clip. One clip and one question makes a better first review.

## What happens automatically

The browser decodes and samples frames at 4 or 8 frames per second. MediaPipe Pose Landmarker Lite runs in a Web Worker using locally hosted JavaScript, WebAssembly, and model assets. Your video is read from a browser object URL; the application does not upload its contents.

The body model estimates 33 landmarks. COURTSIDE uses in-frame landmarks with visibility and presence of at least 0.6. It draws an estimated skeleton and calculates:

- **Knee flex:** 180 degrees minus the hip–knee–ankle angle, averaged across whichever knees are visible in a frame.
- **Hitting elbow angle:** shoulder–elbow–wrist angle for your chosen anatomical side.
- **Horizontal image span:** 90th minus 10th percentile of the hip centre's image x-coordinate, as a percentage of the image width.
- **Body visibility:** the proportion of sampled frames with both shoulders and hips visible. It is a landmark-availability measure, not a confidence or accuracy score.

Angles use the image plane with aspect-ratio correction. Summary ranges are the middle 80% of observations. Timestamped moments identify individual extrema; review them visually because a single extreme may reflect noise. Samples missing shoulders/hips are excluded from summary measurements. Each reported angle range or moment needs at least five relevant samples. No-person clips report insufficient detection instead of fabricated measurements.

Analysis windows are limited to 60 seconds and files to 250 MB. A 60-second window at 8 fps has at most 480 samples. Reducing playback speed does not change analysis timestamps; imported slow-motion video timestamps refer to the encoded clip, not real movement time. Frame-step buttons seek by 1/60 second and may repeat decoded frames in a lower-frame-rate clip.

## What needs your review

This is an experimental movement review tool, not a validated tennis biomechanics or technique assessment. It does not identify stroke types, ball contact, racket position, ball speed, spin, shot quality, court distance, or match results. Choosing Forehand / backhand, Serve, or Footwork selects a review prompt; it does not classify the stroke.

Camera angle, perspective, occlusion, clothing, lighting, and blur affect estimates. A projected angle is not a calibrated anatomical angle. A horizontal image span is not distance travelled or footwork quality. There is no automatic good/bad technique score.

Use slow playback, the skeleton, and evidence timestamps to inspect preparation, spacing, and recovery. Add your own note at the playhead. Contact and tactical decisions need your visual judgment or a coach's review.

## Saving and privacy

Clips, sampled landmarks, reports, and video notes are held in this tab's memory, separately from the match notebook. They are not saved to localStorage or sent to an AI service. Export the JSON report before leaving; it contains metadata, measured samples, settings, and notes, but not the video or raw landmark arrays. The app asks before replacing an unexported review and warns before leaving where the browser supports it. Keep the original video with your export. Video-report re-import is not implemented; match JSON imports are a different format.

Model assets are bundled under `dist/vendor/mediapipe`; first use loads roughly 17 MB from the same app origin. No API key or paid inference service is needed. Google Fonts remains an optional external request for the interface. Desktop browsers are preferable for longer clips. If a browser cannot decode MOV/HEVC, export MP4 with H.264 or use WebM. Unsupported or corrupt clips show a decoding error. This is a static web app and does not provide transcoding.

## Verification

Unit tests cover aspect-correct angles, hidden and degenerate joints, handedness, missing detections, quantiles, sampling limits, and timestamp formatting. Browser QA uses a short video generated from the official MediaPipe reference pose image and a no-person video. Positive QA verifies the real model and report pipeline; negative QA verifies that no measurements are invented. These controlled checks do not establish accuracy on tennis footage. No user tennis clip was supplied during development.

References: [MediaPipe web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js), [Pose Landmarker model overview](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker), [BlazePose model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf).
