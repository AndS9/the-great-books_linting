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
        const controls = document.getElementById("gossip-key-controls");
        const keyInput = document.getElementById("gossip-key-input");
        const nextTimeEl = document.getElementById("gossip-next-time");

        if (pill && desc) {
            if (me.role !== "knight") {
                pill.textContent = "Not Available";
                desc.textContent = "Only sworn Knights can dispatch spies for daily Gossip.";
                if(controls) controls.classList.add("hidden");
            } else {
                if(controls) controls.classList.remove("hidden");
                if(keyInput) keyInput.value = me.gossip_key || "";

                if (!me.gossip_key) {
                    pill.textContent = "No Key Yet";
                    desc.textContent = "Click 'Update Key' to generate your first daily Gossip key.";
                } else if(me.gossip_target_id){
                    pill.textContent = "Used Today";
                    desc.textContent = "You have already used today's key to reveal a rival knight's stats.";
                } else {
                    pill.textContent = "Key Active";
                    desc.textContent = "Copy your key and use it in the Book of Knights to reveal 1 rival knight's stats.";
                }

                if(nextTimeEl) {
                    if(me.next_key) {
                        const nextDate = new Date(me.next_key + "Z");
                        nextTimeEl.textContent = "Next key update available after: " + nextDate.toLocaleString();
                    } else {
                        nextTimeEl.textContent = "Key update is available now.";
                    }
                }
            }
        }
    } catch (err) {
        showAlert(err.message, true);
    }
}

async function updateGossipKey() {
    const btn = document.getElementById("btn-update-key");
    if(btn) btn.disabled = true;

    try {
        const res = await apiFetch("/me/gossip-key", { method: "POST"});
        showAlert(res.message || "Gossip key updated");
        await loadProfile();
    } catch (err) {
        showAlert(err.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function copyGossipKey() {
    const keyInput = document.getElementById("gossip-key-input");
    if (!keyInput || !keyInput.value) {
        return showAlert("Generate a gossip key first.", true);
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(keyInput.value)
            .then(() => showAlert("Gossip key copied to clipboard!"))
            .catch(() => fallbackCopy(keyInput));
    } else {
        fallbackCopy(keyInput);
    }
}

function fallbackCopy(inputEl) {
    inputEl.select();
    inputEl.setSelectionRange(0, 99999);
    try {
        document.execCommand("copy");
        showAlert("Gossip key copied to clipboard!");
    } catch (_) {
        showAlert("Could not copy key. Please copy it manually.", true);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (window.coreInitPromise) await window.coreInitPromise;
    await loadProfile();
});
