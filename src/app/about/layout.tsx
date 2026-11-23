import type { Metadata } from "next";

export const metadata: Metadata = { title: "About, data sources & privacy" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
