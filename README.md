# Japanese Flashcards App

A lightweight, browser-based Japanese vocabulary flashcard app. No frameworks, no build step — just open `index.html`.

## Features

- **561 vocabulary cards** across Lessons 1–10 (Genki-style university course)
- **Flashcard mode** — flip between Japanese and English, hear native pronunciation
- **Quiz mode** — type your answer and get instant feedback
- **Spaced repetition** — cards are scheduled at 1 / 3 / 7 / 14 / 30-day intervals so you review what you need
- **Lesson filter** — study one lesson at a time or all at once
- **Status filter** — show all cards, due today, still learning, known, or marked again
- **Speech synthesis** — plays Japanese audio using your browser's built-in voices
- **Progress export / import** — save your progress as a JSON file and restore it anytime
- **Keyboard shortcuts** — navigate and mark cards without touching the mouse

## Getting Started

No installation required.

1. Clone or download this repo
2. Open `index.html` in any modern browser
3. Select a lesson and start studying

```bash
git clone https://github.com/harry924/japanese-flashcards.git
cd japanese-flashcards
open index.html   # macOS
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Flip card |
| `→` | Next card |
| `←` | Previous card |
| `K` | Mark "I knew it" |
| `A` | Mark "Study again" |
| `S` | Play pronunciation |

## Vocabulary Coverage

| Lesson | Topic | Words |
|--------|-------|-------|
| 1 | Greetings, nationalities, occupations | 38 |
| 2 | Demonstratives, items, hobbies | 46 |
| 3 | Locations, existence (あります/います) | 67 |
| 4 | Daily activities, days, transportation | 81 |
| 5 | Adjectives, daily life, feelings | 39 |
| 6 | Descriptions, shopping, body parts | 96 |
| 7 | Plans, intentions, dictionary-form verbs | 44 |
| 8 | て-form verbs, instructions, giving/receiving | 49 |
| 9 | て-form adjectives, listing activities (〜たり) | 52 |
| 10 | Plain forms, experiences (〜たことがある), comparisons | 49 |

## Spaced Repetition Schedule

When you mark a card **"I knew it"**, it is scheduled for review after:

**1 day → 3 days → 7 days → 14 days → 30 days**

Marking a card **"Study again"** resets it to due immediately. The **Due today** filter shows only cards that need review right now.

## Tech

Pure vanilla HTML / CSS / JavaScript. No dependencies, no build tools.

- `index.html` — app shell and UI
- `style.css` — styles (supports light and dark mode)
- `vocab.js` — vocabulary data (561 entries with lesson numbers)
- `app.js` — all app logic
