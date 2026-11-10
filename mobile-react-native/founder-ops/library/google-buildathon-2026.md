# Startup Buildathon India 2026: fit check

Source: startupbuildathon.com and the Hack2skill terms (hack2skill.com/event/buildathon/tnc), read 4 Nov 2026.

## What it is
- Run by Google DeepMind and Google Cloud, with Hack2skill, nasscom and HeadStart. Free.
- Applications close 13 Nov. Shortlist by 18 Nov.
- City buildathon 20–21 Nov, in person, in one of 10 cities (Delhi, Bengaluru, Mumbai, Pune, Hyderabad and others). You build a product over two days and present it to a jury.
- Regional showcases for business mentors and investors: Gurugram 23 Nov, Mumbai 25 Nov, Hyderabad 27 Nov.
- Grand finale 2 Dec at Google Bengaluru.
- Top 10 each get USD 5,000 cash (less TDS, paid within 60 days) plus USD 5,000 in Google AI and Cloud credits.
- Who can apply: existing early-stage startups with a new product idea, and aspiring founders. Must be AI-powered.
- Application asks for: idea, solution, architecture, pitch deck.
- Judging: founder profile, product potential, market viability, technical architecture, depth of Google AI and Google Cloud use.

## Fit by criterion
| Criterion | Cheeku | Notes |
|---|---|---|
| Founder profile | Strong | 2nd-time founder, IISc and SigTuple clinical AI, 12 years in health commerce |
| Product potential | Strong | Clear problem; V1 is live and the family has used it for a year |
| Market viability | Strong | 12,000+ pincodes, partner network, staged revenue |
| Technical architecture | Strong | Memory layer, clinician rules, safety router |
| Google AI use | Weak today | Runs on frontier APIs. The build has to be Gemini-native to score here |

## Risks
1. IP clause. Participants give the organiser a 6-month right of first refusal on any exclusive licence or sale of materials submitted, including work built before the event. It does not stop an equity raise, but a seed lawyer may ask about it. Submit only a new, separate module and a high-level deck. Never submit core source code or the memory schema. Ask support to confirm scope in writing.
2. Timing. 20 Nov to 2 Dec overlaps the angel close and December pre-launch. Going all the way costs two founders about 5 days.
3. Small prize. About ₹4 lakh cash. The real value is time with Google, a path to the Google for Startups AI programmes and larger credits, and investor rooms at the regional showcases.
4. Health demos get judged hard on safety. Keep the safety router visible in the demo.

## What to build
A new product, not Cheeku itself: a Hindi and English voice health companion on Gemini Live. It reads a lab report photo with Gemini, explains it in plain language, flags red values through our clinician-signed rules, and saves the result to the family memory. MedGemma (Gemma family) handles report understanding, and it runs on Cloud Run with Firestore. This also fits the deck's own-model story, since Gemma is open weights.

## Odds (estimate, no published numbers)
- City shortlist: high, given a working V1 and the team.
- Regional showcase: likely if the two-day build is Gemini-native and demos cleanly.
- Top 10 nationally: roughly 10–20%. Hack2skill events draw thousands of applicants.
