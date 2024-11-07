document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login");
  const errorText = document.getElementById("error");

  loginButton.addEventListener("click", async () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data?.token) {
          // Store the token and user data in localStorage
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Redirect to homepage
          window.location.href = "/";
        } else {
          errorText.innerText = "Login failed: No token received.";
        }
      } else if (response.status === 401) {
        errorText.innerText = "Invalid username or password";
      } else {
        errorText.innerText = "An unexpected error occurred. Please try again.";
      }
    } catch (error) {
      console.error("Login error:", error);
      errorText.innerText = "An error occurred. Please try again.";
    }
  });
});
