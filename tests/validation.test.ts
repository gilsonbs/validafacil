import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginEmail, expiryStatus, password, productSchema } from '../src/lib/validation.ts';
test('matrícula preserva zeros e rejeita caracteres ou tamanho inválidos', () => {
 assert.equal(loginEmail('001234'), '001234@login.validafacil.invalid');
 assert.equal(loginEmail(' 1234 '), '1234@login.validafacil.invalid');
 assert.equal(loginEmail('318'), '318@login.validafacil.invalid');
 assert.throws(() => loginEmail('12')); assert.throws(() => loginEmail('12-ab-34'));
});
test('validade considera fronteiras de dia e prazo de 30 dias', () => {
 assert.equal(expiryStatus('2026-10-22','2026-10-23'), 'Vencido');
 assert.equal(expiryStatus('2026-10-23','2026-10-23'), 'Vence em até 30 dias');
 assert.equal(expiryStatus('2026-11-22','2026-10-23'), 'Vence em até 30 dias');
 assert.equal(expiryStatus('2026-11-23','2026-10-23'), 'Em dia');
});
test('validação rejeita senha curta e preserva zeros do código', () => {
 assert.equal(password.safeParse('123456').success, false);
 assert.equal(productSchema.parse({ barcode:'0012345678901', name:'Produto' }).barcode, '0012345678901');
 assert.equal(productSchema.safeParse({barcode:'abc',name:'x'}).success,false);
});
