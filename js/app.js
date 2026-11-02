// Menu mobile
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const menuIsOpen = navigation.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(menuIsOpen));
  });
}

// Année automatique dans le pied de page
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

// Compte de démonstration
// Ces identifiants sont visibles dans le code public.
// Ils ne doivent pas être utilisés pour protéger de vraies données.
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
      const demoUser = {
        username: demoAccount.username,
        role: demoAccount.role
      };

      sessionStorage.setItem("lshd-demo-user", JSON.stringify(demoUser));
      window.location.href = "espace.html";
      return;
    }

    feedback.textContent = "Nom d’utilisateur ou mot de passe incorrect.";
  });
}

// Vérification visuelle de la session de démonstration
if (document.body.hasAttribute("data-protected-page")) {
  const savedUser = sessionStorage.getItem("lshd-demo-user");

  if (!savedUser) {
    window.location.href = "connexion.html";
  } else {
    const user = JSON.parse(savedUser);

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = user.username;
    });

    document.querySelectorAll("[data-user-role]").forEach((element) => {
      element.textContent = user.role;
    });
  }
}

// Déconnexion de démonstration
document.querySelectorAll("[data-logout]").forEach((button) => {
  button.addEventListener("click", () => {
    sessionStorage.removeItem("lshd-demo-user");
    window.location.href = "connexion.html";
  });
});