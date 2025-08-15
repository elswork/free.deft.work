// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

// Initialize the Firebase app in the service worker with your project's config
const firebaseConfig = {
  apiKey: "%REACT_APP_FIREBASE_API_KEY%",
  authDomain: "%REACT_APP_FIREBASE_AUTH_DOMAIN%",
  projectId: "%REACT_APP_FIREBASE_PROJECT_ID%",
  storageBucket: "%REACT_APP_FIREBASE_STORAGE_BUCKET%",
  messagingSenderId: "%REACT_APP_FIREBASE_MESSAGING_SENDER_ID%",
  appId: "%REACT_APP_FIREBASE_APP_ID%",
  measurementId: "%REACT_APP_FIREBASE_MEASUREMENT_ID%",
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Optional: Add an icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});