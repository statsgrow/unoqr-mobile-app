/* ------------------ BREAK ------------------ */

// Keeps Meta's native SDK out of the web app.
export function startMetaAppEvents(): () => void {
  return () => undefined;
};//export ends

