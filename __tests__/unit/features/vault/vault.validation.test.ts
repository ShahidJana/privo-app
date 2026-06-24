/**
 * Vault validation — schema rejects bad input before it reaches the DB.
 */
import {
  createVaultSchema,
  updateVaultSchema,
} from '@features/vault/vault.validation';

describe('createVaultSchema', () => {
  it('accepts a minimal valid entry', () => {
    const result = createVaultSchema.safeParse({
      title: 'Gmail',
      secret: 'hunter2',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full valid entry', () => {
    const result = createVaultSchema.safeParse({
      title: 'Bank',
      username: 'me@x.com',
      secret: 'p@ss',
      category: 'bank',
      url: 'https://bank.example',
      notes: 'PIN reminder',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createVaultSchema.safeParse({ title: '', secret: 'x' }).success).toBe(
      false,
    );
  });

  it('rejects empty secret', () => {
    expect(
      createVaultSchema.safeParse({ title: 'X', secret: '' }).success,
    ).toBe(false);
  });

  it('rejects an unknown category', () => {
    expect(
      createVaultSchema.safeParse({
        title: 'X',
        secret: 'y',
        category: 'crypto-wallet',
      }).success,
    ).toBe(false);
  });

  it('rejects an over-long secret', () => {
    expect(
      createVaultSchema.safeParse({
        title: 'X',
        secret: 'a'.repeat(5000),
      }).success,
    ).toBe(false);
  });

  it('trims the title', () => {
    const result = createVaultSchema.safeParse({
      title: '  Gmail  ',
      secret: 'x',
    });
    expect(result.success && result.data.title).toBe('Gmail');
  });
});

describe('updateVaultSchema', () => {
  it('accepts a partial update', () => {
    expect(updateVaultSchema.safeParse({ title: 'New title' }).success).toBe(
      true,
    );
  });

  it('accepts an empty object (no-op update)', () => {
    expect(updateVaultSchema.safeParse({}).success).toBe(true);
  });

  it('still rejects invalid provided fields', () => {
    expect(updateVaultSchema.safeParse({ secret: '' }).success).toBe(false);
  });
});
