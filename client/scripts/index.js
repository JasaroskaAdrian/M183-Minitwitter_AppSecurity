document.addEventListener("DOMContentLoaded", () => {
  const newTweetInput = document.getElementById("new-tweet");
  const postTweetButton = document.getElementById("post-tweet");
  const logoutButton = document.getElementById("logout");

  //This turns these &, <, >, "", ', into not potentially dangerous chars
  const escapeCode = (str) => {
    if (!str) return ''; // Return an empty string if str is null or undefined
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
            <div class="bg-slate-600 rounded p-4 flex gap-4 items-center border-l-4 border-blue-400" >
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
    try {
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
    } catch (error) {
      console.error("Error fetching feed:", error);
      alert("An error occurred while loading the feed.");
    }
  };

  const postTweet = async () => {
    try {
      const text = newTweetInput.value.trim();

      const query = text; // Uses the tweet text as the query

      const response = await fetch("/api/feed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }), // Sends the tweet text as the query
      });

      if (!response.ok) {
        console.error("Failed to post tweet:", response.statusText);
        return;
      }

      await getFeed();
      newTweetInput.value = ""; // Clears the input after posting
    } catch (error) {
      console.error("Error posting tweet:", error);
      alert("An error occurred while posting the tweet.");
    }
  };

  postTweetButton.addEventListener("click", postTweet);
  newTweetInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      postTweet();
    }
  });

  logoutButton.addEventListener("click", () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user"); // Remove user data on logout
      window.location.href = "/login.html";
    } catch (error) {
      console.error("Error during logout:", error);
      alert("An error occurred during logout.");
    }
  });

  getFeed(); // Initial load of the feed
});
