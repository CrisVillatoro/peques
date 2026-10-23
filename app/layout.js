import "./globals.css";

export const metadata = {
  title: "Berlin Family Scout",
  description: "What can we do with the kids today? One tap, for Berlin families.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Scout", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#0E6B5C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
