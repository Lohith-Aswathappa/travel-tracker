# Adventure Atlas

A polished, Apple-inspired static personal travel/adventure website for Cloudflare Pages.

## What it includes

- Home page with hero, stats, latest adventures, and map preview
- Adventures archive with instant filtering
- Individual adventure pages generated from Markdown
- Map page powered by coordinates in Markdown
- Timeline page
- Gallery page
- Memories page with Surprise Me
- Search modal with keyboard shortcut `Cmd/Ctrl + K`
- Light/dark mode
- RSS feed, sitemap, 404 page, Cloudflare `_headers`
- No database, no paid APIs, no backend

## Edit your site details

Open:

```txt
content/site.json
```

Update the title, names, domain, tagline, and next adventure.

## Add a new adventure

Create a Markdown file in:

```txt
content/adventures/
```

Example:

```md
---
title: Discovery Park Sunset Walk
date: 2026-07-19
type: city
city: Seattle
region: Washington
country: USA
lat: 47.6573
lng: -122.4057
rating: 5
distance: 3.2 mi
duration: 1h 40m
cover: /images/discovery-park/cover.webp
tags: city, sunset, park, weekend
favorite: The lighthouse view near golden hour.
photos: /images/discovery-park/cover.webp, /images/discovery-park/trail.webp
---
Write your story here.
```

Put images in `public/images/` and reference them with paths starting with `/images/...`.

## Local preview

```bash
npm run build
npm run dev
```

Open:

```txt
http://localhost:4321
```

## Deploy to Cloudflare Pages

Use these settings:

```txt
Framework preset: None
Build command: npm run build
Build output directory: dist
Root directory: /
```

Every push to GitHub will rebuild the static site.
