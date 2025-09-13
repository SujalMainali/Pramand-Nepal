"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import ContentSection from "../components/ContentSection";

export default function HomePage() {
  const router = useRouter();

  // Check login on mount
  // useEffect(() => {
  //   const isLoggedIn = localStorage.getItem("isLoggedIn");
  //   if (!isLoggedIn) {
  //     router.push("/login");
  //   }
  // }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <Header />

      <div className="max-w-6xl mx-auto px-4">
        {/* My Uploaded Videos */}
        <ContentSection
          title="My Uploaded Videos"
          showUpload
          videos={[
            { title: "Security Camera - Front Door", date: "Sept 12, 2025" },
            { title: "Parking Lot Incident", date: "Sept 11, 2025" },
            { title: "Backyard Motion Detection", date: "Sept 10, 2025" },
          ]}
        />

        {/* Browse Videos */}
        <ContentSection
          title="Browse Videos"
          videos={[
            { title: "Retail Store Security Feed", date: "Sept 13, 2025" },
            { title: "Office Building Entrance", date: "Sept 13, 2025" },
            { title: "Warehouse Night Surveillance", date: "Sept 12, 2025" },
            { title: "Street Camera Analysis", date: "Sept 12, 2025" },
            { title: "ATM Security Footage", date: "Sept 11, 2025" },
            { title: "Shopping Mall Corridor", date: "Sept 11, 2025" },
            { title: "Gas Station Perimeter", date: "Sept 10, 2025" },
            { title: "School Campus Security", date: "Sept 10, 2025" },
            { title: "Bank Interior Camera", date: "Sept 9, 2025" },
            { title: "Hospital Emergency Exit", date: "Sept 9, 2025" },
            { title: "Construction Site Monitor", date: "Sept 8, 2025" },
            { title: "Public Park Surveillance", date: "Sept 8, 2025" },
          ]}
        />
      </div>
    </div>
  );
}
