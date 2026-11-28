export interface ParsedMfsSms {
  amount?: number;
  paymentMethod?: 'bKash' | 'Nagad' | 'Rocket';
  type: 'expense' | 'income';
  note?: string;
}

/**
 * Parses Bangladeshi bKash / Nagad / Rocket SMS notifications to auto-fill amount, method & TrxID.
 */
export function parseMobileBankingSms(rawText: string): ParsedMfsSms {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  let paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | undefined;
  if (lower.includes('bkash')) paymentMethod = 'bKash';
  else if (lower.includes('nagad')) paymentMethod = 'Nagad';
  else if (lower.includes('rocket') || lower.includes('dbbl')) paymentMethod = 'Rocket';

  const isIncome =
    lower.includes('cash in') ||
    lower.includes('you have received') ||
    lower.includes('received tk') ||
    lower.includes('add money');
  const type: 'expense' | 'income' = isIncome ? 'income' : 'expense';

  // Match Tk 1,250.00 / BDT 450 / Tk450
  const amtMatch = text.match(/(?:tk\.?|bdt)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : undefined;

  // Match TrxID
  const trxMatch = text.match(/trxid\s*[:\s]*([a-z0-9]+)/i);
  const trxNote = trxMatch ? `TrxID ${trxMatch[1]}` : undefined;

  return {
    amount: amount && !isNaN(amount) ? amount : undefined,
    paymentMethod,
    type,
    note: trxNote,
  };
}
