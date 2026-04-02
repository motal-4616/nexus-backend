// ========== TAB SWITCH ==========
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".tab-content").forEach((el) => el.classList.add("hidden"));
    document.querySelectorAll(".sidebar-link").forEach((el) => {
        el.classList.remove("tab-active");
        el.classList.add("text-gray-600");
    });

    document.getElementById("tab-" + tab).classList.remove("hidden");
    document.getElementById("nav-" + tab).classList.add("tab-active");
    document.getElementById("nav-" + tab).classList.remove("text-gray-600");

    if (tab === "dashboard") loadDashboard();
    else if (tab === "users") loadUsers();
    else if (tab === "posts") loadPosts();
    else if (tab === "reports") loadReports();
}

// ========== PAGINATION ==========
function renderPagination(containerId, currentPage, totalPages, total, onPageChange) {
    const container = document.getElementById(containerId);
    if (totalPages <= 1) {
        container.innerHTML = `<p class="text-sm text-gray-500">Tổng: ${total}</p>`;
        return;
    }

    let pages = "";
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) pages += `<button class="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100" data-page="1">1</button>`;
    if (start > 2) pages += '<span class="text-gray-400 px-1">...</span>';

    for (let i = start; i <= end; i++) {
        pages += `<button class="px-3 py-1.5 text-sm rounded-lg ${i === currentPage ? "bg-primary-500 text-white" : "hover:bg-gray-100 text-gray-600"}" data-page="${i}">${i}</button>`;
    }

    if (end < totalPages - 1) pages += '<span class="text-gray-400 px-1">...</span>';
    if (end < totalPages) pages += `<button class="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 text-gray-600" data-page="${totalPages}">${totalPages}</button>`;

    container.innerHTML = `
        <p class="text-sm text-gray-500">Tổng: ${total}</p>
        <div class="flex items-center gap-1">${pages}</div>
    `;

    container.querySelectorAll("button[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => onPageChange(parseInt(btn.dataset.page)));
    });
}

// ========== MODAL ==========
let _modalCallback = null;

function confirmAction(title, message, callback) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalMessage").textContent = message;
    _modalCallback = callback;
    document.getElementById("confirmModal").classList.remove("hidden");
    document.getElementById("modalConfirmBtn").onclick = async () => {
        const cb = _modalCallback;
        closeModal();
        if (cb) await cb();
    };
}

function closeModal() {
    document.getElementById("confirmModal").classList.add("hidden");
    _modalCallback = null;
}

// ========== TOAST ==========
function showToast(message, bg = "bg-primary-500") {
    const toast = document.getElementById("toast");
    toast.className = `fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium fade-in ${bg}`;
    toast.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

// ========== UTILITIES ==========
function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    if (!str) return "";
    return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
