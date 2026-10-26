/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dcdn-us.mitiendanube.com',
        pathname: '/stores/**',
      },
      {
        protocol: 'https',
        hostname: 'd26lpennugtm8s.cloudfront.net',
        pathname: '/assets/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/photos/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static-c4-1.s3.amazonaws.com',
        pathname: '/assets/**',
      },
    ],
  },
};

module.exports = nextConfig;
