/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/betrayal',
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/gallery/rooms/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
