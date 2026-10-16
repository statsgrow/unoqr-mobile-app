import { createLucideIcon } from "lucide-react-native";

/* ------------------ BREAK ------------------ */

// Renders Lucide's official user-round-group icon, absent from the installed package version.
// Source: https://github.com/lucide-icons/lucide/blob/main/icons/user-round-group.svg (ISC license).
const UserRoundGroup = createLucideIcon("UserRoundGroup", [
  ["path", { d: "M17 21a5 5 0 00-10 0", key: "front" }],
  ["path", { d: "M22 10.5a3.5 3.5 0 00-5.507-2.868", key: "right" }],
  ["path", { d: "M7.507 7.632A3.5 3.5 0 002 10.5", key: "left" }],
  ["circle", { cx: "12", cy: "13", r: "3", key: "center-head" }],
  ["circle", { cx: "18.5", cy: "4.5", r: "2.5", key: "right-head" }],
  ["circle", { cx: "5.5", cy: "4.5", r: "2.5", key: "left-head" }]
]);

export default UserRoundGroup;//export ends
