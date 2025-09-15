/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure these heavy/native packages are not bundled into client code
  serverExternalPackages: [
    'fluent-ffmpeg',
    'ffmpeg-static',
  ],
  // If you’re on Next 15, this is still valid for server bundling.
};

module.exports = nextConfig;
