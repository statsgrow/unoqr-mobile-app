import type { RemoteCard } from "@/helpers/digital_cards/api/cards";
import type { DigitalCardContactsResponse } from "@/helpers/digital_cards/contacts/api";
import type { DigitalCardAnalyticsResponse, DigitalCardAnalyticsPeriod } from "@/helpers/digital_cards/analytics/api";
import { getCachedDigitalCards } from "@/helpers/digital_cards/db/getQueries";
import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

import type { DigitalCardGroup, DigitalCardGroupSummary, GroupAnalytics, GroupCard, GroupContact, GroupPage, GroupUser, GroupValues, JoinedGroup } from "./types";

/* ------------------ BREAK ------------------ */

const groupsPath = "/app/digital_cards/groups";

// Lists owned or joined groups without persisting other people's cards in the owner-only SQLite cache.
export async function getGroups({ joined, from, signal }: { joined: boolean; from: number; signal: AbortSignal }): Promise<GroupPage<DigitalCardGroupSummary>> {
  const url = apiSettings.getApiUrl({ path: `${groupsPath}${joined ? "/joined" : ""}` }).href;
  if (joined) {
    const response = await Axios.get<GroupPage<JoinedGroup>>(url, { params: { from }, signal, timeout: 15000 });
    return { data: response.data.data.map(row => row.group), count: response.data.count };
  };//if ends
  const response = await Axios.get<GroupPage<DigitalCardGroupSummary>>(url, { params: { from }, signal, timeout: 15000 });
  return response.data;
};//export ends

// Resolves a single group after the API verifies current ownership or membership.
export async function getGroup(uid: string, signal: AbortSignal): Promise<DigitalCardGroup> {
  const response = await Axios.get<{ data: DigitalCardGroup }>(apiSettings.getApiUrl({ path: `${groupsPath}/joined` }).href, { params: { uid }, signal, timeout: 15000 });
  return response.data.data;
};//export ends

// Creates or updates only group details, leaving ownership to the authenticated API session.
export async function saveGroup(values: GroupValues, uid?: string): Promise<DigitalCardGroup> {
  const response = await Axios.request<{ data: DigitalCardGroup }>({ url: apiSettings.getApiUrl({ path: groupsPath }).href, method: uid ? "put" : "post", data: { ...values, ...(uid ? { uid } : {}) }, timeout: 15000 });
  return response.data.data;
};//export ends

// Deletes a group and its membership links while preserving the business cards and accounts.
export async function deleteGroup(uid: string): Promise<void> {
  await Axios.delete(apiSettings.getApiUrl({ path: groupsPath }).href, { data: { uid }, timeout: 15000 });
};//export ends

// Reads the owner's or member's card list through the same authorized read-only endpoint.
export async function getGroupCards(uid: string, from: number, signal: AbortSignal): Promise<GroupPage<GroupCard>> {
  const response = await Axios.get<GroupPage<GroupCard>>(apiSettings.getApiUrl({ path: `${groupsPath}/joined/cards` }).href, { params: { uid, from }, signal, timeout: 15000 });
  return response.data;
};//export ends

// Links an existing owned card to an owned group without transferring or copying it.
export async function addGroupCard(uid: string, cardUid: string): Promise<void> {
  await Axios.post(apiSettings.getApiUrl({ path: `${groupsPath}/cards` }).href, { uid, card_uid: cardUid }, { timeout: 15000 });
};//export ends

// Removes only the group link; the card remains available in the account and other groups.
export async function removeGroupCard(uid: string, cardUid: string): Promise<void> {
  await Axios.delete(apiSettings.getApiUrl({ path: `${groupsPath}/cards` }).href, { data: { uid, card_uid: cardUid }, timeout: 15000 });
};//export ends

// Fetches a private card preview with explicit group context and no shared-card cache writes.
export async function getGroupCard(uid: string, groupUid: string, signal: AbortSignal): Promise<RemoteCard> {
  const response = await Axios.get<{ data: RemoteCard | null }>(apiSettings.getApiUrl({ path: "/app/digital_cards" }).href, { params: { uid, group_uid: groupUid }, signal, timeout: 15000 });
  if (!response.data.data) throw new Error("This card is no longer available in your group.");
  return response.data.data;
};//export ends

// Lists existing account members only for the authenticated group owner.
export async function getGroupUsers(uid: string, from: number, signal: AbortSignal): Promise<GroupPage<GroupUser>> {
  const response = await Axios.get<GroupPage<GroupUser>>(apiSettings.getApiUrl({ path: `${groupsPath}/users` }).href, { params: { uid, from }, signal, timeout: 15000 });
  return response.data;
};//export ends

// Adds an existing UnoQR account using its user ID; this does not send an invitation.
export async function addGroupUser(uid: string, email: string): Promise<void> {
  await Axios.post(apiSettings.getApiUrl({ path: `${groupsPath}/users` }).href, { uid, email }, { timeout: 15000 });
};//export ends

// Revokes one membership by link ID, including retained rows for deleted accounts.
export async function removeGroupUser(uid: string, membershipId: string): Promise<void> {
  await Axios.delete(apiSettings.getApiUrl({ path: `${groupsPath}/users` }).href, { data: { uid, membership_id: membershipId }, timeout: 15000 });
};//export ends

// Reads one combined page of group contacts with the source card attached to each submission.
export async function getGroupContacts(uid: string, from: number, signal: AbortSignal): Promise<GroupPage<GroupContact>> {
  const response = await Axios.get<GroupPage<GroupContact>>(apiSettings.getApiUrl({ path: `${groupsPath}/contacts` }).href, { params: { uid, from }, signal, timeout: 15000 });
  return response.data;
};//export ends

// Requests combined totals and per-card analytics using the existing local date presets.
export async function getGroupAnalytics(uid: string, period: DigitalCardAnalyticsPeriod, signal: AbortSignal): Promise<GroupAnalytics> {
  const end = Date.now();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  if (period !== "all") start.setDate(start.getDate() - (Number(period) - 1));
  const response = await Axios.get<{ data: GroupAnalytics }>(apiSettings.getApiUrl({ path: `${groupsPath}/analytics` }).href, {
    params: { uid, date_range: JSON.stringify({ start: period === "all" ? null : start.getTime(), end }) }, signal, timeout: 60000
  });
  return response.data.data;
};//export ends

// Reads one live page of owned card identities, reusing up-to-date local details when available.
export async function getOwnedGroupCandidates(userId: string, from: number, signal: AbortSignal): Promise<GroupPage<GroupCard["card"]>> {
  const url = apiSettings.getApiUrl({ path: "/app/digital_cards" }).href;
  const response = await Axios.get<{ data: { cards: Pick<RemoteCard, "uid" | "version">[] }; count: number }>(url, { params: { sync: true, from, to: from + 49 }, signal, timeout: 15000 });
  const cached = await getCachedDigitalCards(userId);
  const cards: RemoteCard[] = [];
  const summaries = response.data.data.cards;
  for (let offset = 0; offset < summaries.length; offset += 5) {
    const page = await Promise.all(summaries.slice(offset, offset + 5).map(async summary => {
      const local = cached.find(card => card.uid === summary.uid && card.version === summary.version);
      if (local) return local;
      const result = await Axios.get<{ data: RemoteCard | null }>(url, { params: { uid: summary.uid }, signal, timeout: 15000 });
      const card = result.data.data;
      if (!card || card.user_id !== userId || card.uid !== summary.uid) throw new Error("Your card list changed. Refresh and try again.");
      return card;
    }));
    cards.push(...page);
  };//for ends
  return { data: cards, count: response.data.count };
};//export ends

/* ------------------ BREAK ------------------ */

// Selects one authorized group's card analytics for the existing single-card analytics component.
export async function getGroupCardAnalytics(uid: string, groupUid: string, period: DigitalCardAnalyticsPeriod, signal: AbortSignal): Promise<DigitalCardAnalyticsResponse> {
  const group = await getGroupAnalytics(groupUid, period, signal);
  const card = group.cards.find(card => card.card_uid === uid);
  if (!card) throw new Error("This card is no longer part of this group.");
  return { ...card, date_range: group.date_range };
};//export ends

// Filters authorized group submissions to this card, preserving the existing card list's exact count and pages.
export async function getGroupCardContacts(uid: string, groupUid: string, from: number, signal: AbortSignal): Promise<DigitalCardContactsResponse> {
  const contacts: GroupContact[] = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await getGroupContacts(groupUid, offset, signal);
    if (offset === 0) total = page.count;
    contacts.push(...page.data.filter(contact => contact.card.uid === uid));
    if (!page.data.length) break;
    offset += page.data.length;
  } while (offset < total);
  return { data: contacts.slice(from, from + 50), count: contacts.length };
};//export ends
