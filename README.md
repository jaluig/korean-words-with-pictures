# 그림 단어 — Korean words with pictures

A personal Korean vocabulary trainer with **no translations**: every word is learned through a picture.

- 🃏 **Flashcards (Anki-style spaced repetition)** — the front shows the Korean word, the back shows a picture and example sentences.
  Rate yourself with 다시 / 어려움 / 알맞음 / 쉬움 and the card comes back at the right time.
  Optional reverse cards (picture → word) unlock once a word is learned.
- 🔍 **Hover pictures in sentences** — every dotted word in an example sentence shows its own picture when you hover (or tap) it. Tap again to open that word.
- 📖 **Picture stories** — 25 short stories made from the word list, with hover pictures, read-aloud and a story quiz
  (match each sentence to its scene). Plus a page of random example sentences for the words you already know.
- 🎮 **Games** — picture quiz, word quiz, listening quiz, sentence gap-fill, memory pairs, typing, 60-second speed O/X
  and sentence building (put the word blocks in order).
- 🧠 **About 1,070 words in 9 levels**, roughly ordered by how common and how easy to picture they are, each with 2–3 example sentences.
- 🎧 Optional listening cards (hear → recall the picture), "learn this word now", choose topics/levels for new cards.
- 📝 Personal notes per word, 🏅 achievements, and a 🏳️ "picture is confusing" flag (Settings shows the list to copy).
- 🔊 Korean audio via your browser's text-to-speech (install a Korean voice in your OS if you hear nothing).
- 📈 Stats, streaks, heatmap and review forecast. Progress is saved in your browser (export/import in 설정).
- 📱 Works on phone (bottom tab bar, tap instead of hover) and can be added to the home screen; works offline after the first visit.

## Open it

**GitHub Pages:** Settings → Pages → *Build and deployment* → Source: **Deploy from a branch** → pick this branch and `/ (root)` → Save.
After a minute the site is at `https://<your-user>.github.io/korean-words-with-pictures/`.

**Locally:** just open `index.html` in a browser (no build step, no server needed).

## How the pictures work

Pictures are small scenes composed from [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (3D style, MIT license)
plus simple shapes, described by a tiny text format in `data/*.js`, e.g.

```js
add('가다', 'v', 'action', 'bg street | 🏠 14 52 26 | 🚶 34 62 30 f m36,0 du3 | 🏫 84 50 32 | arrow 30 90 74 90 blue',
    '{학교}에 {가요|가다}.');
```

`{form|lemma}` marks a word in a sentence so it gets a hover picture. See the comment at the top of `js/scene.js` for the scene syntax.

### Adding words

1. Add `add(...)` lines to a file in `data/` (or a new file).
2. Run `node tools/build.js` — downloads any new emoji images into `img/e/`, updates `index.html` and checks the data.
   `node tools/build.js --missing` lists words used in sentences that don't have their own card yet.

## Credits

- Emoji images: Microsoft Fluent Emoji — MIT License.
- Fonts: Noto Sans KR, Gowun Dodum, Nanum Pen Script (Google Fonts, OFL).
