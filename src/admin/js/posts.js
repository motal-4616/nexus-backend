// ========== POSTS ==========
async function loadPosts() {
    const search = document.getElementById("postSearch").value.trim();
    const type = document.getElementById("postTypeFilter").value;
    const audience = document.getElementById("postAudienceFilter").value;
    const sort = document.getElementById("postSortFilter").value;
    const params = new URLSearchParams({ page: postsPage, limit: 15 });
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (audience) params.set("audience", audience);
    if (sort) params.set("sort", sort);

    const tbody = document.getElementById("postsTableBody");
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải...</td></tr>';

    try {
        const data = await api("GET", "/admin/posts?" + params);
        const { posts, total, totalPages: pages } = data.data;

        if (posts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">Không tìm thấy bài viết nào</td></tr>';
        } else {
            tbody.innerHTML = posts.map((p) => `
                <tr class="table-row border-b border-gray-50">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${p.author?.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(p.author?.name || "U") + "&background=6366f1&color=fff"}"
                                class="w-9 h-9 rounded-xl object-cover" alt="">
                            <div>
                                <p class="font-medium text-gray-800">${escapeHtml(p.author?.name || "Deleted")}</p>
                                <p class="text-xs text-gray-400">@${escapeHtml(p.author?.username || "")}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <p class="text-sm text-gray-700 max-w-xs truncate">${escapeHtml((p.content || "").substring(0, 100))}</p>
                        ${p.media?.length > 0 ? '<span class="text-xs text-primary-500"><i class="fas fa-image mr-1"></i>Có media</span>' : ""}
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">${p.audience || "public"}</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">
                        <i class="fas fa-heart text-red-400 mr-1"></i>${p.likesCount || 0}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(p.createdAt)}</td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="confirmAction('Xóa bài viết', 'Bạn muốn xóa vĩnh viễn bài viết này?', function(){ return deletePost('${p._id}'); })"
                            class="btn-action px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join("");
        }

        renderPagination("postsPagination", postsPage, pages, total, (p) => {
            postsPage = p;
            loadPosts();
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-red-400">${escapeHtml(err.message)}</td></tr>`;
    }
}

async function deletePost(id) {
    try {
        await api("DELETE", `/admin/posts/${id}`);
        showToast("Đã xóa bài viết", "bg-red-500");
        loadPosts();
    } catch (err) {
        showToast(err.message, "bg-red-500");
    }
}
