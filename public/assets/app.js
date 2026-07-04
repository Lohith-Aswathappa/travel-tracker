const root = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const navLinks = document.querySelector('[data-nav-links]');
const searchInput = document.querySelector('[data-trip-search]');
const emptyState = document.querySelector('[data-empty-state]');

function setTheme(theme) {
  root.dataset.theme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch (error) {
    // Ignore storage errors in privacy-restricted browsers.
  }
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

if (searchInput) {
  const cards = Array.from(document.querySelectorAll('[data-trip-card]'));
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    let visible = 0;

    cards.forEach((card) => {
      const haystack = card.getAttribute('data-search') || '';
      const match = haystack.includes(term);
      card.style.display = match ? '' : 'none';
      if (match) visible += 1;
    });

    if (emptyState) {
      emptyState.style.display = visible === 0 ? 'block' : 'none';
    }
  });
}
