const storageKey = 'gsugarOrders';
const adminAccessCode = 'gsugar-admin';
const statusMap = {
  email: 'Email with details sent [check inbox]',
  processing: 'Processing',
  delivered: 'Delivered',
  cancelled: 'Cancelled [check details in email]'
};

let orders = [];

const adminLoginForm = document.getElementById('adminLoginForm');
const adminAccessCodeInput = document.getElementById('adminAccessCode');
const adminLoginSection = document.getElementById('adminLoginSection');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminOrdersSection = document.getElementById('adminOrdersSection');
const adminOrdersList = document.getElementById('adminOrdersList');
const pickupSlotInput = document.getElementById('pickupSlot');
const pickupLocationInput = document.getElementById('pickupLocation');
const savePickupSettingsBtn = document.getElementById('savePickupSettings');
const adminPickupStorageKey = 'gsugarAdminPickup';

function loadOrders() {
  const saved = localStorage.getItem(storageKey);
  orders = saved ? JSON.parse(saved) : [];
  purgeExpiredDelivered();
}

function saveOrders() {
  localStorage.setItem(storageKey, JSON.stringify(orders));
}

function loadAdminPickupSettings() {
  const saved = localStorage.getItem(adminPickupStorageKey);
  if (!saved) return;
  try {
    const settings = JSON.parse(saved);
    pickupSlotInput.value = settings.slot || '';
    pickupLocationInput.value = settings.location || '';
  } catch (error) {
    console.warn('Could not load admin pickup settings', error);
  }
}

function saveAdminPickupSettings() {
  const settings = {
    slot: pickupSlotInput.value.trim(),
    location: pickupLocationInput.value.trim()
  };
  localStorage.setItem(adminPickupStorageKey, JSON.stringify(settings));
}

function updateOpenDrafts() {
  document.querySelectorAll('.admin-email-draft textarea').forEach(textarea => {
    const orderId = textarea.closest('.admin-email-draft').id.replace('emailDraft-', '');
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    textarea.textContent = getOrderEmailDraft(order);
  });
}

function purgeExpiredDelivered() {
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
    saveOrders();
  }
}

function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

function getOrderEmailDraft(order) {
  const pickupSlot = pickupSlotInput.value.trim() || 'Pickup date/time not set';
  const pickupLocation = pickupLocationInput.value.trim() || 'Location not set';
  const orderCode = order.id.slice(-6);
  const itemsSummary = order.items
    .map(item => `${item.name.padEnd(25)}${formatPrice(item.price)}`)
    .join('\n');

  return `Hello, ${order.customerEmail}

You recently ordered some products from GSugar;

${itemsSummary}

Total               ${formatPrice(order.total)}

Order code: ${orderCode}

Collect your sweets and bring total owed in cash at

${pickupSlot}

Location:

${pickupLocation}

Regards,
The GSugar Team`;
}

function renderAdminOrders() {
  const visibleOrders = orders.filter(order => order.status !== 'delivered' || (order.deliveredAt && Date.now() - order.deliveredAt < 3 * 24 * 60 * 60 * 1000));
  if (!visibleOrders.length) {
    adminOrdersList.innerHTML = '<p class="empty-note">No active orders yet. Customers will appear here after checkout.</p>';
    return;
  }

  adminOrdersList.innerHTML = visibleOrders.map(order => {
    const draft = getOrderEmailDraft(order);
    return `
    <article class="admin-card">
      <div class="admin-card-head">
        <div>
          <strong>${order.customerName}</strong>
          <small>${order.customerEmail}</small>
        </div>
        <span class="status-pill ${order.status === 'email' ? 'status-email' : order.status === 'processing' ? 'status-processing' : 'status-delivered'}">${statusMap[order.status]}</span>
      </div>
      <div class="admin-items">
        ${order.items.map(item => `<p>${item.name}<span>${formatPrice(item.price)}</span></p>`).join('')}
      </div>
      <div class="admin-actions">
        <select data-order-id="${order.id}">
          <option value="email" ${order.status === 'email' ? 'selected' : ''}>Email with details sent</option>
          <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled [check details in email]</option>
        </select>
        <button class="btn btn-secondary" data-email-draft="${order.id}">Show email draft</button>
        <button class="btn btn-secondary" data-copy-email="${order.id}">Copy email</button>
        <button class="btn btn-outline" data-email="${order.customerEmail}" data-order-id="${order.id}">Send mailto</button>
        <span><strong>Total:</strong> ${formatPrice(order.total)}</span>
      </div>
      <div class="admin-email-draft hidden" id="emailDraft-${order.id}">
        <label>Email preview</label>
        <textarea readonly>${draft}</textarea>
      </div>
    </article>
  `;
  }).join('');

  adminOrdersList.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', event => {
      const orderId = event.target.dataset.orderId;
      const order = orders.find(item => item.id === orderId);
      if (!order) return;
      order.status = event.target.value;
      order.deliveredAt = order.status === 'delivered' ? Date.now() : null;
      order.cancelledAt = order.status === 'cancelled' ? Date.now() : null;
      if (order.status !== 'delivered') order.deliveredAt = null;
      if (order.status !== 'cancelled') order.cancelledAt = null;
      saveOrders();
      renderAdminOrders();
    });
  });

  adminOrdersList.querySelectorAll('button[data-email-draft]').forEach(button => {
    button.addEventListener('click', event => {
      const orderId = event.target.dataset.emailDraft;
      const draftSection = document.getElementById(`emailDraft-${orderId}`);
      if (!draftSection) return;
      draftSection.classList.toggle('hidden');
    });
  });

  adminOrdersList.querySelectorAll('button[data-copy-email]').forEach(button => {
    button.addEventListener('click', event => {
      const orderId = event.target.dataset.copyEmail;
      const draftTextarea = document.querySelector(`#emailDraft-${orderId} textarea`);
      if (!draftTextarea) return;
      draftTextarea.select();
      document.execCommand('copy');
      alert('Order email copied to clipboard.');
    });
  });

  adminOrdersList.querySelectorAll('button[data-email]').forEach(button => {
    button.addEventListener('click', event => {
      const orderId = event.target.dataset.orderId;
      const order = orders.find(item => item.id === orderId);
      if (!order) return;
      const body = encodeURIComponent(getOrderEmailDraft(order));
      const targetEmail = event.target.dataset.email;
      window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent('Gsugar Order Update')}&body=${body}`;
    });
  });
}

function showAdminSection() {
  adminOrdersSection.classList.remove('hidden');
}

savePickupSettingsBtn.addEventListener('click', () => {
  saveAdminPickupSettings();
  updateOpenDrafts();
  alert('Pickup details saved. Email drafts have been updated.');
});

adminLoginForm.addEventListener('submit', event => {
  event.preventDefault();
  const value = adminAccessCodeInput.value.trim();
  if (value !== adminAccessCode) {
    alert('Invalid access code.');
    return;
  }
  adminLoginSection.classList.add('hidden');
  adminLogoutBtn.classList.remove('hidden');
  renderAdminOrders();
  showAdminSection();
  adminAccessCodeInput.value = '';
});

adminLogoutBtn.addEventListener('click', () => {
  adminLoginSection.classList.remove('hidden');
  adminLogoutBtn.classList.add('hidden');
  adminOrdersSection.classList.add('hidden');
  adminLoginForm.reset();
});

window.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  loadAdminPickupSettings();
});
