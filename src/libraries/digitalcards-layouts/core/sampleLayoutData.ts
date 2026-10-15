import type { DigitalCardLayoutData } from "./types";

/* ------------------ BREAK ------------------ */

export const sampleLayoutData: DigitalCardLayoutData<never> = {
  fullname: "John Doe",
  position: "Product Designer",
  company: "Acme Studio",
  bio: "Making meaningful connections.",
  phones: [{ value: "+1 (555) 010-2020" }],
  emails: [{ value: "john@example.com" }],
  address: "123 Market Street",
  socialLinks: [
    { label: "Website", url: "https://example.com" },
    { label: "LinkedIn", url: "https://www.linkedin.com" },
    { label: "Facebook", url: "https://www.facebook.com" },
    { label: "Instagram", url: "https://www.instagram.com" }
  ],
  photo: null
};//export ends

