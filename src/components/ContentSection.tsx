"use client";
import { useRouter } from "next/navigation";
import VideoCard from "./VideoCard";

export type VideoItem = {
  _id: string;
  title: string;
  createdAt: string;
  blobUrl: string;
  downloadUrl?: string;
  thumbnail?: { url?: string | null };
};

type ContentSectionProps = {
  title: string;
  videos: VideoItem[];
  showUpload?: boolean;
};

export default function ContentSection({ title, videos, showUpload = false }: ContentSectionProps) {
  const router = useRouter();

  const handleUploadClick = () => {
    router.push("/upload"); // <-- use your actual upload route
  };

  return (
    <div className="bg-white rounded-2xl p-8 mb-8 shadow-md animate-slideUp">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 border-b-2 border-slate-100 pb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 relative">
          {title}
          <span className="absolute -bottom-[14px] left-0 w-16 h-1 bg-blue-500 rounded" />
        </h2>

        {showUpload && (
          <button
            onClick={handleUploadClick}
            className="px-6 py-2 rounded-full border-2 border-blue-500 text-blue-600 font-semibold hover:bg-blue-500 hover:text-white transition-all"
          >
            + Upload Video
          </button>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Nothing here yet.
        </div>
      ) : (
        <div className={`grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3`}>
          {videos.map((v) => (
            <VideoCard
              key={v._id}
              title={v.title}
              createdAt={v.createdAt}
              thumbnailUrl={v.thumbnail?.url || undefined}
              watchUrl={v.blobUrl}
              downloadUrl={v.downloadUrl}
            />
          ))}
        </div>
      )}

      {showUpload && videos.length > 0 && (
        <div className="mt-6 flex justify-center">
          <a
            href="/uploaded"
            className="px-6 py-2 rounded-full border-2 border-blue-500 text-blue-600 font-semibold hover:bg-blue-500 hover:text-white transition-all"
          >
            View All
          </a>
        </div>
      )}
    </div>
  );
}
