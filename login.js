const storageKey = 'gsugarOrders';
const statusMap = {
  email: 'Email with details sent [check inbox]',
  processing: 'Processing',
  delivered: 'Delivered',
  cancelled: 'Cancelled [check details in email]'
};

let orders = [];

const customerLoginForm = document.getElementById('customerLoginForm');
const loginEmailInput = document.getElementById('loginEmailInput');
const userOrdersSection = document.getElementById('userOrdersSection');
const userOrdersPanel = document.getElementById('userOrdersPanel');

function loadOrders() {
  const saved = localStorage.getItem(storageKey);
  orders = saved ? JSON.parse(saved) : [];
  purgeExpiredOrders();
}

function purgeExpiredOrders() {
  const now = Date.now();
  const filtered = orders.filter(order => {
    if (order.status === 'delivered' && order.deliveredAt) {
      return now - order.deliveredAt < 3 * 24 * 60 * 60 * 1000;
    }
    if (order.status === 'cancelled' && order.cancelledAt) {
      return now - order.cancelledAt < 3 * 24 * 60 * 60 * 1000;
    }
    return true;
  });
  if (filtered.length !== orders.length) {
    orders = filtered;
    localStorage.setItem(storageKey, JSON.stringify(orders));
  }
}

function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

function renderUserOrders(email) {
  const matched = orders.filter(order => order.customerEmail.toLowerCase() === email.toLowerCase());
  if (!matched.length) {
    userOrdersPanel.innerHTML = `
      <div class="empty-note">
        No orders found for <strong>${email}</strong> yet.
        <div style="margin-top:1.5rem;">
          <a class="btn btn-secondary" href="index.html#sweets">Browse sweets</a>
        </div>
      </div>
    `;
    return;
  }

  userOrdersPanel.innerHTML = matched.map(order => `
    <article class="order-card">
      <div class="order-head">
        <div>
          <strong>Order ${order.id.slice(-6)}</strong>
          <small>${new Date(order.createdAt).toLocaleString()}</small>
        </div>
        <span class="status-pill ${order.status === 'email' ? 'status-email' : order.status === 'processing' ? 'status-processing' : order.status === 'cancelled' ? 'status-cancelled' : 'status-delivered'}">${statusMap[order.status]}</span>
      </div>
      <div class="order-items">
        ${order.items.map(item => `<p>${item.name}<span>${formatPrice(item.price)}</span></p>`).join('')}
      </div>
      <div class="order-actions">
        <span><strong>Total:</strong> ${formatPrice(order.total)}</span>
        <button class="btn btn-secondary cancel-order-button" data-order-id="${order.id}">Cancel order</button>
      </div>
    </article>
  `).join('');

  userOrdersPanel.querySelectorAll('.cancel-order-button').forEach(button => {
    button.addEventListener('click', event => {
      const orderId = event.target.dataset.orderId;
      cancelOrder(orderId);
    });
  });
}

function cancelOrder(orderId) {
  orders = orders.filter(order => order.id !== orderId);
  localStorage.setItem(storageKey, JSON.stringify(orders));
  const email = loginEmailInput.value.trim().toLowerCase();
  renderUserOrders(email);
}

function showUserOrdersSection() {
  userOrdersSection.classList.remove('hidden');
}

customerLoginForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = loginEmailInput.value.trim().toLowerCase();
  if (!email) return;
  renderUserOrders(email);
  showUserOrdersSection();
});

window.addEventListener('DOMContentLoaded', () => {
  loadOrders();
});
