# Local UnoQR Create Library

Read README.md before edits; it maps matching files and project responsibilities.

- This is project-owned source, not a shared npm package. Import local files only; no sibling-project runtime/build imports, archives, generated dist folders or sync scripts.
- Update matching frontend/mobile shape files directly when QR behavior should agree. Review unoqr-app's existing generator for style/contract changes; do not add unused code to it.
- Keep mobile-only uploaded-logo and native export functionality out of frontend.
- Use TypeScript with explicit helper types, root-level functions, one-line function comments, `/* ------------------ BREAK ------------------ */` dividers and existing closing comments.
- Accept dynamic colors through arguments; preserve deterministic frame dots and official wordmark paths.
- Keep app navigation, API/storage, file export and server image conversion in their existing feature files.
- Run the projects' normal validation. No package generation step is permitted for this local library structure.
