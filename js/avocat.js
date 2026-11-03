"use strict";

(() => {
  const KEYS = {
    accounts: "lshd-demo-accounts",
    contracts: "lshd-personnel-contracts",
    contractTemplates: "lshd-legal-contract-templates",
    regulationDraft: "lshd-legal-regulation",
    regulationActive: "lshd-legal-regulation-active"
  };

  const ROLES = [
    ["dev", "Développeur"],
    ["admin", "Administrateur"],
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
    ["avocat", "Avocat"]
  ];

  const MISSIONS = {
    dev: "assurer les missions techniques et le suivi des outils du LSHD.",
    admin: "participer à l’administration et au bon fonctionnement du LSHD.",
    directeur: "diriger le service et veiller à son bon fonctionnement.",
    directeur_adjoint: "assister la direction et coordonner les missions confiées.",
    responsable: "encadrer son équipe et accompagner les membres du service.",
    medecin_senior: "assurer les soins et accompagner l’équipe médicale.",
    medecin: "assurer les consultations, les soins et le suivi des patients.",
    medecin_junior: "participer aux soins sous la supervision de l’équipe médicale.",
    interne: "se former aux pratiques du service et participer aux missions confiées.",
    infirmier: "participer aux soins et accompagner les médecins.",
    auxiliaire_soin: "assister l’équipe médicale dans ses missions de soin.",
    directeur_irs: "assurer les missions de direction liées à l’IRS.",
    police: "réaliser les missions attribuées à la Police.",
    avocat: "rédiger et suivre les documents juridiques du LSHD."
  };

  const DEFAULT_REGULATION = [
    "RÈGLEMENT DU LOS SANTOS HEALTH DEPARTMENT",
    "",
    "Article 1 — Respect",
    "Chaque membre respecte les patients, les collègues et les consignes de la direction.",
    "",
    "Article 2 — Prise de service",
    "Chaque membre enregistre le début et la fin de son service dans l’espace Personnel.",
    "",
    "Article 3 — Confidentialité",
    "Les informations internes et les dossiers patients restent confidentiels.",
    "",
    "Article 4 — Matériel",
    "Le matériel, les véhicules et les locaux du LSHD sont utilisés dans le cadre des missions du service.",
    "",
    "Article 5 — Communication",
    "Les échanges avec les patients et les autres services restent courtois et adaptés à la situation.",
    "",
    "Article 6 — Consignes",
    "Les membres respectent les procédures et les consignes de la direction."
  ].join("\n");

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeRole(value) {
    return window.LSHD.normalizePermission(value || "interne");
  }

  function roleLabel(value) {
    return ROLES.find(item => item[0] === value)?.[1] || value || "Personnel";
  }

  function currentUser() {
    return window.LSHD?.readUser?.() || null;
  }

  function currentAccount() {
    const user = currentUser();
    const list = window.LSHD?.readStoredAccounts?.() || [];

    return list.find(item =>
      String(item.username || "").toLowerCase() ===
      String(user?.username || "").toLowerCase()
    ) || {};
  }

  function currentRole() {
    const user = currentUser();
    const account = currentAccount();

    return normalizeRole(account.primaryRole || account.role || user?.role);
  }

  function personName(account) {
    return account.displayName ||
      [account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
      account.username ||
      "Membre";
  }

  function audit(action, details) {
    window.LSHD?.recordAudit?.(action, details);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR");
  }

  function makeNode(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function defaultContract(role, label) {
    return [
      "CONTRAT DE TRAVAIL — LOS SANTOS HEALTH DEPARTMENT",
      "",
      "Entre le Los Santos Health Department (LSHD) et {{nom_complet}},",
      "le présent contrat définit les missions liées au poste de {{grade}}.",
      "",
      `Missions principales : ${MISSIONS[role] || "réaliser les missions confiées par la direction."}`,
      "",
      "Le membre s’engage à respecter le règlement du LSHD, les procédures de son équipe et les consignes de la direction.",
      "",
      "Le membre s’engage à préserver la confidentialité des informations auxquelles il accède et à utiliser les outils du service pour ses missions.",
      "",
      "Le contrat prend effet après les signatures du membre, de l’avocat et du directeur.",
      "",
      `Fonction : ${label}`,
      "Date : {{date}}",
      "",
      "Signature du membre : ____________________",
      "Signature de l’avocat : ____________________",
      "Signature du directeur : ____________________"
    ].join("\n");
  }

  function getTemplates() {
    return readJSON(KEYS.contractTemplates, {});
  }

  function getTemplate(role) {
    const saved = getTemplates()[role];
    const label = roleLabel(role);

    return {
      text: saved?.text || defaultContract(role, label),
      version: String(saved?.version || "défaut")
    };
  }

  function ensureContractRecords() {
    const accounts = [...(window.LSHD?.readStoredAccounts?.() || [])];
    const active = currentUser();

    if (
      active &&
      !accounts.some(item =>
        String(item.username || "").toLowerCase() ===
        String(active.username || "").toLowerCase()
      )
    ) {
      accounts.push({
        username: active.username,
        primaryRole: active.role || "dev",
        role: active.role || "dev"
      });
    }

    const contracts = readJSON(KEYS.contracts, []);
    let changed = false;

    accounts.forEach(account => {
      const username = String(account.username || "").trim();
      if (!username) return;

      const role = normalizeRole(account.primaryRole || account.role);
      const template = getTemplate(role);
      const exists = contracts.some(item =>
        String(item.username || "").toLowerCase() === username.toLowerCase() &&
        item.role === role &&
        String(item.templateVersion) === template.version
      );

      if (exists) return;

      contracts.push({
        id: `contract-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        username,
        displayName: personName(account),
        role,
        templateVersion: template.version,
        templateText: template.text,
        createdAt: new Date().toISOString(),
        signatures: {
          member: null,
          lawyer: null,
          director: null
        }
      });

      changed = true;
    });

    if (changed) saveJSON(KEYS.contracts, contracts);
    return contracts;
  }

  function signatureText(signature) {
    if (!signature) return "En attente";
    return `${signature.name} · ${formatDate(signature.signedAt)}`;
  }

  function renderSignatureCell(label, signature) {
    const cell = makeNode(
      "div",
      `signature-item${signature ? " is-signed" : ""}`
    );

    cell.append(
      makeNode("strong", "", label),
      makeNode("span", "", signatureText(signature))
    );

    return cell;
  }

  function contractStatus(contract) {
    const signatures = contract.signatures || {};
    const done = ["member", "lawyer", "director"]
      .filter(key => signatures[key]).length;

    return done === 3
      ? "Contrat complet"
      : `${done}/3 signatures`;
  }

  function renderContractRegister() {
    const target = document.querySelector("#contract-register");
    const empty = document.querySelector("#contract-register-empty");
    const search = document.querySelector("#contract-search");

    if (!target || !search) return;

    const query = search.value.trim().toLowerCase();
    const contracts = ensureContractRecords()
      .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), "fr"));

    const filtered = contracts.filter(contract =>
      `${contract.displayName} ${contract.username} ${roleLabel(contract.role)}`
        .toLowerCase()
        .includes(query)
    );

    target.replaceChildren();

    filtered.forEach(contract => {
      if (!contract.signatures) {
        contract.signatures = {
          member: contract.signedAt
            ? {
                name: contract.signatureName || contract.displayName,
                username: contract.username,
                signedAt: contract.signedAt
              }
            : null,
          lawyer: null,
          director: contract.approvedAt
            ? {
                name: contract.approvedBy || "Direction",
                signedAt: contract.approvedAt
              }
            : null
        };
      }

      const card = makeNode("article", "contract-register-card");
      card.append(
        makeNode("h3", "", contract.displayName || contract.username),
        makeNode(
          "p",
          "contract-register-meta",
          `@${contract.username} · ${roleLabel(contract.role)} · Modèle ${contract.templateVersion} · ${contractStatus(contract)}`
        )
      );

      const signatureList = makeNode("div", "signature-list");
      signatureList.append(
        renderSignatureCell("Membre", contract.signatures.member),
        renderSignatureCell("Avocat", contract.signatures.lawyer),
        renderSignatureCell("Directeur", contract.signatures.director)
      );
      card.append(signatureList);

      const actions = makeNode("div", "signature-actions");
      const actor = currentUser();
      const actorName = personName(currentAccount());
      const actorRole = currentRole();

      if (actorRole === "avocat" && !contract.signatures.member) {
        actions.append(makeNode(
          "p",
          "lawyer-small",
          "Le membre doit signer avant la signature de l’avocat."
        ));
      } else if (
        actorRole === "avocat" &&
        contract.signatures.member &&
        !contract.signatures.lawyer
      ) {
        const button = makeNode("button", "button button-primary", "Signer comme avocat");
        button.type = "button";
        button.addEventListener("click", () => {
          signContract(contract.id, "lawyer", actor, actorName);
        });
        actions.append(button);
      }

      if (actorRole === "directeur" && !contract.signatures.lawyer) {
        actions.append(makeNode(
          "p",
          "lawyer-small",
          "L’avocat doit signer avant la signature du directeur."
        ));
      } else if (
        actorRole === "directeur" &&
        contract.signatures.lawyer &&
        !contract.signatures.director
      ) {
        const button = makeNode("button", "button button-primary", "Signer comme directeur");
        button.type = "button";
        button.addEventListener("click", () => {
          signContract(contract.id, "director", actor, actorName);
        });
        actions.append(button);
      }

      if (!actions.childElementCount) {
        actions.append(makeNode(
          "span",
          "lawyer-small",
          actorRole === "avocat" || actorRole === "directeur"
            ? "Aucune signature ne t’attend pour ce contrat."
            : "Le registre est consultable en lecture seule avec ce compte."
        ));
      }

      card.append(actions);
      target.append(card);
    });

    empty.hidden = filtered.length > 0;
  }

  function signContract(contractId, signatureType, actor, actorName) {
    const contracts = readJSON(KEYS.contracts, []);
    const contract = contracts.find(item => item.id === contractId);

    if (!contract) return;

    if (!contract.signatures) {
      contract.signatures = {
        member: contract.signedAt
          ? {
              name: contract.signatureName || contract.displayName,
              username: contract.username,
              signedAt: contract.signedAt
            }
          : null,
        lawyer: null,
        director: contract.approvedAt
          ? {
              name: contract.approvedBy || "Direction",
              signedAt: contract.approvedAt
            }
          : null
      };
    }

    const role = currentRole();

    if (signatureType === "lawyer") {
      if (role !== "avocat" || !contract.signatures.member || contract.signatures.lawyer) return;
    } else if (signatureType === "director") {
      if (
        role !== "directeur" ||
        !contract.signatures.lawyer ||
        contract.signatures.director
      ) return;
    } else {
      return;
    }

    contract.signatures[signatureType] = {
      username: actor?.username || "",
      name: actorName,
      role,
      signedAt: new Date().toISOString()
    };

    saveJSON(KEYS.contracts, contracts);

    audit(
      signatureType === "lawyer" ? "Signature avocat du contrat" : "Signature directeur du contrat",
      `${actorName} a signé le contrat de ${contract.displayName || contract.username}.`
    );

    renderContractRegister();
  }

  function defaultRegulation() {
    return {
      text: DEFAULT_REGULATION,
      version: "défaut",
      lawyerSignature: null,
      directorSignature: null
    };
  }

  function getRegulationDraft() {
    return readJSON(KEYS.regulationDraft, null);
  }

  function getActiveRegulation() {
    return readJSON(KEYS.regulationActive, null);
  }

  function updateRegulationApproval() {
    const target = document.querySelector("#regulation-approval");
    if (!target) return;

    const draft = getRegulationDraft();
    const active = getActiveRegulation();
    target.replaceChildren();

    if (!draft) {
      target.append(makeNode(
        "p",
        "lawyer-small",
        active
          ? `Version active : ${active.version}, publiée le ${formatDate(active.publishedAt)}.`
          : "Aucun règlement n’a encore été enregistré."
      ));
      return;
    }

    target.append(makeNode(
      "p",
      "lawyer-small",
      `Version ${draft.version} · Signature avocat : ${signatureText(draft.lawyerSignature)} · Signature directeur : ${signatureText(draft.directorSignature)}`
    ));

    const role = currentRole();
    const actor = currentUser();
    const actorName = personName(currentAccount());

    if (role === "avocat" && !draft.lawyerSignature) {
      const button = makeNode("button", "button button-primary", "Signer comme avocat");
      button.type = "button";
      button.addEventListener("click", () => signRegulation("lawyer", actor, actorName));
      target.append(button);
    }

    if (role === "directeur" && !draft.lawyerSignature) {
      target.append(makeNode(
        "p",
        "lawyer-small",
        "L’avocat doit signer cette version avant le directeur."
      ));
    } else if (role === "directeur" && !draft.directorSignature) {
      const button = makeNode("button", "button button-primary", "Valider et signer comme directeur");
      button.type = "button";
      button.addEventListener("click", () => signRegulation("director", actor, actorName));
      target.append(button);
    }

    if (draft.lawyerSignature && draft.directorSignature) {
      target.append(makeNode(
        "p",
        "lawyer-feedback",
        "Cette version est signée et publiée. Les membres peuvent maintenant la signer."
      ));
    } else if (active) {
      target.append(makeNode(
        "p",
        "lawyer-small",
        `La version active reste la version ${active.version} jusqu’à la double signature.`
      ));
    }
  }

  function signRegulation(type, actor, actorName) {
    const draft = getRegulationDraft();
    if (!draft) return;

    const role = currentRole();
    if (type === "lawyer" && (role !== "avocat" || draft.lawyerSignature)) return;
    if (type === "director" && (
      role !== "directeur" ||
      !draft.lawyerSignature ||
      draft.directorSignature
    )) return;

    const signature = {
      username: actor?.username || "",
      name: actorName,
      role,
      signedAt: new Date().toISOString()
    };

    if (type === "lawyer") draft.lawyerSignature = signature;
    if (type === "director") draft.directorSignature = signature;

    saveJSON(KEYS.regulationDraft, draft);

    audit(
      type === "lawyer" ? "Signature avocat du règlement" : "Signature directeur du règlement",
      `${actorName} a signé la version ${draft.version} du règlement.`
    );

    if (draft.lawyerSignature && draft.directorSignature) {
      const active = {
        ...draft,
        publishedAt: new Date().toISOString()
      };
      saveJSON(KEYS.regulationActive, active);
      audit("Publication du règlement", `Version ${draft.version} publiée.`);
    }

    updateRegulationApproval();
  }

  function defaultContractText(role, label) {
    return [
      "CONTRAT DE TRAVAIL — LOS SANTOS HEALTH DEPARTMENT",
      "",
      "Entre le Los Santos Health Department (LSHD) et {{nom_complet}},",
      `le présent contrat définit les missions liées au poste de ${label}.`,
      "",
      `Missions principales : ${MISSIONS[role] || "réaliser les missions confiées par la direction."}`,
      "",
      "Le membre s’engage à respecter le règlement du LSHD, les procédures de son équipe et les consignes de la direction.",
      "",
      "Le contrat prend effet après la signature du membre, de l’avocat et du directeur.",
      "",
      "Fonction : {{grade}}",
      "Date : {{date}}",
      "",
      "Signature du membre : ____________________",
      "Signature de l’avocat : ____________________",
      "Signature du directeur : ____________________"
    ].join("\n");
  }

  function loadEditor() {
    const select = document.querySelector("#contract-grade");
    const contractInput = document.querySelector("#contract-template");
    const regulationInput = document.querySelector("#regulation-template");

    if (!select || !contractInput || !regulationInput) return;

    ROLES.forEach(([id, label]) => select.add(new Option(label, id)));

    function loadSelectedContract() {
      const role = select.value;
      const saved = getTemplates()[role];
      const label = roleLabel(role);

      contractInput.value = saved?.text || defaultContractText(role, label);
      document.querySelector("#contract-template-version").textContent = saved
        ? `Version ${saved.version} · Modifiée le ${formatDate(saved.updatedAt)} par ${saved.updatedBy}.`
        : "Modèle par défaut, pas encore personnalisé.";
    }

    function loadRegulation() {
      const draft = getRegulationDraft();
      const active = getActiveRegulation();
      const source = draft || active;

      regulationInput.value = source?.text || DEFAULT_REGULATION;
      document.querySelector("#regulation-template-version").textContent = source
        ? `Version ${source.version} · Modifiée le ${formatDate(source.updatedAt)} par ${source.updatedBy || "Avocat"}.`
        : "Règlement par défaut.";

      updateRegulationApproval();
    }

    select.addEventListener("change", loadSelectedContract);

    document.querySelector("#save-contract-template").addEventListener("click", () => {
      const text = contractInput.value.trim();
      const status = document.querySelector("#contract-template-status");

      if (!text) {
        status.textContent = "Écris le modèle avant de l’enregistrer.";
        return;
      }

      const all = getTemplates();
      const old = all[select.value];

      all[select.value] = {
        text,
        version: (Number(old?.version) || 0) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: personName(currentAccount())
      };

      try {
        saveJSON(KEYS.contractTemplates, all);
        ensureContractRecords();
      } catch {
        status.textContent = "Le navigateur n’a pas pu enregistrer ce modèle.";
        return;
      }

      audit("Modification du modèle de contrat", `Modèle mis à jour pour ${roleLabel(select.value)}.`);
      status.textContent = "Modèle enregistré. Un nouveau contrat sera créé pour les membres de ce grade.";
      loadSelectedContract();
      renderContractRegister();
    });

    document.querySelector("#save-regulation-template").addEventListener("click", () => {
      const text = regulationInput.value.trim();
      const status = document.querySelector("#regulation-template-status");

      if (!text) {
        status.textContent = "Écris le règlement avant de l’enregistrer.";
        return;
      }

      const old = getRegulationDraft() || getActiveRegulation();
      const draft = {
        text,
        version: (Number(old?.version) || 0) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: personName(currentAccount()),
        lawyerSignature: null,
        directorSignature: null
      };

      try {
        saveJSON(KEYS.regulationDraft, draft);
      } catch {
        status.textContent = "Le navigateur n’a pas pu enregistrer le règlement.";
        return;
      }

      audit("Modification du règlement", `Brouillon de la version ${draft.version} enregistré.`);
      status.textContent = "Nouvelle version enregistrée. Elle attend les signatures de l’avocat et du directeur.";
      loadRegulation();
    });

    loadSelectedContract();
    loadRegulation();
  }

  function init() {
    if (!document.querySelector("#contract-register")) return;

    loadEditor();
    ensureContractRecords();
    renderContractRegister();

    document.querySelector("#contract-search").addEventListener("input", renderContractRegister);
  }

  document.addEventListener("DOMContentLoaded", init);
})();