// src/utilities/logout.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
  const cookieStore = await cookies(); // ✅ await it
  cookieStore.delete("sessionToken"); 

  redirect("/"); // optional: send user back to homepage
}
