export type TaskType = 'video' | 'banner' | 'survey' | 'action';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: TaskType;
  category: string;
  isCompleted: boolean;
  cooldown?: number; // timestamp until can be run again
  duration?: number; // countdown in seconds for video/actions
}

export interface UserState {
  email: string;
  displayName?: string;
  avatarId?: string;
  balance: number;
  dailyStreak: number;
  lastCheckIn: string | null; // ISO Date String
  completedTasksCount: number;
  history: Transaction[];
  spins?: number;
  phoneNumber?: string;
  upiId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  redeemEmail?: string;
  hasAddedPayoutDetails?: boolean;
  avatarUrl?: string;
  fcmToken?: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  timestamp: string;
  type: 'earn' | 'redeem';
  status?: 'pending' | 'completed' | 'failed';
}
