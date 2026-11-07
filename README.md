# BeeLow

Fit your groceries into your day. BeeLow plans the best mix of in-person stops and online orders for your list, your route, your time limit, and the memberships you actually have. Built at Crimson Hacks 2026.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # planner unit tests
```

AI features read `ANTHROPIC_API_KEY` from `.env.local` (never committed). Without a key they fall back to saved example results.

Prices marked "demo price" are placeholders, not real store prices.

### Real prices

```bash
npm run prices:smiths   # Smith's prices from the Kroger API (needs KROGER_CLIENT_ID / KROGER_CLIENT_SECRET in .env.local)
npm run prices:import   # Walmart, Harmons, Costco prices typed into data/real-prices.csv
```


## Credits

- [Next.js](https://nextjs.org), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) (`@anthropic-ai/sdk`) for receipt scanning with Claude
- Product illustrations generated with [ElevenLabs](https://elevenlabs.io) image generation (gpt-image-2)
- [Kroger Developer API](https://developer.kroger.com) for Smith's prices and store location
- [OpenStreetMap](https://www.openstreetmap.org/copyright) data via [Nominatim](https://nominatim.org) for store locations (© OpenStreetMap contributors, ODbL)
- [tsx](https://tsx.is) to run the price scripts
- [Vitest](https://vitest.dev)
- [ESLint](https://eslint.org) with `eslint-config-next`
- [Inter](https://rsms.me/inter/) (SIL Open Font License) via `next/font/google`
- [Lucide](https://lucide.dev) icons (`lucide-react`, ISC license)
- UI design and photos from the team's Figma file
