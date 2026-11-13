# Job Hunter research notes — Cycle 3

Last reviewed: 2026-11-14

## Purpose

Improve discovery quality and candidate fit for an applicant based in Nepal or India. This is a source and product-research note, not a claim that every source is integrated or that scraped community content is ground truth.

## Source hierarchy

1. **Employer first-party career pages / public ATS feeds** — highest trust for whether a vacancy exists, employer, title, description, posting URL, and sometimes posted date or salary.
2. **Established job boards and provider APIs** — useful for discovery breadth, but may be stale, duplicated, incomplete, or geographically misclassified. Always link back to the original posting.
3. **Community sources (Reddit and public forums)** — use only as weak signals for scam patterns, applicant experiences, confusing job requirements, interview trends, and common search vocabulary. Never treat a Reddit comment as proof that a named employer is fraudulent or that a job is open.
4. **Candidate feedback from this engine** — explicit save / dismiss / applied / interview / offer outcomes, with reason labels. This is the most useful future calibration data, but must be gathered with user consent and measured over time.

## Public research findings and product implications

### Remote does not mean worldwide

A Reddit post describing a 52,139-listing analysis reported 5,385 listings explicitly open worldwide, 19,765 with country/region restrictions, and 26,989 without a clear rule. Its reported 78.6% restriction rate applies only to listings with an explicit answer, not all remote jobs. Treat this as a community-reported dataset, not independently verified universal market statistics.

Implementation:
- Keep separate fields for work mode (remote / hybrid / onsite) and applicant eligibility (eligible / ineligible / unknown).
- Do not upgrade unknown to eligible.
- Parse phrases such as "must be based in", "authorized to work in", "eligible countries", time-zone overlap, payroll residency and commuting distance.
- Preserve evidence text and source URL for each eligibility decision.
- If evidence is ambiguous, show "eligibility unclear — verify with employer".

### Resume and skills matching

Community discussions repeatedly recommend matching the actual role title, specific tools, certifications, and concrete requirements using truthful wording, rather than stuffing generic buzzwords. A Reddit thread also points out that recruiter searches may use Boolean groups and exact variants. These are practitioner anecdotes, not a specification for every ATS.

Implementation:
- Extract required and preferred skills separately.
- Normalize aliases (e.g. PostgreSQL / Postgres; JavaScript / JS) while preserving the employer's exact phrase.
- Require evidence from the candidate profile or projects before marking a skill as a match.
- Penalize missing mandatory requirements more than preferred skills.
- Never add skills to the candidate profile simply because a job asks for them.

### Scam and listing quality signals

Community reports describe common risk patterns: upfront fees, requests for gift cards/crypto, suspicious payment handling, identity/bank data requested unusually early, and implausible pay for trivial work. These are flags for human review, not automatic proof of fraud.

Implementation:
- Add explainable warning flags; do not label a company "scam" based on one signal or Reddit post.
- Verify employer domain and application URL against the employer's official careers page.
- Flag URL shorteners, mismatched domains, missing employer identity, vague duties, and requests for payment.
- Keep the job visible with a warning unless it is clearly malicious or invalid.

## Preferred job data sources

### Greenhouse public Job Board API
- Docs: https://docs.greenhouse.io/job-board
- Public GET endpoints do not require authentication.
- List jobs: `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`
- `content=true` includes full job content, departments, and offices.
- Use the employer's board token and keep the original `absolute_url`.
- Do not use the application POST endpoint. This engine is discovery and draft assistance only.

### Ashby
- Official API reference: https://developers.ashbyhq.com/reference/jobpostinglist
- The documented `jobPosting.list` endpoint returns published postings; its docs warn that unlisted postings may be included by default and say to set `listedOnly=true` when exposing listings publicly.
- The documented endpoint requires `jobsRead` permission. Do not assume every employer board is anonymously accessible; verify the actual public feed available for each employer.

### Other ATS discovery candidates
- Community-maintained endpoint reference: https://github.com/Mersetti/ats-job-board-apis
- Includes Greenhouse, Lever, Ashby, Workday, Workable, Recruitee, Personio, SmartRecruiters, Breezy, Teamtailor, and Rippling.
- Treat this list as an integration discovery checklist only. Verify each endpoint against official vendor documentation, terms, robots policy, and live responses before enabling it.
- ATS endpoints are generally company-specific; they do not magically provide a universal job search index.

## Data model additions recommended

- `source_type`: employer_ats / job_board_api / community_signal / manual
- `source_url`, `canonical_url`, `employer_careers_url`
- `first_seen_at`, `last_seen_at`, `posted_at`, `expires_at`
- `work_mode`: remote / hybrid / onsite / unknown
- `eligibility_status`: eligible / ineligible / unknown
- `eligibility_evidence`: exact text span + source field
- `required_skills`, `preferred_skills`, `seniority_evidence`
- `scam_risk_flags` and per-flag evidence
- `source_confidence` and `last_verified_at`

## Evaluation plan

Do not claim the engine is "trained" merely because code or rules changed. Build a labelled evaluation set from real, permitted job descriptions:
- 50 role-fit examples (strong fit / partial fit / poor fit)
- 50 applicant-eligibility examples (eligible / ineligible / unclear)
- 30 duplicate/stale examples
- 30 scam-risk examples with evidence and counterexamples

Measure:
- Precision@10 for useful job matches
- Recall on known eligible jobs
- False-eligible rate (must be especially low)
- Duplicate rate
- Stale/closed listing rate
- Calibration: compare displayed match bands with user feedback and outcomes

No model fine-tuning until there is a legally usable, representative, labelled dataset. Start with deterministic, explainable rules and collect explicit feedback.

## Reddit source links reviewed

- Remote eligibility discussion: https://www.reddit.com/r/remotework/comments/1uxa3zj/heads_up_remote_in_the_listing_does_not_mean/
- Recruiter keyword search discussion: https://www.reddit.com/r/ResumeTips/comments/1vnmnnz/resume_keywords_for_ats_how_recruiters_actually/
- Scam warning discussion: https://www.reddit.com/r/Scams/comments/1vewfd7/scam_jobs_and_how_to_tell_if_its_a_scam/

Community material is anecdotal and may be inaccurate, manipulated, promotional, or outdated. Use it to generate hypotheses, then verify against primary employer/provider data.
