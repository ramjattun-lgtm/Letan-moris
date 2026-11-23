import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perfect Day finder", description: "The best day this week for a beach day, hike, boat trip, picnic or photos in Mauritius and Rodrigues." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
