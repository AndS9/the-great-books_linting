async function submitLordSetup(e) {
    e.preventDefault();

    const houseId = document.getElementById("lord-house").value;
    if (!selectedPhotoFile) {
        showAlert("Please select a photo", true);
        return;
    }

    const formData = new FormData();
    formData.append("house_id", houseId);
    formData.append("photo", selectedPhotoFile);

    try {
        const res = await fetch(API_BASE + "/lords/setup", {
            method: "POST",
            credentials: "same-origin",
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error saving lord info");

        showAlert("Lord profile completed!");
        setTimeout(() => {
            window.location.href = "/profile";
        }, 300);
    } catch (err) {
        showAlert(err.message, true);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (window.coreInitPromise) await window.coreInitPromise;

    if (!currentUser || currentUser.role.toLowerCase() !== "noble") {
        window.location.href = "/login";
        return;
    }

    const select = document.getElementById("lord-house");
    select.innerHTML = '<option value="">Choose a House...</option>' +
        housesList.map(h => `<option value="${h.id}">House ${h.name}</option>`).join("");
});