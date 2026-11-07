# Camera planning

Use `sceneRegistry({stableId: object3D})`, then `planCandidates(take, registry, updateAt)`. A take contains `start`, `end`, `shotType`, `subjectId`, and optional `relatedIds` and `requiredVisibleIds`. Fill these from the score, using `t0` and `t1` for the times. Supply an absolute-time scene update and a list of possible occluders when available.

The candidates fit sampled object bounds against a caption-safe frame. Center-ray diagnostics indicate possible occlusion. Review actual frames, select A, B or C for each take and save `selectedCamera(takes, candidates, selection)` as camera.json. Pass that data to the mounting template. To try a specific pose directly, use `applyPose(camera, samplePose(candidate.samples, time))`. See the technical pilot.

The planner proposes framing. Section geometry, motion, scene lighting, continuity and label placement require authored direction and visual review.
