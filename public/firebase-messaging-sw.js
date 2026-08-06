importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDkZ4R9b1aiSE3a8Hv_aenQdtulMbIbIQw",
  authDomain: "mr-earning-a806d.firebaseapp.com",
  databaseURL: "https://mr-earning-a806d-default-rtdb.firebaseio.com",
  projectId: "mr-earning-a806d",
  storageBucket: "mr-earning-a806d.firebasestorage.app",
  messagingSenderId: "139526163112",
  appId: "1:139526163112:web:eada4fcdf54a815bb6d09d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || "Reward Rush Update!";
  const notificationOptions = {
    body: payload.notification?.body || "Check your app for new updates.",
    icon: '/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
