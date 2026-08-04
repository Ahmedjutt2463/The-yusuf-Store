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
  const PRODUCTS_CACHE_KEY = 'ys_products_v1';
  const fmt = n => 'Rs. ' + Number(n).toLocaleString('en-PK');
  let applied = false;

  document.querySelectorAll('.add-to-cart, .btn-buy').forEach(btn => {
    if (!btn.dataset.__orig) btn.dataset.__orig = btn.textContent;
    btn.disabled = true;
    btn.classList.add('disabled');
  });

  function applyProductData(products) {
    if (!Array.isArray(products) || !products.length) return false;
    const bySlug = new Map();
    const byName = new Map();
    products.forEach(p => {
      bySlug.set(String(p.slug || '').toLowerCase().trim(), p);
      byName.set(String(p.name || '').toLowerCase().trim(), p);
    });
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
      const card = btn.closest('.product-card');
      if (card && prod) {
        const price = Number(prod.price) || 0;
        const oldPrice = Number(prod.old_price) || 0;
        const sale = card.querySelector('.sale');
        if (sale) sale.textContent = fmt(price);
        const orig = card.querySelector('.original');
        if (orig && oldPrice) orig.textContent = fmt(oldPrice);
      }
      const inStock = prod ? Number(prod.stock) > 0 : true;
      if (!inStock) {
        if (!btn.dataset.__orig) btn.dataset.__orig = btn.textContent;
        btn.classList.add('oos');
        btn.textContent = 'Out of Stock';
      }
    });

    const addBtn = document.querySelector('.detail-info .add-to-cart');
    const buyBtn = addBtn && addBtn.closest('.detail-actions')?.querySelector('.btn-buy');
    if (buyBtn && addBtn) {
      if (!buyBtn.dataset.__orig) buyBtn.dataset.__orig = buyBtn.textContent;
      if (addBtn.classList.contains('oos')) {
        buyBtn.classList.add('oos');
        buyBtn.textContent = 'Out of Stock';
      } else {
        buyBtn.textContent = buyBtn.dataset.__orig;
      }
    }
    return true;
  }

  function setReady() {
    document.body.classList.add('price-ready');
    document.querySelectorAll('.add-to-cart, .btn-buy').forEach(btn => {
      const oos = btn.classList.contains('oos');
      btn.disabled = oos;
      btn.classList.toggle('disabled', oos);
      btn.textContent = oos ? 'Out of Stock' : (btn.dataset.__orig || btn.textContent);
    });
  }

  try {
    const cached = JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY) || 'null');
    if (Array.isArray(cached) && cached.length) {
      applyProductData(cached);
      setReady();
      applied = true;
    }
  } catch (e) { /* cache may be corrupted */ }

  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    const payload = await res.json();
    if (payload && Array.isArray(payload.data) && payload.data.length) {
      applyProductData(payload.data);
      try { localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(payload.data)); } catch (e) { /* ignore */ }
      setReady();
      applied = true;
    }
  } catch (e) { /* fall through */ }

  if (!applied) setReady();
}
syncProductData();
setTimeout(() => document.body.classList.add('price-ready'), 6000);

/* ---------- REVIEWS ---------- */
function initReviews() {
  const detailSection = document.querySelector('.product-detail');
  if (!detailSection) return;

  const slug = (location.pathname.split('/').pop().replace('.html', '') || 'product').toLowerCase();
  const escHtml = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  detailSection.insertAdjacentHTML('afterend', `
    <section class="reviews-section" id="reviewsSection">
      <div class="reviews-container">
        <div class="reviews-head">
          <h2>Customer Reviews</h2>
          <div class="reviews-summary" id="reviewsSummary">Loading reviews...</div>
        </div>
        <div class="reviews-list" id="reviewsList"></div>
        <form class="review-form" id="reviewForm" novalidate>
          <h3>Write a Review</h3>
          <div class="review-form-row">
            <div class="review-form-field">
              <label for="rvName">Your Name *</label>
              <input type="text" id="rvName" maxlength="50" placeholder="e.g. Ahmed" required>
            </div>
            <div class="review-form-field">
              <label>Rating *</label>
              <div class="rating-input" id="ratingInput">
                <span class="rate-star" data-v="1" title="1 star">&star;</span>
                <span class="rate-star" data-v="2" title="2 stars">&star;</span>
                <span class="rate-star" data-v="3" title="3 stars">&star;</span>
                <span class="rate-star" data-v="4" title="4 stars">&star;</span>
                <span class="rate-star" data-v="5" title="5 stars">&star;</span>
              </div>
            </div>
          </div>
          <div class="review-form-field">
            <label for="rvText">Your Review *</label>
            <textarea id="rvText" rows="4" maxlength="1000" placeholder="Share your experience with this product..." required></textarea>
          </div>
          <div class="review-form-field">
            <label>Add a photo <span class="review-hint">(optional, JPG or PNG, max 1)</span></label>
            <input type="file" id="rvPhoto" accept="image/jpeg,image/png">
            <div class="photo-preview" id="photoPreview"></div>
          </div>
          <div class="review-form-field">
            <label>Verify with Google <span class="review-hint">(optional, marks your review as genuine)</span></label>
            <div id="gSignIn"></div>
            <div class="review-google-status" id="gStatus" style="display:none"></div>
          </div>
          <button type="submit" class="btn btn-primary" id="rvSubmit">Submit Review</button>
        </form>
      </div>
    </section>
  `);

  const listEl = document.getElementById('reviewsList');
  const summaryEl = document.getElementById('reviewsSummary');
  const form = document.getElementById('reviewForm');
  const nameInput = document.getElementById('rvName');
  const textInput = document.getElementById('rvText');
  const submitBtn = document.getElementById('rvSubmit');
  const photoInput = document.getElementById('rvPhoto');
  const previewEl = document.getElementById('photoPreview');
  const starEls = Array.from(document.querySelectorAll('#ratingInput .rate-star'));
  let selectedRating = 0;

  const starsHtml = n => {
    const filled = '&#9733;'.repeat(Math.max(0, Math.min(5, n)));
    const empty = '&#9734;'.repeat(Math.max(0, 5 - n));
    return filled + empty;
  };

  const fmtDate = iso => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  };

  function renderReview(r) {
    return `
      <div class="review-card">
        <div class="review-top">
          <span class="review-name">${escHtml(r.name)}</span>
          <span class="review-date">${fmtDate(r.created_at)}</span>
        </div>
        <div class="review-stars">${starsHtml(Number(r.rating) || 0)}</div>
        <p class="review-text">${escHtml(r.review).replace(/\n/g, '<br>')}</p>
        ${r.photo ? `<a class="review-photo-link" href="${escHtml(r.photo)}" target="_blank" rel="noopener nofollow" title="View photo"><img src="${escHtml(r.photo)}" alt="Review photo" loading="lazy"></a>` : ''}
      </div>`;
  }

  function renderAll(reviews) {
    if (!reviews.length) {
      listEl.innerHTML = '<p class="reviews-empty">No reviews yet. Be the first to write one!</p>';
      summaryEl.textContent = 'Be the first to review this product';
      return;
    }
    listEl.innerHTML = reviews.map(renderReview).join('');
    const avg = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length;
    const avgTxt = avg.toFixed(1).replace(/\.0$/, '');
    summaryEl.innerHTML = `${starsHtml(Math.round(avg))} <strong>${avgTxt}</strong> &middot; ${reviews.length} review${reviews.length === 1 ? '' : 's'}`;
  }

  async function loadReviews() {
    try {
      const res = await fetch('/api/reviews?slug=' + encodeURIComponent(slug), { cache: 'no-store' });
      const payload = await res.json();
      renderAll(Array.isArray(payload.data) ? payload.data : []);
    } catch (e) {
      summaryEl.textContent = 'Reviews could not be loaded.';
    }
  }

  starEls.forEach(star => {
    const setHover = n => starEls.forEach(s => s.classList.toggle('hover', Number(s.dataset.v) <= n));
    star.addEventListener('mouseenter', () => setHover(Number(star.dataset.v)));
    star.addEventListener('mouseleave', () => starEls.forEach(s => s.classList.remove('hover')));
    star.addEventListener('click', () => {
      selectedRating = Number(star.dataset.v);
      starEls.forEach(s => s.classList.toggle('active', Number(s.dataset.v) <= selectedRating));
    });
  });

  let pickedPhoto = null;
  photoInput.addEventListener('change', () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) { pickedPhoto = null; previewEl.innerHTML = ''; return; }
    if (!/^image\/(jpeg|png)$/i.test(file.type)) {
      showToast('Please choose a JPG or PNG photo.');
      photoInput.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Photo is too large. Please choose a smaller one (max 8MB).');
      photoInput.value = '';
      return;
    }
    pickedPhoto = file;
    previewEl.innerHTML = `<div class="photo-preview-item">
      <img src="${URL.createObjectURL(file)}" alt="Selected photo">
      <button type="button" class="photo-remove" title="Remove photo">&times;</button>
    </div>`;
    previewEl.querySelector('.photo-remove').addEventListener('click', () => {
      pickedPhoto = null;
      photoInput.value = '';
      previewEl.innerHTML = '';
    });
  });

  function compressImage(file, maxDim, maxBytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the photo.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not read that photo. Please use a JPG or PNG.'));
        img.onload = () => {
          try {
            let width = img.width, height = img.height;
            const scale = Math.min(1, maxDim / Math.max(width, height));
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            let quality = 0.82;
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            while (dataUrl.length > maxBytes * 1.34 && quality > 0.4) {
              quality -= 0.15;
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            resolve(dataUrl);
          } catch (e) {
            reject(new Error('Could not process that photo.'));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  let googleCredential = null;
  let googleUser = null;
  const gSignInEl = document.getElementById('gSignIn');
  const gStatusEl = document.getElementById('gStatus');

  const decodeJwtPayload = token => {
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch (e) { return null; }
  };

  function setGStatus(html) {
    gStatusEl.innerHTML = html;
    gStatusEl.style.display = 'block';
  }

  function handleCredential(response) {
    const payload = decodeJwtPayload(response.credential);
    if (!payload || !payload.email) return;
    googleCredential = response.credential;
    googleUser = payload;
    setGStatus('&#10003; Verified as <strong>' + escHtml(payload.email) + '</strong>');
  }

  function loadGis() {
    return new Promise(resolve => {
      if (window.google && window.google.accounts) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  async function initGoogleSignIn() {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      const cfg = await res.json();
      const clientId = cfg && cfg.googleClientId;
      if (!clientId) return;
      const loaded = await loadGis();
      if (!loaded) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        cancel_on_tap_outside: false
      });
      google.accounts.id.renderButton(gSignInEl, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'signin_with',
        size: 'medium',
        width: 220
      });
    } catch (e) { /* Google sign-in is optional; skip silently */ }
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    const review = textInput.value.trim();
    if (!name) { showToast('Please enter your name.'); return; }
    if (!selectedRating) { showToast('Please select a star rating.'); return; }
    if (!review) { showToast('Please write your review.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    try {
      let photo = null;
      if (pickedPhoto) {
        photo = await compressImage(pickedPhoto, 1000, 1300000);
      }
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, rating: selectedRating, review, photo, googleCredential })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Review could not be submitted. Please try again.');
      }
      form.reset();
      selectedRating = 0;
      starEls.forEach(s => s.classList.remove('active'));
      pickedPhoto = null;
      previewEl.innerHTML = '';
      showToast('Thank you! Your review has been published.');
      loadReviews();
    } catch (err) {
      showToast(err.message || 'Review could not be submitted.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  });

  loadReviews();
  initGoogleSignIn();
}
initReviews();
