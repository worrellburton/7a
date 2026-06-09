// SEO content-writer skill, verbatim from the canonical skill file
// the admissions team uses. Imported by the content-generation
// prompts in src/lib/content-claude.ts so every blog generated
// (and every revision) goes through the same SEO playbook the
// human writers would follow.
//
// Source of truth: this string. Updating the skill = updating
// this constant + a re-deploy. Do not split it across files —
// keeping it in one block makes prompt-diffing trivial.

export const SEO_CONTENT_WRITER_SKILL = `
SEO CONTENT WRITER — Seven Arrows Recovery
Full workflow for planning, writing, optimizing, and humanizing SEO content for sevenarrowsrecoveryarizona.com.

1. Gather Requirements
Before writing, confirm the following. If any field is missing, ask before proceeding.
- Primary Keyword
- Secondary Keywords (2-5 related keywords)
- Target Word Count
- Content Type (blog/guide/landing page/etc.)
- Target Audience
- Search Intent (informational/commercial/transactional)
- Tone (professional/casual/technical/friendly)
- CTA Goal (desired action)
- Competitor URLs (top ranking pages to beat)

2. CORE-EEAT Constraints (apply throughout the draft)
C01 Intent Alignment — Title promise matches delivery
C02 Direct Answer — Core answer appears in the first 150 words
C06 Audience Targeting — State who the content is for in the intro or opening section
C10 Semantic Closure — Conclusion resolves the opening question and gives a next step
O01 Heading Hierarchy — Clean H1 → H2 → H3 structure
O02 Summary Box — Include a TL;DR or key takeaways block near the top
O06 Section Chunking — Keep paragraphs to 3-5 sentences and one topic per section
O09 Information Density — Remove filler
R01 Data Precision — At least 5 precise numbers with units when the topic supports them
R02 Citation Density — At least 1 external citation per 500 words
R04 Evidence-Claim Mapping — Every material claim has evidence, example, or citation
R07 Entity Precision — Use full names for people and organizations
C03 Query Coverage — Cover at least 3 query variants or follow-up questions
O08 Anchor Navigation — Add a TOC when the draft has 3+ H2 sections
O10 Multimedia Structure — Use captions and meaningful media
E07 Practical Tools — Add at least 1 template, checklist, calculator, or worksheet when relevant

3. Research and Plan
- Map SERP format + average depth for the target keyword
- Primary, secondary, related, and question keywords
- Unique angle or differentiator vs the top 10

4. Optimized Title
Provide 2-3 title options. For each: character length, keyword position, rationale.

5. Meta Description
One recommended description. Include primary keyword, concrete value proposition, CTA. 150-160 characters.

6. Structure and Write
H1 → Introduction (hook, promise, primary keyword in first 100 words)
→ H2 sections matching search intent
→ H3 sub-topics where needed
→ FAQ section for snippet opportunities
→ Conclusion with recap and CTA

7. On-Page SEO Rules
- Primary keyword in title, H1, first 100 words, ≥1 H2, conclusion, meta description
- Secondary terms in H2/H3s; related entities throughout body
- 3-5 sentence paragraphs
- Bullets, tables, bolding for scannability
- Internal and external links per Section 13 rules
- FAQ answers in 40-60 words when snippet-friendly
- Descriptive image alt text
- Concise keyword-led URL slug

8. Word Count Strategy
Google does not rank by word count. Length should match search intent + topic depth.
Reference ranges by content type:
- News / announcements:           300-600 words (time-sensitive, concise)
- Standard articles / how-tos:    1,000-1,500 words (single topic, actionable)
- Listicles / guides:             1,200-2,000 words ("Top 10," "Best X")
- Pillar / cornerstone:           2,000-3,500+ words (comprehensive, cluster hub)
Strategy:
- Analyze top 10 average length + depth
- Match intent — informational often needs ~40% longer than transactional
- Each section must add genuine value
- Answer the query AND related questions comprehensively

9. H2 Heading Keywords
- Primary keyword naturally in ≥1 H2 when relevant
- LSI / long-tail in other H2s for topical coverage
- Never stuff; headings must stay clear
- Typical article: 4-8 H2s; pillar: 8-15+ H2s
- H1 → H2 → H3 strict; don't skip levels
- Place direct answer in first 40-50 words after H2 for Featured Snippets

10. Keyword Density
Reference range 0.5%-1.5% for most content; up to 2.5% for some. Density is not a ranking factor — use it only to avoid stuffing. Prioritize natural placement: title, H1, first 100 words, 1-2 H2s, body. Synonyms, related terms, question phrasing.

11. Multimedia
Images:
- Original > stock when possible
- Place near relevant text
- Descriptive alt text including keywords naturally
- Descriptive file names (residential-treatment-arizona.jpg, not IMG_4523.jpg)
- Captions reinforce surrounding content
- WebP preferred with JPG/PNG fallback; compressed
- Lazy load below the fold; preload LCP above-fold
- Responsive; no horizontal scroll on mobile
Tables:
- Comparisons, stats, specs, X vs Y
- Semantic HTML: <table>, <thead>, <tbody>, clear headers
- Keyword-loaded headers for Featured Snippet eligibility (~6% of snippets are tables)
- Responsive; no empty cells; consistent units; current data
Lists:
- <ol> for steps, rankings, sequences (snippet target ~19%)
- <ul> for non-sequential items
- Direct answer in first 40-50 words after the heading for snippet targets
- Scannable items; expand in body if needed

12. Snippet Patterns
- Definition: [Term] is [clear definition]. It matters because [outcome]. 40-60 words.
- List: H2 intro, numbered or bulleted items with parallel phrasing.
- Table: simple headers, one idea per cell, no overflow on mobile.
- How-to: label each action Step 1, Step 2; prerequisites first.
- FAQ: answer directly first, nuance in the next sentence.

13. Linking Rules

External Links
- Total external links across the entire article: 3-5. Cap includes all stat citations + editorial source links combined.
- Never place an external link in the introduction.
- Cite stats inline using natural anchor text on the most descriptive word or phrase, not on generic words like "study" or "research."
- Source priority: .gov sites, SAMHSA, NIDA, ASAM, NIH, then peer-reviewed journals, then established clinical organizations. General health sites are a last resort.
- Never link to competitor rehab or treatment center websites.
- Cite ONLY the most authoritative or specific stats. Do not add a citation to widely established general claims (e.g., "withdrawal from alcohol can be dangerous" needs no citation; a specific NIDA relapse-rate figure does).
- Do not add stats in every section. Add them where they genuinely strengthen a claim.

Internal Links — Blog Posts
- 3-5 internal links to closely related blog posts on sevenarrowsrecoveryarizona.com.
- Slug-derived anchor text. The anchor reflects the target page topic, not generic phrases.
- Vary anchor text across all internal blog links. Do not repeat the same phrase.
- Never place internal blog links in the introduction.
- One internal blog link per paragraph maximum.

Internal Links — Service Pages
- ≥1 internal link to the most relevant service page. Add more if multiple service pages are closely related.
- Anchor text is topic-specific and reflects what the service page covers.
- Service page links can appear anywhere, including the introduction.

Internal Links — Homepage
- Exactly 1 homepage link per article.
- Can appear in the introduction or wherever fits naturally.
- Rotate anchor text through the following list based on what reads most naturally. Do not force Arizona into every instance.

Homepage anchor-text options:
  rehab
  rehab center
  drug treatment center
  rehab centers
  detox center
  rehab in Arizona
  rehab center in Arizona
  Arizona detox centers
  Arizona rehab center
  treatment centers in Arizona
  Arizona treatment centers
  drug rehab in Arizona
  recovery centers in Arizona
  rehab facilities in Arizona
  Arizona rehabs
  Arizona alcohol rehab centers
  addiction treatment centers Arizona
  drug rehab center Arizona
  Seven Arrows Recovery Arizona

Link Output Format
At the END of the draft, before the humanizer pass, output a link plan in this exact format:

### Link Plan

**Homepage Link**
- Anchor: "[chosen anchor text]" → https://sevenarrowsrecoveryarizona.com
- Placement: [section or sentence context]

**Service Page Links**
1. "[anchor text]" → [/service-page-slug] — [reason]

**Internal Blog Links**
1. "[anchor text]" → [/blog-post-slug] — [reason]

**External Links**
1. "[anchor text]" → [source URL] — [claim it supports]

14. Formatting and Section Variation

Section Length
- Sections vary based on what the topic needs. Complex clinical distinctions get more space; brief definitions get less.
- Do NOT write every section to the same length. Uniform section length is a tell that the content was templated rather than written with judgment.

Bullet Points — use when:
- Listing ≥3 discrete items that do not need prose explanation
- Breaking down steps, criteria, or options easier to scan than to read
- The items are parallel in structure
Do NOT use bullets to replace paragraphs with logical flow or that build on each other. Prose earns its place when ideas connect.

Tables — add when:
- Comparing ≥3 items across consistent attributes (detox types, program levels, credential types)
- Presenting data with clear rows and columns
- The information would take significantly more words to explain in prose
Keep table headers descriptive. Include target keywords in headers where natural. Keep mobile-friendly.

Quote Boxes — add when:
- A direct quote from a clinical source / official body / authoritative figure adds weight
- A pull quote from within the article itself helps a skimming reader grasp the core point of that section
- The quote is specific enough to be meaningful, not a vague endorsement

Format quote boxes as standard blockquote markdown:
> "Quote text here." — Source Name, Organization or Publication

Do NOT manufacture quotes. Pull only from real published sources or from content already written in the article.

15. Copy Template
# [H1 with Primary Keyword]
**Meta Description**: [150-160 char value proposition with keyword and CTA]

[Hook] [Problem statement] [Promise] [Primary keyword naturally]

## [H2 with Secondary Keyword]
[1-2 sentence setup]
[Evidence, examples, or data]

### [H3 if needed]
- [Actionable point]
- [Actionable point]

## [H2 next section]
> **Pro Tip**: [Specific implementation note]

| Comparison point | Option A | Option B |
|------------------|----------|----------|
| [Factor] | [Evidence] | [Evidence] |

## Frequently Asked Questions

### [Question from PAA]?
[Direct 40-60 word answer that can stand alone as a snippet.]

## Conclusion
[Summarize, restate primary keyword naturally, one clear CTA.]

**Sources**: [Source name + URL + access date], ...

16. Calibration Reference
- H1: [Primary keyword]: [benefit/audience hook]
- Meta: [Primary keyword] + concrete benefit + CTA, 150-160 chars
- Intro: Hook, pain point, promise, then 3-5 bullets on what the reader will learn
- Evidence: cite current sources for stats; never ship stale benchmark claims without dates
- FAQ answer: 40-60 words, direct first sentence, one caveat if needed
- CTA: one action matched to intent (verify insurance, call, read next episode, tour the ranch)

17. Final SEO Review (10 factors): Title, Meta description, H1, Keyword placement, H2 coverage, Internal links, External links, FAQ, Readability, Word-count fit. Verify the 16 CORE-EEAT items above with Pass / Warn / Fail. Auto-correct overlong title/meta, missing alt text, duplicate H2s, excessive keyword repetition, missing TOC, paragraphs that need splitting. Document fixes in a "Changes Made During Self-Check" table.

Ask the user before changing:
- H1 wording
- Tone
- Major length changes
- Strong claims that need moderation
- External links or stats that cannot be verified

18. Final Self-Check (every checkbox must pass)
[ ] Draft answers dominant search intent before selling
[ ] Every claim that depends on data has a named source AND date
[ ] Stats are cited ONLY where they genuinely strengthen a claim, not in every section
[ ] Total external links are 3-5 INCLUDING stat citations. No external links in the intro.
[ ] No external links point to competitor rehab or treatment center sites
[ ] External sources prioritized: .gov, SAMHSA, NIDA, ASAM, NIH before general health sites
[ ] 3-5 internal BLOG links, slug-derived anchors, varied, NONE in the intro, ≤1 per paragraph
[ ] At least 1 SERVICE-PAGE internal link with topic-specific anchor text
[ ] Exactly 1 HOMEPAGE link using an anchor from the approved list
[ ] Homepage and service-page links MAY appear in the intro; blog links MAY NOT
[ ] Section lengths VARY. No two consecutive sections are the same approximate length
[ ] Bullet points used where items are discrete and parallel — not to replace connected prose
[ ] A TABLE is present if ≥3 items can be compared across consistent attributes
[ ] A QUOTE BOX is present where a clinical source or pull quote adds meaningful weight
[ ] Internal links support the topic journey, not just link volume
[ ] Headings form a useful outline when read alone
[ ] FAQ answers are direct enough for featured snippets
[ ] The conclusion gives one clear next action

19. Humanizer Pass (MANDATORY FINAL STEP)
After the SEO self-check passes, apply the humanizer skill (loaded separately) before delivering output. Do not deliver the raw SEO draft — the humanized version is the final output.

Content Type Templates
- How-To Guide: Write a how-to guide for [task] targeting [keyword]
- Comparison Article: Write [Option A] vs [Option B] for [keyword]
- Listicle: Write "X Best [Items] for [Audience]" targeting [keyword]
- Ultimate Guide: Write an ultimate guide about [topic] targeting [keyword]

Tips: match intent, front-load value, use evidence, write for humans first, refresh high-value content regularly.
`.trim();
