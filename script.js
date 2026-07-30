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

document.getElementById('contactForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  alert('Thank you for your interest in The Yusuf Store! We will get back to you soon.');
  this.reset();
});

document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    alert(this.dataset.product + ' has been added to your cart!');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

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
