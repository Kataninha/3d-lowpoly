"""Mede a dinâmica do vídeo e o áudio com FFmpeg; as estimativas não são verdade absoluta de câmera ou SFX."""
import argparse, json, math, re, subprocess, tempfile
from pathlib import Path

def run(args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace')

def probe(path):
    return json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]).stdout)

def count_onsets(path):
    """Conta subidas de energia em resolução de 20 ms; o áudio misturado inclui fala e música."""
    import array, sys
    proc=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-vn','-ac','1','-ar','8000','-f','s16le','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
    samples=array.array('h'); samples.frombytes(proc.stdout)
    if sys.byteorder != 'little': samples.byteswap()
    block=160; rms=[]
    for i in range(0,len(samples)-block+1,block):
        chunk=samples[i:i+block]; rms.append(math.sqrt(sum(v*v for v in chunk)/block)/32768)
    onsets=[]; last=-100
    for i in range(5,len(rms)):
        baseline=sum(rms[i-5:i])/5
        if rms[i]>0.012 and rms[i]>max(0.012,baseline*2.4) and i-last>=10:
            onsets.append(round(i*.02,2)); last=i
    return onsets

def measure(path, sfx_path=None):
    info=probe(path); duration=float(info['format']['duration'])
    audio=any(s['codec_type']=='audio' for s in info['streams'])
    vf="fps=5,scale=160:-2,format=gray,select='gt(scene,0.3)',showinfo"
    scenes=run(['ffmpeg','-hide_banner','-i',str(path),'-vf',vf,'-an','-f','null','-']).stderr
    times=[float(v) for v in re.findall(r'pts_time:\s*([\d.]+)',scenes)]
    # Difference between successive downsampled frames, estimated from scene score.
    motion=run(['ffmpeg','-hide_banner','-i',str(path),'-vf',"fps=5,scale=160:-2,format=gray,select='gte(scene,0)',metadata=print:key=lavfi.scene_score",'-an','-f','null','-']).stderr
    scores=[float(x) for x in re.findall(r'lavfi.scene_score=([\d.]+)',motion)]
    stationary=100*sum(x<0.015 for x in scores)/len(scores) if scores else None
    result={'duracao_s':duration,'mudancas_fortes_s':times,'intervalo_medio_s':(times[-1]-times[0])/(len(times)-1) if len(times)>1 else None,'quase_parado_percentual':stationary,'limiar_quase_parado':0.015,'amostragem_fps':5,'lufs_integrado':None,'pico_dbtp':None,'sfx':{'contagem':None,'metodo':'indisponível: a mixagem não identifica SFX separadamente'}}
    if audio:
        log=run(['ffmpeg','-hide_banner','-nostats','-i',str(path),'-filter_complex','ebur128=peak=true','-f','null','-']).stderr
        match=list(re.finditer(r'I:\s*(-?[\d.]+) LUFS',log)); peak=list(re.finditer(r'Peak:\s*(-?[\d.]+) dBFS',log))
        if match: result['lufs_integrado']=float(match[-1].group(1))
        if peak: result['pico_dbtp']=float(peak[-1].group(1))
    if audio or sfx_path:
        onsets=count_onsets(sfx_path or path)
        result['sfx']={'contagem':len(onsets),'onsets_s':onsets,'valida_p3':bool(sfx_path),'metodo':('estimativa em faixa separada sem voz' if sfx_path else 'CONTAGEM INVALIDA PARA P3: audio mixado inclui voz e musica; informe --sfx')} 
    return result

def resumo_direcao(takes):
    """Resume as escolhas de direção da partitura para o produtor; nada aqui é meta."""
    tempo={}; camera={}; total=0
    for take in takes:
        d=take['t1']-take['t0']; total+=d
        tempo[take.get('ze_tam','sem decisão')]=tempo.get(take.get('ze_tam','sem decisão'),0)+d
        camera[take.get('tipo_camera','sem decisão')]=camera.get(take.get('tipo_camera','sem decisão'),0)+1
    return {'takes':len(takes),'segundos_por_take':total/len(takes),'ze_percentual':{k:100*v/total for k,v in tempo.items()},'tipo_camera':camera}

def write_report(output,source,ref,data):
    (output/'resumo.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    fmt=lambda v,unit='': ('n\u00e3o dispon\u00edvel' if v is None else f'{v:.2f}{unit}')
    disparos = data.get('sfx_disparos')
    sfx_line = (f"- SFX registrados em `{disparos['arquivo']}`: {disparos['contagem']}; "
                f"{disparos['por_minuto']:.2f} SFX/min (limite {disparos['limite']:.2f})"
                f"{' — ACIMA DO LIMITE' if disparos['por_minuto'] > disparos['limite'] else ''}.\n") if disparos else ''
    direcao = data.get('direcao')
    direcao_line = (f"- Direção (só informativo, comparar com `direcao.md`): {direcao['takes']} takes, {direcao['segundos_por_take']:.1f} s por take; "
                    f"Zé: {', '.join(f'{k} {v:.0f}%' for k, v in direcao['ze_percentual'].items())}; "
                    f"câmera: {', '.join(f'{k} {v}' for k, v in direcao['tipo_camera'].items())}.\n") if direcao else ''
    report = (f"# Confer\u00eancia autom\u00e1tica\n\n- V\u00eddeo: `{source}`\n"
              f"- Refer\u00eancia: `{ref or 'não fornecida'}`\n"
              f"- Dura\u00e7\u00e3o: {fmt(data['duracao_s'],' s')}\n"
              f"- LUFS integrado: {fmt(data['lufs_integrado'],' LUFS')} (alvo -14 LUFS).\n"
              f"- Pico verdadeiro: {fmt(data['pico_dbtp'],' dBTP')} (refer\u00eancia \u2264 -1 dBTP).\n"
              f"- Mudan\u00e7as fortes detectadas: {len(data['mudancas_fortes_s'])}; intervalo m\u00e9dio: {fmt(data['intervalo_medio_s'],' s')}.\n"
              f"- Tempo quase parado: {fmt(data['quase_parado_percentual'],'%')}.\n"
              f"- SFX: {data['sfx']['contagem']} onsets; {data['sfx']['metodo']}.\n{sfx_line}{direcao_line}\n"
              "O percentual parado e as mudan\u00e7as por segundo s\u00e3o s\u00f3 informativos (receita v2.0). "
              "O movimento \u00e9 estimado pela diferen\u00e7a entre imagens a 5 fps e limiar 0,015; objetos, texto e part\u00edculas tamb\u00e9m alteram a medida. "
              "Mudan\u00e7as fortes usam o filtro scene > 0,3 e n\u00e3o equivalem necessariamente a cortes. Os n\u00fameros n\u00e3o substituem inspe\u00e7\u00e3o visual.\n")
    (output/'resumo.md').write_text(report,encoding='utf-8')

def sheet(video, ref, output, duration):
    # Usa uma imagem a cada cinco segundos e emparelha cada uma com a referência correspondente.
    frames=output/'quadros'; frames.mkdir()
    run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(video),'-vf','fps=1/5,scale=180:320:force_original_aspect_ratio=decrease,pad=180:320:(ow-iw)/2:(oh-ih)/2','-n',str(frames/'video_%04d.png')])
    videos=sorted(frames.glob('video_*.png'))
    if ref and ref.is_dir(): refs=sorted(p for p in ref.glob('*.png') if p.name != 'contato.png')
    elif ref:
        run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(ref),'-vf','fps=1/5,scale=180:320:force_original_aspect_ratio=decrease,pad=180:320:(ow-iw)/2:(oh-ih)/2','-n',str(frames/'ref_%04d.png')])
        refs=sorted(frames.glob('ref_*.png'))
    else: refs=[]
    for i,v in enumerate(videos):
        if not refs: break
        r=refs[min(i,len(refs)-1)]
        run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(v),'-i',str(r),'-filter_complex','[1:v]scale=180:320:force_original_aspect_ratio=decrease,pad=180:320:(ow-iw)/2:(oh-ih)/2[r];[0:v][r]hstack','-frames:v','1','-n',str(frames/f'par_{i+1:04}.png')])
    pairs=sorted(frames.glob('par_*.png'))
    if pairs:
        # Pages keep output usable for long films.
        for start in range(0,len(pairs),12):
            selected=pairs[start:start+12]
            args=['ffmpeg','-hide_banner','-loglevel','error']
            for p in selected: args += ['-i',str(p)]
            grid='|'.join(f'{(i%3)*360}_{(i//3)*320}' for i in range(len(selected)))
            args += ['-filter_complex', ''.join(f'[{i}:v]' for i in range(len(selected)))+f'xstack=inputs={len(selected)}:layout={grid}:fill=black','-frames:v','1','-n',str(output/f'folha_{start//12+1:02}.png')]
            if len(selected)>1: run(args)
            else:
                import shutil; shutil.copyfile(selected[0],output/f'folha_{start//12+1:02}.png')

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('video',type=Path); parser.add_argument('--ref',type=Path); parser.add_argument('--saida',type=Path); parser.add_argument('--sfx',type=Path,help='faixa separada sem voz'); parser.add_argument('--modo',type=str.upper,choices=['P3'],help='exige faixa separada --sfx'); parser.add_argument('--limite-sfx-min',type=float,help='limite SFX/min a partir de disparos.json'); parser.add_argument('--disparos',type=Path,help='caminho de disparos.json'); args=parser.parse_args()
    if args.modo == 'P3' and not args.sfx: parser.error('CONTAGEM INVALIDA PARA P3: --sfx com faixa separada sem voz e obrigatorio')
    if not args.sfx: print('AVISO: contagem de SFX invalida para P3 sem --sfx separado.', file=__import__('sys').stderr)
    if args.sfx and not args.sfx.is_file(): parser.error('faixa --sfx inexistente')
    if not args.video.is_file(): parser.error('vídeo inexistente')
    if args.ref and not args.ref.exists(): parser.error('referência inexistente')
    events = None
    if args.limite_sfx_min is not None:
        if not math.isfinite(args.limite_sfx_min) or args.limite_sfx_min < 0: parser.error('limite SFX/min deve ser finito e nao negativo')
        candidates = ([args.disparos] if args.disparos else
                      ([args.sfx.parent/'disparos.json'] if args.sfx else []) +
                      [args.video.parent/'som'/'disparos.json', args.video.parent.parent/'som'/'disparos.json'])
        path = next((p for p in candidates if p.is_file()), None)
        if path is None: parser.error('disparos.json nao encontrado; informe --disparos')
        try:
            events = json.loads(path.read_text(encoding='utf-8-sig'))['eventos']
            if not isinstance(events, list): raise ValueError('eventos deve ser uma lista')
        except (OSError, ValueError, KeyError) as exc:
            parser.error(f'disparos.json invalido: {exc}')
    args.saida = args.saida or Path('conferencia-' + args.video.stem)
    args.saida.mkdir(parents=True,exist_ok=False)
    data=measure(args.video,args.sfx)
    score=next((p/'partitura.json' for p in (args.video.parent,args.video.parent.parent) if (p/'partitura.json').is_file()),None)
    if score:
        score_data=json.loads(score.read_text(encoding='utf-8-sig'))
        data['direcao']=resumo_direcao(score_data if isinstance(score_data,list) else score_data['takes'])
    if events is not None:
        if not math.isfinite(data['duracao_s']) or data['duracao_s'] <= 0: parser.error('duracao do video invalida')
        data['sfx_disparos'] = {'arquivo':str(path),'contagem':len(events),'por_minuto':len(events)*60/data['duracao_s'],'limite':args.limite_sfx_min}
    write_report(args.saida,args.video,args.ref,data); sheet(args.video,args.ref,args.saida,data['duracao_s'])
    print(args.saida/'resumo.md')
if __name__=='__main__': main()
