// components/VideoRow.tsx
"use client";

type VideoRowProps = {
  index?: number; // Serial number
  video: {
    _id: string;
    title: string;
    createdAt: string;
    blobUrl: string;
    downloadUrl?: string;
    thumbnail?: { url?: string | null };
    owner?: { name?: string; email?: string };
  };
  onDelete?: () => void;
  onApprove?: () => void;
  onDecline?: () => void;
  showApproveDecline?: boolean;
  showDelete?: boolean;
};

export default function VideoRow({
  index,
  video,
  onDelete,
  onApprove,
  onDecline,
  showApproveDecline,
  showDelete,
}: VideoRowProps) {
  const dl = video.downloadUrl || `${video.blobUrl}?download=1`;

  return (
    <tr className="border-b last:border-0">
      {/* Serial number */}
      <td className="px-4 py-3 text-sm font-medium text-gray-700">{index}</td>

      {/* Thumbnail */}
      <td className="px-4 py-3">
        <a
          href={video.blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-32 h-20 bg-gray-100 rounded overflow-hidden"
        >
          {video.thumbnail?.url ? (
            <img
              src={video.thumbnail.url}
              alt={video.title || "Video thumbnail"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
              No Thumbnail
            </div>
          )}
        </a>
      </td>

      {/* Title */}
      <td className="px-4 py-3 text-sm text-gray-800">
        <div className="font-medium">{video.title || "Untitled video"}</div>
        <div className="text-xs text-gray-500">
          Uploaded: {new Date(video.createdAt).toLocaleString()}
          {video.owner?.name ? ` • by ${video.owner.name}` : ""}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {showApproveDecline && (
            <>
              <button
                onClick={onApprove}
                className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={onDecline}
                className="inline-flex items-center justify-center rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Decline
              </button>
            </>
          )}

          {showDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
