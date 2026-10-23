import { db } from '@/lib/supabase';
import { NextRequest } from 'next/server';
function csv(value: unknown) { let s = String(value ?? ''); if (/^[\s]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"','""') + '"'; }
export async function GET(request: NextRequest) {
  const client = await db(); const { data: { user } } = await client.auth.getUser();
  if (!user) return new Response('Não autorizado', { status: 401 });
  const store = request.nextUrl.searchParams.get('store');
  let query = client.from('batches').select('expires_on,quantity,products(name,barcode),stores(name)').order('expires_on').limit(500);
  if (store) query = query.eq('store_id', store);
  const { data, error } = await query;
  if (error) return new Response('Falha ao gerar relatório', { status: 500 });
  const rows = data.map(row => { const p = row.products as unknown as { name: string; barcode: string }; const s = row.stores as unknown as { name: string }; return [p?.name,p?.barcode,s?.name,row.expires_on,row.quantity].map(csv).join(';'); });
  return new Response('\uFEFFProduto;Código;Loja;Validade;Quantidade\r\n' + rows.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="validades-primeiros-500.csv"', 'Cache-Control': 'private, no-store' } });
}
