/** IBAN checks (ISO 13616): country length and the mod-97 check digits. */
const LENGTHS: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23, GR: 27,
  HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24,
  SE: 24, SI: 19, SK: 24, SM: 27,
};

export const cleanIban = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

export function isValidIban(value: string): boolean {
  const iban = cleanIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban) || LENGTHS[iban.slice(0, 2)] !== iban.length) return false;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

/** "FR76 •••• •••• 1234": enough to recognise the account, nothing to misuse. */
export const maskIban = (value: string) => {
  const iban = cleanIban(value);
  return `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;
};

/** Groups of four, as printed on bank documents. */
export const formatIban = (value: string) => cleanIban(value).replace(/(.{4})/g, "$1 ").trim();
