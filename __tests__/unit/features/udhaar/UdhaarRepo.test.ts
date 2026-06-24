/**
 * UdhaarRepo — persons, debts, payments and balances against a routed fake
 * executor (no native DB). Focus: status auto-recompute on payment, delete-person
 * guard, and per-person net balance.
 */
import { UdhaarRepo } from '@features/udhaar/UdhaarRepo';
import type {
  PersonRow,
  UdhaarRowWithPaid,
} from '@features/udhaar/udhaar.types';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@lib/errors';
import type {
  QueryResult,
  Scalar,
  Transaction,
  TransactionalExecutor,
} from '@core/db/types';

interface Route {
  re: RegExp;
  rows?: unknown[];
  fail?: boolean;
}

class FakeDb implements TransactionalExecutor {
  calls: { query: string; params: Scalar[] | undefined }[] = [];
  txCount = 0;
  routes: Route[] = [];
  deleteAffected = 1;

  execute(query: string, params?: Scalar[]): Promise<QueryResult> {
    this.calls.push({ query, params });
    const route = this.routes.find(r => r.re.test(query));
    if (route?.fail) {
      return Promise.reject(new Error('db fail'));
    }
    if (/^\s*SELECT/i.test(query)) {
      return Promise.resolve({
        rows: (route?.rows ?? []) as Record<string, Scalar>[],
        rowsAffected: 0,
      });
    }
    if (/deleted_at = \?/.test(query)) {
      return Promise.resolve({ rows: [], rowsAffected: this.deleteAffected });
    }
    return Promise.resolve({ rows: [], rowsAffected: 1 });
  }

  async transaction(fn: (tx: Transaction) => Promise<void>): Promise<void> {
    this.txCount += 1;
    await fn(this as unknown as Transaction);
  }

  find(re: RegExp) {
    return this.calls.find(c => re.test(c.query));
  }
}

function makeRepo(db: FakeDb): UdhaarRepo {
  return new UdhaarRepo(db, { now: () => 1000, newId: () => 'new-id' });
}

const personRow: PersonRow = { id: 'p1', name: 'Ali', phone: null, created_at: 1 };
const udhaarRow: UdhaarRowWithPaid = {
  id: 'u1',
  person_id: 'p1',
  amount: 1000,
  direction: 'lena',
  currency: 'PKR',
  date: 1,
  return_date: null,
  status: 'pending',
  note: null,
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
  total_paid: 0,
};

describe('persons', () => {
  it('createPerson inserts and returns the person', async () => {
    const db = new FakeDb();
    const person = await makeRepo(db).createPerson({ name: 'Ali' });
    expect(person).toEqual({
      id: 'new-id',
      name: 'Ali',
      phone: null,
      createdAt: 1000,
    });
    expect(db.find(/INSERT INTO persons/)).toBeDefined();
  });

  it('deletePerson is blocked when active debts exist', async () => {
    const db = new FakeDb();
    db.routes = [
      { re: /FROM persons WHERE id/, rows: [personRow] },
      { re: /COUNT\(\*\) AS c/, rows: [{ c: 2 }] },
    ];
    await expect(makeRepo(db).deletePerson('p1')).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(db.find(/DELETE FROM persons/)).toBeUndefined();
  });

  it('deletePerson removes a person with no active debts', async () => {
    const db = new FakeDb();
    db.routes = [
      { re: /FROM persons WHERE id/, rows: [personRow] },
      { re: /COUNT\(\*\) AS c/, rows: [{ c: 0 }] },
    ];
    await makeRepo(db).deletePerson('p1');
    expect(db.find(/DELETE FROM persons/)).toBeDefined();
  });

  it('deletePerson throws NotFound for a missing person', async () => {
    const db = new FakeDb();
    db.routes = [{ re: /FROM persons WHERE id/, rows: [] }];
    await expect(makeRepo(db).deletePerson('nope')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('create udhaar', () => {
  it('creates a pending debt with full remaining', async () => {
    const db = new FakeDb();
    db.routes = [{ re: /FROM persons WHERE id/, rows: [personRow] }];
    const entry = await makeRepo(db).create({
      personId: 'p1',
      amount: 5000,
      direction: 'lena',
      date: 1000,
    });
    expect(entry.status).toBe('pending');
    expect(entry.remaining).toBe(5000);
    expect(entry.totalPaid).toBe(0);
    expect(db.find(/INSERT INTO udhaar\b/)).toBeDefined();
  });

  it('throws NotFound when the person does not exist', async () => {
    const db = new FakeDb();
    db.routes = [{ re: /FROM persons WHERE id/, rows: [] }];
    await expect(
      makeRepo(db).create({
        personId: 'ghost',
        amount: 100,
        direction: 'lena',
        date: 1000,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects a return date before the lend date (validation)', async () => {
    const db = new FakeDb();
    await expect(
      makeRepo(db).create({
        personId: 'p1',
        amount: 100,
        direction: 'lena',
        date: 2000,
        returnDate: 1000,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(db.calls).toHaveLength(0);
  });
});

describe('addPayment status recompute', () => {
  it('marks a debt settled when fully paid', async () => {
    const db = new FakeDb();
    db.routes = [
      { re: /AS total FROM udhaar_payments/, rows: [{ total: 1000 }] },
      { re: /FROM\s+udhaar u/, rows: [udhaarRow] },
    ];
    await makeRepo(db).addPayment('u1', { amount: 1000, date: 1000 });

    expect(db.find(/INSERT INTO udhaar_payments/)).toBeDefined();
    const update = db.find(/UPDATE udhaar SET status/);
    expect(update?.params).toContain('settled');
  });

  it('marks a debt partial when partly paid', async () => {
    const db = new FakeDb();
    db.routes = [
      { re: /AS total FROM udhaar_payments/, rows: [{ total: 400 }] },
      { re: /FROM\s+udhaar u/, rows: [udhaarRow] },
    ];
    await makeRepo(db).addPayment('u1', { amount: 400, date: 1000 });
    expect(db.find(/UPDATE udhaar SET status/)?.params).toContain('partial');
  });

  it('throws NotFound for a missing debt', async () => {
    const db = new FakeDb();
    db.routes = [{ re: /FROM\s+udhaar u/, rows: [] }];
    await expect(
      makeRepo(db).addPayment('ghost', { amount: 100, date: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('getPersonBalances', () => {
  it('nets a person across multiple debts', async () => {
    const db = new FakeDb();
    db.routes = [
      {
        re: /JOIN persons/,
        rows: [
          { person_id: 'A', name: 'Ali', amount: 1000, direction: 'lena', total_paid: 0 },
          { person_id: 'A', name: 'Ali', amount: 300, direction: 'dena', total_paid: 0 },
        ],
      },
    ];
    const balances = await makeRepo(db).getPersonBalances();
    expect(balances).toEqual([{ personId: 'A', name: 'Ali', net: 700 }]);
  });
});

describe('softDelete', () => {
  it('throws NotFound when nothing was deleted', async () => {
    const db = new FakeDb();
    db.deleteAffected = 0;
    await expect(makeRepo(db).softDelete('gone')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
