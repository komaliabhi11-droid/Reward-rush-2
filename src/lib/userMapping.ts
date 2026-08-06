import { UserState } from '../types';

export function mapFirestoreToUserState(firebaseUser: any): UserState {
  return {
    email: firebaseUser.email || '',
    displayName: firebaseUser.fullName || firebaseUser.displayName || '',
    avatarId: firebaseUser.profilePhoto || 'user-0',
    avatarUrl: firebaseUser.profilePhoto || '',
    balance: firebaseUser.coins !== undefined ? firebaseUser.coins : 0,
    dailyStreak: firebaseUser.dailyStreak !== undefined ? firebaseUser.dailyStreak : 3,
    lastCheckIn: firebaseUser.lastCheckIn !== undefined ? firebaseUser.lastCheckIn : null,
    completedTasksCount: firebaseUser.completedTasksCount !== undefined ? firebaseUser.completedTasksCount : 0,
    spins: firebaseUser.spins !== undefined ? firebaseUser.spins : 9,
    phoneNumber: firebaseUser.mobile || '',
    upiId: firebaseUser.paymentDetails?.upiId || firebaseUser.upiId || '',
    addressLine1: firebaseUser.paymentDetails?.addressLine1 || firebaseUser.addressLine1 || '',
    addressLine2: firebaseUser.paymentDetails?.addressLine2 || firebaseUser.addressLine2 || '',
    city: firebaseUser.paymentDetails?.city || firebaseUser.city || '',
    state: firebaseUser.paymentDetails?.state || firebaseUser.state || '',
    pincode: firebaseUser.paymentDetails?.pincode || firebaseUser.pincode || '',
    redeemEmail: firebaseUser.paymentDetails?.redeemEmail || firebaseUser.redeemEmail || '',
    hasAddedPayoutDetails: firebaseUser.paymentDetails?.hasAddedPayoutDetails || firebaseUser.hasAddedPayoutDetails || false,
    history: firebaseUser.history || [],
    fcmToken: firebaseUser.fcmToken || ''
  };
}

export function mapUserStateToFirestore(user: UserState, uid: string) {
  return {
    uid,
    fullName: user.displayName || '',
    email: user.email,
    mobile: user.phoneNumber || '',
    profilePhoto: user.avatarId || 'user-0',
    coins: user.balance,
    totalEarned: user.balance,
    totalWithdrawn: 0,
    pendingWithdraw: 0,
    referralCode: '',
    joinedAt: new Date().toISOString(),
    isAdmin: false,
    isBanned: false,
    notifications: 0,
    dailyStreak: user.dailyStreak !== undefined ? user.dailyStreak : 3,
    lastCheckIn: user.lastCheckIn || null,
    completedTasksCount: user.completedTasksCount !== undefined ? user.completedTasksCount : 0,
    spins: user.spins !== undefined ? user.spins : 9,
    history: user.history || [],
    fcmToken: user.fcmToken || '',
    paymentDetails: {
      upiId: user.upiId || '',
      addressLine1: user.addressLine1 || '',
      addressLine2: user.addressLine2 || '',
      city: user.city || '',
      state: user.state || '',
      pincode: user.pincode || '',
      redeemEmail: user.redeemEmail || '',
      hasAddedPayoutDetails: user.hasAddedPayoutDetails || false
    }
  };
}
