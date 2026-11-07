# Mundo100Manual production workflow

Updated 2026-11-02. Start here. The editorial recipe lives in [receitas/receita-unificada.md](receitas/receita-unificada.md). [refs/CAMERA.md](refs/CAMERA.md) translates the user's three-video study into camera decisions. [equipe/painel.md](equipe/painel.md) records current work.

## Entry and production

| Stage | Owner | Inputs, output and evidence |
|---|---|---|
| Topic and skeleton | Maestro | Research claims and technical sequence in `pesquisa.md`. Reuse assets from `CATALOGO.md`. Create the project with `python ferramentas/novo_video.py <slug>`. Ask for approval of `esqueleto.md`. |
| Script | Maestro | Apply editorial recipe §1. Write `roteiro.txt`, record sources and list needed inputs in `insumos.json`. Ask for script approval. |
| Visual plan | Maestro | Fill `plano-visual.md` and `direcao.md` with scenario, focus, camera family, motion, action, overlays, SFX and when Zé serves the explanation. Ask for approval. |
| Voice | Maestro | User drops a single source WAV or MP3 in `voz/`. Run `preparar-voz`, transcribe with the pinned HyperFrames and import word times. Resolve mismatched words against the recording before proceeding. |
| P0 | Maestro | Select the applicable principles from `refs/CAMERA.md`. Define one experiment and plan what the audience should understand from each phrase. |
| P1 | Maestro and DIRETOR-VISUAL | Author `takes.json` with phrase indexes, stable target IDs, required relationships, `shotType`, `leitura`, timing cues and proof words. Generate `partitura.json` and verify camera intent and actions against the approved plan. |
| P2 | MODELADOR-3D and DIRETOR-VISUAL | Build and test mechanisms in isolation. Register actual Three.js objects, evaluate camera variants and assemble the selected poses in `camera.json`. Open snapshots and watch the animatic before accepting. |
| Assembly | ANIMADOR, ACABAMENTO, REVISOR-CODIGO | Render from absolute time. Integrate scene, graphic overlays, captions and sound. Run HyperFrames check, take tests and seek verification. |
| P3 | Maestro and DIRETOR-VISUAL | Open the action proofs, inspect the preview at one frame per second and watch/listen to the entire draft. Record the QA report and its exact inputs. |
| Final approval and render | User, ACABAMENTO | Record explicit approval for the P3 preview, then run the gated render command. |
| P4 and delivery | Maestro | Open the final MP4. Verify picture, audio, duration, 1080 × 1920 and 30 fps. Record actual evidence, deliver the MP4 with the platform copy below and update the retrospective. Publishing requires separate authorization. |

In every final delivery, automatically prepare and save a Portuguese posting package in the video folder as `publicacao.md` and include it in the delivery message with the MP4 link. Tailor it to the exported cut. For YouTube, include title, description, hashtags, comma-separated tags, format, suggested category, audience and cover text. For Instagram and TikTok, include a hook/title, caption, hashtags, format and cover text for each platform. Suggest visibility and interaction settings where appropriate, and flag settings that depend on actual sponsorship, audience or account details. Verify current platform requirements when needed. Do not upload or publish without explicit authorization.

For Retrocesso Causal, use recipe §1.1 in the skeleton, visual plan and score. Apply §4 in assembly and §8 when reviewing the P3 preview.

Flow rules (user decision 2026-11-06):
- Approval package: present skeleton, script (short, cause and effect) and visual plan together for one user answer. Record the three approvals from that answer. A rejected part returns alone.
- Voice: ask for the recording only after the script is locked. Any script change after recording means a new take.
- Preview checklist: before any preview reaches the user, the Maestro opens start, middle and end frames of each take, checks legibility, occlusion and framing, and watches the whole preview at 1 frame/s. Record the check in `registro.md`.
- P2 round limit: after 3 rounds of the same preview without approval, stop and ask the user for a direction decision before round 4.
- P4 gate: `avancar <video> P4` requires non-empty `publicacao.md` and `retrospectiva.md` in the video folder.

Record each approval before advancing its corresponding stage. Advance in order with `python ferramentas/pipeline.py avancar <video> <etapa>`. Use `status`, `pendente`, `iniciar <video>` and `insumos <video>` to coordinate. The Maestro keeps the panel and `registro.md` current. Required user inputs stop the relevant stage. Three P3 rejections pause production for review.

## Voice and timing

Run the first and third commands from the repository root and the second from the video folder. `<video>` is the folder name. Review the actual transcription output before importing it.

```powershell
python ferramentas/pipeline.py preparar-voz <video>
npx --offline --no-install hyperframes@0.8.191 transcribe voz/voz.wav --engine parakeet --language pt --no-runtime-install
python ferramentas/importar_transcricao.py videos/<video> videos/<video>/transcript.json
python ferramentas/gerar_partitura.py videos/<video> --voz
```

The importer requires ordered word timestamps and exact correspondence to the script after case and punctuation normalization. It binds `voz/tempos.json` to the WAV and script by SHA-256. Correct transcription errors against the actual audio. Estimated timings are useful for rough boards only. For another take of the voice, keep the previous artifact in a versioned path and regenerate the affected outputs.

## Camera and visual proof

For each take choose a narrative family and write what must be readable. `biblioteca/camera/diretor.js` registers Three.js objects with stable IDs and computes candidates from their animated bounds. Use `sceneRegistry` and `planCandidates` against the scene's deterministic `updateAt(t)`. Save the registry and diagnostics under `qc/`. Review two or three candidates where framing is ambiguous. Call `selectedCamera(takes, candidates, selection)` with the approved IDs. Save its result in `camera.json` and use the shared mounting template to apply them.

Capture start, middle and end for static takes and five evenly spaced samples for moving takes. Open the images to decide whether the action, relation, label and transition read. Sample inside the end of the take. Bounds and raycast estimates assist this review. Explicitly review actual occlusion, collisions and legibility against `refs/CAMERA.md`. `ferramentas/mapa.py` makes the midpoint animatic and `ferramentas/provas.py` captures proof times from the score.

A technical preview is allowed during production. Prove repeated seek using frame order 90, 10, 50, 10 and compare preview snapshots with the technical export.

## Review, export and reproduction

New projects carry schema 2 in `estado.json`. Project creation copies assets into `kit/` and writes `kit.manifest.json` with actual SHA-256 digests. Inputs changing after review roll the state back and invalidate stale approvals. Save new reports in versioned output paths.

Before P2 or P3, obtain the current `hashes` from `python ferramentas/pipeline.py verificar <video>`. Record the review in a JSON file inside `qc/` with `resultado: "aprovado"`, `revisor`, `relatorio` (relative path), `arquivos_abertos` (opened preview MP4 and proof images), and `inputs_sha256`. Run `avancar <video> P2 --evidencia qc/p2.json` or `avancar <video> P3 --evidencia qc/p3.json`. A reviewer must actually inspect those files.

After explicit user approval of the reviewed cut:

```powershell
python ferramentas/pipeline.py aprovar-render <video> --usuario <name> --evidencia qc/autorizacao.md
# From the video folder, with a new output filename:
npm run render -- final.mp4
```

The export wrapper verifies hashes and P3 approval before starting the pinned CLI. Record the export and advance to P4 after opening the output and verifying picture and audio. Measure loudness and peak with FFmpeg. Reproducibility means this project can reconstruct its approved output from versioned inputs, settings and kit.

## Workspace organization

- `refs/` holds the camera rules.
- `biblioteca/` holds reusable assets and their origins.
- `modelo-video/` is the only production template. `videos/` holds current productions.
- The CLI and native HyperFrames Studio are the local production surfaces.
- `equipe/` defines roles. Use the same runbook in Codex and Claude. Read `BUGS.md` and use its lessons before production.

Use existing subscriptions and tools. Ask before installing anything, incurring cost or sending content to an external service. Preserve an open preview or render process.
