const REALM_ROSTER_SEED = [
    { id: 901, username: "Ser Jaime Lannister", role: "knight", house_name: "Lannister", stats: { strength: 18, defense: 16, endurance: 15 } },
    { id: 902, username: "Ser Brienne of Tarth", role: "knight", house_name: "Stark", stats: { strength: 17, defense: 17, endurance: 16 } },
    { id: 903, username: "Ser Jorah Mormont", role: "knight", house_name: "Targaryen", stats: { strength: 16, defense: 15, endurance: 16 } },
    { id: 904, username: "Ser Barristan Selmy", role: "knight", house_name: "Baratheon", stats: { strength: 17, defense: 18, endurance: 14 } },
    { id: 905, username: "Eddard Stark", role: "noble", house_name: "Stark", stats: { strength: 14, defense: 15, endurance: 14 } },
    { id: 906, username: "Tywin Lannister", role: "noble", house_name: "Lannister", stats: { strength: 11, defense: 14, endurance: 12 } },
    { id: 907, username: "Daenerys Targaryen", role: "noble", house_name: "Targaryen", stats: { strength: 10, defense: 13, endurance: 15 } },
    { id: 908, username: "Robert Baratheon", role: "noble", house_name: "Baratheon", stats: { strength: 19, defense: 14, endurance: 13 } }
];

let allRealmMembers = [];

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

function triggerGossip(targetName) {
    if (!currentUser || currentUser.role !== "knight") return;
    const key = getTodayGossipKey();
    if (localStorage.getItem(key)) {
        return showAlert("You have already used your daily Gossip whisper.", true);
    }
    localStorage.setItem(key, JSON.stringify({ target: targetName, date: new Date().toISOString() }));
    showAlert("Spymaster report received! Combat stats revealed for " + targetName + ".");
    if (document.getElementById("grid-knights")) renderBook("knight");
    if (document.getElementById("grid-lords")) renderBook("noble");
}

async function loadRealmRoster() {
    let houseMembers = [];
    let noticeText = "";

    if (currentUser && currentUser.house_id) {
        try {
            const members = await apiFetch("/houses/" + currentUser.house_id + "/members");
            houseMembers = members.map(m => ({
                ...m,
                house_id: currentUser.house_id,
                from_db: true
            }));
            const curHouseName = housesMap[currentUser.house_id] ? housesMap[currentUser.house_id].name : "your House";
            noticeText = "Sworn to House " + curHouseName + ": viewing live house members from database alongside rival houses.";
        } catch (err) {
            console.warn(err.message);
        }
    } else if (currentUser) {
        noticeText = "You are not sworn to any Great House. Combat stats of noble houses remain sealed.";
    } else {
        noticeText = "Guest view: Sign in and swear allegiance to a Great House to inspect your housemates' combat stats.";
    }

    ["notice-knights", "notice-lords"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove("hidden");
            el.textContent = noticeText;
        }
    });

    const seedWithIds = REALM_ROSTER_SEED.map(item => {
        const matchedHouse = housesList.find(h => h.name.toLowerCase() === item.house_name.toLowerCase());
        return {
            ...item,
            house_id: matchedHouse ? matchedHouse.id : null
        };
    });

    const combined = [...houseMembers];
    seedWithIds.forEach(seed => {
        if (!combined.some(c => c.username.toLowerCase() === seed.username.toLowerCase())) {
            combined.push(seed);
        }
    });

    allRealmMembers = combined;
    if (document.getElementById("grid-knights")) renderBook("knight");
    if (document.getElementById("grid-lords")) renderBook("noble");
}

function renderBook(targetRole) {
    const isKnightBook = targetRole === "knight";
    const gridId = isKnightBook ? "grid-knights" : "grid-lords";
    const searchId = isKnightBook ? "search-knights" : "search-lords";
    const filterId = isKnightBook ? "filter-knights" : "filter-lords";

    const grid = document.getElementById(gridId);
    if (!grid) return;

    const searchEl = document.getElementById(searchId);
    const filterEl = document.getElementById(filterId);
    const query = searchEl ? searchEl.value.trim().toLowerCase() : "";
    const houseFilter = filterEl ? filterEl.value : "all";

    const filtered = allRealmMembers.filter(m => {
        const matchesRole = m.role && m.role.toLowerCase() === targetRole;
        const matchesName = m.username.toLowerCase().includes(query);
        const matchesHouse = houseFilter === "all" || String(m.house_id) === houseFilter;
        return matchesRole && matchesName && matchesHouse;
    });

    if (filtered.length === 0) {
        const label = isKnightBook ? "knights" : "lords";
        grid.innerHTML = '<p class="muted">No ' + label + ' match your current filter.</p>';
        return;
    }

    grid.innerHTML = filtered.map(m => renderCharacterCard(m, targetRole)).join("");
}

function renderCharacterCard(person, bookRole) {
    const houseObj = housesMap[person.house_id];
    const houseName = houseObj ? houseObj.name : null;
    const houseLabel = houseName ? "House " + houseName : "Free Banner";
    const motto = houseName && HOUSE_MOTTOS[houseName]
        ? HOUSE_MOTTOS[houseName]
        : (bookRole === "noble" ? "By Right of Blood" : "Sword for Hire");
    const bannerClass = getHouseBannerClass(houseName);
    const initials = getInitials(person.username);

    const gossipRecord = getGossipRecord();
    const revealedByGossip = gossipRecord && gossipRecord.target === person.username;

    const canSeeStats = revealedByGossip || (currentUser && (
        currentUser.role === "noble" ||
        (currentUser.house_id && currentUser.house_id === person.house_id)
    ));

    const isKnightViewer = currentUser && currentUser.role === "knight";

    let statsHtml = "";
    if (canSeeStats && person.stats) {
        statsHtml =
            '<div class="stats-visible">' +
            '<span>STR: <b>' + person.stats.strength + '</b></span>' +
            '<span>DEF: <b>' + person.stats.defense + '</b></span>' +
            '<span>END: <b>' + person.stats.endurance + '</b></span>' +
            '</div>';
    } else {
        const disabledAttr = gossipRecord ? "disabled" : "";
        const btnLabel = gossipRecord ? "👁️ Daily Gossip Used" : "👁️ Use Gossip (1/day)";
        statsHtml =
            '<div class="stats-locked">🔒 Stats hidden (Same House & Lords only)</div>' +
            (isKnightViewer ? '<button class="btn-gossip" ' + disabledAttr + ' onclick="triggerGossip(\'' + person.username + '\')">' + btnLabel + '</button>' : '');
    }

    return (
        '<div class="knight-card">' +
        '<div class="card-crest-bg ' + bannerClass + '">' +
        '<div class="crest-monogram">' + initials + '</div>' +
        '<span class="card-role-tag">' + person.role + '</span>' +
        '</div>' +
        '<div class="card-body">' +
        '<div class="card-house">' + houseLabel + '</div>' +
        '<div class="card-motto">"' + motto + '"</div>' +
        '<div class="card-name">' + person.username + '</div>' +
        '<div class="card-stats">' + statsHtml + '</div>' +
        '</div>' +
        '</div>'
    );
}

document.addEventListener("DOMContentLoaded", async () => {
    if (window.coreInitPromise) await window.coreInitPromise;
    await loadRealmRoster();
});
