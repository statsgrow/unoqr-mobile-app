import type { ComponentType } from "react";
import { Globe, Link, Mail, MapPin, Phone } from "lucide-react-native";
import type { SvgProps } from "react-native-svg";

import LinkedinBrand from "@/assets/svg/digital-cards/linkedin.svg";
import InstagramBrand from "@/assets/svg/digital-cards/instagram.svg";
import CalendlyBrand from "@/assets/svg/digital-cards/calendly.svg";
import XBrand from "@/assets/svg/digital-cards/x.svg";
import FacebookBrand from "@/assets/svg/digital-cards/facebook.svg";
import ThreadsBrand from "@/assets/svg/digital-cards/threads.svg";
import SnapchatBrand from "@/assets/svg/digital-cards/snapchat.svg";
import TiktokBrand from "@/assets/svg/digital-cards/tiktok.svg";
import YoutubeBrand from "@/assets/svg/digital-cards/youtube.svg";
import GithubBrand from "@/assets/svg/digital-cards/github.svg";
import YelpBrand from "@/assets/svg/digital-cards/yelp.svg";
import VenmoBrand from "@/assets/svg/digital-cards/venmo.svg";
import PaypalBrand from "@/assets/svg/digital-cards/paypal.svg";
import CashappBrand from "@/assets/svg/digital-cards/cashapp.svg";
import DiscordBrand from "@/assets/svg/digital-cards/discord.svg";
import SignalBrand from "@/assets/svg/digital-cards/signal.svg";
import SkypeBrand from "@/assets/svg/digital-cards/skype.svg";
import TelegramBrand from "@/assets/svg/digital-cards/telegram.svg";
import TwitchBrand from "@/assets/svg/digital-cards/twitch.svg";
import WhatsappBrand from "@/assets/svg/digital-cards/whatsapp.svg";
import PinterestBrand from "@/assets/svg/digital-cards/pinterest.svg";

/* ------------------ BREAK ------------------ */

type SocialIconProps = { label: string; color: string };
const brandIcons: Record<string, ComponentType<SvgProps>> = { linkedin: LinkedinBrand, instagram: InstagramBrand, calendly: CalendlyBrand, x: XBrand, facebook: FacebookBrand, threads: ThreadsBrand, snapchat: SnapchatBrand, tiktok: TiktokBrand, youtube: YoutubeBrand, github: GithubBrand, yelp: YelpBrand, venmo: VenmoBrand, paypal: PaypalBrand, cashapp: CashappBrand, discord: DiscordBrand, signal: SignalBrand, skype: SkypeBrand, telegram: TelegramBrand, twitch: TwitchBrand, whatsapp: WhatsappBrand, pinterest: PinterestBrand };

/* ------------------ BREAK ------------------ */

// Uses the official social glyphs and Lucide icons for ordinary contact links.
export default function SocialIcon({ label, color }: SocialIconProps) {
  const key = label.toLowerCase().replace(/[\s_-]/g, "");
  const BrandIcon = brandIcons[key];
  const Icon = key === "phone" ? Phone : key === "email" ? Mail : key === "address" ? MapPin : key === "link" ? Link : Globe;
  //Default Return
  return BrandIcon ? <BrandIcon width={20} height={20} color={color} fill={color} /> : <Icon size={20} strokeWidth={1.25} color={color} />;//return ends
};//export ends
