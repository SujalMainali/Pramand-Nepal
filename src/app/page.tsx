
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utilities/auth";
import HomeClient from "@/components/HomeClient";


export default async function HomePage() {
  // const user = await getCurrentUser();
  // if (!user) {
  //   redirect("/login");
  // }
  return <HomeClient />
}
