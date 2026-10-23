import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
const prompt = createInterface({ input: process.stdin, output: process.stdout });
try {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { count, error: countError } = await client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'master');
  if (countError || count !== 0) throw new Error('Bootstrap disponível apenas após migração e sem master existente.');
  const name = (await prompt.question('Nome do primeiro master: ')).trim();
  const number = (await prompt.question('Matrícula (4–20 dígitos): ')).trim();
  if (!/^\d{4,20}$/.test(number) || name.length < 2 || name.length > 120) throw new Error('Dados inválidos.');
  console.log('Informe a senha pela variável temporária BOOTSTRAP_PASSWORD no ambiente local. Ela não será exibida.');
  const password = process.env.BOOTSTRAP_PASSWORD;
  if (!password || password.length < 12 || password.length > 128) throw new Error('Senha deve ter de 12 a 128 caracteres.');
  const { data, error } = await client.auth.admin.createUser({ email: `${number}@login.validafacil.invalid`, password, email_confirm: true });
  if (error) throw new Error('Não foi possível criar o usuário.');
  const { error: profileError } = await client.from('profiles').insert({ id: data.user.id, name, role: 'master' });
  if (profileError) { await client.auth.admin.deleteUser(data.user.id); throw new Error('Não foi possível criar o perfil.'); }
  console.log('Master criado. Entre com matrícula e senha.');
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { prompt.close(); }
