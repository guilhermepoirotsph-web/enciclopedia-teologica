-- Dados do autor informados em 13/10/2026: chave Pix (Mercado Pago).
-- A cidade fica vazia de propósito: o gerador usa 'BRASIL' e o app do pagador
-- mostra o nome que o banco publicou no DICT, não o escrito no QR.
update public.config set valor = 'mkpgutemberg@gmail.com' where chave = 'pix_chave';
update public.config set valor = 'Eleno Gutemberg Silva'  where chave = 'pix_nome';
select chave, valor from public.config where chave like 'pix%' order by chave;
