# rx-score

The prescription scorecard. `rx.ts` holds the ten checks, the starter formulary and the code that gathers a person's records; `index.ts` is the Edge Function around it. The app keeps an exact copy as `mobile-react-native/src/lib/rx/engine.ts` (Metro, Vercel and EAS build from that folder and cannot bundle code outside it), used as its fallback when the function is not deployed and by its tests. `src/lib/rx/engine-sync.test.ts` fails if the two differ: after changing `rx.ts`, run `cp ../supabase/functions/rx-score/rx.ts src/lib/rx/engine.ts` from `mobile-react-native`.

Deploy: `supabase functions deploy rx-score` after migration 0042. JWT verification stays on.

Regenerate the dashboard paste file after changing either file:

```bash
cd supabase
{ printf '// rx-score, as ONE file for the Supabase dashboard editor ...\n\n'; cat functions/rx-score/rx.ts; printf '\n'; grep -v '^import { scoreAndStore' functions/rx-score/index.ts; } > manual/0042-rx-score-function-paste.ts
```
