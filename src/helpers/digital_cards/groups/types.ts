import type { RemoteCard } from "@/helpers/digital_cards/api/cards";
import type { DigitalCardContact } from "@/helpers/digital_cards/contacts/api";
import type { DigitalCardAnalyticsResponse } from "@/helpers/digital_cards/analytics/api";

/* ------------------ BREAK ------------------ */

export type DigitalCardGroup = { id: string; uid: string; user_id: string; name: string; description: string; created_at: string; updated_at: string };
export type DigitalCardGroupSummary = DigitalCardGroup & { card_count: number; card_avatars: { uid: string; photo_url: string }[] };
export type GroupValues = { name: string; description: string };
export type GroupPage<T> = { data: T[]; count: number };
export type JoinedGroup = { id: string; created_at: string; group: DigitalCardGroupSummary };
export type GroupUser = { id: string; group_id: string; user_id: string | null; created_at: string; updated_at: string };
export type GroupCardSummary = Pick<RemoteCard, "id" | "uid" | "user_id" | "name" | "fullname" | "company" | "position" | "status" | "photo_url" | "layout" | "primary_color" | "version" | "updated_at" | "qr_design" | "url">;
export type GroupCard = { id: string; card_id: string; group_id: string; card: GroupCardSummary };
export type GroupContact = DigitalCardContact & { card: { uid: string; name: string; fullname: string } };
export type GroupAnalytics = { group_uid: string; date_range: DigitalCardAnalyticsResponse["date_range"]; summary: DigitalCardAnalyticsResponse["summary"]; cards: Omit<DigitalCardAnalyticsResponse, "date_range">[] };
