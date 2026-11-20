const API_BASE = "/api";

const HOUSE_MOTTOS = {
    Stark: "Winter Is Coming",
    Lannister: "Hear Me Roar!",
    Targaryen: "Fire and Blood",
    Baratheon: "Ours Is the Fury"
};

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

let currentUser = null;
let housesList = [];
let housesMap = {};
let allRealmMembers = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadDictionaries();
    await checkAuth();
    await loadRealmRoster();
});

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...options.headers
    };

    const response = await fetch(API_BASE + endpoint, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || "Request failed (" + response.status + ")");
    }
    return data;
}

function showAlert(message, isError = false) {
    const box = document.getElementById("alert-box");
    box.textContent = message;
    box.className = isError ? "alert error" : "alert";
    setTimeout(() => box.classList.add("hidden"), 4500);
}

function showPage(pageName) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

    document.getElementById("page-" + pageName).classList.remove("hidden");
    const navBtn = document.getElementById("nav-" + pageName);
    if (navBtn) navBtn.classList.add("active");

    if (pageName === "knights") loadRealmRoster("knight");
    if (pageName === "lords") loadRealmRoster("noble");
    if (pageName === "houses") renderHousesPage();
    if (pageName === "profile") loadProfile();
}

function switchAuthTab(tab) {
    document.getElementById("tab-login").classList.toggle("active", tab === "login");
    document.getElementById("tab-register").classList.toggle("active", tab === "register");
    document.getElementById("login-form").classList.toggle("hidden", tab !== "login");
    document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
}

function getHouseBannerClass(houseName) {
    if (!houseName) return "banner-default";
    const key = houseName.toLowerCase();
    if (key.includes("stark")) return "banner-stark";
    if (key.includes("lannister")) return "banner-lannister";
    if (key.includes("targaryen")) return "banner-targaryen";
    if (key.includes("baratheon")) return "banner-baratheon";
    return "banner-default";
}

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function loadDictionaries() {
    try {
        const [roles, houses] = await Promise.all([
            apiFetch("/roles"),
            apiFetch("/houses")
        ]);

        housesList = houses;
        housesMap = {};
        houses.forEach(h => { housesMap[h.id] = h; });

        const roleSelect = document.getElementById("reg-role");
        roleSelect.innerHTML = roles.map(r =>
            '<option value="' + r.id + '">' + r.role_name.toUpperCase() + '</option>'
        ).join("");

        const houseOptionsHtml = '<option value="all">All Great Houses</option>' +
            houses.map(h => '<option value="' + h.id + '">House ' + h.name + '</option>').join("");

        document.getElementById("filter-knights").innerHTML = houseOptionsHtml;
        document.getElementById("filter-lords").innerHTML = houseOptionsHtml;

        const houseSelect = document.getElementById("reg-house");
        houseSelect.innerHTML = '<option value="">No House (Free Rider / Commonfolk)</option>' +
            houses.map(h => '<option value="' + h.id + '">House ' + h.name + '</option>').join("");
    } catch (err) {
        console.warn("Could not load dictionaries:", err.message);
    }
}

async function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        updateNavUI(null);
        return;
    }

    try {
        currentUser = await apiFetch("/me");
        updateNavUI(currentUser);
    } catch (_) {
        localStorage.removeItem("token");
        currentUser = null;
        updateNavUI(null);
    }
}

function updateNavUI(user) {
    const isLoggedIn = Boolean(user);
    document.getElementById("nav-profile").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-logout").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-auth").classList.toggle("hidden", isLoggedIn);

    let badgeText = "Guest (Spectator)";
    if (user) {
        const houseObj = housesMap[user.house_id];
        const houseLabel = houseObj ? "House " + houseObj.name : "No House";
        badgeText = user.username + " • " + user.role + " (" + houseLabel + ")";
    }

    document.getElementById("user-badge-knights").textContent = badgeText;
    document.getElementById("user-badge-lords").textContent = badgeText;
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
        const res = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });
        localStorage.setItem("token", res.token);
        await checkAuth();
        showAlert("Welcome back to the realm, " + res.user.username + "!");
        showPage(res.user.role === "noble" ? "lords" : "knights");
    } catch (err) {
        showAlert(err.message, true);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;
    const role_id = Number(document.getElementById("reg-role").value);
    const houseRaw = document.getElementById("reg-house").value;
    const house_id = houseRaw ? Number(houseRaw) : null;

    try {
        const res = await apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password, role_id, house_id })
        });
        localStorage.setItem("token", res.token);
        await checkAuth();
        showAlert("Oath sworn! Account created for " + res.user.username + ".");
        showPage("profile");
    } catch (err) {
        showAlert(err.message, true);
    }
}

async function logout() {
    try {
        await apiFetch("/auth/logout", { method: "POST" });
    } catch (_) { }
    localStorage.removeItem("token");
    currentUser = null;
    updateNavUI(null);
    showAlert("You have left the realm.");
    showPage("auth");
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

async function loadProfile() {
    if (!currentUser) return showPage("auth");
    try {
        const me = await apiFetch("/me");
        currentUser = me;

        const houseObj = housesMap[me.house_id];
        const houseName = houseObj ? houseObj.name : null;

        document.getElementById("prof-banner").className = "profile-banner " + getHouseBannerClass(houseName);
        document.getElementById("prof-monogram").textContent = getInitials(me.username);
        document.getElementById("prof-username").textContent = me.username;
        document.getElementById("prof-role").textContent = me.role;
        document.getElementById("prof-house").textContent = houseName ? "House " + houseName : "Free Rider / Commonfolk";
        document.getElementById("prof-motto").textContent = houseName && HOUSE_MOTTOS[houseName]
            ? '"' + HOUSE_MOTTOS[houseName] + '"'
            : '"Unbowed by titles, forged by steel."';

        const str = me.stats.strength || 0;
        const def = me.stats.defense || 0;
        const end = me.stats.endurance || 0;

        document.getElementById("stat-str").textContent = str;
        document.getElementById("stat-def").textContent = def;
        document.getElementById("stat-end").textContent = end;

        document.getElementById("bar-str").style.width = Math.min(100, str * 5) + "%";
        document.getElementById("bar-def").style.width = Math.min(100, def * 5) + "%";
        document.getElementById("bar-end").style.width = Math.min(100, end * 5) + "%";

        const pill = document.getElementById("gossip-status-pill");
        const desc = document.getElementById("gossip-desc");

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
    } catch (err) {
        showAlert(err.message, true);
    }
}

async function loadRealmRoster(activeBookRole = "knight") {
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
            noticeText = "Sworn to House " + housesMap[currentUser.house_id].name + ": viewing live house members from database alongside rival houses.";
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
        el.classList.remove("hidden");
        el.textContent = noticeText;
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
    renderBook("knight");
    renderBook("noble");
}

function renderBook(targetRole) {
    const isKnightBook = targetRole === "knight";
    const gridId = isKnightBook ? "grid-knights" : "grid-lords";
    const searchId = isKnightBook ? "search-knights" : "search-lords";
    const filterId = isKnightBook ? "filter-knights" : "filter-lords";

    const grid = document.getElementById(gridId);
    const query = document.getElementById(searchId).value.trim().toLowerCase();
    const houseFilter = document.getElementById(filterId).value;

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

function triggerGossip(targetName) {
    if (!currentUser || currentUser.role !== "knight") return;
    const key = getTodayGossipKey();
    if (localStorage.getItem(key)) {
        return showAlert("You have already used your daily Gossip whisper.", true);
    }
    localStorage.setItem(key, JSON.stringify({ target: targetName, date: new Date().toISOString() }));
    showAlert("Spymaster report received! Combat stats revealed for " + targetName + ".");
    renderBook("knight");
    renderBook("noble");
}

function renderHousesPage() {
    const grid = document.getElementById("houses-grid");
    document.getElementById("houses-count").textContent = housesList.length + " Great Houses";

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
    showPage(bookPage);
    const filterId = bookPage === "knights" ? "filter-knights" : "filter-lords";
    document.getElementById(filterId).value = String(houseId);
    renderBook(bookPage === "knights" ? "knight" : "noble");
}