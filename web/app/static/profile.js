async function loadProfile() {
    const profUsername = document.getElementById("prof-username");
    if (!profUsername) return;

    if (!currentUser) {
        window.location.href = "/login";
        return;
    }
    try {
        const me = await apiFetch("/me");
        currentUser = me;

        const houseObj = housesMap[me.house_id];
        const houseName = houseObj ? houseObj.name : null;

        const profBanner = document.getElementById("prof-banner");
        if (profBanner) profBanner.className = "profile-banner " + getHouseBannerClass(houseName);
        const profMonogram = document.getElementById("prof-monogram");
        if (profMonogram) profMonogram.textContent = getInitials(me.username);
        profUsername.textContent = me.username;
        const profRole = document.getElementById("prof-role");
        if (profRole) profRole.textContent = me.role;
        const profHouse = document.getElementById("prof-house");
        if (profHouse) profHouse.textContent = houseName ? "House " + houseName : "Free Rider / Commonfolk";
        const profMotto = document.getElementById("prof-motto");
        if (profMotto) {
            profMotto.textContent = houseName && HOUSE_MOTTOS[houseName]
                ? '"' + HOUSE_MOTTOS[houseName] + '"'
                : '"Unbowed by titles, forged by steel."';
        }

        const str = me.stats.strength || 0;
        const def = me.stats.defense || 0;
        const end = me.stats.endurance || 0;

        const statStr = document.getElementById("stat-str");
        if (statStr) statStr.textContent = str;
        const statDef = document.getElementById("stat-def");
        if (statDef) statDef.textContent = def;
        const statEnd = document.getElementById("stat-end");
        if (statEnd) statEnd.textContent = end;

        const barStr = document.getElementById("bar-str");
        if (barStr) barStr.style.width = Math.min(100, str * 5) + "%";
        const barDef = document.getElementById("bar-def");
        if (barDef) barDef.style.width = Math.min(100, def * 5) + "%";
        const barEnd = document.getElementById("bar-end");
        if (barEnd) barEnd.style.width = Math.min(100, end * 5) + "%";

        const pill = document.getElementById("gossip-status-pill");
        const desc = document.getElementById("gossip-desc");

        if (pill && desc) {
            if (me.role !== "knight") {
                pill.textContent = "Not Available";
                desc.textContent = "Only sworn Knights can dispatch spies for daily Gossip.";
            } else {
                const used = getGossipRecord();
                if (used) {
                    pill.textContent = "Used Today";
                    desc.textContent = "Today's spy report was requested for " + used.target + ". Next whisper available tomorrow.";
                } else {
                    pill.textContent = "1 Whisper Ready";
                    desc.textContent = "You may uncover hidden combat stats of 1 rival House warrior today from the Book of Knights or Book of Lords.";
                }
            }
        }
    } catch (err) {
        showAlert(err.message, true);
    }
}

function getTodayGossipKey() {
    if (!currentUser) return null;
    const today = new Date().toISOString().slice(0, 10);
    return "gossip_used_" + currentUser.id + "_" + today;
}

function getGossipRecord() {
    const key = getTodayGossipKey();
    if (!key) return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
}

document.addEventListener("DOMContentLoaded", async () => {
    if (window.coreInitPromise) await window.coreInitPromise;
    await loadProfile();
});
