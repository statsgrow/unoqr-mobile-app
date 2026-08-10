import { HomeAnalytics } from "@/components/home/HomeAnalytics";
import { GeneralLayout } from "@/components/layout/GeneralLayout";

/* ------------------ BREAK ------------------ */

// Renders the app home route inside the shared general layout.
export default function HomeScreen() {
  //Default Return
  return (
    <GeneralLayout scroll={false}>
      <HomeAnalytics />
    </GeneralLayout>
  );//return ends
};//export ends
