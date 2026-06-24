/**
 * UdhaarRepo — lena-dena tracker. Manages persons, debts and payments.
 *
 * Rules (plan §4.4, §12.3):
 *   - Money is integer paisa end-to-end.
 *   - A debt's status is auto-recomputed from the sum of its payments
 *     (pending → partial → settled), never set by hand.
 *   - A person cannot be deleted while they have active debts.
 *   - Net balance per person via the pure {@link netBalanceByPerson} engine.
 *
 * Clock/id injected for deterministic tests; production wiring in
 * @core/repositories.
 */
import { selectOne, selectRows } from '@core/db/dao/queryHelpers';
import type { Scalar, TransactionalExecutor } from '@core/db/types';
import { ConflictError, NotFoundError, ValidationError } from '@lib/errors';
import {
  computeStatus,
  netBalanceByPerson,
  type PersonBalanceEntry,
} from '@lib/money';
import {
  addPaymentSchema,
  createPersonSchema,
  createUdhaarSchema,
  updateUdhaarSchema,
  type AddPaymentInput,
  type CreatePersonInput,
  type CreateUdhaarInput,
  type UpdateUdhaarInput,
} from './udhaar.validation';
import type {
  Payment,
  PaymentRow,
  Person,
  PersonBalance,
  PersonRow,
  UdhaarDirection,
  UdhaarEntry,
  UdhaarListFilter,
  UdhaarRowWithPaid,
  UdhaarStatus,
} from './udhaar.types';

export interface UdhaarRepoDeps {
  now(): number;
  newId(): string;
}

function parseCreatePerson(input: unknown): CreatePersonInput {
  const result = createPersonSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid person', result.error);
  }
  return result.data;
}

function parseCreateUdhaar(input: unknown): CreateUdhaarInput {
  const result = createUdhaarSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid udhaar', result.error);
  }
  return result.data;
}

function parseUpdateUdhaar(input: unknown): UpdateUdhaarInput {
  const result = updateUdhaarSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid udhaar update', result.error);
  }
  return result.data;
}

function parseAddPayment(input: unknown): AddPaymentInput {
  const result = addPaymentSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid payment', result.error);
  }
  return result.data;
}

function personRowToPerson(row: PersonRow): Person {
  return { id: row.id, name: row.name, phone: row.phone, createdAt: row.created_at };
}

function paymentRowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    udhaarId: row.udhaar_id,
    amount: row.amount,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  };
}

function rowToEntry(row: UdhaarRowWithPaid): UdhaarEntry {
  const totalPaid = Number(row.total_paid ?? 0);
  return {
    id: row.id,
    personId: row.person_id,
    amount: row.amount,
    direction: row.direction as UdhaarDirection,
    currency: row.currency,
    date: row.date,
    returnDate: row.return_date,
    status: row.status as UdhaarStatus,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalPaid,
    remaining: row.amount - totalPaid,
  };
}

const SELECT_UDHAAR_BY_ID = `
  SELECT u.*,
         COALESCE((SELECT SUM(amount) FROM udhaar_payments WHERE udhaar_id = u.id), 0) AS total_paid
  FROM udhaar u
  WHERE u.id = ? AND u.deleted_at IS NULL`;

export class UdhaarRepo {
  constructor(
    private readonly db: TransactionalExecutor,
    private readonly deps: UdhaarRepoDeps,
  ) {}

  // ---- Persons ----------------------------------------------------------

  async createPerson(input: unknown): Promise<Person> {
    const data = parseCreatePerson(input);
    const id = this.deps.newId();
    const ts = this.deps.now();
    await this.db.transaction(async tx => {
      await tx.execute(
        'INSERT INTO persons (id, name, phone, created_at) VALUES (?, ?, ?, ?)',
        [id, data.name, data.phone ?? null, ts],
      );
    });
    return { id, name: data.name, phone: data.phone ?? null, createdAt: ts };
  }

  async listPersons(): Promise<Person[]> {
    const rows = await selectRows<PersonRow>(
      this.db,
      'SELECT * FROM persons ORDER BY name COLLATE NOCASE ASC',
    );
    return rows.map(personRowToPerson);
  }

  async getPersonById(id: string): Promise<Person | null> {
    const row = await selectOne<PersonRow>(
      this.db,
      'SELECT * FROM persons WHERE id = ?',
      [id],
    );
    return row ? personRowToPerson(row) : null;
  }

  /** Deletes a person. Blocked if they still have active (non-deleted) debts. */
  async deletePerson(id: string): Promise<void> {
    const person = await this.getPersonById(id);
    if (!person) {
      throw new NotFoundError('person', id);
    }
    const active = await selectOne<{ c: number }>(
      this.db,
      'SELECT COUNT(*) AS c FROM udhaar WHERE person_id = ? AND deleted_at IS NULL',
      [id],
    );
    if (active && Number(active.c) > 0) {
      throw new ConflictError(
        `${person.name} has ${active.c} active debt(s). Settle or delete them first.`,
      );
    }
    await this.db.transaction(async tx => {
      await tx.execute('DELETE FROM persons WHERE id = ?', [id]);
    });
  }

  // ---- Udhaar -----------------------------------------------------------

  async create(input: unknown): Promise<UdhaarEntry> {
    const data = parseCreateUdhaar(input);

    const person = await this.getPersonById(data.personId);
    if (!person) {
      throw new NotFoundError('person', data.personId);
    }

    const id = this.deps.newId();
    const ts = this.deps.now();
    await this.db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO udhaar
           (id, person_id, amount, direction, currency, date, return_date,
            status, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          id,
          data.personId,
          data.amount,
          data.direction,
          data.currency,
          data.date,
          data.returnDate ?? null,
          data.note ?? null,
          ts,
          ts,
        ],
      );
    });

    return {
      id,
      personId: data.personId,
      amount: data.amount,
      direction: data.direction,
      currency: data.currency,
      date: data.date,
      returnDate: data.returnDate ?? null,
      status: 'pending',
      note: data.note ?? null,
      createdAt: ts,
      updatedAt: ts,
      totalPaid: 0,
      remaining: data.amount,
    };
  }

  async list(filter?: UdhaarListFilter): Promise<UdhaarEntry[]> {
    const where: string[] = ['u.deleted_at IS NULL'];
    const params: Scalar[] = [];
    if (filter?.personId) {
      where.push('u.person_id = ?');
      params.push(filter.personId);
    }
    if (filter?.status) {
      where.push('u.status = ?');
      params.push(filter.status);
    }
    const rows = await selectRows<UdhaarRowWithPaid>(
      this.db,
      `SELECT u.*,
              COALESCE(SUM(p.amount), 0) AS total_paid
       FROM udhaar u
       LEFT JOIN udhaar_payments p ON p.udhaar_id = u.id
       WHERE ${where.join(' AND ')}
       GROUP BY u.id
       ORDER BY u.date DESC`,
      params,
    );
    return rows.map(rowToEntry);
  }

  async getById(id: string): Promise<UdhaarEntry | null> {
    const row = await selectOne<UdhaarRowWithPaid>(this.db, SELECT_UDHAAR_BY_ID, [
      id,
    ]);
    return row ? rowToEntry(row) : null;
  }

  /** Updates editable fields; recomputes status when the amount changes. */
  async update(id: string, input: unknown): Promise<UdhaarEntry> {
    const data = parseUpdateUdhaar(input);
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('udhaar', id);
    }

    const sets: string[] = [];
    const params: Scalar[] = [];
    if (data.amount !== undefined) {
      sets.push('amount = ?');
      params.push(data.amount);
      // Status depends on amount vs already-paid total.
      sets.push('status = ?');
      params.push(computeStatus(data.amount, existing.totalPaid));
    }
    if (data.direction !== undefined) {
      sets.push('direction = ?');
      params.push(data.direction);
    }
    if (data.date !== undefined) {
      sets.push('date = ?');
      params.push(data.date);
    }
    if (data.returnDate !== undefined) {
      sets.push('return_date = ?');
      params.push(data.returnDate ?? null);
    }
    if (data.note !== undefined) {
      sets.push('note = ?');
      params.push(data.note ?? null);
    }

    const ts = this.deps.now();
    sets.push('updated_at = ?');
    params.push(ts);
    params.push(id);

    await this.db.transaction(async tx => {
      await tx.execute(
        `UPDATE udhaar SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
        params,
      );
    });

    const updated = await this.getById(id);
    if (!updated) {
      throw new NotFoundError('udhaar', id);
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const ts = this.deps.now();
    let affected = 0;
    await this.db.transaction(async tx => {
      const result = await tx.execute(
        'UPDATE udhaar SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
        [ts, ts, id],
      );
      affected = result.rowsAffected;
    });
    if (affected === 0) {
      throw new NotFoundError('udhaar', id);
    }
  }

  // ---- Payments ---------------------------------------------------------

  /** Records a payment and recomputes the debt's status atomically. */
  async addPayment(udhaarId: string, input: unknown): Promise<Payment> {
    const data = parseAddPayment(input);
    const udhaar = await selectOne<UdhaarRowWithPaid>(
      this.db,
      SELECT_UDHAAR_BY_ID,
      [udhaarId],
    );
    if (!udhaar) {
      throw new NotFoundError('udhaar', udhaarId);
    }

    const id = this.deps.newId();
    const ts = this.deps.now();
    await this.db.transaction(async tx => {
      await tx.execute(
        'INSERT INTO udhaar_payments (id, udhaar_id, amount, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, udhaarId, data.amount, data.date, data.note ?? null, ts],
      );
      const sumRow = await tx.execute(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM udhaar_payments WHERE udhaar_id = ?',
        [udhaarId],
      );
      const totalPaid = Number(
        (sumRow.rows[0] as { total: number } | undefined)?.total ?? 0,
      );
      const status = computeStatus(udhaar.amount, totalPaid);
      await tx.execute('UPDATE udhaar SET status = ?, updated_at = ? WHERE id = ?', [
        status,
        ts,
        udhaarId,
      ]);
    });

    return {
      id,
      udhaarId,
      amount: data.amount,
      date: data.date,
      note: data.note ?? null,
      createdAt: ts,
    };
  }

  async listPayments(udhaarId: string): Promise<Payment[]> {
    const rows = await selectRows<PaymentRow>(
      this.db,
      'SELECT * FROM udhaar_payments WHERE udhaar_id = ? ORDER BY date ASC',
      [udhaarId],
    );
    return rows.map(paymentRowToPayment);
  }

  // ---- Balances ---------------------------------------------------------

  /** Net balance per person across all active debts. */
  async getPersonBalances(): Promise<PersonBalance[]> {
    const rows = await selectRows<{
      person_id: string;
      name: string;
      amount: number;
      direction: string;
      total_paid: number;
    }>(
      this.db,
      `SELECT u.person_id,
              pr.name,
              u.amount,
              u.direction,
              COALESCE(SUM(p.amount), 0) AS total_paid
       FROM udhaar u
       JOIN persons pr ON pr.id = u.person_id
       LEFT JOIN udhaar_payments p ON p.udhaar_id = u.id
       WHERE u.deleted_at IS NULL
       GROUP BY u.id`,
    );

    const names = new Map<string, string>();
    const entries: PersonBalanceEntry[] = rows.map(r => {
      names.set(r.person_id, r.name);
      return {
        personId: r.person_id,
        amount: r.amount,
        direction: r.direction as UdhaarDirection,
        totalPaid: Number(r.total_paid ?? 0),
      };
    });

    return netBalanceByPerson(entries).map(b => ({
      personId: b.personId,
      name: names.get(b.personId) ?? '',
      net: b.net,
    }));
  }
}
