const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const progress = document.querySelector('.scroll-progress span');
const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-menu a')];
const sections = [...document.querySelectorAll('main section[id]')];
const heroVideo = document.querySelector('.hero__video');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');
const cursorGlow = document.querySelector('.cursor-glow');
const pointerX = document.querySelector('[data-pointer-x]');
const pointerY = document.querySelector('[data-pointer-y]');

const setMenu = (open) => {
  menuButton.setAttribute('aria-expanded', String(open));
  mobileMenu.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('menu-open', open);
  menuButton.querySelector('.sr-only').textContent = open ? 'Fechar menu' : 'Abrir menu';
};

menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
navLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

const updateScroll = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? window.scrollY / max : 0;
  progress.style.transform = `scaleX(${ratio})`;
  header.classList.toggle('is-scrolled', window.scrollY > 24);
};

window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
);

document.querySelectorAll('.reveal').forEach((item) => revealObserver.observe(item));

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => link.classList.toggle('is-active', link.hash === `#${visible.target.id}`));
  },
  { rootMargin: '-28% 0px -62% 0px', threshold: 0 },
);

sections.forEach((section) => sectionObserver.observe(section));

const syncVideoMotion = () => {
  if (!heroVideo) return;
  if (reducedMotion.matches) {
    heroVideo.pause();
  } else if (document.visibilityState === 'visible') {
    heroVideo.play().catch(() => {});
  }
};

reducedMotion.addEventListener('change', syncVideoMotion);
document.addEventListener('visibilitychange', syncVideoMotion);
syncVideoMotion();

const terminalTargets = document.querySelectorAll([
  '.hero__role',
  '.project-card__body > p:first-child',
  '.learning-strip > span',
  '.timeline__content > span',
  '.contact__details span',
].join(','));

const typeTerminalText = (element) => {
  const value = element.dataset.terminalText || element.textContent.trim().replace(/\s+/g, ' ');
  element.dataset.terminalText = value;
  element.setAttribute('aria-label', value);

  if (reducedMotion.matches) {
    element.textContent = value;
    return;
  }

  element.textContent = '';
  element.classList.add('terminal-typing');
  let index = 0;
  const speed = Math.max(14, Math.min(30, 560 / value.length));

  const tick = () => {
    index += 1;
    element.textContent = value.slice(0, index);
    if (index < value.length) {
      window.setTimeout(tick, speed);
    } else {
      element.classList.remove('terminal-typing');
      element.classList.add('terminal-complete');
    }
  };

  tick();
};

const terminalObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      typeTerminalText(entry.target);
      terminalObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.45 },
);

terminalTargets.forEach((target) => terminalObserver.observe(target));

const getCursorAngle = (element, x, y) => {
  const { width, height } = element.getBoundingClientRect();
  return (Math.atan2(y - height / 2, x - width / 2) * 180) / Math.PI + 90;
};

const getEdgeProximity = (element, x, y) => {
  const { width, height } = element.getBoundingClientRect();
  const sensitivity = Number.parseFloat(
    window.getComputedStyle(element).getPropertyValue('--edge-sensitivity'),
  ) || 36;
  const distance = Math.max(0, Math.min(x, y, width - x, height - y));
  return Math.max(0, Math.min(100, (1 - distance / sensitivity) * 100));
};

const borderGlowCards = document.querySelectorAll('.skill-card, .project-card');
const borderSweepFrames = new WeakMap();

const stopBorderSweep = (card) => {
  const frame = borderSweepFrames.get(card);
  if (frame) window.cancelAnimationFrame(frame);
  borderSweepFrames.delete(card);
};

const runBorderSweep = (card) => {
  if (reducedMotion.matches || card.dataset.userInteracted === 'true') return;

  const startedAt = performance.now();
  const duration = 1450;
  card.classList.add('is-border-sweeping');

  const draw = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - (1 - progress) ** 3;
    const angle = -35 + eased * 430;
    const radians = ((angle - 90) * Math.PI) / 180;
    const proximity = Math.sin(progress * Math.PI) * 86;

    card.style.setProperty('--cursor-angle', `${angle}deg`);
    card.style.setProperty('--edge-proximity', proximity.toFixed(2));
    card.style.setProperty('--local-x', `${50 + Math.cos(radians) * 50}%`);
    card.style.setProperty('--local-y', `${50 + Math.sin(radians) * 50}%`);

    if (progress < 1) {
      borderSweepFrames.set(card, window.requestAnimationFrame(draw));
      return;
    }

    card.style.setProperty('--edge-proximity', '0');
    card.classList.remove('is-border-sweeping');
    borderSweepFrames.delete(card);
  };

  borderSweepFrames.set(card, window.requestAnimationFrame(draw));
};

borderGlowCards.forEach((card, index) => {
  card.classList.add('border-glow-card');
  const edgeLight = document.createElement('span');
  edgeLight.className = 'edge-light';
  edgeLight.setAttribute('aria-hidden', 'true');
  card.prepend(edgeLight);

  card.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || reducedMotion.matches) return;
    card.dataset.userInteracted = 'true';
    stopBorderSweep(card);
    card.classList.remove('is-border-sweeping');
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    card.style.setProperty('--local-x', `${x}px`);
    card.style.setProperty('--local-y', `${y}px`);
    card.style.setProperty('--cursor-angle', `${getCursorAngle(card, x, y)}deg`);
    card.style.setProperty('--edge-proximity', getEdgeProximity(card, x, y).toFixed(2));
  });

  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--edge-proximity', '0');
  });

  card.dataset.borderGlowDelay = String((index % 3) * 130);
});

const borderGlowObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      window.setTimeout(() => runBorderSweep(card), Number(card.dataset.borderGlowDelay));
      borderGlowObserver.unobserve(card);
    });
  },
  { threshold: 0.32 },
);

borderGlowCards.forEach((card) => borderGlowObserver.observe(card));

const spotlightPanels = document.querySelectorAll('.diagnostic, .timeline');
spotlightPanels.forEach((panel) => {
  panel.classList.add('spotlight-panel');
  panel.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || reducedMotion.matches) return;
    const rect = panel.getBoundingClientRect();
    panel.style.setProperty('--local-x', `${event.clientX - rect.left}px`);
    panel.style.setProperty('--local-y', `${event.clientY - rect.top}px`);
  });
});

let pointerFrame;
window.addEventListener('pointermove', (event) => {
  if (!finePointer.matches || reducedMotion.matches || !cursorGlow) return;
  window.cancelAnimationFrame(pointerFrame);
  pointerFrame = window.requestAnimationFrame(() => {
    cursorGlow.style.setProperty('--pointer-x', `${event.clientX}px`);
    cursorGlow.style.setProperty('--pointer-y', `${event.clientY}px`);
    cursorGlow.classList.add('is-active');
    pointerX.textContent = String(Math.round(event.clientX)).padStart(4, '0');
    pointerY.textContent = String(Math.round(event.clientY)).padStart(4, '0');
  });
}, { passive: true });

document.documentElement.addEventListener('mouseleave', () => cursorGlow?.classList.remove('is-active'));

document.querySelectorAll('details').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    detail.querySelector('summary span').textContent = detail.open ? '−' : '+';
  });
});
