// src/components/LoadingScreen.tsx
"use client";

import { useLoading } from "@/context/LoadingContext";

export default function LoadingScreen() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-sm">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-blue-500"></div>
    </div>
  );
}
