/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@kumo/shared", "@kumo/anchor-client"],
  // QVAC is local-only; surface the URL to the client safely.
  env: {
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet",
  },
}
export default nextConfig
