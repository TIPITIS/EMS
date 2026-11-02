// JavaScript commun du site LSHD.
// La session et les rôles sont stockés dans le navigateur.
// Cette maquette ne protège pas de vraies données.

"use strict";

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

function readUser() {
  try {
    return JSON.parse(sessionStorage.getItem("lshd-demo-user") || "null");
  } catch {
    sessionStorage.removeItem("lshd-demo-user");
    return null;
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
    psychologue: "psychologie"
  };

  return aliases[key] || key;
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
  const hasFullAccess = permissions.some(permission =>
    ["dev", "admin", "directeur"].includes(permission)
  );

  if (hasFullAccess) return true;

  const required = String(rule || "connected")
    .split("|")
    .map(normalizePermission)
    .filter(Boolean);

  if (required.length === 0 || required.includes("connected")) {
    return true;
  }

  return required.some(permission => permissions.includes(permission));
}

function redirectToLogin() {
  window.location.replace(getLoginUrl());
}

function closeDropdown(group) {
  if (!group) return;

  group.classList.remove("open");

  const button = group.querySelector(".nav-group-button");
  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
}

function closeAllDropdowns(exceptGroup) {
  document.querySelectorAll(".nav-group.open").forEach(group => {
    if (group !== exceptGroup) {
      closeDropdown(group);
    }
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
      if (desktopPointer.matches) {
        closeDropdown(group);
      }
    });

    group.addEventListener("focusout", event => {
      if (
        desktopPointer.matches &&
        !group.contains(event.relatedTarget)
      ) {
        closeDropdown(group);
      }
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".nav-group")) {
      closeAllDropdowns();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeAllDropdowns();
    }
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

    if (!hasVisibleLink) {
      closeDropdown(group);
    }
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
      if (feedback) {
        feedback.textContent = "Nom d’utilisateur ou mot de passe incorrect.";
      }
      return;
    }

    sessionStorage.setItem(
      "lshd-demo-user",
      JSON.stringify({
        username: account.username,
        role: account.role
      })
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
    message: "Les supports liés au PPLH seront ajoutés ici.",
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
    access: "police|medecin|chirurgie|medecin_senior|responsable|directeur_adjoint"
  },
  personnel: {
    title: "Mon espace personnel",
    description: "Informations liées à ton compte LSHD.",
    message: "Le profil, le contrat, le règlement, le salaire et les primes seront regroupés ici.",
    access: "connected"
  },
  "haut-grade": {
    title: "Haut grade",
    description: "Outils réservés aux responsables.",
    message: "Les avis et la gestion des permissions seront ajoutés ici.",
    access: "medecin_senior|responsable|directeur_adjoint"
  },
  "dev-logs": {
    title: "Logs développeur",
    description: "Journal technique du site.",
    message: "Aucun journal technique n’est conservé dans cette maquette.",
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
    greeting.textContent =
      "Bienvenue, " + (user.username || "membre") + ", dans ton espace professionnel.";

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
      ["Formation médicale", "Retrouver les supports.", "formation-medicale", "corp_medical"],
      ["Chirurgie", "Outils du pôle chirurgie.", "chirurgie", "chirurgie"],
      ["Mon espace personnel", "Informations de ton compte.", "personnel", "connected"]
    ];

    shortcuts.forEach(item => {
      if (!userCanAccess(item[3], user)) return;

      const card = createWorkspaceCard(item[0], item[1], item[2]);
      cards.append(card);
    });

    content.append(intro, cards);
    return;
  }

  const panel = document.createElement("div");
  panel.className = "empty-panel";

  const icon = document.createElement("span");
  icon.className = "empty-panel-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "✚";

  const message = document.createElement("p");
  message.textContent = page.message;

  panel.append(icon, message);
  content.append(panel);
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

  document.querySelectorAll("[data-user-name]").forEach(element => {
    element.textContent = user.username || "Membre";
  });

  document.querySelectorAll("[data-user-role]").forEach(element => {
    element.textContent =
      user.role ||
      (Array.isArray(user.roles) ? user.roles.join(", ") : "") ||
      "Personnel médical";
  });

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

    navigation.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 760px)").matches) {
          navigation.classList.remove("open");
          menuButton.setAttribute("aria-expanded", "false");
          menuButton.querySelector("span").textContent = "Ouvrir le menu";
        }
      });
    });
  }

  renderWorkspacePage(user);
  window.addEventListener("hashchange", () => renderWorkspacePage(user));
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
      sessionStorage.removeItem("lshd-demo-user");
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

  setupWorkspace(user);
});