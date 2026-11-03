"use strict";

(() => {
  const KEYS = {
    contracts: "lshd-personnel-contracts",
    shifts: "lshd-personnel-shifts",
    regulations: "lshd-personnel-regulations",
    contractTemplates: "lshd-legal-contract-templates",
    regulationActive: "lshd-legal-regulation-active"
  };

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

  const user = window.LSHD?.readUser?.();
  if (!user) return;

  const username = String(user.username || "").trim();
  const usernameKey = username.toLowerCase();
  const accounts = window.LSHD?.readStoredAccounts?.() || [];
  const account = accounts.find(item =>
    String(item.username || "").toLowerCase() === usernameKey
  ) || {};

  const role = window.LSHD.normalizePermission(
    account.primaryRole || account.role || user.role || "interne"
  );

  const displayName =
    account.displayName ||
    [account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
    username ||
    "Membre du LSHD";

  document.querySelectorAll("[data-user-name]").forEach(item => {
    item.textContent = displayName;
  });

  document.querySelectorAll("[data-user-role]").forEach(item => {
    item.textContent = ROLE_LABELS[role] || role;
  });

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function readObject(key, fallback = {}) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function audit(action, details) {
    window.LSHD?.recordAudit?.(action, details);
  }

  function makeNode(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function dateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR");
  }

  function roleLabel(value) {
    return ROLE_LABELS[value] || value || "Personnel";
  }

  function currentTemplate(roleId) {
    const templates = readObject(KEYS.contractTemplates);
    const saved = templates[roleId];

    if (saved?.text) {
      return {
        text: saved.text,
        version: String(saved.version || 1)
      };
    }

    const mission = MISSIONS[roleId] || "réaliser les missions confiées par la direction.";

    return {
      version: "défaut",
      text: [
        "CONTRAT DE TRAVAIL — LOS SANTOS HEALTH DEPARTMENT",
        "",
        "Entre le Los Santos Health Department (LSHD) et {{nom_complet}},",
        "le présent contrat définit les missions liées au poste de {{grade}}.",
        "",
        `Missions principales : ${mission}`,
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
      ].join("\n")
    };
  }

  function fillContract(text, record) {
    const replacements = {
      "{{nom_complet}}": record.displayName || displayName,
      "{{nom}}": account.lastName || "",
      "{{prenom}}": account.firstName || "",
      "{{grade}}": roleLabel(record.role),
      "{{date}}": new Date().toLocaleDateString("fr-FR")
    };

    return Object.entries(replacements).reduce(
      (result, [placeholder, value]) => result.split(placeholder).join(value),
      text
    );
  }

  function currentContract() {
    const template = currentTemplate(role);
    const contracts = readList(KEYS.contracts);

    let record = contracts.find(item =>
      String(item.username || "").toLowerCase() === usernameKey &&
      item.role === role &&
      String(item.templateVersion) === template.version
    );

    if (!record) {
      record = {
        id: `contract-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        username,
        displayName,
        role,
        templateVersion: template.version,
        templateText: template.text,
        createdAt: new Date().toISOString(),
        signatures: {
          member: null,
          lawyer: null,
          director: null
        }
      };

      contracts.push(record);
      write(KEYS.contracts, contracts);
    }

    if (!record.signatures) {
      record.signatures = {
        member: record.signedAt
          ? {
              username,
              name: record.signatureName || displayName,
              signedAt: record.signedAt
            }
          : null,
        lawyer: null,
        director: record.approvedAt
          ? {
              name: record.approvedBy || "Direction",
              signedAt: record.approvedAt
            }
          : null
      };
      write(KEYS.contracts, contracts);
    }

    return record;
  }

  function signatureDescription(label, signature) {
    return `${label} : ${signature
      ? `${signature.name} · ${dateTime(signature.signedAt)}`
      : "en attente"}`;
  }

  function renderContractSignatures(container, record) {
    const signatures = record.signatures || {};
    container.replaceChildren();

    container.append(
      makeNode("p", "", signatureDescription("Membre", signatures.member)),
      makeNode("p", "", signatureDescription("Avocat", signatures.lawyer)),
      makeNode("p", "", signatureDescription("Directeur", signatures.director))
    );

    const complete =
      Boolean(signatures.member) &&
      Boolean(signatures.lawyer) &&
      Boolean(signatures.director);

    container.append(makeNode(
      "p",
      "personnel-feedback",
      complete
        ? "Le contrat est signé par les trois personnes."
        : "Le contrat sera complet après les trois signatures."
    ));
  }

  function renderContractHistory(currentId) {
    const target = document.querySelector("#contract-history");
    if (!target) return;

    target.replaceChildren();

    const history = readList(KEYS.contracts)
      .filter(item =>
        String(item.username || "").toLowerCase() === usernameKey &&
        item.id !== currentId &&
        item.signatures?.member
      )
      .sort((a, b) =>
        new Date(b.signatures.member.signedAt) -
        new Date(a.signatures.member.signedAt)
      );

    if (!history.length) {
      target.append(makeNode(
        "p",
        "personnel-empty",
        "Aucun ancien contrat signé pour le moment."
      ));
      return;
    }

    history.forEach(item => {
      const row = makeNode("div", "document-item");
      const member = item.signatures.member;
      const completed = Boolean(
        item.signatures.lawyer && item.signatures.director
      );

      row.append(
        makeNode(
          "strong",
          "",
          `${roleLabel(item.role)} · signé le ${dateTime(member.signedAt)}`
        ),
        makeNode(
          "span",
          "document-badge",
          completed ? "Trois signatures" : "Signatures en attente"
        )
      );

      target.append(row);
    });
  }

  function initContract() {
    if (document.body.dataset.personnelPage !== "contract") return;

    const record = currentContract();
    const content = document.querySelector("#contract-content");
    const form = document.querySelector("#contract-sign-form");
    const signedBox = document.querySelector("#contract-signed");
    const status = document.querySelector("#contract-status");

    if (!content || !form || !status) return;

    document.querySelector("#contract-grade").textContent =
      `Grade : ${roleLabel(role)} · Version du modèle : ${record.templateVersion}`;

    content.replaceChildren();

    const contractText = fillContract(
      record.templateText || currentTemplate(record.role).text,
      record
    );

    contractText.split("\n").forEach(line => {
      content.append(makeNode("p", "", line || "\u00a0"));
    });

    const signatures = record.signatures;
    const isComplete = Boolean(
      signatures.member && signatures.lawyer && signatures.director
    );

    status.textContent = isComplete
      ? "Contrat signé"
      : signatures.member
        ? "Ta signature est enregistrée"
        : "À signer";

    status.dataset.state = isComplete
      ? "approved"
      : signatures.member
        ? "pending"
        : "draft";

    const signatureInput = document.querySelector("#contract-sign-name");
    const feedback = document.querySelector("#contract-feedback");
    signatureInput.value = displayName;

    if (signatures.member) {
      form.hidden = true;
    } else {
      form.hidden = false;
    }

    signedBox.hidden = false;
    renderContractSignatures(signedBox, record);

    form.addEventListener("submit", event => {
      event.preventDefault();

      const signature = signatureInput.value.trim();
      const accepted = document.querySelector("#contract-accept").checked;

      if (
        !accepted ||
        signature.toLocaleLowerCase() !== displayName.toLocaleLowerCase()
      ) {
        feedback.textContent =
          "Saisis le nom complet de ton profil et confirme la lecture du contrat.";
        return;
      }

      const contracts = readList(KEYS.contracts);
      const saved = contracts.find(item => item.id === record.id);
      if (!saved) return;

      if (!saved.signatures) {
        saved.signatures = { member: null, lawyer: null, director: null };
      }

      saved.signatures.member = {
        username,
        name: signature,
        role,
        signedAt: new Date().toISOString()
      };

      saved.signedText = contractText;
      write(KEYS.contracts, contracts);

      audit("Signature du contrat", `Contrat ${roleLabel(saved.role)} signé par le membre.`);
      feedback.textContent = "Ta signature est enregistrée.";
      window.setTimeout(() => window.location.reload(), 500);
    });

    renderContractHistory(record.id);
  }

  function localDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function mondayOf(date) {
    const monday = new Date(date);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday;
  }

  function timeLabel(value) {
    if (!value) return "—";
    return new Date(value).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function shiftMinutes(shift) {
    const start = new Date(shift.startedAt).getTime();
    const end = shift.endedAt
      ? new Date(shift.endedAt).getTime()
      : Date.now();

    return Number.isFinite(start) && end >= start
      ? Math.round((end - start) / 60000)
      : 0;
  }

  function hoursLabel(minutes) {
    return `${(minutes / 60).toFixed(2).replace(".", ",")} h`;
  }

  function initService() {
    if (document.body.dataset.personnelPage !== "service") return;

    const startButton = document.querySelector("#service-start");
    const endButton = document.querySelector("#service-end");
    const title = document.querySelector("#service-state-title");
    const description = document.querySelector("#service-state-description");
    const feedback = document.querySelector("#service-feedback");
    const weeksTarget = document.querySelector("#service-weeks");

    if (!startButton || !endButton || !weeksTarget) return;

    function userShifts() {
      return readList(KEYS.shifts)
        .filter(item => String(item.username || "").toLowerCase() === usernameKey)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
    }

    function render() {
      const shifts = userShifts();
      const active = shifts.find(item => !item.endedAt);
      const currentMonday = mondayOf(new Date());
      const weekMap = new Map([[localDateKey(currentMonday), currentMonday]]);

      shifts.forEach(item => {
        const date = new Date(item.startedAt);
        if (Number.isNaN(date.getTime())) return;

        const monday = mondayOf(date);
        weekMap.set(localDateKey(monday), monday);
      });

      weeksTarget.replaceChildren();

      [...weekMap.values()].sort((a, b) => b - a).forEach(monday => {
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        const weekShifts = shifts.filter(item =>
          localDateKey(mondayOf(new Date(item.startedAt))) === localDateKey(monday)
        );

        const days = Array.from({ length: 7 }, (_, index) => {
          const day = new Date(monday);
          day.setDate(day.getDate() + index);
          return day;
        });

        const maxSessions = Math.max(1, ...days.map(day =>
          weekShifts.filter(item =>
            localDateKey(new Date(item.startedAt)) === localDateKey(day)
          ).length
        ));

        const section = makeNode("section", "service-week");
        section.append(makeNode(
          "h2",
          "",
          `Semaine du ${monday.toLocaleDateString("fr-FR")} au ${sunday.toLocaleDateString("fr-FR")}`
        ));

        const total = weekShifts.reduce((sum, item) => sum + shiftMinutes(item), 0);
        section.append(makeNode("p", "week-summary", `Total de la semaine : ${hoursLabel(total)}`));

        const wrapper = makeNode("div", "service-table-wrap");
        const table = makeNode("table", "service-table");
        const head = makeNode("thead");
        const header = makeNode("tr");
        header.append(makeNode("th", "", "Date"));

        for (let index = 0; index < maxSessions; index += 1) {
          header.append(
            makeNode("th", "", "Prise de service"),
            makeNode("th", "", "Fin de service")
          );
        }

        header.append(makeNode("th", "", "Total du jour"));
        head.append(header);

        const body = makeNode("tbody");
        let weekMinutes = 0;

        days.forEach(day => {
          const dayShifts = weekShifts.filter(item =>
            localDateKey(new Date(item.startedAt)) === localDateKey(day)
          );

          const row = makeNode("tr");
          row.append(makeNode("td", "", day.toLocaleDateString("fr-FR")));

          dayShifts.forEach(item => {
            row.append(makeNode("td", "", timeLabel(item.startedAt)));

            const endCell = makeNode(
              "td",
              "",
              item.endedAt ? timeLabel(item.endedAt) : "En cours"
            );

            if (!item.endedAt) endCell.classList.add("service-active");
            row.append(endCell);
            weekMinutes += shiftMinutes(item);
          });

          for (let index = dayShifts.length; index < maxSessions; index += 1) {
            row.append(makeNode("td", "", "—"), makeNode("td", "", "—"));
          }

          const dayMinutes = dayShifts.reduce(
            (sum, item) => sum + shiftMinutes(item),
            0
          );

          row.append(makeNode(
            "td",
            "",
            dayShifts.length ? hoursLabel(dayMinutes) : "—"
          ));

          body.append(row);
        });

        const foot = makeNode("tfoot");
        const footRow = makeNode("tr");
        const totalTitle = makeNode("th", "", "Total de la semaine");
        totalTitle.colSpan = maxSessions * 2 + 1;

        footRow.append(totalTitle, makeNode("th", "", hoursLabel(weekMinutes)));
        foot.append(footRow);
        table.append(head, body, foot);
        wrapper.append(table);
        section.append(wrapper);
        weeksTarget.append(section);
      });

      startButton.hidden = Boolean(active);
      endButton.hidden = !active;
      title.textContent = active ? "Service en cours" : "Aucun service en cours";
      description.textContent = active
        ? `Débuté le ${new Date(active.startedAt).toLocaleString("fr-FR")}.`
        : "Appuie sur le bouton au début de ton service.";
    }

    startButton.addEventListener("click", () => {
      const shifts = readList(KEYS.shifts);

      if (shifts.some(item =>
        String(item.username || "").toLowerCase() === usernameKey &&
        !item.endedAt
      )) {
        feedback.textContent = "Un service est déjà en cours.";
        return;
      }

      shifts.push({
        id: `shift-${Date.now()}`,
        username,
        displayName,
        role,
        startedAt: new Date().toISOString(),
        endedAt: null
      });

      write(KEYS.shifts, shifts);
      audit("Prise de service", `${displayName} a commencé son service.`);
      feedback.textContent = "Prise de service enregistrée.";
      render();
    });

    endButton.addEventListener("click", () => {
      const shifts = readList(KEYS.shifts);
      const active = shifts.find(item =>
        String(item.username || "").toLowerCase() === usernameKey &&
        !item.endedAt
      );

      if (!active) {
        feedback.textContent = "Aucun service en cours.";
        return;
      }

      active.endedAt = new Date().toISOString();
      write(KEYS.shifts, shifts);
      audit("Fin de service", `${displayName} a terminé son service.`);
      feedback.textContent = "Fin de service enregistrée.";
      render();
    });

    render();
  }

  function activeRegulation() {
    return readObject(KEYS.regulationActive, null);
  }

  function initRegulation() {
    if (document.body.dataset.personnelPage !== "regulation") return;

    const regulation = activeRegulation();
    const content = document.querySelector("#regulation-content");
    const form = document.querySelector("#regulation-sign-form");
    const signedState = document.querySelector("#regulation-signed-state");

    if (!content || !form) return;

    content.replaceChildren();

    if (!regulation) {
      document.querySelector("#regulation-version").textContent = "Aucune version publiée";
      content.append(makeNode(
        "p",
        "",
        "Le règlement attend encore la signature de l’avocat et la validation du directeur."
      ));
      form.hidden = true;
      signedState.hidden = true;
      return;
    }

    document.querySelector("#regulation-version").textContent = regulation.version;

    regulation.text.split("\n").forEach(line => {
      content.append(makeNode(
        line.trim().startsWith("Article") ? "h3" : "p",
        "",
        line || "\u00a0"
      ));
    });

    const signatures = readList(KEYS.regulations);
    const existing = signatures.find(item =>
      String(item.username || "").toLowerCase() === usernameKey &&
      String(item.version) === String(regulation.version)
    );

    document.querySelector("#regulation-sign-name").value = displayName;

    if (existing) {
      form.hidden = true;
      signedState.hidden = false;
      signedState.textContent =
        `Version ${existing.version} signée par ${existing.signatureName} le ${new Date(existing.signedAt).toLocaleString("fr-FR")}.`;
      return;
    }

    form.addEventListener("submit", event => {
      event.preventDefault();

      const signature = document.querySelector("#regulation-sign-name").value.trim();
      const accepted = document.querySelector("#regulation-accept").checked;
      const feedback = document.querySelector("#regulation-feedback");

      if (
        !accepted ||
        signature.toLocaleLowerCase() !== displayName.toLocaleLowerCase()
      ) {
        feedback.textContent =
          "Saisis le nom complet de ton profil et confirme la lecture du règlement.";
        return;
      }

      const all = readList(KEYS.regulations);
      all.push({
        id: `reg-${Date.now()}`,
        username,
        displayName,
        version: regulation.version,
        text: regulation.text,
        signatureName: signature,
        signedAt: new Date().toISOString()
      });

      write(KEYS.regulations, all);
      audit("Signature du règlement", `Version ${regulation.version} signée.`);
      feedback.textContent = "Règlement signé et archivé dans tes documents.";
      window.setTimeout(() => window.location.reload(), 500);
    });
  }

  function initDocuments() {
    if (document.body.dataset.personnelPage !== "documents") return;

    const contractsTarget = document.querySelector("#documents-contracts");
    const regulationsTarget = document.querySelector("#documents-regulations");

    if (!contractsTarget || !regulationsTarget) return;

    const contracts = readList(KEYS.contracts)
      .filter(item =>
        String(item.username || "").toLowerCase() === usernameKey &&
        item.signatures?.member
      )
      .sort((a, b) =>
        new Date(b.signatures.member.signedAt) -
        new Date(a.signatures.member.signedAt)
      );

    contractsTarget.replaceChildren();

    if (!contracts.length) {
      contractsTarget.append(makeNode(
        "p",
        "personnel-empty",
        "Aucun contrat signé pour le moment."
      ));
    } else {
      contracts.forEach(item => {
        const row = makeNode("div", "document-item");
        const info = makeNode("div");
        const signatures = item.signatures || {};
        const complete = Boolean(
          signatures.member && signatures.lawyer && signatures.director
        );

        info.append(
          makeNode("strong", "", `Contrat — ${roleLabel(item.role)}`),
          makeNode(
            "small",
            "",
            `Membre : ${signatures.member?.name || "—"} · Avocat : ${signatures.lawyer?.name || "En attente"} · Directeur : ${signatures.director?.name || "En attente"}`
          )
        );

        row.append(
          info,
          makeNode(
            "span",
            "document-badge",
            complete ? "Signé par les trois personnes" : "Signatures en attente"
          )
        );
        contractsTarget.append(row);
      });
    }

    const regulations = readList(KEYS.regulations)
      .filter(item => String(item.username || "").toLowerCase() === usernameKey)
      .sort((a, b) => new Date(b.signedAt) - new Date(a.signedAt));

    regulationsTarget.replaceChildren();

    if (!regulations.length) {
      regulationsTarget.append(makeNode(
        "p",
        "personnel-empty",
        "Aucun règlement signé pour le moment."
      ));
    } else {
      regulations.forEach(item => {
        const row = makeNode("div", "document-item");
        const info = makeNode("div");

        info.append(
          makeNode("strong", "", "Règlement du LSHD"),
          makeNode(
            "small",
            "",
            `Version ${item.version} · Signé le ${new Date(item.signedAt).toLocaleString("fr-FR")} · ${item.signatureName}`
          )
        );

        row.append(info, makeNode("span", "document-badge", "Signé"));
        regulationsTarget.append(row);
      });
    }
  }

  initContract();
  initService();
  initRegulation();
  initDocuments();
})();