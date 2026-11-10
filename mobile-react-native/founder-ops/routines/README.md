# Routines (scheduled Claude agents)

Live on claude.ai under Routines. Each fires a fresh session; the prompt is stored with the routine. Pause or edit them there.

| Routine | ID | Schedule (IST) | Does | Writes to |
|---|---|---|---|---|
| Cheeku nightly investor research | `trig_015GgGQFXhzA5gbDYx3Uv59C` | 00:37 daily | Researches queued investors; adds up to 8 new seed investors; Sundays: refreshes grants | Raise tracker `investors`, `grants`, `meta/nightly` |
| Cheeku daily: competition tracker | `trig_01NnY3aEs9U4T2ckn21y6AEn` | 06:37 daily | Healthtech news and spikes: India first, then USA, UK; regulation | Email only |
| Cheeku daily: growth and marketing spikes | `trig_01DuzE1LV9CRBN11UX9BadQ4` | 06:43 daily | Rotating deep looks at 3 or 4 players: users, channels, playbook, sentiment; tactics to copy | Email only |
| Cheeku daily: seed investor signals | `trig_01MZeeaHH7RtoxSBHeB52a8x` | 06:49 daily | New seed and pre-seed rounds and investor signals in India; adds up to 5 investors a day | Email; raise tracker `investors`, `meta/intel` |

All use Claude's built-in web search (no connectors can be stored on routines in this org). Emails go to the account owner; forward to Deepesh with a mail rule.
