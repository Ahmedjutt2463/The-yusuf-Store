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

const cart = {
  items: JSON.parse(localStorage.getItem('cart') || '[]'),

  save() {
    localStorage.setItem('cart', JSON.stringify(this.items));
    this.updateBadge();
  },

  add(item) {
    const existing = this.items.find(i => i.id === item.id && i.size === item.size);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      this.items.push({ ...item });
    }
    this.save();
    this.renderDrawer();
    showToast(item.name + ' added to cart!');
  },

  remove(id, size) {
    this.items = this.items.filter(i => !(i.id === id && i.size === size));
    this.save();
    this.renderDrawer();
  },

  updateQty(id, size, qty) {
    const item = this.items.find(i => i.id === id && i.size === size);
    if (item) {
      item.quantity = qty;
      if (item.quantity <= 0) this.remove(id, size);
      else { this.save(); this.renderDrawer(); }
    }
  },

  getCount() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  },

  getTotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  clear() {
    this.items = [];
    this.save();
    this.renderDrawer();
  },

  updateBadge() {
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.textContent = this.getCount();
      b.style.display = this.getCount() > 0 ? 'flex' : 'none';
    });
  },

  renderDrawer() {
    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = '<div class="cart-empty">Your cart is empty.</div>';
      totalEl.textContent = 'Rs. 0';
      return;
    }

    container.innerHTML = this.items.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-size">${item.size}</div>
          <div class="cart-item-price">Rs. ${Number(item.price).toLocaleString()}</div>
        </div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" data-id="${item.id}" data-size="${item.size}" data-dir="-1">-</button>
          <span>${item.quantity}</span>
          <button class="cart-qty-btn" data-id="${item.id}" data-size="${item.size}" data-dir="1">+</button>
        </div>
        <button class="cart-item-remove" data-id="${item.id}" data-size="${item.size}">&times;</button>
      </div>
    `).join('');

    totalEl.textContent = 'Rs. ' + this.getTotal().toLocaleString();
  }
};

function injectCartUI() {
  if (document.getElementById('cartDrawer')) return;

  const html = `
    <div class="cart-overlay" id="cartOverlay"></div>
    <div class="cart-drawer" id="cartDrawer">
      <div class="cart-header">
        <h3>Shopping Cart</h3>
        <button class="cart-close" id="cartClose">&times;</button>
      </div>
      <div class="cart-items" id="cartItems">
        <div class="cart-empty">Your cart is empty.</div>
      </div>
      <div class="cart-footer">
        <div class="cart-total">
          <span>Total</span>
          <span id="cartTotal">Rs. 0</span>
        </div>
        <button class="btn btn-primary" id="checkoutBtn">Checkout</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  document.getElementById('cartItems').addEventListener('click', e => {
    const btn = e.target.closest('.cart-qty-btn');
    if (btn) {
      const id = btn.dataset.id;
      const size = btn.dataset.size;
      const dir = parseInt(btn.dataset.dir);
      const item = cart.items.find(i => i.id === id && i.size === size);
      if (item) cart.updateQty(id, size, item.quantity + dir);
    }
    const removeBtn = e.target.closest('.cart-item-remove');
    if (removeBtn) {
      cart.remove(removeBtn.dataset.id, removeBtn.dataset.size);
    }
  });

  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (cart.items.length === 0) return;
    closeCart();
    window.location.href = 'checkout.html';
  });
}

function openCart() {
  injectCartUI();
  cart.renderDrawer();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('click', e => {
  const cartBtn = e.target.closest('.cart-btn');
  if (cartBtn) { e.preventDefault(); openCart(); }
});

document.querySelectorAll('.cart-btn').forEach(b => { cart.updateBadge(); });

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

document.querySelectorAll('.qty-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const input = this.parentElement.querySelector('input');
    if (this.textContent === '-') {
      if (parseInt(input.value) > 1) input.value = parseInt(input.value) - 1;
    } else {
      if (parseInt(input.value) < 10) input.value = parseInt(input.value) + 1;
    }
  });
});

document.querySelectorAll('.size-option').forEach(opt => {
  opt.addEventListener('click', function () {
    const parent = this.closest('.size-options');
    parent.querySelectorAll('.size-option').forEach(o => o.classList.remove('active'));
    this.classList.add('active');
  });
});

document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    const detailPage = this.closest('.detail-info');
    if (detailPage) {
      const name = this.dataset.product;
      const activeSize = detailPage.querySelector('.size-option.active');
      if (!activeSize || activeSize.dataset.stock === 'out') {
        showToast('This size is out of stock.');
        return;
      }
      const size = activeSize.dataset.label || (activeSize.dataset.size + 'ml');
      const price = parseInt(activeSize.dataset.sale);
      const qty = parseInt(detailPage.querySelector('.quantity-controls input').value) || 1;
      const img = document.querySelector('.main-image img')?.src || '';
      const id = window.location.pathname.split('/').pop().replace('.html', '');
      cart.add({ id, name, size, price, quantity: qty, image: img });
    } else {
      const id = this.dataset.id || this.dataset.product?.toLowerCase().replace(/\s+/g, '-');
      const name = this.dataset.product;
      const priceEl = this.closest('.product-card')?.querySelector('.sale');
      const price = priceEl ? parseInt(priceEl.textContent.replace(/[^0-9]/g, '')) : 0;
      const img = this.closest('.product-card')?.querySelector('.product-img img')?.src || '';
      const card = this.closest('.product-card');
      const size = this.dataset.size || '50ml';
      cart.add({ id, name, size, price, quantity: 1, image: img });
    }
  });
});

document.querySelectorAll('.btn-buy').forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    const detailPage = this.closest('.detail-info');
    const addBtn = detailPage?.querySelector('.add-to-cart');
    if (addBtn) {
      addBtn.click();
      setTimeout(() => window.location.href = 'checkout.html', 400);
    }
  });
});

function playVideo(el) {
  const video = el.querySelector('video');
  if (!video) return;
  video.controls = true;
  video.play();
  el.querySelector('.play-icon')?.remove();
}

document.querySelectorAll('.product-video-thumb').forEach(el => {
  el.addEventListener('click', function (e) {
    e.preventDefault();
    playVideo(this);
  });
});

document.getElementById('contactForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const btn = document.getElementById('contactSendBtn');
  btn.textContent = 'Sending...';
  btn.disabled = true;
  const payload = {
    name: document.getElementById('contactName').value.trim(),
    email: document.getElementById('contactEmail').value.trim(),
    subject: document.getElementById('contactSubject').value.trim(),
    message: document.getElementById('contactMessage').value.trim()
  };
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send');
    showToast('Thank you! Your message has been sent.');
    this.reset();
  } catch (err) {
    showToast('Sorry, message could not be sent. Please email info@scentsbyyusuf.com');
  } finally {
    btn.textContent = 'Send Message';
    btn.disabled = false;
  }
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

function switchImage(src, thumb) {
  const mainImg = document.getElementById('mainImg');
  if (!mainImg) return;
  mainImg.src = src;
  mainImg.style.display = 'block';
  mainImg.classList.remove('img-swap');
  void mainImg.offsetWidth;
  mainImg.classList.add('img-swap');
  const mainVideo = document.getElementById('mainVideo');
  if (mainVideo) {
    mainVideo.pause();
    mainVideo.style.display = 'none';
  }
  if (thumb) {
    const gallery = thumb.closest('.thumbnails');
    if (gallery) {
      gallery.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    }
  }
}

function gallerySwipe() {
  const gallery = document.querySelector('.detail-gallery');
  if (!gallery) return;

  let startX = null;
  let startY = null;

  gallery.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
  }, { passive: true });

  gallery.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    startX = null;
    startY = null;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    const mainVideo = document.getElementById('mainVideo');
    const videoThumb = gallery.querySelector('.thumb-video');
    const imageThumbs = Array.from(gallery.querySelectorAll('.thumb:not(.thumb-video)'));
    if (imageThumbs.length < 2) return;

    const videoShowing = mainVideo && mainVideo.style.display !== 'none';

    if (deltaX < 0) {
      if (videoShowing) {
        imageThumbs[0].click();
      } else {
        const idx = imageThumbs.findIndex(t => t.classList.contains('active'));
        imageThumbs[(idx + 1) % imageThumbs.length].click();
      }
    } else {
      if (videoThumb && !videoShowing) {
        const idx = imageThumbs.findIndex(t => t.classList.contains('active'));
        if (idx <= 0) {
          videoThumb.click();
        } else {
          imageThumbs[idx - 1].click();
        }
      } else if (!videoThumb) {
        const idx = imageThumbs.findIndex(t => t.classList.contains('active'));
        imageThumbs[(idx - 1 + imageThumbs.length) % imageThumbs.length].click();
      }
    }
  }, { passive: true });
}

gallerySwipe();

function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-bg');
  if (slides.length < 2) return;
  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 5000);
}

initHeroSlider();

(function trackVisit() {
  try {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
    let sid = localStorage.getItem('ys_session');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('ys_session', sid);
    }
    const device = {
      model: '',
      os: '',
      browserName: '',
      platform: navigator.platform || '',
      screen: (window.screen && screen.width) ? screen.width + 'x' + screen.height : '',
      language: navigator.language || '',
      touch: 'ontouchstart' in window ? 'Yes' : 'No',
      ua: navigator.userAgent || ''
    };
    const ua = device.ua;
    if (/Android/i.test(ua)) device.os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) device.os = /iPad/i.test(ua) ? 'iPadOS' : 'iOS';
    else if (/Windows/i.test(ua)) device.os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) device.os = 'macOS';
    else if (/Linux/i.test(ua)) device.os = 'Linux';
    if (/Edg\//i.test(ua)) device.browserName = 'Edge';
    else if (/OPR\/|Opera/i.test(ua)) device.browserName = 'Opera';
    else if (/Chrome/i.test(ua)) device.browserName = 'Chrome';
    else if (/Safari/i.test(ua)) device.browserName = 'Safari';
    else if (/Firefox/i.test(ua)) device.browserName = 'Firefox';
    else device.browserName = 'Other';
    if (navigator.deviceMemory) device.memory = navigator.deviceMemory + 'GB';
    if (navigator.hardwareConcurrency) device.cores = navigator.hardwareConcurrency;

    const body = JSON.stringify({
      session_id: sid,
      page: location.pathname,
      referrer: document.referrer || '',
      device
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track-visit', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      });
    }
  } catch (e) { /* tracking must never break the site */ }
})();

async function syncProductData() {
  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    const payload = await res.json();
    if (!payload || !Array.isArray(payload.data)) return;
    const products = payload.data;
    const bySlug = new Map();
    const byName = new Map();
    products.forEach(p => {
      bySlug.set(String(p.slug || '').toLowerCase().trim(), p);
      byName.set(String(p.name || '').toLowerCase().trim(), p);
    });
    const fmt = n => 'Rs. ' + Number(n).toLocaleString('en-PK');

    const pageSlug = location.pathname.split('/').pop().replace('.html', '').toLowerCase();
    const pageProd = bySlug.get(pageSlug);

    if (pageProd) {
      const price = Number(pageProd.price) || 0;
      const oldPrice = Number(pageProd.old_price) || 0;
      const inStock = Number(pageProd.stock) > 0;

      document.querySelectorAll('.original').forEach(el => {
        if (oldPrice) el.textContent = fmt(oldPrice);
      });
      document.querySelectorAll('.sale').forEach(el => {
        el.textContent = fmt(price);
      });
      document.querySelectorAll('.size-option').forEach(o => {
        o.dataset.sale = String(price);
        o.dataset.original = String(oldPrice || price);
        o.dataset.stock = inStock ? 'in' : 'out';
      });
      const badge = document.querySelector('.discount-badge');
      if (badge && oldPrice > price) {
        const pct = Math.round((1 - price / oldPrice) * 100);
        if (pct > 0) badge.textContent = pct + '% OFF';
      }
      const addBtn = document.querySelector('.detail-info .add-to-cart');
      if (addBtn && !inStock) {
        addBtn.disabled = true;
        addBtn.classList.add('disabled');
        addBtn.textContent = 'Out of Stock';
        const buy = addBtn.closest('.detail-actions')?.querySelector('.btn-buy');
        if (buy) { buy.disabled = true; buy.classList.add('disabled'); buy.textContent = 'Out of Stock'; }
      }

      const ld = document.querySelector('script[type="application/ld+json"]');
      if (ld) {
        try {
          const data = JSON.parse(ld.textContent);
          if (data && data.offers) {
            data.offers.price = String(price);
            if (oldPrice) data.offers.priceValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
            if (!inStock) data.offers.availability = 'https://schema.org/OutOfStock';
            ld.textContent = JSON.stringify(data, null, 2);
          }
        } catch (e) { /* ignore malformed JSON-LD */ }
      }
    }

    document.querySelectorAll('.add-to-cart[data-product]').forEach(btn => {
      const key = String(btn.dataset.product).toLowerCase().trim();
      const prod = byName.get(key) || bySlug.get(key.replace(/\s+/g, '-'));
      if (!prod) return;
      const price = Number(prod.price) || 0;
      const oldPrice = Number(prod.old_price) || 0;
      const inStock = Number(prod.stock) > 0;
      const card = btn.closest('.product-card');
      if (card) {
        const sale = card.querySelector('.sale');
        if (sale) sale.textContent = fmt(price);
        const orig = card.querySelector('.original');
        if (orig && oldPrice) orig.textContent = fmt(oldPrice);
      }
      if (!inStock) {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.textContent = 'Out of Stock';
      }
    });
  } catch (e) { /* keep hardcoded prices if the API is unavailable */ }
}
syncProductData();
