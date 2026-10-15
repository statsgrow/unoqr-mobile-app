import {
    ArrowLeftRight, ArrowRight, Bell, CalendarClock, CalendarDays, Camera,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck,
  CircleUserRound, CircleX, CloudSync, ContactRound, Copy, DatabaseZap,
  ExternalLink, File, FileSpreadsheet, FileText, Flashlight, FlashlightOff,
  Globe2, History, House, Image, ImageOff, Info,
  Link, LockKeyhole, LockKeyholeOpen, LogOut, Mail, MapPin,
  MessageSquare, Phone, Puzzle, QrCode, ScanBarcode, ScanLine,
  Search, Settings, ShieldCheck, ShieldKeyhole, ShieldUser, Store,
  Trash2, TriangleAlert, Upload, Wallet, Wifi, X,
  type LucideProps
} from "lucide-react-native";

/* ------------------ BREAK ------------------ */

export type PxIconName = keyof typeof icons;//export ends
type PxIconProps = Omit<LucideProps, "strokeWidth"> & { name: PxIconName };

/* ------------------ BREAK ------------------ */

const icons = {
  "account-circle-outline": CircleUserRound,
  "alert": TriangleAlert,
  "alert-outline": TriangleAlert,
  "alert-circle": CircleAlert,
  "alert-circle-outline": CircleAlert,
  "arrow-right": ArrowRight,
  "bank-transfer": ArrowLeftRight,
  "barcode-scan": ScanBarcode,
  "bell-outline": Bell,
  "calendar-clock": CalendarClock,
  "calendar-outline": CalendarDays,
  "camera-outline": Camera,
  "card-account-details-outline": ContactRound,
  "check": Check,
  "check-circle": CircleCheck,
  "check-circle-outline": CircleCheck,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "close": X,
  "close-circle": CircleX,
  "cloud-sync-outline": CloudSync,
  "cog-outline": Settings,
  "content-copy": Copy,
  "database-alert-outline": DatabaseZap,
  "delete": Trash2,
  "email-outline": Mail,
  "file-delimited-outline": FileSpreadsheet,
  "file-document-outline": FileText,
  "file-outline": File,
  "file-pdf-box": FileText,
  "flashlight": Flashlight,
  "flashlight-off": FlashlightOff,
  "history": History,
  "home": House,
  "home-outline": House,
  "image-outline": Image,
  "image-broken-variant": ImageOff, ImageOff,
  "information": Info,
  "information-outline": Info,
  "link-variant": Link,
  "lock-outline": LockKeyhole,
  "lock-open-alert-outline": LockKeyholeOpen,
  "logout": LogOut,
  "magnify": Search,
  "map-marker-outline": MapPin,
  "message-text-outline": MessageSquare,
  "open-in-new": ExternalLink,
  "phone-outline": Phone,
  "puzzle-outline": Puzzle,
  "qrcode": QrCode,
  "qrcode-plus": QrCode,
  "qrcode-scan": ScanLine,
  "shield-account-outline": ShieldUser,
  "shield-check-outline": ShieldCheck,
  "shield-key-outline": ShieldKeyhole,
  "storefront-outline": Store,
  "text-box-outline": FileText,
  "upload": Upload,
  "wallet-outline": Wallet,
  "web": Globe2,
  "wifi": Wifi
} as const;

/* ------------------ BREAK ------------------ */

// Renders general UI icons with the app's consistent Lucide stroke width.
export function PxIcon({ name, ...props }: PxIconProps) {
  const Icon = icons[name];
  //Default Return
  return <Icon {...props} strokeWidth={1.25} />;//return ends
};//export ends
