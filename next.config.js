/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Désactiver ESLint pendant le build pour permettre le déploiement
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
