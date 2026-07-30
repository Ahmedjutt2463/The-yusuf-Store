const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

const themeToggle = document.querySelector('.theme-toggle');
themeToggle.textContent = savedTheme === 'dark' ? '\u2600' : '\u263E';
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '\u2600' : '\u263E';
});

const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

document.getElementById('contactForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  showToast('Thank you! We will get back to you soon.');
  this.reset();
});

document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    showToast(this.dataset.product + ' added to cart!');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.product-card, .gallery-item, .about-content, .contact form, .section-title').forEach(el => {
  el.classList.add('scroll-fade');
  observer.observe(el);
});

document.querySelectorAll('.size-option').forEach(opt => {
  opt.addEventListener('click', function () {
    const parent = this.closest('.size-options');
    parent.querySelectorAll('.size-option').forEach(o => o.classList.remove('active'));
    this.classList.add('active');

    const original = this.dataset.original;
    const sale = this.dataset.sale;
    const priceContainer = this.closest('.detail-info').querySelector('.price');
    if (priceContainer) {
      priceContainer.querySelector('.original').textContent = 'Rs. ' + Number(original).toLocaleString();
      priceContainer.querySelector('.sale').textContent = 'Rs. ' + Number(sale).toLocaleString();
    }
  });
});

const backToTop = document.createElement('button');
backToTop.className = 'back-to-top';
backToTop.innerHTML = '&uarr;';
backToTop.setAttribute('aria-label', 'Back to top');
document.body.appendChild(backToTop);

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
});
