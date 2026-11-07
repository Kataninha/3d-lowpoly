"""Generate deterministic procedural SFX and an event list from JSON, without external libraries."""
import argparse, array, json, math, random, wave
from pathlib import Path
SR=44100
TEMPLATE_SOUND = Path(__file__).resolve().parent.parent / 'modelo-video' / 'som'
tri=lambda f,u: 2*abs(2*((f*u)%1)-1)-1

def _passa_baixa(a):
    y=[0.0]
    return lambda x: y.__setitem__(0,y[0]+a*(x-y[0])) or y[0]

def _novos(nome,rng):
    """Percussive/ambient SFX of video 08; each returns f(u, dur) with its own envelope."""
    ruido=lambda: rng.uniform(-1,1)
    lp=_passa_baixa(0.08)
    if nome=='rangido': return lambda u,d: (tri(120+35*math.sin(2*math.pi*6*u),u)*0.5+lp(ruido())*0.8)*math.sin(math.pi*u/d)
    if nome=='retroceder': return lambda u,d: (math.sin(2*math.pi*(300*u+1400*u*u/d))*0.5+ruido()*0.35)*math.sin(math.pi*u/d)**2
    if nome=='hidraulico': return lambda u,d: (lp(ruido())*(0.6+0.4*math.sin(2*math.pi*7*u))+math.sin(2*math.pi*85*u)*0.4)*math.sin(math.pi*u/d)
    if nome=='marreta': return lambda u,d: (math.sin(2*math.pi*230*u)*0.6+math.sin(2*math.pi*610*u)*0.35+ruido()*0.5*math.exp(-60*u))*math.exp(-16*u)
    if nome=='clique': return lambda u,d: math.sin(2*math.pi*1800*u)*math.exp(-70*u)
    if nome=='deslize': return lambda u,d: lp(ruido())*3*math.sin(math.pi*u/d)**2*(0.7+0.3*math.sin(2*math.pi*9*u))
    if nome=='gancho': return lambda u,d: (math.sin(2*math.pi*1400*u)*0.6+math.sin(2*math.pi*2100*u)*0.4)*math.exp(-22*u)
    if nome=='estalo': return lambda u,d: (ruido()*math.exp(-90*u)+math.sin(2*math.pi*900*u)*0.6*math.exp(-40*u))
    if nome=='rajada': return lambda u,d: lp(ruido())*3.5*math.sin(math.pi*u/d)**2*(0.6+0.4*math.sin(2*math.pi*1.4*u))
    if nome=='motor': return lambda u,d: (tri(52,u)*0.5+tri(104,u)*0.25)*(0.7+0.3*math.sin(2*math.pi*13*u))*math.sin(math.pi*u/d)**0.5
    if nome=='porta': return lambda u,d: (lp(ruido())*2*math.exp(-5*u)+math.sin(2*math.pi*110*u)*math.exp(-14*u))*0.8
    if nome=='ding': return lambda u,d: (math.sin(2*math.pi*1318*u)+0.4*math.sin(2*math.pi*1976*u))*math.exp(-4.5*u)*0.6
    if nome=='vidro':
        # Estilhaço: estalo inicial e dezenas de cacos agudos caindo em instantes aleatórios.
        cacos=[(rng.uniform(0,0.85),rng.uniform(2600,6200),rng.uniform(0.3,1)) for _ in range(48)]
        return lambda u,d: (ruido()*math.exp(-55*u)*0.9+sum(a*math.sin(2*math.pi*f*(u-t0))*math.exp(-38*(u-t0)) for t0,f,a in cacos if t0<=u<t0+0.12)*0.35)*min(1,(d-u)/0.15)
    if nome=='despertador': return lambda u,d: math.sin(2*math.pi*2093*u)*(1 if (u*8)%1<0.5 else 0)*(1 if (u%0.5)<0.3 else 0)*0.7
    if nome=='fanfarra':
        notas=(523.25,659.25,783.99,1046.5)
        return lambda u,d: (lambda f: (math.sin(2*math.pi*f*u)*0.6+tri(f,u)*0.25)*math.exp(-3*(u%0.16)))(notas[min(3,int(u/0.16))])*math.sin(math.pi*min(1,(d-u)/0.3)/2)
    return None
NOVOS=('rangido','retroceder','hidraulico','marreta','clique','deslize','gancho','estalo','rajada','motor','porta','ding','fanfarra','vidro','despertador')

def generate(video, events_path, timing_path="voz/tempos.json", output_dir="som"):
    video=Path(video).resolve(); events_path=Path(events_path)
    spec=json.loads(events_path.read_text(encoding='utf-8-sig')); events=spec['eventos']
    timings=json.loads((video/timing_path).read_text(encoding='utf-8-sig')) if (video/timing_path).exists() else None
    out=video/output_dir; out.mkdir(exist_ok=True)
    targets=[out/'sfx.wav',out/'disparos.json']
    for target in targets:
        if target.exists() or target.is_symlink():
            original = TEMPLATE_SOUND / target.name
            if (target.is_symlink() or not target.is_file() or not original.is_file()
                    or target.resolve() == original.resolve()
                    or target.read_bytes() != original.read_bytes()):
                raise FileExistsError('SFX output already exists')
    triggers=[]
    for event in events:
        if 'tempo' in event: start=float(event['tempo'])
        else:
            matches=[w for w in timings['palavras'] if w['frase']==event['frase'] and w['palavra'].casefold()==event['palavra'].casefold()]
            if len(matches)!=1: raise ValueError('Palavra ausente ou ambígua: '+str(event))
            start=float(matches[0]['inicio'])
        name=event['som']; duration=float(event.get('duracao',0.30 if name=='whoosh' else 0.12)); gain=float(event.get('ganho',0.45))
        if start<0 or duration<=0 or name not in ('pop','tic','whoosh','batida')+NOVOS: raise ValueError(str(event))
        triggers.append({'tempo':start,'som':name,'duracao':duration,'ganho':gain})
    duration=max(float(spec.get('duracao',0)),max((e['tempo']+e['duracao'] for e in triggers),default=0))
    if duration<=0: raise ValueError('Sem duração ou eventos')
    buf=[0.0]*math.ceil(duration*SR)
    for index,e in enumerate(triggers):
        rng=random.Random(index); n=int(e['duracao']*SR); first=round(e['tempo']*SR); novo=_novos(e['som'],rng)
        for i in range(n):
            u=i/SR; envelope=math.sin(math.pi*i/max(n-1,1))**2
            if novo: value=novo(u,e['duracao'])*min(1,(n-i)/(0.005*SR))
            elif e['som']=='whoosh': value=rng.uniform(-1,1)*envelope
            elif e['som']=='batida': value=math.sin(2*math.pi*(110*u-70*u*u))*math.exp(-12*u)
            else: value=math.sin(2*math.pi*(1200 if e['som']=='tic' else 500)*u)*envelope
            if first+i<len(buf): buf[first+i]+=value*e['ganho']
    pcm=array.array('h',(round(max(-1,min(1,x))*32767) for x in buf))
    if __import__('sys').byteorder!='little': pcm.byteswap()
    with wave.open(str(targets[0]),'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    with targets[1].open('w' if targets[1].exists() else 'x',encoding='utf-8') as f: json.dump({'duracao':duration,'eventos':triggers},f,ensure_ascii=False,indent=2)
    print(f'{len(triggers)} SFX: {targets[0]}')

def main():
    p=argparse.ArgumentParser(); p.add_argument('video',type=Path); p.add_argument('eventos',type=Path); p.add_argument('--tempos',default='voz/tempos.json'); p.add_argument('--saida',default='som'); a=p.parse_args(); generate(a.video,a.eventos,a.tempos,a.saida)
if __name__=='__main__': main()
