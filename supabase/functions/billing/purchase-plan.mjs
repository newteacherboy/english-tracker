import { PRODUCTS } from './play.mjs';

// Demo access unlocks learning, but is not a purchased subscription.
export function purchasePlanFor(account, accessPlan, entitlements, now = Date.now()) {
  if (!account.sandboxOnly) return accessPlan;
  let plan = 'free';
  for (const entitlement of entitlements || []) {
    const product = PRODUCTS[entitlement.product_key];
    if (!product || product.role !== account.role
      || !['apple', 'google'].includes(entitlement.provider)
      || !(Date.parse(entitlement.valid_until) > now)) continue;
    if (product.plan === 'premium_pro') return 'premium_pro';
    if (product.plan === 'pro') plan = 'pro';
  }
  return plan;
}
