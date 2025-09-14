import { FiDownload } from "react-icons/fi";

type VideoCardProps = {
    title: string;
    createdAt: string;
    thumbnailUrl?: string | null;
    watchUrl: string;       // blobUrl
    downloadUrl?: string;   // fallback to watchUrl + ?download=1 if missing
};

export default function VideoCard({
    title,
    createdAt,
    thumbnailUrl,
    watchUrl,
    downloadUrl,
}: VideoCardProps) {
    const dl = downloadUrl || `${watchUrl}?download=1`;

    return (
        <div className="bg-slate-50 rounded-xl overflow-hidden border-2 border-transparent">
            <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="block">
                <div className="w-full h-40 bg-gradient-to-br from-slate-200 to-slate-300 relative">
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={title || "Video thumbnail"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                    ) : null}
                </div>
            </a>

            <div className="p-4 flex justify-between items-center">
                <div className="min-w-0 pr-3">
                    <h3 className="text-lg font-semibold text-gray-800 truncate">{title || "Untitled video"}</h3>
                    <div className="mt-1 text-sm text-gray-500">
                        Uploaded: {new Date(createdAt).toLocaleString()}
                    </div>
                </div>

                <a href={dl} download title="Download">
                    <FiDownload className="h-5 w-5 text-gray-600 hover:text-blue-500 cursor-pointer shrink-0" />
                </a>
            </div>
        </div>
    );
}
