/**
 * Udhaar input validation (Zod). Amounts are integer paisa; the UI converts
 * user input via lib/money.inputToPaisa before it reaches these schemas.
 */
import { z } from 'zod';

export const UDHAAR_DIRECTIONS = ['lena', 'dena'] as const;
export type UdhaarDirection = (typeof UDHAAR_DIRECTIONS)[number];

export const UDHAAR_STATUSES = ['pending', 'partial', 'settled'] as const;
export type UdhaarStatus = (typeof UDHAAR_STATUSES)[number];

export const createPersonSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().max(20).nullish(),
});

export const createUdhaarSchema = z
  .object({
    personId: z.string().min(1),
    amount: z.number().int().positive(), // paisa
    direction: z.enum(UDHAAR_DIRECTIONS),
    currency: z.string().trim().length(3).default('PKR'),
    date: z.number().int().positive(),
    returnDate: z.number().int().positive().nullish(),
    note: z.string().max(500).nullish(),
  })
  .refine(d => d.returnDate == null || d.returnDate >= d.date, {
    message: 'Return date cannot be before the lend date',
    path: ['returnDate'],
  });

export const updateUdhaarSchema = z.object({
  amount: z.number().int().positive().optional(),
  direction: z.enum(UDHAAR_DIRECTIONS).optional(),
  date: z.number().int().positive().optional(),
  returnDate: z.number().int().positive().nullish(),
  note: z.string().max(500).nullish(),
});

export const addPaymentSchema = z.object({
  amount: z.number().int().positive(), // paisa
  date: z.number().int().positive(),
  note: z.string().max(500).nullish(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type CreateUdhaarInput = z.infer<typeof createUdhaarSchema>;
export type UpdateUdhaarInput = z.infer<typeof updateUdhaarSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
