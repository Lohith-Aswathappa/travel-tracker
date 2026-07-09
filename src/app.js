const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const current = location.pathname;
$$('.nav nav a').forEach(link => {
  const href = link.getAttribute('href');
  if (current === href || (href !== '/' && current.startsWith(href))) link.classList.add('active');
});

const root = document.documentElement;
if (localStorage.getItem('theme') === 'dark') root.classList.add('dark');
$$('[data-theme]').forEach(button => button.addEventListener('click', () => {
  root.classList.toggle('dark');
  localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
}));

$('[data-menu]')?.addEventListener('click', () => document.body.classList.toggle('menu-open'));

const overlay = $('[data-search]');
const input = $('[data-search-input]');
const results = $('[data-search-results]');
function renderSearch(query = '') {
  const q = query.trim().toLowerCase();
  const matches = (window.TRIPS || []).filter(trip => !q || JSON.stringify(trip).toLowerCase().includes(q));
  results.innerHTML = matches.map(trip => `<a href="${trip.url}"><img src="${trip.image}" alt=""><span><b>${trip.title}</b><small>${trip.place} · ${trip.type}</small></span><i>↗</i></a>`).join('') || '<p>No stories found.</p>';
}
function openSearch() { overlay.classList.add('open'); renderSearch(); setTimeout(() => input.focus(), 80); }
function closeSearch() { overlay.classList.remove('open'); }
$('[data-search-open]')?.addEventListener('click', openSearch);
$('[data-search-close]')?.addEventListener('click', closeSearch);
input?.addEventListener('input', event => renderSearch(event.target.value));
overlay?.addEventListener('click', event => { if (event.target === overlay) closeSearch(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeSearch();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
});

$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  $$('[data-filter]').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  const filter = button.dataset.filter;
  $$('[data-trip-grid] > div').forEach(card => card.hidden = filter !== 'all' && card.dataset.type !== filter);
}));

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}), { threshold: 0.08 });
$$('.trip-card, .destination-row, .photo-essay figure').forEach(element => observer.observe(element));
