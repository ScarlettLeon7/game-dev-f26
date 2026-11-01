#!/usr/bin/env python3
"""Reproduce the retained timing rehearsal offline in a new external directory."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def checked_path(name):
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or not name.startswith('midterms/rogerwangdev/'):
        raise ValueError(f'Unexpected snapshot path: {name}')
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True,
                        help='A new directory outside this repository; it must not already exist.')
    args = parser.parse_args()
    project = Path(__file__).resolve().parents[1]
    repository = Path(subprocess.check_output(
        ['git', 'rev-parse', '--show-toplevel'], cwd=project, text=True).strip()).resolve()
    output = args.output_dir.resolve()
    if output.exists() or output == repository or repository in output.parents:
        raise ValueError('Choose a new output directory outside the repository.')

    evidence = project / 'reports/skill-use'
    manifest = json.loads((evidence / 'session-02-base.json').read_text())
    archive = evidence / manifest['archive']
    patch = evidence / manifest['patch']
    if digest(archive.read_bytes()) != manifest['archiveSha256']:
        raise ValueError('Source snapshot hash mismatch.')
    if digest(patch.read_bytes()) != manifest['patchSha256']:
        raise ValueError('Rehearsal patch hash mismatch.')

    expected = {entry['path']: entry['sha256'] for entry in manifest['files']}
    contents = {}
    with tarfile.open(archive, 'r:gz') as source:
        for member in source.getmembers():
            checked_path(member.name)
            if not member.isfile() or member.name not in expected or member.name in contents:
                raise ValueError('Unexpected source snapshot member.')
            data = source.extractfile(member).read()
            if digest(data) != expected[member.name]:
                raise ValueError(f'Source file hash mismatch: {member.name}')
            contents[member.name] = data
    if set(contents) != set(expected):
        raise ValueError('Source snapshot is incomplete.')
    for entry in manifest['sharedFiles']:
        path = checked_path(entry['path'])
        data = (project / path.relative_to('midterms/rogerwangdev')).read_bytes()
        if digest(data) != entry['sha256']:
            raise ValueError(f'Shared file hash mismatch: {path}')
        if str(path) in contents:
            raise ValueError('Duplicate shared source path.')
        contents[str(path)] = data

    output.mkdir(parents=True)
    for name, data in contents.items():
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    subprocess.run(['git', 'init', '--quiet', str(output)], check=True)
    # This new fixture commit is local reproduction metadata, not a historical run.
    subprocess.run(['git', 'add', '--all'], cwd=output, check=True)
    subprocess.run(['git', '-c', 'user.name=Offline rehearsal fixture',
                    '-c', 'user.email=offline@localhost', '-c', 'commit.gpgsign=false',
                    '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet',
                    '-m', 'Assemble source-only rehearsal fixture'], cwd=output, check=True)
    subprocess.run(['git', 'apply', '--check', '--unidiff-zero', str(patch)], cwd=output, check=True)
    subprocess.run(['git', 'apply', '--unidiff-zero', str(patch)], cwd=output, check=True)
    rehearsal = output / 'midterms/rogerwangdev'
    commands = [
        ['npm', 'test'],
        ['npm', 'run', 'verify-source'],
        ['npm', 'run', 'check:timing', '--', '--seconds', '1',
         '--declaration', 'REHEARSAL-2026-10-28.json'],
    ]
    for history in ('0', '4'):
        commands.append(['node', 'scripts/evaluate.js', '--declaration',
                         'REHEARSAL-2026-10-28.json', '--player', 'baseline',
                         '--suite', 'development', '--history', history,
                         '--output-dir', f'reports/rehearsal-check-h{history}'])
    for command in commands:
        subprocess.run(command, cwd=rehearsal, check=True)
    print(f'Reproduced the isolated rehearsal in {rehearsal}. No provider calls were made.')


if __name__ == '__main__':
    main()
