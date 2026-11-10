# Cheeku AI: the room pitch

2026-10-31 · Athar Ali

A 7-minute story for a room of investors. It opens on one family, widens to 140 crore people, and lands on the company that will hold India's health memory.

## The arc

One family's story carries the whole pitch. You tell it once without Cheeku, widen it to the country, then tell it again with Cheeku and follow where it leads.

1. **The moment (0:00 to 1:00).** One family, three reports, a trend nobody saw. *Slide: a single WhatsApp photo of a lab report.*
2. **The scale (1:00 to 2:00).** This family is 140 crore people. Ten years lived unwell, decided in the 90 days between doctor visits. *Slide: 70.8 vs 60.3.*
3. **Why now (2:00 to 2:40).** People already ask AI about their health; India has the rails; the cost finally works. *Slide: three shifts.*
4. **The replay (2:40 to 3:40).** The same family, with Cheeku. Remember, check, decide, book. *Slide: the demo, 30 seconds.*
5. **The engine (3:40 to 4:40).** Every answer and booking feeds a longevity engine; memory compounds. *Slide: the loop.*
6. **The endgame (4:40 to 5:30).** That memory trains India's own health model and becomes the risk layer insurers never had. *Slide: wrap, adapt, own, then insure.*
7. **The proof and the team (5:30 to 6:30).** Built with ₹0; the three people who could build exactly this. *Slide: three faces, three receipts.*
8. **The ask (6:30 to 7:00).** ₹26 cr, what it buys, and back to the family. *Slide: the report again, now with a booking card under it.*

## Script, part 1: the problem

### Beat 1. The moment

> Let me start with a WhatsApp message.
>
> It's 11 at night. Priya is in Gurugram. Her father is in Lucknow. He sends her a photo of a lab report, slightly blurred, with one line: "Doctor said it's fine, just a little high."
>
> Priya zooms in. HbA1c, 8.1. She scrolls up through the chat. Six months ago, 7.4. A year before that, 6.9. Three reports, three different labs, three different doctors. Every one of them saw a single number. Nobody saw the line going up.
>
> His dose was raised in March. His kidney test is four months overdue. Nobody told him, because nobody was holding the whole story.
>
> *(pause)*
>
> Priya is not a doctor. But in her family, she is the one who manages everyone's health. Every Indian family has a Priya. Maybe some of you are one.

### Beat 2. The scale

> Now multiply Priya by 140 crore.
>
> The average Indian lives to about 71. But healthy life expectancy is about 60. That means we spend more than ten years of our lives unwell. *(pause)* Ten years.
>
> And those ten years are not decided in the hospital. They are decided in the 90 days between doctor visits. What Papa eats tonight. Whether the new prescription makes sense. When his sugar gets checked again. A consult in India lasts about two minutes. Then the family is on its own, with Google and WhatsApp forwards, paying 39.4% of the bill from their own pocket.
>
> 10 crore Indians have diabetes. Another 13.6 crore are prediabetic. 31.5 crore have high blood pressure. And by 2050 there will be 34.7 crore Indians over 60. It all shows up in routine blood tests, years before a hospital bed. Families already pay for those tests. Nobody reads them over time. Nobody acts on them.
>
> India has 79.7 crore health IDs. The records exist. They sit in silos. Nobody owns the in-between.

### Beat 3. Why now

> Three things changed in the last two years.
>
> First, behaviour. 23 crore people a week now ask ChatGPT health questions. People have already decided they want an AI in their health. But a chatbot forgets you the moment you close it, knows nothing about Indian labs or medicine brands, and cannot book a single test.
>
> Second, rails. India built the health ID and the consent layer, and the DPDP rules make consented health data a real asset for the first time.
>
> Third, cost. A chat now costs under 20 paise, and subsidised GPUs through the IndiaAI Mission cost about ₹92 an hour. A generous free tier finally works.
>
> The demand is here. The rails are here. The cost works. What is missing is the company that holds the family's story and acts on it.

## Script, part 2: what we are building

### Beat 4. The replay

> Let me tell you Priya's story again. This time with Cheeku.
>
> Papa sends the same report. But he sends it to Cheeku.
>
> Cheeku already holds every report and prescription in that family, for every person, dated, with its source. So it doesn't see 8.1. It sees 6.9, then 7.4, then 8.1, over 18 months. It knows the metformin dose went up in March. It knows the kidney test is four months late.
>
> It doesn't diagnose. Rules signed by clinicians decide, and the model only explains. So Cheeku says, in Hindi, in plain words: "Your sugar has been rising for a year. Please see a diabetologist this week. I've also added the overdue kidney test to a home lab visit. Shall I book both?"
>
> Papa taps yes. A lab comes home on Saturday. Priya gets a note in the family thread. Nobody had to remember anything.
>
> *(show the demo, 30 seconds)*

### Beat 5. The engine

> That's one moment. Cheeku lives in all the others.
>
> It is a companion, 24 hours a day, by text and soon by voice in five Indian languages. Can Papa eat mango tonight? Cheeku answers for him, not for everyone: his numbers, his medicines, his goals. Is this cough worth a doctor? It sorts it into one of four urgency tiers, and for "go now" the model is bypassed and the family gets emergency steps and 112.
>
> Every prescription gets read down to its salts and checked against ten published standards. And when the next step is care, Cheeku books it in the same chat: home lab tests, doctors, dietitians, physio, elder care, across 12,000+ pincodes.
>
> Here is what makes it a business, and a moat. Every answer, every nudge, every booking and every result writes back into the family's memory. Daily nudges, a weekly review, a quarterly retest. That is our longevity engine. Each answer is better than the last, and after a few months, leaving Cheeku means starting your family's health story from zero.

### Beat 6. The endgame

> Now step back and look at what we are accumulating.
>
> Consented, coded, day-by-day health histories of Indian families, across every lab and every doctor. Nobody in India has this. Hospitals see episodes. Pharmacies see purchases. We see the 90 days in between, which is where health is actually decided.
>
> That data does two things no one else can do.
>
> First, it trains India's own health model. Today we run fine-tuned frontier models behind our safety router. In 2028 an adapted open model takes over, and in 2029 we build our own 15 to 22 billion parameter model on Indian labs, Indian medicine brands, Indic voice and consented family records. Every step ships only if it beats frontier APIs on our India evals. On our own model, an answer costs 6 paise instead of 24.
>
> Second, it becomes the risk layer insurers have never had. Today an Indian insurer prices a policy once and learns nothing until a claim arrives. We start with a wellness pilot, then a risk signal tied to their claims, then underwriting through the IRDAI sandbox. Rewards only; we never raise anyone's premium. At just 1% of health insurance, that layer is worth about ₹1,000 crore a year.
>
> So the companion is how we earn the family's trust. The memory is what we build. The model and the risk layer are what that memory becomes.

## Script, part 3: proof, team, ask

### Beat 7. The proof and the team

> You might think this is a plan. It isn't. It's built.
>
> We built V1 end to end without raising a rupee. A fine-tuned health model behind a safety router. Care live across 12,000+ pincodes and 300+ cities, with 5,000+ consultants, diagnostics and medicines at home, and fitness in 200+ cities. My own family has used it every day for a year. We launch on the stores in January.
>
> And here is why it's us.
>
> Suraj, our CTO, is an IISc aerospace engineer who built a deep learning blast wave precision system for DRDO. Then he built clinical-grade AI at SigTuple that reads real patient blood samples. He is the person you want building a health model that must never be wrong about "go now".
>
> Deepesh, our CBO, built the Healthcare and Wellness Pay Later vertical at Pine Labs and owned over ₹1,000 crore of revenue across eight verticals. At Practo he grew the enterprise book from ₹10.8 crore to ₹24 crore and cut churn from 13% to under 3%. He has already sold healthcare to India at scale.
>
> I'm a second-time founder. I trained computer vision at Meta scale for Instagram and launched Surgicare at Practo. Two of us have worked inside India's biggest health platform. We know exactly what an incumbent can build, and what its business model will never let it build.
>
> Clinical AI, product at global scale, healthcare distribution. Teams like this usually take years to assemble. We started with it.

### Beat 8. The ask

> We're raising ₹26 crore, about 3 million dollars, for 17 months.
>
> By our Series A in early 2028: 5.9 lakh monthly users, more than 10,000 paying, care booked in chat every week, voice in five languages, a first insurer pilot, and our own tuned model beating frontier APIs on India's health evals.
>
> Someone is going to hold India's health memory. Whoever holds it first gets the trust, the data, the model and the insurer layer, and it compounds every single day. The question for this room is whether you're on that cap table from the start, or you're pricing it at the Series A.
>
> *(pause, back to the first slide)*
>
> Without Cheeku, Priya's father finds out about his kidneys next year, in a hospital. With Cheeku, the lab comes home this Saturday. That is the difference a family's health memory makes. Now let's do it for 140 crore people.
>
> Thank you.

## The 60-second version

> Every Indian family has one person who manages everyone's health, and they're doing it on WhatsApp. Three lab reports, three labs, three doctors, and nobody sees that Papa's sugar has climbed for a year.
>
> Indians spend more than ten years of life unwell, and it's decided in the 90 days between doctor visits. Nobody owns those 90 days.
>
> Cheeku does. It's a 24/7 health companion that holds the whole family's health memory, checks every prescription, and books the next step in the same chat: home labs, doctors, physio, across 12,000+ pincodes. Every answer feeds a longevity engine, so it gets better and harder to leave.
>
> That memory trains India's own health model and becomes the risk layer insurers never had.
>
> We built V1 with ₹0. Our CTO built DRDO's blast wave system and SigTuple's clinical AI; our CBO ran ₹1,000 crore of revenue at Pine Labs; I built product at Meta and Practo. We're raising ₹26 crore. Someone will hold India's health memory. We'd like you on the cap table of the company that holds it first.

## Delivery notes

The story does the selling; your job is to slow down and let it land.

**Make the story yours before you use it.** Priya and her father are a composite built from the deck's example. A real story beats a perfect one. Swap in a true moment from your own family or a beta user, and keep the shape: one number in isolation, the trend nobody saw, the overdue test, the person carrying it all. If you keep the composite, say "Let me tell you about a family like mine" so nobody feels misled later.

**How to deliver it:**

- **One number per beat.** 8.1. Ten years. 23 crore. 12,000 pincodes. ₹1,000 crore. Say it, then pause.
- **Pause at the turns.** After "nobody saw the line going up", after "ten years", and before the close.
- **Say "Priya", not "the user".** The room should remember a person, not a persona.
- **The callback is the close.** Return to the first slide at the end. That one move makes the pitch feel finished.
- **Show the demo once, for 30 seconds,** inside Beat 4, at the moment Papa taps yes.
- **FOMO comes from inevitability, not pressure.** "Someone will hold India's health memory" works because it is true. Never claim other investors are in unless they are.

**Fill in or check before the room:**

- [ ] Your true family or user story for Beats 1 and 4
- [ ] "My own family has used it every day for a year": keep only if all three founders will say it
- [ ] 300+ cities and 5,000+ consultants: add to the decks so the numbers match
- [ ] The decks still say ISRO for Suraj; update them to DRDO
- [ ] The demo plays offline on the presenting laptop

**Lines to never say:**

- "We are the Practo of…" or "Uber for health". You are building a new category; do not borrow a smaller one.
- "No competition." Name ChatGPT before they do, and say why a chatbot that forgets cannot do this.
- "Our own LLM" as if it exists today. It is the 2029 step, gated by evals.
- "Cheeku diagnoses" or "replaces doctors". It guides and books; doctors decide.
- Any market size you cannot source in one sentence.
