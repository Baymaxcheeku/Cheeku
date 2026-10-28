"""Keep docs/vision-board/board.json and the live board in step.

The live board keeps its cards in the artifact's shared database. Claude moves
data between the two with the ArtifactData tool; this script does the file
work on either side.

  pull <export-dir>   Build board.json from an ArtifactData export: one
                      `list` per collection (items, risks, moats, tags,
                      board) with `out_dir` set to <export-dir>.
  push <out-dir>      Write one JSON file per document from board.json, plus
                      writes.json, the list of documents to send with an
                      ArtifactData `batch` (50 at a time; add `if_version`
                      from a fresh read for documents that already exist).
  diff <export-dir>   Show what differs between board.json and an export,
                      before a pull or a push overwrites either side.
  build -             Rebuild page.html from page.template.html and
                      engine.js (the financial model engine, v2).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BOARD = os.path.join(HERE, 'board.json')
COLLECTIONS = ['items', 'risks', 'moats', 'tags', 'board']
# Written by the page on every save; they would make every pull a diff.
VOLATILE = {'updatedAt', 'updatedBy'}


def load_export(src):
    out = {}
    for coll in COLLECTIONS:
        d = os.path.join(src, coll)
        out[coll] = {}
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith('.json'):
                out[coll][f[:-5]] = json.load(open(os.path.join(d, f)))
    return out


def stable(doc):
    return {k: doc[k] for k in sorted(doc) if k not in VOLATILE}


def pull(src):
    data = load_export(src)
    board = {coll: {i: stable(doc) for i, doc in sorted(data[coll].items())} for coll in COLLECTIONS}
    json.dump(board, open(BOARD, 'w'), ensure_ascii=False, indent=1, sort_keys=True)
    open(BOARD, 'a').write('\n')
    print('board.json:', ', '.join(f'{len(board[c])} {c}' for c in COLLECTIONS))


def push(dst):
    board = json.load(open(BOARD))
    writes = []
    for coll in COLLECTIONS:
        os.makedirs(os.path.join(dst, coll), exist_ok=True)
        for i, doc in board.get(coll, {}).items():
            path = os.path.join(dst, coll, i + '.json')
            json.dump(doc, open(path, 'w'), ensure_ascii=False, indent=1)
            writes.append({'op': 'set', 'collection': coll, 'doc_id': i, 'file_path': os.path.abspath(path)})
    json.dump(writes, open(os.path.join(dst, 'writes.json'), 'w'), indent=1)
    print(f'{len(writes)} documents written to {dst}; send writes.json in batches of 50')


def diff(src):
    live = load_export(src)
    repo = json.load(open(BOARD))
    for coll in COLLECTIONS:
        a, b = repo.get(coll, {}), {i: stable(d) for i, d in live[coll].items()}
        for i in sorted(set(a) | set(b)):
            if i not in b:
                print(f'only in git:  {coll}/{i}')
            elif i not in a:
                print(f'only on board: {coll}/{i}  {b[i].get("title") or b[i].get("label") or b[i].get("name") or ""}')
            elif a[i] != b[i]:
                keys = sorted(k for k in set(a[i]) | set(b[i]) if a[i].get(k) != b[i].get(k))
                print(f'changed:      {coll}/{i}  ({", ".join(keys)})')


def build(_):
    page = open(os.path.join(HERE, 'page.template.html')).read()
    engine = open(os.path.join(HERE, 'engine.js')).read()
    assert '</script>' not in engine and page.count('/*ENGINE*/') == 1
    open(os.path.join(HERE, 'page.html'), 'w').write(page.replace('/*ENGINE*/', engine))
    print('page.html rebuilt')


if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] not in ('pull', 'push', 'diff', 'build'):
        sys.exit(__doc__)
    {'pull': pull, 'push': push, 'diff': diff, 'build': build}[sys.argv[1]](sys.argv[2])
