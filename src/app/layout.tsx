import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";
import { AppStateProvider } from "@/components/AppState";
import { BottomNav, Footer, Header } from "@/components/Shell";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: { default: "Letan Moris — Mauritius & Rodrigues weather", template: "%s · Letan Moris" },
  description:
    "Konn letan Moris ek Rodrig, planifie to zournee. Independent hour-by-hour weather, rain timing and day planning for Mauritius and Rodrigues.",
  applicationName: "Letan Moris",
  appleWebApp: { capable: true, title: "Letan Moris", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F8F9" },
    { media: "(prefers-color-scheme: dark)", color: "#071C28" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applies the saved/OS theme before paint to avoid a flash.
const themeScript = `try{var t=JSON.parse(localStorage.getItem('letan.theme')||'null');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppStateProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 pt-4">{children}</main>
          <Footer />
          <BottomNav />
          <ServiceWorker />
        </AppStateProvider>
      </body>
    </html>
  );
}
