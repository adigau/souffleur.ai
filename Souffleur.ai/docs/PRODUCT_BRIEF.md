# Souffleur — Product Brief

> Living document. Updated whenever a feature is added, changed, or cut.
> Last updated: 2026-06-12

## What it is

Souffleur helps stage actors, drama students, and teachers get **fully off book** — not just familiar with their lines, but able to recall them under the pressure of performance. It is the digital *souffleur*: the prompter hidden in the box at the front of the stage, script in hand, whispering only what you need, only when you need it.

## Who it's for

Stage actors working a role on a deadline, drama students juggling scenes, and teachers who need their students off book reliably. The emotional center is the moment of **blanking** — losing a line mid-scene, the small panic, the reach for the book. Souffleur exists to make that moment rarer and recoverable.

## The vision, in one line

Other apps help you *run* lines. Souffleur **measures your recall** and tells you exactly what to drill — it's the difference between rehearsing and knowing you're ready.

## The core loop

1. **Import or write a script.** Drop in a PDF and it's parsed automatically — cast, lines, cues, stage directions — or write one from scratch in a script editor that catches formatting mistakes as you type.
2. **Cast the scene.** Pick your role; choose a voice for every other character ("Claudius · 50s · gravelly"), preview it on a real line, recast anytime.
3. **Practice.** Solo Practice runs the scene with you, climbing a difficulty ladder from hearing everything to full off-book. Quiz Mode fires your cues out of sequence. The app listens: it knows when you've delivered the line, hesitated, or stalled — and when you stall, it whispers just the first few words, like a real prompter.
4. **Get coached.** After a session: how far off book you are ("84% off book · 8 lines hesitated · 2 skipped twice"), a line-by-line heat map of shaky vs. locked-in, and a short list of exactly which lines to drill next.

## What it deliberately is NOT

Not an annotation tool · not a self-tape studio · not a casting marketplace · not an acting coach. It has **no opinion on your delivery, emotion, or interpretation**. Scope is narrow on purpose: memorization and recall, nothing more.

## Principles & tone

Quiet, specific, patient. It says "You skipped line 14 three times — run it again?" — never "your delivery felt flat" or "Rockstar! 🎉". An actor trusts a prompter because it stays in its box.

## Features — by the outcome they create

### v1 — the solo loop

| Feature | Outcome for the actor | Status |
|---------|-----------------------|--------|
| Script import (PDF) | Drop in a PDF and your play is ready to rehearse — cast, lines, cues, and directions already sorted. Fix anything the import got wrong. | exploring |
| Script editor | Write or correct a play directly in the app, with mistakes flagged as you type and explained in plain language. You can't end up with a script the app can't perform. | exploring |
| Reading mode | Read your script like the paper copy, but better: your lines highlighted, scenes color-coded, dark mode, your place remembered. | exploring |
| Listen mode | Hear the whole play performed line by line — in the background, on a walk — and absorb the rhythm before you drill. Tap any line to start there. | exploring |
| AI scene partners | Every other character has their own voice, cast by you from a curated library. Practising alone feels like the real thing. | exploring |
| Solo Practice | Run the scene hands-free — the app hears you deliver your line and moves on. Climb the ladder: hear everything → read along → first letters only → off book. | exploring |
| The prompter | Stall mid-line and it whispers the first few words — more only if you're still stuck. Never the whole line, never a lecture. | exploring |
| Italian run | Run the whole scene fast and flat — the classic speed-through for rhythm and cue recognition. | exploring |
| Quiz Mode | Get your cues out of order, the way they really come at you, weighted toward your shakiest lines. Proof it's recall, not recognition. | exploring |
| AI Coach | See exactly how far off book you are, which lines are shaky, and which six to drill before tomorrow's rehearsal. | exploring |
| Monologues & speeches | Paste a monologue, a speech, a best-man toast — anything you must say from memory drills the same way. No cast required. | exploring |
| Library | Every play you have access to, in one place, with its off-book progress at a glance. | exploring |
| Accounts | Sign in with Google, Apple, or email; manage profile and language; delete everything if you leave. | exploring |

### Roadmap — after the solo loop is proven

| Feature | Outcome for the actor | Status |
|---------|-----------------------|--------|
| Script sharing | Send your cast the play; everyone rehearses the same text. | planned |
| Collaborative editing | The troupe fixes the script together instead of emailing PDFs. | planned |
| Huddle Mode | Run lines together with your cast, remotely — the AI fills the missing roles. | not yet designed |
| Pronunciation fixes | Teach a voice how to say "Arpagon" once; it's right everywhere. | planned |
| Native mobile apps | The same Souffleur, in your pocket, offline in the rehearsal room. | planned |
| Marketing site | Anyone can understand what Souffleur is, see it, and pick a plan (free / solo / team). | planned |

### Deliberately deferred

- **Voice cloning** ("create your own AI voice") — consent and rights risk, the highest-cost feature, and it doesn't improve recall. "Describe a voice" generation is the safer path if demand appears.
- **Facebook login** — marginal reach, ongoing maintenance.
- **Simultaneous lines (`@Both:`)** — real but rare; the editor accepts the syntax, full voiced support comes later.

## v1 shape decisions

- **Web-first.** One installable web app (PWA) that works on phone and desktop; native apps come after the loop is proven.
- **The app listens.** Speech recognition is the core of rehearsal, not an add-on — it's what makes the Coach honest.
- **Voices stream and cache.** Audio is generated the first time a line plays and kept until the text changes — no waiting for a whole play to "bake," no regeneration tax on edits.
- **Team features wait.** v1 gets one actor off book, completely, before anything multiplayer.

---

## V1 feature specifications

What each v1 feature makes available to the user, screen by screen. This section is the reference for designing the v1 interfaces. Behavior only — no implementation detail.

### Library (home)

The screen the user lands on after signing in.

- A list/grid of every play the user has, each card showing: title, author, the role(s) the user plays, off-book percentage, and when it was last practiced.
- Two primary actions, always visible: **Import a PDF** and **Write a new script**.
- Card states: *processing* (import being parsed), *needs attention* (import finished with errors to review), *ready*. Audio is never a blocking state — plays are rehearsable as soon as the text is ready.
- Empty state for first-time users: a short explanation of the loop and the two creation actions. Optionally a sample public-domain scene to try instantly.
- Sort (recently practiced, title) and search across plays.

### Script import (PDF)

- Entry: file picker or drag-and-drop from the Library. Accepts any PDF.
- Processing state: progress indication with the play's name; the user can leave and come back (the Library card shows progress).
- Review step: the parsed result opens in the script editor, with anything the import was unsure about flagged as warnings (e.g. "Is OPHELIA a character or a heading?"). The user corrects and confirms.
- Confirmation step (shared with the editor's finish flow): a cast list is shown — for each character, set a default voice gender; set the play's language (pre-filled, detected from the text); mark which character(s) are *yours*.
- Failure state: if the PDF can't be parsed at all, the user gets the raw extracted text in the editor plus the syntax cheat-sheet — never a dead end.

### Script editor

A code-editor-like surface for writing or correcting scripts.

- Creating a new script asks for two fields first: play title and author. The editor then opens pre-filled with a short self-explaining sample script that teaches the syntax.
- Syntax: `# Act/Scene` headings · `@Character` followed by a line break starts a cue · text in parentheses is a stage direction (shown, never vocalized) · `@Both:Character A+Character B` marks simultaneous lines (accepted, voiced later).
- Editor affordances: line numbers, syntax coloring (scene headings, character names, directions each have a color), and autocomplete of existing character names when typing `@` — typing a new name creates the character.
- Errors and warnings: flagged inline with an icon on the line, a plain-language label on hover/tap, and a persistent summary bar at the bottom ("2 warnings"). Saving requires zero errors; warnings don't block.
- A dismissible syntax cheat-sheet panel for first-time users ("It's up to you!" card): the four rules, with examples.
- Finishing: a **Done** action leads to the same confirmation step as import (genders, language, your role).

### Reading mode

- The play rendered like a clean paper script, split by act and scene, with an act/scene dropdown for navigation.
- Color coding: acts, scene headings, character names, and stage directions are visually distinct; the user's own lines are highlighted so they can be found at a glance.
- Display settings: font size, light/dark background.
- Position is remembered: reopening a play returns to the last-read scene.

### Listen mode

- Every scene has a **Play** action; lines are performed one after another, each in its character's cast voice; scenes advance automatically to the end of the play.
- The currently spoken line is highlighted and kept in view.
- Tapping any line while stopped starts playback from that line.
- Pause/resume at any time. Playback continues in the background when the user switches apps; system media controls (lock screen / notification) show play/pause and the play's title.
- Playback speed control (this is also where **Italian run** lives — see below).
- If a line's audio isn't generated yet, a brief loading shimmer on the line; playback waits, never skips.

### AI scene partners (casting)

- A **Cast** screen per play: every character listed, the user's own role(s) marked distinctly.
- For each other character: pick a voice from a curated library (10–20 voices), each described with simple tags ("50s · gravelly · intense") rather than technical names.
- **Preview in context**: tapping a voice plays one of that character's actual lines from this play.
- Recasting is allowed anytime; previously generated audio for that character is replaced silently.
- A sensible default cast is pre-assigned from the genders set at confirmation, so casting is a refinement, not a chore.

### Solo Practice

The heart of the app. The user rehearses a scene; the app performs everyone else and listens for the user's lines.

- **Setup (one light screen or sheet):** choose scene(s), choose the ladder level, optionally adjust the response window (how patient the prompter is).
- **The ladder — four levels, chosen per session:**
  1. **Listen first** — the user's lines are performed too; absorb the rhythm.
  2. **Read along** — the user's line is shown in full; they deliver it themselves.
  3. **First letters** — only the first letter of each word is shown.
  4. **Off book** — nothing is shown.
- **During a session:** the scene plays cue by cue. When the user's turn comes, a clear "your line" state appears with a listening indicator (microphone live). The app detects the line being delivered and advances on its own — the session is fully hands-free.
- On-screen controls (large, glanceable — the user may be across the room): pause, restart this line, restart the scene, loop the scene, ladder level switch.
- **Cue-only option:** only the lines immediately before the user's are performed — a fast drill for cue recognition.
- A session ends with the **Coach summary** (below).
- Microphone permission is requested at the first session, with one line of explanation. If declined, the session falls back to tap-to-advance and says so plainly.

### The prompter

The stall behavior inside Solo Practice and Quiz Mode.

- If the user is silent past the response window, the app whispers (audio + subtle on-screen text) the **first few words** of the line only.
- Still stuck → the next chunk. The full line is given only on the third prompt or on explicit request ("Give me the line").
- A discreet **skip** is always available.
- Every prompt and skip is recorded for the Coach. The tone never comments — it prompts, exactly like the person in the box.

### Italian run

- A mode toggle within Solo Practice or Listen mode: the whole scene runs at elevated speed (1.5–2×, adjustable) with no response windows and no prompting — the classic flat speed-through for rhythm and cue recognition.
- The user speaks along; nothing is measured. One control: speed.

### Quiz Mode

- Per play or per scene: the app fires **cues out of sequence** — it performs the line before the user's, and the user must answer with their line.
- Ordering is weighted toward the user's shakiest lines (from Coach data); new sessions favor lines not yet tested.
- Each item: cue plays → listening state → resolved as *delivered / hesitated / prompted / skipped* → next.
- A session is short and bounded (e.g. 10 cues) with a progress indicator and an end summary.
- Same listening, prompting, and fallback behavior as Solo Practice.

### AI Coach

- **Session summary (after every Solo Practice or Quiz session):** off-book percentage, counts of hesitated / prompted / skipped lines, and a focused drill list ("These 6 lines — run them again?") with a one-tap action to drill exactly those.
- **Play progress view (a tab on the play):** the off-book % over time, a **line-by-line heat map** of the user's lines (locked-in → shaky, as a color scale on the script itself), and the practice streak.
- Voice and tone everywhere: counts and facts, no judgment, no celebration. "You skipped line 14 three times — run it again?"

### Monologues & speeches

- A lighter creation path: paste or type a text with no cast — no characters, no casting step.
- The text is split into natural chunks; in practice modes the **previous chunk is the cue** for the next.
- Everything else works identically: ladder, prompter, Quiz, Coach.

### Accounts

- Sign up / sign in with Google, Apple, or email + password. The most recently used method is visually highlighted on return.
- Settings: name, photo, email, password, interface language, linked sign-in methods.
- Account deletion: self-serve, with a clear statement that scripts and progress are erased.

---

## Roadmap / what's next

1. Prove the rehearsal loop end to end on one script: import → cast → practice with listening → Coach summary.
2. Then the difficulty ladder + Quiz Mode (the recall engine).
3. Then sharing, then Huddle.

## Open questions & risks

- **Speech recognition reliability** is the riskiest assumption in v1: can it follow verse, archaic language, and deliberate paraphrase well enough to judge "delivered vs. stalled" without infuriating the actor? To be de-risked with a thin prototype before the rehearsal experience is built around it.
- **Voice cost at scale** — streaming + caching contains it, but a free tier needs a cost floor (system voices on free, premium voices paid?).
- **Rights** — imported scripts are often under copyright; the app never redistributes a user's text, and future sharing features must respect this.
- **Parsing reliability** — "any PDF" is a promise that's easy to break; the editor is the safety net when import stumbles.
- **Competitive overlap** — the editor syntax and error model closely follow Imparato's. The recall engine (Quiz, off-book %, heat map, Coach) is the moat; the editor is table stakes. Distinctive investment goes to the moat.
