-- The knowledge layer: researched articles for the five journeys.
--
-- A TABLE RATHER THAN BUNDLED CONTENT, so an article can be corrected without
-- an App Store release. A medical article with a mistake in it that takes four
-- days to fix is the argument on its own.
--
-- ┌─ THE SOURCE CONSTRAINT IS THE POINT ─────────────────────────────────────┐
-- │                                                                          │
-- │ `sources` is NOT NULL and must hold at least one entry. An unsourced      │
-- │ health article in a medical app is the thing that gets it pulled from     │
-- │ review, and a reader cannot tell which claims are backed unless the app   │
-- │ makes it impossible to publish one that is not.                          │
-- │                                                                          │
-- │ It is enforced here rather than in the client because the client is not   │
-- │ what will be inserting these in a year.                                  │
-- │                                                                          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- These articles EXPLAIN. They do not advise. Nothing in this table may tell a
-- reader to take, stop, or change a medicine, a dose or a treatment — that is
-- rule 1, and it applies to editorial exactly as it applies to the chat.

create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 1 and 140),
  /** The deck. One sentence, shown on the banner and under the title. */
  standfirst text not null check (char_length(standfirst) between 1 and 300),

  /*
   * Body as an array of typed blocks rather than markdown.
   *
   * Markdown would need a renderer and a sanitiser on the device, and a
   * sanitiser is a security control nobody remembers to update. Blocks render
   * through a fixed switch: an unknown type draws nothing rather than
   * executing anything.
   */
  body jsonb not null,

  /** Journey ids from lib/onboarding/journeys.ts. Empty means everyone. */
  journeys text[] not null default '{}',
  /*
   * Matched against the reader's OWN DECLARED conditions from their health
   * profile — never against anything read out of their documents. Inferring
   * "this person has diabetes" from a lab value and then showing them diabetes
   * content is a diagnosis delivered as a content recommendation.
   */
  conditions text[] not null default '{}',

  /** Palette key for the banner. Named, not a hex, so the app owns the colour. */
  tint text not null default 'violet' check (tint in ('violet', 'teal', 'amber', 'rose', 'indigo')),
  /** Rounded up, honest. A reader deciding whether to start needs the real cost. */
  read_minutes int not null check (read_minutes between 1 and 60),

  sources jsonb not null check (jsonb_array_length(sources) >= 1),
  /** When a human last checked this against its sources. Shown on the page. */
  reviewed_on date not null,

  /** Null means draft. Nothing unpublished ever reaches a device. */
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index articles_published_idx on articles (published_at desc) where published_at is not null;
create index articles_journeys_idx on articles using gin (journeys);
create index articles_conditions_idx on articles using gin (conditions);

alter table articles enable row level security;

/*
 * Readable by any signed-in reader, but ONLY once published. Editorial is not
 * user data: there is no per-account scoping here, and there is deliberately no
 * insert, update or delete policy — authoring happens through the migration
 * runner or an admin connection, never from a phone.
 */
create policy "signed-in readers see published articles" on articles for select
  to authenticated
  using (published_at is not null);

comment on table articles is 'Researched health explainers. Sources are required by constraint; nothing here may advise on a medicine, dose or treatment.';
