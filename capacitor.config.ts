import type { CapacitorConfig } from '@capacitor/cli'

// Zawed Beauty is a full-stack Next.js app (server components, API routes,
// Prisma, cookie sessions), so the native shell loads the *deployed* web app
// instead of a static bundle. Set CAP_SERVER_URL to your production URL before
// building the native apps, e.g.:
//   CAP_SERVER_URL="https://shop.example.com" npx cap sync
//
// `webDir` needs an index.html for the CLI; native/www holds a small offline
// fallback shown only if the app can't reach the server.
const serverUrl = process.env.CAP_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.zawed.beauty',
  appName: 'زوّد بيوتي',
  webDir: 'native/www',
  backgroundColor: '#ffffff',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: false,
        },
      }
    : {}),
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
}

export default config
