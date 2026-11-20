import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { site } from "@/config/site";
import "@/style/globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  icons: { icon: "/images/icon.png" },
  robots: { index: true, follow: true },
  verification: {
    other: { "msvalidate.01": "D8EF052A74B4BB3D3229205232205792" },
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={site.language}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader name={site.name} logo={site.logo} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
