import * as THREE from '../vendor/three.module.js';

// Azimuth, elevation and vertical FOV. Each family offers three directions.
const FAMILIES = {
  EST: [22, 20, 42], HUM: [10, 10, 35], TRK: [24, 15, 40], MEC: [5, 10, 38],
  DET: [18, 17, 32], SEC: [0, 0, 35], REL: [12, 16, 38], REV: [28, 24, 44],
};

export function sceneRegistry(objects) {
  const entries = new Map(Object.entries(objects));
  function get(id) {
    const object = entries.get(id);
    if (!object?.isObject3D) throw new Error('Unknown scene target: ' + id);
    return object;
  }
  function bounds(id) {
    const object = get(id);
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) throw new Error('Empty target bounds: ' + id);
    return box;
  }
  function snapshot() {
    return Object.fromEntries([...entries.keys()].map(id => {
      const box = bounds(id);
      return [id, {name: get(id).name || id, min: box.min.toArray(), max: box.max.toArray()}];
    }));
  }
  return {get, bounds, snapshot};
}

function corners({min, max}) {
  return [min.x, max.x].flatMap(x => [min.y, max.y].flatMap(y =>
    [min.z, max.z].map(z => new THREE.Vector3(x, y, z))));
}

function ratio(box, camera, margin, captionBottom) {
  const points = corners(box).map(p => p.project(camera));
  if (points.some(p => p.z < -1 || p.z > 1)) return 0;
  const limits = axis => [Math.min(...points.map(p => p[axis])), Math.max(...points.map(p => p[axis]))];
  const [left, right] = limits('x');
  const [bottom, top] = limits('y');
  const overlap = (a, b, lo, hi) => Math.max(0, Math.min(b, hi) - Math.max(a, lo)) / Math.max(b - a, 1e-8);
  return overlap(left, right, -1 + 2 * margin, 1 - 2 * margin)
    * overlap(bottom, top, -1 + 2 * captionBottom, 1 - 2 * margin);
}

function isDescendant(object, ancestor) {
  for (let node = object; node; node = node.parent) if (node === ancestor) return true;
  return false;
}

function obscured(camera, point, object, occluders) {
  const origin = camera.position;
  const direction = point.clone().sub(origin);
  const length = direction.length();
  const ray = new THREE.Raycaster(origin, direction.normalize(), 0, Math.max(0, length - .001));
  return ray.intersectObjects(occluders, true).some(({object: hit}) => {
    if (isDescendant(hit, object)) return false;
    for (let node = hit; node; node = node.parent) if (!node.visible) return false;
    return !hit.material?.transparent;
  });
}

export function applyPose(camera, {position, target, fov}) {
  camera.position.fromArray(position);
  camera.lookAt(...target);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// updateAt must reset scene state for absolute time and must not move the camera.
export function planCandidates(take, registry, updateAt, {
  aspect = 9 / 16, margin = .06, captionBottom = .22, minVisible = .9, occluders = [],
} = {}) {
  const family = FAMILIES[take.shotType];
  if (!family || !take.subjectId || !Number.isFinite(take.start) || !Number.isFinite(take.end) || take.end <= take.start)
    throw new Error('Invalid camera take');
  const ids = [...new Set([take.subjectId, ...(take.relatedIds || []), ...(take.requiredVisibleIds || [])])];
  if (take.shotType === 'REL' && ids.length < 2) throw new Error('REL needs at least two targets');
  const moving = take.shotType === 'TRK' || take.shotType === 'REV';
  const samples = (moving ? [0, .25, .5, .75, 1] : [0, .5, 1])
    .map(u => Math.min(take.end - 1e-6, take.start + u * (take.end - take.start)));
  const envelope = new THREE.Box3();
  for (const t of samples) {
    updateAt(t);
    for (const id of ids) envelope.union(registry.bounds(id));
  }
  const center = envelope.getCenter(new THREE.Vector3());
  const radius = envelope.getSize(new THREE.Vector3()).length() / 2;
  const [azimuth, elevation, fov] = family;
  const camera = new THREE.PerspectiveCamera(fov, aspect, .05, 1000);
  const extent = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  return [0, -22, 22].map((offset, i) => {
    const a = THREE.MathUtils.degToRad(azimuth + offset);
    const e = THREE.MathUtils.degToRad(elevation + (i === 1 ? 6 : 0));
    const direction = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
    function pose(anchor, distance) {
      const aim = anchor.clone().addScaledVector(new THREE.Vector3(0, 1, 0), -(captionBottom - margin) * extent * distance);
      return {position: aim.clone().addScaledVector(direction, distance).toArray(), target: aim.toArray(), fov};
    }
    let distance = Math.max(.2, radius / extent);
    let diagnostics;
    for (let attempt = 0; attempt < 14; attempt++, distance *= 1.15) {
      diagnostics = samples.map((t, sample) => {
        updateAt(t);
        const anchor = take.shotType === 'TRK' ? registry.bounds(take.subjectId).getCenter(new THREE.Vector3()) : center;
        const pullback = take.shotType === 'REV' ? 1 + .14 * sample / (samples.length - 1) : 1;
        const frame = pose(anchor, distance * pullback);
        applyPose(camera, frame);
        const targets = ids.map(id => {
          const box = registry.bounds(id);
          return {id, visibleRatio: ratio(box, camera, margin, captionBottom),
            centerOccluded: obscured(camera, box.getCenter(new THREE.Vector3()), registry.get(id), occluders)};
        });
        return {t, ...frame, targets};
      });
      if (diagnostics.every(sample => sample.targets.every(target => target.visibleRatio >= minVisible))) break;
    }
    return {id: 'ABC'[i], samples: diagnostics,
      passesFraming: diagnostics.every(sample => sample.targets.every(target => target.visibleRatio >= minVisible)),
      needsOcclusionReview: diagnostics.some(sample => sample.targets.some(target => target.centerOccluded))};
  });
}

export function samplePose(samples, time) {
  const index = samples.findIndex(sample => sample.t > time);
  if (index === -1) return samples.at(-1);
  if (index === 0) return samples[0];
  const [a, b] = [samples[index - 1], samples[index]];
  const f = (time - a.t) / (b.t - a.t);
  return {position: a.position.map((x, i) => THREE.MathUtils.lerp(x, b.position[i], f)),
    target: a.target.map((x, i) => THREE.MathUtils.lerp(x, b.target[i], f)), fov: THREE.MathUtils.lerp(a.fov, b.fov, f)};
}

// The editor supplies a choice after reviewing the actual frames.
export function selectedCamera(takes, groups, selection) {
  if (takes.length !== groups.length || takes.length !== selection.length) throw new Error('Incomplete camera selection');
  const keyframes = takes.map((take, index) => {
    const choice = groups[index].find(candidate => candidate.id === selection[index]);
    if (!choice?.passesFraming) throw new Error('Choose a fitting candidate for take ' + (index + 1));
    const first = choice.samples[0];
    return {
      tempo: index === 0 ? 0 : take.start,
      duracao: (takes[index + 1]?.start ?? take.end) - (index === 0 ? 0 : take.start),
      alvo: take.subjectId,
      posicao: first.position,
      fov: first.fov,
      corte: take.transicao !== 'blend',
      candidato: choice.id,
      samples: choice.samples.map(({t, position, target, fov}) => ({t, position, target, fov})),
    };
  });
  return {fontes:['camera.json'], interpolarFov:true, keyframes};
}
