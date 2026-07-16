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

The widget directly uses `@goodsdks/invite-sdk@1.0.1` with the provider-first
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
simulation, error mapping, joins, and single/batch bounty collection. Pending
invitees show their whitelist and minimum-days/minimum-claims diagnostics before
the collection control is enabled.
