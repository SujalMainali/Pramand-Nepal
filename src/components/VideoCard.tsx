import { FiDownload } from "react-icons/fi";

type VideoCardProps = {
    title: string;
    date: string;
};

export default function VideoCard({ title, date }: VideoCardProps) {
    return (
        <div className="bg-slate-50 rounded-xl overflow-hidden border-2 border-transparent cursor-pointer">
            <div className="w-full h-40 bg-gradient-to-br from-slate-200 to-slate-300 relative">
            </div>
            <div className="p-4 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <div className="flex items-center justify-between mt-1 text-sm text-gray-500">
                        <span>Uploaded: {date}</span>
                    </div>
                </div>
                <FiDownload className="h-5 w-5 text-gray-600 hover:text-blue-500 cursor-pointer" />
            </div>
        </div>
    );
}
