"""Pipeline skill must be the same for Claude (.claude) and Codex/other agents (.agents)."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLAUDE = ROOT / '.claude' / 'skills' / 'desmonta-pipeline' / 'SKILL.md'
AGENTS = ROOT / '.agents' / 'skills' / 'desmonta-pipeline' / 'SKILL.md'


class TestDocs(unittest.TestCase):
    @unittest.skipUnless(CLAUDE.exists() and AGENTS.exists(), 'skill copies not present in this checkout')
    def test_pipeline_skill_copies_match(self):
        self.assertEqual(
            CLAUDE.read_text(encoding='utf-8'), AGENTS.read_text(encoding='utf-8'),
            'Edit .claude/skills/desmonta-pipeline/SKILL.md, then copy it to .agents/skills/desmonta-pipeline/SKILL.md',
        )


if __name__ == '__main__':
    unittest.main()
