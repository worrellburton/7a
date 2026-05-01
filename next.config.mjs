/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  // Default — strip trailing slashes. Next.js's built-in handler
  // does this with a 308. The custom redirects() below overrides
  // that with an explicit 301 so SEO crawlers (Screaming Frog
  // etc.) see consistent permanent redirects across the site
  // instead of a 301/308 mix that gets flagged in audits.
  trailingSlash: false,

  async redirects() {
    return [
      // Match any non-root path that ends with a trailing slash
      // and 301-redirect to the same path without it. `:path+`
      // requires at least one path segment so `/` itself isn't a
      // self-redirect. Runs BEFORE Next.js's auto-308 normalize,
      // so this is the version SEO tools see.
      {
        source: '/:path+/',
        destination: '/:path+',
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
