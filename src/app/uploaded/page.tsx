import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utilities/auth";
import UploadedPage from "@/app/upload/UploadedPage"; // your client component

export default async function Uploaded() {
  const user = await getCurrentUser();

  if (!user) {
    // If not logged in, send them to loginpage
    redirect("/login");
  }

  return <UploadedPage />;
}
