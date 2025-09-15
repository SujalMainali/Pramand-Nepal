import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utilities/auth";
import ModerationPage from "@/app/moderation/hidden/ModerationPage"; // your client component

export default async function Moderation() {
  const user = await getCurrentUser();

  if (!user) {
    // not logged in → send to login
    redirect("/login");
  }

  if (user.role !== "admin") {
    // logged in but not admin → forbid access
    redirect("/");
  }

  return <ModerationPage />;
}
