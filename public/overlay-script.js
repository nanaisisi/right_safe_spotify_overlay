const ws = new WebSocket('ws://127.0.0.1:8081/ws');
const trackNameElement = document.getElementById('track-name');
const artistNameElement = document.getElementById('artist-name');
const containerElement = document.getElementById('overlay-container');

let currentTrack = null;

ws.onopen = function() {
    console.log('WebSocket connected for OBS overlay');
};

ws.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        updateTrackInfo(data);
    } catch (error) {
        console.error('Error parsing WebSocket data:', error);
    }
};

ws.onclose = function() {
    console.log('WebSocket disconnected');
    showNoTrack();
};

ws.onerror = function(error) {
    console.error('WebSocket error:', error);
    showNoTrack();
};

function updateTrackInfo(data) {
    if (!data.trackName || !data.artistName) {
        showNoTrack();
        return;
    }

    // 楽曲が変わった場合のアニメーション
    const newTrackId = `${data.trackName}-${data.artistName}`;
    if (currentTrack !== newTrackId) {
        containerElement.classList.add('track-change');
        setTimeout(() => {
            containerElement.classList.remove('track-change');
        }, 600);
        currentTrack = newTrackId;
    }

    trackNameElement.textContent = data.trackName;
    artistNameElement.textContent = data.artistName;
    
    containerElement.classList.remove('no-track');
}

function showNoTrack() {
    trackNameElement.textContent = '楽曲が再生されていません';
    artistNameElement.textContent = 'Spotifyで音楽を再生してください';
    containerElement.classList.add('no-track');
    currentTrack = null;
}
