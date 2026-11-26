# Citizen Claim Widget

Migration target for turning `@goodsdks/citizen-sdk` claim and identity capabilities into
a real GoodWidget package.

This package currently contains:

- selected SDK capabilities for the citizen claim widget
- adapter state/action contracts
- host-facing props/events expected by the widget
- post-claim next-task recommendation sheet (`NextTaskModal`) integration

The existing `@goodwidget/claim-widget` package remains the theme/demo widget and should
not be changed for this migration.

## Next Task Recommendation (`nextTaskContent`)

The widget supports an optional post-claim recommendation flow via `nextTaskContent`. When provided, a `NextTaskModal` bottom sheet automatically opens after a successful claim. When omitted or set to `null`, no modal is displayed.

```tsx
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'

<CitizenClaimWidget
  provider={provider}
  environment="production"
  defaultTheme="dark"
  nextTaskContent={{
    title: 'Stake your G$ and earn',
    description: 'Put your claimed G$ to work by staking it for rewards.',
    ctaLabel: 'Explore staking',
    ctaTarget: 'https://gooddollar.org/stake',
    imageUrl: 'https://placehold.co/96x96',
    contentId: 'stake-prompt',
  }}
  onNextTaskShown={({ contentId }) => console.log('Next task shown:', contentId)}
  onNextTaskClicked={({ ctaTarget }) => console.log('Next task clicked:', ctaTarget)}
  onNextTaskDismissed={({ reason }) => console.log('Next task dismissed:', reason)}
/>
```

### Content Fields

| Field | Type | Required | Description | Fallback Default |
| --- | --- | --- | --- | --- |
| `title` | `string` | Yes | Title inside the elevated recommendation card | — |
| `description` | `string` | Yes | Description copy inside the recommendation card | — |
| `ctaLabel` | `string` | Yes | Action label on the primary CTA button or link | — |
| `ctaTarget` | `string` | Yes | Destination URL (validated for http/https) or host navigation target | — |
| `imageUrl` | `string` | No | Optional 96x96 image URL; when omitted, renders compact no-image card | None (no image) |
| `contentId` | `string` | No | Opaque ID surfaced in `onNextTaskShown` for analytics correlation | None |
| `headline` | `string` | No | Sheet header headline | `"One good next step"` (`NEXT_TASK_HEADLINE`) |
| `supportingCopy` | `string` | No | Explanatory copy under the headline | `"Small actions today create a bigger impact tomorrow. Thanks for being part of GoodDollar."` (`NEXT_TASK_SUPPORTING_COPY`) |
| `recommendedLabel` | `string` | No | Badge pill text inside the recommendation card | `"RECOMMENDED"` (`NEXT_TASK_RECOMMENDED_LABEL`) |
| `skipLabel` | `string` | No | Text for the dismissal text button | `"Skip for now"` (`NEXT_TASK_SKIP_LABEL`) |
| `statusLabel` | `string` | No | Status badge label at the top of the sheet | None (hidden by default unless provided) |

### Status Label Precedence

1. `content.statusLabel`: If specified on the `nextTaskContent` object, always takes highest precedence.
2. `statusLabel` prop: Used when `content.statusLabel` is omitted. `CitizenClaimWidget` internally passes `NEXT_TASK_STATUS_LABEL` ("Claim completed") as its default `statusLabel` prop for the post-claim flow.
3. If neither `content.statusLabel` nor a `statusLabel` prop is provided (e.g. on standalone `NextTaskModal`), no status pill is rendered.

### Navigation and Custom Element Integration

#### `nextTaskResolveNavigation`

When `nextTaskResolveNavigation` is passed, the host owns CTA navigation entirely:
- The CTA renders as a `<Button>` (instead of an Anchor link).
- The raw `ctaTarget` string is handed to the callback untouched.
- If the callback throws or rejects, an error toast is surfaced and the modal remains open for retry or dismissal.
- When omitted, valid http/https links use an Anchor on web or React Native Linking on native. If native opening fails, the same toast appears and the modal stays open.

#### Custom Element Properties & Events

When using the `<gw-citizen-claim>` Web Component, configure properties via JS:

```js
const widget = document.querySelector('gw-citizen-claim')
widget.nextTaskContent = {
  title: 'Stake your G$ and earn',
  description: 'Put your claimed G$ to work by staking it for rewards.',
  ctaLabel: 'Explore staking',
  ctaTarget: 'https://gooddollar.org/stake',
}
widget.nextTaskResolveNavigation = (target) => {
  // host-owned navigation handler
}
```

The custom element dispatches the following DOM CustomEvents:
- `next-task-shown`: Dispatched when the recommendation sheet opens (`event.detail = { contentId }`).
- `next-task-clicked`: Dispatched when the user presses the primary CTA (`event.detail = { ctaTarget }`).
- `next-task-dismissed`: Dispatched when the user dismisses the sheet via the close button, overlay press, or skip link (`event.detail = { reason }`).

