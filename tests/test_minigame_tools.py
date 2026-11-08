"""Contract tests for classroom submission tooling (no external services)."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('minigames', REPO / 'scripts/minigames.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MinigameToolsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        shutil.copytree(REPO / 'minigames/get-out', self.root / 'minigames/get-out')
        shutil.copytree(REPO / 'minigames/templates', self.root / 'minigames/templates')

    def new(self, owner='alice'):
        return m.scaffold(self.root, owner, 'hints')

    def test_two_students_and_overwrite_refusal(self):
        a, b = self.new(), self.new('bob')
        self.assertNotEqual(a, b)
        self.assertEqual(m.validate(self.root)[0]['author'], 'alice')
        with self.assertRaises(ValueError):
            self.new()
        self.assertTrue((a / 'index.html').is_file())

    def test_invalid_usernames(self):
        for owner in ('../alice', '-alice', 'alice-', 'a/b', 'a--b', 'ALICE', ''):
            with self.subTest(owner=owner), self.assertRaises(ValueError):
                self.new(owner)

    def test_manifest_mismatches(self):
        folder = self.new()
        path = folder / 'submission.json'
        original = json.loads(path.read_text())
        for key, value in [('author', 'bob'), ('entry', '../index.html'),
                           ('principle', 'unknown'), ('title', ''), ('schema', True)]:
            data = dict(original, **{key: value})
            path.write_text(json.dumps(data))
            with self.subTest(key=key), self.assertRaises(ValueError):
                m.validate(self.root)
        path.write_text(json.dumps(original))
        (folder / 'experiment.md').unlink()
        with self.assertRaises(ValueError):
            m.validate(self.root)

    def test_symlinks_rejected(self):
        folder = self.new()
        (folder / 'shortcut').symlink_to(self.root / 'minigames/get-out')
        with self.assertRaises(ValueError):
            m.validate(self.root)

    def test_symlinked_submission_parent_rejected_before_writing(self):
        target = self.root / 'elsewhere'
        target.mkdir()
        (self.root / 'minigames/submissions').symlink_to(target)
        with self.assertRaises(ValueError):
            self.new()
        self.assertEqual(list(target.iterdir()), [])

    def test_draft_and_ready(self):
        folder = self.new()
        m.validate(self.root)
        with self.assertRaises(ValueError):
            m.validate(self.root, ready=True)
        (folder / 'experiment.md').write_text('Observed one player. Exploratory evidence only.\n')
        m.validate(self.root, ready=True)

    def test_gallery_escape_links_and_no_overwrite_outside_build(self):
        folder = self.new()
        path = folder / 'submission.json'
        data = json.loads(path.read_text())
        data['title'] = '<script>alert(1)</script>'
        path.write_text(json.dumps(data))
        out = m.gallery(self.root)
        text = out.read_text()
        self.assertIn('&lt;script&gt;', text)
        self.assertNotIn('<script>alert(1)</script>', text)
        self.assertTrue((out.parent / 'submissions/alice/get-out/index.html').is_file())
        self.assertTrue((out.parent / 'get-out/index.html').is_file())
        self.assertEqual(out, m.gallery(self.root))

    def test_gallery_handles_combined_games_larger_than_single_game_limit(self):
        for owner in ('alice', 'bob'):
            folder = self.new(owner)
            for number in range(2):
                (folder / f'asset{number}.txt').write_bytes(b'x' * (1500 * 1024))
        m.gallery(self.root)
        m.gallery(self.root)

    def test_gallery_preserves_unrelated_build_directory(self):
        folder = self.root / 'build/minigames'
        folder.mkdir(parents=True)
        (folder / 'precious.txt').write_text('preserve')
        with self.assertRaises(ValueError):
            m.gallery(self.root)
        self.assertEqual((folder / 'precious.txt').read_text(), 'preserve')

    def test_boundary_ownership_and_mixed_changes(self):
        self.assertTrue(m.check_paths(['minigames/submissions/alice/get-out/app.js'], 'alice'))
        self.assertFalse(m.check_paths(['course_game/game.py'], 'alice'))
        for paths in ([ 'minigames/submissions/bob/get-out/app.js'],
                      ['minigames/submissions/alice/get-out/app.js', 'minigames/get-out/app.js'],
                      ['minigames/submissions/alice/get-out/app.js', '.github/workflows/a.yml']):
            with self.assertRaises(ValueError):
                m.check_paths(paths, 'alice')

    def test_midterm_folder_and_own_workflow(self):
        ok = ['midterms/alice/README.md', 'midterms/alice/src/game.py',
              '.github/workflows/midterm-alice.yml']
        self.assertFalse(m.check_paths(ok, 'alice'))
        self.assertFalse(m.check_paths(ok, 'Alice'))  # GitHub logins arrive mixed-case
        self.assertFalse(m.check_paths(['midterms/alice/README.md'], 'alice'))
        for paths in (['midterms/bob/README.md'],
                      ['midterms/alice/README.md', '.github/workflows/midterm-bob.yml'],
                      ['midterms/alice/README.md', '.github/workflows/setup-check.yml'],
                      ['midterms/alice/README.md', 'course_game/game.py'],
                      ['midterms/alice/README.md', 'minigames/submissions/alice/get-out/app.js'],
                      ['midterms/Alice/README.md'],
                      ['.github/workflows/midterm-alice.yml', 'AGENTS.md']):
            with self.assertRaises(ValueError, msg=paths):
                m.check_paths(paths, 'alice')

    def test_maintainer_may_change_midterm_infrastructure(self):
        m.check_paths(['midterms/alice/README.md', '.github/workflows/setup-check.yml'], 'bgarakani')

    def write_workflow(self, text, owner='alice'):
        path = self.root / f'.github/workflows/midterm-{owner}.yml'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
        return path

    GOOD_WORKFLOW = '''# Read-only deterministic checks.
name: Midterm - alice
on:
  pull_request:
    paths: ['midterms/alice/**', '.github/workflows/midterm-alice.yml']
  workflow_dispatch:
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: midterms/alice
    steps:
      - uses: actions/checkout@v4
      - run: python -m unittest
'''

    def test_midterm_workflow_content(self):
        self.write_workflow(self.GOOD_WORKFLOW)
        m.check_midterm_workflow(self.root, 'alice')
        bad = {
            'no permissions': self.GOOD_WORKFLOW.replace('permissions:\n  contents: read\n', ''),
            'secret': self.GOOD_WORKFLOW + '        env:\n          KEY: ${{ secrets.API_KEY }}\n',
            'secret index': self.GOOD_WORKFLOW + '        env:\n          KEY: ${{ secrets[\'K\'] }}\n',
            'token': self.GOOD_WORKFLOW + '        env:\n          T: ${{ github.token }}\n',
            'target': self.GOOD_WORKFLOW.replace('  pull_request:', '  pull_request_target:'),
            'workflow_run': self.GOOD_WORKFLOW.replace('  workflow_dispatch:', '  workflow_run:'),
            'write': self.GOOD_WORKFLOW.replace('contents: read', 'contents: write'),
            'write-all': self.GOOD_WORKFLOW.replace('permissions:\n  contents: read', 'permissions: write-all'),
            'quoted write': self.GOOD_WORKFLOW.replace('contents: read', 'contents: "write"'),
            'flow write': self.GOOD_WORKFLOW.replace('permissions:\n  contents: read', "permissions: {contents: 'write'}"),
            'id-token': self.GOOD_WORKFLOW.replace('contents: read', 'contents: read\n  id-token: none'),
            'toJSON secrets': self.GOOD_WORKFLOW + '        env:\n          ALL: ${{ toJSON(secrets) }}\n',
            'inherit': self.GOOD_WORKFLOW + '  reuse:\n    uses: ./.github/workflows/x.yml\n    secrets: inherit\n',
            'token index': self.GOOD_WORKFLOW + "        env:\n          T: ${{ github['token'] }}\n",
            'toJSON github': self.GOOD_WORKFLOW + '        env:\n          G: ${{ toJSON(github) }}\n',
            'secret after inline #': self.GOOD_WORKFLOW + '      - run: echo "x #${{ secrets.K }}"\n',
            'secret on # line in run block': self.GOOD_WORKFLOW + '      - run: |\n          echo hi\n          #${{ secrets.K }}\n',
            'comment mentioning secrets': '# Needs no secrets.\n' + self.GOOD_WORKFLOW,
            'uppercase secrets': self.GOOD_WORKFLOW + '        env:\n          K: ${{ SECRETS.K }}\n',
            'uppercase token': self.GOOD_WORKFLOW + '        env:\n          T: ${{ GitHub.Token }}\n',
            'hex escape': self.GOOD_WORKFLOW + '        env:\n          K: "${{ \\x73ecrets.K }}"\n',
            'block scalar write': self.GOOD_WORKFLOW.replace('contents: read', 'contents: >-\n    WRITE'),
            'extra scope': self.GOOD_WORKFLOW.replace('contents: read', 'contents: read\n  actions: read'),
            'job permissions': self.GOOD_WORKFLOW.replace('    runs-on:', '    permissions: {}\n    runs-on:'),
            'tag': self.GOOD_WORKFLOW.replace('contents: read', 'contents: !!str read'),
        }
        for label, text in bad.items():
            self.write_workflow(text)
            with self.assertRaises(ValueError, msg=label):
                m.check_midterm_workflow(self.root, 'alice')

    def test_midterm_workflow_absent_or_symlinked(self):
        m.check_midterm_workflow(self.root, 'alice')  # deleting your own workflow is allowed
        target = self.write_workflow(self.GOOD_WORKFLOW, owner='bob')
        (target.parent / 'midterm-alice.yml').symlink_to(target)
        with self.assertRaises(ValueError):
            m.check_midterm_workflow(self.root, 'alice')

    def test_git_rename_and_delete_keep_both_paths(self):
        def git(*args):
            return subprocess.check_output(['git', *args], cwd=self.root, text=True).strip()
        git('init', '-q')
        git('config', 'user.email', 'test@example.invalid')
        git('config', 'user.name', 'Test')
        self.new()
        git('add', '.')
        git('commit', '-qm', 'base')
        base = git('rev-parse', 'HEAD')
        source = self.root / 'minigames/get-out/README.md'
        source.rename(self.root / 'minigames/submissions/alice/get-out/stolen.md')
        git('add', '-A')
        git('commit', '-qm', 'rename')
        paths = m.changed_paths(self.root, base, 'HEAD')
        self.assertIn('minigames/get-out/README.md', paths)
        with self.assertRaises(ValueError):
            m.check_paths(paths, 'alice')


    def git_repo(self):
        def git(*args):
            return subprocess.check_output(['git', *args], cwd=self.root, text=True).strip()
        git('init', '-q')
        git('config', 'user.email', 'test@example.invalid')
        git('config', 'user.name', 'Test')
        git('add', '.')
        git('commit', '-qm', 'base')
        return git, git('rev-parse', 'HEAD')

    def commit_file(self, git, path, data, message='add'):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        git('add', '-A')
        git('commit', '-qm', message)

    MP4 = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom' + b'\x00' * 64
    WEBM = b'\x1a\x45\xdf\xa3' + b'\x00' * 64

    def test_videos_rejected_by_extension_or_signature(self):
        cases = (('midterms/alice/demo.mp4', b'not really a video'),
                 ('midterms/alice/demo.MOV', b'x'),
                 ('midterms/alice/media/intro.webm', b'x'),
                 ('midterms/alice/clip.png', self.MP4),       # renamed MP4
                 ('midterms/alice/clip.bin', self.WEBM),      # renamed WebM
                 ('midterms/alice/clip.dat', b'RIFF\x00\x00\x00\x00AVI LIST'),
                 ('midterms/alice/demo.mp4', b'version https://git-lfs.github.com/spec/v1\n'))
        git, base = self.git_repo()
        for path, data in cases:
            with self.subTest(path=path):
                self.commit_file(git, path, data)
                with self.assertRaisesRegex(ValueError, 'Video'):
                    m.check_no_videos(self.root, base, 'HEAD')
                git('reset', '-q', '--hard', base)
                git('clean', '-qfdx')

    def test_video_name_on_content_already_in_base(self):
        git, base = self.git_repo()
        known = (self.root / 'minigames/get-out/README.md').read_bytes()
        self.commit_file(git, 'midterms/alice/demo.mp4', known)
        with self.assertRaisesRegex(ValueError, 'demo.mp4'):
            m.check_no_videos(self.root, base, 'HEAD')

    def test_video_deleted_in_a_later_commit_still_rejected(self):
        git, base = self.git_repo()
        self.commit_file(git, 'midterms/alice/demo.mp4', self.MP4)
        (self.root / 'midterms/alice/demo.mp4').unlink()
        git('add', '-A')
        git('commit', '-qm', 'remove video')
        with self.assertRaisesRegex(ValueError, 'demo.mp4'):
            m.check_no_videos(self.root, base, 'HEAD')

    def test_images_audio_and_code_are_not_videos(self):
        git, base = self.git_repo()
        avif = b'\x00\x00\x00\x1cftypavif\x00\x00\x00\x00avifmif1miaf' + b'\x00' * 64
        ogg_audio = b'OggS\x00\x02' + b'\x00' * 22 + b'\x01vorbis' + b'\x00' * 64
        for path, data in (('midterms/alice/art.avif', avif),
                           ('midterms/alice/theme.ogg', ogg_audio),
                           ('midterms/alice/src/game.ts', b'export const x = 1;\n'),
                           ('midterms/alice/shot.png', b'\x89PNG\r\n\x1a\n' + b'\x00' * 64),
                           ('midterms/alice/README.md', b'G' * 400)):
            self.commit_file(git, path, data)
        m.check_no_videos(self.root, base, 'HEAD')

    def test_existing_base_files_are_not_rescanned(self):
        (self.root / 'minigames/get-out/old.mp4').write_bytes(self.MP4)
        git, base = self.git_repo()
        self.commit_file(git, 'midterms/alice/README.md', b'hello')
        m.check_no_videos(self.root, base, 'HEAD')

if __name__ == '__main__':
    unittest.main()
