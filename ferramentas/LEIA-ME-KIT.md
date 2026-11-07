# Pontos de entrada das ferramentas

Veja o [workflow de produção](../WORKFLOW_MESTRE.md) para a ordem dos comandos, as aprovações e as evidências.

- `novo_video.py` cria um projeto e um kit de ativos copiado, com hash.
- `pipeline.py` coordena as etapas e bloqueia o render final até a aprovação.
- `importar_transcricao.py` e `gerar_partitura.py` ligam o tempo por palavra à partitura de takes.
- `mapa.py`, `provas.py` e `conferir.py` coletam o animatic e as evidências de QA.
- `render_final.py` renderiza o corte aprovado a partir da pasta do vídeo.
- Rode os testes com `python -B -m unittest discover -s ferramentas`.
