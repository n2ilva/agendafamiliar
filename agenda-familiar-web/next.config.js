/**
 * Next.js configuration: allow importing files from outside the project root
 * (shared/) by enabling experimental.externalDir. This is necessary because
 * the monorepo keeps shared code outside the web package.
 */
module.exports = {
  experimental: {
    externalDir: true
  }
};
