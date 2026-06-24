/**
 * Logger redaction — secrets must never survive sanitize() (plan §12.9).
 */
import { sanitize } from '@lib/logger';

describe('sanitize', () => {
  it('redacts sensitive keys by substring match', () => {
    const input = {
      id: 'doc-1',
      title: 'Bank',
      secret_enc: 'AAAA',
      iv: 'BBBB',
      tag: 'CCCC',
      password: 'hunter2',
      pin: '1234',
      encryptionKey: 'deadbeef',
    };
    const out = sanitize(input) as Record<string, unknown>;

    expect(out.id).toBe('doc-1');
    expect(out.title).toBe('Bank');
    expect(out.secret_enc).toBe('[REDACTED]');
    expect(out.iv).toBe('[REDACTED]');
    expect(out.tag).toBe('[REDACTED]');
    expect(out.password).toBe('[REDACTED]');
    expect(out.pin).toBe('[REDACTED]');
    expect(out.encryptionKey).toBe('[REDACTED]');
  });

  it('recurses into nested objects and arrays', () => {
    const input = {
      rows: [{ title: 'X', secretValue: 'leak' }],
      meta: { token: 'abc', name: 'ok' },
    };
    const out = sanitize(input) as {
      rows: Array<Record<string, unknown>>;
      meta: Record<string, unknown>;
    };

    expect(out.rows[0].title).toBe('X');
    expect(out.rows[0].secretValue).toBe('[REDACTED]');
    expect(out.meta.token).toBe('[REDACTED]');
    expect(out.meta.name).toBe('ok');
  });

  it('passes primitives through unchanged', () => {
    expect(sanitize('hello')).toBe('hello');
    expect(sanitize(42)).toBe(42);
    expect(sanitize(null)).toBe(null);
  });

  it('truncates very deep structures', () => {
    const deep = { a: { b: { c: { d: { e: 'too deep' } } } } };
    const out = sanitize(deep) as Record<string, unknown>;
    expect(JSON.stringify(out)).toContain('[Truncated]');
  });
});
