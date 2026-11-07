"""Validate the selected camera contract for schema 2 projects."""
import math

FAMILIES = {'EST', 'HUM', 'TRK', 'MEC', 'DET', 'SEC', 'REL', 'REV'}


def number(value):
    return type(value) in (int, float) and math.isfinite(value)


def vector(value):
    return isinstance(value, list) and len(value) == 3 and all(number(x) for x in value)


def validate_intent(take):
    if take.get('shotType') not in FAMILIES or not str(take.get('leitura', '')).strip():
        raise ValueError('Each take needs shotType and a visual reading in leitura')
    subject = take.get('subjectId')
    if not isinstance(subject, str) or not subject.strip():
        raise ValueError('Each take needs a stable subjectId')
    ids = {subject}
    for name in ('relatedIds', 'requiredVisibleIds'):
        values = take.get(name, [])
        if not isinstance(values, list) or not all(isinstance(x, str) and x.strip() for x in values):
            raise ValueError(f'{name} must contain stable target IDs')
        ids.update(values)
    if take['shotType'] == 'REL' and len(ids) < 2:
        raise ValueError('REL must identify at least two objects')


def validate_selected_camera(data, takes):
    keys = data.get('keyframes')
    if data.get('fontes') != ['camera.json'] or not isinstance(keys, list) or len(keys) != len(takes):
        raise ValueError('camera.json must contain one selected camera per take')
    for i, (key, take) in enumerate(zip(keys, takes)):
        start = 0 if i == 0 else take['t0']
        if key.get('alvo') != take['subjectId'] or key.get('candidato') not in ('A', 'B', 'C'):
            raise ValueError(f'Take {i + 1}: selected candidate must match the subject')
        end = takes[i + 1]['t0'] if i + 1 < len(takes) else take['t1']
        if key.get('tempo') != start or not number(key.get('duracao')) or end <= start \
                or abs(key['duracao'] - (end - start)) > 1e-6:
            raise ValueError(f'Take {i + 1}: camera and narration timing differ')
        samples = key.get('samples')
        count = 5 if take['shotType'] in ('TRK', 'REV') else 3
        if not isinstance(samples, list) or len(samples) < count:
            raise ValueError(f'Take {i + 1}: requires {count} camera samples')
        previous = -1
        for sample in samples:
            time, fov = sample.get('t'), sample.get('fov')
            if not number(time) or not max(previous, take['t0'] - 1e-6) <= time < take['t1'] \
                    or time <= previous or not number(fov) or not 0 < fov < 180 \
                    or not vector(sample.get('position')) or not vector(sample.get('target')) \
                    or sample['position'] == sample['target']:
                raise ValueError(f'Take {i + 1}: invalid sampled camera pose')
            previous = time
