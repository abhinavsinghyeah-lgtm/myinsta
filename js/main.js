// ============================================
// MYINSTA — Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Navbar scroll effect ----------
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  }, { passive: true });


  // ---------- Mobile hamburger menu ----------
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close nav when a link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });

  // Close nav on outside click
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target)) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
    }
  });


  // ---------- Intersection Observer: Reveal animations ----------
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay || 0;
        setTimeout(() => el.classList.add('visible'), parseInt(delay));
        revealObserver.unobserve(el);
      }
    });
  }, { threshold: 0.12 });

  // Feature cards
  document.querySelectorAll('.feature-card').forEach(el => {
    revealObserver.observe(el);
  });

  // Generic reveal elements
  document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
  });

  // Step cards
  document.querySelectorAll('.step-card').forEach((el, i) => {
    el.dataset.delay = i * 150;
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  // Testimonial cards
  document.querySelectorAll('.testi-card').forEach((el, i) => {
    el.dataset.delay = i * 100;
    el.classList.add('reveal');
    revealObserver.observe(el);
  });


  // ---------- Animated counter ----------
  function animateCounter(el, target, duration = 1800) {
    const start = performance.now();
    const startVal = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startVal + (target - startVal) * eased);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // Observe stat section
  const statsSection = document.getElementById('stats');
  let statsAnimated = false;

  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !statsAnimated) {
          statsAnimated = true;
          document.querySelectorAll('[data-count]').forEach(el => {
            animateCounter(el, parseInt(el.dataset.count, 10));
          });
          statsObserver.disconnect();
        }
      });
    }, { threshold: 0.3 });
    statsObserver.observe(statsSection);
  }


  // ---------- Smooth active nav link ----------
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-links a:not(.nav-cta)');

  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(link => {
          link.style.color = '';
          if (link.getAttribute('href') === `#${entry.target.id}`) {
            link.style.color = 'var(--text)';
          }
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(section => activeObserver.observe(section));


  // ---------- Panel mockup: qty button interaction ----------
  document.querySelectorAll('.mm-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mm-qty').forEach(b => b.classList.remove('active-qty'));
      btn.classList.add('active-qty');
    });
  });


  // ---------- Float card counters (number counts up live) ----------
  const floatNums = {
    '.card-likes  .fc-num':     { base: 12400, range: 200 },
    '.card-followers .fc-num':  { base: 5800,  range: 50  },
    '.card-views .fc-num':      { base: 98000, range: 500 },
  };

  // Small live increment effect on float cards
  Object.entries(floatNums).forEach(([selector, opts]) => {
    const el = document.querySelector(selector.trim());
    if (!el) return;

    let current = opts.base;
    setInterval(() => {
      const delta = Math.floor(Math.random() * opts.range);
      current += delta;
      el.textContent = '+' + current.toLocaleString();
    }, 3500 + Math.random() * 2000);
  });


  // ---------- Hero entrance animation ----------
  const heroBadge  = document.querySelector('.hero-badge');
  const heroTitle  = document.querySelector('.hero-title');
  const heroSub    = document.querySelector('.hero-subtitle');
  const heroActs   = document.querySelector('.hero-actions');
  const heroTrust  = document.querySelector('.hero-trust');

  [heroBadge, heroTitle, heroSub, heroActs, heroTrust].forEach((el, i) => {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.7s ease ${i * 120}ms, transform 0.7s ease ${i * 120}ms`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  });

});
