# AI unit costs and embeddings (Suraj's research, 7 Nov 2026)

Source: two notes from Suraj, "AI Model Price Comparison for Cheeku" and
"Embeddings in Cheeku", prices checked 7 Nov 2026 at $1 = ₹94.05. They are
estimates from public pricing pages, not quotes. Use this file as the
reference for any cost-per-chat, voice, OCR or embedding number in decks,
pitches or the financial model.

## Unit costs to use

Chat turn = a RAG turn of about 3,000 tokens in and 300 out.

| Work | Best option today | Cost | Alternatives |
|---|---|---|---|
| Chat turn | Sarvam 105B, Groq GPT-OSS 120B, Claude Haiku 5.5 | ₹0.04 to ₹0.06 | Sonnet 5.5 ₹0.85, Gemini 3.1 Pro ₹0.90, Gemini 3.8 Flash ₹0.32 (₹0.63 from 1 Jan) |
| OCR, one page | Gemini Flash-Lite / Flash | ₹0.20 to ₹0.30 (Flash doubles to ₹0.60 on 1 Jan) | Sarvam Parse ₹0.50 (Indian scripts), Sarvam Extraction ₹1.00, Sonnet 5.5 ₹1.05 |
| Speech to text, per minute | Sarvam STT | ₹0.49 | Deepgram ₹0.49, ElevenLabs ₹0.34, Groq Whisper ₹0.06 (weak on Indian accents and drug names) |
| Text to speech, per 1,000 chars | Sarvam Bulbul v4 Flash | ₹2 (₹1 offer ends 12 Nov) | Gemini Flash-Lite TTS ₹0.92, ElevenLabs v3 ₹7.52 |
| Translation, per 1,000 chars | Sarvam Translate | ₹2 | |
| One voice turn | Sarvam end to end | about ₹1.5 to ₹2 | 15 s audio in, 500-char reply translated and spoken |
| Embedding | self-hosted, no per-use charge | ~₹0 (server RAM and CPU only) | OpenAI 3-small about ₹0.003 per two-page report |

Free tiers: Sarvam ₹100 one-time credit; Gemini free tier exists but Google
may use inputs to improve its products, so **never send real patient data
through free-tier Gemini**. Deepgram $200 credit. Claude has no free tier.

Risk: Groq no longer lists public prices for `llama-3.3-70b-versatile` and
`llama-3.1-8b-instant`, the two models in the backend `config.py`. The current
chat default may lose pay-as-you-go.

## Embeddings, how they work in Cheeku

- An upload is processed three ways: Parse (picture to text,
  `gemini_service._transcribe`), Extraction (picture to named values,
  `readers.py`), Embedding (parsed text to vectors, `embeddings.py`).
- One shared `all-MiniLM-L6-v2` model runs in the API server's memory. No
  provider call, nothing on devices. Vectors (384 numbers) live in Supabase
  pgvector, tagged by patient ID; search only touches that patient's chunks.
- Text is cut into fixed 500-character chunks (`parser.py`), even mid-word.
- Problem: MiniLM is effectively English-only (2021), not medical, 256-token
  limit. Hindi, regional and Hinglish text ("mera sugar kaisa hai") is
  searched badly, which breaks the Indic and Sarvam OCR plans.
- Plan: switch to `multilingual-e5-small` (about 100 languages, free,
  self-hosted, still 384 numbers, so no schema change; needs `query: ` /
  `passage: ` prefixes). Re-embed every chunk; never mix vectors from two
  models. Test 20 to 30 English, Hindi and Hinglish questions first. Split
  chunks on lines or table rows so "Haemoglobin" and "11.2" stay together.
- Later options: Qwen3-Embedding-0.6B cut to 384; or OpenAI
  text-embedding-3-small at 384 to drop PyTorch (sends text to a third party).

## What it means for Cheeku's numbers and story

1. **Chat is cheaper than the model assumes.** The engine uses ₹0.30 a chat
   for the first six months on rented APIs (`cpcRented`) and ₹0.10 to ₹0.06
   after (`cpcOwn`). Good small hosted models already cost ₹0.04 to ₹0.06.
   The 2027 cost to serve is conservative, which is fine, but "own GPUs make
   chat cheap" no longer stands on cost alone. Frame owning the model around
   quality on Indian clinical evals, Indic voice, control, data staying in
   India and licensing, and compare our ₹0.06 against frontier models
   (₹0.85 to ₹0.90), not against the cheap tier.
2. **Voice is the expensive part.** The engine uses ₹1.52 a voice minute in
   2027 (`voiceCost`). At about ₹2 a turn and one to two turns a minute, real
   cost is closer to ₹3 to ₹4 a minute, so 2 to 3 times the plan. Keep voice replies short,
   run STT in translate-to-English mode, and keep heavy voice in paid tiers
   or capped for free users.
3. **OCR is a real per-user cost** (₹0.20 to ₹1 a page) with no separate line
   in the engine. A family uploading ten pages a month costs ₹2 to ₹5. Gemini
   Flash pricing doubles on 1 Jan 2027, right at launch.
4. **Indic is not done until search is multilingual.** Reading a Hindi
   report well and then searching it with an English-only embedder undercuts
   the family memory moat. The e5 switch is cheap and should land before
   launch.
5. **Data residency.** Sarvam is Indian and self-hosted embeddings keep text
   on our server, which fits DPDP and the "data stays in India" line in the
   decks. Gemini, Claude and OpenAI calls send patient text abroad: paid
   tiers only, consented, and say so honestly in diligence.
6. **Model choice is an eval question.** Price does not separate the cheap
   chat models, so run `evals/run.py` on Sarvam 105B, GPT-OSS 120B and Haiku
   5.5 before the Groq Llama models lose public pricing.
