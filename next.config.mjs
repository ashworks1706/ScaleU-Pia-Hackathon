/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/python/:path*',
        destination: 'http://127.0.0.1:5000/python/:path*',
      },
    ];
  },
  
  };
  
  export default nextConfig;
  