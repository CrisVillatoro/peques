import "./globals.css";

export const metadata = {
  title: "Peques",
  description: "What shall we do today? Good things to do with the little ones in Berlin.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Peques", statusBarStyle: "default" },
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
