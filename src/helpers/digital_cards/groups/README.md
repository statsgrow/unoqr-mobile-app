# Digital-card groups in the mobile app

All group routes live under `src/app/(auth)/digital_cards/groups/`. Typed API calls and group-only dialogs live in this helper directory. The existing signed-in app layout provides authentication; Axios attaches the standard account and installation tokens.

## Screens

- `index.tsx`: My groups / Joined groups, pagination, refresh, create group and Copy my member ID.
- `[uid].tsx`: group cards, contacts and analytics for owners/members; member management, group editing/deletion and card assignment for owners.
- `card.tsx`: redirect for older group-card URLs. Group card taps now open the existing `/digital_cards/modify` preview with `uid` and `group_uid`, using the original Profile, QR, Analytics and Contacts tabs.

Entry points are the Groups icon on the My Cards list and Card groups in More. The individual card preview header contains no Groups shortcut. URLs remain below `/digital_cards/groups`.

## Ownership and data

Owner-only actions are hidden for members, and the API remains responsible for authorization. Group membership does not grant card editing access. The existing preview/editor is shared by My Cards and Groups; owner-only editor panels and controls are omitted for group members. Explicit shared-card viewer/editor management is separate from these group screens.

Group/member/card lists support the API's 50-record pages. Requests are cancelled on scope changes, and access is rechecked when a group or preview regains focus. Group data and other accounts' cards are not saved into the owner-only SQLite cache. An owner opening their own card's editor can cache that API-confirmed owned card using the existing mechanism.

Add existing card reads current owned identities from the sync API, reuses matching cached details and fetches missing/stale records in batches of five. It does not silently limit the selector to the oldest local card. Duplicate or foreign assignments are rejected by the API. Removing a card only removes its group link. Deleting a group removes its memberships, preserving cards/accounts. Destructive actions require the user's in-app confirmation.

Create a new card opens `/digital_cards/modify?new=1&mode=edit&group_uid=...`. After the first successful save it switches to the permanent saved UID and links the new card to the group. If linking fails, the saved card is preserved and a message directs the owner to Add existing card instead of creating another copy.

Members are added using an existing account's UnoQR member ID, matching the current API contract. The Groups screen offers Copy my member ID so another owner can obtain it. No email lookup, invitations or messages are sent. Deleted-account membership rows remain removable by link ID.

Group contacts show the source card and submitted details with email/phone actions. The original single-card Contacts tab also supports group members: it filters authorized group submissions to the selected card and shows them read-only, without opening owner annotation edits. Its helper scans group pages to compute the exact filtered count with the current API contract. Group-level contact annotation editing is not included. Analytics support 7-day, 30-day and all-time presets and show the four combined totals supplied by the API. In the shared single-card preview, a member sees only the selected card's analytics entry from the group response. Counts describe the cards currently linked to the group, including their activity before joining.

## QR sharing

QR previews and sharing reuse the existing native renderer and DigitalCardShareDialog. Member image exports use the frontend's published `/dc/{uid}/qrcard?type=png&v={version}` endpoint, with content-type/version checks and temporary-file cleanup. This avoids sending group members through the owner-only image preview flow while retaining the same sharing UI as My Cards. Unpublished cards can be previewed privately, but sharing/downloading requires publication by the owner. Group access is rechecked before the QR download starts.

## Validation

- `npm run typecheck`
- Verified the running iPhone app's My groups and Joined groups reads and create-form required-name validation.
- No sample groups, memberships or cards were written to the live account during verification. Group mutations, populated dashboards and QR downloads still need an end-to-end check with real group records.

The existing `getDigitalCard()` and owner-card offline sync keep their prior behavior. No API, frontend, database or package changes are required by this mobile implementation.
