"use client";

import { logout } from "@/utilities/logout";

export default function LogoutButton() {
  async function handleLogout(e: React.FormEvent) {
    e.preventDefault();
    await logout(); 
    window.location.href = "/"; // force reload to index
  }

  return (
    <form onSubmit={handleLogout}>
      <button
        type="submit"
        className="px-6 py-2 bg-red-500 text-white font-medium text-lg rounded hover:bg-red-600 transition"
      >
        Logout
      </button>
    </form>
  );
}
