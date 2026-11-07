"""Convert HyperFrames word timestamps to tempos.json without estimating alignment.

Usage: python ferramentas/importar_transcricao.py videos/10-topic words.json
Input: a HyperFrames word array, or {"words": [{"word": "...", "start": 0.1, "end": 0.4}], "duration": 1.0}.
The `text` spelling of `word` is also accepted. Duration is measured from voz.wav.
Script lines define phrases; bracketed voice directions are removed. Every spoken
word must match the script in order (case/punctuation only). No fuzzy correction,
word splitting, interpolation, or output overwrite is performed.
"""
import argparse
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import unicodedata
import wave

from sincronizar import sha256

METHOD = 'hyperframes words; real word timestamps; exact script match'


def number(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{label}: expected a finite number in seconds')
    return value


def token(text):
    return re.sub(r'^\W+|\W+$', '', unicodedata.normalize('NFC', text)).casefold()


def script_lines(script):
    lines = []
    for line in re.sub(r'\[[^\]\r\n]*\]', '', script).splitlines():
        words = [word for word in line.split() if token(word)]
        if words:
            lines.append(words)
    if not lines:
        raise ValueError('Empty script')
    return lines


def reject_estimates(data):
    for key in ('method', 'metodo', 'alignment', 'source', 'timing_method'):
        label = str(data.get(key, '')).casefold()
        if any(term in label for term in ('estimat', 'estimad', 'estimativ', 'interpol', 'heuristic', 'pausas')):
            raise ValueError('Estimated timestamps are not accepted')
    if data.get('estimated') or data.get('estimado'):
        raise ValueError('Estimated timestamps are not accepted')
    if data.get('status') in ('failed', 'error') or data.get('error'):
        raise ValueError('Transcription reports an alignment error')


def convert(data, script, duration):
    """Preserve timestamps verbatim, accepting only exact one-to-one alignment."""
    if isinstance(data, list):
        data = {'words': data}
    if not isinstance(data, dict) or not isinstance(data.get('words'), list) or not data['words']:
        raise ValueError('Expected a nonempty HyperFrames words list')
    reject_estimates(data)
    number(duration, 'duration')
    if duration <= 0:
        raise ValueError('Invalid audio duration')
    if 'duration' in data and abs(number(data['duration'], 'duration') - duration) > .1:
        raise ValueError('Transcript duration differs from the actual audio')
    lines = script_lines(script)
    expected = [(index, word) for index, line in enumerate(lines) for word in line]
    if len(expected) != len(data['words']):
        raise ValueError(f'Script/transcript word count mismatch: {len(expected)} != {len(data["words"])}')
    words = []
    previous_end = 0
    for index, ((phrase, expected_word), word) in enumerate(zip(expected, data['words'])):
        if not isinstance(word, dict):
            raise ValueError(f'Invalid word at {index}')
        reject_estimates(word)
        spoken = word.get('word', word.get('text'))
        if not isinstance(spoken, str) or token(spoken) != token(expected_word):
            raise ValueError(f'Script/transcript mismatch at word {index}: {expected_word!r} != {spoken!r}')
        start, end = number(word.get('start'), 'start'), number(word.get('end'), 'end')
        if not 0 <= start < end <= duration or start < previous_end:
            raise ValueError(f'Invalid, overlapping or out-of-order timestamps at word {index}')
        for field in ('probability', 'confidence'):
            if field in word and not .5 <= number(word[field], field) <= 1:
                raise ValueError(f'Unreliable alignment at word {index}: {field}')
        words.append({'frase': phrase, 'palavra': re.sub(r'^\W+|\W+$', '', expected_word),
                      'inicio': start, 'fim': end})
        previous_end = end
    phrases = []
    offset = 0
    for index, line in enumerate(lines):
        phrases.append({'n': index, 'texto': ' '.join(line), 'inicio': words[offset]['inicio'],
                        'fim': words[offset + len(line) - 1]['fim']})
        offset += len(line)
    return {'duracao': duration, 'frases': phrases, 'palavras': words, 'metodo': METHOD}


def audio_duration(path):
    try:
        with wave.open(str(path), 'rb') as audio:
            return audio.getnframes() / audio.getframerate()
    except (wave.Error, EOFError):
        result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                 '-of', 'csv=p=0', str(path)], check=True, capture_output=True, text=True)
        return float(result.stdout.strip())


def validate_timings(video):
    """Validate provenance and alignment again before a versioned project advances."""
    video = Path(video)
    data = json.loads((video / 'voz/tempos.json').read_text(encoding='utf-8-sig'))
    origin = data.get('origem', {})
    if data.get('metodo') != METHOD or origin.get('voz_sha256') != sha256(video / 'voz/voz.wav') \
            or origin.get('roteiro_sha256') != sha256(video / 'roteiro.txt'):
        raise ValueError('tempos.json requires real transcription bound to the current voice and script')
    raw = {'words': [{'word': w['palavra'], 'start': w['inicio'], 'end': w['fim']}
                     for w in data['palavras']], 'duration': data['duracao']}
    checked = convert(raw, (video / 'roteiro.txt').read_text(encoding='utf-8-sig'),
                      audio_duration(video / 'voz/voz.wav'))
    if checked['palavras'] != data['palavras'] or checked['frases'] != data['frases']:
        raise ValueError('Invalid phrase alignment in tempos.json')
    if not re.fullmatch('[a-f0-9]{64}', origin.get('transcricao_sha256', '')):
        raise ValueError('Missing transcription hash')
    return data


def import_transcript(video, transcript, output='voz/tempos.json'):
    video, transcript = Path(video).resolve(), Path(transcript).resolve()
    target = video / output
    if not target.resolve().is_relative_to(video):
        raise ValueError('Output must stay inside the video folder')
    if target.exists():
        raise FileExistsError(target)
    voice, script = video / 'voz/voz.wav', video / 'roteiro.txt'
    data = json.loads(transcript.read_text(encoding='utf-8-sig'))
    if isinstance(data, dict) and data.get('audio') and Path(data['audio']).name != voice.name:
        raise ValueError('Transcript audio name differs from voz/voz.wav')
    hashes = {'voz_sha256': sha256(voice), 'roteiro_sha256': sha256(script),
              'transcricao_sha256': sha256(transcript)}
    if isinstance(data, dict) and data.get('audio_sha256', hashes['voz_sha256']) != hashes['voz_sha256']:
        raise ValueError('Transcript audio hash mismatch')
    result = convert(data, script.read_text(encoding='utf-8-sig'), audio_duration(voice))
    result['origem'] = hashes
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('x', encoding='utf-8') as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write('\n')
    return target


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('video', type=Path)
    parser.add_argument('transcricao', type=Path)
    parser.add_argument('--saida', default='voz/tempos.json')
    args = parser.parse_args(argv)
    try:
        print(import_transcript(args.video, args.transcricao, args.saida))
        return 0
    except (OSError, ValueError, TypeError, KeyError, subprocess.CalledProcessError) as exc:
        print(f'Erro: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
    sys.exit(main())
