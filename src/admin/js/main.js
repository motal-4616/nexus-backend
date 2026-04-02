// ========== VIEW LOADER ==========
async function loadViews() {
    const app = document.getElementById("app");

    // Load top-level views: login screen, admin panel shell, modals
    for (const name of ["login", "admin-panel", "modals"]) {
        const res = await fetch(`/admin/views/${name}.html`);
        const html = await res.text();
        app.insertAdjacentHTML("beforeend", html);
    }

    // Load tab views into the main content area
    const mainContent = document.getElementById("mainContent");
    for (const name of ["tab-dashboard", "tab-users", "tab-posts", "tab-reports"]) {
        const res = await fetch(`/admin/views/${name}.html`);
        const html = await res.text();
        mainContent.insertAdjacentHTML("beforeend", html);
    }
}

// ========== MAIN INIT ==========
document.addEventListener("DOMContentLoaded", async () => {
    await loadViews();

    const refreshToken = localStorage.getItem("admin_refresh_token");

    // Show admin panel immediately if we have any credentials
    if (token || refreshToken) {
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("adminPanel").classList.remove("hidden");
        loadDashboard();
        verifyAdmin(); // silent background check
    }

    // Login form — Enter key support
    document.getElementById("loginEmail").addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleLogin();
    });
    document.getElementById("loginPassword").addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleLogin();
    });

    // Debounced user search
    let userSearchTimer = null;
    document.getElementById("userSearch").addEventListener("input", () => {
        clearTimeout(userSearchTimer);
        userSearchTimer = setTimeout(() => {
            usersPage = 1;
            loadUsers();
        }, 400);
    });

    // Debounced post search
    let postSearchTimer = null;
    document.getElementById("postSearch").addEventListener("input", () => {
        clearTimeout(postSearchTimer);
        postSearchTimer = setTimeout(() => {
            postsPage = 1;
            loadPosts();
        }, 400);
    });

    // Reports filter
    document.getElementById("reportFilter").addEventListener("change", () => {
        reportsPage = 1;
        loadReports();
    });

    // Close confirm modal on backdrop click
    document.getElementById("confirmModal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("confirmModal")) {
            closeModal();
        }
    });
});
