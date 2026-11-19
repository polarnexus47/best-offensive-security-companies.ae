# Static site

Plain HTML and CSS, assembled by a small Node script. No client-side JavaScript.

## Build and preview

```bash
npm install          # dev tools only: screenshots and image conversion
node build.mjs       # writes index.html, <slug>/index.html, 404.html, sitemap.xml
node scripts/check.mjs
node serve.mjs       # http://localhost:3000
node serve.mjs 3000 --base /repo/   # test relative paths under a sub-path
```

`bash build.sh` runs the build and the checks.

## Structure

- `src/pages/<key>.html`: the `<main>` content of each page, one `<section>` per block ID.
- `src/pages.json`: title, description, H1, schema types and FAQ for every page.
- `src/data/companies.json`: the single source for the comparison table, the profile cards and the ItemList schema.
- `src/components.mjs`: shared renderers. `build.mjs`: header, footer, head tags, schema, paths.
- `css/global.css`, `fonts/`, `images/`.

## Add a page

1. Add `src/pages/<key>.html` with `<section class="block" id="..." data-block="...">` blocks.
2. Add an entry to `src/pages.json` (key, type, slug, title, description, h1, schema, faq).
3. Run `bash build.sh`.
