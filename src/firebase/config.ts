export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Diagnostic logging for development
if (typeof window !== 'undefined') {
  console.log("Zynqo Firebase Config Diagnostic:", {
    hasApiKey: !!firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId || "MISSING",
    env: process.env.NODE_ENV
  });
}
