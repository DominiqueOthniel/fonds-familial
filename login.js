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

    if (result.success) {
      sessionStorage.setItem("userRole", result.role);
      window.location.href = "dashboard.html";
    } else {
      message.textContent = result.message || "Email ou mot de passe incorrect.";
      message.style.color = "#e74c3c";
      message.style.display = "block";
    }
  } catch (err) {
    message.textContent = "Erreur serveur, réessayez plus tard.";
    message.style.color = "#e74c3c";
    message.style.display = "block";
    console.error(err);
  }
});
