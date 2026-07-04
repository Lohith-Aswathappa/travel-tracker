# Travel Journal Static Site

A complete starter website for a personal travel journal. It is a static site with no runtime backend and no npm dependencies. Content lives in Markdown files, the build script generates HTML into `dist/`, and Cloudflare Pages can deploy it from GitHub.

## What is included

- Responsive home page
- Travels index with client-side search
- Individual trip pages generated from Markdown
- Lightweight map generated from trip coordinates
- Gallery page
- About page
- RSS feed, sitemap, robots.txt, 404 page
- Dark mode toggle
- Cloudflare `_headers` file
- Sample placeholder SVG images

## Folder structure

```text
content/
  site.json              Site title, intro copy, domain, and contact links
  trips/                 One Markdown file per trip
public/
  assets/                CSS and JavaScript
  images/                Photos and placeholder images
scripts/
  build.mjs              Static site generator
  dev.mjs                Local preview server
dist/                    Generated output after `npm run build`
```

## First edits to make

1. Open `content/site.json`.
2. Replace `title`, `shortTitle`, `travelers`, `description`, and `url`.
3. Set `url` to your real domain, for example:

```json
"url": "https://yourdomain.com"
```

4. Edit or delete the sample trip files in `content/trips/`.
5. Replace the placeholder SVGs in `public/images/` with your own photos.

## Add a new trip

Copy one of the existing files in `content/trips/`, rename it, and update the JSON block at the top.

```md
---
{
  "title": "Portugal 2026",
  "slug": "portugal-2026",
  "subtitle": "Lisbon, Porto, coastal walks, and too many pastries.",
  "excerpt": "A short description used on cards and metadata.",
  "startDate": "2026-06-01",
  "endDate": "2026-06-12",
  "status": "planned",
  "featured": false,
  "cover": "/images/portugal/cover.jpg",
  "countries": ["Portugal"],
  "cities": ["Lisbon", "Porto"],
  "tags": ["food", "coast", "trains"],
  "favoriteFood": "Pastel de nata",
  "favoriteMoment": "Sunset over the river.",
  "coordinates": [
    { "name": "Lisbon", "lat": 38.7223, "lon": -9.1393 },
    { "name": "Porto", "lat": 41.1579, "lon": -8.6291 }
  ]
}
---

## Overview

Write your trip story here.
```

The frontmatter must be valid JSON. That means double quotes around keys and strings, no trailing commas, and arrays using square brackets.

## Local preview

You only need Node.js 20 or newer.

```bash
npm run build
npm run dev
```

Open `http://localhost:4321`.

The dev server does not hot reload. After edits, stop it with Ctrl+C and run `npm run dev` again.

## Deploy to GitHub and Cloudflare Pages

From this folder:

```bash
git init
git add .
git commit -m "Initial travel site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Then in Cloudflare:

1. Go to **Workers & Pages**.
2. Create a Pages project from your GitHub repo.
3. Use these build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave blank unless this site is inside a subfolder
4. Deploy.
5. Add your custom domain from the Pages project's custom domains area.

## Optional improvements later

- Move to Astro when you want components and ecosystem integrations.
- Add a real map with Mapbox or Leaflet.
- Add photo albums by trip.
- Add comments with Giscus.
- Add privacy-friendly analytics with Cloudflare Web Analytics or Plausible.
