'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, privilegedDb } from '@/lib/supabase';
import { session } from '@/lib/auth';
import { loginEmail, password, productSchema, storeSchema } from '@/lib/validation';
const value = (f: FormData, key: string) => String(f.get(key) ?? '');
function fail(message: string): never { redirect('/painel?error=' + encodeURIComponent(message)); }
export async function login(form: FormData) {
  let email: string;
  try { email = loginEmail(value(form, 'number')); } catch { redirect('/?error=Número+inválido'); }
  const client = await db();
  const { error } = await client.auth.signInWithPassword({ email, password: value(form, 'password') });
  if (error) redirect('/?error=Número+ou+senha+incorretos');
  redirect('/painel');
}
export async function logout() { const client = await db(); await client.auth.signOut(); redirect('/'); }
export async function createStore(form: FormData) {
  const { client, profile } = await session();
  if (profile.role !== 'master') fail('Acesso restrito ao master.');
  const parsed = storeSchema.safeParse({ name: value(form, 'name') });
  if (!parsed.success) fail('Nome de loja inválido.');
  const { error } = await client.from('stores').insert(parsed.data);
  if (error) fail('Não foi possível cadastrar a loja.');
  revalidatePath('/painel');
}
export async function createUser(form: FormData) {
  const { client, profile } = await session();
  if (!['master', 'admin'].includes(profile.role)) fail('Sem permissão.');
  const role = value(form, 'role');
  const storeId = profile.role === 'admin' ? profile.store_id : value(form, 'store_id');
  if (!['admin', 'employee'].includes(role) || (profile.role === 'admin' && role !== 'employee')) fail('Perfil inválido.');
  const { data: store } = await client.from('stores').select('id').eq('id', storeId).single();
  if (!store) fail('Loja inválida.');
  let email: string;
  try { email = loginEmail(value(form, 'number')); } catch { fail('Matrícula inválida.'); }
  const parsed = password.safeParse(value(form, 'password'));
  const name = value(form, 'name').trim();
  if (!parsed.success || name.length < 2 || name.length > 120) fail('Nome inválido ou senha com menos de 12 caracteres.');
  const admin = privilegedDb();
  const { data, error } = await admin.auth.admin.createUser({ email, password: parsed.data, email_confirm: true });
  if (error || !data.user) fail('Não foi possível cadastrar o usuário. Verifique o número.');
  const { error: profileError } = await admin.from('profiles').insert({ id: data.user.id, name, role, store_id: storeId });
  if (profileError) { await admin.auth.admin.deleteUser(data.user.id); fail('Não foi possível concluir o cadastro.'); }
  revalidatePath('/painel');
}
export async function resetPassword(form: FormData) {
  const { client, profile } = await session();
  if (profile.role !== 'master') fail('Apenas o master pode redefinir senhas.');
  const parsed = password.safeParse(value(form, 'password'));
  if (!parsed.success) fail('Use pelo menos 12 caracteres.');
  const { data: target } = await client.from('profiles').select('id').eq('id', value(form, 'user_id')).single();
  if (!target) fail('Usuário inválido.');
  const { error } = await privilegedDb().auth.admin.updateUserById(target.id, { password: parsed.data });
  if (error) fail('Falha ao alterar senha.');
  redirect('/painel?success=Senha+alterada');
}
export async function createProduct(form: FormData) {
  const { client } = await session();
  const parsed = productSchema.safeParse({ barcode: value(form, 'barcode'), name: value(form, 'name') });
  if (!parsed.success) fail('Informe nome e código de barras válidos.');
  const { error } = await client.from('products').insert(parsed.data);
  if (error) fail('Produto já cadastrado ou dados inválidos.');
  revalidatePath('/painel');
}
export async function createBatch(form: FormData) {
  const { client, profile, user } = await session();
  const storeId = profile.role === 'master' ? value(form, 'store_id') : profile.store_id;
  const expires = value(form, 'expires_on');
  const quantity = Number(value(form, 'quantity'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || !Number.isInteger(quantity) || quantity < 1) fail('Validade ou quantidade inválida.');
  const { error } = await client.from('batches').insert({ product_id: value(form, 'product_id'), store_id: storeId, expires_on: expires, quantity, created_by: user.id });
  if (error) fail('Não foi possível registrar a validade.');
  revalidatePath('/painel');
}
