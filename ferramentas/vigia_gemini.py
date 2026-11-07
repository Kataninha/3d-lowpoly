import argparse
from datetime import datetime
import json
from pathlib import Path
import re
import sys


PREFIX = re.compile(r'^E(\d{4}) (\d{2}:\d{2}:\d{2}\.\d+)')
MARKER = 'UNAUTHENTICATED (code 401)'


def latest_event(log_dir):
    latest = None
    for path in sorted(log_dir.glob('cli-*.log')):
        with path.open(encoding='utf-8', errors='replace') as log:
            for line in log:
                if MARKER not in line:
                    continue
                match = PREFIX.match(line)
                if not match:
                    continue
                try:
                    when = datetime.strptime(f'{datetime.now().year}{match[1]} {match[2]}', '%Y%m%d %H:%M:%S.%f')
                except ValueError:
                    continue
                event = {'timestamp': when.isoformat(), 'file': path.name, 'text': line.rstrip('\r\n')}
                if latest is None or event['timestamp'] > latest['timestamp']:
                    latest = event
    return latest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--log-dir', type=Path, default=Path.home() / '.gemini' / 'antigravity-cli' / 'log')
    parser.add_argument('--state-file', type=Path, default=Path(__file__).with_name('.vigia_gemini.json'))
    args = parser.parse_args()
    event = latest_event(args.log_dir)
    if not args.state_file.exists():
        args.state_file.write_text(json.dumps({'event': event}, ensure_ascii=False), encoding='utf-8')
        return 1
    previous = json.loads(args.state_file.read_text(encoding='utf-8'))['event']
    if event is None or (previous is not None and event['timestamp'] <= previous['timestamp']):
        return 1
    args.state_file.write_text(json.dumps({'event': event}, ensure_ascii=False), encoding='utf-8')
    when = datetime.fromisoformat(event['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
    print(f"Gemini caiu com 401 em {when} ({event['file']}). Reenviar o último pedido do ponto salvo (BUGS B14).")
    return 0


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main())
