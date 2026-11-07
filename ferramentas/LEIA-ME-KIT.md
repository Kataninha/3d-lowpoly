# Tool entry points

See [the production workflow](../WORKFLOW_MESTRE_ZE_DESMONTE.md) for command order, approvals and evidence.

- novo_video.py creates a project and a copied, hashed asset kit.
- pipeline.py coordinates stages and blocks final render until approval.
- importar_transcricao.py and gerar_partitura.py bind word timing to the take score.
- mapa.py, provas.py and conferir.py collect the animatic and QA evidence.
- render_final.py renders the approved cut from its video folder.
- Run tests with `python -B -m unittest discover -s ferramentas`.
