import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utilities/auth";
import LoginPage from "@/pages/LoginPage"; // your client component

export default async function Login() {
  const user = await getCurrentUser();

  if (user) {
    // If logged in, send them to homepage
    redirect("/");
  }

  return <LoginPage />;
}
