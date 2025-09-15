import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utilities/auth";
import UploadVideo from "@/pages/UploadVideo"; // your client component

export default async function Upload() {
  const user = await getCurrentUser();

  if (!user) {
    // If not logged in, send them to loginpage
    redirect("/login");
  }

  return <UploadVideo />;
}
