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

// Les formulaires sont des maquettes : ils n’envoient aucune donnée.
document.querySelectorAll(".demo-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const feedback = form.querySelector(".form-feedback");

    if (feedback) {
      feedback.textContent =
        "Maquette V0.1 : aucun compte n’est vérifié et aucun message n’est envoyé.";
    }
  });
});