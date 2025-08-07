document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = document.getElementById("message");
  message.style.display = "none";
  message.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    message.textContent = "Veuillez remplir tous les champs.";
    message.style.color = "#e74c3c";
    message.style.display = "block";
    return;
  }

  try {
    const result = await window.api.login({ email, password });

    if (!result.success) {
      // affiche ton message d'erreur…
      message.textContent =
        result.message || "Email ou mot de passe incorrect.";
      message.style.color = "#e74c3c";
      message.style.display = "block";
      return;
    }

    // Connexion réussie - recharger vers l'app React
    if (result.success) {
      // Afficher un message de succès
      message.textContent = "Connexion réussie, redirection...";
      message.style.color = "#27ae60";
      message.style.display = "block";

      // Attendre un peu puis recharger
      setTimeout(() => {
        if (process.env.NODE_ENV === "development") {
          window.location.href = "http://localhost:5173";
        } else {
          // En production, on utilisera une méthode IPC pour recharger
          window.electronAPI.loadReactApp();
        }
      }, 1000);
    }
  } catch (err) {
    message.textContent = "Erreur serveur, réessayez plus tard.";
    message.style.color = "#e74c3c";
    message.style.display = "block";
    console.error(err);
  }
});
