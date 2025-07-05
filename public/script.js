const trackName = document.getElementById("track-name");
const artistName = document.getElementById("artist-name");
const loginLink = document.getElementById("login-link");

const ws = new WebSocket(`ws://${location.host}/ws`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  trackName.textContent = data.trackName;
  artistName.textContent = data.artistName;

  if (loginLink) {
    loginLink.style.display = "none";
  }
};
