# Local Digital Card Layout Library

Read README.md first for platform usage and the cross-project file map.

- This project's library owns its renderer source. Frontend contains React files; mobile contains native files. Do not add the unused platform to either project.
- Keep the same layout names and corresponding filenames across projects. Review and edit the other project's matching source directly for shared design/data changes.
- Do not introduce package dependencies between these local folders, archives, generated distributions, theme-injection wrappers or sync/build scripts.
- Preserve dynamic colors, icon-only social links, accessible labels and Centered's black outlines.
- Follow TypeScript, import grouping, root helper, one-line function comments, Lucide `strokeWidth={1.25}`, section-divider and closing-comment conventions. Keep native StyleSheet definitions at the bottom and use this app's tokens.
- Keep navigation, API/SQLite, file export, linking and modal state in feature files.
- Shared styling concerns frontend and mobile; API changes require a data-contract reason. Do not add unused libraries to unoqr-app or page-blocks.
- Validate each affected project with its normal checks and report the affected projects. No manual synchronization command is required.
