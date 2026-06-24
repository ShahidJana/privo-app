/**
 * Udhaar types: raw DB rows (snake_case) and camelCase entities. All money is
 * integer paisa; `totalPaid`/`remaining` are derived from payments.
 */
import type { UdhaarDirection, UdhaarStatus } from './udhaar.validation';

export type { UdhaarDirection, UdhaarStatus };

export interface PersonRow {
  id: string;
  name: string;
  phone: string | null;
  created_at: number;
}

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  createdAt: number;
}

export interface UdhaarRow {
  id: string;
  person_id: string;
  amount: number;
  direction: string;
  currency: string;
  date: number;
  return_date: number | null;
  status: string;
  note: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/** Udhaar joined with the sum of its payments. */
export type UdhaarRowWithPaid = UdhaarRow & { total_paid: number };

export interface UdhaarEntry {
  id: string;
  personId: string;
  amount: number;
  direction: UdhaarDirection;
  currency: string;
  date: number;
  returnDate: number | null;
  status: UdhaarStatus;
  note: string | null;
  createdAt: number;
  updatedAt: number;
  totalPaid: number;
  remaining: number;
}

export interface PaymentRow {
  id: string;
  udhaar_id: string;
  amount: number;
  date: number;
  note: string | null;
  created_at: number;
}

export interface Payment {
  id: string;
  udhaarId: string;
  amount: number;
  date: number;
  note: string | null;
  createdAt: number;
}

export interface PersonBalance {
  personId: string;
  name: string;
  net: number; // paisa; positive = they owe you, negative = you owe them
}

export interface UdhaarListFilter {
  personId?: string;
  status?: UdhaarStatus;
}
