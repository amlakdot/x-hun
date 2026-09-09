function parseNumber(value) {

  if (!value) return 0;

  value = value
    .toString()
    .trim()
    .replace(/,/g, "");

  if (/^\d+(\.\d+)?K$/i.test(value)) {
    return parseFloat(value) * 1000;
  }

  if (/^\d+(\.\d+)?M$/i.test(value)) {
    return parseFloat(value) * 1000000;
  }

  const number = parseInt(value.replace(/[^\d]/g, ""), 10);

  return Number.isNaN(number) ? 0 : number;
}


function getMetric(article, labels) {

  const buttons = article.querySelectorAll(
    '[role="button"]'
  );

  for (const button of buttons) {

    const label =
      button.getAttribute("aria-label") || "";

    for (const keyword of labels) {

      if (
        label.toLowerCase().includes(
          keyword.toLowerCase()
        )
      ) {
        const match = label.match(
          /([\d,.]+(?:[KM])?)/i
        );

        if (match) {
          return parseNumber(match[1]);
        }
      }
    }
  }

  return 0;
}


function getPostScore(post) {

  /*
    فعلاً یک امتیاز ساده داریم:

    Engagement:
      likes + replies + reposts

    Freshness:
      پست‌های جدید امتیاز بیشتری می‌گیرند.
  */

  const engagement =
    post.likes +
    post.replies * 2 +
    post.reposts * 2;

  let score = 0;

  if (engagement >= 10000) score += 45;
  else if (engagement >= 5000) score += 40;
  else if (engagement >= 2000) score += 35;
  else if (engagement >= 1000) score += 30;
  else if (engagement >= 500) score += 25;
  else if (engagement >= 100) score += 18;
  else score += 8;

  const age = post.age.toLowerCase();

  if (
    age.includes("now") ||
    age.includes("m") ||
    age.includes("min")
  ) {
    score += 45;
  }
  else if (
    age.includes("h") ||
    age.includes("hour")
  ) {
    score += 25;
  }
  else {
    score += 10;
  }

  return Math.min(
    Math.round(score),
    100
  );
}


function extractPosts() {

  const articles =
    document.querySelectorAll(
      'article[data-testid="tweet"]'
    );

  const posts = [];

  articles.forEach(article => {

    try {

      const textElement =
        article.querySelector(
          '[data-testid="tweetText"]'
        );

      const text =
        textElement?.innerText?.trim() || "";

      if (!text) return;


      const links =
        [...article.querySelectorAll("a")];

      const statusLink =
        links.find(link =>
          link.href &&
          /\/status\/\d+/.test(link.href)
        );

      const url =
        statusLink?.href || "";


      const userLink =
        links.find(link =>
          /^https:\/\/(x|twitter)\.com\/[^/]+$/.test(
            link.href
          )
        );

      const author =
        userLink
          ? "@" +
            userLink.href
              .split("/")
              .filter(Boolean)
              .pop()
          : "Unknown";


      const timeElement =
        article.querySelector("time");

      const age =
        timeElement?.innerText ||
        timeElement?.getAttribute("datetime") ||
        "Unknown";


      const likes =
        getMetric(
          article,
          ["likes", "like"]
        );


      const replies =
        getMetric(
          article,
          ["replies", "reply"]
        );


      const reposts =
        getMetric(
          article,
          ["reposts", "repost"]
        );


      const views =
        getMetric(
          article,
          ["views", "view"]
        );


      const post = {
        author,
        text,
        url,
        age,
        likes,
        replies,
        reposts,
        views,
        score: 0
      };


      post.score =
        getPostScore(post);


      posts.push(post);

    } catch (error) {

      console.warn(
        "Could not parse post:",
        error
      );

    }

  });


  /*
    حذف موارد تکراری
  */

  const unique =
    posts.filter(
      (post, index, self) =>
        index ===
        self.findIndex(
          item => item.url === post.url
        )
    );


  /*
    مرتب‌سازی از بهترین فرصت
    به ضعیف‌ترین
  */

  unique.sort(
    (a, b) => b.score - a.score
  );


  return unique.slice(0, 30);
}


chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    if (message.action === "scan") {

      const posts =
        extractPosts();

      sendResponse({
        posts
      });

      return true;
    }

  }
);
