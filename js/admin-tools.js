"use strict";

const PRIMARY_ROLES = [
  { id: "dev", label: "Développeur", grantors: ["dev", "admin", "directeur"] },
  { id: "admin", label: "Admin", grantors: ["dev", "admin", "directeur"] },
  { id: "directeur", label: "Directeur", grantors: ["dev", "admin", "directeur"] },
  { id: "directeur_adjoint", label: "Directeur adjoint", grantors: ["dev", "admin", "directeur"] },
  { id: "responsable", label: "Responsable", grantors: ["dev", "admin", "directeur", "directeur_adjoint"] },
  { id: "medecin_senior", label: "Médecin senior", grantors: ["dev", "admin", "directeur", "directeur_adjoint", "responsable"] },
  { id: "medecin", label: "Médecin", grantors: ["dev", "admin", "directeur", "directeur_adjoint", "responsable"] },
  { id: "medecin_junior", label: "Médecin junior", grantors: ["dev", "admin", "directeur", "directeur_adjoint", "responsable"] },
  { id: "interne", label: "Interne", grantors: ["dev", "admin", "directeur", "directeur_adjoint", "responsable"] },
  { id: "infirmier", label: "Infirmier", grantors: ["dev", "admin", "directeur", "directeur_adjoint", "responsable"] },
  { id: "auxiliaire_soin", label: "Auxiliaire de soin", grantors: ["dev", "admin", "directeur", "directeur_adjoint", "responsable"] },
  { id: "directeur_irs", label: "Directeur IRS", grantors: ["dev", "admin", "directeur", "directeur_adjoint"] },
  { id: "police", label: "Police", grantors: ["dev", "admin", "directeur", "directeur_adjoint"] },
  { id: "avocat", label: "Avocat", grantors: ["dev", "admin", "directeur", "directeur_adjoint"] }
];

const SUBPERMISSIONS = [
  { id: "corp_medical", label: "Corps médical" },
  { id: "psychologie", label: "Psychologie" },
  { id: "chirurgie", label: "Chirurgie" },
  { id: "generaliste", label: "Généraliste" }
];

const SUBPERMISSION_GRANTORS = [
  "dev", "admin", "directeur", "directeur_adjoint", "responsable", "medecin_senior"
];

function normalizeRole(value) {
  return window.LSHD.normalizePermission(value);
}

function readDemoAccounts() {
  const accounts = window.LSHD.readStoredAccounts();
  const sessionUser = window.LSHD.readUser();

  if (sessionUser && !accounts.some(account =>
    String(account.username || "").toLowerCase() ===
    String(sessionUser.username || "").toLowerCase()
  )) {
    accounts.push({
      username: sessionUser.username || "Compte de démonstration",
      accountId: sessionUser.accountId || "",
      primaryRole: normalizeRole(sessionUser.role || "dev"),
      subpermissions: Array.isArray(sessionUser.permissions)
        ? sessionUser.permissions.map(normalizeRole)
        : []
    });

    localStorage.setItem(window.LSHD.keys.accounts, JSON.stringify(accounts));
  }

  return accounts.map(account => ({
    ...account,
    primaryRole: normalizeRole(account.primaryRole || account.role || ""),
    subpermissions: Array.isArray(account.subpermissions)
      ? account.subpermissions.map(normalizeRole)
      : []
  }));
}

function getRoleLabel(roleId) {
  return PRIMARY_ROLES.find(role => role.id === normalizeRole(roleId))?.label ||
    (roleId ? String(roleId) : "Sans rôle");
}

function getActorPermissions() {
  return window.LSHD.getUserPermissions(window.LSHD.readUser());
}

function actorCanGrantRole(roleId) {
  const actorPermissions = getActorPermissions();
  const role = PRIMARY_ROLES.find(item => item.id === roleId);

  if (!role) return actorPermissions.some(item =>
    ["dev", "admin", "directeur"].includes(item)
  );

  return role.grantors.some(grantor => actorPermissions.includes(grantor));
}

function actorCanGrantSubpermissions() {
  const actorPermissions = getActorPermissions();
  return SUBPERMISSION_GRANTORS.some(role => actorPermissions.includes(role));
}

function initLogsPage() {
  const results = document.querySelector("#log-results");
  if (!results) return;

  const search = document.querySelector("#log-search");
  const from = document.querySelector("#log-date-from");
  const to = document.querySelector("#log-date-to");
  const accountFilter = document.querySelector("#log-account-filter");
  const actionFilter = document.querySelector("#log-action-filter");
  const count = document.querySelector("#log-count");
  const empty = document.querySelector("#log-empty");

  function getLogs() {
    return window.LSHD.readAuditLogs()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  function fillFilters(logs) {
    const selectedAccount = accountFilter.value;
    const selectedAction = actionFilter.value;

    const accounts = [...new Set(logs.map(log => log.account).filter(Boolean))].sort();
    const actions = [...new Set(logs.map(log => log.action).filter(Boolean))].sort();

    accountFilter.replaceChildren(new Option("Tous les comptes", ""));
    actionFilter.replaceChildren(new Option("Toutes les actions", ""));

    accounts.forEach(account => accountFilter.add(new Option(account, account)));
    actions.forEach(action => actionFilter.add(new Option(action, action)));

    accountFilter.value = accounts.includes(selectedAccount) ? selectedAccount : "";
    actionFilter.value = actions.includes(selectedAction) ? selectedAction : "";
  }

  function render() {
    const logs = getLogs();
    fillFilters(logs);

    const query = search.value.trim().toLowerCase();
    const account = accountFilter.value;
    const action = actionFilter.value;

    const filtered = logs.filter(log => {
      const date = new Date(log.timestamp);
      if (Number.isNaN(date.getTime())) return false;

      if (from.value) {
        const min = new Date(from.value + "T00:00:00");
        if (date < min) return false;
      }

      if (to.value) {
        const max = new Date(to.value + "T23:59:59.999");
        if (date > max) return false;
      }

      if (account && log.account !== account) return false;
      if (action && log.action !== action) return false;

      const searchable = [
        log.account,
        log.role,
        log.action,
        log.details,
        log.page
      ].join(" ").toLowerCase();

      return !query || searchable.includes(query);
    });

    results.replaceChildren();

    filtered.forEach(log => {
      const row = document.createElement("tr");
      const date = new Date(log.timestamp);

      const values = [
        Number.isNaN(date.getTime()) ? log.timestamp : date.toLocaleString("fr-FR"),
        log.account || "Inconnu",
        log.role || "—",
        log.action || "—",
        log.details || "—",
        log.page || "—"
      ];

      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });

      results.append(row);
    });

    count.textContent =
      filtered.length + (filtered.length > 1 ? " activités affichées" : " activité affichée");
    empty.hidden = filtered.length > 0;
  }

  [search, from, to, accountFilter, actionFilter].forEach(control => {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  });

  document.querySelector("#log-reset").addEventListener("click", () => {
    search.value = "";
    from.value = "";
    to.value = "";
    accountFilter.value = "";
    actionFilter.value = "";
    render();
  });

  render();
}

function initPermissionPage() {
  const accountList = document.querySelector("#account-list");
  if (!accountList) return;

  const search = document.querySelector("#account-search");
  const roleFilter = document.querySelector("#account-role-filter");
  const accountCount = document.querySelector("#account-count");
  const accountEmpty = document.querySelector("#account-empty");
  const noSelection = document.querySelector("#permission-no-selection");
  const editor = document.querySelector("#permission-editor");
  const roleOptions = document.querySelector("#primary-role-options");
  const subOptions = document.querySelector("#subpermission-options");
  const feedback = document.querySelector("#permission-feedback");

  let accounts = readDemoAccounts();
  let selectedUsername = "";

  function fillRoleFilter() {
    roleFilter.replaceChildren(new Option("Tous les rôles", ""));
    PRIMARY_ROLES.forEach(role => roleFilter.add(new Option(role.label, role.id)));
  }

  function filteredAccounts() {
    const query = search.value.trim().toLowerCase();
    const role = roleFilter.value;

    return accounts.filter(account => {
      const text = [
        account.username,
        account.accountId,
        getRoleLabel(account.primaryRole)
      ].join(" ").toLowerCase();

      return (!query || text.includes(query)) &&
        (!role || account.primaryRole === role);
    });
  }

  function renderAccountList() {
    const visibleAccounts = filteredAccounts();
    accountList.replaceChildren();

    visibleAccounts.forEach(account => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "account-item";
      button.classList.toggle("selected", account.username === selectedUsername);
      button.addEventListener("click", () => {
        selectedUsername = account.username;
        feedback.textContent = "";
        renderAccountList();
        renderEditor();
      });

      const name = document.createElement("strong");
      name.textContent = account.username || "Compte sans nom";

      const id = document.createElement("span");
      id.className = "account-item-id";
      id.textContent = account.accountId ? "ID : " + account.accountId : "Compte local";

      const role = document.createElement("span");
      role.className = "role-badge";
      role.textContent = getRoleLabel(account.primaryRole);

      const subCount = document.createElement("small");
      subCount.textContent =
        (account.subpermissions.length || 0) + " sous-permission(s)";

      button.append(name, id, role, subCount);
      accountList.append(button);
    });

    accountCount.textContent =
      visibleAccounts.length + (visibleAccounts.length > 1 ? " comptes" : " compte");
    accountEmpty.hidden = visibleAccounts.length > 0;
  }

  function renderEditor() {
    const account = accounts.find(item => item.username === selectedUsername);

    if (!account) {
      noSelection.hidden = false;
      editor.hidden = true;
      return;
    }

    noSelection.hidden = true;
    editor.hidden = false;

    document.querySelector("#selected-account-name").textContent =
      account.username || "Compte sans nom";
    document.querySelector("#selected-account-id").textContent =
      account.accountId ? "Identifiant : " + account.accountId : "Compte de démonstration";
    document.querySelector("#selected-primary-badge").textContent =
      getRoleLabel(account.primaryRole);

    roleOptions.replaceChildren();

    PRIMARY_ROLES.forEach(role => {
      const label = document.createElement("label");
      label.className = "permission-choice";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "primary-role";
      input.value = role.id;
      input.checked = account.primaryRole === role.id;
      input.disabled =
        !actorCanGrantRole(role.id) &&
        account.primaryRole !== role.id;

      const text = document.createElement("span");
      text.textContent = role.label;

      label.append(input, text);
      roleOptions.append(label);
    });

    subOptions.replaceChildren();

    SUBPERMISSIONS.forEach(permission => {
      const label = document.createElement("label");
      label.className = "permission-choice";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = permission.id;
      input.dataset.subpermission = permission.id;
      input.checked = account.subpermissions.includes(permission.id);
      input.disabled =
        !actorCanGrantSubpermissions() &&
        !input.checked;

      const text = document.createElement("span");
      text.textContent = permission.label;

      label.append(input, text);
      subOptions.append(label);
    });
  }

  document.querySelector("#save-permissions").addEventListener("click", () => {
    const account = accounts.find(item => item.username === selectedUsername);
    if (!account) return;

    const selectedRole =
      document.querySelector('input[name="primary-role"]:checked')?.value || "";

    const selectedSubs = [...subOptions.querySelectorAll("[data-subpermission]:checked")]
      .map(input => input.dataset.subpermission);

    const changedPrimary = selectedRole !== account.primaryRole;
    const changedSubs =
      JSON.stringify([...selectedSubs].sort()) !==
      JSON.stringify([...account.subpermissions].sort());

    if (changedPrimary && selectedRole && !actorCanGrantRole(selectedRole)) {
      feedback.textContent = "Ton rôle ne permet pas d’attribuer ce rôle principal.";
      return;
    }

    if (changedPrimary && account.primaryRole && !actorCanGrantRole(account.primaryRole)) {
      feedback.textContent = "Ton rôle ne permet pas de retirer le rôle principal actuel.";
      return;
    }

    if (changedSubs && !actorCanGrantSubpermissions()) {
      feedback.textContent = "Ton rôle ne permet pas de modifier les sous-permissions.";
      return;
    }

    const previous = {
      primaryRole: account.primaryRole,
      subpermissions: [...account.subpermissions]
    };

    account.primaryRole = selectedRole;
    account.role = selectedRole;
    account.subpermissions = selectedSubs;

    localStorage.setItem(window.LSHD.keys.accounts, JSON.stringify(accounts));

    window.LSHD.recordAudit(
      "Modification des permissions",
      `${account.username} : rôle principal ${getRoleLabel(previous.primaryRole)} → ${getRoleLabel(selectedRole)} ; sous-permissions : ${selectedSubs.map(getRoleLabel).join(", ") || "aucune"}`
    );

    feedback.textContent = "Permissions enregistrées dans ce navigateur.";
    renderAccountList();
    renderEditor();
  });

  search.addEventListener("input", renderAccountList);
  roleFilter.addEventListener("change", renderAccountList);

  fillRoleFilter();
  renderAccountList();

  if (accounts.length > 0) {
    selectedUsername = accounts[0].username;
    renderAccountList();
    renderEditor();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initLogsPage();
  initPermissionPage();
});