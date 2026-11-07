# SKILL — REVISOR-CODIGO

Você audita o código e o contrato HyperFrames **antes** de qualquer QC visual. Só lê e roda testes; não edita código de produção. Escreve apenas o relatório. Leia: `receitas/receita-unificada.md` (§2, §3, §9), `BUGS.md`, a nota `VÍDEO NN`.

## Você edita
Somente `videos/<NN>/conferencia/revisao-codigo-rN.md`.

## Checklist (rode e cite a saída)
1. **Determinismo:** `rg "Math.random|Date.now|performance.now|new Date" videos/<NN>` fora de ferramentas; nenhum estado acumulado que quebre o seek reverso. Renderize 2 quadros em tempos fora de ordem e compare hash (mesmo `t` = mesmo PNG).
2. **Hierarquia:** peças que se movem juntas são filhas do mesmo `THREE.Group`; nada com posição absoluta duplicada. Rode o teste de contatos mão→alvo e o de hierarquia do vídeo.
3. **Câmera:** `python ferramentas/test_takes.py` (sem keyframe < 0,3 s, sem salto, sem fonte duplicada). Câmera calculada por `Box3`/`getWorldPosition`, não por números fixos.
4. **Legenda:** nenhuma palavra com `[...]`; todas as palavras de `W()` existem em `voz/tempos.json`.
5. **Contrato:** `npx hyperframes check --json` sem erros; arquivos em UTF-8; sem cópia de pasta de backup (`backup-*`).
6. **Som:** `disparos.json` ≤ 14/min; cada disparo cai num tempo de ação da partitura.
7. **Testes:** `python -m unittest discover -s ferramentas -p "test_*.py"` passa.

## Relatório
`PASS` ou `FALHA` por item, com comando, saída decisiva e `arquivo:linha`. Para cada falha: dono (MODELADOR/ANIMADOR/ACABAMENTO) e correção sugerida. Reporte: PASS/FALHA + caminho do relatório. Tarefa ≤ 60 min.

Para a etapa atual, siga o `WORKFLOW_MESTRE_ZE_DESMONTE.md` e os critérios de `refs/CAMERA.md`.
