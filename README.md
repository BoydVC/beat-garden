# Beat Garden

Kid-friendly Web Audio drum pad + reactive bloom visualizer for Boyd (TokenMax burn). Char and Vic can tap on iPad/iPhone Safari — pure client-side oscillators/noise, no CDN samples.

**Hard rule:** offline-first playground. Patterns live in `localStorage`. No cloud agents. No external audio CDN for core play.

## Screens

1. **Play** — 16-pad garden grid, BPM, play/stop, bloom visualizer  
2. **Sequencer** — 8- or 16-step grid, save/clear pattern  
3. **Kits** — 4 EXAMPLE kits (Garden, Space, Arcade, Rain)  
4. **About** — how it works  

## Run

```bash
./run.sh          # build + serve http://127.0.0.1:4302/
./run.sh --shots  # + screenshots/
```

Offline single file: `dist/beat-garden.html`

## Layout

- `web/` — index.html, app.css, app.js  
- `data/kits.json` — EXAMPLE kits (embedded into dist)  
- `build.py` / `server.py` / `tests/screenshot.sh`

## Notes

Browsers block audio until a gesture — the big **Tap to start audio** gate unlocks Web Audio. Keyboard: `1`–`0` + `Q`–`Y` map to the 16 pads; Space toggles the sequencer.


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/beat-garden` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
