"use strict";

(() => {
  const STORAGE_KEY = "lshd-accounting-demo";
  const MAX_ENTRIES = 1000;

  const elements = {
    entryForm: document.querySelector("#accounting-entry-form"),
    entryId: document.querySelector("#entry-id"),
    entryType: document.querySelector("#entry-type"),
    entryDescription: document.querySelector("#entry-description"),
    entryAmount: document.querySelector("#entry-amount"),
    entryDate: document.querySelector("#entry-date"),
    entrySubmit: document.querySelector("#entry-submit"),
    entryCancel: document.querySelector("#entry-cancel"),
    entryFeedback: document.querySelector("#entry-feedback"),

    balanceForm: document.querySelector("#weekly-balance-form"),
    balanceId: document.querySelector("#balance-id"),
    balanceAmount: document.querySelector("#balance-amount"),
    balanceDate: document.querySelector("#balance-date"),
    balanceNote: document.querySelector("#balance-note"),
    balanceSubmit: document.querySelector("#balance-submit"),
    balanceCancel: document.querySelector("#balance-cancel"),
    balanceFeedback: document.querySelector("#balance-feedback"),
    balancePreview: document.querySelector("#balance-preview"),

    search: document.querySelector("#ledger-search"),
    typeFilter: document.querySelector("#ledger-type-filter"),
    weekFilter: document.querySelector("#ledger-week-filter"),
    clearFilters: document.querySelector("#clear-ledger-filters"),
    resultCount: document.querySelector("#ledger-result-count"),

    currentBalance: document.querySelector("#current-balance"),
    currentBalanceDetail: document.querySelector("#current-balance-detail"),
    latestBalance: document.querySelector("#latest-balance"),
    latestBalanceDate: document.querySelector("#latest-balance-date"),
    balanceDifference: document.querySelector("#balance-difference"),
    balanceDifferenceNote: document.querySelector("#balance-difference-note"),
    totalExpenses: document.querySelector("#total-expenses"),
    totalIncome: document.querySelector("#total-income"),

    ledgerBody: document.querySelector("#accounting-ledger"),
    ledgerEmpty: document.querySelector("#ledger-empty")
  };

  function readData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        balances: Array.isArray(parsed.balances) ? parsed.balances : []
      };
    } catch {
      return { entries: [], balances: [] };
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  function localDateString(date = new Date()) {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate.toISOString().slice(0, 10);
  }

  function parseLocalDate(dateString) {
    return new Date(`${dateString}T12:00:00`);
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(parseLocalDate(value));
  }

  function formatMoney(value) {
    return `${new Intl.NumberFormat("fr-FR").format(
      Math.round(Number(value) || 0)
    )} $`;
  }

  function weekStart(dateString) {
    const date = parseLocalDate(dateString);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return localDateString(date);
  }

  function weekEnd(mondayString) {
    const date = parseLocalDate(mondayString);
    date.setDate(date.getDate() + 6);
    return localDateString(date);
  }

  function weekLabel(mondayString) {
    return `Semaine du ${formatDate(mondayString)} au ${formatDate(weekEnd(mondayString))}`;
  }

  function getEntryWeek(entry) {
    return entry.weekStart || weekStart(entry.date);
  }

  function getBalanceWeek(balance) {
    return balance.weekStart || weekStart(balance.date);
  }

  function readBalancesChronologically(balances) {
    return [...balances].sort((a, b) => a.date.localeCompare(b.date));
  }

  function getCurrentUsername() {
    const user = window.LSHD?.readUser?.();
    return user?.username || "Compte inconnu";
  }

  function writeAudit(action, details) {
    if (typeof window.LSHD?.recordAudit === "function") {
      window.LSHD.recordAudit(action, details);
    }
  }

  function showFeedback(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("is-error", isError);
  }

  function periodTotals(entries, startDate, endDate) {
    const periodEntries = entries.filter(entry =>
      entry.date > startDate && entry.date <= endDate
    );

    const income = periodEntries
      .filter(entry => entry.type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const expenses = periodEntries
      .filter(entry => entry.type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    return { income, expenses };
  }

  function calculateReconciliation(previousBalance, currentBalance, entries) {
    const totals = periodTotals(
      entries,
      previousBalance.date,
      currentBalance.date
    );

    const calculated =
      Number(previousBalance.amount) + totals.income - totals.expenses;

    return {
      previous: Number(previousBalance.amount),
      income: totals.income,
      expenses: totals.expenses,
      calculated
    };
  }

  function calculateCurrentBalance(data, latestBalance) {
    const movements = data.entries.filter(entry =>
      entry.date >= latestBalance.date
    );

    const income = movements
      .filter(entry => entry.type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const expenses = movements
      .filter(entry => entry.type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    return {
      amount: Number(latestBalance.amount) + income - expenses,
      income,
      expenses
    };
  }

  function differenceLabel(difference) {
    if (difference > 0) return `+ ${formatMoney(difference)} à expliquer`;
    if (difference < 0) return `− ${formatMoney(Math.abs(difference))} à vérifier`;
    return "0 $ · équilibré";
  }

  function differenceExplanation(difference) {
    if (difference > 0) {
      return "Écart positif : petites recettes non notées ou autre entrée à vérifier.";
    }
    if (difference < 0) {
      return "Écart négatif : dépense ou sortie d’argent à vérifier.";
    }
    return "Le solde réel correspond au solde calculé.";
  }

  function createCell(text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  }

  function createActionButton(label, action, id, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.dataset[action] = id;
    return button;
  }

  function renderSummary(data) {
    const balances = readBalancesChronologically(data.balances);
    const latest = balances.at(-1);

    const expensesTotal = data.entries
      .filter(entry => entry.type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const incomeTotal = data.entries
      .filter(entry => entry.type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    elements.totalExpenses.textContent = formatMoney(expensesTotal);
    elements.totalIncome.textContent = formatMoney(incomeTotal);

    if (!latest) {
      elements.currentBalance.textContent = "Aucun relevé";
      elements.currentBalanceDetail.textContent = "Ajoute le premier relevé hebdomadaire.";
      elements.latestBalance.textContent = "Aucun relevé";
      elements.latestBalanceDate.textContent = "Aucun relevé hebdomadaire.";
      elements.balanceDifference.textContent = "—";
      elements.balanceDifferenceNote.textContent =
        "La comparaison commencera au prochain relevé.";
      return;
    }

    const current = calculateCurrentBalance(data, latest);

    elements.currentBalance.textContent = formatMoney(current.amount);
    elements.currentBalanceDetail.textContent =
      `Dernier relevé du ${formatDate(latest.date)} : ` +
      `+ ${formatMoney(current.income)} de recettes et ` +
      `− ${formatMoney(current.expenses)} de dépenses datées depuis ce relevé.`;

    elements.latestBalance.textContent = formatMoney(latest.amount);
    elements.latestBalanceDate.textContent = `Relevé du ${formatDate(latest.date)}`;

    const latestIndex = balances.findIndex(balance => balance.id === latest.id);

    if (latestIndex === 0) {
      elements.balanceDifference.textContent = "—";
      elements.balanceDifferenceNote.textContent =
        "Le prochain relevé pourra être comparé à celui-ci.";
      return;
    }

    const previous = balances[latestIndex - 1];
    const result = calculateReconciliation(previous, latest, data.entries);
    const difference = Number(latest.amount) - result.calculated;

    elements.balanceDifference.textContent = differenceLabel(difference);
    elements.balanceDifferenceNote.textContent = differenceExplanation(difference);
  }

  function makeLedgerRecords(data) {
    const records = [];

    data.entries.forEach(entry => {
      records.push({
        kind: "entry",
        id: entry.id,
        date: entry.date,
        week: getEntryWeek(entry),
        entry
      });
    });

    data.balances.forEach(balance => {
      records.push({
        kind: "balance",
        id: balance.id,
        date: balance.date,
        week: getBalanceWeek(balance),
        balance
      });
    });

    return records;
  }

  function populateWeekFilter(records) {
    const previousValue = elements.weekFilter.value;
    const weeks = [...new Set(records.map(record => record.week))]
      .sort((a, b) => b.localeCompare(a));

    elements.weekFilter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Toutes les semaines";
    elements.weekFilter.append(allOption);

    weeks.forEach(week => {
      const option = document.createElement("option");
      option.value = week;
      option.textContent = weekLabel(week);
      elements.weekFilter.append(option);
    });

    if (weeks.includes(previousValue)) {
      elements.weekFilter.value = previousValue;
    }
  }

  function normalizeSearch(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("fr-FR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function recordType(record) {
    if (record.kind === "balance") return "balance";
    return record.entry.type;
  }

  function recordSearchText(record) {
    if (record.kind === "entry") {
      const entry = record.entry;
      return [
        entry.description,
        entry.createdBy,
        entry.amount,
        entry.date,
        entry.type,
        weekLabel(record.week)
      ].join(" ");
    }

    const balance = record.balance;
    return [
      "relevé hebdomadaire solde",
      balance.amount,
      balance.note,
      balance.createdBy,
      balance.date,
      weekLabel(record.week)
    ].join(" ");
  }

  function filterRecords(records) {
    const query = normalizeSearch(elements.search.value);
    const chosenType = elements.typeFilter.value;
    const chosenWeek = elements.weekFilter.value;

    return records.filter(record => {
      const typeMatches =
        !chosenType || recordType(record) === chosenType;

      const weekMatches =
        !chosenWeek || record.week === chosenWeek;

      const searchMatches =
        !query || normalizeSearch(recordSearchText(record)).includes(query);

      return typeMatches && weekMatches && searchMatches;
    });
  }

  function createWeekSummary(week, weekRecords, data) {
    const entries = weekRecords
      .filter(record => record.kind === "entry")
      .map(record => record.entry);

    const income = entries
      .filter(entry => entry.type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const expenses = entries
      .filter(entry => entry.type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const balanceRecord = weekRecords.find(record => record.kind === "balance");
    const balanceText = balanceRecord
      ? ` · Solde vérifié : ${formatMoney(balanceRecord.balance.amount)}`
      : "";

    const summary = document.createElement("small");
    summary.textContent =
      `Recettes : ${formatMoney(income)} · ` +
      `Dépenses : ${formatMoney(expenses)} · ` +
      `Variation notée : ${income - expenses >= 0 ? "+ " : "− "}` +
      `${formatMoney(Math.abs(income - expenses))}${balanceText}`;

    return summary;
  }

  function renderEntryRow(entry) {
    const row = document.createElement("tr");

    row.append(createCell(formatDate(entry.date)));

    const typeCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className =
      `accounting-type ${entry.type === "expense" ? "is-expense" : ""}`;
    badge.textContent =
      entry.type === "expense" ? "Dépense" : "Recette importante";
    typeCell.append(badge);
    row.append(typeCell);

    row.append(createCell(entry.description));

    if (entry.type === "income") {
      row.append(createCell(`+ ${formatMoney(entry.amount)}`, "accounting-amount-income"));
      row.append(createCell("—"));
    } else {
      row.append(createCell("—"));
      row.append(createCell(`− ${formatMoney(entry.amount)}`, "accounting-amount-expense"));
    }

    row.append(createCell("—"));
    row.append(createCell("—"));
    row.append(createCell(entry.createdBy || "Compte inconnu"));

    const actionCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "accounting-row-actions";
    actions.append(
      createActionButton("Modifier", "editEntry", entry.id, "accounting-edit"),
      createActionButton("Supprimer", "deleteEntry", entry.id, "accounting-delete")
    );
    actionCell.append(actions);
    row.append(actionCell);

    return row;
  }

  function renderBalanceRow(balance, data) {
    const row = document.createElement("tr");

    row.append(createCell(formatDate(balance.date)));

    const typeCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "accounting-type is-balance";
    badge.textContent = "Relevé hebdomadaire";
    typeCell.append(badge);
    row.append(typeCell);

    const descriptionCell = document.createElement("td");
    const description = document.createElement("span");
    description.textContent = "Solde vérifié";
    descriptionCell.append(description);

    if (balance.note) {
      const note = document.createElement("small");
      note.className = "accounting-note";
      note.textContent = balance.note;
      descriptionCell.append(note);
    }

    row.append(descriptionCell);
    row.append(createCell("—"));
    row.append(createCell("—"));

    const chronological = readBalancesChronologically(data.balances);
    const balanceIndex = chronological.findIndex(item => item.id === balance.id);
    const balanceCell = document.createElement("td");

    balanceCell.className = "accounting-balance-value";
    balanceCell.append(document.createTextNode(formatMoney(balance.amount)));

    if (balanceIndex === 0) {
      const base = document.createElement("small");
      base.className = "accounting-balance-calculated";
      base.textContent = "Base de départ";
      balanceCell.append(base);
      row.append(balanceCell);
      row.append(createCell("Base de départ", "accounting-delta-neutral"));
    } else {
      const previous = chronological[balanceIndex - 1];
      const result = calculateReconciliation(previous, balance, data.entries);
      const difference = Number(balance.amount) - result.calculated;

      const calculated = document.createElement("small");
      calculated.className = "accounting-balance-calculated";
      calculated.textContent = `Calculé : ${formatMoney(result.calculated)}`;
      balanceCell.append(calculated);
      row.append(balanceCell);

      const differenceClass = difference > 0
        ? "accounting-delta-positive"
        : difference < 0
          ? "accounting-delta-negative"
          : "accounting-delta-neutral";

      row.append(createCell(differenceLabel(difference), differenceClass));
    }

    row.append(createCell(balance.createdBy || "Direction"));

    const actionCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "accounting-row-actions";
    actions.append(
      createActionButton("Modifier", "editBalance", balance.id, "accounting-edit"),
      createActionButton("Supprimer", "deleteBalance", balance.id, "accounting-delete")
    );
    actionCell.append(actions);
    row.append(actionCell);

    return row;
  }

  function renderLedger(data) {
    const allRecords = makeLedgerRecords(data);
    populateWeekFilter(allRecords);

    const records = filterRecords(allRecords);
    elements.ledgerBody.replaceChildren();
    elements.ledgerEmpty.hidden = records.length > 0;

    elements.resultCount.textContent =
      `${records.length} ligne${records.length > 1 ? "s" : ""}`;

    const grouped = new Map();

    records.forEach(record => {
      if (!grouped.has(record.week)) grouped.set(record.week, []);
      grouped.get(record.week).push(record);
    });

    const weeks = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

    weeks.forEach(week => {
      const weekRecords = grouped.get(week);
      const groupRow = document.createElement("tr");
      groupRow.className = "accounting-week-row";

      const groupCell = document.createElement("td");
      groupCell.colSpan = 9;

      const heading = document.createElement("span");
      heading.textContent = weekLabel(week);

      groupCell.append(heading, createWeekSummary(week, weekRecords, data));
      groupRow.append(groupCell);
      elements.ledgerBody.append(groupRow);

      weekRecords.sort((a, b) => {
        const dateOrder = a.date.localeCompare(b.date);
        if (dateOrder !== 0) return dateOrder;

        if (a.kind === b.kind) return 0;
        return a.kind === "balance" ? -1 : 1;
      });

      weekRecords.forEach(record => {
        const row = record.kind === "balance"
          ? renderBalanceRow(record.balance, data)
          : renderEntryRow(record.entry);

        elements.ledgerBody.append(row);
      });
    });
  }

  function render() {
    const data = readData();
    renderSummary(data);
    renderLedger(data);
  }

  function renderBalancePreview() {
    const date = elements.balanceDate.value;
    const amount = Number(elements.balanceAmount.value);

    elements.balancePreview.classList.remove("is-warning", "is-negative");

    if (!date || !Number.isFinite(amount) || amount < 0) {
      elements.balancePreview.textContent =
        "Choisis une date et saisis le solde pour voir la comparaison.";
      return;
    }

    const data = readData();
    const currentWeek = weekStart(date);
    const editingId = elements.balanceId.value;

    const previous = readBalancesChronologically(data.balances)
      .filter(balance =>
        balance.date < date &&
        getBalanceWeek(balance) !== currentWeek &&
        balance.id !== editingId
      )
      .at(-1);

    if (!previous) {
      elements.balancePreview.textContent =
        "Premier relevé : ce montant servira de base. " +
        "La comparaison commencera au prochain relevé.";
      return;
    }

    const result = calculateReconciliation(
      previous,
      { date, amount },
      data.entries
    );

    const difference = amount - result.calculated;

    if (difference > 0) {
      elements.balancePreview.classList.add("is-warning");
    } else if (difference < 0) {
      elements.balancePreview.classList.add("is-negative");
    }

    elements.balancePreview.textContent =
      `Solde précédent : ${formatMoney(result.previous)}. ` +
      `Recettes notées : ${formatMoney(result.income)}. ` +
      `Dépenses notées : ${formatMoney(result.expenses)}. ` +
      `Solde calculé : ${formatMoney(result.calculated)}. ` +
      `Solde réel saisi : ${formatMoney(amount)}. ` +
      `${differenceLabel(difference)}. ${differenceExplanation(difference)}`;
  }

  function resetEntryForm() {
    elements.entryForm.reset();
    elements.entryId.value = "";
    elements.entryDate.value = localDateString();
    elements.entrySubmit.textContent = "Ajouter l’opération";
    elements.entryCancel.hidden = true;
    showFeedback(elements.entryFeedback, "");
  }

  function resetBalanceForm() {
    elements.balanceForm.reset();
    elements.balanceId.value = "";
    elements.balanceDate.value = localDateString();
    elements.balanceSubmit.textContent = "Enregistrer le solde de la semaine";
    elements.balanceCancel.hidden = true;
    showFeedback(elements.balanceFeedback, "");
    renderBalancePreview();
  }

  function handleEntrySubmit(event) {
    event.preventDefault();

    const id = elements.entryId.value;
    const type = elements.entryType.value;
    const description = elements.entryDescription.value.trim();
    const amount = Number(elements.entryAmount.value);
    const date = elements.entryDate.value;
    const today = localDateString();

    if (!description || !date || !Number.isFinite(amount) || amount <= 0) {
      showFeedback(elements.entryFeedback, "Vérifie la description, la date et le montant.", true);
      return;
    }

    if (date > today) {
      showFeedback(elements.entryFeedback, "La date ne peut pas être dans le futur.", true);
      return;
    }

    const data = readData();
    const index = data.entries.findIndex(entry => entry.id === id);

    if (!id && data.entries.length >= MAX_ENTRIES) {
      showFeedback(elements.entryFeedback, "La limite d’opérations enregistrées est atteinte.", true);
      return;
    }

    const previous = index >= 0 ? data.entries[index] : null;

    const entry = {
      id: previous?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      description,
      amount: Math.round(amount),
      date,
      weekStart: weekStart(date),
      createdBy: previous?.createdBy || getCurrentUsername(),
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      data.entries[index] = entry;
    } else {
      data.entries.push(entry);
    }

    if (!saveData(data)) {
      showFeedback(elements.entryFeedback, "Le navigateur n’a pas pu enregistrer cette opération.", true);
      return;
    }

    writeAudit(
      index >= 0 ? "Modification d’une opération comptable" : "Ajout d’une opération comptable",
      `${description} — ${formatMoney(amount)}`
    );

    resetEntryForm();
    showFeedback(
      elements.entryFeedback,
      index >= 0 ? "Opération modifiée." : "Opération ajoutée."
    );
    render();
    renderBalancePreview();
  }

  function handleBalanceSubmit(event) {
    event.preventDefault();

    const id = elements.balanceId.value;
    const amount = Number(elements.balanceAmount.value);
    const date = elements.balanceDate.value;
    const note = elements.balanceNote.value.trim();
    const today = localDateString();

    if (!date || !Number.isFinite(amount) || amount < 0) {
      showFeedback(elements.balanceFeedback, "Vérifie la date et le montant du solde.", true);
      return;
    }

    if (date > today) {
      showFeedback(elements.balanceFeedback, "La date du relevé ne peut pas être dans le futur.", true);
      return;
    }

    const data = readData();
    const index = data.balances.findIndex(balance => balance.id === id);
    const currentWeek = weekStart(date);

    const duplicateWeek = data.balances.find(balance =>
      getBalanceWeek(balance) === currentWeek && balance.id !== id
    );

    if (duplicateWeek) {
      showFeedback(
        elements.balanceFeedback,
        "Un relevé existe déjà cette semaine. Modifie celui du registre ou supprime-le d’abord.",
        true
      );
      return;
    }

    const previous = index >= 0 ? data.balances[index] : null;

    const balance = {
      id: previous?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date,
      amount: Math.round(amount),
      note,
      weekStart: currentWeek,
      createdBy: previous?.createdBy || getCurrentUsername(),
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      data.balances[index] = balance;
    } else {
      data.balances.push(balance);
    }

    if (!saveData(data)) {
      showFeedback(elements.balanceFeedback, "Le navigateur n’a pas pu enregistrer ce relevé.", true);
      return;
    }

    writeAudit(
      index >= 0 ? "Modification d’un relevé comptable" : "Ajout d’un relevé comptable",
      `Solde relevé : ${formatMoney(amount)}`
    );

    resetBalanceForm();
    showFeedback(
      elements.balanceFeedback,
      index >= 0 ? "Relevé hebdomadaire modifié." : "Solde hebdomadaire enregistré."
    );
    render();
  }

  function editEntry(id) {
    const entry = readData().entries.find(item => item.id === id);
    if (!entry) return;

    elements.entryId.value = entry.id;
    elements.entryType.value = entry.type;
    elements.entryDescription.value = entry.description;
    elements.entryAmount.value = entry.amount;
    elements.entryDate.value = entry.date;
    elements.entrySubmit.textContent = "Enregistrer les modifications";
    elements.entryCancel.hidden = false;
    showFeedback(elements.entryFeedback, "Modification en cours.");
    elements.entryForm.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.entryDescription.focus();
  }

  function editBalance(id) {
    const balance = readData().balances.find(item => item.id === id);
    if (!balance) return;

    elements.balanceId.value = balance.id;
    elements.balanceAmount.value = balance.amount;
    elements.balanceDate.value = balance.date;
    elements.balanceNote.value = balance.note || "";
    elements.balanceSubmit.textContent = "Enregistrer les modifications";
    elements.balanceCancel.hidden = false;
    showFeedback(elements.balanceFeedback, "Modification en cours.");
    renderBalancePreview();
    elements.balanceForm.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.balanceAmount.focus();
  }

  function deleteEntry(id) {
    const data = readData();
    const entry = data.entries.find(item => item.id === id);
    if (!entry) return;

    if (!window.confirm(`Supprimer l’opération « ${entry.description} » ?`)) return;

    data.entries = data.entries.filter(item => item.id !== id);

    if (!saveData(data)) {
      window.alert("Le navigateur n’a pas pu supprimer cette opération.");
      return;
    }

    if (elements.entryId.value === id) resetEntryForm();

    writeAudit("Suppression d’une opération comptable", entry.description);
    render();
    renderBalancePreview();
  }

  function deleteBalance(id) {
    const data = readData();
    const balance = data.balances.find(item => item.id === id);
    if (!balance) return;

    if (!window.confirm(
      `Supprimer le relevé du ${formatDate(balance.date)} ? Les calculs seront mis à jour.`
    )) return;

    data.balances = data.balances.filter(item => item.id !== id);

    if (!saveData(data)) {
      window.alert("Le navigateur n’a pas pu supprimer ce relevé.");
      return;
    }

    if (elements.balanceId.value === id) resetBalanceForm();

    writeAudit(
      "Suppression d’un relevé comptable",
      `Relevé du ${formatDate(balance.date)}`
    );
    render();
    renderBalancePreview();
  }

  function handleLedgerAction(event) {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.editEntry) {
      editEntry(button.dataset.editEntry);
    } else if (button.dataset.deleteEntry) {
      deleteEntry(button.dataset.deleteEntry);
    } else if (button.dataset.editBalance) {
      editBalance(button.dataset.editBalance);
    } else if (button.dataset.deleteBalance) {
      deleteBalance(button.dataset.deleteBalance);
    }
  }

  function initialize() {
    if (!elements.entryForm || !elements.balanceForm) return;

    const today = localDateString();

    elements.entryDate.max = today;
    elements.balanceDate.max = today;
    elements.entryDate.value = today;
    elements.balanceDate.value = today;

    elements.entryForm.addEventListener("submit", handleEntrySubmit);
    elements.balanceForm.addEventListener("submit", handleBalanceSubmit);
    elements.ledgerBody.addEventListener("click", handleLedgerAction);

    elements.entryCancel.addEventListener("click", resetEntryForm);
    elements.balanceCancel.addEventListener("click", resetBalanceForm);

    elements.balanceAmount.addEventListener("input", renderBalancePreview);
    elements.balanceDate.addEventListener("change", renderBalancePreview);

    elements.search.addEventListener("input", render);
    elements.typeFilter.addEventListener("change", render);
    elements.weekFilter.addEventListener("change", render);

    elements.clearFilters.addEventListener("click", () => {
      elements.search.value = "";
      elements.typeFilter.value = "";
      elements.weekFilter.value = "";
      render();
    });

    render();
    renderBalancePreview();
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();