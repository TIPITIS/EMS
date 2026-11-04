"use strict";

(() => {
  const ACCOUNTS_KEY = "lshd-demo-accounts";
  const SESSION_KEY = "lshd-demo-user";

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

  const ROLE_OPTIONS = [
    ["directeur", "Directeur"],
    ["directeur_adjoint", "Directeur adjoint"],
    ["responsable", "Responsable"],
    ["medecin_senior", "Médecin senior"],
    ["medecin", "Médecin"],
    ["medecin_junior", "Médecin junior"],
    ["interne", "Interne"],
    ["infirmier", "Infirmier"],
    ["auxiliaire_soin", "Auxiliaire de soin"],
    ["directeur_irs", "Directeur IRS"],
    ["police", "Police"],
    ["avocat", "Avocat"],
    ["admin", "Administrateur"],
    ["dev", "Développeur"]
  ];

  const SUBPERMISSIONS = [
    ["corp_medical", "Corps médical"],
    ["psychologie", "Psychologie"],
    ["chirurgie", "Chirurgie"],
    ["generaliste", "Généraliste"]
  ];

  function readAccounts() {
    try {
      const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
      return Array.isArray(accounts) ? accounts : [];
    } catch {
      return [];
    }
  }

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function normalise(value) {
    return window.LSHD?.normalizePermission
      ? window.LSHD.normalizePermission(value)
      : String(value || "").trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "Non renseignée";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Non renseignée";

    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(date);
  }

  function renderAccountsPage() {
    if (window.location.hash !== "#dev-comptes") return;

    const user = window.LSHD?.readUser?.() || readSession();
    const canOpen = window.LSHD?.userCanAccess?.(
      "dev|admin|directeur",
      user
    );

    if (!canOpen) {
      window.location.hash = "#accueil";
      return;
    }

    const content = document.querySelector("#workspace-content");
    const title = document.querySelector("#workspace-title");
    const description = document.querySelector("#workspace-description");

    if (!content || !title || !description) return;

    title.textContent = "Gestion des comptes";
    description.textContent =
      "Consulter et modifier les comptes de test du LSHD.";

    document.querySelectorAll("[data-page-link]").forEach(link => {
      link.classList.toggle(
        "active",
        link.dataset.pageLink === "dev-comptes"
      );
    });

    const accounts = readAccounts();
    const page = document.createElement("div");
    page.className = "dev-accounts-page";

    const notice = document.createElement("div");
    notice.className = "notice notice-warning";
    notice.innerHTML =
      "<strong>Mode démonstration :</strong> les comptes sont stockés dans ce navigateur. " +
      "Les mots de passe ne sont jamais affichés.";

    const listPanel = document.createElement("section");
    listPanel.className = "dev-accounts-panel";
    listPanel.innerHTML =
      "<h2>Comptes enregistrés</h2>" +
      '<p class="dev-accounts-description">Recherche un compte, puis sélectionne-le pour modifier son profil ou son rôle.</p>' +
      '<div class="dev-accounts-filters">' +
        '<label class="admin-field"><span>Rechercher</span>' +
          '<input id="dev-account-search" type="search" placeholder="Nom, prénom, identifiant ou numéro"></label>' +
        '<label class="admin-field"><span>Filtrer par rôle</span>' +
          '<select id="dev-account-role"><option value="">Tous les rôles</option></select></label>' +
      "</div>" +
      '<p class="dev-accounts-count" id="dev-account-count"></p>' +
      '<div class="dev-accounts-table-wrap">' +
        '<table class="dev-accounts-table">' +
          "<thead><tr>" +
            "<th>Nom</th><th>Nom d’utilisateur</th><th>Rôle</th>" +
            "<th>Création du compte</th><th>Dernière connexion</th>" +
          "</tr></thead>" +
          '<tbody id="dev-account-rows"></tbody>' +
        "</table>" +
      "</div>" +
      '<p class="empty-state" id="dev-account-empty" hidden>Aucun compte ne correspond à la recherche.</p>';

    const detailsPanel = document.createElement("section");
    detailsPanel.className = "dev-accounts-panel";
    detailsPanel.id = "dev-account-details";
    detailsPanel.innerHTML =
      "<h2>Sélectionne un compte</h2>" +
      '<p class="dev-accounts-description">Les informations du compte apparaîtront ici.</p>';

    page.append(notice, listPanel, detailsPanel);
    content.replaceChildren(page);

    const search = page.querySelector("#dev-account-search");
    const roleFilter = page.querySelector("#dev-account-role");
    const rows = page.querySelector("#dev-account-rows");
    const count = page.querySelector("#dev-account-count");
    const empty = page.querySelector("#dev-account-empty");

    [...new Set(accounts.map(account =>
      normalise(account.primaryRole || account.role || "interne")
    ))].forEach(role => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = ROLE_LABELS[role] || role;
      roleFilter.append(option);
    });

    let selectedUsername = "";

    function drawList() {
      const query = search.value.trim().toLocaleLowerCase("fr-FR");
      const roleValue = roleFilter.value;

      const filtered = accounts
        .map((account, index) => ({ account, index }))
        .filter(({ account }) => {
          const role = normalise(account.primaryRole || account.role || "interne");
          const name = [
            account.firstName || "",
            account.lastName || "",
            account.displayName || "",
            account.username || "",
            account.accountId || "",
            account.phone || "",
            role
          ].join(" ").toLocaleLowerCase("fr-FR");

          return (!query || name.includes(query)) &&
            (!roleValue || roleValue === role);
        });

      rows.replaceChildren();
      count.textContent =
        filtered.length + " compte" + (filtered.length > 1 ? "s" : "") +
        " affiché" + (filtered.length > 1 ? "s" : "") +
        " sur " + accounts.length + ".";
      empty.hidden = filtered.length > 0;

      filtered.forEach(({ account, index }) => {
        const row = document.createElement("tr");
        row.dataset.accountIndex = String(index);

        if (account.username === selectedUsername) {
          row.classList.add("is-selected");
        }

        const role = normalise(account.primaryRole || account.role || "interne");
        const name = [
          account.firstName || "",
          account.lastName || ""
        ].join(" ").trim() || account.displayName || "Profil à compléter";

        [
          name,
          account.username || "—",
          ROLE_LABELS[role] || role,
          formatDate(account.createdAt),
          account.lastLoginAt ? formatDate(account.lastLoginAt) : "Jamais connecté"
        ].forEach(value => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });

        row.addEventListener("click", () => showAccount(index));
        rows.append(row);
      });
    }

    function showAccount(index) {
      const account = accounts[index];
      if (!account) return;

      selectedUsername = account.username;
      drawList();

      const role = normalise(account.primaryRole || account.role || "interne");
      const subpermissions = Array.isArray(account.subpermissions)
        ? account.subpermissions.map(normalise)
        : [];

      detailsPanel.innerHTML =
        '<div class="admin-heading"><div>' +
          '<p class="eyebrow eyebrow-blue">COMPTE SÉLECTIONNÉ</p>' +
          "<h2>" +
            escapeHtml((account.firstName || "") + " " + (account.lastName || "")) +
          "</h2>" +
          '<p class="dev-accounts-description">@' +
            escapeHtml(account.username || "—") + " · " +
            escapeHtml(account.accountId || "Identifiant non renseigné") +
          "</p>" +
        "</div>" +
        '<button class="button button-outline button-small dev-account-delete" id="dev-account-delete" type="button">Supprimer le compte</button>' +
        "</div>" +

        '<div class="dev-account-meta">' +
          "<div><span>Création du compte</span><strong>" +
            escapeHtml(formatDate(account.createdAt)) +
          "</strong></div>" +
          "<div><span>Dernière connexion</span><strong>" +
            escapeHtml(account.lastLoginAt ? formatDate(account.lastLoginAt) : "Jamais connecté") +
          "</strong></div>" +
          "<div><span>Créé depuis le formulaire</span><strong>" +
            (account.createdBySignup ? "Oui" : "Non") +
          "</strong></div>" +
        "</div>" +

        '<form id="dev-account-form" class="dev-account-form">' +
          '<label class="admin-field"><span>Nom</span>' +
            '<input name="lastName" maxlength="50" required value="' +
              escapeHtml(account.lastName || "") + '"></label>' +
          '<label class="admin-field"><span>Prénom</span>' +
            '<input name="firstName" maxlength="50" required value="' +
              escapeHtml(account.firstName || "") + '"></label>' +
          '<label class="admin-field"><span>Date de naissance</span>' +
            '<input name="birthDate" type="date" value="' +
              escapeHtml(account.birthDate || "") + '"></label>' +
          '<label class="admin-field"><span>Numéro</span>' +
            '<input name="phone" type="tel" maxlength="20" value="' +
              escapeHtml(account.phone || "") + '"></label>' +
          '<label class="admin-field dev-account-full"><span>Nom d’utilisateur</span>' +
            '<input name="username" minlength="3" maxlength="24" required value="' +
              escapeHtml(account.username || "") + '"></label>' +
          '<label class="admin-field dev-account-full"><span>Permission principale</span>' +
            '<select name="primaryRole">' +
              ROLE_OPTIONS.map(([id, label]) =>
                '<option value="' + id + '"' +
                (role === id ? " selected" : "") + ">" + label + "</option>"
              ).join("") +
            "</select></label>" +
          '<fieldset class="admin-field dev-account-full"><legend>Sous-permissions cumulatives</legend>' +
            '<div class="dev-subpermission-list">' +
              SUBPERMISSIONS.map(([id, label]) =>
                '<label><input type="checkbox" name="subpermissions" value="' + id + '"' +
                (subpermissions.includes(id) ? " checked" : "") +
                "> " + label + "</label>"
              ).join("") +
            "</div>" +
          "</fieldset>" +
          '<p class="dev-account-feedback dev-account-full" id="dev-account-feedback" aria-live="polite"></p>' +
          '<div class="dev-account-actions dev-account-full">' +
            '<button class="button button-primary" type="submit">Enregistrer les modifications</button>' +
          "</div>" +
        "</form>";

      const form = detailsPanel.querySelector("#dev-account-form");
      const feedback = detailsPanel.querySelector("#dev-account-feedback");
      const deleteButton = detailsPanel.querySelector("#dev-account-delete");

      deleteButton.disabled =
        String(user?.username || "").toLowerCase() ===
        String(account.username || "").toLowerCase();

      if (deleteButton.disabled) {
        deleteButton.title =
          "Tu ne peux pas supprimer le compte actuellement connecté.";
      }

      deleteButton.addEventListener("click", () => {
        if (deleteButton.disabled) return;

        const confirmed = window.confirm(
          "Supprimer le compte « " + account.username + " » de ce navigateur ?"
        );

        if (!confirmed) return;

        const latestAccounts = readAccounts().filter(item =>
          String(item.username || "").toLowerCase() !==
          String(account.username || "").toLowerCase()
        );

        try {
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(latestAccounts));
        } catch {
          feedback.textContent = "Le navigateur n’a pas pu supprimer le compte.";
          feedback.classList.add("is-error");
          return;
        }

        window.LSHD?.recordAudit?.(
          "Suppression d’un compte",
          "Compte " + account.username + " supprimé."
        );

        renderAccountsPage();
      });

      form.addEventListener("submit", event => {
        event.preventDefault();
        feedback.textContent = "";
        feedback.classList.remove("is-error");

        const formData = new FormData(form);
        const username = String(formData.get("username") || "")
          .trim()
          .toLowerCase();

        if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
          feedback.textContent =
            "Le nom d’utilisateur doit contenir de 3 à 24 caractères autorisés.";
          feedback.classList.add("is-error");
          return;
        }

        const latestAccounts = readAccounts();
        const oldUsername = String(account.username || "").toLowerCase();

        const duplicate = latestAccounts.some(item =>
          String(item.username || "").toLowerCase() === username &&
          String(item.username || "").toLowerCase() !== oldUsername
        );

        if (duplicate) {
          feedback.textContent = "Ce nom d’utilisateur est déjà utilisé.";
          feedback.classList.add("is-error");
          return;
        }

        const accountIndex = latestAccounts.findIndex(item =>
          String(item.username || "").toLowerCase() === oldUsername
        );

        if (accountIndex < 0) {
          feedback.textContent = "Ce compte est introuvable dans le navigateur.";
          feedback.classList.add("is-error");
          return;
        }

        const updated = latestAccounts[accountIndex];
        const primaryRole = normalise(formData.get("primaryRole"));

        updated.lastName = String(formData.get("lastName") || "").trim();
        updated.firstName = String(formData.get("firstName") || "").trim();
        updated.displayName = updated.firstName + " " + updated.lastName;
        updated.birthDate = String(formData.get("birthDate") || "");
        updated.phone = String(formData.get("phone") || "").trim();
        updated.username = username;
        updated.role = primaryRole;
        updated.primaryRole = primaryRole;
        updated.subpermissions =
          formData.getAll("subpermissions").map(normalise);
        updated.updatedAt = new Date().toISOString();

        try {
          localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(latestAccounts));
        } catch {
          feedback.textContent =
            "Le navigateur n’a pas pu enregistrer les modifications.";
          feedback.classList.add("is-error");
          return;
        }

        if (String(user?.username || "").toLowerCase() === oldUsername) {
          const session = readSession();

          if (session) {
            session.username = username;
            session.role = primaryRole;
            session.roles = [primaryRole];
            session.permissions = updated.subpermissions;
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
          }
        }

        window.LSHD?.recordAudit?.(
          "Modification d’un compte",
          "Profil de " + username + " modifié. Rôle principal : " + primaryRole + "."
        );

        selectedUsername = username;
        renderAccountsPage();

        const refreshedAccounts = readAccounts();
        const refreshedIndex = refreshedAccounts.findIndex(item =>
          item.username === username
        );

        if (refreshedIndex >= 0) {
          const refreshedRows = document.querySelectorAll(
            "#dev-account-rows tr"
          );
          const match = [...refreshedRows].find(row =>
            refreshedAccounts[Number(row.dataset.accountIndex)]?.username === username
          );

          if (match) match.click();
        }
      });
    }

    search.addEventListener("input", drawList);
    roleFilter.addEventListener("change", drawList);
    drawList();
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderAccountsPage();
    window.addEventListener("hashchange", renderAccountsPage);
  });
})();