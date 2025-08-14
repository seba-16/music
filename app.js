const API_KEY = "AIzaSyBE0vt6HCpz5Vg5pxBRIf7p_VbVMLkpW5M";
let currentPlayer;
let currentIndex = 0;
let searchResults = [];
let nextPageToken = null;
let currentQuery = "";

const searchInput = document.getElementById("searchInput");
const suggestionsContainer = document.createElement("div");
suggestionsContainer.className = "absolute bg-gray-800 text-white w-full mt-1 rounded shadow-lg z-50 max-h-64 overflow-y-auto";
searchInput.parentElement.appendChild(suggestionsContainer);

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim();
  if (!query) {
    suggestionsContainer.innerHTML = "";
    return;
  }

  const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}&callback=suggestCallback`;
  const script = document.createElement("script");
  script.src = url;
  script.setAttribute("data-temp", "true");
  document.body.appendChild(script);
  document.querySelectorAll("script[data-temp]").forEach(s => s.remove());
});

function suggestCallback(data) {
  const queries = data[1];
  suggestionsContainer.innerHTML = "";

  queries.forEach(([suggestion]) => {
    const div = document.createElement("div");
    div.textContent = suggestion;
    div.className = "px-4 py-2 hover:bg-gray-700 cursor-pointer";
    div.onclick = () => {
      searchInput.value = suggestion;
      suggestionsContainer.innerHTML = "";
      searchSong();
    };
    suggestionsContainer.appendChild(div);
  });
}

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    suggestionsContainer.innerHTML = "";
    searchSong();
  }
});

async function searchSong() {
  const query = searchInput.value.trim();
  if (!query) return;

  currentQuery = query;
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "Searching...";
  searchResults = [];
  currentIndex = 0;
  nextPageToken = null;

  const data = await fetchResults(query);
  resultsDiv.innerHTML = "";

  if (!data || !data.items || !data.items.length) {
    resultsDiv.innerHTML = "<p>No results found.</p>";
    return;
  }

  data.items.forEach((item, index) => renderVideoItem(item, index));
  nextPageToken = data.nextPageToken;
}

async function fetchResults(query, pageToken = "") {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}&maxResults=5&pageToken=${pageToken}`
    );

    if (!response.ok) {
      alert("YouTube API error. Please check your API key or quota.");
      return null;
    }

    return await response.json();
  } catch (error) {
    alert("Failed to fetch data from YouTube API.");
    return null;
  }
}

function renderVideoItem(item, index, isAutoRelated = false) {
  const videoId = item.id.videoId;
  const title = item.snippet.title;
  const thumbnail = item.snippet.thumbnails.medium.url;

  const videoContainer = document.createElement("div");
  videoContainer.className = "bg-gray-800 rounded p-4 shadow mt-4";

  videoContainer.innerHTML = `
    <div class="flex items-center space-x-4">
      <img src="${thumbnail}" class="w-32 rounded" />
      <div>
        <p class="text-lg font-semibold">${title} ${isAutoRelated ? "(Auto-Related)" : ""}</p>
        <button onclick="playVideo('${videoId}', this, ${searchResults.length})" class="mt-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white">Play</button>
        <div class="mt-2 video-player hidden"></div>
        <p class="text-red-500 mt-2 hidden">This video is unavailable for this music player.</p>
      </div>
    </div>
  `;

  document.getElementById("results").appendChild(videoContainer);
  searchResults.push(item);
}

function playVideo(videoId, button, index) {
  currentIndex = index;

  const floatingContainer = document.getElementById("floatingPlayer");
  const playerContent = document.getElementById("floatingPlayerContent");
  floatingContainer.classList.remove("hidden");

  const iframe = document.createElement("iframe");
  iframe.width = "100%";
  iframe.height = "200";
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  iframe.frameBorder = "0";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;

  playerContent.innerHTML = "";
  playerContent.appendChild(iframe);

  window.addEventListener("message", function onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.event === "onStateChange" && data.info === 0) {
        window.removeEventListener("message", onMessage);
        autoPlayNext(videoId);
      }
    } catch (_) {}
  });
}

function autoPlayNext(currentVideoId) {
  if (currentIndex + 1 < searchResults.length) {
    const nextVideo = searchResults[currentIndex + 1];
    currentIndex += 1;
    playVideo(nextVideo.id.videoId, findPlayButton(currentIndex), currentIndex);
  }
}

function findPlayButton(index) {
  const buttons = document.querySelectorAll("#results button");
  return buttons[index];
}

// Infinite scroll instead of More button
window.addEventListener("scroll", async () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    if (!nextPageToken || !currentQuery) return;
    const data = await fetchResults(currentQuery, nextPageToken);
    if (!data || !data.items.length) return;

    data.items.forEach((item, index) => renderVideoItem(item, searchResults.length + index));
    nextPageToken = data.nextPageToken || null;
  }
});

// Close floating player
document.getElementById("closePlayerBtn").addEventListener("click", () => {
  const player = document.getElementById("floatingPlayer");
  const content = document.getElementById("floatingPlayerContent");

  content.innerHTML = "";
  player.classList.add("hidden");
});

// Make floating player draggable
(function makePlayerDraggable() {
  const player = document.getElementById("floatingPlayer");
  let isDragging = false, offsetX = 0, offsetY = 0;

  player.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - player.getBoundingClientRect().left;
    offsetY = e.clientY - player.getBoundingClientRect().top;
    player.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      player.style.left = e.clientX - offsetX + "px";
      player.style.top = e.clientY - offsetY + "px";
      player.style.right = "auto";
      player.style.bottom = "auto";
      player.style.position = "fixed";
    }
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    player.style.cursor = "grab";
  });
})();
