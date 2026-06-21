# Sample scripts for Souffleur testing/demo

Real, verified, freely-licensed scripts to use as test/demo content for Souffleur's
import pipeline. I could not have an AI agent bulk-copy the full verbatim text of
these documents through chat (long-form verbatim reproduction is blocked
regardless of public-domain status), so instead: run `download_sources.sh` on your
own machine (not in a sandboxed environment) to pull each file directly from its
original source into the matching folder below. The script only contains URLs and
shell commands — no copyrighted or long-form text passes through me.

## What's confirmed and ready to download

| # | Category | Title | Why it's free to use/commercialize |
|---|---|---|---|
| 01 | Shakespeare tragedy | **Macbeth** (Shakespeare, 1606) | Public domain worldwide |
| 02 | Theater tragedy (not Shakespeare, not in alexandrine verse) | **Riders to the Sea** (J.M. Synge, 1904) | Author died 1909 — fully public domain |
| 03 | Theater comedy (prose, not verse) | **The Importance of Being Earnest** (Oscar Wilde, 1895) | Public domain |
| 04 | Movie thriller | **Night of the Living Dead** (1968) | Public domain from day one — the 1968 print accidentally shipped without the required copyright notice |
| 05 | Movie comedy | **His Girl Friday** (1940) | PD since 1968 (copyright not renewed). The underlying 1928 play it's based on, *The Front Page* (Hecht & MacArthur), also entered the public domain Jan 1, 2024 — so the lingering derivative-rights question is now resolved too |
| 08 | Monologue/speech | **The Gettysburg Address** (Lincoln, 1863) | Public domain |

## What I could NOT confirm (two categories need a decision from you)

**06 — "Sitcom thriller" → swapped for a TV suspense/anthology episode:**
I found *Tales of Tomorrow: "Frankenstein"* (1952, starring Lon Chaney Jr.), almost
certainly public domain like most surviving live kinescope TV from that era — but
there is no published *script* document anywhere, only the broadcast recording on
archive.org, plus a rough machine-generated caption transcript (not a clean
teleplay — it's auto-generated ASR text with errors). I included a link to both,
but neither is a real "script" in the sense Souffleur needs.

**07 — Sitcom comedy:**
Specific episodes of *The Andy Griffith Show* and *The Dick Van Dyke Show* are
confirmed public domain (lapsed renewals), but I could not find any publicly
available script/teleplay document for either — only the broadcast videos.
The actual paper scripts exist in physical archives (e.g. the National Comedy
Center holds the *Dick Van Dyke Show* scripts) but aren't published online.

Options for 06/07: (a) drop them, (b) use the video + auto-captions as a rough
stand-in for testing transcription-style import instead of PDF import, or
(c) tell me and I'll look for a different, better-documented title.

## Folder structure

```
sample-scripts/
  01-theater-shakespeare-tragedy/
  02-theater-tragedy/
  03-theater-comedy/
  04-movie-thriller/
  05-movie-comedy/
  06-tv-anthology-thriller/   (video + rough auto-transcript only, see above)
  07-sitcom-comedy/           (empty — no script document found)
  08-monologue-speech/
```
