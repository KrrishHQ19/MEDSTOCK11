// --- SESSION & ROLE DATA ---
const sessionUser = JSON.parse(localStorage.getItem('medstock_user'));

// Guard: If no session, redirect to login
if (!sessionUser && window.location.pathname.includes('/inventory/')) {
    window.location.href = "/"; 
}

const currentUser = sessionUser || {};
const isAdmin = currentUser.role === 'admin';

// --- DOM ELEMENTS ---
const tableBody = document.getElementById("inventoryTableBody");
const loadingIndicator = document.getElementById("loadingIndicator");
const inventoryTable = document.getElementById("inventoryTable");
const searchInput = document.getElementById("searchInput");

let allLocalData = []; // Store the 50 test items here

/**
 * SEARCH LOGIC
 */
function handleSearch() {
    const term = searchInput.value.toLowerCase().trim();
    
    // If search is empty, show all data
    if (term === "") {
        renderTable(allLocalData);
        return;
    }

    const filtered = allLocalData.filter(item => {
        return (
            item.name.toLowerCase().includes(term) || 
            item.category.toLowerCase().includes(term) || 
            item.location.toLowerCase().includes(term)
        );
    });

    renderTable(filtered);
}

function daysUntilExpiry(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    today.setHours(0,0,0,0); expiry.setHours(0,0,0,0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

/**
 * TABLE RENDERING
 */
function renderItemRow(item) {
    const daysLeft = daysUntilExpiry(item.expiry);
    
    // Status Logic
    const stockStatus = Number(item.qty) < Number(item.reorder) ? 
        '<span class="pill pill-low">LOW</span>' : '<span class="pill pill-good">GOOD</span>';
    
    // Expiry Logic
    let expiryStatus = '<span class="pill pill-valid">VALID</span>';
    if (daysLeft < 0) expiryStatus = '<span class="pill pill-expired">EXPIRED</span>';
    else if (daysLeft <= 90) expiryStatus = '<span class="pill pill-low">EXPIRING</span>';

    const actionCell = isAdmin 
        ? `<button onclick="deleteItem('${item.id}')" style="background:none; border:none; cursor:pointer; font-size:18px;">🗑️</button>` 
        : `<span style="color:#999; font-size:11px; font-weight:600;">VIEW ONLY</span>`;

    return `
        <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.category}</td>
            <td>${item.location}</td>
            <td>${item.qty} / ${item.reorder} min</td> 
            <td>${stockStatus}</td>
            <td>${expiryStatus}</td>
            <td>${item.expiry}</td>
            <td>${item.reorder}</td>
            <td class="table-actions">${actionCell}</td>
        </tr>
    `;
}

function renderTable(items) {
    if (!tableBody) return;
    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">No items found.</td></tr>';
    } else {
        tableBody.innerHTML = items.map(renderItemRow).join('');
    }
}

async function fetchInventory() {
    try {
        const res = await fetch('/api/inventory');
        allLocalData = await res.json();
        
        // Hide loading and show table immediately
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (inventoryTable) inventoryTable.style.display = 'table';
        
        renderTable(allLocalData);
        updateSummaryCards(allLocalData);
    } catch (e) {
        console.error("Load error:", e);
    }
}
function updateSummaryCards(items) {
    // 1. Calculate the values
    const total = items.length;
    const lowStock = items.filter(i => Number(i.qty) < Number(i.reorder)).length;
    const expiring = items.filter(i => {
        const d = daysUntilExpiry(i.expiry);
        return d <= 90 && d >= 0;
    }).length;
    const categories = new Set(items.map(i => i.category)).size;

    // 2. Update the HTML using the CORRECT IDs from your index1.html
    if (document.getElementById('totalStockDisplay')) {
        document.getElementById('totalStockDisplay').textContent = total;
    }
    if (document.getElementById('lowStockDisplay')) {
        document.getElementById('lowStockDisplay').textContent = lowStock;
    }
    if (document.getElementById('expiringSoonDisplay')) {
        document.getElementById('expiringSoonDisplay').textContent = expiring;
    }
    if (document.getElementById('categoryDisplay')) {
        document.getElementById('categoryDisplay').textContent = categories;
    }
}

// --- INITIALIZE ---
if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
}

// Permissions Check
const addBtn = document.getElementById("addBtn");
if (addBtn && !isAdmin) addBtn.style.display = 'none';
// --- LOGOUT LOGIC ---
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.onclick = () => {
        console.log("Logging out..."); // Debugging check
        localStorage.removeItem('medstock_user'); // Clear the session
        window.location.href = "/"; // Redirect to login
    };
}

fetchInventory();