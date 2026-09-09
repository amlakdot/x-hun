const scanBtn = document.getElementById("scanBtn");
const status = document.getElementById("status");
const results = document.getElementById("results");

scanBtn.addEventListener("click", async () => {
  results.innerHTML = "";
  status.textContent = "Scanning visible posts...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id) {
      throw new Error("No active tab.");
    }

    if (
      !tab.url.startsWith("https://x.com/") &&
      !tab.url.startsWith("https://twitter.com/")
    ) {
      throw new Error("Open X first.");
    }

    const response = await chrome.tabs.sendMessage(
      tab.id,
      { action: "scan" }
    );

    if (!response || !response.posts) {
      throw new Error("No posts found.");
    }

    displayResults(response.posts);

  } catch (error) {
    console.error(error);
    status.textContent = error.message;
  }
});


function displayResults(posts) {

  if (!posts.length) {
    status.textContent =
      "No visible posts found. Scroll the X page and try again.";
    return;
  }

  status.textContent =
    `${posts.length} posts found.`;

  posts.forEach((post, index) => {

    const card = document.createElement("div");
    card.className = "card";

    const scoreClass =
      post.score >= 80
        ? "hot"
        : post.score >= 60
          ? "warm"
          : "";

    card.innerHTML = `
      <div class="top">
        <span class="rank">#${index + 1}</span>
        <span class="score ${scoreClass}">
          ${post.score}/100
        </span>
      </div>

      <div class="author">
        ${escapeHtml(post.author)}
      </div>

      <div class="text">
        ${escapeHtml(post.text)}
      </div>

      <div class="stats">
        <span>❤️ ${formatNumber(post.likes)}</span>
        <span>💬 ${formatNumber(post.replies)}</span>
        <span>🔁 ${formatNumber(post.reposts)}</span>
        <span>👁 ${formatNumber(post.views)}</span>
      </div>

      <div class="age">
        ${escapeHtml(post.age)}
      </div>

      <a
        class="open"
        href="${post.url}"
        target="_blank"
      >
        Open post ↗
      </a>
    `;

    results.appendChild(card);
  });
}


function formatNumber(number) {

  if (!number || Number.isNaN(number)) {
    return "0";
  }

  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + "M";
  }

  if (number >= 1000) {
    return (number / 1000).toFixed(1) + "K";
  }

  return number.toString();
}


function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
