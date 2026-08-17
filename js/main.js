let products = [];
let cart = [];

// ========== ЕТАП 2: ОДЕРЖАННЯ HTML-ЕЛЕМЕНТІВ (DOM) ==========
const productsGrid = document.querySelector('.products-cards');
const cartBtn = document.getElementById('cart-btn');
const cartCount = document.getElementById('cart-count');
let cartModal = document.getElementById('cart-modal');
let closeModalBtn = document.getElementById('close-modal-btn');
let cartItemsContainer = document.getElementById('cart-items');
let totalPriceEl = document.getElementById('total-price');
let checkoutBtn = document.getElementById('checkout-btn');
let clearCartBtn = document.getElementById('clear-cart-btn');
let checkoutForm = document.getElementById('checkout-form');

// створюємо  HTML кошика.
function createCart() {
  if (cartModal) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="cart-modal" class="cart-modal hidden">
      <div class="cart-window">
        <button id="close-modal-btn" class="close-cart" type="button">×</button>
        <h2>Кошик</h2>
        <div id="cart-items"></div>
        <p class="cart-total">Разом: <strong id="total-price">0 грн</strong></p>
        <div class="cart-actions">
          <button id="clear-cart-btn" class="cart-secondary" type="button">Очистити</button>
          <button id="checkout-btn" class="cart-primary" type="button">Оформити замовлення</button>
        </div>
        <form id="checkout-form" class="checkout-form hidden">
          <input id="user-name" type="text" placeholder="Ваше ім'я" required>
          <input id="user-phone" type="tel" placeholder="Номер телефону" required>
          <input id="user-city" type="text" placeholder="Місто доставки" required>
          <button class="cart-primary" type="submit">Підтвердити замовлення</button>
        </form>
      </div>
    </div>
  `);

  cartModal = document.getElementById('cart-modal');
  closeModalBtn = document.getElementById('close-modal-btn');
  cartItemsContainer = document.getElementById('cart-items');
  totalPriceEl = document.getElementById('total-price');
  checkoutBtn = document.getElementById('checkout-btn');
  clearCartBtn = document.getElementById('clear-cart-btn');
  checkoutForm = document.getElementById('checkout-form');

  closeModalBtn.addEventListener('click', closeCart);
  if (cartBtn) {
    cartBtn.addEventListener('click', () => cartModal.classList.remove('hidden'));
  }
  cartModal.addEventListener('click', event => {
    if (event.target === cartModal) closeCart();
  });
  clearCartBtn.addEventListener('click', clearCart);
  checkoutBtn.addEventListener('click', () => checkoutForm.classList.toggle('hidden'));
  checkoutForm.addEventListener('submit', submitOrder);
}

function closeCart() {
  if (cartModal) cartModal.classList.add('hidden');
  if (checkoutForm) checkoutForm.classList.add('hidden');
}

// БЕЗПЕЧНЕ СТВОРЕННЯ КОНТЕЙНЕРА ДЛЯ ТОСТІВ
let toastContainer = document.getElementById('toast-container');
if (!toastContainer) {
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000;';
  document.body.appendChild(toastContainer);
}

// ========== ЕТАП 3: ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ КУКІ (COOKIE) ==========
function saveJsonCookie(cookieName, data, seconds = 86400) {
  const jsonString = JSON.stringify(data);
  const safeString = encodeURIComponent(jsonString);
  document.cookie = `${cookieName}=${safeString}; max-age=${seconds}; path=/`;
}

// ВИПРАВЛЕНО: функція тепер коректно зклеює дані, навіть якщо всередині є знаки "="
function getJsonCookie(cookieName) {
  const allCookies = document.cookie.split('; ');
  const targetCookie = allCookies.find(row => row.startsWith(cookieName + '='));
  if (targetCookie) {
    const parts = targetCookie.split('=');
    parts.shift(); // Видаляємо назву кукі (techstore_cart)
    const encodedData = parts.join('='); // Зклеюємо все інше назад
    try {
      return JSON.parse(decodeURIComponent(encodedData));
    } catch (e) {
      console.error("Помилка парсингу кукі:", e);
      return null;
    }
  }
  return null;
}

// ========== ЕТАП 4: ЗАВАНТАЖЕННЯ ДАНИХ ТА ІНІЦІАЛІЗАЦІЯ ==========
async function fetchProducts() {
  try {
    const response = await fetch('/js/products.json');
    if (!response.ok) throw new Error('Не вдалося завантажити товари');
    
    const allProducts = await response.json();
    const currentPath = window.location.pathname.toLowerCase();
    
    if (currentPath.includes('bbs.html')) {
      products = allProducts.filter(product => product.category === 'ББС');
    } else if (currentPath.includes('ab3.html')) {
      products = allProducts.filter(product => product.category === '3АК' || product.category === 'AB3');
    } else {
      products = allProducts;
    }

    if (!productsGrid) return; 

    if (products.length === 0) {
      productsGrid.innerHTML = '<p class="error">У цій категорії наразі немає товарів.</p>';
      return;
    }

    displayProducts(products); 
  } catch (error) {
    console.error('Помилка завантаження товарів:', error);
    if (productsGrid) {
      productsGrid.innerHTML = '<p class="error">Не вдалося завантажити каталог товарів.</p>';
    }
  }
}

function initCart() {
  const savedCart = getJsonCookie('techstore_cart');
  if (savedCart && Array.isArray(savedCart)) {
    cart = savedCart;
  } else {
    cart = [];
  }
  updateCartUI();
}

// ========== ЕТАП 5: ВІДОБРАЖЕННЯ ТОВАРІВ ==========
function createProductCard(product) {
  return `
    <div class="card">
      <img class="img-card" src="${product.image}" alt="${product.name}" loading="lazy">
      <h3 class="title-card">${product.name}</h3>
      <p class="price-card">${product.price} грн</p>
      <button class="btn-add" onclick="addToCart(${product.id})">
        + В кошик
      </button>
    </div>
  `;
}

function displayProducts(itemsToDisplay) {
  if (!productsGrid) return;
  productsGrid.innerHTML = ''; 
  itemsToDisplay.forEach(product => {
    productsGrid.innerHTML += createProductCard(product);
  });
}

// ========== ЕТАП 6: ЛОГІКА КОШИКА (ЕКСПОРТ В WINDOW ДЛЯ ONCLICK) ==========
window.addToCart = function(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }

  saveCart();
  updateCartUI();
  showToast(`"${product.name}" додано у кошик!`);
};

window.removeFromCart = function(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
  showToast('Товар видалено з кошика.');
};

window.changeQuantity = function(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    window.removeFromCart(productId);
  } else {
    saveCart();
    updateCartUI();
  }
};

function saveCart() {
  saveJsonCookie('techstore_cart', cart, 7 * 86400);
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCount) cartCount.textContent = totalCount;

  const totalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  if (totalPriceEl) totalPriceEl.textContent = `${totalSum} грн`;

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Ваш кошик порожній.</p>';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    if (clearCartBtn) clearCartBtn.style.display = 'none';
  } else {
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    if (clearCartBtn) clearCartBtn.style.display = 'block';

    cartItemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">${item.price} грн × ${item.quantity} = ${item.price * item.quantity} грн</div>
        </div>
        <div class="cart-item-controls">
          <button class="btn-qty" onclick="changeQuantity(${item.id}, -1)">-</button>
          <span>${item.quantity}</span>
          <button class="btn-qty" onclick="changeQuantity(${item.id}, 1)">+</button>
          <button class="btn-remove" onclick="removeFromCart(${item.id})">🗑️</button>
        </div>
      </div>
    `).join('');
  }
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
  showToast('Кошик очищено');
}

// ========== ЕТАП 8: ПОДІЇ ТА МОДАЛЬНЕ ВІКНО (З ПЕРЕВІРКАМИ НА ИСНУВАННЯ) ==========
if (cartBtn && cartModal) {
  cartBtn.addEventListener('click', () => {
    cartModal.classList.remove('hidden');
  });
}

if (closeModalBtn && cartModal) {
  closeModalBtn.addEventListener('click', () => {
    cartModal.classList.add('hidden');
    if (checkoutForm) checkoutForm.classList.add('hidden');
  });
}

if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);

if (checkoutBtn && checkoutForm) {
  checkoutBtn.addEventListener('click', () => {
    checkoutForm.classList.toggle('hidden');
  });
}

function submitOrder(e) {
    e.preventDefault();

    const name = document.getElementById('user-name').value;
    const phone = document.getElementById('user-phone').value;
    const city = document.getElementById('user-city').value;

    alert(`Дякуємо за замовлення, ${name}!\nМи зателефонуємо вам на номер ${phone} для підтвердження доставки у ${city}.\nСлава Україні! Слава Нації!`);

    cart = [];
    saveCart();
    updateCartUI();
    checkoutForm.reset();
    checkoutForm.classList.add('hidden');
    if (cartModal) cartModal.classList.add('hidden');
    showToast('Замовлення успішно оформлено.');
}

if (checkoutForm) {
  checkoutForm.addEventListener('submit', submitOrder);
}

// ========== ДОПОМІЖНІ СПЛИВАЮЧІ ПОВІДОМЛЕННЯ (TOAST) ==========
function showToast(message) {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  // Базові стилі для самого повідомлення, якщо раптом немає у CSS
  toast.style.cssText = 'background: #333; color: #fff; padding: 10px 20px; margin-top: 5px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ========== СТАРТ ПРИ ЗАВАНТАЖЕННІ СТОРІНКИ ==========
document.addEventListener('DOMContentLoaded', () => {
    createCart();
    const images = document.querySelectorAll('.carousel-image');
    if (images.length > 0) {
        let currentIndex = 0;
        function showNextImage() {
            images[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % images.length;
            images[currentIndex].classList.add('active');
        }
        setInterval(showNextImage, 3000);
    }

    fetchProducts(); 
    initCart();      
});
