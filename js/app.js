// Menu mobile du site public et de l’espace membre
const mobileMenuButton = document.querySelector(".menu-toggle");
const publicNavigation = document.querySelector(".main-nav");

if (mobileMenuButton && publicNavigation) {
  mobileMenuButton.addEventListener("click", () => {
    const isOpen = publicNavigation.classList.toggle("open");
    mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

// Menu mobile de l’espace membre
const workspaceMenuButton = document.querySelector(".workspace-menu-toggle");
const workspaceNavigation = document.querySelector(".workspace-nav");

if (workspaceMenuButton && workspaceNavigation) {
  workspaceMenuButton.addEventListener("click", () => {
    const isOpen = workspaceNavigation.classList.toggle("open");
    workspaceMenuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

// Ouvrir ou fermer les menus déroulants
document.querySelectorAll(".nav-group-button").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest(".nav-group");
    const willOpen = !group.classList.contains("open");

    document.querySelectorAll(".nav-group.open").forEach((openGroup) => {
      openGroup.classList.remove("open");
      openGroup.querySelector(".nav-group-button").setAttribute("aria-expanded", "false");
    });

    if (willOpen) {
      group.classList.add("open");
      button.setAttribute("aria-expanded", "true");
    }
  });
});

// Fermer un menu déroulant quand on clique ailleurs
document.addEventListener("click", (event) => {
  if (!event.target.closest(".nav-group")) {
    document.querySelectorAll(".nav-group.open").forEach((group) => {
      group.classList.remove("open");
      group.querySelector(".nav-group-button").setAttribute("aria-expanded", "false");
    });
  }
});

// Année automatique dans les pieds de page
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

// Compte de démonstration V0.1
// Les identifiants sont visibles dans le code du site public.
const demoAccount = {
  username: "dev",
  password: "1212",
  role: "Développeur"
};

// Connexion de démonstration
const loginForm = document.querySelector("#login-form");

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.querySelector("#username").value.trim();
    const password = document.querySelector("#password").value;
    const feedback = document.querySelector("#login-feedback");

    if (
      username === demoAccount.username &&
      password === demoAccount.password
    ) {
      sessionStorage.setItem(
        "lshd-demo-user",
        JSON.stringify({
          username: demoAccount.username,
          role: demoAccount.role
        })
      );

      window.location.href = "espace.html#accueil";
      return;
    }

    if (feedback) {
      feedback.textContent = "Nom d’utilisateur ou mot de passe incorrect.";
    }
  });
}

// Pages de démonstration affichées dans l’espace membre
const workspacePages = {
  accueil: {
    title: "Accueil",
    description: "Bienvenue dans ton espace du LSHD.",
    home: true
  },
  patients: {
    title: "Patients",
    description: "Espace de suivi des patients.",
    message: "La liste des patients sera ajoutée dans une prochaine version."
  },
  agenda: {
    title: "Agenda",
    description: "Réunions, formations et événements du service.",
    message: "Aucun événement n’est affiché pour le moment."
  },

  "psy-ppa": { title: "PPA", description: "Espace PPA.", message: "Contenu à compléter." },
  "psy-formation-ppa": { title: "Formation PPA", description: "Support de formation PPA.", message: "Contenu à compléter." },
  "psy-ppa-police": { title: "PPA Police", description: "Espace PPA Police.", message: "Contenu à compléter." },
  "psy-formation-ppa-police": { title: "Formation PPA Police", description: "Support de formation PPA Police.", message: "Contenu à compléter." },
  "psy-pc": { title: "PC", description: "Espace PC.", message: "Contenu à compléter." },
  "psy-formation-pc": { title: "Formation PC", description: "Support de formation PC.", message: "Contenu à compléter." },
  "psy-pplh": { title: "PPLH", description: "Espace PPLH.", message: "Contenu à compléter." },
  "psy-formation-pplh": { title: "Formation PPLH", description: "Support de formation PPLH.", message: "Contenu à compléter." },
  "psy-suivi-patient": { title: "Suivi patient", description: "Espace de suivi en psychologie.", message: "Contenu à compléter." },

  "addicto-bilan": { title: "Bilan addictologique", description: "Bilan addictologique (AUDIT / DAST).", message: "Formulaire à préparer." },
  "addicto-sevrage": { title: "Suivi de sevrage", description: "Espace de suivi de sevrage.", message: "Formulaire à préparer." },

  psychiatrie: { title: "Psychiatrie", description: "Espace psychiatrie.", message: "Rubrique à définir." },
  kinesitherapie: { title: "Kinésithérapie", description: "Espace kinésithérapie.", message: "Rubrique à définir." },

  "formation-outils": { title: "Outils de base", description: "Matériel et outils du service.", message: "Support à compléter." },
  "formation-tenues": { title: "Tenues", description: "Tenues du service.", message: "Support à compléter." },
  "formation-vehicules": { title: "Véhicules", description: "Véhicules du service.", message: "Support à compléter." },
  "formation-medicale": { title: "Formation médicale", description: "Formations du corps médical.", message: "Support à compléter." },
  chirurgie: { title: "Chirurgie", description: "Espace chirurgie.", message: "Formations et registres à ajouter." },
  generaliste: { title: "Médecine générale", description: "Espace médecine générale.", message: "Formations à ajouter." },

  "doc-visite": { title: "Visite médicale", description: "Créer une visite médicale.", message: "Formulaire à préparer." },
  "doc-visite-supervision": { title: "Superviser une visite", description: "Supervision des visites médicales.", message: "Espace à compléter." },
  "doc-arret": { title: "Arrêt de travail", description: "Créer une attestation d’arrêt de travail.", message: "Formulaire à préparer." },
  "doc-arret-supervision": { title: "Superviser un arrêt", description: "Supervision des arrêts de travail.", message: "Espace à compléter." },
  "doc-blessures": { title: "Coups et blessures", description: "Créer une attestation de coups et blessures.", message: "Formulaire à préparer." },
  "doc-deces": { title: "Certificat de décès", description: "Créer un certificat de décès.", message: "Formulaire à préparer." },
  "doc-registre": { title: "Registre des documents", description: "Registre des documents du service.", message: "Registre à préparer." },

  personnel: { title: "Personnel", description: "Informations personnelles du membre.", message: "Profil, contrat, règlement, salaire et primes seront ajoutés ici." },
  "haut-garde": { title: "Haut grade", description: "Outils réservés aux hauts grades.", message: "Avis et permissions à définir." },
  direction: { title: "Direction", description: "Outils de direction.", message: "Comptabilité, documents, primes et salaires à définir." },
  "dev-logs": { title: "Logs développeur", description: "Journal technique du site.", message: "Aucun journal disponible." },
  parametres: { title: "Paramètres", description: "Paramètres de l’espace membre.", message: "Aucun paramètre disponible pour le moment." }
};

const workspaceTitle = document.querySelector("#workspace-title");
const workspaceDescription = document.querySelector("#workspace-description");
const workspaceContent = document.querySelector("#workspace-content");

function createWorkspaceCard(title, description, pageId) {
  const link = document.createElement("a");
  link.className = "workspace-card";
  link.href = `#${pageId}`;
  link.dataset.pageLink = pageId;

  const heading = document.createElement("strong");
  heading.textContent = title;

  const text = document.createElement("span");
  text.textContent = description;

  link.append(heading, text);
  return link;
}

function renderWorkspacePage() {
  if (!workspaceContent) return;

  const pageId = window.location.hash.slice(1) || "accueil";
  const page = workspacePages[pageId] || {
    title: "Page à définir",
    description: "",
    message: "Cette rubrique sera complétée plus tard."
  };

  workspaceTitle.textContent = page.title;
  workspaceDescription.textContent = page.description;
  workspaceContent.replaceChildren();

  document.querySelectorAll("[data-page-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.pageLink === pageId);
  });

  if (page.home) {
    const intro = document.createElement("div");
    intro.className = "welcome-panel";

    const greeting = document.createElement("p");
    greeting.textContent = "Bienvenue dans ton espace de travail.";

    const note = document.createElement("p");
    note.textContent =
      "Choisis une rubrique dans le menu pour accéder aux outils du LSHD.";

    intro.append(greeting, note);

    const quickLinks = document.createElement("div");
    quickLinks.className = "workspace-cards";

    quickLinks.append(
      createWorkspaceCard("Patients", "Accéder à l’espace patients.", "patients"),
      createWorkspaceCard("Agenda", "Voir les dates du service.", "agenda"),
      createWorkspaceCard("Formations", "Retrouver les supports du service.", "formation-medicale"),
      createWorkspaceCard("Documents", "Accéder aux documents prévus.", "doc-visite")
    );

    workspaceContent.append(intro, quickLinks);
    return;
  }

  const emptyPanel = document.createElement("div");
  emptyPanel.className = "empty-panel";

  const icon = document.createElement("span");
  icon.className = "empty-panel-icon";
  icon.textContent = "✚";

  const message = document.createElement("p");
  message.textContent = page.message || "";

  emptyPanel.append(icon, message);
  workspaceContent.append(emptyPanel);
}

window.addEventListener("hashchange", renderWorkspacePage);

// Vérification de démonstration de la session
if (document.body.hasAttribute("data-protected-page")) {
  const savedUser = sessionStorage.getItem("lshd-demo-user");

  if (!savedUser) {
    window.location.href = "connexion.html";
  } else {
    try {
      const user = JSON.parse(savedUser);

      document.querySelectorAll("[data-user-name]").forEach((element) => {
        element.textContent = user.username;
      });

      document.querySelectorAll("[data-user-role]").forEach((element) => {
        element.textContent = user.role;
      });

      renderWorkspacePage();
    } catch {
      sessionStorage.removeItem("lshd-demo-user");
      window.location.href = "connexion.html";
    }
  }
}

// Déconnexion
document.querySelectorAll("[data-logout]").forEach((button) => {
  button.addEventListener("click", () => {
    sessionStorage.removeItem("lshd-demo-user");
    window.location.href = "connexion.html";
  });
});

// Les autres formulaires restent des maquettes et n’envoient rien.
document.querySelectorAll(".demo-form:not(#login-form)").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const feedback = form.querySelector(".form-feedback");

    if (feedback) {
      feedback.textContent =
        "Maquette V0.1 : aucun message n’est enregistré ou envoyé.";
    }
  });
});