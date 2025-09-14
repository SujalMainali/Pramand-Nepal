// app/page.tsx (or wherever your HomePage lives)
"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import ContentSection, { VideoItem } from "../components/ContentSection";

export default function HomePage() {
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState({ mine: true, all: true });

  useEffect(() => {
    (async () => {
      try {
        setLoading((s) => ({ ...s, mine: true }));
        const res = await fetch("/api/videos/self", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setMyVideos(data.items ?? []);
        } else {
          setMyVideos([]);
        }
      } finally {
        setLoading((s) => ({ ...s, mine: false }));
      }
    })();

    (async () => {
      try {
        setLoading((s) => ({ ...s, all: true }));
        const res = await fetch("/api/videos/browse", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setAllVideos(data.items ?? []);
        } else {
          setAllVideos([]);
        }
      } finally {
        setLoading((s) => ({ ...s, all: false }));
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-6xl pt-10 mx-auto px-4">
        <ContentSection
          title="My Uploaded Videos"
          showUpload
          videos={loading.mine ? [] : myVideos}
        />

        <ContentSection
          title="Browse Videos"
          videos={loading.all ? [] : allVideos}
        />
      </div>
    </div>
  );
}
