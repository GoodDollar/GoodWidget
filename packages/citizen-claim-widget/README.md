# Citizen Claim Widget

Migration target for turning `@goodsdks/citizen-sdk` claim and identity capabilities into
a real GoodWidget package.

This package currently contains only the migration piping:

- selected SDK capabilities for the citizen claim widget
- adapter state/action contracts
- host-facing props/events expected by the future widget

The existing `@goodwidget/claim-widget` package remains the theme/demo widget and should
not be changed for this migration.

## Invite Rewards

The widget directly uses `@goodsdks/invite-sdk@1.0.3` with the provider-first
viem clients already used by the claim flow. Invite writes are available only on
Celo (42220) and XDC (50); the SDK maps `staging` to its development InvitesV2
deployment.

The Claim and Invite Rewards tabs share one invite runtime. A recipient can
enter an inviter code in either tab, and both use the same on-chain validation,
SDK prechecks, simulation, transaction, and refresh behavior. The widget does
not accept a host destination, callback, or invite URL configuration. Sharing
copies this message, using the page where the widget is currently loaded:

```text
Claim GoodDollar with me. Open this page and use my invite code: <code>
<current-page-url>
```

Invite creation uses the GoodWallet Base58 shortest-unused-prefix algorithm.
The InviteSDK remains responsible for InvitesV2 addresses, preconditions,
simulation, error mapping, joins, and single/batch bounty collection.

### Invitee counts and rewards

Invite Rewards distinguishes three protocol-derived values, and never conflates
them:

- **Invitees joined** — everyone who registered under the inviter's code
  (`getInvitees()`), whether or not their bounty has been paid yet.
- **Approved** — `totalApprovedInvites` from the inviter's own `InviteUser`
  record; this is the protocol's count of invitees whose bounty condition has
  actually been met, not the total number of registered invitees.
- **Pending / collectable** — pending invitees (`getPendingInvitees()`) are
  shown with their per-invitee whitelist and minimum-days/minimum-claims
  diagnostics. Among those, only the subset InviteSDK's
  `getCollectableInvitees()` reports as currently collectable is labelled
  "Ready to collect"; the collect action is enabled only when that list is
  non-empty.
- **Total earned** — `totalEarned` from the same `InviteUser` record, shown
  as a running G$ total whenever the inviter has read access to their own
  user record.

### Feedback and deferred attachment

Join and collection outcomes (success or error) are shown as a persistent
banner in the Invite Rewards view. The banner is driven by adapter state, not
by the presence of the join card or a specific sub-component, so it remains
visible after the underlying data refreshes and after a successful join makes
the "have an invite code?" card disappear (an attached inviter cannot be
changed). Deferred inviter attachment reuses the invitee's existing personal
invite code — it is only offered while `invitedBy` is still empty and the
invite bounty is unpaid, matching the InvitesV2 contract rule.
