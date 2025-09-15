import Link from "next/link";
import { getCurrentUser } from "@/utilities/auth";
import { logout } from "@/utilities/logout";

export default async function Header() {
  const user = await getCurrentUser().catch(() => null);
  const canModerate =
    !!user && ["admin", "moderator"].includes((user as any).role ?? "general");

  return (
    <div className="pl-12 text-left py-8 bg-gray-50 backdrop-blur-md flex justify-between items-center">
      <div>
        <Link href="/" className="cursor-pointer">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 drop-shadow-lg mb-2">
            Pramand Nepal
          </h1>
        </Link>
        <p className="text-gray-600 text-lg font-light">Collecting Evidences</p>
      </div>

      <div className="flex items-center gap-4 pr-12">
        {canModerate && (
          <Link href="/moderation/hidden">
            <button className="px-6 py-2 bg-green-500 text-white font-medium text-lg rounded hover:bg-green-600 transition">
              Hidden Videos
            </button>
          </Link>
        )}

        {user && (
          <form action={logout}>
            <button
              type="submit"
              className="px-6 py-2 bg-red-500 text-white font-medium text-lg rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
