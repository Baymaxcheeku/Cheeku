// Edge function stand-ins for the demo. cheeku-chat answers the story's questions
// with scripted replies in the real reply shape; anything else gets the app's own stand-in.
const DOCS = async (pool, profileName, title) => {
  const { rows } = await pool.query(
    `select d.id from documents d join profiles p on p.id = d.profile_id where p.name like $1 and d.extraction->>'title' like $2 order by d.event_date desc limit 1`,
    [profileName + '%', title + '%'],
  );
  return rows[0]?.id;
};

const SCRIPT = [
  {
    match: /trying for a baby|start a family|conceive/i,
    reply: async (pool) => ({
      paragraphs: [
        "Lovely news to plan for. Two things in Priya's records matter before you start trying.",
        "Her thyroid first. TSH was 5.8 in September, up from 4.9 in April, on Thyronorm 25 mcg. Before conceiving, doctors usually aim for under 2.5, so a recheck and a dose review with her gynaecologist come first.",
        "Folic acid 400 mcg a day, starting now. It works best from at least a month before conception. Her ferritin is low too, so keep the iron going.",
        "For you, Arjun: vitamin D is 26 and HbA1c 5.9. Fixing both helps you, and your sperm health.",
        "I can book a preconception panel for both of you, collected at home this Saturday.",
      ],
      citations: [
        { documentId: await DOCS(pool, 'Priya', 'Thyroid and iron panel'), label: 'Thyroid and iron panel, 26 Sep' },
        { documentId: await DOCS(pool, 'Arjun', 'Annual health check-up'), label: "Arjun's check-up, 11 Oct" },
      ].filter((c) => c.documentId),
      followUps: ['Book tests for both of us', 'What should Priya eat now?', 'Which doctor should she see?'],
      tier: null,
      basis: 'grounded',
      careOffer: false,
      modelId: 'cheeku-demo',
    }),
  },
  {
    match: /papaya|eat|food|avoid/i,
    reply: async () => ({
      paragraphs: [
        "At 12 weeks, keep it simple: dal, eggs, curd, leafy greens and fruit every day. Her iron is low, so pair greens with lemon or amla.",
        "Skip raw papaya, unpasteurised milk and raw sprouts for now. Ripe papaya in small amounts is fine.",
        "Tea and coffee: under 200 mg caffeine a day, about two small cups, and an hour away from her iron tablet.",
      ],
      citations: [],
      followUps: ['Is mango okay?', 'How much water?'],
      tier: null,
      basis: 'grounded',
      careOffer: false,
      modelId: 'cheeku-demo',
    }),
  },
  {
    match: /hot|fever|temperature|100\./i,
    reply: async () => ({
      paragraphs: [
        "Tara is 7 weeks old. Under 3 months, any temperature of 100.4°F or more needs a doctor tonight, even if she seems fine.",
        "Don't give any medicine before a doctor sees her. Keep her lightly dressed and keep feeding.",
        "I can get a paediatrician on a video call now.",
      ],
      citations: [],
      followUps: ['Call a paediatrician now', 'What should I watch for?'],
      tier: 'contact_today',
      basis: 'grounded',
      careOffer: true,
      modelId: 'cheeku-demo',
    }),
  },
];

module.exports = {
  'cheeku-chat': async (body, claims, pool) => {
    const q = String(body.question || '');
    for (const s of SCRIPT) if (s.match.test(q)) return s.reply(pool);
    return {};
  },
  geo: async (body) => ({ place: { lat: 12.9719, lng: 77.6412, label: 'Indiranagar', locality: 'Indiranagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560038', countryCode: 'IN', formatted: 'Indiranagar, Bengaluru', provider: 'none' } }),
};
