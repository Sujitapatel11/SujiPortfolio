# Job Hunter Research Notes — Cycle 3

Updated: 2026-11-14

## Purpose
Use public evidence to improve discovery quality, applicant eligibility, ranking, and scam resistance. This document records research findings and source links; it is not a bulk scraped job dataset and does not authorize automated applications.

## Evidence and product decisions

### 1. Remote is not the same as worldwide
A Reddit post analysing 52,139 remote listings reported 5,385 explicitly worldwide, 19,765 with country/region restrictions, and 26,989 with unclear eligibility. The post's dataset and methodology are third-party claims, not an independently audited census. Treat it as a strong warning, not a universal market statistic.
Source: https://www.reddit.com/r/remotework/comments/1uxa3zj/heads_up_remote_in_the_listing_does_not_mean/

Engineering decision:
- Preserve three states: eligible, ineligible, unknown.
- Never upgrade unknown to eligible because a title or location says "Remote".
- Store the exact evidence sentence/field that triggered a decision.
- Check both location field and full description; timezone overlap is not work authorization.
- Never infer legal work authorization from a country name alone.

### 2. Reddit hiring posts are useful but noisy
A third-party index of Reddit hiring posts (updated 2026-11-12) reports a mix of worldwide, country-restricted and unstated posts, with scam warnings and pay often missing. This is a useful signal for designing source labels and moderation, not a trusted canonical vacancy feed.
Source: https://onlyhiring.hassandev.me/remote

Engineering decision:
- Label Reddit as community/self-reported source, separate from employer ATS.
- Keep post URL, subreddit, post date, author, and original text excerpt.
- Treat "worldwide", pay, employer identity, and legitimacy as claims until verified on the employer site.
- Detect requests for upfront fees, crypto deposits, paid training, cheque forwarding, reshipping, and requests for sensitive identity/banking details before a verified offer.
- Never scrape private communities, bypass login/CAPTCHA, or ignore platform rules.

### 3. Prefer first-party employer ATS feeds
Lever documents public published postings and a public JSON listing endpoint. Its public postings API is not a global full-text search API; company board identifiers are needed.
Source: https://github.com/lever/postings-api

Ashby documents a public job posting endpoint and warns that unlisted postings should not be displayed publicly; set listedOnly=true when publicly exposing listings.
Source: https://developers.ashbyhq.com/reference/jobpostinglist

Additional technical reference on public ATS endpoint patterns and field coverage:
- https://github.com/GregoryBolshakov/ats-job-boards-reference
- https://github.com/Mersetti/ats-job-board-apis

Engineering decision:
- Prioritize published/listed employer-owned postings and preserve original apply URLs.
- Build a curated company-board registry; public ATS endpoints are per company, not a universal job-search index.
- Respect provider documentation, rate limits, robots policies and terms. Do not bypass access controls.
- Store source type, fetched_at, posted_at, last_seen_at, and expiry/closed status.

### 4. Ranking must be evidence-based
Current matcher needs to avoid substring false positives, use target keywords, and separate required skills from optional skills. A job title match must not outweigh a hard applicant-location restriction.

Engineering decision:
- Hard eligibility filters happen before ranking.
- Score title/role fit, exact/normalized skills, experience, location, compensation, freshness separately.
- Use explainable matched and missing evidence.
- Do not claim candidate proficiency from a project tag or a technology mentioned in an unfinished project.
- Missing salary/experience data is unknown, not a negative or positive match.

## Data schema additions recommended
- source_kind: employer_ats | job_board | community | aggregator
- source_url, canonical_url, original_apply_url
- fetched_at, last_seen_at, posted_at, expires_at
- applicant_location_status: eligible | ineligible | unknown
- eligibility_evidence: exact excerpt and field
- scam_risk_flags: structured flags + explanation (never silently label a person/company a scam)
- skills_evidence: required / preferred / mentioned with excerpts
- salary_period and salary_currency; never compare different currencies or pay periods without conversion.

## Evaluation plan
Create a manually reviewed benchmark of at least 100 listings across Nepal, India, and global remote:
- 30 eligibility examples (explicit eligible, explicit excluded, ambiguous)
- 40 role/skill relevance examples
- 15 stale/closed/duplicate examples
- 15 scam-risk examples

Track precision@10, recall on known eligible roles, false-eligible rate, duplicate rate, and unknown rate. False-eligible rate should be minimized before expanding source volume.

## Limitations
- Reddit discussions are anecdotal and can be manipulated.
- Third-party aggregators can misclassify or duplicate listings.
- Employer postings can omit legal/work-authorization rules that appear later in the application form.
- A text classifier cannot guarantee visa/work-permit eligibility. Always link the original posting and show uncertainty.
