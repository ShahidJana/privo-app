/**
 * Money helpers. Golden rule (plan §12.3): money is INTEGER paisa everywhere in
 * logic. Convert to a decimal string only at the display edge. Never use float
 * in calculations — `0.1 + 0.2 !== 0.3`.
 */

export type UdhaarDirection = 'lena' | 'dena';
export type UdhaarStatus = 'pending' | 'partial' | 'settled';

/** Format integer paisa as a 2-decimal string for display, e.g. 30030 -> "300.30". */
export function paisaToDisplay(paisa: number): string {
  const sign = paisa < 0 ? '-' : '';
  const abs = Math.abs(paisa);
  const rupees = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${rupees}.${remainder.toString().padStart(2, '0')}`;
}

/**
 * Parse a user-typed amount string into integer paisa. The single approved
 * entry point for converting human input into the internal representation.
 * `Math.round` is mandatory to avoid float drift on the multiply.
 */
export function inputToPaisa(input: string): number {
  const clean = input.replace(/[^0-9.]/g, '');
  if (clean === '' || clean === '.') {
    return 0;
  }
  const rupees = Number.parseFloat(clean);
  if (!Number.isFinite(rupees)) {
    return 0;
  }
  return Math.round(rupees * 100);
}

/** Auto-compute udhaar status from the original amount and total paid (both paisa). */
export function computeStatus(amount: number, totalPaid: number): UdhaarStatus {
  if (totalPaid <= 0) {
    return 'pending';
  }
  if (totalPaid >= amount) {
    return 'settled';
  }
  return 'partial';
}

export interface BalanceEntry {
  amount: number; // paisa
  direction: UdhaarDirection;
  totalPaid: number; // paisa
}

/**
 * Net balance across entries, in paisa. Positive = others owe you (net lena),
 * negative = you owe others (net dena). All-integer, so no rounding error.
 */
export function calculateNetBalance(entries: readonly BalanceEntry[]): number {
  return entries.reduce((net, entry) => {
    const remaining = entry.amount - entry.totalPaid;
    return entry.direction === 'lena' ? net + remaining : net - remaining;
  }, 0);
}

export interface PersonBalanceEntry extends BalanceEntry {
  personId: string;
}

export interface PersonNetBalance {
  personId: string;
  /** Net paisa for this person; positive = they owe you, negative = you owe them. */
  net: number;
}

/**
 * Net balance grouped per person. Order follows first appearance of each
 * personId. All-integer paisa, so no rounding error across any mix of debts.
 */
export function netBalanceByPerson(
  entries: readonly PersonBalanceEntry[],
): PersonNetBalance[] {
  const nets = new Map<string, number>();
  for (const entry of entries) {
    const remaining = entry.amount - entry.totalPaid;
    const delta = entry.direction === 'lena' ? remaining : -remaining;
    nets.set(entry.personId, (nets.get(entry.personId) ?? 0) + delta);
  }
  return Array.from(nets, ([personId, net]) => ({ personId, net }));
}
