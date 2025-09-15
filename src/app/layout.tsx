import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { LoadingProvider } from "@/context/LoadingContext";
import LoadingScreen from "@/components/LoadingScreen";

export const metadata: Metadata = {
  title: "Pramand Nepal",
  description: "Collection of video proofs of looting and arson",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-screen flex flex-col bg-gray-50">
        <LoadingProvider>
        <Header />
        {children}
        <LoadingScreen />
        </LoadingProvider>
      </body>
    </html>
  );
}
