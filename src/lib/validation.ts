import { z } from 'zod';
export function loginEmail(value: string) {
  const number = value.trim();
  if (!/^\d{3,20}$/.test(number)) throw new Error('A matrícula deve conter de 3 a 20 dígitos.');
  return `${number}@login.validafacil.invalid`;
}
export const password = z.string().min(12, 'Use pelo menos 12 caracteres.').max(128);
export const storeSchema = z.object({ name: z.string().trim().min(2).max(120) });
export const productSchema = z.object({ barcode: z.string().regex(/^\d{8,14}$/, 'Código deve conter de 8 a 14 dígitos.'), name: z.string().trim().min(2).max(180) });
export function expiryStatus(date: string, today: string) {
  if (date < today) return 'Vencido';
  const days = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
  return days <= 30 ? 'Vence em até 30 dias' : 'Em dia';
}
