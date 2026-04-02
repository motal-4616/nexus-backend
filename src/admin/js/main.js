// ========== MAIN INIT ==========
document.addEventListener("DOMContentLoaded", () => {
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
