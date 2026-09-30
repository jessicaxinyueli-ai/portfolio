# Case Study Copy Editor — sync workflow

Jess can freely edit all case-study copy in one place:
**https://claude.ai/artifact/GwAhid1CYXAhugo4DVtapf**

That page is a Claude Artifact (private, capability `db`). Every editable
string in `this.PROJECTS`, `this.SKIM`, and `this.CASE` inside
`Jess Li - Portfolio.dc.html` is shown there grouped by case study and
section, as a plain textarea. Edits autosave into the artifact's own
`edits` collection (one doc per field, keyed by a stable dotted id like
`case.sailpoint.b3.metrics.1.desc`). Nothing on the live portfolio changes
until a sync is run — the portfolio itself has no backend, so this can't
be instant/automatic. A small pencil icon next to the theme toggle in the
site's nav links to the editor.

## How to sync (run this whenever Jess asks to "sync the case study copy")

1. **Pull the current edits** from the artifact's database with the
   `ArtifactData` tool:
   - `action: "list"`, `url: "https://claude.ai/artifact/GwAhid1CYXAhugo4DVtapf"`,
     `collection: "edits"`. Page through with `query.cursor` if there are
     more than the default page size (there won't be — at most ~479
     possible docs, one per editable field).
   - Build a JSON object `{ "<id>": {"text": "...", "updatedAt": ...}, ... }`
     from the results and write it to `scripts/copy-editor/edits.json`.

2. **Run the sync script**:
   ```bash
   cd "scripts/copy-editor" && python3 sync.py
   ```
   This re-parses the *current* `Jess Li - Portfolio.dc.html` fresh (a
   small hand-rolled JS-literal parser in `jsparse.py` — handles this
   file's dialect: unquoted keys, single/double/backtick strings, nested
   arrays/objects, and skips non-literal JS expressions it doesn't need to
   touch). It matches each edit by id against the freshly-parsed fields,
   and for every field where the edited text differs from what's
   currently in the file, splices the new string in at its exact
   character offset (verified against the old text first — it asserts
   before writing, so a mismatch aborts loudly instead of silently
   corrupting the file). Ids that no longer exist in the file (e.g. a
   block was manually restructured since the edit was made) are reported
   and skipped, never guessed at.

   Output: `scripts/copy-editor/synced-output.dc.html` (a new file — the
   real source isn't touched yet) plus a printed summary of every
   before/after change.

3. **Review the diff** printed by the script (and/or `diff` the two
   files), then copy `synced-output.dc.html` over the real
   `Jess Li - Portfolio.dc.html`, verify in the browser preview as usual
   (reload, check console, spot-check a couple of the changed case
   studies), and commit + push.

4. **Clean up**: delete the synced docs from the artifact's `edits`
   collection once they've landed on the live site (`ArtifactData`
   `action: "delete"` per id, or leave them — they're harmless and just
   mean that field will show as "already edited" if Jess reopens the
   editor, which is accurate).

## Regenerating the editor's field list

The editor's own data file (`case-copy-data.json`, published alongside
`editor.html` as one of the artifact's own files) only needs
regenerating if the *shape* of the case-study data changes — a block
gets added/removed/reordered in `this.CASE`, a new project is added to
`this.PROJECTS`, etc. Content-only edits (the whole point of this system)
never require it.

To regenerate: re-run the extraction logic (same `TEXT_KEYS`/`SKIP_KEYS`
whitelist and `walk()` structure as `sync.py`'s `build_fresh_records`, but
grouped into the nested `{projects: {slug: {title, sections: [...]}}}`
shape the editor's UI expects — see this repo's git history around
2026-09-30 for the original `extract.py` that built it) against the
current file, strip any `_pos` fields (position data is sync-time-only,
never shipped to the artifact), and republish `case-copy-data.json` to
the same artifact URL via the `Artifact` tool (`files` param, same
`url`).

## Why this shape

- **No backend on the portfolio itself** — it's a static file on Vercel.
  So the artifact can't push to the live site directly; syncing is a
  deliberate, reviewable step (matches how every other change to this
  site already goes: edit → verify → commit → push).
- **Position-based patching, not text search** — some copy fields share
  identical or near-identical text elsewhere in the file. Matching by
  exact character offset (re-derived fresh at sync time by re-parsing,
  never cached) means a sync can never accidentally patch the wrong
  occurrence of a string.
- **Ids are structural, not content-based** — `case.sailpoint.b3.metrics.1.desc`
  encodes "block 3, metrics array, index 1, desc field" so edits stay
  correctly matched even if the *text itself* changes completely; they'd
  only go stale if blocks are reordered/added/removed, which this system
  doesn't support (see "Regenerating" above).
