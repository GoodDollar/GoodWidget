# Contributor Bounty Template

Use this when an AI-generated PR already exists and a contributor needs to make it
production-ready before human review.

Contributor role reference:
https://docs.gooddollar.org/for-developers/contributing/open-source-contributors/contributor-role

````md
# [GoodBounty] Finalize <feature/widget name> PR

## Summary

Pick up the existing AI-generated PR for `<feature/widget name>`, run it locally,
fix implementation gaps, update tests/evidence, and prepare it for human review

## Contributor task

- Claim the bounty with an ETA.
- Check out the PR branch and run it locally.
- Compare the implementation against the parent issue, plan issue, and repo docs.
- Fix concrete gaps in behavior, tests, code quality, or UI.
- Update screenshots/videos when UI changes.
- Leave a handoff comment with what changed, what was tested, and remaining risks.

## Scope checks

_Breakdown and update with specifics towards a feature and execution plan_

- [ ] The PR solves the issue requirements.
- [ ] The implementation follows the plan or explains any deviation.
- [ ] Existing repo patterns and package boundaries are respected.
- [ ] Main happy path and important edge/error states work.
- [ ] Storybook covers the expected states.
- [ ] Playwright covers the main flows and includes current screenshots.
- [ ] Desktop and mobile layouts are usable.
- [ ] The PR description links the source issues and includes test evidence.

## Required commands

```sh
pnpm install
pnpm build
pnpm lint
pnpm test:demo tests/widgets/<widget-folder>
```
````

If a command cannot be run, document why.

## Handoff comment

```md
Contributor: @<handle>
PR: #<pr>
Commit: <commit>

Fixed:

- <fix>

Verified:

- <scenario>: <result>

Evidence:

- <This should confirm what scenarios and ux/ui flows are testable using the playwright tests. Running the tests will be done by reviewer>

Remaining risks:

- <None / details>
```

```

```
