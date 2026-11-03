"use strict";

(() => {
  const ACCOUNTS_KEY = "lshd-demo-accounts";
  const SESSION_KEY = "lshd-demo-user";
  const MAX_PHOTO_FILE_SIZE = 5 * 1024 * 1024;

  const ROLE_LABELS = {
    dev: "Développeur",
    admin: "Administrateur",
    directeur: "Directeur",
    directeur_adjoint: "Directeur adjoint",
    responsable: "Responsable",
    medecin_senior: "Médecin senior",
    medecin: "Médecin",
    medecin_junior: "Médecin junior",
    interne: "Interne",
    infirmier: "Infirmier",
    auxiliaire_soin: "Auxiliaire de soin",
    directeur_irs: "Directeur IRS",
    police: "Police",
    avocat: "Avocat"
  };

  const PERMISSION_LABELS = {
    corp_medical: "Corps médical",
    psychologie: "Psychologie",
    chirurgie: "Chirurgie",
    generaliste: "Généraliste"
  };

  const ROLE_PREFIXES = {
    medecin_senior: "Dr",
    medecin: "Dr",
    medecin_junior: "Dr",
    responsable: "Dr",
    directeur_adjoint: "Dir. adj.",
    directeur: "Dir.",
    directeur_irs: "Dir. IRS",
    admin: "Admin",
    dev: "Dev",
    interne: "Interne",
    infirmier: "Infirmier",
    auxiliaire_soin: "Aux.",
    police: "Police",
    avocat: "Me"
  };

  const elements = {
    sections: document.querySelector("#profile-sections"),
    unavailable: document.querySelector("#profile-unavailable"),

    infoForm: document.querySelector("#profile-info-form"),
    infoFeedback: document.querySelector("#profile-info-feedback"),
    lastName: document.querySelector("#profile-last-name"),
    firstName: document.querySelector("#profile-first-name"),
    birthDate: document.querySelector("#profile-birth-date"),
    phone: document.querySelector("#profile-phone"),
    username: document.querySelector("#profile-username"),
    photoInput: document.querySelector("#profile-photo"),
    photoPreview: document.querySelector("#profile-photo-preview"),
    removePhoto: document.querySelector("#remove-profile-photo"),

    passwordForm: document.querySelector("#profile-password-form"),
    passwordFeedback: document.querySelector("#profile-password-feedback"),
    currentPassword: document.querySelector("#profile-current-password"),
    newPassword: document.querySelector("#profile-new-password"),
    confirmPassword: document.querySelector("#profile-confirm-password"),

    displayName: document.querySelector("#profile-display-name"),
    roleLabel: document.querySelector("#profile-role-label"),
    avatar: document.querySelector("#profile-avatar"),
    permissionBadges: document.querySelector("#profile-permission-badges")
  };

  let currentPhoto = "";
  let photoChanged = false;

  function normalizeUsername(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizeRole(value) {
    return window.LSHD?.normalizePermission
      ? window.LSHD.normalizePermission(value)
      : String(value || "").trim().toLowerCase();
  }

  function readJson(storage, key, fallback) {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function localDateString() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  function getSessionUser() {
    return readJson(sessionStorage, SESSION_KEY, null);
  }

  function getCurrentUsername() {
    return normalizeUsername(getSessionUser()?.username);
  }

  function readAccounts() {
    const accounts = readJson(localStorage, ACCOUNTS_KEY, []);
    return Array.isArray(accounts) ? accounts : [];
  }

  function getCurrentAccount() {
    const username = getCurrentUsername();
    if (!username) return null;

    return readAccounts().find(account =>
      normalizeUsername(account.username) === username
    ) || null;
  }

  function showFeedback(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("is-error", isError);
  }

  function getPrimaryRole(account) {
    const session = getSessionUser();
    return normalizeRole(account?.primaryRole || account?.role || session?.role);
  }

  function getRoleLabel(role) {
    return ROLE_LABELS[normalizeRole(role)] || "Personnel médical";
  }

  function getDisplayName(account) {
    const firstName = String(account?.firstName || "").trim();
    const lastName = String(account?.lastName || "").trim();

    const name = firstName && lastName
      ? `${firstName.charAt(0).toLocaleUpperCase("fr-FR")}. ${lastName}`
      : lastName || firstName || "Profil à compléter";

    const prefix = ROLE_PREFIXES[getPrimaryRole(account)];

    return prefix && name !== "Profil à compléter"
      ? `${prefix} ${name}`
      : name;
  }

  function getAvatarInitial(account) {
    const firstName = String(account?.firstName || "").trim();
    if (firstName) return firstName.charAt(0).toLocaleUpperCase("fr-FR");

    const lastName = String(account?.lastName || "").trim();
    if (lastName) return lastName.charAt(0).toLocaleUpperCase("fr-FR");

    return "?";
  }

  function setAvatar(element, account, photo) {
    element.replaceChildren();

    if (photo) {
      const image = document.createElement("img");
      image.src = photo;
      image.alt = "";
      element.append(image);
    } else {
      element.textContent = getAvatarInitial(account);
    }
  }

  function renderPermissions(account) {
    const session = getSessionUser();
    const primaryRole = getPrimaryRole(account);

    const subpermissions = Array.isArray(account?.subpermissions)
      ? account.subpermissions
      : Array.isArray(session?.permissions)
        ? session.permissions
        : [];

    const permissions = [
      ...(primaryRole ? [{ id: primaryRole, primary: true }] : []),
      ...subpermissions.map(permission => ({
        id: normalizeRole(permission),
        primary: false
      }))
    ];

    elements.permissionBadges.replaceChildren();

    if (permissions.length === 0) {
      const badge = document.createElement("span");
      badge.className = "profile-permission-badge";
      badge.textContent = "Aucune permission attribuée";
      elements.permissionBadges.append(badge);
      return;
    }

    permissions.forEach(permission => {
      const badge = document.createElement("span");
      badge.className = permission.primary
        ? "profile-permission-badge is-primary"
        : "profile-permission-badge";

      badge.textContent =
        PERMISSION_LABELS[permission.id] ||
        ROLE_LABELS[permission.id] ||
        permission.id;

      elements.permissionBadges.append(badge);
    });
  }

  function renderIdentity(account) {
    const role = getPrimaryRole(account);
    const displayName = getDisplayName(account);
    const photo = account?.profilePhoto || "";

    elements.displayName.textContent = displayName;
    elements.roleLabel.textContent = getRoleLabel(role);

    setAvatar(elements.avatar, account, photo);
    setAvatar(elements.photoPreview, account, photo);

    document.querySelectorAll("[data-user-name]").forEach(element => {
      element.textContent = displayName;
    });

    document.querySelectorAll("[data-user-role]").forEach(element => {
      element.textContent = getRoleLabel(role);
    });

    renderPermissions(account);
  }

  function loadProfile() {
    const account = getCurrentAccount();

    if (!account) {
      elements.sections.hidden = true;
      elements.unavailable.hidden = false;
      return;
    }

    elements.lastName.value = account.lastName || "";
    elements.firstName.value = account.firstName || "";
    elements.birthDate.value = account.birthDate || "";
    elements.phone.value = account.phone || "";
    elements.username.value = account.username || "";
    elements.birthDate.max = localDateString();

    currentPhoto = account.profilePhoto || "";
    elements.sections.hidden = false;
    elements.unavailable.hidden = true;

    renderIdentity(account);
  }

  async function resizePhoto(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Choisis un fichier image.");
    }

    if (file.size > MAX_PHOTO_FILE_SIZE) {
      throw new Error("La photo doit faire moins de 5 Mo.");
    }

    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("La photo n’a pas pu être lue."));
      reader.readAsDataURL(file);
    });

    const image = await new Promise((resolve, reject) => {
      const picture = new Image();
      picture.onload = () => resolve(picture);
      picture.onerror = () => reject(new Error("Cette image ne peut pas être utilisée."));
      picture.src = source;
    });

    const canvas = document.createElement("canvas");
    const maximumSize = 320;
    const scale = Math.min(maximumSize / image.width, maximumSize / image.height, 1);

    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Le navigateur ne peut pas préparer cette photo.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  function validateInfo(accounts, accountIndex) {
    const lastName = elements.lastName.value.trim();
    const firstName = elements.firstName.value.trim();
    const birthDate = elements.birthDate.value;
    const phoneInput = elements.phone.value.trim();
    const phone = normalizePhone(phoneInput);
    const username = normalizeUsername(elements.username.value);

    if (!lastName || !firstName || !birthDate || !phoneInput || !username) {
      return "Remplis tous les champs de tes informations.";
    }

    if (birthDate > localDateString()) {
      return "La date de naissance ne peut pas être dans le futur.";
    }

    if (phone.length < 5 || phone.length > 15) {
      return "Vérifie le numéro : il doit contenir entre 5 et 15 chiffres.";
    }

    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      return "Le nom d’utilisateur doit faire de 3 à 24 caractères et utiliser seulement des lettres, chiffres, points, tirets ou tirets bas.";
    }

    const usernameExists = accounts.some((account, index) =>
      index !== accountIndex &&
      normalizeUsername(account.username) === username
    );

    if (usernameExists) {
      return "Ce nom d’utilisateur est déjà utilisé.";
    }

    const phoneExists = accounts.some((account, index) =>
      index !== accountIndex &&
      normalizePhone(account.phone) === phone
    );

    if (phoneExists) {
      return "Ce numéro est déjà utilisé par un autre compte de test.";
    }

    return "";
  }

  async function hashPassword(password) {
    if (!window.crypto?.subtle || !window.TextEncoder) {
      return `demo:${password}`;
    }

    const bytes = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);

    const hash = Array.from(new Uint8Array(digest), byte =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    return `sha256:${hash}`;
  }

  async function handleInfoSubmit(event) {
    event.preventDefault();
    showFeedback(elements.infoFeedback, "");

    const accounts = readAccounts();
    const username = getCurrentUsername();
    const accountIndex = accounts.findIndex(account =>
      normalizeUsername(account.username) === username
    );

    if (accountIndex < 0) {
      showFeedback(elements.infoFeedback, "Le compte connecté est introuvable.", true);
      return;
    }

    const error = validateInfo(accounts, accountIndex);
    if (error) {
      showFeedback(elements.infoFeedback, error, true);
      return;
    }

    const account = accounts[accountIndex];
    const newUsername = normalizeUsername(elements.username.value);
    const usernameChanged = normalizeUsername(account.username) !== newUsername;

    account.lastName = elements.lastName.value.trim();
    account.firstName = elements.firstName.value.trim();
    account.displayName = `${account.firstName} ${account.lastName}`;
    account.birthDate = elements.birthDate.value;
    account.phone = elements.phone.value.trim();
    account.username = newUsername;
    account.updatedAt = new Date().toISOString();

    if (photoChanged) {
      if (currentPhoto) {
        account.profilePhoto = currentPhoto;
      } else {
        delete account.profilePhoto;
      }
    }

    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

      const session = getSessionUser();
      if (session) {
        session.username = newUsername;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    } catch {
      showFeedback(elements.infoFeedback, "Le navigateur n’a pas pu enregistrer les modifications.", true);
      return;
    }

    photoChanged = false;

    if (typeof window.LSHD?.recordAudit === "function") {
      window.LSHD.recordAudit(
        "Modification du profil personnel",
        "Informations du profil mises à jour."
      );
    }

    renderIdentity(account);
    showFeedback(
      elements.infoFeedback,
      usernameChanged
        ? "Informations enregistrées. Ton nouveau nom d’utilisateur est pris en compte."
        : "Tes informations ont été enregistrées."
    );
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    showFeedback(elements.passwordFeedback, "");

    const currentPassword = elements.currentPassword.value;
    const newPassword = elements.newPassword.value;
    const confirmPassword = elements.confirmPassword.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showFeedback(elements.passwordFeedback, "Remplis les trois champs pour changer ton mot de passe.", true);
      return;
    }

    if (newPassword.length < 6) {
      showFeedback(elements.passwordFeedback, "Le nouveau mot de passe doit contenir au moins 6 caractères.", true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showFeedback(elements.passwordFeedback, "La confirmation ne correspond pas au nouveau mot de passe.", true);
      return;
    }

    const accounts = readAccounts();
    const account = accounts.find(item =>
      normalizeUsername(item.username) === getCurrentUsername()
    );

    if (!account) {
      showFeedback(elements.passwordFeedback, "Le compte connecté est introuvable.", true);
      return;
    }

    if (!account.passwordHash) {
      showFeedback(
        elements.passwordFeedback,
        "Le changement de mot de passe n’est pas disponible pour ce compte de démonstration.",
        true
      );
      return;
    }

    if (await hashPassword(currentPassword) !== account.passwordHash) {
      showFeedback(elements.passwordFeedback, "Le mot de passe actuel est incorrect.", true);
      return;
    }

    account.passwordHash = await hashPassword(newPassword);
    account.updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      showFeedback(elements.passwordFeedback, "Le navigateur n’a pas pu enregistrer le nouveau mot de passe.", true);
      return;
    }

    elements.passwordForm.reset();

    if (typeof window.LSHD?.recordAudit === "function") {
      window.LSHD.recordAudit(
        "Modification du mot de passe",
        "Le mot de passe du compte a été modifié."
      );
    }

    showFeedback(elements.passwordFeedback, "Ton mot de passe a été modifié.");
  }

  async function handlePhotoSelection() {
    const file = elements.photoInput.files?.[0];
    if (!file) return;

    try {
      currentPhoto = await resizePhoto(file);
      photoChanged = true;

      const account = getCurrentAccount() || {};
      setAvatar(elements.photoPreview, account, currentPhoto);
      setAvatar(elements.avatar, account, currentPhoto);

      showFeedback(
        elements.infoFeedback,
        "Photo sélectionnée. Enregistre tes informations pour la conserver."
      );
    } catch (error) {
      elements.photoInput.value = "";
      showFeedback(
        elements.infoFeedback,
        error.message || "La photo n’a pas pu être chargée.",
        true
      );
    }
  }

  function removePhoto() {
    currentPhoto = "";
    photoChanged = true;
    elements.photoInput.value = "";

    const account = getCurrentAccount() || {};
    setAvatar(elements.photoPreview, account, "");
    setAvatar(elements.avatar, account, "");

    showFeedback(
      elements.infoFeedback,
      "Photo retirée. Enregistre tes informations pour confirmer."
    );
  }

  function initialize() {
    if (!elements.infoForm || !elements.passwordForm) return;

    loadProfile();

    elements.infoForm.addEventListener("submit", handleInfoSubmit);
    elements.passwordForm.addEventListener("submit", handlePasswordSubmit);
    elements.photoInput.addEventListener("change", handlePhotoSelection);
    elements.removePhoto.addEventListener("click", removePhoto);
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();