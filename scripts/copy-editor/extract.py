import sys, json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from jsparse import parse, P

REPO_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(REPO_ROOT, 'Jess Li - Portfolio.dc.html')

TEXT_KEYS = {
    'text', 'title', 'heading', 'eyebrow', 'label', 'caption', 'desc', 'descA', 'descB',
    'body', 'overview', 'value', 'beforeCaption', 'afterCaption', 'beforeLabel', 'afterLabel',
    'badge', 'note', 'startPill', 'endPill', 'sharedCaption', 'category', 'role', 'timeline',
    'team', 'status', 'statusLabel', 'publicImgCaption', 'date',
}
CONTAINER_KEYS = {'metrics', 'items', 'notes', 'stats', 'slides', 'steps', 'publicIntro', 'takeaways'}
SKIP_KEYS = {
    'type', 'icon', 'iconD', 'dir', 'ratio', 'beforeRatio', 'afterRatio', 'img', 'images',
    'beforeImg', 'afterImg', 'videoSrc', 'videoSrcs', 'videoMaxW', 'ax', 'ay', 'lx', 'ly',
    'qx', 'qy', 'w', 'topPct', 'v', 'num', 'locked', 'slug', 'noVidControls', 'video',
    'caseCover', 'publicImg', 'publicVideo', 'noPublicVideo', 'noCoverVideo',
}


def find_quote_char(src_text, key_pos):
    """Given position right after 'key:', find which quote char follows (skipping ws)."""
    i = key_pos
    while src_text[i] in ' \t\r\n':
        i += 1
    return src_text[i] if src_text[i] in "'\"`" else None


def load_top(content, marker, bracket):
    idx = content.index(marker)
    b = content.index(bracket, idx)
    val, end = parse(content, b)
    return val


def walk(node, path_ids, path_label, records, project_hint=None):
    """node: parsed python value. path_ids: list forming dotted id. path_label: human label."""
    if isinstance(node, dict):
        if '__raw__' in node and len(node) == 1:
            return
        for k, v in node.items():
            if k in SKIP_KEYS:
                continue
            if isinstance(v, str) and k in TEXT_KEYS:
                records.append(mk('.'.join(path_ids + [k]), k, v, path_label))
            elif isinstance(v, (dict, list)):
                walk(v, path_ids + [k], path_label, records, project_hint)
            # else: ignore (number atom, raw expr, unrecognized short string key)
    elif isinstance(node, list):
        for i, item in enumerate(node):
            walk(item, path_ids + [str(i)], path_label, records, project_hint)


def mk(id_, key, v, label):
    rec = {'id': id_, 'key': key, 'text': str(v), 'label': label}
    if hasattr(v, 'start'):
        rec['_pos'] = [v.start, v.end, v.quote]
    return rec


def block_summary(block):
    for k in ('heading', 'eyebrow', 'text', 'caption', 'label'):
        v = block.get(k)
        if isinstance(v, str) and v.strip():
            s = v.strip().replace('\n', ' ')
            return (s[:70] + '…') if len(s) > 70 else s
    return block.get('type', 'block')


def main():
    with open(SRC, encoding='utf-8') as f:
        content = f.read()

    PROJECTS = load_top(content, 'this.PROJECTS = ', '[')
    SKIM = load_top(content, 'this.SKIM = ', '{')
    CASE = load_top(content, 'this.CASE = ', '{')

    doc = {'projects': {}}

    for proj in PROJECTS:
        slug = proj['slug']
        title = proj.get('title', slug)
        entry = doc['projects'].setdefault(slug, {'title': title, 'sections': []})

        # --- Overview / meta fields ---
        meta_records = []
        for k in ('overview', 'category', 'role', 'timeline', 'team', 'status', 'statusLabel', 'date'):
            v = proj.get(k)
            if isinstance(v, str):
                meta_records.append(mk(f'{slug}.{k}', k, v, k))
        if meta_records:
            entry['sections'].append({'name': 'Project Info', 'fields': meta_records})

        # --- publicIntro (locked teaser paragraphs) ---
        if isinstance(proj.get('publicIntro'), list):
            recs = []
            for i, para in enumerate(proj['publicIntro']):
                if isinstance(para, str):
                    recs.append(mk(f'{slug}.publicIntro.{i}', f'paragraph {i+1}', para, f'Intro paragraph {i+1}'))
            if recs:
                entry['sections'].append({'name': 'Password-Gate Intro', 'fields': recs})

        if isinstance(proj.get('publicImgCaption'), str):
            entry['sections'].append({'name': 'Password-Gate Image', 'fields': [
                mk(f'{slug}.publicImgCaption', 'caption', proj['publicImgCaption'], 'Caption')
            ]})

        # --- takeaways ---
        if isinstance(proj.get('takeaways'), list):
            for i, tk in enumerate(proj['takeaways']):
                recs = []
                for k in ('label', 'text'):
                    if isinstance(tk.get(k), str):
                        recs.append(mk(f'{slug}.takeaways.{i}.{k}', k, tk[k], k.capitalize()))
                if recs:
                    entry['sections'].append({'name': f'Key Takeaway {i+1}', 'fields': recs})

        # --- SKIM (Home card summary) ---
        skim = SKIM.get(slug)
        if skim:
            recs = []
            if isinstance(skim.get('body'), str):
                recs.append(mk(f'skim.{slug}.body', 'body', skim['body'], 'Summary body'))
            if recs:
                entry['sections'].append({'name': 'Home Card Summary', 'fields': recs})
            if isinstance(skim.get('metrics'), list):
                for i, m in enumerate(skim['metrics']):
                    recs2 = []
                    for k in ('value', 'label'):
                        if isinstance(m.get(k), str):
                            recs2.append(mk(f'skim.{slug}.metrics.{i}.{k}', k, m[k], k.capitalize()))
                    if recs2:
                        entry['sections'].append({'name': f'Summary Metric {i+1}', 'fields': recs2})

        # --- CASE blocks (full case study body) ---
        blocks = CASE.get(slug, [])
        for bi, block in enumerate(blocks):
            records = []
            walk(block, [f'case', slug, f'b{bi}'], None, records)
            if records:
                summary = block_summary(block)
                btype = block.get('type', '?')
                entry['sections'].append({'name': f'[{btype}] {summary}', 'fields': records, 'block_index': bi})

    # Flat list too, for the sync step
    flat = []
    for slug, entry in doc['projects'].items():
        for sec in entry['sections']:
            for f in sec['fields']:
                flat.append({**f, 'project': slug})

    # Strip sync-only position data before this ships to the artifact --
    # positions are stale the moment the file changes again, and are only
    # ever needed fresh, at sync time, by sync.py's own re-parse.
    def strip_pos(o):
        if isinstance(o, dict):
            o.pop('_pos', None)
            for v in o.values():
                strip_pos(v)
        elif isinstance(o, list):
            for v in o:
                strip_pos(v)
    strip_pos(doc)

    # case-copy-data.json is the file actually published alongside
    # editor.html on the artifact -- this writes it directly (no manual
    # rename step). doc_flat.json is just a debugging aid.
    with open(os.path.join(HERE, 'case-copy-data.json'), 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False)
    with open(os.path.join(HERE, 'doc_flat.json'), 'w', encoding='utf-8') as f:
        json.dump(flat, f, indent=2, ensure_ascii=False)

    print('Projects:', list(doc['projects'].keys()))
    for slug, e in doc['projects'].items():
        print(' ', slug, '-> sections:', len(e['sections']), ' total fields:', sum(len(s['fields']) for s in e['sections']))
    print('Total flat records:', len(flat))

    # sanity: check id uniqueness
    ids = [r['id'] for r in flat]
    dupes = {i for i in ids if ids.count(i) > 1}
    print('duplicate ids:', dupes)


if __name__ == '__main__':
    main()
