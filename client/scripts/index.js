document.addEventListener("DOMContentLoaded", () => {
  const newTweetInput = document.getElementById("new-tweet");
  const postTweetButton = document.getElementById("post-tweet");
  const logoutButton = document.getElementById("logout");

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
  }

  // Retrieve the user information from localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) {
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
                    <h3 class="font-semibold">${tweet.username}</h3>
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
    const query = "SELECT * FROM tweets ORDER BY id DESC";
    const response = await fetch(`/api/feed?q=${query}`, {
      headers: {
        "Authorization": `Bearer ${token}`, // Include the token in the headers
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
    const username = user.username; // Use the parsed user information
    const timestamp = new Date().toISOString();
    const text = newTweetInput.value;
    const query = `INSERT INTO tweets (username, timestamp, text) VALUES ('${username}', '${timestamp}', '${text}')`;
    await fetch("/api/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, // Send the token for authentication
      },
      body: JSON.stringify({ query }),
    });
    await getFeed();
    newTweetInput.value = "";
  };

  postTweetButton.addEventListener("click", postTweet);
  newTweetInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      postTweet();
    }
  });

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user"); // Remove user data on logout
    window.location.href = "/login.html";
  });

  getFeed(); // Initial load of the feed
});
