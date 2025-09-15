import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utilities/auth";
import RegisterPage from "@/app/register/RegisterPage"; // your client component

export default async function Register() {
  const user = await getCurrentUser();

  if (user) {
    // If logged in, send them to homepage
    redirect("/");
  }

  return <RegisterPage />;
}
