import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

export type DigitalCardAnalyticsPeriod = "7" | "30" | "all";//export ends
export type DigitalCardAnalyticsSummary = {
  card_views: number;
  qr_card_views: number;
  contact_downloads_started: number;
  contacts_submitted: number;
};//export ends
export type DigitalCardAnalyticsLocation = { city: string; country: string | null; visitors: number };//export ends
export type DigitalCardAnalyticsResponse = {
  card_uid: string;
  date_range: { start: number | null; end: number };
  summary: DigitalCardAnalyticsSummary;
  locations: DigitalCardAnalyticsLocation[];
};//export ends

/* ------------------ BREAK ------------------ */

// Fetches the signed-in owner's card totals through the shared authenticated Axios client.
export async function getDigitalCardAnalytics({ uid, period, signal }: { uid: string; period: DigitalCardAnalyticsPeriod; signal: AbortSignal }): Promise<DigitalCardAnalyticsResponse> {
  const end = Date.now();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  if (period !== "all") start.setDate(start.getDate() - (Number(period) - 1));
  const date_range = { start: period === "all" ? null : start.getTime(), end };
  const response = await Axios.get<{ data: DigitalCardAnalyticsResponse }>(
    apiSettings.getApiUrl({ path: "/app/digital_cards/analytics" }).href,
    { params: { uid, date_range: JSON.stringify(date_range) }, signal, timeout: 20000 }
  );
  return response.data.data;
};//export ends
