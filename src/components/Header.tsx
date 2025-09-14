import Link from "next/link";
import { getCurrentUser } from "@/utilities/auth";

export default async function Header() {
  const user = await getCurrentUser().catch(() => null);
  const canModerate = !!user && ["admin", "moderator"].includes((user as any).role ?? "general");

  return (
    <div className="pl-12 text-left py-8 bg-gray-50 backdrop-blur-md flex justify-between">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 drop-shadow-lg mb-2">
          Pramand Nepal
        </h1>
        <p className="text-gray-600 text-lg font-light">Blah Blah Blah</p>
      </div>

      {canModerate && (
        <Link href="/moderation/hidden" className="inline-block">
          <button className="mt-4 px-6 py-2 bg-green-500 text-white font-medium text-lg rounded hover:bg-green-600 transition">
            Hidden Videos
          </button>
        </Link>
      )}
    </div>
  );
}
