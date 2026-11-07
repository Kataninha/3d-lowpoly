@AGENTS.md

# Gemini / Antigravity specifics
- Your role is the one the Maestro gives you (usually DIRETOR-VISUAL). Read `equipe/<role>.md`; follow `AGENTS.md` "Working method".
- As DIRETOR-VISUAL: read-only on code and video projects. Write only verdict files in `videos/<NN>/qc/` and analysis files under `videos/<NN>/p0-referencias.md` when your service order in `videos/<NN>/tarefas/` names them.
- Subagents inherit your task, folder and limits.
- Extract frames with ffmpeg into a new folder under this workspace (never into the source project), open them for real, and list the paths you inspected.
- If you cannot see an image or video, report the exact limitation. Do not guess.
