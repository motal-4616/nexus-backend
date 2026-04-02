// ========== USERS ==========
async function loadUsers() {
    const search = document.getElementById("userSearch").value.trim();
    const params = new URLSearchParams({ page: usersPage, limit: 15 });
    if (search) params.set("search", search);

    const tbody = document.getElementById("usersTableBody");
    tbody.innerHTML =
        '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải...</td></tr>';

    try {
        const data = await api("GET", "/admin/users?" + params);
        const { users, total, totalPages: pages } = data.data;

        if (users.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">Không tìm thấy người dùng nào</td></tr>';
        } else {
            tbody.innerHTML = users
                .map(
                    (u) => `
                <tr class="table-row border-b border-gray-50">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${u.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.name) + "&background=6366f1&color=fff"}"
                                class="w-9 h-9 rounded-xl object-cover" alt="">
                            <div>
                                <p class="font-medium text-gray-800">${escapeHtml(u.name)}</p>
                                <p class="text-xs text-gray-400">@${escapeHtml(u.username)}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">${escapeHtml(u.email)}</td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-medium px-2.5 py-1 rounded-full ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}">${u.role}</span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-medium px-2.5 py-1 rounded-full ${u.isBanned ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}">
                            ${u.isBanned ? "Bị cấm" : "Hoạt động"}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(u.createdAt)}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            ${
                                u.role !== "admin"
                                    ? `
                                ${
                                    u.isBanned
                                        ? `<button onclick="confirmAction('Mở khóa người dùng', 'Bạn muốn mở khóa tài khoản ${escapeAttr(u.name)}?', function(){ return unbanUser('${u._id}'); })"
                                        class="btn-action px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Mở khóa">
                                        <i class="fas fa-unlock"></i>
                                       </button>`
                                        : `<button onclick="confirmAction('Cấm người dùng', 'Bạn muốn cấm tài khoản ${escapeAttr(u.name)}?', function(){ return banUser('${u._id}'); })"
                                        class="btn-action px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100" title="Cấm">
                                        <i class="fas fa-ban"></i>
                                       </button>`
                                }
                                <button onclick="confirmAction('Xóa người dùng', 'Bạn muốn xóa vĩnh viễn tài khoản ${escapeAttr(u.name)}? Hành động này không thể hoàn tác.', function(){ return deleteUser('${u._id}'); })"
                                    class="btn-action px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Xóa">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `
                                    : '<span class="text-xs text-gray-400">Admin</span>'
                            }
                        </div>
                    </td>
                </tr>
            `,
                )
                .join("");
        }

        renderPagination("usersPagination", usersPage, pages, total, (p) => {
            usersPage = p;
            loadUsers();
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-red-400">${escapeHtml(err.message)}</td></tr>`;
    }
}

async function banUser(id) {
    console.log("[DEBUG] banUser called, id:", id, "token:", token ? token.substring(0, 20) + "..." : "EMPTY");
    try {
        const result = await api("PATCH", `/admin/users/${id}/ban`);
        console.log("[DEBUG] banUser success:", result);
        showToast("Đã cấm người dùng", "bg-orange-500");
        loadUsers();
    } catch (err) {
        console.error("[DEBUG] banUser error:", err);
        showToast("Lỗi: " + err.message, "bg-red-500");
    }
}

async function unbanUser(id) {
    console.log("[DEBUG] unbanUser called, id:", id);
    try {
        const result = await api("PATCH", `/admin/users/${id}/unban`);
        console.log("[DEBUG] unbanUser success:", result);
        showToast("Đã mở khóa người dùng", "bg-green-500");
        loadUsers();
    } catch (err) {
        console.error("[DEBUG] unbanUser error:", err);
        showToast("Lỗi: " + err.message, "bg-red-500");
    }
}

async function deleteUser(id) {
    console.log("[DEBUG] deleteUser called, id:", id);
    try {
        const result = await api("DELETE", `/admin/users/${id}`);
        console.log("[DEBUG] deleteUser success:", result);
        showToast("Đã xóa người dùng", "bg-red-500");
        loadUsers();
    } catch (err) {
        console.error("[DEBUG] deleteUser error:", err);
        showToast("Lỗi: " + err.message, "bg-red-500");
    }
}
