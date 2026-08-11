let products = [];
let cart = [];

// ========== ЕТАП 2: ОДЕРЖАННЯ HTML-ЕЛЕМЕНТІВ (DOM) ==========
// Змінено id на пошук за класом '.products-cards', який є у вашому HTML
const productsGrid = document.querySelector('.products-cards');
const cartBtn = document.getElementById('cart-btn');
const cartCount = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceEl = document.getElementById('total-price');
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const checkoutForm = document.getElementById('checkout-form');

// ========== ЕТАП 3: ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ КУКІ (COOKIE) ==========
function saveJsonCookie(cookieName, data, seconds = 86400) {
  const jsonString = JSON.stringify(data);
  const safeString = encodeURIComponent(jsonString);
  document.cookie = `${cookieName}=${safeString}; max-age=${seconds}; path=/`;
}

function getJsonCookie(cookieName) {
  const allCookies = document.cookie.split('; ');
  const targetCookie = allCookies.find(row => row.startsWith(cookieName + '='));
  if (targetCookie) {
    const encodedData = targetCookie.split('=')[1];
    return JSON.parse(decodeURIComponent(encodedData));
  }
  return null;
}

// ========== ЕТАП 4: ЗАВАНТАЖЕННЯ ДАНИХ ТА ІНІЦІАЛІЗАЦІЯ ==========
// Асинхронна функція для отримання товарів з JSON та їх фільтрації за сторінками
async function fetchProducts() {
  try {
    const response = await fetch('/js/products.json');
    if (!response.ok) throw new Error('Не вдалося завантажити товари');
    
    const allProducts = await response.json();
    
    // Автоматично визначаємо поточну сторінку з назви файлу в адресному рядку
    const currentPath = window.location.pathname.toLowerCase();
    
    // Фільтруємо масив залежно від того, на якій сторінці перебуває користувач
    if (currentPath.includes('bbs.html')) {
      // Залишаємо товари лише для ББС
      products = allProducts.filter(product => product.category === 'ББС');
    } else if (currentPath.includes('ab3.html')) {
      // Залишаємо товари для AB3 / 3АК
      products = allProducts.filter(product => product.category === '3АК' || product.category === 'AB3');
    } else {
      // На головній сторінці (index.html) показуємо весь асортимент
      products = allProducts;
    }

    if (!productsGrid) return; // Захист на випадок, якщо на сторінці немає блоку товарів

    if (products.length === 0) {
      productsGrid.innerHTML = '<p class="error">У цій категорії наразі немає товарів.</p>';
      return;
    }

    displayProducts(products); // Відображаємо відфільтровані товари
  } catch (error) {
    console.error('Помилка завантаження:', error);
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

// ========== ЕТАП 5: ВІДОБРАЖЕННЯ ТОВАРІВ (ПІДЛАШТОВАНО ПІД ВАШ HTML) ==========
// Шаблон повністю адаптовано під класи вашого файлу стилів style.css
function createProductCard(product) {
  return `
    <div class="card">
      <img class="img-card" src="${product.image}" alt="${product.name}" loading="lazy">
      <h3 class="title-card">${product.name}</h3>
      <p class="price-card">${product.price} грн</p>
      <button class="btn-add" style="margin-top: 10px; cursor: pointer;" onclick="addToCart(${product.id})">
        + В кошик
      </button>
    </div>
  `;
}

function displayProducts(itemsToDisplay) {
  productsGrid.innerHTML = ''; 
  itemsToDisplay.forEach(product => {
    productsGrid.innerHTML += createProductCard(product);
  });
}

// ========== ЕТАП 6: ЛОГІКА КОШИКА (ДОДАВАННЯ, ЗМІНА, ВИДАЛЕННЯ) ==========
function addToCart(productId) {
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
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
  showToast('Товар видалено з кошика.');
}

function changeQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    saveCart();
    updateCartUI();
  }
}

function saveCart() {
  saveJsonCookie('techstore_cart', cart, 7 * 86400);
}

function updateCartUI() {
  if (!cartCount || !totalPriceEl || !cartItemsContainer) return;

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalCount;

  const totalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  totalPriceEl.textContent = `${totalSum} грн`;

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

// ========== ЕТАП 8: ПОДІЇ ТА МОДАЛЬНЕ ВІКНО ==========
if (cartBtn) {
  cartBtn.addEventListener('click', () => {
    cartModal.classList.remove('hidden');
  });
}

if (closeModalBtn) {
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

if (checkoutForm) {
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('user-name').value;
    const phone = document.getElementById('user-phone').value;
    const city = document.getElementById('user-city').value;

    alert(`Дякуємо за замовлення, ${name}!\nМи зателефонуємо вам на номер ${phone} для підтвердження доставки у ${city}.Слава Україні! Слава Nації!`);

    cart = [];
    saveCart();
    updateCartUI();
    checkoutForm.reset();
    checkoutForm.classList.add('hidden');
    if (cartModal) cartModal.classList.add('hidden');
    showToast('Замовлення успішно оформлено.');
  });
}

// ========== ДОПОМІЖНІ СПЛИВАЮЧІ ПОВІДОМЛЕННЯ (TOAST) ==========
function showToast(message) {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ========== СТАРТ ПРИ ЗАВАНТАЖЕННІ СТОРІНКИ ==========
document.addEventListener('DOMContentLoaded', () => {
    // Безпечний запуск каруселі, якщо елементи є на сторінці
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

    fetchProducts(); // Завантаження та автоматична фільтрація товарів
    initCart();      // Ініціалізація кошика
}); 