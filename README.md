This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Marketing Images

Marketing section backgrounds are pulled from [Lummi AI](https://lummi.ai) and stored in `public/marketing/` as optimised WebP files. They are **gitignored** (too large for the repo) and must be regenerated locally.

### First-time setup

```bash
# Requires LUMMI_API_KEY in .env.local
npm run generate:marketing-images
```

This downloads the top Lummi result for each of the four section queries (hero, features, showcase, CTA), crops and converts to 1920×1080 WebP + 800×450 thumbnail, and writes a `manifest.json`.

### Re-generating

Run the same command any time you want fresh imagery:

```bash
npm run generate:marketing-images
```

The script is at `scripts/generate-marketing-images.ts`. Edit the `SLOTS` array to change search queries or output dimensions.

### How components use them

Each marketing component references `/marketing/<slot>.webp` via `next/image`. The image is overlaid at very low opacity so it gracefully degrades to pure CSS if the file doesn't exist in a given environment (e.g. Vercel preview).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
