-- Initial seed of the content roadmap with the rehab-keyword
-- editorial calendar Bobby handed over (June 2026). Idempotent on
-- (position, working_title) so re-running is a no-op once the rows
-- exist. Target dates are intentionally left null — the team will
-- set them inline from the Roadmap tab as they sequence the build.

insert into public.blog_roadmap_items (position, working_title, target_keyword, est_volume, intent)
select v.position, v.working_title, v.target_keyword, v.est_volume, v.intent
from (values
  (1,  'How Long Is Drug Rehab? A Week-by-Week Timeline for Each Program Type', 'how long is drug rehab', 250, 'Informational'),
  (2,  '30, 60, or 90 Days: Which Drug Rehab Length Is Right for You?', 'how long does drug rehab last', 80, 'Informational'),
  (3,  'How Much Does Drug Rehab Cost? A Complete Breakdown by Program Type', 'how much does drug rehab cost', 250, 'Informational / Commercial'),
  (4,  'How to Pay for Drug Rehab: Grants, Financing, and Free Options Explained', 'how to pay for drug rehab', 150, 'Informational'),
  (5,  'Does Medicare Cover Drug Rehab? What Part A, B, and D Actually Pay For', 'does medicare cover drug rehab', 150, 'Informational'),
  (6,  'Does Medicaid Cover Drug Rehab? State-by-State Coverage Explained', 'does medicaid cover drug rehab', 90, 'Informational'),
  (7,  'Which Insurance Plans Cover Drug Rehab — and How to Use Them', 'does insurance cover drug rehab', 100, 'Informational / Commercial'),
  (8,  'What Is Drug Rehab Really Like? An Honest Day-by-Day Look', 'what is drug rehab like', 150, 'Informational'),
  (9,  'How to Choose a Drug Rehab Center: 7 Questions You Must Ask First', 'how to choose the right drug rehab center', 50, 'Commercial'),
  (10, 'Inpatient vs Outpatient Drug Rehab: How to Know Which Is Right for You', 'what is inpatient drug rehab like', 40, 'Commercial'),
  (11, 'Does Drug Rehab Work? What the Research Actually Shows', 'does drug rehab work', 90, 'Informational'),
  (12, 'Why Do People Relapse After Rehab — and How to Prevent It', 'what percent of drug addicts relapse after rehab', 30, 'Informational'),
  (13, 'How to Get Someone Into Drug Rehab When They''re Refusing to Go', 'how to get someone into drug rehab', 60, 'Informational'),
  (14, 'Can You Force Someone Into Drug Rehab? Legal Options for Families', 'can you force someone into drug rehab', null, 'Informational'),
  (15, 'How to Convince a Drug Addict to Go to Rehab Without Pushing Them Away', 'how to convince a drug addict to go to rehab', null, 'Informational'),
  (16, 'Does an Employer Have to Offer Drug Rehab Before Firing You?', 'does an employer have to offer drug rehab before termination', 150, 'Informational'),
  (17, 'Is Drug Rehab Tax Deductible? How to Claim Treatment Costs', 'is drug rehab tax deductible', 20, 'Informational'),
  (18, 'Rehab vs Jail for Drug Addicts: The Case for Treatment Over Punishment', 'should drug addicts go to jail or rehab', null, 'Informational'),
  (19, 'What Support Is Available After Drug Rehab? Programs That Actually Help', 'what support is available after drug rehab', 50, 'Informational'),
  (20, 'What to Pack for Drug Rehab: The Complete Checklist', 'what to pack for drug rehab', 30, 'Informational'),
  (21, 'What to Say to Someone in Drug Rehab: Supportive Words That Help', 'what to say to someone in drug rehab', 30, 'Informational')
) as v(position, working_title, target_keyword, est_volume, intent)
where not exists (
  select 1 from public.blog_roadmap_items r
  where r.position = v.position and r.working_title = v.working_title
);
