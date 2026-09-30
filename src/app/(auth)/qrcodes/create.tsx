import { useLocalSearchParams } from "expo-router";

import CreateQrScreen from "@/helpers/qrcodes/create/QrCreateScreen";

/* ------------------ BREAK ------------------ */

// Opens a new QR form or the saved QR selected by its route ID.
export default function CreateQrRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const qrId = Array.isArray(params.id) ? params.id[0] : params.id;

  //Default Return
  return <CreateQrScreen key={qrId || "new"} qrId={qrId} />;//return ends
};//export ends
