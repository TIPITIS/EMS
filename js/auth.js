"use strict";

const AUTH_ACCOUNTS_KEY = "lshd-demo-accounts";
const AUTH_SESSION_KEY = "lshd-demo-user";
const MAX_REGISTERED_TEST_ACCOUNTS = 5;

function readAuthAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY) || "[]");
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function registeredTestAccounts(accounts) {
  return accounts.filter(account => account.createdBySignup === true);
}

function showAuthFeedback(element, message, state = "error") {
  if (!element) return;

  element.textContent = message;
  element.dataset.state = state;
}

async function makePasswordHash(password) {
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

function updateAccountLimit() {
  const label = document.querySelector("#account-capacity");
  const button = document.querySelector("#register-submit");

  if (!label || !button) return;

  const count = registeredTestAccounts(readAuthAccounts()).length;
  const full = count >= MAX_REGISTERED_TEST_ACCOUNTS;

  label.textContent = full
    ? `La limite de ${MAX_REGISTERED_TEST_ACCOUNTS} comptes de test est atteinte.`
    : `${count} compte${count > 1 ? "s" : ""} créé${count > 1 ? "s" : ""} sur ${MAX_REGISTERED_TEST_ACCOUNTS}.`;

  label.dataset.state = full ? "full" : "";
  button.disabled = full;
}

function localDateString() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function auditAuth(action, details, username) {
  if (window.LSHD?.recordAudit) {
    window.LSHD.recordAudit(action, details, null, username || "Nom non renseigné");
  }
}

async function handleLogin(form) {
  const feedback = document.querySelector("#login-feedback");
  const usernameInput = form.querySelector("#username");
  const passwordInput = form.querySelector("#password");

  const username = normalizeUsername(usernameInput.value);
  const password = passwordInput.value;

  showAuthFeedback(feedback, "");

  if (!username || !password) {
    showAuthFeedback(feedback, "Saisis ton nom d’utilisateur et ton mot de passe.");
    return;
  }

  const accounts = readAuthAccounts();
  const savedAccount = accounts.find(account =>
    normalizeUsername(account.username) === username
  );

  let validAccount = null;

  if (savedAccount?.passwordHash) {
    const passwordHash = await makePasswordHash(password);

    if (savedAccount.passwordHash === passwordHash) {
      validAccount = savedAccount;
    }
  }

  // Le compte développeur historique reste utilisable pour les tests.
  if (!validAccount && username === "dev" && password === "1212") {
    validAccount = {
      username: "dev",
      role: "dev",
      primaryRole: "dev",
      subpermissions: []
    };
  }

  if (!validAccount) {
    auditAuth(
      "Échec de connexion",
      "Nom d’utilisateur ou mot de passe incorrect",
      username
    );
    showAuthFeedback(feedback, "Nom d’utilisateur ou mot de passe incorrect.");
    return;
  }

  const primaryRole =
    validAccount.primaryRole ||
    validAccount.role ||
    "interne";

  const connectedUser = {
    username: validAccount.username,
    role: primaryRole,
    roles: [primaryRole],
    permissions: Array.isArray(validAccount.subpermissions)
      ? validAccount.subpermissions
      : []
  };

  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(connectedUser));

  auditAuth(
    "Connexion réussie",
    "Connexion à l’espace professionnel",
    connectedUser.username
  );

  window.location.href = "espace_pro/espace.html#accueil";
}

async function handleRegistration(form) {
  const feedback = document.querySelector("#register-feedback");
  const birthDateInput = form.querySelector("#birth-date");

  const lastName = form.querySelector("#last-name").value.trim();
  const firstName = form.querySelector("#first-name").value.trim();
  const birthDate = birthDateInput.value;
  const phoneInput = form.querySelector("#phone").value.trim();
  const phone = normalizePhone(phoneInput);
  const username = normalizeUsername(form.querySelector("#new-username").value);
  const password = form.querySelector("#new-password").value;

  showAuthFeedback(feedback, "");

  const accounts = readAuthAccounts();
  const registeredAccounts = registeredTestAccounts(accounts);

  if (registeredAccounts.length >= MAX_REGISTERED_TEST_ACCOUNTS) {
    updateAccountLimit();
    showAuthFeedback(
      feedback,
      `Tu as atteint la limite de ${MAX_REGISTERED_TEST_ACCOUNTS} comptes de test.`
    );
    return;
  }

  if (!lastName || !firstName || !birthDate || !phoneInput || !username || !password) {
    showAuthFeedback(feedback, "Remplis tous les champs pour créer le compte.");
    return;
  }

  if (phone.length < 5 || phone.length > 15) {
    showAuthFeedback(feedback, "Vérifie le numéro : il doit contenir entre 5 et 15 chiffres.");
    return;
  }

  if (birthDate > localDateString()) {
    showAuthFeedback(feedback, "La date de naissance ne peut pas être dans le futur.");
    return;
  }

  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    showAuthFeedback(
      feedback,
      "Le nom d’utilisateur doit faire de 3 à 24 caractères et utiliser seulement des lettres, chiffres, points, tirets ou tirets bas."
    );
    return;
  }

  if (password.length < 6) {
    showAuthFeedback(feedback, "Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  if (accounts.some(account =>
    normalizeUsername(account.username) === username
  )) {
    showAuthFeedback(feedback, "Ce nom d’utilisateur est déjà utilisé.");
    return;
  }

  if (registeredAccounts.some(account =>
    normalizePhone(account.phone) === phone
  )) {
    showAuthFeedback(feedback, "Ce numéro est déjà utilisé par un compte de test.");
    return;
  }

  const accountId = `LSHD-${Date.now()}`;
  const account = {
    username,
    displayName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    birthDate,
    phone,
    accountId,
    role: "interne",
    primaryRole: "interne",
    subpermissions: [],
    passwordHash: await makePasswordHash(password),
    createdAt: new Date().toISOString(),
    createdBySignup: true
  };

  try {
    localStorage.setItem(
      AUTH_ACCOUNTS_KEY,
      JSON.stringify([...accounts, account])
    );
  } catch {
    showAuthFeedback(
      feedback,
      "Le navigateur n’a pas pu enregistrer le compte. Vérifie son espace de stockage."
    );
    return;
  }

  auditAuth("Création de compte", "Compte de test créé", username);

  form.reset();
  updateAccountLimit();

  showAuthFeedback(
    feedback,
    "Compte créé. Tu peux maintenant te connecter avec ton nom d’utilisateur et ton mot de passe.",
    "success"
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.querySelector("#birth-date");
  if (dateInput) dateInput.max = localDateString();

  updateAccountLimit();
});

document.addEventListener("submit", event => {
  const form = event.target;

  if (form.id !== "login-form" && form.id !== "register-form") return;

  // Empêche les anciens gestionnaires de démo de bloquer les formulaires.
  event.preventDefault();
  event.stopImmediatePropagation();

  if (form.id === "login-form") {
    handleLogin(form);
  } else {
    handleRegistration(form);
  }
}, true);