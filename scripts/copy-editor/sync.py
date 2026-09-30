"""
Sync workflow for the Case Study Copy Editor artifact.

Usage (run by Claude when the user says "sync the case study copy"):

  1. Claude fetches all current edits from the artifact's `edits` collection
     via the ArtifactData tool (action="list" or "query", paged with cursor)
     and writes them to edits.json as {id: {text, updatedAt}, ...}.
  2. Run: python3 sync.py
     This re-parses the CURRENT live portfolio HTML fresh (positions are
     always recomputed now, never reused from an earlier extraction --
     the file may have changed since), matches each edit by field id
     against the freshly-parsed baseline, and only for fields where the
     edited text differs from the file's current text, splices the new
     (quoted, escaped) string into place using exact character offsets.
     Edits whose id no longer exists in the current structure (e.g. a
     block was manually restructured since) are reported and skipped,
     never guessed at.
  3. Writes the patched file to OUT_PATH (a sibling copy, not overwriting
     the source until Claude has diffed/verified it), and prints a summary.
"""
import sys, json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from jsparse import parse

REPO_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(REPO_ROOT, 'Jess Li - Portfolio.dc.html')
OUT = os.path.join(HERE, 'synced-output.dc.html')
EDITS_FILE = os.path.join(HERE, 'edits.json')

TEXT_KEYS = {
    'text', 'title', 'heading', 'eyebrow', 'label', 'caption', 'desc', 'descA', 'descB',
    'body', 'overview', 'value', 'beforeCaption', 'afterCaption', 'beforeLabel', 'afterLabel',
    'badge', 'note', 'startPill', 'endPill', 'sharedCaption', 'category', 'role', 'timeline',
    'team', 'status', 'statusLabel', 'publicImgCaption', 'date',
}
SKIP_KEYS = {
    'type', 'icon', 'iconD', 'dir', 'ratio', 'beforeRatio', 'afterRatio', 'img', 'images',
    'beforeImg', 'afterImg', 'videoSrc', 'videoSrcs', 'videoMaxW', 'ax', 'ay', 'lx', 'ly',
    'qx', 'qy', 'w', 'topPct', 'v', 'num', 'locked', 'slug', 'noVidControls', 'video',
    'caseCover', 'publicImg', 'publicVideo', 'noPublicVideo', 'noCoverVideo',
}


def load_top(content, marker, bracket):
    idx = content.index(marker)
    b = content.index(bracket, idx)
    val, end = parse(content, b)
    return val


def mk(id_, v):
    rec = {'id': id_, 'text': str(v)}
    if hasattr(v, 'start'):
        rec['_pos'] = [v.start, v.end, v.quote]
    return rec


def walk(node, path_ids, records):
    if isinstance(node, dict):
        if '__raw__' in node and len(node) == 1:
            return
        for k, v in node.items():
            if k in SKIP_KEYS:
                continue
            if isinstance(v, str) and k in TEXT_KEYS:
                records.append(mk('.'.join(path_ids + [k]), v))
            elif isinstance(v, (dict, list)):
                walk(v, path_ids + [k], records)
    elif isinstance(node, list):
        for i, item in enumerate(node):
            walk(item, path_ids + [str(i)], records)


def build_fresh_records(content):
    PROJECTS = load_top(content, 'this.PROJECTS = ', '[')
    SKIM = load_top(content, 'this.SKIM = ', '{')
    CASE = load_top(content, 'this.CASE = ', '{')

    records = []
    for proj in PROJECTS:
        slug = proj['slug']
        for k in ('overview', 'category', 'role', 'timeline', 'team', 'status', 'statusLabel', 'date'):
            v = proj.get(k)
            if isinstance(v, str):
                records.append(mk(f'{slug}.{k}', v))
        if isinstance(proj.get('publicIntro'), list):
            for i, para in enumerate(proj['publicIntro']):
                if isinstance(para, str):
                    records.append(mk(f'{slug}.publicIntro.{i}', para))
        if isinstance(proj.get('publicImgCaption'), str):
            records.append(mk(f'{slug}.publicImgCaption', proj['publicImgCaption']))
        if isinstance(proj.get('takeaways'), list):
            for i, tk in enumerate(proj['takeaways']):
                for k in ('label', 'text'):
                    if isinstance(tk.get(k), str):
                        records.append(mk(f'{slug}.takeaways.{i}.{k}', tk[k]))
        skim = SKIM.get(slug)
        if skim:
            if isinstance(skim.get('body'), str):
                records.append(mk(f'skim.{slug}.body', skim['body']))
            if isinstance(skim.get('metrics'), list):
                for i, m in enumerate(skim['metrics']):
                    for k in ('value', 'label'):
                        if isinstance(m.get(k), str):
                            records.append(mk(f'skim.{slug}.metrics.{i}.{k}', m[k]))
        blocks = CASE.get(slug, [])
        for bi, block in enumerate(blocks):
            walk(block, ['case', slug, f'b{bi}'], records)
    return records


def escape_for_quote(text, quote):
    # Re-escape a plain string for insertion between `quote` chars, matching
    # how the parser un-escaped it (backslash-escapes were preserved
    # verbatim as literal characters during parsing, so a naive re-insert
    # is safe UNLESS the new text introduces an unescaped instance of the
    # delimiter itself or a raw backslash -- guard both.
    out = []
    for ch in text:
        if ch == '\\':
            out.append('\\\\')
        elif ch == quote:
            out.append('\\' + quote)
        elif quote == '`' and ch == '\n':
            out.append(ch)  # template literals allow real newlines
        else:
            out.append(ch)
    return ''.join(out)


def main():
    with open(SRC, encoding='utf-8') as f:
        content = f.read()
    fresh = build_fresh_records(content)
    fresh_by_id = {r['id']: r for r in fresh}

    try:
        with open(EDITS_FILE, encoding='utf-8') as f:
            edits = json.load(f)
    except FileNotFoundError:
        print(f'No {EDITS_FILE} found -- fetch edits via ArtifactData first.')
        return

    changes = []
    missing_ids = []
    unchanged = 0
    for edit_id, edit in edits.items():
        new_text = edit.get('text')
        if new_text is None:
            continue
        rec = fresh_by_id.get(edit_id)
        if rec is None:
            missing_ids.append(edit_id)
            continue
        if new_text == rec['text']:
            unchanged += 1
            continue
        if '_pos' not in rec:
            print(f'WARNING: no position info for {edit_id}, skipping')
            continue
        changes.append({'id': edit_id, 'old': rec['text'], 'new': new_text, 'pos': rec['_pos']})

    print(f'{len(fresh)} fields in current file; {len(edits)} edits recorded;'
          f' {len(changes)} to apply, {unchanged} unchanged, {len(missing_ids)} orphaned ids.')
    if missing_ids:
        print('Orphaned ids (no longer found in file -- skipped):')
        for i in missing_ids:
            print('  -', i)

    if not changes:
        print('Nothing to apply.')
        return

    # Apply from the END of the file backwards so earlier offsets stay valid.
    changes.sort(key=lambda c: c['pos'][0], reverse=True)
    new_content = content
    for c in changes:
        start, end, quote = c['pos']
        escaped = escape_for_quote(c['new'], quote)
        replacement = quote + escaped + quote
        assert new_content[start:end] == quote + escape_for_quote(c['old'], quote) + quote, \
            f'position mismatch for {c["id"]}, aborting -- file may have changed'
        new_content = new_content[:start] + replacement + new_content[end:]

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f'\nWrote {OUT} with {len(changes)} change(s) applied:')
    for c in changes:
        print(f'  [{c["id"]}]')
        print(f'    - {c["old"][:80]!r}')
        print(f'    + {c["new"][:80]!r}')


if __name__ == '__main__':
    main()
