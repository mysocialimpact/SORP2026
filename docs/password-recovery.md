# Password recovery — implementation and release status

Branch: `feat/sorp-password-recovery`. This follows explicit approval to extend the existing MSI/Cow account backend. It does not replace authentication, the assessment, the original sliding presentation or the Charity Commission fixes.

Companion pull requests: [Cow #2](https://github.com/mysocialimpact/cow/pull/2) and [MSI #2](https://github.com/mysocialimpact/my-social-impact/pull/2). MSI preview build verified Ready: https://my-social-impact-8r8w2b2ih-marcuswarry.vercel.app (`dpl_AMV96UNZ7BNykuwtumnaBkW22qaG`). This is build verification, not live email verification.

## What changed

- Visible **Forgot password?** link on the account form, including after duplicate-account and incorrect-password errors.
- `/forgot-password/` requests a secure link using the existing account proxy. `/reset-password/` accepts the email fragment token, removes it from the visible URL, requires matching new passwords and directs the person back to sign-in.
- Both recovery pages are noindex. Tokens never go into local storage; assessment storage is preserved. Request acknowledgement is deliberately generic and does not assert account existence or email delivery.
- `/are-you-sorp-ready/review/?entry=login` opens sign-in directly on a fresh device. Fixed the existing submission guard so a returning person can restore saved account work without first reselecting a charity. New accounts still go through charity selection.
- An unavailable/unconfigured backend disables reset submission with an honest message. The current public MSI backend does not yet support recovery, so a frontend preview alone cannot send reset emails.

## Tested

- Production-mode Next build, TypeScript and ESLint.
- All 58 existing product unit tests and 34 desktop/mobile browser tests, including ten recovery checks: link/prefill, safe acknowledgement, password confirmation, token URL removal, unavailable/expired states, unchanged local work and fresh-device server-progress restoration. Accessibility checks include the request screen.
- The independent full 19-answer/report/restoration fixture journey passes at 1440px and 390px; no external email, charge or booking is made.
- Shared backend: eight SQLite security tests plus the existing account regression checks. MSI broker: eight mocked route tests. Cow build passes. Cow's pre-existing full-typecheck errors are documented in its companion PR.

These are controlled tests, not evidence of real email delivery. There is no physical iPhone session here. The current site remains live and unchanged by these feature branches.

## Exact remaining release prerequisites

Cow is in a separate Sites/Cloudflare hosting project, not the website's Vercel project. This task has GitHub and Vercel access but no Cow publishing control or configured verified reset-email sender. Its companion `docs/password-recovery.md` names the existing project, additive migration `0031`, three required runtime settings and safe release/rollback order. Do not add those secrets to the frontend or create a replacement backend.

Publish/configure Cow first, then release `mysocialimpact/my-social-impact`'s broker, then this SORP branch. Check public capability availability. With an approved test recipient/account, verify delivery → password change → login → saved review/report restoration and rejected reuse/old sessions. No real reset email has been sent and no production password has been changed during this work. Do not call password recovery live until those checks pass.

No DNS, Google OAuth, payment, booking or original MSI presentation changes are part of this feature.
