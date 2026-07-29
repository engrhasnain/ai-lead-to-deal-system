import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import PublicDemoBanner from "@/components/ui/PublicDemoBanner";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Lead to Deal System",
  description: "AI-powered lead enrichment, scoring, and deal pipeline management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
      <body className="relative min-h-screen" suppressHydrationWarning>
        <div className="app-gradient-blob" aria-hidden="true" />
        <Navbar />
        <main className="relative z-10 md:pl-60 pt-14 md:pt-0 min-h-screen bg-white">
          <PublicDemoBanner />
          {children}
        </main>
        <Toaster
          position="bottom-center"
          containerClassName="!bottom-4 sm:!bottom-6"
          toastOptions={{
            style: {
              fontSize: "13px",
              borderRadius: "12px",
              fontWeight: 500,
              color: "#333333",
              border: "1px solid #E8E8E8",
            },
            success: {
              iconTheme: { primary: "#F26522", secondary: "#FFFFFF" },
            },
          }}
        />
      </body>
    </html>
  );
}
