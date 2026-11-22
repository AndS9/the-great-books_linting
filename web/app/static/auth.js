function switchAuthTab(tab) {
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const formLogin = document.getElementById("login-form");
    const formRegister = document.getElementById("register-form");

    if (tabLogin) tabLogin.classList.toggle("active", tab === "login");
    if (tabRegister) tabRegister.classList.toggle("active", tab === "register");
    if (formLogin) formLogin.classList.toggle("hidden", tab !== "login");
    if (formRegister) formRegister.classList.toggle("hidden", tab !== "register");
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
        await checkAuth();
        showAlert("Welcome back to the realm, " + res.user.username + "!");
        setTimeout(() => {
            window.location.href = res.user.role === "noble" ? "/lords" : "/knights";
        }, 300);
    } catch (err) {
        showAlert(err.message, true);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    if (!selectedPhotoFile) {
        showAlert("Please upload a portrait or coat of arms image.", true);
        return;
    }
    
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
        await checkAuth();
        showAlert("Oath sworn! Account created for " + res.user.username + ".");
        setTimeout(() => {
            window.location.href = "/profile";
        }, 300);
    } catch (err) {
        showAlert(err.message, true);
    }
}

let selectedPhotoFile = null;

function handlePhotoDragOver(e) {
    e.preventDefault();
    const zone = document.getElementById("photo-dropzone");
    if (zone) {
        zone.style.borderColor = "#d4af37";
        zone.style.background = "rgba(212, 175, 55, 0.08)";
    }
}

function handlePhotoDragLeave(e) {
    e.preventDefault();
    const zone = document.getElementById("photo-dropzone");
    if (zone) {
        zone.style.borderColor = "rgba(212, 175, 55, 0.45)";
        zone.style.background = "rgba(255, 255, 255, 0.02)";
    }
}

function handlePhotoDrop(e) {
    e.preventDefault();
    handlePhotoDragLeave(e);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        processSelectedPhoto(files[0]);
    }
}

function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
        processSelectedPhoto(file);
    }
}

function processSelectedPhoto(file) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
        showAlert("Invalid format. Please choose PNG, JPG, or WEBP.", true);
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showAlert("Image is too large. Maximum size is 5 MB.", true);
        return;
    }

    selectedPhotoFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const previewImg = document.getElementById("photo-preview-img");
        const fileNameEl = document.getElementById("photo-file-name");
        const placeholder = document.getElementById("photo-placeholder");
        const previewWrap = document.getElementById("photo-preview-wrap");

        if (previewImg) previewImg.src = ev.target.result;
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (placeholder) placeholder.classList.add("hidden");
        if (previewWrap) previewWrap.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

function clearSelectedPhoto(e) {
    if (e) e.stopPropagation();
    selectedPhotoFile = null;

    const input = document.getElementById("reg-photo");
    const previewImg = document.getElementById("photo-preview-img");
    const placeholder = document.getElementById("photo-placeholder");
    const previewWrap = document.getElementById("photo-preview-wrap");

    if (input) input.value = "";
    if (previewImg) previewImg.src = "";
    if (previewWrap) previewWrap.classList.add("hidden");
    if (placeholder) placeholder.classList.remove("hidden");
}