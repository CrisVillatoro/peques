/** @type {import('next').NextConfig} */
const nextConfig = {
  // "export" writes a plain folder of HTML/CSS/JS into out/ — no server needed.
  // That is what you upload to your IONOS webspace, like you do with Iris.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
