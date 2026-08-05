export const COINS_PER_INR = 1;

export function coinsToINR(coins: number): number {
  return coins / COINS_PER_INR;
}

export function formatINR(coins: number, decimals: number = 2): string {
  return coinsToINR(coins).toFixed(decimals);
}
