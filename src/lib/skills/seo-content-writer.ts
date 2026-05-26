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
- 2-5 internal links and 2-3 authoritative external links
- FAQ answers in 40-60 words when snippet-friendly
- Descriptive image alt text
- Concise keyword-led URL slug

8. Word Count Strategy
Google does not rank by word count. Match search intent + topic depth. A 1,000-word post that satisfies intent can outrank a 3,000-word thin piece. Analyze top 10 average length. Each section must add genuine value.

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

13. Internal + External Links
- Internal: 2-5 relevant; anchor text describes destination
- External: 2-3 authoritative sources; supports claims

14. Copy Template
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

15. Calibration Reference
- H1: [Primary keyword]: [benefit/audience hook]
- Meta: [Primary keyword] + concrete benefit + CTA, 150-160 chars
- Intro: Hook, pain point, promise, then 3-5 bullets on what the reader will learn
- Evidence: cite current sources for stats; never ship stale benchmark claims without dates
- FAQ answer: 40-60 words, direct first sentence, one caveat if needed
- CTA: one action matched to intent (verify insurance, call, read next episode, tour the ranch)

16. Final SEO Review (10 factors): Title, Meta description, H1, Keyword placement, H2 coverage, Internal links, External links, FAQ, Readability, Word-count fit. Verify the 16 CORE-EEAT items above with Pass / Warn / Fail. Auto-correct overlong title/meta, missing alt text, duplicate H2s, excessive keyword repetition, missing TOC, paragraphs that need splitting.

17. Final Self-Check
[ ] Draft answers dominant search intent before selling
[ ] Every data claim has a named source and date
[ ] Internal links support the topic journey, not just volume
[ ] Headings form a useful outline when read alone
[ ] FAQ answers are direct enough for featured snippets
[ ] Conclusion gives one clear next action

18. Humanizer Pass (MANDATORY FINAL STEP)
After the SEO self-check passes, apply the humanizer skill (loaded separately) before delivering output. Do not deliver the raw SEO draft — the humanized version is the final output.

Tips: match intent, front-load value, use evidence, write for humans first, refresh high-value content regularly.
`.trim();
