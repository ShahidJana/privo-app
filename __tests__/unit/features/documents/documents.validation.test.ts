/**
 * Document validation — schema gate before the DB.
 */
import {
  createDocumentSchema,
  updateDocumentSchema,
} from '@features/documents/documents.validation';

describe('createDocumentSchema', () => {
  it('accepts a minimal valid document', () => {
    expect(
      createDocumentSchema.safeParse({ title: 'CNIC', category: 'personal' })
        .success,
    ).toBe(true);
  });

  it('accepts a full document', () => {
    expect(
      createDocumentSchema.safeParse({
        title: 'Degree',
        category: 'educational',
        docType: 'degree',
        expiryDate: 1893456000000,
        notes: 'BS CS',
      }).success,
    ).toBe(true);
  });

  it('rejects empty title', () => {
    expect(
      createDocumentSchema.safeParse({ title: '', category: 'personal' })
        .success,
    ).toBe(false);
  });

  it('rejects an unknown category', () => {
    expect(
      createDocumentSchema.safeParse({ title: 'X', category: 'work' }).success,
    ).toBe(false);
  });

  it('rejects an unknown doc type', () => {
    expect(
      createDocumentSchema.safeParse({
        title: 'X',
        category: 'personal',
        docType: 'visa',
      }).success,
    ).toBe(false);
  });

  it('rejects a non-positive expiry date', () => {
    expect(
      createDocumentSchema.safeParse({
        title: 'X',
        category: 'personal',
        expiryDate: -1,
      }).success,
    ).toBe(false);
  });
});

describe('updateDocumentSchema', () => {
  it('accepts a partial update', () => {
    expect(updateDocumentSchema.safeParse({ title: 'New' }).success).toBe(true);
  });

  it('accepts an empty object', () => {
    expect(updateDocumentSchema.safeParse({}).success).toBe(true);
  });
});
