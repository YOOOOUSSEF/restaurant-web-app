import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SAUDI_MOBILE_REGEX = /^\+966\s?5\d\s?\d{3}\s?\d{4}$/;

export function isSaudiMobileNumber(value: string) {
  return SAUDI_MOBILE_REGEX.test(value.trim());
}

export function normalizeSaudiMobileNumber(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits.startsWith("966") && digits.startsWith("05")) {
    return `+966 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.startsWith("966")) {
    const local = digits.slice(3);
    return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return value.trim();
}

export function getCurrencyLabel(lang: "en" | "ar") {
  return lang === "ar" ? "ريال سعودي" : "SAR";
}
