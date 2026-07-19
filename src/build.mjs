import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(root, 'content/site.json'), 'utf8'));
const trips = JSON.parse(fs.readFileSync(path.join(root, 'content/trips.json'), 'utf8'))
  .map(trip => ({ ...trip, photos: photosFor(trip.slug), coverImage: `/images/trips/${trip.slug}/photo-${String(trip.cover).padStart(2, '0')}.jpg` }))
  .sort((a, b) => b.date.localeCompare(a.date));

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
copyDir(path.join(root, 'public'), dist);
writeAssets();
page('index.html', home());
page('stories/index.html', stories());
page('destinations/index.html', destinations());
page('map/index.html', mapPage());
page('about/index.html', about());
page('404.html', layout('Page not found', `<section class="empty"><p class="kicker">404</p><h1>We took a wrong turn.</h1><p>This page doesn't exist, but there are plenty of other places to explore.</p><a class="button" href="/">Return home</a></section>`));
trips.forEach(trip => page(`stories/${trip.slug}/index.html`, story(trip)));
text('data/trips.json', JSON.stringify(trips.map(({ story, photos, ...trip }) => trip), null, 2));
text('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
text('sitemap.xml', sitemap());
text('rss.xml', rss());
text('_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cache-Control: public, max-age=0, must-revalidate\n/images/*\n  Cache-Control: public, max-age=31536000, immutable\n');

function photosFor(slug) {
  const dir = path.join(root, 'public/images/trips', slug);
  return fs.readdirSync(dir).filter(file => /\.(jpe?g|webp)$/i.test(file)).sort().map(file => `/images/trips/${slug}/${file}`);
}
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function date(value) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
function page(relative, html) { const output = path.join(dist, relative); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, html); }
function text(relative, content) { const output = path.join(dist, relative); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, content); }
function copyDir(source, target) { if (!fs.existsSync(source)) return; fs.mkdirSync(target, { recursive: true }); for (const entry of fs.readdirSync(source, { withFileTypes: true })) { const src = path.join(source, entry.name); const dst = path.join(target, entry.name); entry.isDirectory() ? copyDir(src, dst) : fs.copyFileSync(src, dst); } }
function nav() { return `<header class="nav"><a class="wordmark" href="/" aria-label="Adventure Atlas home"><span>Adventure</span> Atlas</a><nav aria-label="Main navigation"><a href="/stories/">Stories</a><a href="/destinations/">Destinations</a><a href="/map/">Map</a><a href="/about/">About</a></nav><div class="nav-actions"><button class="search-trigger" data-search-open aria-label="Search">⌕</button><button class="menu-trigger" data-menu aria-label="Open menu"><i></i><i></i></button></div></header>`; }
function footer() { return `<footer><a class="wordmark" href="/"><span>Adventure</span> Atlas</a><p>Notes from the road by ${esc(site.travelers)}.</p><div><a href="/stories/">Stories</a><a href="/rss.xml">RSS</a><button data-theme>Light / Dark</button></div><small>© ${new Date().getFullYear()} ${esc(site.travelers)}</small></footer>`; }
function layout(title, content, description = site.description) {
  const searchData = trips.map(trip => ({ title: trip.title, place: trip.place, region: trip.region, type: trip.type, url: `/stories/${trip.slug}/`, image: trip.coverImage }));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · ${esc(site.title)}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#f4f2ed"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/styles.css"></head><body>${nav()}<main>${content}</main>${footer()}<div class="search" data-search><div class="search-panel"><button data-search-close aria-label="Close">×</button><label>Search the atlas</label><input data-search-input placeholder="Try Yosemite or city…" autocomplete="off"><div data-search-results></div></div></div><script>window.TRIPS=${JSON.stringify(searchData)}</script><script src="/assets/app.js"></script></body></html>`;
}
function tripCard(trip, wide = false) { return `<article class="trip-card${wide ? ' wide' : ''}"><a href="/stories/${trip.slug}/"><div class="card-image"><img src="${trip.coverImage}" alt="${esc(trip.place)}" loading="lazy"><span>${esc(trip.type)}</span></div><div class="card-copy"><p>${date(trip.date)} · ${esc(trip.region)}</p><h3>${esc(trip.title)}</h3><span class="arrow">↗</span></div></a></article>`; }
function home() {
  const hero = trips[0], featured = trips.slice(1, 4);
  const photoCount = trips.reduce((count, trip) => count + trip.photos.length, 0);
  return layout('Home', `<section class="home-hero"><img src="${hero.coverImage}" alt="${esc(hero.place)}"><div class="hero-shade"></div><div class="hero-top"><p class="kicker">A travel journal by ${esc(site.travelers)}</p><h1>Go somewhere<br><em>worth remembering.</em></h1></div><a class="hero-story" href="/stories/${hero.slug}/"><div><span>Latest story</span><strong>${esc(hero.title)}</strong><small>${esc(hero.region)} · ${date(hero.date)}</small></div><b>Read story <i>↗</i></b></a><div class="scroll-cue">Scroll to wander <span>↓</span></div></section><section class="intro"><p class="kicker">Our atlas</p><h2>We collect places,<br>but remember <em>moments.</em></h2><p>${esc(site.description)}</p></section><section class="featured"><div class="section-title"><div><p class="kicker">Recently added</p><h2>Stories from the road</h2></div><a href="/stories/">View all stories <span>↗</span></a></div><div class="featured-grid">${featured.map((trip, index) => tripCard(trip, index === 0)).join('')}</div></section><section class="manifesto"><p>${String(trips.length).padStart(2, '0')} stories · ${photoCount} photographs · one growing atlas</p><blockquote>“The best journeys leave us with more than photographs.”</blockquote><a class="button light" href="/destinations/">Explore destinations</a></section>`);
}
function stories() { return layout('Stories', `<section class="page-head"><p class="kicker">The journal</p><h1>Stories from<br><em>near and far.</em></h1><p>Trails, city streets, open roads, and the moments between destinations.</p></section><section class="filters"><button class="active" data-filter="all">All stories</button>${[...new Set(trips.map(t => t.type))].map(type => `<button data-filter="${esc(type)}">${esc(type)}</button>`).join('')}</section><section class="story-grid" data-trip-grid>${trips.map(trip => `<div data-type="${esc(trip.type)}">${tripCard(trip)}</div>`).join('')}</section>`); }
function destinations() {
  const groups = Object.groupBy ? Object.groupBy(trips, trip => trip.country) : trips.reduce((all, trip) => ((all[trip.country] ??= []).push(trip), all), {});
  return layout('Destinations', `<section class="page-head destinations-head"><p class="kicker">Places we've been</p><h1>The atlas,<br><em>place by place.</em></h1></section><section class="destination-list">${Object.entries(groups).map(([country, list], index) => `<div class="destination-row"><div><span>${String(index + 1).padStart(2, '0')}</span><p>${list.length} ${list.length === 1 ? 'story' : 'stories'}</p></div><h2>${esc(country)}</h2><div class="destination-links">${list.map(trip => `<a href="/stories/${trip.slug}/"><img src="${trip.coverImage}" alt="" loading="lazy"><span><b>${esc(trip.place)}</b><small>${esc(trip.type)}</small></span><i>↗</i></a>`).join('')}</div></div>`).join('')}</section>`); }
function mapPage() { return layout('Map', `<section class="page-head map-head"><p class="kicker">Explore geographically</p><h1>Every place<br><em>holds a story.</em></h1><p>A simple, private-by-design map—no tracking and no paid map service.</p></section><section class="atlas-map"><div class="map-lines"></div>${trips.map((trip, index) => `<a class="map-pin" href="/stories/${trip.slug}/" style="--x:${((trip.lng + 180) / 360 * 100).toFixed(2)}%;--y:${((90 - trip.lat) / 180 * 100).toFixed(2)}%"><b>${index + 1}</b><span>${esc(trip.place)}</span></a>`).join('')}<div class="map-key">${trips.map((trip, index) => `<a href="/stories/${trip.slug}/"><span>${String(index + 1).padStart(2, '0')}</span>${esc(trip.place)}</a>`).join('')}</div></section>`); }
function about() { return layout('About', `<section class="about-hero"><div><p class="kicker">Behind the atlas</p><h1>Two people.<br>One shared<br><em>curiosity.</em></h1></div><img src="${trips.find(t => t.slug === 'puerto-rico').coverImage}" alt="A moment from our travels"></section><section class="about-copy"><p class="lead">We're ${esc(site.travelers)}, and this is where we keep the places we don't want to forget.</p><div><p>Adventure Atlas began as a simple idea: make a home for the photographs and small stories that otherwise disappear into a camera roll.</p><p>It isn't a checklist of everywhere we've been. It's a record of what a place felt like—the light, the long walks, the roadside stops, and the views that made us pause.</p><p>The atlas will grow slowly, one honest trip at a time.</p></div></section><section class="about-note"><span>Currently based in</span><strong>${esc(site.location)}</strong><a href="/stories/">Start exploring <i>↗</i></a></section>`); }
function story(trip) { return layout(trip.title, `<article class="story-page"><header class="story-hero"><img src="${trip.coverImage}" alt="${esc(trip.place)}"><div class="hero-shade"></div><div><p class="kicker">${esc(trip.type)} · ${date(trip.date)}</p><h1>${esc(trip.title)}</h1><p>${esc(trip.region)}</p></div></header><section class="story-intro"><p class="kicker">The story</p><h2>${esc(trip.dek)}</h2><div>${trip.story.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</div></section><section class="photo-essay">${trip.photos.filter(photo => photo !== trip.coverImage).map((photo, index) => `<figure class="photo-${(index % 5) + 1}"><img src="${photo}" alt="${esc(trip.place)} travel photograph ${index + 1}" loading="lazy"></figure>`).join('')}</section><section class="story-end"><p>${esc(trip.place)}</p><span>${trip.photos.length} photographs · ${date(trip.date)}</span><a href="/stories/">Back to all stories <i>↗</i></a></section></article>`, trip.dek); }
function sitemap() { const paths = ['', 'stories/', 'destinations/', 'map/', 'about/', ...trips.map(trip => `stories/${trip.slug}/`)]; return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(item => `<url><loc>${site.url}/${item}</loc></url>`).join('')}</urlset>`; }
function rss() { return `<?xml version="1.0"?><rss version="2.0"><channel><title>${esc(site.title)}</title><link>${site.url}</link><description>${esc(site.description)}</description>${trips.map(trip => `<item><title>${esc(trip.title)}</title><link>${site.url}/stories/${trip.slug}/</link><pubDate>${new Date(trip.date).toUTCString()}</pubDate><description>${esc(trip.dek)}</description></item>`).join('')}</channel></rss>`; }

function writeAssets() {
  text('assets/styles.css', fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8'));
  text('assets/app.js', fs.readFileSync(path.join(root, 'src/app.js'), 'utf8'));
}
