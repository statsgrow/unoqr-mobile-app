# UnoQR Mobile App

Product guide for marketing and sales agents. Covers the current app experience as of 16 October 2026; confirm release availability before announcing new features.

## What UnoQR Does

UnoQR combines a QR and barcode scanner, a digital business card, and a customizable static QR creator in one iOS and Android app. Users can share their professional identity, collect contact details, revisit scans, and create QR artwork for digital or printed materials.

Core audiences include professionals, freelancers, business owners, salespeople and people who regularly scan or share QR codes.

## Authentication and Account

- Users can start scanning without signing in. Their scan history is saved on that device.
- Sign-in options are Google and email with an eight-digit verification code. Ordinary email sign-in does not require a password.
- Signing in enables account features, including digital cards, saved QR creation and cloud history across devices.
- After login, the app connects the device's history with the account and restores saved account history. Sync progress and failures are visible, with retry options.
- My Account shows the user's profile information. More provides account access, the privacy policy and logout.
- Logging out disconnects the account from that installation. Do not describe logout as deleting the account or its cloud history.

**Flow:** Open the app → scan immediately, or sign in → verify email or complete Google sign-in → access account features and synchronized history.

## Digital Cards

### Create and Personalize

The current experience centers on one personal digital business card per account.

- Add a profile photo, full name, company, position, bio and address.
- Include up to two phone numbers, two email addresses and four social or website links.
- Choose Modern, Centered, Spotlight or Minimal layouts, preview designs and select a primary color.
- Customize the card's QR design using the QR styling tools.
- Give the card an internal name and set its public title, description and search-engine visibility.
- Preview changes, then save them. Publication is controlled separately: unpublished cards are not publicly accessible.

**Flow:** My Cards → add personal details → choose Layout → customize QR Card → review Settings → preview, save and publish.

### Share and Receive

- Show the QR card for someone to scan, copy the public link, or share the link through the phone's sharing options.
- Share or download the QR card as an image for reuse. Sharing an unpublished owner card publishes it before exposing its public link.
- Recipients can open a published card in a browser without installing UnoQR. UnoQR's scanner also opens UnoQR digital cards directly inside the app.
- Recipients can use the card's phone, email and link actions and download a contact file when the owner allows it.
- Owners can edit their published details while retaining the card's existing link and QR destination.
- Owners can unpublish or permanently delete their card. Deleting it makes its card link and QR destination unavailable.

### Contact Collection

Owners can allow contact downloads and choose whether visitors must share their details before downloading.

- Submitting the contact form requires first name, last name and a valid email. Mobile is optional, with a selectable country code.
- When contact collection is required, a successful submission is needed before the contact download starts.
- When collection is optional, visitors can skip. When viewing a scanned card inside the app, Skip starts the download; in the browser, the optional download starts before the invitation to share details.
- Invalid fields show errors. Failed submissions preserve entered details for retry; successful submissions clear the form.
- Saving a contact file starts the recipient's device save process; it does not silently add someone to their address book.

The card's Contacts tab lists submissions with a name, initial avatar and submission date. Opening a contact shows their details and lets the owner save private tags and notes. Tags are normalized to lowercase, with letters, numbers and spaces retained. Contacts belong to the individual card.

### Card Analytics

The Analytics tab offers Last 7 days, Last 30 days and All time, with refresh support. Below the totals, the top five visitor locations show city, country and visitor counts for the selected period.

| Metric | Meaning |
| --- | --- |
| Card views | Public card page views |
| QR card views | Visitors opening the QR face, counted once per card opening |
| Contact downloads started | Contact-file downloads initiated, rather than confirmed address-book saves |
| Contacts submitted | Contact submissions received during the selected period |

Owner previews are excluded from public tracking. Avoid promising unique leads, completed downloads or tracking of every in-app interaction. A submitted contact and a download are separate actions.

**Marketing value:** Share a professional identity, make exchanging details easier, and organize follow-up with people who submit their information.

## Scans

### Scan and Open

- Scan QR codes and supported barcodes with the camera, with a flashlight for low light.
- Scan from a saved image. Image scanning on iOS supports QR codes; camera scanning also handles supported barcodes.
- Recognize websites, UnoQR digital cards, contact cards, phone numbers, text, product barcodes, payment codes, Wi-Fi details, email, SMS, locations, calendar entries, authentication links and other app links.
- Recognition does not mean every category has a dedicated editor or action. Some destinations require another compatible app.
- Website scans open a browser experience while link details are collected. Saved details can include the page title, description, original and final links, connection information and collection errors.
- Phone results offer calling and copying; contact cards offer viewing and contact-file download; barcode results offer copying and web search; text can be viewed and copied.
- UPI payment scans show payee details and can open a compatible payment app. UnoQR does not process payments itself.

### History and Organization

- My Scans shows saved scans, dates, available location details and cloud status.
- Search history by its content, links, collected titles, location or status; filter by scan type.
- Open scan details to revisit the result, add a comment and tags, or delete the scan.
- Local history remains useful without signing in. Account sync lets signed-in users access history on other devices; pending changes can sync when connectivity returns.
- Website information, public cards and cloud synchronization need a connection. Do not market the whole app as fully offline.

**Flow:** Camera or image → recognize the code → open or inspect the result → revisit My Scans → add comments and tags or follow the destination again.

**Marketing value:** Turn one-time scans into a searchable reference history.

## Static QR Codes

Signed-in users can create and save static QR codes for websites, contact details, phone numbers and plain text.

- Customize dot and eye styles, colors, background, frame shape and a center logo.
- Name saved QR designs and choose whether to show UnoQR branding.
- See a live preview and guidance on color contrast and content density. Content is limited to 500 characters.
- Download SVG, PNG, JPEG or PDF files for digital use and printing.
- Changes are saved as users edit. Save/cloud status helps distinguish a local draft from a confirmed account save; downloads require the latest design to be saved successfully.
- Reopen designs from QR Codes, search by name or content, filter by content type or drafts, edit, download again or delete.
- Saved account QR designs can be synchronized to other devices, with downloaded designs available locally.

**Flow:** Create QR → enter content → customize appearance → review preview and quality guidance → save → choose a download format → revisit QR Codes for later use.

Static QR content is embedded in the exported code. Editing a saved design does not update QR images already printed or shared. A digital card's QR points to its published card page, whose details can be updated separately.

**Marketing value:** Create reusable, branded QR artwork for business cards, packaging, posters, presentations and online sharing.

## Home, Navigation and Device Features

- Home brings together the user's card, a quick way to show its QR, shortcuts to create QR codes and scan, and scan totals grouped by type.
- Main navigation connects Home, My Cards, Scan, My Scans and More.
- Pull-to-refresh and sync status help users update saved information.
- More displays the installed app version, build and installation ID for support.
- Camera access supports scanning; photo/file access supports selecting and saving images; location can enrich scan history when allowed.
- Users can allow notifications on their device. Do not promise specific automated alerts unless their delivery flow has been released and verified.

## Marketing Boundaries

- Position UnoQR around networking, contact follow-up, scan organization and QR creation.
- Five cards per account is a future plan, not a current offer. Do not promise automatic merging of repeat contacts or a full CRM.
- Do not claim dynamic static-QR redirection, analytics for every generated QR, guaranteed scan safety, built-in payments or an authentication-code generator.
- Do not invent pricing, unlimited usage, integrations, team features or store availability. Confirm these before publishing a campaign.
