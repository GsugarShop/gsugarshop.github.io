const products = [
  {
    id: 'dairy-milk',
    name: "Cadbury's Dairy Milk (full bar)",
    description: 'A sharing bar of creamy, classic Cadburys Milk Chocolate',
    price: 3.0,
    image: 'dairymilk.jpg'
  },
  {
    id: 'fruitella',
    name: 'Fruitella',
    description: 'Pack of 10 fruit chews bursting juicy flavours; from renowned sweet brand Fruitella',
    price: 1.0,
    image: 'fruitella.jpg'
  },
  {
    id: 'haribo-gummy-bears',
    name: 'Haribo Gummy Bears',
    description: 'Iconic Haribo sweets; fruity, delicious gummies in the shape of small bears.',
    price: 1.99,
    image: 'gummybears.jpg'
  },
  {
    id: 'wispa',
    name: 'Wispa',
    description: 'Cadburys classic light, bubbly chocolate bar; melts in your mouth.',
    price: 0.99,
    image: 'wispa.jpg'
  }
];

const storageKey = 'gsugarOrders';
const companyEmail = '007140@gsal.org.uk';
const apiBaseUrl = '/api';
const statusMap = {
  email: 'Email with details sent [check inbox]',
  processing: 'Processing',
  delivered: 'Delivered'
};

const bag = [];
let orders = [];

const productGrid = document.getElementById('productGrid');
const bagItems = document.getElementById('bagItems');
const bagTotal = document.getElementById('bagTotal');
const customOrderForm = document.getElementById('customOrderForm');
const checkoutForm = document.getElementById('checkoutForm');
const thankYouPopup = document.getElementById('thankYouPopup');
const closePopup = document.getElementById('closePopup');
const popupOk = document.getElementById('popupOk');
const customerLoginBtn = document.getElementById('customerLoginBtn');

function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Remote API unavailable, using local fallback.', error);
    return null;
  }
}

function loadOrders() {
  const saved = localStorage.getItem(storageKey);
  orders = saved ? JSON.parse(saved) : [];
  purgeExpiredDelivered();
}

function saveOrders() {
  localStorage.setItem(storageKey, JSON.stringify(orders));
}

function purgeExpiredDelivered() {
  const now = Date.now();
  const filtered = orders.filter(order => {
    if (order.status !== 'delivered' || !order.deliveredAt) return true;
    return now - order.deliveredAt < 3 * 24 * 60 * 60 * 1000;
  });
  if (filtered.length !== orders.length) {
    orders = filtered;
    saveOrders();
  }
}

async function loadRemoteOrders() {
  const remote = await apiRequest('/orders');
  if (Array.isArray(remote)) {
    orders = remote;
    purgeExpiredDelivered();
    saveOrders();
  }
}

async function saveOrderRemote(order) {
  const response = await apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(order)
  });

  if (response && response.id) {
    const localIndex = orders.findIndex(item => item.id === order.id);
    if (localIndex >= 0) {
      orders[localIndex] = response;
    }
    saveOrders();
  }
}

function renderProducts() {
  productGrid.innerHTML = products.map(product => `
    <article class="product-card">
      <img class="product-image" src="${product.image}" alt="${product.name}" />
      <div class="product-body">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-footer">
          <span class="product-price">${formatPrice(product.price)}</span>
          <button class="btn btn-secondary" onclick="addToBag('${product.id}')">Add to Bag</button>
        </div>
      </div>
    </article>
  `).join('');
}

function renderBag() {
  if (!bag.length) {
    bagItems.innerHTML = '<p class="empty-note">Your bag is empty. Add sweets from the menu above.</p>';
    bagTotal.textContent = formatPrice(0);
    return;
  }

  bagItems.innerHTML = bag.map((item, index) => `
    <div class="bag-item">
      <div class="bag-item-info">
        <strong>${item.name}</strong>
        <small>${item.description}</small>
      </div>
      <div class="bag-item-info">
        <span>${formatPrice(item.price)}</span>
      </div>
      <button class="remove-link" onclick="removeFromBag(${index})">Remove</button>
    </div>
  `).join('');

  const total = bag.reduce((sum, item) => sum + item.price, 0);
  bagTotal.textContent = formatPrice(total);
}

function addToBag(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;
  bag.push({ ...product });
  renderBag();
  document.querySelector('.bag-section').scrollIntoView({ behavior: 'smooth' });
}

function removeFromBag(index) {
  bag.splice(index, 1);
  renderBag();
}

function createOrder(customerName, customerEmail) {
  return {
    id: `order-${Date.now()}`,
    customerName,
    customerEmail,
    items: [...bag],
    total: bag.reduce((sum, item) => sum + item.price, 0),
    status: 'email',
    createdAt: Date.now(),
    deliveredAt: null,
    cancelledAt: null
  };
}

function showThankYouPopup() {
  thankYouPopup.classList.add('show');
  thankYouPopup.setAttribute('aria-hidden', 'false');
}

function closeThankYouPopup() {
  thankYouPopup.classList.remove('show');
  thankYouPopup.setAttribute('aria-hidden', 'true');
}

customOrderForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('customSweetName').value.trim();
  const description = document.getElementById('customSweetDescription').value.trim();
  if (!name || !description) return;
  bag.push({ id: `custom-${Date.now()}`, name: `Custom: ${name}`, description, price: 5.0 });
  renderBag();
  customOrderForm.reset();
  document.querySelector('.bag-section').scrollIntoView({ behavior: 'smooth' });
});

checkoutForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!bag.length) {
    alert('Please add at least one sweet to your bag before checking out.');
    return;
  }

  const name = document.getElementById('customerName').value.trim();
  const email = document.getElementById('customerEmail').value.trim();
  if (!name || !email) return;

  const order = createOrder(name, email);
  orders.push(order);
  saveOrders();
  await saveOrderRemote(order);

  const subject = encodeURIComponent(`New Gsugar order from ${name}`);
  const body = encodeURIComponent(`Name: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0AOrder items:%0D%0A${order.items.map(item => `- ${item.name} (${formatPrice(item.price)})`).join('%0D%0A')}%0D%0ATotal: ${formatPrice(order.total)}`);
  const mailtoLink = `mailto:${companyEmail}?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;

  showThankYouPopup();
  checkoutForm.reset();
  bag.length = 0;
  renderBag();
});

customerLoginBtn.addEventListener('click', () => {
  window.location.href = 'login.html';
});
popupOk.addEventListener('click', closeThankYouPopup);
closePopup.addEventListener('click', closeThankYouPopup);
thankYouPopup.addEventListener('click', event => {
  if (event.target === thankYouPopup) closeThankYouPopup();
});

window.addEventListener('DOMContentLoaded', async () => {
  loadOrders();
  await loadRemoteOrders();
  renderProducts();
  renderBag();
});

window.addEventListener('scroll', () => {
  if (!scrollProfileBtn) return;
  if (window.scrollY > 140) {
    scrollProfileBtn.classList.add('show');
  } else {
    scrollProfileBtn.classList.remove('show');
  }
});
