/* ------------------ BREAK ------------------ */

export type DigitalCardLayoutType = "modern" | "centered" | "spotlight" | "minimal";//export ends
export type DigitalCardSocialLink = { label: string; url: string };//export ends
export type DigitalCardLayoutData<Photo = string> = {
  fullname: string;
  position: string;
  company: string;
  bio: string;
  phones: { value: string }[];
  emails: { value: string }[];
  address: string;
  socialLinks: DigitalCardSocialLink[];
  photo: Photo | null;
  featurePhoto?: Photo | null;
};//export ends
