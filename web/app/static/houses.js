function renderHousesPage() {
    const grid = document.getElementById("houses-grid");
    if (!grid) return;
    const countEl = document.getElementById("houses-count");
    if (countEl) countEl.textContent = housesList.length + " Great Houses";

    grid.innerHTML = housesList.map(h => {
        const bannerClass = getHouseBannerClass(h.name);
        const motto = HOUSE_MOTTOS[h.name] || "Words Unrecorded";
        const isMyHouse = currentUser && currentUser.house_id === h.id;
        const lordStatus = h.lord_id ? "Lord ID #" + h.lord_id : "Seat Vacant (No Lord assigned)";

        return (
            '<div class="house-card">' +
            '<div class="house-banner ' + bannerClass + '">House ' + h.name + '</div>' +
            '<div class="house-card-body">' +
            '<div class="card-motto">"' + motto + '"</div>' +
            '<p class="muted">' + lordStatus + '</p>' +
            (isMyHouse ? '<span class="role-badge">Your Allegiance</span>' : '') +
            '<div style="display:flex; gap:0.5rem; margin-top:auto;">' +
            '<button class="btn-secondary" style="flex:1" onclick="filterHouseInBook(\'knights\', ' + h.id + ')">Knights</button>' +
            '<button class="btn-secondary" style="flex:1" onclick="filterHouseInBook(\'lords\', ' + h.id + ')">Lords</button>' +
            '</div>' +
            '</div>' +
            '</div>'
        );
    }).join("");
}

function filterHouseInBook(bookPage, houseId) {
    window.location.href = "/" + bookPage + "?house=" + houseId;
}

document.addEventListener("DOMContentLoaded", async () => {
    if (window.coreInitPromise) await window.coreInitPromise;
    renderHousesPage();
});
