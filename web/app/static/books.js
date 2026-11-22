const REALM_ROSTER_SEED = [
    { id: 901, username: "Ser Jaime Lannister", role: "knight", house_name: "Lannister", is_mock: true, stats: { strength: 18, defense: 16, endurance: 15 } },
    { id: 902, username: "Ser Brienne of Tarth", role: "knight", house_name: "Stark", is_mock: true, stats: { strength: 17, defense: 17, endurance: 16 } },
    { id: 903, username: "Ser Jorah Mormont", role: "knight", house_name: "Targaryen", is_mock: true, stats: { strength: 16, defense: 15, endurance: 16 } },
    { id: 904, username: "Ser Barristan Selmy", role: "knight", house_name: "Baratheon", is_mock: true, stats: { strength: 17, defense: 18, endurance: 14 } },
    { id: 905, username: "Eddard Stark", role: "noble", house_name: "Stark", is_mock: true, stats: null },
    { id: 906, username: "Tywin Lannister", role: "noble", house_name: "Lannister", is_mock: true, stats: null },
    { id: 907, username: "Daenerys Targaryen", role: "noble", house_name: "Targaryen", is_mock: true, stats: null },
    { id: 908, username: "Robert Baratheon", role: "noble", house_name: "Baratheon", is_mock: true, stats: null }
];

let allRealmMembers = [];

function getMockGossipTargetId() {
    if (!currentUser || !currentUser.gossip_key) return null;
    const saved = localStorage.getItem("mock_gossip_" + currentUser.gossip_key);
    return saved ? Number(saved) : null;
}

async function loadRealmRoster() {
    let dbMembers = [];
    let noticeText = "";

    if (currentUser) {
        try {
            const [knights, lords] = await Promise.all([
                apiFetch("/knights"),
                apiFetch("/lords")
            ]);
            dbMembers.push(...knights, ...lords);
        } catch (err) {
            console.warn(err.message);
        }

        if (currentUser.house_id) {
            try {
                const houseMembers = await apiFetch("/houses/" + currentUser.house_id + "/members");
                houseMembers.forEach(m => {
                    if (!dbMembers.some(d => d.id === m.id)) {
                        dbMembers.push({ ...m, house_id: currentUser.house_id });
                    }
                });
                const curHouseName = housesMap[currentUser.house_id] ? housesMap[currentUser.house_id].name : "your House";
                noticeText = "Sworn to House " + curHouseName + ": viewing live members alongside rival houses.";
            } catch (err) {
                console.warn(err.message);
            }
        } else {
            noticeText = currentUser.is_white_knight
                ? "Sworn to the Kingsguard: only your own combat stats are visible without Gossip."
                : "You are not sworn to any Great House. Combat stats of noble houses remain sealed.";
        }
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

    const combined = [...dbMembers];
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
    const houseLabel = person.is_white_knight
        ? "White Knight (Kingsguard)"
        : (houseName ? "House " + houseName : (bookRole === "noble" ? "Great House" : "Free Banner"));
    const motto = houseName && HOUSE_MOTTOS[houseName]
        ? HOUSE_MOTTOS[houseName]
        : (bookRole === "noble" ? "By Right of Blood" : "Sword for Hire");
    const bannerClass = getHouseBannerClass(houseName);
    const initials = getInitials(person.username);

    const avatarHtml = person.photo_url
        ? '<img src="' + person.photo_url + '" alt="" class="crest-monogram" style="object-fit: cover; padding: 0;" onerror="this.outerHTML=\'<div class=\\\'crest-monogram\\\'>' + initials + '</div>\'">'
        : '<div class="crest-monogram">' + initials + '</div>';

    const mockTargetId = getMockGossipTargetId();
    const activeTargetId = (currentUser && currentUser.gossip_target_id) || mockTargetId;
    const revealedByGossip = activeTargetId === person.id;

    const isSelf = currentUser && currentUser.id === person.id;
    const isSameHouse = currentUser && !currentUser.is_white_knight &&
        currentUser.house_id !== null && currentUser.house_id === person.house_id;

    const canSeeStats = Boolean(person.is_white_knight) || isSelf || revealedByGossip || isSameHouse;

    const isKnightViewer = currentUser && currentUser.role.toLowerCase() === "knight";
    const alreadyUsedToday = activeTargetId !== null;

    let statsSectionHtml = "";
    if (bookRole !== "noble") {
        let statsHtml = "";
        if (canSeeStats && person.stats) {
            statsHtml =
                '<div class="stats-visible">' +
                '<span>STR: <b>' + person.stats.strength + '</b></span>' +
                '<span>DEF: <b>' + person.stats.defense + '</b></span>' +
                '<span>END: <b>' + person.stats.endurance + '</b></span>' +
                '</div>';
        } else {
            statsHtml = '<div class="stats-locked">🔒 Stats hidden (Same House only)</div>';

            if (isKnightViewer && bookRole === "knight") {
                if (alreadyUsedToday) {
                    statsHtml += '<button class="btn-gossip" disabled>👁️ Daily Gossip Used</button>';
                } else {
                    statsHtml +=
                        '<button type="button" class="btn-gossip" onclick="toggleGossipForm(' + person.id + ')">👁️ Use Gossip Key</button>' +
                        '<div id="gossip-form-' + person.id + '" class="hidden" style="margin-top: 0.5rem; display: flex; gap: 0.4rem;">' +
                        '<input type="text" id="gossip-input-' + person.id + '" class="search-input" placeholder="Paste gossip key..." style="padding: 0.4rem; font-size: 0.85rem;">' +
                        '<button type="button" class="btn-primary" style="margin-top: 0; padding: 0.4rem 0.7rem; font-size: 0.85rem;" onclick="submitGossip(' + person.id + ')">Unlock</button>' +
                        '</div>';
                }
            }
        }
        statsSectionHtml = '<div class="card-stats">' + statsHtml + '</div>';
    }

    const targetRole = person.role ? person.role.toLowerCase() : "";
    const isLordOfSameHouse = (
        currentUser &&
        currentUser.role &&
        currentUser.role.toLowerCase() === "noble" &&
        currentUser.house_id &&
        currentUser.house_id === person.house_id &&
        person.id !== currentUser.id &&
        (targetRole === "knight" || targetRole === "noble") &&
        !person.is_mock
    );

    let banBtnHtml = "";
    if (isLordOfSameHouse) {
        banBtnHtml = '<button type="button" class="btn-ban" onclick="sendToNightsWatch(' + person.id + ', \'' + person.username.replace(/'/g, "\\'") + '\')">⚔️ Send to Night\'s Watch</button>';
    }

    return (
        '<div class="knight-card">' +
        '<div class="card-crest-bg ' + bannerClass + '">' +
        avatarHtml +
        '<span class="card-role-tag">' + (person.is_white_knight ? "white knight" : person.role) + '</span>' +
        '</div>' +
        '<div class="card-body">' +
        '<div class="card-house">' + houseLabel + '</div>' +
        '<div class="card-motto">"' + motto + '"</div>' +
        '<div class="card-name">' + person.username + '</div>' +
        banBtnHtml +
        statsSectionHtml +
        '</div>' +
        '</div>'
    );
}

function toggleGossipForm(targetId) {
    const form = document.getElementById("gossip-form-" + targetId);
    if (form) form.classList.toggle("hidden");
}

async function submitGossip(targetId) {
    const input = document.getElementById("gossip-input-" + targetId);
    const key = input ? input.value.trim() : "";

    if (!key) {
        return showAlert("Please paste your Gossip key first.", true);
    }

    const targetPerson = allRealmMembers.find(m => m.id === targetId);

    if (targetPerson && targetPerson.is_mock) {
        if (!currentUser || !currentUser.gossip_key) {
            return showAlert("Generate a gossip key in your Profile first.", true);
        }
        if (key !== currentUser.gossip_key) {
            return showAlert("Invalid gossip key.", true);
        }
        if (getMockGossipTargetId() !== null || currentUser.gossip_target_id !== null) {
            return showAlert("You have already used your gossip key for today.", true);
        }
        localStorage.setItem("mock_gossip_" + currentUser.gossip_key, String(targetId));
        showAlert("Combat stats revealed for " + targetPerson.username + ".");
        await loadRealmRoster();
        return;
    }

    try {
        const res = await apiFetch("/gossip", {
            method: "POST",
            body: JSON.stringify({ key: key, target_id: targetId })
        });
        showAlert(res.message || "Combat stats revealed!");
        currentUser = await apiFetch("/me");
        await loadRealmRoster();
    } catch (err) {
        showAlert(err.message, true);
    }
}

async function sendToNightsWatch(targetId, username) {
    if (!confirm("Banish " + username + " to the Night's Watch forever?")) return;

    try {
        const res = await apiFetch("/nightwatch/" + targetId, {
            method: "POST"
        });
        showAlert(res.message || (username + " has been sent to the Night's Watch."));
        await loadRealmRoster();
    } catch (err) {
        showAlert(err.message, true);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (window.coreInitPromise) await window.coreInitPromise;
    await loadRealmRoster();
});