import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const TRIPS_DIR = path.join(CONTENT_DIR, 'trips');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC'
});

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, '');
}

function normalizeUrl(url) {
  return String(url || 'https://example.com').replace(/\/$/, '');
}

function absoluteUrl(site, pathname = '/') {
  const base = normalizeUrl(site.url);
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return DATE_FORMAT.format(new Date(`${dateString}T00:00:00Z`));
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return '';
  if (!endDate || startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function titleCase(value = '') {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderInline(markdown = '') {
  let html = escapeHtml(markdown);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy">`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, href) => {
    return `<a href="${escapeAttribute(href)}">${text}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function markdownToHtml(markdown = '') {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output = [];
  let paragraph = [];
  let listType = null;

  function closeParagraph() {
    if (paragraph.length > 0) {
      output.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeParagraph();
      closeList();
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      closeParagraph();
      closeList();
      output.push('<hr>');
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      closeParagraph();
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        output.push('<ul>');
      }
      output.push(`<li>${renderInline(unordered[1])}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      closeParagraph();
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        output.push('<ol>');
      }
      output.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      closeParagraph();
      closeList();
      output.push(`<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  closeParagraph();
  closeList();
  return output.join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function parseTripFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Missing JSON frontmatter in ${path.basename(filePath)}`);
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Invalid JSON frontmatter in ${path.basename(filePath)}: ${error.message}`);
  }

  const slug = data.slug || path.basename(filePath, '.md');
  const body = match[2].trim();
  return {
    ...data,
    slug,
    body,
    html: markdownToHtml(body),
    dateRange: formatDateRange(data.startDate, data.endDate),
    year: data.startDate ? data.startDate.slice(0, 4) : '',
    days: data.days || daysBetween(data.startDate, data.endDate),
    url: `/travels/${slug}/`
  };
}

async function loadTrips() {
  const entries = await fs.readdir(TRIPS_DIR);
  const tripFiles = entries.filter((entry) => entry.endsWith('.md')).sort();
  const trips = [];
  for (const file of tripFiles) {
    trips.push(await parseTripFile(path.join(TRIPS_DIR, file)));
  }
  return trips.sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
}

async function writeFile(relativePath, contents) {
  const outputPath = path.join(DIST_DIR, relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, contents);
}

function navLink(pathname, href, label) {
  const current = pathname === href || (href !== '/' && pathname.startsWith(href));
  return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;
}

function renderBrand(site) {
  return `
    <a class="brand" href="/" aria-label="${escapeAttribute(site.title)} home">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 14.5c5.4-6.7 10-10 16-11.5-2.1 5.9-5.9 10.4-12.6 16.2l1.2-6.1-4.6 1.4Z"></path>
          <path d="M12 12l4.5 4.5"></path>
        </svg>
      </span>
      <span>${escapeHtml(site.shortTitle || site.title)}</span>
    </a>`;
}

function renderLayout(site, options) {
  const {
    title,
    description = site.description,
    pathname = '/',
    body,
    image = '/images/abstract-lake.svg'
  } = options;
  const fullTitle = title === site.title ? title : `${title} | ${site.title}`;
  const canonical = absoluteUrl(site, pathname);
  const socialLinks = Object.entries(site.social || {})
    .filter(([, value]) => value)
    .map(([key, value]) => {
      const label = key === 'email' ? 'Email' : titleCase(key);
      const href = key === 'email' && !String(value).startsWith('mailto:') ? `mailto:${value}` : value;
      return `<a href="${escapeAttribute(href)}">${escapeHtml(label)}</a>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeAttribute(description)}">
  <link rel="canonical" href="${escapeAttribute(canonical)}">
  <meta property="og:title" content="${escapeAttribute(fullTitle)}">
  <meta property="og:description" content="${escapeAttribute(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeAttribute(canonical)}">
  <meta property="og:image" content="${escapeAttribute(absoluteUrl(site, image))}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css">
  <script>
    (() => {
      try {
        const saved = localStorage.getItem('theme');
        const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.dataset.theme = saved || preferred;
      } catch (error) {
        document.documentElement.dataset.theme = 'light';
      }
    })();
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container nav">
      ${renderBrand(site)}
      <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-navigation">Menu</button>
      <nav class="nav-links" id="site-navigation" data-nav-links aria-label="Primary navigation">
        ${navLink(pathname, '/', 'Home')}
        ${navLink(pathname, '/travels/', 'Travels')}
        ${navLink(pathname, '/map/', 'Map')}
        ${navLink(pathname, '/gallery/', 'Gallery')}
        ${navLink(pathname, '/about/', 'About')}
        <button class="theme-toggle" type="button" data-theme-toggle>Dark</button>
      </nav>
    </div>
  </header>
  <main id="main">
    ${body}
  </main>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <strong>${escapeHtml(site.title)}</strong>
        <p>${escapeHtml(site.tagline)}</p>
        <p>Built as a simple static site. Edit Markdown files in <code>content/trips</code> to add new adventures.</p>
      </div>
      <div class="footer-links">
        <a href="/travels/">Travels</a>
        <a href="/map/">Map</a>
        <a href="/gallery/">Gallery</a>
        <a href="/rss.xml">RSS</a>
        ${socialLinks}
      </div>
    </div>
  </footer>
  <script src="/assets/app.js" type="module"></script>
</body>
</html>`;
}

function renderPills(items = []) {
  return items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('');
}

function renderTripCard(trip) {
  const search = [trip.title, trip.subtitle, trip.excerpt, trip.year, ...(trip.countries || []), ...(trip.cities || []), ...(trip.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return `<a class="trip-card" data-trip-card data-search="${escapeAttribute(search)}" href="${trip.url}">
    <img src="${escapeAttribute(trip.cover || '/images/abstract-lake.svg')}" alt="${escapeAttribute(trip.title)}" loading="lazy">
    <div class="trip-card-body">
      <div class="trip-meta">
        <span>${escapeHtml(trip.dateRange)}</span>
        ${trip.status ? `<span class="pill status">${escapeHtml(titleCase(trip.status))}</span>` : ''}
      </div>
      <h3>${escapeHtml(trip.title)}</h3>
      <p>${escapeHtml(trip.excerpt || trip.subtitle || '')}</p>
      <div class="trip-tags" style="margin-top: 1rem;">${renderPills((trip.tags || []).slice(0, 4))}</div>
    </div>
  </a>`;
}

function collectStats(trips) {
  const countries = new Set();
  const cities = new Set();
  let days = 0;
  trips.forEach((trip) => {
    (trip.countries || []).forEach((country) => countries.add(country));
    (trip.cities || []).forEach((city) => cities.add(city));
    days += trip.days || 0;
  });
  return {
    trips: trips.length,
    countries: countries.size,
    cities: cities.size,
    days
  };
}

function renderStats(stats) {
  return `<div class="stats-grid">
    <div class="stat-card"><span class="stat-value">${stats.trips}</span><span class="stat-label">Trips logged</span></div>
    <div class="stat-card"><span class="stat-value">${stats.countries}</span><span class="stat-label">Countries</span></div>
    <div class="stat-card"><span class="stat-value">${stats.cities}</span><span class="stat-label">Cities and stops</span></div>
    <div class="stat-card"><span class="stat-value">${stats.days}</span><span class="stat-label">Days away</span></div>
  </div>`;
}

function getAllMarkers(trips) {
  return trips.flatMap((trip) => (trip.coordinates || []).map((coordinate) => ({ ...coordinate, trip })));
}

function renderMarker(marker) {
  const x = ((Number(marker.lon) + 180) / 360) * 100;
  const y = ((90 - Number(marker.lat)) / 180) * 100;
  return `<a class="marker" href="${marker.trip.url}" style="--x: ${x.toFixed(3)}%; --y: ${y.toFixed(3)}%;" aria-label="${escapeAttribute(`${marker.name}, ${marker.trip.title}`)}"><span>${escapeHtml(marker.name)}</span></a>`;
}

function renderMap(markers) {
  return `<div class="map-canvas" role="img" aria-label="Approximate map of travel stops">
    ${markers.map(renderMarker).join('\n')}
  </div>`;
}

function renderHome(site, trips) {
  const stats = collectStats(trips);
  const featured = trips.find((trip) => trip.featured) || trips[0];
  const recent = trips.slice(0, 3);
  const markers = getAllMarkers(trips);

  const body = `
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <p class="eyebrow">${escapeHtml(site.homeEyebrow)}</p>
          <h1>${escapeHtml(site.homeTitle)}</h1>
          <p class="lede">${escapeHtml(site.homeIntro)}</p>
          <div class="actions">
            <a class="button" href="${escapeAttribute(site.primaryCtaHref || '/travels/')}">${escapeHtml(site.primaryCtaText || 'Browse trips')}</a>
            <a class="button secondary" href="${escapeAttribute(site.secondaryCtaHref || '/map/')}">${escapeHtml(site.secondaryCtaText || 'See the map')}</a>
          </div>
        </div>
        <aside class="hero-card" aria-label="Featured trip">
          <div class="hero-card-inner">
            <img src="${escapeAttribute(featured?.cover || '/images/abstract-lake.svg')}" alt="${escapeAttribute(featured?.title || site.title)}">
            <div class="hero-card-caption">
              <span>${escapeHtml(featured?.title || 'Featured trip')}</span>
              <a class="text-link" href="${featured?.url || '/travels/'}">Read</a>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${renderStats(stats)}
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <p class="eyebrow">Latest entries</p>
            <h2>Recent trips</h2>
            <p>Each card is generated from a single Markdown file in <code>content/trips</code>.</p>
          </div>
          <a class="text-link" href="/travels/">View all trips</a>
        </div>
        <div class="trip-grid">${recent.map(renderTripCard).join('\n')}</div>
      </div>
    </section>

    <section class="section">
      <div class="container two-column">
        <div class="panel">
          <p class="eyebrow">Easy updates</p>
          <h2>Add a trip in minutes</h2>
          <p class="lede">The site is static, but the workflow stays pleasant: write a Markdown file, add images, commit, and Cloudflare rebuilds the site.</p>
          <ol class="update-list">
            <li><span class="step-number">1</span><span><strong>Copy a sample file.</strong><br>Duplicate one file in <code>content/trips</code> and change the JSON frontmatter.</span></li>
            <li><span class="step-number">2</span><span><strong>Write the story.</strong><br>Use headings, lists, links, blockquotes, and images in the body.</span></li>
            <li><span class="step-number">3</span><span><strong>Push to GitHub.</strong><br>Cloudflare Pages publishes the update automatically.</span></li>
          </ol>
        </div>
        <div>
          ${renderMap(markers)}
        </div>
      </div>
    </section>
  `;

  return renderLayout(site, {
    title: site.title,
    description: site.description,
    pathname: '/',
    body,
    image: featured?.cover
  });
}

function renderTravelsIndex(site, trips) {
  const body = `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">Travel archive</p>
        <h1>Every trip in one place.</h1>
        <p class="lede">Search by country, city, year, or tag. Add new trips by creating Markdown files in <code>content/trips</code>.</p>
        <label class="search-bar">
          <span>Search</span>
          <input type="search" data-trip-search placeholder="Japan, road trip, 2026, food..." aria-label="Search trips">
        </label>
      </div>
    </section>
    <section class="section" style="padding-top: 0;">
      <div class="container">
        <div class="trip-grid">${trips.map(renderTripCard).join('\n')}</div>
        <div class="empty-state" data-empty-state>No trips matched your search.</div>
      </div>
    </section>
  `;
  return renderLayout(site, {
    title: 'Travels',
    description: 'All travel journal entries.',
    pathname: '/travels/',
    body
  });
}

function renderTripPage(site, trip, allTrips) {
  const markers = (trip.coordinates || []).map((coordinate) => ({ ...coordinate, trip }));
  const index = allTrips.findIndex((item) => item.slug === trip.slug);
  const previous = allTrips[index + 1];
  const next = allTrips[index - 1];
  const description = trip.excerpt || trip.subtitle || site.description;

  const body = `
    <article>
      <section class="article-hero">
        <div class="container article-hero-grid">
          <div>
            <p class="eyebrow">${escapeHtml((trip.countries || []).join(', ') || 'Trip')}</p>
            <h1>${escapeHtml(trip.title)}</h1>
            <p class="lede">${escapeHtml(trip.subtitle || trip.excerpt || '')}</p>
            <div class="article-meta">
              <span>${escapeHtml(trip.dateRange)}</span>
              ${trip.days ? `<span class="pill">${trip.days} days</span>` : ''}
              ${trip.status ? `<span class="pill status">${escapeHtml(titleCase(trip.status))}</span>` : ''}
            </div>
            <div class="trip-tags" style="margin-top: 1rem;">${renderPills(trip.tags || [])}</div>
          </div>
          <img src="${escapeAttribute(trip.cover || '/images/abstract-lake.svg')}" alt="${escapeAttribute(trip.title)}">
        </div>
      </section>

      <section class="section" style="padding-top: 2rem;">
        <div class="container article-shell">
          <div class="article-content">
            ${trip.html}
            <hr>
            <h2>Trip map</h2>
            <p>Markers are approximate and come from the coordinates in this trip file.</p>
            ${markers.length ? renderMap(markers) : '<p>No coordinates added yet.</p>'}
          </div>
          <aside class="sidebar" aria-label="Trip details">
            <div class="panel">
              <h2>Snapshot</h2>
              <ul>
                ${(trip.countries || []).length ? `<li>Countries: ${escapeHtml(trip.countries.join(', '))}</li>` : ''}
                ${(trip.cities || []).length ? `<li>Stops: ${escapeHtml(trip.cities.join(', '))}</li>` : ''}
                ${trip.favoriteFood ? `<li>Favorite food: ${escapeHtml(trip.favoriteFood)}</li>` : ''}
                ${trip.favoriteMoment ? `<li>Favorite moment: ${escapeHtml(trip.favoriteMoment)}</li>` : ''}
              </ul>
            </div>
            <div class="panel">
              <h2>Browse nearby</h2>
              <div class="inline-list">
                ${previous ? `<a class="pill" href="${previous.url}">Previous: ${escapeHtml(previous.title)}</a>` : ''}
                ${next ? `<a class="pill" href="${next.url}">Next: ${escapeHtml(next.title)}</a>` : ''}
                <a class="pill" href="/travels/">All trips</a>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </article>
  `;

  return renderLayout(site, {
    title: trip.title,
    description,
    pathname: trip.url,
    body,
    image: trip.cover
  });
}

function renderMapPage(site, trips) {
  const markers = getAllMarkers(trips);
  const body = `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">Travel map</p>
        <h1>Places from the journal.</h1>
        <p class="lede">This lightweight map uses the latitude and longitude values in each trip file. It stays fast because it does not load third-party map scripts.</p>
      </div>
    </section>
    <section class="section" style="padding-top: 0;">
      <div class="container">
        ${renderMap(markers)}
        <div class="map-list">
          ${markers.map((marker) => `<a class="map-card" href="${marker.trip.url}"><strong>${escapeHtml(marker.name)}</strong><p>${escapeHtml(marker.trip.title)} - ${escapeHtml(marker.trip.dateRange)}</p></a>`).join('\n')}
        </div>
      </div>
    </section>
  `;
  return renderLayout(site, {
    title: 'Map',
    description: 'A map of travel journal stops.',
    pathname: '/map/',
    body
  });
}

function renderGalleryPage(site, trips) {
  const body = `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">Gallery</p>
        <h1>A visual index of trips.</h1>
        <p class="lede">Replace the sample SVG covers with your own photos in <code>public/images</code>, then update each trip file's <code>cover</code> value.</p>
      </div>
    </section>
    <section class="section" style="padding-top: 0;">
      <div class="container gallery-grid">
        ${trips.map((trip) => `<figure class="gallery-item"><a href="${trip.url}"><img src="${escapeAttribute(trip.cover || '/images/abstract-lake.svg')}" alt="${escapeAttribute(trip.title)}" loading="lazy"></a><figcaption><strong>${escapeHtml(trip.title)}</strong><br>${escapeHtml(trip.dateRange)}</figcaption></figure>`).join('\n')}
      </div>
    </section>
  `;
  return renderLayout(site, {
    title: 'Gallery',
    description: 'Travel photo gallery.',
    pathname: '/gallery/',
    body
  });
}

function renderAboutPage(site) {
  const body = `
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">About</p>
        <h1>${escapeHtml(site.travelers || site.title)}</h1>
        <p class="lede">${escapeHtml(site.tagline)}</p>
      </div>
    </section>
    <section class="section" style="padding-top: 0;">
      <div class="container two-column">
        <div class="panel">
          <h2>Why this site exists</h2>
          ${(site.about || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
        </div>
        <div class="panel">
          <h2>How to personalize it</h2>
          <ol class="update-list">
            <li><span class="step-number">1</span><span><strong>Edit <code>content/site.json</code>.</strong><br>Update the title, domain, intro, and contact links.</span></li>
            <li><span class="step-number">2</span><span><strong>Replace sample trips.</strong><br>Change or delete the Markdown files in <code>content/trips</code>.</span></li>
            <li><span class="step-number">3</span><span><strong>Add photos.</strong><br>Put images in <code>public/images</code> and reference them from your Markdown files.</span></li>
          </ol>
        </div>
      </div>
    </section>
  `;
  return renderLayout(site, {
    title: 'About',
    description: `About ${site.travelers || site.title}.`,
    pathname: '/about/',
    body
  });
}

function render404(site) {
  const body = `
    <section class="not-found">
      <div class="container">
        <p class="eyebrow">404</p>
        <h1>That road is not on the map.</h1>
        <p class="lede">The page may have moved, or the link may be outdated.</p>
        <div class="actions" style="justify-content: center;"><a class="button" href="/travels/">Back to trips</a></div>
      </div>
    </section>
  `;
  return renderLayout(site, {
    title: 'Page not found',
    description: 'Page not found.',
    pathname: '/404.html',
    body
  });
}

function renderRss(site, trips) {
  const items = trips.map((trip) => `<item>
    <title>${escapeHtml(trip.title)}</title>
    <link>${escapeHtml(absoluteUrl(site, trip.url))}</link>
    <guid>${escapeHtml(absoluteUrl(site, trip.url))}</guid>
    <pubDate>${new Date(`${trip.startDate}T00:00:00Z`).toUTCString()}</pubDate>
    <description>${escapeHtml(trip.excerpt || stripHtml(trip.html).slice(0, 240))}</description>
  </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(site.title)}</title>
    <link>${escapeHtml(normalizeUrl(site.url))}</link>
    <description>${escapeHtml(site.description)}</description>
    ${items}
  </channel>
</rss>`;
}

function renderSitemap(site, trips) {
  const urls = ['/', '/travels/', '/map/', '/gallery/', '/about/', ...trips.map((trip) => trip.url)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeHtml(absoluteUrl(site, url))}</loc></url>`).join('\n')}
</urlset>`;
}

function renderRobots(site) {
  return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl(site, '/sitemap.xml')}
`;
}

async function main() {
  const site = await readJson(path.join(CONTENT_DIR, 'site.json'));
  const trips = await loadTrips();

  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });
  await fs.cp(PUBLIC_DIR, DIST_DIR, { recursive: true });

  await writeFile('index.html', renderHome(site, trips));
  await writeFile('travels/index.html', renderTravelsIndex(site, trips));
  await writeFile('map/index.html', renderMapPage(site, trips));
  await writeFile('gallery/index.html', renderGalleryPage(site, trips));
  await writeFile('about/index.html', renderAboutPage(site));
  await writeFile('404.html', render404(site));
  await writeFile('rss.xml', renderRss(site, trips));
  await writeFile('sitemap.xml', renderSitemap(site, trips));
  await writeFile('robots.txt', renderRobots(site));

  for (const trip of trips) {
    await writeFile(`travels/${trip.slug}/index.html`, renderTripPage(site, trip, trips));
  }

  console.log(`Built ${trips.length} trips into dist/`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
