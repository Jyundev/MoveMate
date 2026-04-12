import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.movemate.app",
  appName: "MoveMate",
  webDir: "out",
  // server.url 설정 시 로컬 번들 대신 배포된 URL을 WebView로 로드
  server: {
    url: "https://movemate-route.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
