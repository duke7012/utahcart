# UtahCart

Fit your groceries into your day. UtahCart plans the best mix of in-person stops and online orders for your list, your route, your time limit, and the memberships you actually have. Built at Crimson Hacks 2026.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # planner unit tests
```

AI features read `ANTHROPIC_API_KEY` from `.env.local` (never committed). Without a key they fall back to saved example results.

Prices marked "demo price" are placeholders, not real store prices.

## Credits

- [Next.js](https://nextjs.org), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) (`@anthropic-ai/sdk`) for receipt scanning with Claude
- [Vitest](https://vitest.dev)
- [ESLint](https://eslint.org) with `eslint-config-next`
- [Geist](https://vercel.com/font) fonts via `next/font`
