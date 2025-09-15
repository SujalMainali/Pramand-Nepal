// src/utilities/logout.ts
"use server";

import { cookies } from "next/headers";

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("sessionToken");
  
  // no redirect here – handled client-side
  return { success: true };
}
