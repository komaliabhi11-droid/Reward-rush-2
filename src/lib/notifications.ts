import { getToken } from 'firebase/messaging';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, messaging, auth } from './firebase';

// Standard VAPID key placeholder or user's key if they configure it
const DEFAULT_VAPID_KEY = ''; // Can be set by user or retrieved from config

export async function requestNotificationPermissionAndGetToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return null;
    }

    if (!messaging) {
      console.warn('FCM messaging is not initialized.');
      return null;
    }

    // Try to register service worker if not already registered
    let swReg: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .catch(err => {
          console.warn('Service worker registration failed:', err);
          return undefined;
        });
    }

    const token = await getToken(messaging, {
      vapidKey: DEFAULT_VAPID_KEY || undefined,
      serviceWorkerRegistration: swReg
    });

    if (token) {
      console.log('FCM Token received:', token);
      await saveTokenToUserDoc(token);
      return token;
    } else {
      console.warn('No FCM registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token:', err);
    return null;
  }
}

export async function saveTokenToUserDoc(token: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, {
      fcmToken: token,
      updatedAt: new Date().toISOString()
    });
    console.log('Successfully saved FCM token to Firestore for user:', currentUser.uid);
  } catch (err) {
    console.error('Failed to save FCM token to Firestore:', err);
  }
}

// Helper to register a simulated/debug token for development/iframe testing
export async function saveSimulatedToken(simulatedToken: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, {
      fcmToken: simulatedToken,
      updatedAt: new Date().toISOString()
    });
    console.log('Successfully saved simulated token to Firestore:', simulatedToken);
  } catch (err) {
    console.error('Failed to save simulated token to Firestore:', err);
  }
}

// Client-side helper to trigger server push notifications for specific events
export async function triggerPushNotificationOnServer(type: string, amount: number, customTitle?: string, customBody?: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: currentUser.uid,
        type,
        amount,
        title: customTitle,
        body: customBody
      })
    });
    const result = await response.json();
    console.log('[Server Push] Notification triggered:', result);
  } catch (err) {
    console.error('[Server Push] Failed to trigger notification on server:', err);
  }
}

