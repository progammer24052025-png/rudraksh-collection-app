/**
 * Utilities for generating professional Indian Tax Invoices & Cash Memos
 * compliant with GST layout norms (similar to Amazon / Flipkart India).
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones > 0 ? " " + ONES[ones] : "");
}

function threeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let str = "";
  if (hundred > 0) {
    str += ONES[hundred] + " Hundred";
    if (rest > 0) str += " and ";
  }
  if (rest > 0) {
    str += twoDigits(rest);
  }
  return str;
}

/**
 * Converts a rupee amount into Indian English words (Crore, Lakh, Thousand, Hundred).
 * e.g. 2499 -> "Two Thousand Four Hundred and Ninety-Nine Rupees Only"
 */
export function amountInWords(amount: number): string {
  if (amount <= 0 || isNaN(amount)) return "Zero Rupees Only";

  const integerPart = Math.floor(amount);
  const paisePart = Math.round((amount - integerPart) * 100);

  let num = integerPart;
  const parts: string[] = [];

  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  if (crores > 0) parts.push(threeDigits(crores) + " Crore");

  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  if (lakhs > 0) parts.push(threeDigits(lakhs) + " Lakh");

  const thousands = Math.floor(num / 1000);
  num %= 1000;
  if (thousands > 0) parts.push(threeDigits(thousands) + " Thousand");

  if (num > 0) parts.push(threeDigits(num));

  let result = parts.join(" ") + " Rupees";
  if (paisePart > 0) {
    result += " and " + twoDigits(paisePart) + " Paise";
  }
  return result + " Only";
}

export interface SellerDetails {
  storeName: string;
  tagline: string;
  legalEntity: string;
  address: string;
  cityStatePincode: string;
  gstin: string;
  pan: string;
  cin?: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
}

export const STORE_SELLER_DETAILS: SellerDetails = {
  storeName: "Rudraksh Collection",
  tagline: "Children's Wear & Ethnic Studio",
  legalEntity: "Rudraksh Collection Retail",
  address: `125, Pancham Heights,
Khodiyar Nagar,
New V.I.P. Road,
Vadodara`,
  cityStatePincode: "Gujarat - 390019",
  gstin: "24AAACR1234F1Z5",
  pan: "AAACR1234F",
  cin: "U18101GJ2024PTC123456",
  supportEmail: "help@rudrakshcollection.in",
  supportPhone: "+91 98765 43210",
  website: "www.rudrakshcollection.in",
};

