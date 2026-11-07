# HyperFrames workspace — agent instructions

Purpose: produce YouTube / TikTok / Instagram content (explainers, Reels, Shorts) for the channel Mundo100Manual with HyperFrames (HTML + GSAP, rendered to video), Three.js low poly and ffmpeg.
User-facing messages are in Portuguese. Code, files, skills and rules are in English (recipes and team notes are in Portuguese).

## Where the rules live (single source each; do not copy them here)
- Production stages and gates: `WORKFLOW_MESTRE_ZE_DESMONTE.md`. Camera reference: `refs/CAMERA.md`.
- **Editorial preflight.** Before drafting, revising, or reviewing a video skeleton, script, visual plan, animation, or cut, open the current `receitas/receita-unificada.md` and read the applicable sections. For scripts, apply §1 and check each cycle for a visible limit, a solution, an observable result, and the technical name after the demonstration. Check that the result leads to the next limit before submitting for approval. Consider Retrocesso Causal under §1.1 during the skeleton. When selected, carry the approved return and its purpose through the visual plan and apply §§4 and 8 in production and review.
- Pipeline order and commands: skill `desmonta-pipeline` (`.claude/skills/desmonta-pipeline/SKILL.md` for Claude, `.agents/skills/desmonta-pipeline/SKILL.md` for Codex and other agents; both files are identical, `ferramentas/test_docs.py` checks it).
- Your own role: `equipe/<role>.md`.
- Live status: `equipe/painel.md` (note `0 — PAINEL`) and `python ferramentas/pipeline.py status`. Permanent decisions: `receitas/decisoes.md`. Bugs: `BUGS.md` (read before any task; add an entry, never delete one, only change its status).
- Effects kit: `biblioteca/efeitos/EFEITOS.md`. Catalog: `CATALOGO.md`, `ATIVOS.md`.

## Team
Roles are fixed; the model behind each role is the user's choice (default: Claude Opus as Maestro, Claude Sonnet for the others). Every model follows the same rules and files.
- Maestro: the leader. Plans, decides quality, approves, the only agent that talks to the user.
- MODELADOR-3D, ANIMADOR, ACABAMENTO, REVISOR-CODIGO: implement, each within the files of their role.
- DIRETOR-VISUAL: read-only visual review.
- A subagent inherits the caller's task, editable files and limits.

## Working method (any agent)
- Read the source files: `equipe/<role>.md`, `equipe/painel.md`, `receitas/receita-unificada.md`.
- Video state: `python ferramentas/pipeline.py status`, then `videos/<NN>/estado.json`, `direcao.md`, `takes.json`, `partitura.json`, `registro.md` and `tarefas/`.
- Report results in your own session (summary, paths, measured numbers).
- Acting as Maestro: keep `equipe/painel.md` and `videos/<NN>/registro.md` current.

## Hard rules
- Reuse first: read `ATIVOS.md`, `CATALOGO.md`, `biblioteca/` before creating an asset, script or template.
- One agent edits a given file at a time; the owner is the agent holding the active service order in `videos/<NN>/tarefas/`. Work on your own git floor/branch; no `backup-*` folders (git keeps versions).
- Never delete, move, rename or overwrite existing user files without the user's approval (via the Maestro). Write new output to new folders.
- Never interrupt running processes (previews, http.server, frame extraction).
- No paid APIs. Only authenticated subscriptions. ElevenLabs / Google Flow only with explicit approval.
- Visual honesty: never describe an image or video that was not actually opened. State the file paths inspected, or the exact limitation.
- Text files are UTF-8 (B31).

## Autonomy
Allowed without asking: read anything; create new files/folders in this workspace; run tests; preview and low-resolution renders; ffmpeg on copies; update notes.
Ask the user first (through the Maestro): publishing/uploading; deleting, moving or overwriting existing files; structural changes to an existing project; installing dependencies; anything with a cost. Final render requires the user’s explicit approval of the reviewed P3 cut.

## Conventions
- Each video: `videos/<NN>-<slug>/` made by `ferramentas/novo_video.py` (own `AGENTS.md`, `roteiro.txt`, `partitura.json`, `registro.md`, `tarefas/`). Nothing from one video goes into another's folder.
- Universal library `biblioteca/`: one item per folder (`personagens/`, `objetos/`, `cenarios/<slug>/`) with main file, previews and `origem.json`; lowercase names with hyphens, no accents; register new items in `CATALOGO.md`. Channel character: Zé Desmonte (`ze-desmonte`; new videos import `ze-desmonte-padrao.js`). Do not use "Kiko" in new files.
- Direction (presence of Zé, rhythm, cuts, effects) is decided per video in `direcao.md`; reference numbers are starting points, never targets.
- Use the HyperFrames skills for composition rules; `hyperframes check` with no errors is a requirement, never an approval.
- Colors: only the meaningful `--cor-*` tokens for texts and icons; theme teal/orange only for the brand.
