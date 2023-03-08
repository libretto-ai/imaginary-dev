const removeImports = require("next-remove-imports");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { esmExternals: true, appDir: true },
  env: {
    PROMPT_PROJECT_KEY: process.env.PROMPT_PROJECT_KEY ?? "",
    PROMPT_REPORTING_URL: process.env.PROMPT_REPORTING_URL ?? "",
  },
};
// @ts-ignore
module.exports = removeImports()(nextConfig);
