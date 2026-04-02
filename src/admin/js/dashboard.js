// ========== DASHBOARD ==========
async function loadDashboard() {
    try {
        const data = await api("GET", "/admin/dashboard");
        const s = data.data;
        document.getElementById("statUsers").textContent = s.totalUsers.toLocaleString();
        document.getElementById("statPosts").textContent = s.totalPosts.toLocaleString();
        document.getElementById("statPending").textContent = s.pendingReports.toLocaleString();
        document.getElementById("statBanned").textContent = s.bannedUsers.toLocaleString();

        const badge = document.getElementById("reportBadge");
        if (s.pendingReports > 0) {
            badge.textContent = s.pendingReports;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    } catch (err) {
        console.error("Dashboard stats error:", err.message);
    }

    // Recent reports
    try {
        const reportsData = await api("GET", "/admin/reports?limit=5&status=pending");
        const container = document.getElementById("recentReports");
        if (reportsData.data.reports.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Không có báo cáo nào</p>';
        } else {
            container.innerHTML = reportsData.data.reports.map((r) => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-flag text-orange-500 text-xs"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-700">${escapeHtml(r.reporter?.name || "Unknown")}</p>
                            <p class="text-xs text-gray-400">${escapeHtml((r.reason || "").substring(0, 50))}</p>
                        </div>
                    </div>
                    <span class="text-xs text-gray-400">${formatDate(r.createdAt)}</span>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error("Recent reports error:", err.message);
    }

    // Recent users
    try {
        const usersData = await api("GET", "/admin/users?limit=5");
        const container = document.getElementById("recentUsers");
        if (usersData.data.users.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Chưa có người dùng nào</p>';
        } else {
            container.innerHTML = usersData.data.users.map((u) => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div class="flex items-center gap-3">
                        <img src="${u.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.name) + "&background=6366f1&color=fff"}"
                            class="w-8 h-8 rounded-lg object-cover" alt="">
                        <div>
                            <p class="text-sm font-medium text-gray-700">${escapeHtml(u.name)}</p>
                            <p class="text-xs text-gray-400">@${escapeHtml(u.username)}</p>
                        </div>
                    </div>
                    <span class="text-xs text-gray-400">${formatDate(u.createdAt)}</span>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error("Recent users error:", err.message);
    }
}
