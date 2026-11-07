"""A skill do pipeline deve ser idêntica para o Claude (.claude) e para o Codex e outros agentes (.agents)."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLAUDE = ROOT / '.claude' / 'skills' / 'mundo100manual-pipeline' / 'SKILL.md'
AGENTS = ROOT / '.agents' / 'skills' / 'mundo100manual-pipeline' / 'SKILL.md'


class TestDocs(unittest.TestCase):
    @unittest.skipUnless(CLAUDE.exists() and AGENTS.exists(), 'cópias da skill ausentes neste checkout')
    def test_pipeline_skill_copies_match(self):
        self.assertEqual(
            CLAUDE.read_text(encoding='utf-8'), AGENTS.read_text(encoding='utf-8'),
            'Edite .claude/skills/mundo100manual-pipeline/SKILL.md, e copie para .agents/skills/mundo100manual-pipeline/SKILL.md',
        )


if __name__ == '__main__':
    unittest.main()
