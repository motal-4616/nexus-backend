// ========== AUTH ==========
async function handleLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorEl = document.getElementById("loginError");
    const btn = document.getElementById("loginBtn");

    if (!email || !password) {
        errorEl.textContent = "Vui lòng nhập email và mật khẩu";
        errorEl.classList.remove("hidden");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang đăng nhập...';
    errorEl.classList.add("hidden");

    try {
        const data = await api("POST", "/auth/login", { email, password });
        if (data.data.user.role !== "admin") {
            throw new Error("Tài khoản không có quyền admin");
        }
        token = data.data.accessToken;
        localStorage.setItem("admin_token", token);
        localStorage.setItem("admin_refresh_token", data.data.refreshToken);
        document.getElementById("adminName").textContent = data.data.user.name;
        showAdminPanel();
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Đăng nhập";
    }
}

async function verifyAdmin() {
    try {
        const data = await api("GET", "/users/me");
        if (data.data.role !== "admin") {
            // Not admin role — logout
            handleLogout();
            return;
        }
        document.getElementById("adminName").textContent = data.data.name;
    } catch {
        // api() already called handleLogout() for 401/403
        // For other errors (network etc.) stay on page silently
    }
}

function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_refresh_token");
    token = "";
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
}

function showAdminPanel() {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    loadDashboard();
}
