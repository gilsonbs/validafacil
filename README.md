# ValidaFácil

MVP de controle de validades com Next.js/TypeScript e Supabase PostgreSQL/Auth/Storage. GitHub guarda código e executa CI; o backend fica no Supabase e o servidor Next.js deve ser implantado em uma plataforma Node.js (por exemplo, Vercel).

## Estado

Implementação inicial: autenticação por matrícula e senha, master/admin/funcionário, cadastro de lojas e equipe, catálogo global, scanner de câmera, fotos compartilhadas privadas, lotes/validades, relatório por escopo com CSV e alertas no painel. Ainda não há notificações push, agendamento de mensagens ou envio externo. Não há serviço externo de reconhecimento de produtos: códigos já cadastrados reutilizam nome/foto; novos códigos exigem cadastro.

O histórico recuperado contém os requisitos originais, mas as respostas com a arquitetura estavam representadas por referências sem conteúdo. As decisões concretas desta implementação estão em `docs/architecture.md`.

## Configuração local

1. Instale Node.js 24 e execute `npm ci`.
2. Copie `.env.example` para `.env.local`. Projeto indicado: `https://xafkkloqrghoweqwdqzw.supabase.co`. Preencha a URL e a chave publicável no computador; configure a secret key somente no servidor. Nunca envie chaves por chat, commit ou screenshot.
3. No projeto Supabase, revise e aplique `supabase/migrations/202610230001_initial.sql` pelo SQL Editor, ou vincule o CLI com `supabase link --project-ref xafkkloqrghoweqwdqzw` e use `supabase db push` após revisar o plano. Não execute em projeto com tabelas homônimas sem avaliar conflitos.
4. Em Auth, habilite email/password e **desabilite novos cadastros públicos**. Os usuários são provisionados por master/admin através do servidor; não há cadastro público na interface. Habilite limites de tentativas no Supabase Auth. Os emails internos de matrícula não recebem mensagens. Recuperação de acesso é feita pelo master.
5. Configure temporariamente `BOOTSTRAP_PASSWORD` no ambiente local usando um gerenciador de segredos ou prompt seguro. Execute `npm run bootstrap` para criar o primeiro master. Remova essa variável após o uso. Não há senha padrão nem master automático.
6. Execute `npm run dev` e abra `http://localhost:3000`. Cadastre loja, admin e funcionário; entre com cada perfil para conferir as permissões.

As matrículas são únicas globalmente, com 4–20 dígitos, preservando zeros iniciais. Exemplo: `001234` é diferente de `1234`. A matrícula é convertida em um identificador interno de Auth, não em telefone.

## Testes

`npm test` executa validação e PostgreSQL embarcado com políticas RLS reais. O teste cria stubs mínimos de Auth/Storage, portanto não substitui homologação no Supabase real. `npm run typecheck` e `npm run build` validam TypeScript e compilação. O workflow de GitHub executa todos os comandos sem credenciais reais.

Homologação obrigatória antes de produção: dois admins de lojas diferentes; dois funcionários na mesma loja; master; conta inativa; tentativa direta de acessar registros de outra loja; criação de usuário e redefinição de senha; upload e leitura de fotos; câmera em Android/iOS via HTTPS. Verifique também os limites e configurações de Auth no projeto real.

## Deploy

1. Importe o repositório em uma plataforma que execute Next.js no servidor. Não use GitHub Pages ou exportação estática.
2. Configure as três variáveis do `.env.example` no ambiente de destino. Apenas URL/chave publicável podem ser públicas. Secret key é estritamente do servidor.
3. Defina Site URL/URLs autorizadas no Supabase Auth. Use HTTPS para a câmera, salvo localhost.
4. Aplique migrações e crie o master antes de liberar acesso. Faça deploy somente após CI e homologação. Configure limite de corpo de upload no proxy/hosting para 6 MB ou menos.
5. Habilite backups adequados ao plano Supabase. Monitore falhas de Auth/Storage e uso do banco sem registrar senhas/tokens.

Os relatórios e indicadores mostram no máximo os 500 lotes com vencimento mais próximo no escopo permitido. A exportação possui o mesmo limite, declarado na interface; paginação e relatórios completos são a próxima melhoria.

## Próximas etapas

- Homologar Fase 1 no Supabase escolhido e implantar ambiente de teste.
- Refinar scanner: consulta automática após leitura, testes de dispositivos e mensagens para códigos duplicados.
- Adicionar paginação/filtros de período, baixa/edição de lotes e trilha de auditoria.
- Adicionar notificações persistentes e tarefa agendada idempotente, depois push opt-in.
- Adicionar correção/moderação do catálogo compartilhado e tratamento de fotos/remoção de metadados.

Consulte as fontes oficiais: [Next.js](https://nextjs.org/docs/app/getting-started/installation) e [Supabase SSR](https://supabase.com/docs/guides/auth/server-side).
