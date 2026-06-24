/**
 * Money math — paisa integer invariants (plan §12.3, Challenges H4).
 */
import fc from 'fast-check';
import {
  paisaToDisplay,
  inputToPaisa,
  computeStatus,
  calculateNetBalance,
  netBalanceByPerson,
  type BalanceEntry,
  type PersonBalanceEntry,
} from '@lib/money';

describe('paisaToDisplay', () => {
  it('formats paisa as 2-decimal rupees', () => {
    expect(paisaToDisplay(30030)).toBe('300.30');
    expect(paisaToDisplay(5)).toBe('0.05');
    expect(paisaToDisplay(100)).toBe('1.00');
    expect(paisaToDisplay(0)).toBe('0.00');
  });

  it('handles negative balances', () => {
    expect(paisaToDisplay(-2550)).toBe('-25.50');
  });
});

describe('inputToPaisa', () => {
  it('parses clean input', () => {
    expect(inputToPaisa('300.30')).toBe(30030);
    expect(inputToPaisa('1')).toBe(100);
    expect(inputToPaisa('0.05')).toBe(5);
  });

  it('strips currency symbols and separators', () => {
    expect(inputToPaisa('Rs 1,250.00')).toBe(125000);
  });

  it('returns 0 for empty/garbage input', () => {
    expect(inputToPaisa('')).toBe(0);
    expect(inputToPaisa('abc')).toBe(0);
    expect(inputToPaisa('.')).toBe(0);
  });

  it('rounds the classic float case correctly', () => {
    // 166.67 * 100 = 16666.999999... without Math.round
    expect(inputToPaisa('166.67')).toBe(16667);
  });
});

describe('computeStatus', () => {
  it('maps paid amounts to status', () => {
    expect(computeStatus(1000, 0)).toBe('pending');
    expect(computeStatus(1000, 400)).toBe('partial');
    expect(computeStatus(1000, 1000)).toBe('settled');
    expect(computeStatus(1000, 1500)).toBe('settled'); // overpaid
  });
});

describe('calculateNetBalance', () => {
  it('nets lena minus dena', () => {
    const entries: BalanceEntry[] = [
      { amount: 10000, direction: 'lena', totalPaid: 0 },
      { amount: 3000, direction: 'dena', totalPaid: 1000 },
    ];
    // +10000 owed to you, -2000 you still owe = 8000
    expect(calculateNetBalance(entries)).toBe(8000);
  });

  it('property: result is always a finite integer (no float drift)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            amount: fc.integer({ min: 1, max: 10_000_000 }),
            direction: fc.constantFrom<'lena' | 'dena'>('lena', 'dena'),
            totalPaid: fc.integer({ min: 0, max: 10_000_000 }),
          }),
        ),
        entries => {
          const result = calculateNetBalance(entries);
          expect(Number.isInteger(result)).toBe(true);
          expect(Number.isFinite(result)).toBe(true);
        },
      ),
    );
  });
});

describe('netBalanceByPerson', () => {
  it('nets multiple debts per person', () => {
    const entries: PersonBalanceEntry[] = [
      { personId: 'ali', amount: 100000, direction: 'lena', totalPaid: 0 },
      { personId: 'ali', amount: 30000, direction: 'dena', totalPaid: 0 },
      { personId: 'sara', amount: 5000, direction: 'dena', totalPaid: 2000 },
    ];
    expect(netBalanceByPerson(entries)).toEqual([
      { personId: 'ali', net: 70000 }, // +100000 - 30000
      { personId: 'sara', net: -3000 }, // -(5000 - 2000)
    ]);
  });

  it('property: per-person nets sum to the overall net, all integers', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            personId: fc.constantFrom('a', 'b', 'c'),
            amount: fc.integer({ min: 1, max: 10_000_000 }),
            direction: fc.constantFrom<'lena' | 'dena'>('lena', 'dena'),
            totalPaid: fc.integer({ min: 0, max: 10_000_000 }),
          }),
        ),
        entries => {
          const perPerson = netBalanceByPerson(entries);
          const sumOfNets = perPerson.reduce((s, p) => s + p.net, 0);
          expect(sumOfNets).toBe(calculateNetBalance(entries));
          for (const p of perPerson) {
            expect(Number.isInteger(p.net)).toBe(true);
          }
        },
      ),
    );
  });
});
