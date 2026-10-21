# Website accessibility review

Reviewed: 2026-10-21. Scope: Shaghalny React website in desktop and mobile browsers. No separate native application was changed.

Target: WCAG 2.2 AA. This is a remediation record, not a conformance certificate. See [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Changes made

| Need | Website changes | Relevant criteria |
| --- | --- | --- |
| Keyboard and motor access | First-focus skip link; focusable main landmarks; visible focus; clearance from sticky navigation; modal drawer uses Radix focus containment, Escape, focus return and background isolation; notification links use native anchors | 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7, 2.4.11 |
| Screen readers | Unique page titles; destination focus on route changes; visible labels linked to form fields; named search/clear controls; invalid registration/login fields describe their errors; toggle and notification state exposed; profile progress exposes its value | 1.3.1, 2.4.2, 3.3.1, 3.3.2, 4.1.2 |
| Low vision | Darker secondary text and primary buttons; readable dark-mode muted copy; clearer input boundaries; corrected calendar accent and landing step numbers; forced-colors focus and form borders | 1.4.3, 1.4.11 |
| Motion sensitivity | System reduced-motion preference applied to Framer Motion, CSS animations, transitions and smooth scrolling | 2.3.3 (AAA improvement) |
| Hearing and interview status | Existing written interview questions announce changes; interview status and camera errors exposed as live updates; camera preview named | 4.1.3; does not resolve interview accommodation gaps below |
| Cognitive access | Persistent visible labels, browser autofill metadata for account fields, explicit field errors and stable navigation | 1.3.5, 3.3.1, 3.3.2 |

Existing unrelated local changes were preserved. No deployment was made.

## Verification and evidence

- TypeScript: `cd frontend && npx tsc --noEmit`.
- Production build: `cd frontend && npm run build`.
- Chromium + axe-core 4.10.3; rules tagged `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`.
- Public pages: `/`, `/login`, `/register`, each in light and dark mode; landing page scrolled to reveal sections before scanning.
- Protected pages: `/student/jobs`, `/student/wallet`, `/student/career-roadmap`, `/student/contracts`, `/events`, `/client/post-job`, `/client/wallet`, `/client/view-proposals`, `/admin/dashboard`, `/admin/payments`, `/admin/events`, each in light and dark mode. Withdrawal dialog and event form were opened.
- Protected tests intercepted API calls using local role fixtures and mostly empty collections. They did not use real accounts, upload files or submit financial transactions. Loaded records, media, populated proposals, individual contracts and interview sessions are not covered by these scans.
- Keyboard checks: skip link first in Tab order and focuses main; navigation updates title and focus; invalid registration fields receive focus and have error descriptions; password reveal exposes state; drawer contains forward Tab focus and restores focus with Escape; drawer navigation focuses destination; withdrawal dialog contains reverse Tab focus; notifications close with Escape and return focus.
- Public page document overflow checked at 320 CSS pixels. This does not replace visual reflow inspection or real browser zoom testing.

Evidence, relative to repository root:

- `output/playwright/accessibility-public-scan.txt`
- `output/playwright/accessibility-protected-scan.txt`
- `output/playwright/accessibility-interactions.txt`
- `output/playwright/accessibility-mobile.png`

Scans report zero automated violations in the tested states after fixes. Axe still reports checks requiring human review, including color contrast on complex surfaces and focusable content in hidden modal backgrounds. These are not counted as passed. Third-party chat iframe contents are outside this source review.

## Remaining work before claiming broad accessibility

| Priority | Gap | Acceptance condition |
| --- | --- | --- |
| P1 | AI verification requires spoken, recorded answers. People unable to speak or use the required capture flow can still be blocked. | Provide a backend-supported written or assisted interview path with equivalent review and scoring. Validate the full flow with affected users. Do not merely hide microphone requirements in the UI. |
| P1 | Recorded interview playback has no synchronized caption tracks. Existing transcript text can be unavailable and is not equivalent to synchronized captions. | Generate and review accurate captions for recorded speech; include relevant sounds and speaker identification. Confirm access to required visual content through descriptions or an equivalent alternative. |
| P1 | No VoiceOver/NVDA or switch-control user test was performed. | Complete sign-up, job search, proposal, contract and wallet flows with real assistive technology, including errors and asynchronous results. |
| P1 | Automated scans cover selected states, with mostly empty protected data. | Audit populated records, application sheets, individual contracts, public profiles, interview setup/live/result, uploads, admin tabs, errors and external chat. Review all axe incomplete results. |
| P2 | Visual resize, zoom, spacing and target-size checks remain incomplete. | Check desktop browser zoom at 200% and 400%, text spacing overrides, long content, focus beneath fixed widgets, mobile landscape and all pointer targets. WCAG 2.2 AA target-size minimum is 24×24 CSS pixels, subject to its exceptions; prefer 44×44 where practical. |
| P2 | AI interview timing, automatic recording and speech playback need an accommodation review. | Confirm users can understand timing, control audio, recover from errors and obtain required adjustments without losing progress. |

Do not describe this website as fully accessible to all disabilities until these gaps are addressed and tested. This review makes no legal or employment-quota compliance claim.
