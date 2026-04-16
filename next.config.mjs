/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      path: false,
      os: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      "@hyperlane-xyz/sdk": false,
      "@hyperlane-xyz/registry": false,
      "@hyperlane-xyz/utils": false,
      "@solana/web3.js": false,
      "@fatsolutions/tongo-sdk": false,
      "@cosmjs/proto-signing": false,
      "@cosmjs/stargate": false,
      "@cosmjs/tendermint-rpc": false,
      "@cosmjs/encoding": false,
      "@cosmjs/math": false,
      "@cosmjs/amino": false,
      "@cartridge/controller": false,
    };
    return config;
  },
};

export default nextConfig;