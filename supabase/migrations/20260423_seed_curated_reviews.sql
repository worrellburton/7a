-- Phase 12/20 — seed the in-house alumni / family quotes from
-- src/lib/curatedReviews.ts into public.curated_reviews. Idempotent
-- via the WHERE NOT EXISTS gate on an empty table — safe to re-run
-- against environments that already have rows (it'll insert 0).
--
-- Phase 20 deletes src/lib/curatedReviews.ts once every consumer is
-- reading from the DB; until then the file and these rows are kept
-- in sync by hand.

insert into public.curated_reviews (author_name, attribution, rating, text, display_order)
select v.author_name, v.attribution, 5, v.text, v.ord
from (values
  (1, 'Michael T.',  'Alumnus · 8 months sober',           E'Seven Arrows saved my life. The staff genuinely cares about every person who walks through the door. The small group setting made me feel like I wasn\'t just a number.'),
  (2, 'Sarah K.',    'Family member · mother of client',   'My son attended Seven Arrows and the difference has been night and day. The communication from the clinical team was outstanding — they kept us informed every step of the way. We finally have our son back.'),
  (3, 'James R.',    'Alumnus · 14 months sober',          E'I\'ve been to three other treatment centers before finding Seven Arrows. This place is different. The 6:1 staff ratio means you actually get attention. The setting at the base of the Swisshelm Mountains helped me find peace I didn\'t know was possible.'),
  (4, 'Daniel P.',   'Alumnus · 2 years sober',            E'The aftercare call at 90 days was the one that kept me in it. I was already drifting and didn\'t know it. My clinician did.'),
  (5, 'Teresa V.',   'Alumna · 3 years sober',             E'Three residential stays before this one. The difference wasn\'t the stay — it was the year after. Somebody stayed in touch until I could stay in touch with myself.'),
  (6, 'Marcus B.',   'Alumnus · 14 months sober',          E'I slipped at seven months. I called the alumni line. No guilt trip, no sales pitch — a clinical call and a plan within an hour. I\'ve been sober since.'),
  (7, 'Lauren K.',   'Alumna · 4 years sober',             E'My first reunion weekend was eleven months in. Walking back onto that ranch sober was a feeling I didn\'t know I was missing. I come back every year now.'),
  (8, 'M.',          'Trauma-informed yoga · 90-day stay', 'Yoga was the first place I felt anything in my body again without wanting to run from it. Small thing. Enormous thing.'),
  (9, 'J.',          'Sweat lodge · evening circle',       E'The sweat lodge wasn\'t what I came for. It\'s what I still carry. I didn\'t know I was allowed to belong anywhere that old.'),
  (10, 'A.',         'Sound · breathwork · Extended stay', 'I was skeptical about the sound bath for exactly one session. Then my shoulders came down from my ears for the first time in a decade.'),
  (11, 'Rebecca H.', 'Family member · spouse of alumnus',  'The family program was the surprise. I came in to support my husband and ended up doing work of my own I had been putting off for a decade. We came home different, both of us.'),
  (12, 'Andrew S.',  'Alumnus · 18 months sober',          'The horses did what no therapist ever could. Standing next to a 1,200-pound animal that responded to my nervous system without a single word — that was the moment I knew my body was tracking something my mind had been denying for years.'),
  (13, 'Priya N.',   'Alumna · 2 years sober',             E'EMDR at Seven Arrows wasn\'t the sped-up version I\'d tried before. The pacing was mine. The container held. I processed something I\'d been circling for six years in three weeks.'),
  (14, 'Tom W.',     'Alumnus · one year sober',           'The food, the land, the people — it all added up to a place that felt human, not institutional. Small details, but they changed the texture of every single day.')
) as v(ord, author_name, attribution, text)
where not exists (select 1 from public.curated_reviews limit 1);
