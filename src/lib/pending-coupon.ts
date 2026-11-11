/**
 * The coupon a shopper picked in the cart, carried to checkout.
 *
 * Kept in sessionStorage: it should survive the cart → checkout hop, but not
 * follow the shopper into a later visit where the offer may have ended. It is
 * only a preference — checkout and the server still validate the code.
 */
const KEY = "rudraksh-coupon";

export function readPendingCoupon(): string {
  try {
    return (window.sessionStorage.getItem(KEY) || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export function writePendingCoupon(code: string | null) {
  try {
    if (code) window.sessionStorage.setItem(KEY, code.trim().toUpperCase());
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage may be disabled */
  }
}
