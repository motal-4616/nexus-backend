// ========== GLOBAL STATE ==========
const API_BASE = window.location.origin + "/api/v1";
let token = localStorage.getItem("admin_token") || "";
let currentTab = "dashboard";
let usersPage = 1, postsPage = 1, reportsPage = 1;
let searchTimeout = null;

// ========== TOKEN REFRESH ==========
let _refreshPromise = null;

async function refreshAdminToken() {
    if (_refreshPromise) return _refreshPromise;

    const rt = localStorage.getItem("admin_refresh_token");
    if (!rt) return false;

    _refreshPromise = (async () => {
        try {
            const res = await fetch(API_BASE + "/auth/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: rt }),
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (data.data?.accessToken) {
                token = data.data.accessToken;
                localStorage.setItem("admin_token", token);
                if (data.data?.refreshToken) {
                    localStorage.setItem("admin_refresh_token", data.data.refreshToken);
                }
                return true;
            }
        } catch {}
        return false;
    })();

    try {
        return await _refreshPromise;
    } finally {
        _refreshPromise = null;
    }
}

// ========== API HELPER ==========
async function api(method, path, body = null) {
    const makeOpts = () => {
        const opts = { method, headers: { "Content-Type": "application/json" } };
        if (token) opts.headers["Authorization"] = "Bearer " + token;
        if (body) opts.body = JSON.stringify(body);
        return opts;
    };

    let res = await fetch(API_BASE + path, makeOpts());

    // On 401, try to refresh access token once, then retry
    if (res.status === 401 && path !== "/auth/login" && path !== "/auth/refresh") {
        const refreshed = await refreshAdminToken();
        if (refreshed) {
            res = await fetch(API_BASE + path, makeOpts());
        }
    }

    const data = await res.json();

    // DEBUG: log every API call result
    console.log(`[API] ${method} ${path} → ${res.status}`, data);

    if (res.status === 401 && path !== "/auth/login") {
        handleLogout();
        throw new Error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    }
    if (res.status === 403 && path !== "/auth/login") {
        handleLogout();
        throw new Error("Không có quyền truy cập");
    }
    if (!res.ok) throw new Error(data.message || "Yêu cầu thất bại");
    return data;
}
