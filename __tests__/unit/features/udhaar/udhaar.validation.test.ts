/**
 * Udhaar validation — schema gate, including the return-date refinement.
 */
import {
  createPersonSchema,
  createUdhaarSchema,
  addPaymentSchema,
} from '@features/udhaar/udhaar.validation';

describe('createPersonSchema', () => {
  it('accepts a valid person', () => {
    expect(createPersonSchema.safeParse({ name: 'Ali' }).success).toBe(true);
  });
  it('rejects an empty name', () => {
    expect(createPersonSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('createUdhaarSchema', () => {
  const base = {
    personId: 'p-1',
    amount: 50000,
    direction: 'lena' as const,
    date: 1000,
  };

  it('accepts a valid debt and defaults currency to PKR', () => {
    const result = createUdhaarSchema.safeParse(base);
    expect(result.success && result.data.currency).toBe('PKR');
  });

  it('rejects a non-integer amount', () => {
    expect(
      createUdhaarSchema.safeParse({ ...base, amount: 1.5 }).success,
    ).toBe(false);
  });

  it('rejects a zero/negative amount', () => {
    expect(createUdhaarSchema.safeParse({ ...base, amount: 0 }).success).toBe(
      false,
    );
  });

  it('rejects an unknown direction', () => {
    expect(
      createUdhaarSchema.safeParse({ ...base, direction: 'gift' }).success,
    ).toBe(false);
  });

  it('rejects a return date before the lend date', () => {
    expect(
      createUdhaarSchema.safeParse({ ...base, date: 2000, returnDate: 1000 })
        .success,
    ).toBe(false);
  });

  it('accepts a return date on/after the lend date', () => {
    expect(
      createUdhaarSchema.safeParse({ ...base, date: 1000, returnDate: 2000 })
        .success,
    ).toBe(true);
  });
});

describe('addPaymentSchema', () => {
  it('accepts a valid payment', () => {
    expect(addPaymentSchema.safeParse({ amount: 1000, date: 1 }).success).toBe(
      true,
    );
  });
  it('rejects a non-positive payment', () => {
    expect(addPaymentSchema.safeParse({ amount: 0, date: 1 }).success).toBe(
      false,
    );
  });
});
