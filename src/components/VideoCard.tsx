type VideoCardProps = {
  title: string;
  date: string;
};

export default function VideoCard({ title, date }: VideoCardProps) {
  return (
    <div className="bg-slate-50 rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer">
      <div className="w-full h-40 bg-gradient-to-br from-slate-200 to-slate-300 relative">
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500">Uploaded: {date}</p>
      </div>
    </div>
  );
}
