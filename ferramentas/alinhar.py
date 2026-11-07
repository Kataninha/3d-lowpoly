"""Alinha o roteiro (texto conhecido) com a voz usando as pausas. Sai tempos.json (frases e palavras)."""
import re, json, math, subprocess, sys
from pathlib import Path
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("video", type=Path)
parser.add_argument("--saida", default="voz/tempos.json")
parser.add_argument("--voz", default="voz/voz.wav")
parser.add_argument("--roteiro", default="roteiro.txt")
args = parser.parse_args()
video = args.video.resolve()
output = video / args.saida
if output.exists(): raise FileExistsError(output)
WAV, ROT = str(video / args.voz), str(video / args.roteiro)
out = subprocess.run(["ffmpeg","-i",WAV,"-af","silencedetect=noise=-38dB:d=0.12","-f","null","-"],capture_output=True,text=True).stderr
dur = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",WAV],capture_output=True,text=True).stdout)
ini = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
fim = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
# trechos de fala
fala, t = [], 0.0
for a, b in zip(ini, fim + [dur]*(len(ini)-len(fim))):
    if a - t > 0.05: fala.append([t, a])
    t = b
if dur - t > 0.05: fala.append([t, dur])
pausa = [fala[i+1][0]-fala[i][1] for i in range(len(fala)-1)]
linhas = [l.strip() for l in open(ROT, encoding="utf8") if l.strip()]
peso = lambda s: len(re.sub(r"[^\wÀ-ú]", "", s)) + 0.5*len(s.split())
P = [peso(l) for l in linhas]
total_fala = sum(b-a for a,b in fala)
if not linhas or not total_fala or not sum(P): raise ValueError("Roteiro vazio ou voz sem trechos detectados")
taxa = sum(P)/total_fala
N, M = len(linhas), len(fala)
if not N or not M or M < N: raise ValueError("O roteiro deve ter frases e a voz deve ter pausas suficientes; revise a gravação")
INF = 1e18
# dp[i][j]: melhor custo pondo as i primeiras frases nos j primeiros trechos
dp = [[INF]*(M+1) for _ in range(N+1)]; de = [[-1]*(M+1) for _ in range(N+1)]
dp[0][0] = 0
for i in range(1, N+1):
    for j in range(i, M+1):
        for k in range(i-1, j):
            if dp[i-1][k] >= INF: continue
            d = sum(b-a for a,b in fala[k:j])
            e = P[i-1]/taxa
            c = math.log(d/e)**2
            # fronteira entre frases deve ser pausa longa; pausa interna deve ser curta
            if j < M: c += 0.6*max(0, 0.25 - pausa[j-1]) * 10
            c += sum(0.4*max(0, pausa[x]-0.3)*5 for x in range(k, j-1))
            if dp[i-1][k] + c < dp[i][j]: dp[i][j], de[i][j] = dp[i-1][k] + c, k
seg, j = [], M
for i in range(N, 0, -1):
    k = de[i][j]; seg.append((k, j)); j = k
seg.reverse()
frases, palavras = [], []
for n, (l, (k, j)) in enumerate(zip(linhas, seg)):
    trechos = fala[k:j]
    ws = l.split(); pw = [peso(w) for w in ws]; tot = sum(pw); tf = sum(b-a for a,b in trechos)
    def tempo(frac):
        alvo = frac*tf
        for a,b in trechos:
            if alvo <= b-a + 1e-9: return a + alvo
            alvo -= b-a
        return trechos[-1][1]
    acc = 0
    for w, p in zip(ws, pw):
        palavras.append({"frase": n, "palavra": w, "inicio": round(tempo(acc/tot),3), "fim": round(tempo((acc+p)/tot),3)})
        acc += p
    frases.append({"n": n, "texto": l, "inicio": round(trechos[0][0],3), "fim": round(trechos[-1][1],3)})
output.parent.mkdir(parents=True, exist_ok=True)
with output.open("x", encoding="utf8") as dest:
    json.dump({"duracao": dur, "frases": frases, "palavras": palavras, "metodo": "estimativa por pausas e peso das palavras; conferir manualmente"}, dest, ensure_ascii=False, indent=1)
for f in frases: print(f"{f['inicio']:7.2f}-{f['fim']:7.2f}  {f['texto'][:70]}")
