"""A skill do pipeline deve ser idêntica para o Claude (.claude) e para o Codex e outros agentes (.agents)."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLAUDE = ROOT / '.claude' / 'skills' / 'pipeline-video' / 'SKILL.md'
AGENTS = ROOT / '.agents' / 'skills' / 'pipeline-video' / 'SKILL.md'


class TestDocs(unittest.TestCase):
    @unittest.skipUnless(CLAUDE.exists() and AGENTS.exists(), 'cópias da skill ausentes neste checkout')
    def test_pipeline_skill_copies_match(self):
        self.assertEqual(
            CLAUDE.read_text(encoding='utf-8'), AGENTS.read_text(encoding='utf-8'),
            'Edite .claude/skills/pipeline-video/SKILL.md, e copie para .agents/skills/pipeline-video/SKILL.md',
        )


if __name__ == '__main__':
    unittest.main()
