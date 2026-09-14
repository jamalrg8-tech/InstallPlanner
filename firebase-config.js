// Eurolux Installation Planner — shared backend config (Firebase/Firestore).
//
// This project already has a real Firestore database provisioned, so these
// values are the live project credentials — no setup needed, they just work.
//
// If you ever need to point the app at a different Firebase project instead:
//   1. Go to https://console.firebase.google.com/ and open (or create) a project.
//   2. Project settings → General → "Your apps" → add a Web app (or use an
//      existing one) → copy the firebaseConfig object it gives you.
//   3. Paste the values below, replacing the ones already here.
//   4. Enable Firestore: Build → Firestore Database → Create database.
//   5. Set security rules appropriately for your use case (see README.md,
//      "Shared backend setup", for a starting point).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDovvWQERf2MAWVtu2zzT2ZcKqSRqnf87o",
  authDomain: "installplanner.firebaseapp.com",
  projectId: "installplanner",
  storageBucket: "installplanner.firebasestorage.app",
  messagingSenderId: "646300632432",
  appId: "1:646300632432:web:b21af4715601d668f6fbb5"
};
