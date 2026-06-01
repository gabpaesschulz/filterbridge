# LinkedIn Post (Portuguese)

---

Publiquei meu primeiro pacote npm open-source: FilterBridge.

A motivação foi simples. Em todo projeto de dashboard administrativo que já trabalhei, o mesmo filtro acaba sendo escrito em pelo menos três lugares: o estado do React, a query string da URL, e o DTO que vai pra API. Cada camada precisa de uma lógica ligeiramente diferente, e isso vira duplicação, inconsistência e retrabalho.

A ideia do FilterBridge é declarar os filtros uma vez como um schema TypeScript e derivar tudo a partir daí:

```ts
const invoiceFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  amount: numberRange(),
})

const dto = toQueryDto(invoiceFilters, state)
const params = toSearchParams(invoiceFilters, state)
```

O TypeScript infere os tipos diretamente do schema, incluindo unions literais para `select` e `multiSelect`.

O projeto virou cinco pacotes npm independentes:

- `@filterbridge/core` — o schema, parsing e serialização
- `@filterbridge/react` — um hook `useFilterBridge` para estado local
- `@filterbridge/browser` — sincronização com a URL do browser
- `@filterbridge/tanstack` — adaptador para TanStack Table
- `@filterbridge/next` — adaptador para Next.js App Router

Aprendi bastante durante o processo: design de API pública, como estruturar um monorepo pnpm para publicação no npm, como gerar ESM e CJS de forma confiável com tsup, e como escrever documentação que explica valor antes de mostrar código.

Ainda é experimental (v0.1.0), mas está publicado, testado (299 testes) e documentado.

Se você trabalha com dashboards em React e já cansou de escrever a mesma lógica de filtro várias vezes, dá uma olhada:

👉 https://github.com/gabpaesschulz/filterbridge
👉 https://www.npmjs.com/package/@filterbridge/core

---

*Ajuste o texto antes de postar — adicione contexto pessoal, remova o que não se aplica ao seu histórico, e adapte o tom para o seu perfil.*
