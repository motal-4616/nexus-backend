// ========== VIEW LOADER ==========
async function loadViews() {
    const app = document.getElementById("app");

    // Fetch all top-level views in parallel
    const topNames = ["login", "admin-panel", "modals"];
    const topHTMLs = await Promise.all(
        topNames.map((name) => fetch(`/admin/views/${name}.html`).then((r) => r.text()))
    );
    // Inject all at once — browser renders final state, no intermediate flash
    app.innerHTML = topHTMLs.join("");

    // Fetch all tab views in parallel
    const tabNames = ["tab-dashboard", "tab-users", "tab-posts", "tab-reports"];
    const tabHTMLs = await Promise.all(
        tabNames.map((name) => fetch(`/admin/views/${name}.html`).then((r) => r.text()))
    );
    document.getElementById("mainContent").innerHTML = tabHTMLs.join("");
}

// ========== MAIN INIT ==========
document.addEventListener("DOMContentLoaded", async () => {
    await loadViews();

    const refreshToken = localStorage.getItem("admin_refresh_token");

    // Show correct screen before revealing UI (prevents any flash)
    if (token || refreshToken) {
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("adminPanel").classList.remove("hidden");
    }

    // Reveal UI only after correct screen is set — zero flash
    document.getElementById("app").style.visibility = "";

    if (token || refreshToken) {
        const savedTab = localStorage.getItem("admin_tab") || "dashboard";
        switchTab(savedTab);
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
