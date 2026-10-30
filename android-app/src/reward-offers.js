export const REWARDS = Object.freeze({ energy: 3, gold: 100 });
export function isTeacherSession({ portal = false, name = '', classroomPlayer = false } = {}) {
  return portal === true || String(name).trim().toLowerCase() === 'teacher' || !!classroomPlayer;
}
export function goldOfferEligible({ balance, requestedPrice = 100 } = {}) {
  const value = Number(balance), price = Number(requestedPrice);
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(price) || price < 0) return false;
  return value < 100 || value < price;
}
