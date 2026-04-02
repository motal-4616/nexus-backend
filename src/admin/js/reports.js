// ========== REPORTS ==========
async function loadReports() {
    const status = document.getElementById("reportFilter").value;
    const params = new URLSearchParams({ page: reportsPage, limit: 15 });
    if (status) params.set("status", status);

    const tbody = document.getElementById("reportsTableBody");
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải...</td></tr>';

    try {
        const data = await api("GET", "/admin/reports?" + params);
        const { reports, total, totalPages: pages } = data.data;

        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-gray-400">Không có báo cáo nào</td></tr>';
        } else {
            tbody.innerHTML = reports.map((r) => {
                const typeBadge = r.targetType === "post"
                    ? '<span class="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600"><i class="fas fa-newspaper mr-1"></i>Bài viết</span>'
                    : r.targetType === "comment"
                        ? '<span class="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700"><i class="fas fa-comment mr-1"></i>Bình luận</span>'
                        : '<span class="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-600"><i class="fas fa-user mr-1"></i>Người dùng</span>';

                const targetContent = r.targetType === "post"
                    ? escapeHtml((r.targetPost?.content || "Đã xóa").substring(0, 50))
                    : r.targetType === "comment"
                        ? escapeHtml((r.targetComment?.content || "Đã xóa").substring(0, 50))
                        : escapeHtml(r.targetUser?.name || "Đã xóa");

                const statusBadge = r.status === "pending"
                    ? '<span class="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">Chờ xử lý</span>'
                    : r.status === "resolved"
                        ? '<span class="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">Đã giải quyết</span>'
                        : '<span class="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">Đã bỏ qua</span>';

                const aiBadge = r.autoFlagged
                    ? '<span class="text-xs font-medium px-2 py-1 rounded-full bg-violet-100 text-violet-700"><i class="fas fa-robot mr-1"></i>AI</span>'
                    : "";

                const deletePostBtn = r.targetType === "post" && r.targetPost
                    ? `<button onclick="confirmAction('Xóa bài viết vi phạm', 'Xóa bài viết bị báo cáo và đánh dấu đã giải quyết?', function(){ return deleteReportedPost('${r._id}'); })"
                        class="btn-action px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Xóa bài viết">
                        <i class="fas fa-trash"></i>
                    </button>`
                    : "";

                const actions = r.status === "pending"
                    ? `<div class="flex items-center justify-end gap-2">
                        <button onclick="confirmAction('Giải quyết báo cáo', 'Đánh dấu báo cáo này đã được giải quyết?', function(){ return resolveReport('${r._id}'); })"
                            class="btn-action px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Giải quyết">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="confirmAction('Bỏ qua báo cáo', 'Bạn muốn bỏ qua báo cáo này?', function(){ return dismissReport('${r._id}'); })"
                            class="btn-action px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100" title="Bỏ qua">
                            <i class="fas fa-times"></i>
                        </button>
                        ${deletePostBtn}
                    </div>`
                    : '<span class="text-xs text-gray-400">Đã xử lý</span>';

                return `
                <tr class="table-row border-b border-gray-50">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${r.reporter?.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(r.reporter?.name || "U") + "&background=6366f1&color=fff"}"
                                class="w-8 h-8 rounded-lg object-cover" alt="">
                            <p class="text-sm font-medium text-gray-700">${escapeHtml(r.reporter?.name || "Unknown")}</p>
                        </div>
                    </td>
                    <td class="px-6 py-4">${typeBadge}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${targetContent}</td>
                    <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">${escapeHtml(r.reason || "")}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-1.5">
                            ${statusBadge}
                            ${aiBadge}
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(r.createdAt)}</td>
                    <td class="px-6 py-4 text-right">${actions}</td>
                </tr>`;
            }).join("");
        }

        renderPagination("reportsPagination", reportsPage, pages, total, (p) => {
            reportsPage = p;
            loadReports();
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-red-400">${escapeHtml(err.message)}</td></tr>`;
    }
}

async function resolveReport(id) {
    try {
        await api("PATCH", `/admin/reports/${id}/resolve`);
        showToast("Đã giải quyết báo cáo", "bg-green-500");
        loadReports();
        loadDashboard();
    } catch (err) {
        showToast(err.message, "bg-red-500");
    }
}

async function dismissReport(id) {
    try {
        await api("PATCH", `/admin/reports/${id}/dismiss`);
        showToast("Đã bỏ qua báo cáo", "bg-gray-500");
        loadReports();
        loadDashboard();
    } catch (err) {
        showToast(err.message, "bg-red-500");
    }
}

async function deleteReportedPost(id) {
    try {
        await api("DELETE", `/admin/reports/${id}/delete-post`);
        showToast("Đã xóa bài viết vi phạm", "bg-red-500");
        loadReports();
        loadDashboard();
    } catch (err) {
        showToast(err.message, "bg-red-500");
    }
}
