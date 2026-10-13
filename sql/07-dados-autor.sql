-- Dados do autor informados em 13/10/2026: chave Pix (corrigida no mesmo dia para personalize.caragua@gmail.com).
-- A cidade fica vazia de propósito: o gerador usa 'BRASIL' e o app do pagador
-- mostra o nome que o banco publicou no DICT, não o escrito no QR.
update public.config set valor = 'personalize.caragua@gmail.com' where chave = 'pix_chave';
update public.config set valor = 'Eleno Gutemberg Silva'  where chave = 'pix_nome';
select chave, valor from public.config where chave like 'pix%' order by chave;

-- WhatsApp do autor, informado em 13/10/2026: (12) 98140-8270.
update public.config set valor = '5512981408270' where chave = 'whatsapp';
