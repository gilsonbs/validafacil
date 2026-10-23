import 'server-only';
import { redirect } from 'next/navigation';
import { db } from './supabase';
export async function session() {
  const client = await db();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/');
  const { data: profile } = await client.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.active) redirect('/?error=Conta+sem+acesso');
  return { client, user, profile };
}
