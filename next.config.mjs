/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  // Tell Next.js NOT to auto-redirect trailing slashes (its default
  // behavior is a 308 strip when trailingSlash: false). With this
  // flag set, the redirects() rule below handles the strip with an
  // explicit 301, which is what SEO crawlers expect.
  skipTrailingSlashRedirect: true,

  async redirects() {
    return [
      // 301-redirect any non-root path with a trailing slash to the
      // canonical no-slash form. `:path+` requires at least one
      // path segment so `/` itself isn't a self-redirect.
      {
        source: '/:path+/',
        destination: '/:path+',
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
