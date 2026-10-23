# Arquitetura e permissões

Next.js App Router renderiza as páginas e executa Server Actions. O cliente Supabase SSR usa cookies; o proxy renova a sessão e impede cache compartilhado. A identidade é validada com `getUser`; o perfil ativo é consultado no banco a cada operação administrativa. A secret key só é acessível no servidor para provisionamento de usuários e troca de senha após checagem explícita de autorização.

## Dados

- `stores`: lojas. Master cadastra e vê todas; demais perfis só leem a própria.
- `profiles`: vínculo com Auth, nome, perfil e loja. Master não tem loja, outros perfis têm exatamente uma. Nenhum cliente pode escrever perfis ou se promover. Admin provisiona somente funcionários de sua loja; master provisiona admins/funcionários.
- `products`: catálogo global com código único, nome e autor. Qualquer usuário ativo consulta e contribui. Nenhum usuário comum sobrescreve registros existentes.
- `product_photos`: fotos globais ligadas ao produto, com autoria e caminho no Storage privado. URL assinada dura cinco minutos. Fotos globais não devem conter documentos, pessoas ou comprovantes da loja.
- `batches`: produto, loja, validade, quantidade e autor. A validade pertence ao lote da loja e nunca ao catálogo global.

Master lê lotes de todas as lojas. Admin lê todos os lotes de sua loja. Funcionário lê somente lotes que ele cadastrou na própria loja. Inserções exigem autor igual ao usuário autenticado e loja permitida. As regras são aplicadas por RLS também em consultas diretas ao Supabase, incluindo exportação. Contas inativas não acessam dados. Funções auxiliares com search_path fixo evitam recursão das políticas e não permitem alteração de dados.

Auth usa email/password internamente: matrícula `001234` vira `001234@login.validafacil.invalid`. Não armazena senha no PostgreSQL público. Não depende de SMS ou e-mail de funcionário. Matrículas únicas globalmente são uma decisão desta versão.

## Incrementos

1. Base, migração, RLS, sessão, matrículas, perfis, lojas, provisionamento e bootstrap.
2. Catálogo global e scanner com entrada manual alternativa. Consulta por código permite reaproveitar produto existente. Na busca, a câmera consulta automaticamente o código lido; no cadastro, preenche o código.
3. Foto móvel com limite de tamanho/tipo e assinatura do arquivo, bucket privado e metadados de autoria. Falha de metadados tenta remover upload órfão.
4. Lotes com validade, relatório por escopo, CSV protegido contra fórmulas e alertas visuais ao abrir painel.
5. Próxima versão: notificações persistentes, scheduler com deduplicação, preferências e push. Sem promessa de entrega enquanto o aplicativo estiver fechado nesta versão.

## Limites conhecidos

Homologação real de Auth, Storage e câmera pendente até acesso ao projeto. Criação de Auth + perfil é compensada com exclusão em caso de falha, mas não é transação distribuída; monitorar usuários órfãos. Redefinição de senha não encerra imediatamente sessões já abertas. Rotação de sessão/auditoria devem ser implementadas antes de exigir revogação imediata. Cadastro do primeiro master exige script local privilegiado. Não há edição/exclusão de lojas/usuários ou recuperação autônoma de senha nesta versão.
