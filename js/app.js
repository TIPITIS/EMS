// JavaScript commun du site LSHD.
// La session, les logs et les permissions sont stockés dans le navigateur.
// Cette version est une démonstration : elle ne protège pas de vraies données.

"use strict";

const LSHD_KEYS = {
  session: "lshd-demo-user",
  accounts: "lshd-demo-accounts",
  logs: "lshd-audit-logs"
};

function safeReadJson(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizePermission(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const aliases = {
    developpeur: "dev",
    developer: "dev",
    administrateur: "admin",
    administrator: "admin",
    directeur_general: "directeur",
    corps_medical: "corp_medical",
    medical: "corp_medical",
    psychologue: "psychologie",
    chirurgie: "chirurgie",
    chirurgien: "chirurgie",
    generaliste: "generaliste",
    auxiliaire_de_soin: "auxiliaire_soin"
  };

  return aliases[key] || key;
}

function readStoredAccounts() {
  const accounts = safeReadJson(localStorage, LSHD_KEYS.accounts, []);
  return Array.isArray(accounts) ? accounts : [];
}

function readUser() {
  const sessionUser = safeReadJson(sessionStorage, LSHD_KEYS.session, null);
  if (!sessionUser) return null;

  const accounts = readStoredAccounts();
  const savedAccount = accounts.find(account =>
    String(account.username || "").toLowerCase() ===
    String(sessionUser.username || "").toLowerCase()
  );

  if (!savedAccount) return sessionUser;

  const primaryRole =
    savedAccount.primaryRole || savedAccount.role || sessionUser.role;

  const subpermissions = Array.isArray(savedAccount.subpermissions)
    ? savedAccount.subpermissions
    : [];

  return {
    ...sessionUser,
    role: primaryRole,
    roles: primaryRole ? [primaryRole] : [],
    permissions: subpermissions
  };
}

function getUserPermissions(user) {
  if (!user) return [];

  const values = []
    .concat(Array.isArray(user.roles) ? user.roles : [])
    .concat(user.role ? [user.role] : [])
    .concat(Array.isArray(user.permissions) ? user.permissions : []);

  return [...new Set(values.map(normalizePermission).filter(Boolean))];
}

function userCanAccess(rule, user) {
  if (!user) return false;

  const permissions = getUserPermissions(user);
  const fullAccess = permissions.some(permission =>
    ["dev", "admin", "directeur"].includes(permission)
  );

  if (fullAccess) return true;

  const required = String(rule || "connected")
    .split("|")
    .map(normalizePermission)
    .filter(Boolean);

  if (required.length === 0 || required.includes("connected")) {
    return true;
  }

  return required.some(permission => permissions.includes(permission));
}

function getLoginUrl() {
  if (document.body.dataset.loginUrl) {
    return document.body.dataset.loginUrl;
  }

  const parts = window.location.pathname.split("/").filter(Boolean);
  const professionalIndex = parts.lastIndexOf("espace_pro");

  if (professionalIndex >= 0) {
    const nestedFolders = Math.max(0, parts.length - professionalIndex - 2);
    return "../".repeat(nestedFolders + 1) + "connexion.html";
  }

  return "connexion.html";
}

function recordAudit(action, details, actorOverride, accountOverride) {
  const currentUser = actorOverride || readUser();
  const now = new Date();

  const entry = {
    id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    timestamp: now.toISOString(),
    account: accountOverride || currentUser?.username || "Anonyme",
    role: currentUser?.role || "Non connecté",
    action: String(action || "Action"),
    details: String(details || ""),
    page: window.location.pathname
  };

  const logs = safeReadJson(localStorage, LSHD_KEYS.logs, []);
  const updatedLogs = Array.isArray(logs) ? logs : [];
  updatedLogs.unshift(entry);

  try {
    localStorage.setItem(
      LSHD_KEYS.logs,
      JSON.stringify(updatedLogs.slice(0, 5000))
    );
  } catch {
    // Si le stockage est plein, on ne bloque pas le fonctionnement du site.
  }

  return entry;
}

window.LSHD = {
  keys: LSHD_KEYS,
  normalizePermission,
  getUserPermissions,
  userCanAccess,
  readUser,
  readStoredAccounts,
  recordAudit,
  readAuditLogs() {
    const logs = safeReadJson(localStorage, LSHD_KEYS.logs, []);
    return Array.isArray(logs) ? logs : [];
  }
};

function redirectToLogin() {
  window.location.replace(getLoginUrl());
}

function closeDropdown(group) {
  if (!group) return;

  group.classList.remove("open");

  const button = group.querySelector(".nav-group-button");
  if (button) button.setAttribute("aria-expanded", "false");
}

function closeAllDropdowns(exceptGroup) {
  document.querySelectorAll(".nav-group.open").forEach(group => {
    if (group !== exceptGroup) closeDropdown(group);
  });
}

function setupDropdowns() {
  const desktopPointer = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (min-width: 761px)"
  );

  document.querySelectorAll(".nav-group").forEach(group => {
    const button = group.querySelector(".nav-group-button");
    if (!button) return;

    button.addEventListener("click", event => {
      event.preventDefault();

      const shouldOpen = !group.classList.contains("open");
      closeAllDropdowns(group);

      group.classList.toggle("open", shouldOpen);
      button.setAttribute("aria-expanded", String(shouldOpen));
    });

    group.addEventListener("pointerleave", () => {
      if (desktopPointer.matches) closeDropdown(group);
    });

    group.addEventListener("focusout", event => {
      if (desktopPointer.matches && !group.contains(event.relatedTarget)) {
        closeDropdown(group);
      }
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".nav-group")) closeAllDropdowns();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeAllDropdowns();
  });
}

function applyAccessRules(user) {
  document.querySelectorAll("[data-access]").forEach(element => {
    const allowed = userCanAccess(element.dataset.access, user);
    element.hidden = !allowed;
    element.setAttribute("aria-hidden", String(!allowed));
  });

  document.querySelectorAll(".nav-group").forEach(group => {
    const hasVisibleLink = [...group.querySelectorAll(".nav-dropdown a")]
      .some(link => !link.hidden);

    group.hidden = !hasVisibleLink;
    if (!hasVisibleLink) closeDropdown(group);
  });
}

const demoAccounts = [
  {
    username: "dev",
    password: "1212",
    role: "Développeur"
  }
];

function setupLogin() {
  const form = document.querySelector("#login-form");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const username = form.querySelector("#username").value.trim();
    const password = form.querySelector("#password").value;
    const feedback = document.querySelector("#login-feedback");

    const account = demoAccounts.find(item =>
      item.username === username && item.password === password
    );

    if (!account) {
      recordAudit(
        "Échec de connexion",
        "Identifiant ou mot de passe incorrect",
        null,
        username || "Nom non renseigné"
      );

      if (feedback) {
        feedback.textContent =
          "Nom d’utilisateur ou mot de passe incorrect.";
      }
      return;
    }

    const connectedUser = {
      username: account.username,
      role: account.role
    };

    sessionStorage.setItem(
      LSHD_KEYS.session,
      JSON.stringify(connectedUser)
    );

    recordAudit(
      "Connexion réussie",
      "Connexion à l’espace professionnel",
      connectedUser
    );

    window.location.href = "espace_pro/espace.html#accueil";
  });
}

const workspacePages = {
  accueil: {
    title: "Accueil",
    description: "Les outils et les informations du LSHD.",
    home: true,
    access: "connected"
  },
  patients: {
    title: "Patients",
    description: "Accès aux rubriques de suivi.",
    message: "Les outils de suivi seront ajoutés dans une prochaine étape.",
    access: "connected"
  },
  agenda: {
    title: "Agenda",
    description: "Réunions, formations et événements du service.",
    message: "Aucun événement n’est affiché pour le moment.",
    access: "connected"
  },
  "psy-pplh": {
    title: "PPLH",
    description: "Évaluations liées au PPLH.",
    message: "Le fichier PPLH sera ajouté ici.",
    access: "psychologie"
  },
  "formation-medicale": {
    title: "Formation médicale",
    description: "Supports de formation du service.",
    message: "Les supports de formation seront classés ici.",
    access: "corp_medical"
  },
  chirurgie: {
    title: "Chirurgie",
    description: "Informations et supports de chirurgie.",
    message: "Les formations et procédures seront ajoutées ici.",
    access: "chirurgie"
  },
  generaliste: {
    title: "Médecine générale",
    description: "Informations de médecine générale.",
    message: "Les supports seront ajoutés ici.",
    access: "generaliste"
  },
  kinesitherapie: {
    title: "Kinésithérapie",
    description: "Informations de kinésithérapie.",
    message: "Les supports seront ajoutés ici.",
    access: "kinesitherapie"
  },
  "doc-visite": {
    title: "Visite médicale",
    description: "Préparer un compte rendu de visite.",
    message: "Cette rubrique sera complétée dans une prochaine étape.",
    access: "corp_medical"
  },
  "doc-arret": {
    title: "Arrêt de travail",
    description: "Préparer une attestation pour le jeu de rôle.",
    message: "Cette rubrique sera complétée dans une prochaine étape.",
    access: "corp_medical"
  },
  "doc-blessures": {
    title: "Coups et blessures",
    description: "Préparer un compte rendu des blessures.",
    message: "Cette rubrique sera complétée dans une prochaine étape.",
    access: "medecin"
  },
  "doc-deces": {
    title: "Certificat de décès",
    description: "Préparer les informations du certificat.",
    message: "Cette rubrique sera complétée dans une prochaine étape.",
    access: "medecin_senior|responsable"
  },
  "doc-registre": {
    title: "Registre des documents",
    description: "Documents préparés dans cette maquette.",
    message: "Aucun document n’est conservé par le site.",
    access:
      "police|medecin|chirurgie|medecin_senior|responsable|directeur_adjoint"
  },
  personnel: {
    title: "Mon espace personnel",
    description: "Informations liées à ton compte LSHD.",
    message:
      "Le profil, le contrat, le règlement, le salaire et les primes seront regroupés ici.",
    access: "connected"
  },
  "haut-grade": {
    title: "Haut grade",
    description: "Outils réservés aux responsables.",
    message: "Les annonces, les avis et les permissions seront regroupés ici.",
    access: "medecin_senior|responsable|directeur_adjoint"
  },
  "dev-logs": {
    title: "Logs développeur",
    description: "Journal des activités du site.",
    message: "Le journal complet est disponible dans la page Logs.",
    access: "dev|admin|directeur"
  },
  parametres: {
    title: "Paramètres",
    description: "Préférences de l’espace professionnel.",
    message: "Les paramètres du compte seront ajoutés ici.",
    access: "connected"
  }
};

function createWorkspaceCard(title, description, pageId) {
  const link = document.createElement("a");
  link.className = "workspace-card";
  link.href = "#" + pageId;
  link.dataset.pageLink = pageId;

  const heading = document.createElement("strong");
  heading.textContent = title;

  const text = document.createElement("span");
  text.textContent = description;

  link.append(heading, text);
  return link;
}

function renderWorkspacePage(user) {
  const content = document.querySelector("#workspace-content");
  const title = document.querySelector("#workspace-title");
  const description = document.querySelector("#workspace-description");

  if (!content || !title || !description) return;

  const pageId = window.location.hash.slice(1) || "accueil";
  const page = workspacePages[pageId] || {
    title: "Page à définir",
    description: "",
    message: "Cette rubrique sera complétée plus tard.",
    access: "connected"
  };

  if (!userCanAccess(page.access, user)) {
    window.location.hash = "#accueil";
    return;
  }

  title.textContent = page.title;
  description.textContent = page.description;

  document.querySelectorAll("[data-page-link]").forEach(link => {
    link.classList.toggle("active", link.dataset.pageLink === pageId);
  });

  content.replaceChildren();

  if (page.home) {
    const intro = document.createElement("div");
    intro.className = "welcome-panel";

    const greeting = document.createElement("p");
    const identity = getProfileIdentity(user);
    greeting.textContent =
      "Bienvenue, " +
      (identity.displayName || user.username || "membre") +
      ", dans ton espace professionnel.";

    const note = document.createElement("p");
    note.textContent =
      "Choisis une rubrique autorisée dans le menu pour accéder aux outils du LSHD.";

    intro.append(greeting, note);

    const cards = document.createElement("div");
    cards.className = "workspace-cards";

    const shortcuts = [
      ["Patients", "Accéder à l’espace patients.", "patients", "connected"],
      ["Agenda", "Voir les dates du service.", "agenda", "connected"],
      ["PPLH", "Ouvrir la rubrique psychologie.", "psy-pplh", "psychologie"],
      [
        "Formation médicale",
        "Retrouver les supports.",
        "formation-medicale",
        "corp_medical"
      ],
      ["Chirurgie", "Outils du pôle chirurgie.", "chirurgie", "chirurgie"],
      [
        "Mon espace personnel",
        "Informations de ton compte.",
        "personnel",
        "connected"
      ]
    ];

    shortcuts.forEach(item => {
      if (userCanAccess(item[3], user)) {
        cards.append(createWorkspaceCard(item[0], item[1], item[2]));
      }
    });

    content.append(intro, cards);
    return;
  }

  const panel = document.createElement("div");
  panel.className = "empty-panel";

  const icon = document.createElement("span");
  icon.className = "empty-panel-icon";
  icon.textContent = "✚";

  const message = document.createElement("p");
  message.textContent = page.message;

  panel.append(icon, message);
  content.append(panel);
}

const PROFILE_ROLE_LABELS = {
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

const PROFILE_ROLE_PREFIXES = {
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

function getAccountForUser(user) {
  const username = String(user?.username || "").trim().toLowerCase();
  if (!username) return null;

  return readStoredAccounts().find(account =>
    String(account.username || "").trim().toLowerCase() === username
  ) || null;
}

function getProfileIdentity(user) {
  const account = getAccountForUser(user);
  const role = normalizePermission(
    account?.primaryRole || account?.role || user?.role || ""
  );

  const firstName = String(account?.firstName || "").trim();
  const lastName = String(account?.lastName || "").trim();

  const baseName = firstName && lastName
    ? firstName.charAt(0).toLocaleUpperCase("fr-FR") + ". " + lastName
    : lastName ||
      firstName ||
      account?.displayName ||
      user?.username ||
      "Membre";

  const prefix = PROFILE_ROLE_PREFIXES[role];

  return {
    account,
    role,
    displayName: prefix ? prefix + " " + baseName : baseName,
    roleLabel: PROFILE_ROLE_LABELS[role] || user?.role || "Personnel médical",
    initial: (firstName || lastName || user?.username || "?")
      .charAt(0)
      .toLocaleUpperCase("fr-FR"),
    photo: String(account?.profilePhoto || "")
  };
}

function installProfileHeaderStyles() {
  if (document.querySelector("#lshd-profile-header-styles")) return;

  const style = document.createElement("style");
  style.id = "lshd-profile-header-styles";
  style.textContent = `
    .workspace-user.profile-header-user {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .workspace-user .profile-header-card {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 190px;
      max-width: 340px;
      padding: 7px 12px 7px 8px;
      border: 1px solid var(--line, #d6e3ec);
      border-radius: 12px;
      background: var(--white, #fff);
    }

    .workspace-user .profile-header-avatar {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      overflow: hidden;
      width: 42px;
      height: 42px;
      border: 1px solid #cfe4f1;
      border-radius: 50%;
      color: var(--navy-light, #357eb3);
      background: #e9f4fb;
      font-weight: 700;
    }

    .workspace-user .profile-header-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .workspace-user .profile-header-identity {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 3px;
    }

    .workspace-user .profile-header-identity [data-user-name] {
      overflow: hidden;
      color: var(--navy, #173d5c);
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .workspace-user .profile-header-identity [data-user-role] {
      color: var(--muted, #62788a);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    @media (max-width: 760px) {
      .workspace-user .profile-header-card {
        min-width: 0;
        max-width: 220px;
        padding: 5px 8px 5px 5px;
        gap: 7px;
      }

      .workspace-user .profile-header-avatar {
        width: 36px;
        height: 36px;
      }

      .workspace-user .profile-header-identity [data-user-name] {
        max-width: 125px;
        font-size: 12px;
      }

      .workspace-user .profile-header-identity [data-user-role] {
        font-size: 9px;
      }
    }
  `;

  document.head.append(style);
}

function renderWorkspaceIdentity(user) {
  const identity = getProfileIdentity(user);
  const header = document.querySelector(".workspace-user");

  document.querySelectorAll("[data-user-name]").forEach(element => {
    element.textContent = identity.displayName;
  });

  document.querySelectorAll("[data-user-role]").forEach(element => {
    element.textContent = identity.roleLabel;
  });

  if (!header) return;

  let card = header.querySelector(".profile-header-card");

  if (!card) {
    const oldAvatar = header.querySelector(".user-avatar");
    const oldInfo = header.querySelector(".user-info");

    if (!oldAvatar || !oldInfo) return;

    card = document.createElement("div");
    card.className = "profile-header-card";

    oldAvatar.classList.add("profile-header-avatar");
    oldInfo.classList.add("profile-header-identity");

    card.append(oldAvatar, oldInfo);
    header.insertBefore(card, header.firstChild);
  }

  header.classList.add("profile-header-user");
  card.setAttribute("aria-label", "Profil de " + identity.displayName);

  const avatar = card.querySelector(
    ".profile-header-avatar, #profile-avatar"
  );

  if (avatar) {
    avatar.replaceChildren();

    if (identity.photo) {
      const image = document.createElement("img");
      image.src = identity.photo;
      image.alt = "";
      avatar.append(image);
    } else {
      avatar.textContent = identity.initial;
    }
  }
}

function setupWorkspace(user) {
  const isProtected = document.body.hasAttribute("data-protected-page");
  const pageAccess = document.body.dataset.access || "connected";

  if (!isProtected && !document.body.dataset.access) return;

  if (!user) {
    redirectToLogin();
    return;
  }

  if (!userCanAccess(pageAccess, user)) {
    window.location.replace(getLoginUrl());
    return;
  }

  installProfileHeaderStyles();
  renderWorkspaceIdentity(user);
  applyAccessRules(user);

  if (document.querySelector(".workspace-nav")) {
    setupDropdowns();
  }

  const menuButton = document.querySelector(".workspace-menu-toggle");
  const navigation = document.querySelector(".workspace-nav");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));

      menuButton.querySelector("span").textContent =
        isOpen ? "Fermer le menu" : "Ouvrir le menu";
    });
  }

  recordAudit("Consultation de page", document.title, user);

  renderWorkspacePage(user);

  window.addEventListener("hashchange", () => {
    recordAudit("Navigation interne", window.location.hash, user);
    renderWorkspacePage(user);
  });
}

function setupAuditCapture() {
  document.addEventListener("click", event => {
    if (document.body.hasAttribute("data-audit-ignore")) return;
    if (event.target.closest("[data-audit-ignore]")) return;

    const target = event.target.closest("a, button");
    if (!target || target.hasAttribute("data-logout")) return;

    const label = (
      target.innerText ||
      target.getAttribute("aria-label") ||
      ""
    )
      .trim()
      .replace(/\s+/g, " ");

    if (label) {
      recordAudit(
        target.tagName === "A" ? "Clic sur un lien" : "Clic sur un bouton",
        label
      );
    }
  });

  document.addEventListener("change", event => {
    if (document.body.hasAttribute("data-audit-ignore")) return;
    if (event.target.closest("[data-audit-ignore]")) return;

    const field = event.target;

    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }

    if (field.type === "password") return;

    const label =
      field.labels?.[0]?.innerText ||
      field.name ||
      field.id ||
      "Champ";

    recordAudit("Modification d’un champ", label.trim());
  });

  document.addEventListener("submit", event => {
    if (event.target.id === "login-form") return;
    if (event.target.closest("[data-audit-ignore]")) return;

    const formName =
      event.target.getAttribute("aria-label") ||
      event.target.id ||
      event.target.className ||
      "Formulaire";

    recordAudit("Envoi d’un formulaire", String(formName));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-year]").forEach(element => {
    element.textContent = new Date().getFullYear();
  });

  const user = readUser();

  const publicMenuButton = document.querySelector(".menu-toggle");
  const publicNavigation = document.querySelector(".main-nav");

  if (publicMenuButton && publicNavigation) {
    publicMenuButton.addEventListener("click", () => {
      const isOpen = publicNavigation.classList.toggle("open");
      publicMenuButton.setAttribute("aria-expanded", String(isOpen));
    });
  }

  setupLogin();

  document.querySelectorAll("[data-logout]").forEach(button => {
    button.addEventListener("click", () => {
      recordAudit("Déconnexion", "Fin de session", user);
      sessionStorage.removeItem(LSHD_KEYS.session);
      window.location.href = getLoginUrl();
    });
  });

  document.querySelectorAll(".demo-form:not(#login-form)").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();

      const feedback = form.querySelector(".form-feedback");

      if (feedback) {
        feedback.textContent =
          "Maquette de démonstration : rien n’est enregistré ou envoyé.";
      }
    });
  });

  setupAuditCapture();
  setupWorkspace(user);
});