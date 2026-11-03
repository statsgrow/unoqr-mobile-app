import { Redirect, useLocalSearchParams } from "expo-router";

/* ------------------ BREAK ------------------ */

// Keeps older group-card links pointing to the existing shared preview/editor instead of a separate UI.
export default function GroupCardScreen() {
  const { uid, group_uid } = useLocalSearchParams<{ uid?: string; group_uid?: string }>();
  //Default Return
  return <Redirect href={uid && group_uid ? { pathname: "/digital_cards/modify", params: { uid, group_uid, mode: "preview" } } : "/digital_cards/groups"} />;//return ends
};//export ends
