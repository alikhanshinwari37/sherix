const API_BASE_URL = "http://127.0.0.1:5000/api";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");

let editingProductId = null;
let allProducts = [];

// ======================================
// PASSWORD VISIBILITY
// ======================================
if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    togglePassword.textContent = showPassword ? "HIDE" : "SHOW";
    togglePassword.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
  });
}

// ======================================
// SELLER LOGIN
// ======================================
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    loginMessage.textContent = "";
    loginButton.disabled = true;
    loginButton.querySelector("span").textContent = "AUTHENTICATING...";
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Login failed.");
      loginMessage.style.color = "#62d69b";
      loginMessage.textContent = "Login successful. Opening Seller Studio...";
      window.location.href = "dashboard.html";
    } catch (error) {
      loginMessage.style.color = "#e33c56";
      loginMessage.textContent = error.message === "Failed to fetch" ? "Cannot connect to server. Please try again." : error.message;
    } finally {
      loginButton.disabled = false;
      loginButton.querySelector("span").textContent = "ACCESS SELLER STUDIO";
    }
  });
}

// ======================================
// DASHBOARD SESSION VERIFICATION
// ======================================
const sellerStudio = document.getElementById("sellerStudio");

async function verifySellerSession() {
  if (!sellerStudio) return;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, { method: "GET", credentials: "include" });
    if (!response.ok) { window.location.replace("index.html"); return; }
    const data = await response.json();
    if (!data.success || !data.authenticated) { window.location.replace("index.html"); return; }
    const sellerName = data.admin.name || "Seller";
    const firstLetter = sellerName.charAt(0).toUpperCase();
    const sellerNameElement = document.querySelector(".seller-mini-profile strong");
    const sellerAvatar = document.querySelector(".seller-avatar");
    const headerAvatar = document.querySelector(".header-avatar");
    if (sellerNameElement) sellerNameElement.textContent = sellerName;
    if (sellerAvatar) sellerAvatar.textContent = firstLetter;
    if (headerAvatar) headerAvatar.textContent = firstLetter;
    loadDashboardProducts();
  } catch (error) {
    console.error("Session verification error:", error);
    window.location.replace("index.html");
  }
}
verifySellerSession();

// ======================================
// DASHBOARD NAVIGATION
// ======================================
if (sellerStudio) {
  const navButtons = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".studio-section");
  function openSection(sectionId) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection || !targetSection.classList.contains("studio-section")) return;
    sections.forEach(section => section.classList.remove("active"));
    navButtons.forEach(button => button.classList.remove("active"));
    targetSection.classList.add("active");
    const matchingButton = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (matchingButton) matchingButton.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  navButtons.forEach(button => button.addEventListener("click", () => openSection(button.dataset.section)));
  document.querySelectorAll("[data-section]").forEach(button => {
    if (button.classList.contains("nav-item")) return;
    button.addEventListener("click", () => openSection(button.dataset.section));
  });
}

// ======================================
// SELLER LOGOUT
// ======================================
const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";
    try { await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" }); }
    catch (error) { console.error("Logout request error:", error); }
    finally { window.location.replace("index.html"); }
  });
}

/* =====================================================
   SHERIX — ADD / EDIT PRODUCT MODAL & IMAGE PREVIEW + SAVE
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const addProductButton = document.getElementById("addProductButton");
  const productModal = document.getElementById("productModal");
  const productForm = document.getElementById("productForm");
  const productImages = document.getElementById("productImages");
  const imagePreview = document.getElementById("imagePreview");
  const productFormMessage = document.getElementById("productFormMessage");

  if (!addProductButton || !productModal) return;

  let previewUrls = [];

  function openProductModal() {
    productModal.classList.add("is-open");
    productModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeProductModal() {
    productModal.classList.remove("is-open");
    productModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    // Reset edit mode on close
    editingProductId = null;
    const title = document.getElementById("productModalTitle");
    if (title) title.innerHTML = 'Add New <span>Watch</span>';
    if (productImages) productImages.setAttribute("required", "");
  }
  function clearImagePreviews() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
    if (imagePreview) imagePreview.replaceChildren();
  }

  // ADD NEW - Reset form + clear edit mode
  addProductButton.addEventListener("click", () => {
    editingProductId = null;
    if (productForm) productForm.reset();
    clearImagePreviews();
    const title = document.getElementById("productModalTitle");
    if (title) title.innerHTML = 'Add New <span>Watch</span>';
    if (productImages) productImages.setAttribute("required", "");
    if (productFormMessage) productFormMessage.textContent = "";
    openProductModal();
  });

  productModal.querySelectorAll("[data-close-product-modal]").forEach(button => {
    button.addEventListener("click", closeProductModal);
  });
  productModal.addEventListener("click", event => {
    if (event.target.classList.contains("product-modal-backdrop")) closeProductModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && productModal.classList.contains("is-open")) closeProductModal();
  });

  if (productImages && imagePreview) {
    productImages.addEventListener("change", () => {
      clearImagePreviews();
      const files = Array.from(productImages.files || []);
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxSize = 5 * 1024 * 1024;
      if (files.length > 5) {
        productImages.value = "";
        if (productFormMessage) productFormMessage.textContent = "Maximum 5 images allowed.";
        return;
      }
      const invalidFile = files.find(file => !allowedTypes.includes(file.type) || file.size > maxSize);
      if (invalidFile) {
        productImages.value = "";
        if (productFormMessage) productFormMessage.textContent = "Use JPG, PNG or WEBP images. Each image must be 5MB or less.";
        return;
      }
      if (productFormMessage) productFormMessage.textContent = "";
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        previewUrls.push(url);
        const image = document.createElement("img");
        image.src = url;
        image.alt = "Selected product image preview";
        imagePreview.appendChild(image);
      });
    });
  }

  if (productForm) {
    productForm.addEventListener("reset", clearImagePreviews);
  }

  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const saveBtn = productForm.querySelector('button[type="submit"]');
      if (productFormMessage) {
        productFormMessage.style.color = "#fff";
        productFormMessage.textContent = editingProductId ? "Updating product..." : "Saving product...";
      }
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "SAVING..."; }
      try {
        const formData = new FormData(productForm);
        formData.delete("productImages");
        formData.delete("images");
        const files = productImages ? Array.from(productImages.files) : [];
        files.forEach(file => formData.append("images", file));

        // EDIT = PUT, ADD = POST
        const url = editingProductId ? `${API_BASE_URL}/products/${editingProductId}` : `${API_BASE_URL}/products`;
        const method = editingProductId ? "PUT" : "POST";

        const res = await fetch(url, {
          method: method,
          credentials: "include",
          body: formData
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to save product");

        if (productFormMessage) {
          productFormMessage.style.color = "#62d69b";
          productFormMessage.textContent = editingProductId ? "Product updated successfully! ✅" : "Product saved successfully! ✅";
        }
        loadDashboardProducts();

        setTimeout(() => {
          productForm.reset();
          clearImagePreviews();
          closeProductModal();
          if (productFormMessage) productFormMessage.textContent = "";
          editingProductId = null;
        }, 1000);
      } catch (err) {
        console.error(err);
        if (productFormMessage) {
          productFormMessage.style.color = "#e33c56";
          productFormMessage.textContent = err.message === "Failed to fetch" ? "Cannot connect to server. Backend chal raha hai?" : err.message;
        }
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "SAVE PRODUCT"; }
      }
    });
  }
});

// ======================================
// LOAD PRODUCTS (OVERVIEW + PRODUCTS + INVENTORY)
// ======================================
async function loadDashboardProducts() {
  if (!document.getElementById("sellerStudio")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/products`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;
    allProducts = data.products || [];

    const totalEl = document.getElementById("totalProducts");
    if (totalEl) totalEl.textContent = allProducts.length;
    const activeEl = document.getElementById("activeProducts");
    if (activeEl) activeEl.textContent = allProducts.filter(p => p.status === "active").length;

    renderProducts(allProducts);

    const inv = document.getElementById("inventoryContainer");
    if (inv) {
      if (allProducts.length === 0) {
        inv.innerHTML = `<div class="empty-state"><div class="empty-icon">▦</div><h3>Inventory Management</h3><p>Stock levels and availability will appear here.</p></div>`;
      } else {
        inv.innerHTML = allProducts.map(p => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:14px; border-bottom:1px solid #222;">
            <span><strong>${p.brand} ${p.model}</strong><br><small>${p.specifications?.name || ''}</small></span>
            <span>Stock: <strong>${p.stock_quantity}</strong> | ${p.status}</span>
          </div>`).join("");
      }
    }
  } catch (err) { console.error("Load products error:", err); }
}

function renderProducts(products) {
  const container = document.getElementById("productsContainer");
  if (!container) return;
  if (products.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⌚</div><h3>Your collection starts here</h3><p>Add your first luxury watch to SHERIX.</p></div>`;
    return;
  }
  container.innerHTML = products.map(p => {
    const spec = p.specifications || {};
    const name = spec.name || `${p.brand} ${p.model}`;
    const isActive = p.status === 'active';
    return `
    <div style="display:flex; gap:16px; align-items:center; padding:16px; border:1px solid #222; border-radius:12px; margin-bottom:12px; background:#111;">
      <img src="${p.image_url || ''}" style="width:80px; height:80px; object-fit:cover; border-radius:10px;" alt="">
      <div style="flex:1;">
        <strong style="font-size:16px;">${name}</strong><br>
        <small>${p.brand} • ${p.model} • ${spec.category || ''}</small><br>
        <small>SKU: ${spec.sku || '-'}</small>
      </div>
      <div style="text-align:right;">
        <strong>Rs ${Number(p.price).toLocaleString()}</strong><br>
        <small>Stock: ${p.stock_quantity}</small><br>
        <span style="font-size:12px; padding:4px 8px; border-radius:20px; background:${isActive ? '#1a3a2a' : '#333'}; color:#fff;">${p.status}</span><br><br>
        <div style="display:flex; gap:6px; justify-content:flex-end; flex-wrap:wrap;">
          <button onclick="editProduct('${p.id}')" style="padding:7px 12px; border-radius:20px; border:1px solid #c9a24b; background:#241c08; color:#fff; cursor:pointer; font-weight:700; font-size:12px;">✏️ EDIT</button>
          <button onclick="toggleProductStatus('${p.id}', '${p.status}')" style="padding:7px 12px; border-radius:20px; border:1px solid ${isActive ? '#e33c56' : '#62d69b'}; background:${isActive ? '#2a1215' : '#12351f'}; color:#fff; cursor:pointer; font-weight:700; font-size:12px;">${isActive ? '🙈 HIDE' : '👁️ SHOW'}</button>
          <button onclick="deleteProduct('${p.id}')" style="padding:7px 12px; border-radius:20px; border:1px solid #e33c56; background:#2a1215; color:#fff; cursor:pointer; font-weight:700; font-size:12px;">🗑️ DELETE</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

// SHOW / HIDE
async function toggleProductStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'hidden' : 'active';
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed');
    loadDashboardProducts();
  } catch (err) {
    alert('Failed: ' + err.message);
  }
}

// DELETE
async function deleteProduct(id) {
  if (!confirm('Are you sure? This watch will be permanently deleted!')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed');
    alert('Deleted!');
    loadDashboardProducts();
  } catch (err) {
    alert('Failed: ' + err.message);
  }
}

// EDIT - Fill form with old data
function editProduct(id) {
  const p = allProducts.find(x => String(x.id) === String(id));
  if (!p) return;
  const spec = p.specifications || {};
  editingProductId = id;

  const form = document.getElementById("productForm");
  if (!form) return;

  // Helper - fill by name OR id
  const setVal = (names, value) => {
    for (const n of names) {
      const el = form.querySelector(`[name="${n}"]`) || document.getElementById(n);
      if (el) { el.value = value ?? ""; return; }
    }
  };

  setVal(["name", "productName"], spec.name || `${p.brand} ${p.model}`);
  setVal(["brand", "productBrand"], p.brand);
  setVal(["model", "productModel"], p.model);
  setVal(["category", "productCategory"], spec.category);
  setVal(["description", "productDescription"], p.description);
  setVal(["price", "productPrice"], p.price);
  setVal(["originalPrice", "productOriginalPrice"], spec.originalPrice);
  setVal(["deliveryCharge", "productDelivery"], p.delivery_charge);
  setVal(["stock", "productStock"], p.stock_quantity);
  setVal(["sku", "productSKU"], spec.sku);
  setVal(["movement", "productMovement"], spec.movement);
  setVal(["strapMaterial", "productStrap"], spec.strapMaterial);
  setVal(["caseMaterial", "productCase"], spec.caseMaterial);
  setVal(["dialColor", "productDial"], spec.dialColor);
  setVal(["waterResistance", "productWater"], spec.waterResistance);
  setVal(["warranty", "productWarranty"], spec.warranty);
  setVal(["status", "productStatus"], p.status === "active" ? "active" : "draft");

  const title = document.getElementById("productModalTitle");
  if (title) title.innerHTML = 'Edit <span>Watch</span>';

  // Image not required on edit - old image stays if you don't upload new
  const imgInput = document.getElementById("productImages");
  if (imgInput) imgInput.removeAttribute("required");

  const modal = document.getElementById("productModal");
  if (modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

// Search + Filter
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("productSearch")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    renderProducts(allProducts.filter(p => `${p.brand} ${p.model} ${p.specifications?.name || ''}`.toLowerCase().includes(q)));
  });
  document.getElementById("productFilter")?.addEventListener("change", (e) => {
    const v = e.target.value;
    renderProducts(v === "all" ? allProducts : allProducts.filter(p => p.status === v));
  });
});