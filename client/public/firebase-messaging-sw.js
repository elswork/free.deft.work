// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

// Initialize the Firebase app in the service worker with your project's config
const firebaseConfig = {
  apiKey: "AIzaSyDi-oqgYUgbtc16DMtJPlXftowGou65ZAg",
  authDomain: "free-deft-work.firebaseapp.com",
  projectId: "free-deft-work",
  storageBucket: "free-deft-work.firebasestorage.app",
  messagingSenderId: "951143682652",
  appId: "1:951143682652:web:62625c64f20b69351f8c99",
  measurementId: "G-1FLXLBP0TW",
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