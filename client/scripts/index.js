document.addEventListener("DOMContentLoaded", () => {
  const newTweetInput = document.getElementById("new-tweet");
  const postTweetButton = document.getElementById("post-tweet");
  const logoutButton = document.getElementById("logout");

  // Escapes potentially dangerous characters -> TODO: DO it Server side, not client side
  const escapeCode = (str) => {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (match) => {
      const escapeChars = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return escapeChars[match];
    });
  };

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
  }

  // Retrieve the user information from localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username || user === undefined) { 
    console.error("User information not found. Redirecting to login.");
    window.location.href = "/login.html";
  }

  const generateTweet = (tweet) => {
    const date = new Date(tweet.timestamp).toLocaleDateString("de-CH", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    const tweetElement = `
        <div id="feed" class="flex flex-col gap-2 w-full">
            <div class="bg-slate-600 rounded p-4 flex gap-4 items-center border-l-4 border-blue-400">
                <img src="./img/tweet.png" alt="SwitzerChees" class="w-14 h-14 rounded-full" />
                <div class="flex flex-col grow">
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-gray-200">
                    <h3 class="font-semibold">${escapeCode(tweet.username)}</h3>
                    <p class="text-sm">${date}</p>
                    </div>
                </div>
                <p>${tweet.text}</p>
                </div>
            </div>
        </div>
      `;
    return tweetElement;
  };

  const getFeed = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = user?.token;

    const query = "";

    const response = await fetch(`/api/feed?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const tweets = await response.json();
      const tweetsHTML = tweets.map(generateTweet).join("");
      document.getElementById("feed").innerHTML = tweetsHTML;
    } else if (response.status === 401) {
      console.error("Unauthorized access. Redirecting to login.");
      window.location.href = "/login.html";
    } else {
      console.error("Failed to load feed:", response.statusText);
    }
  };

  const postTweet = async () => {
    const text = newTweetInput.value.trim();
    if (!text) return; // Ensure there's text to post

    await fetch("/api/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    await getFeed();
    newTweetInput.value = ""; // Clears the input after posting
  };

  postTweetButton.addEventListener("click", postTweet);
  newTweetInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      postTweet();
    }
  });

  // Updated logout button event handler
  logoutButton.addEventListener("click", async () => {
    const token = localStorage.getItem("token");

    // Send a request to the server to log out
    await fetch("/api/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Clear localStorage and redirect to login page
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login.html";
  });

  getFeed(); // Initial load of the feed
});
