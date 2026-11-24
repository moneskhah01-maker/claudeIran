// Sticky navbar for every page that has the Keel top bar (landing, blog, services, 404).
// The bar lives inside the hero panel, which clips and isolates its children, so CSS
// position:sticky cannot work there. Instead, once the bar scrolls past the top it moves
// (with the mobile menu) into a fixed glass container on <body>, and a slot keeps its space
// so nothing jumps; scrolling back up returns it to its place.
export function initStickyNav() {
  const nav = document.querySelector('.hero-panel .nav');
  if (!nav) return;
  const menu = document.getElementById('mnav');
  const menuBtn = document.getElementById('menuBtn');
  const root = document.documentElement;
  const slot = document.createElement('div');
  slot.className = 'nav-slot';
  slot.setAttribute('aria-hidden', 'true');
  nav.before(slot);
  const float = document.createElement('div');
  float.className = 'nav-float';
  const TOP = 10;
  let stuck = false, raf = 0;

  const closeMenu = () => {
    if (!menu?.classList.contains('open')) return;
    menu.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    menuBtn?.setAttribute('aria-label', 'باز کردن منو');
  };
  const set = on => {
    if (on === stuck) return;
    stuck = on;
    closeMenu(); // the open menu changes the in-flow height, so it never travels between the two places
    if (on) {
      slot.style.height = nav.offsetHeight + 'px';
      float.append(nav);
      if (menu) float.append(menu);
      document.body.append(float);
    } else {
      slot.after(nav);
      if (menu) nav.after(menu);
      float.remove();
      slot.style.height = '';
    }
    root.classList.toggle('nav-stuck', on);
  };
  const update = () => {
    raf = 0;
    // while floating, the slot marks where the bar belongs; otherwise the bar itself does
    set((stuck ? slot : nav).getBoundingClientRect().top < TOP);
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', update);
  update();
}
