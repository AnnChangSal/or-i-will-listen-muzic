const CLIENT_ID = '7164f50cc1404eaeb7ddff90df15f827';
const REDIRECT_URI = 'http://localhost:5500/';
const BACKEND_URL = 'http://localhost:5001'; // Backend running on port 5001

const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email'
].join(' ');

document.getElementById('login-button').addEventListener('click', () => {
    const authURL = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    window.location = authURL;
});

// Function to get query parameters
function getQueryParams() {
    const params = {};
    window.location.search.substring(1).split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        params[key] = decodeURIComponent(value);
    });
    return params;
}

window.onload = () => {
    const params = getQueryParams();
    if (params.code) {
        // Exchange code for tokens
        fetch(`${BACKEND_URL}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: params.code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                document.getElementById('login-button').style.display = 'none';
                document.getElementById('content').style.display = 'block';
                fetchPlaylists(data.access_token);
            } else {
                alert('Authentication failed.');
            }
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred during authentication.');
        });
    }
};

function fetchPlaylists(accessToken) {
    fetch(`${BACKEND_URL}/api/playlists`, {
        method: 'GET',
        headers: {
            'Authorization': accessToken
        }
    })
    .then(response => response.json())
    .then(data => {
        displayPlaylists(data.items);
    })
    .catch(err => {
        console.error(err);
        alert('Failed to fetch playlists.');
    });
}

function displayPlaylists(playlists) {
    const playlistsContainer = document.getElementById('playlists');
    playlistsContainer.innerHTML = ''; // Clear any existing content

    playlists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        playlistElement.className = 'playlist-card';

        playlistElement.innerHTML = `
            <img src="${playlist.images[0] ? playlist.images[0].url : 'https://via.placeholder.com/150'}" alt="${playlist.name}" />
            <h3>${playlist.name}</h3>
            <p>${playlist.tracks.total} Tracks</p>
            <a href="${playlist.external_urls.spotify}" target="_blank">Open in Spotify</a>
        `;

        playlistsContainer.appendChild(playlistElement);
    });
}

document.getElementById('log-rejection').addEventListener('click', () => {
    const mood = document.getElementById('mood-select').value;
    // Mock song suggestion based on mood
    let song;
    switch (mood) {
        case 'sad':
            song = 'Someone Like You - Adele';
            break;
        case 'indifferent':
            song = 'Stairway to Heaven - Led Zeppelin';
            break;
        case 'motivated':
            song = 'Eye of the Tiger - Survivor';
            break;
        default:
            song = 'Shape of You - Ed Sheeran';
    }

    document.getElementById('suggestion').innerHTML = `
        <p>Your suggested song:</p>
        <p><strong>${song}</strong></p>
        <button id="save-playlist">Save to Spotify Playlist</button>
    `;

    document.getElementById('save-playlist').addEventListener('click', () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            alert('Please log in first.');
            return;
        }

        // Implement adding the song to a Spotify playlist
        // For demonstration, we'll map the song to its Spotify URI
        const songUri = getSongUri(song);
        const playlistId = getDefaultPlaylistId(); // Implement a function to get your playlist ID

        if (!songUri) {
            alert('Song URI not found.');
            return;
        }

        fetch(`${BACKEND_URL}/api/add-song`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': accessToken
            },
            body: JSON.stringify({ playlistId, songUri })
        })
        .then(response => response.json())
        .then(data => {
            if (data.snapshot_id) {
                alert(`"${song}" has been added to your Spotify playlist!`);
            } else {
                alert('Failed to add the song to your playlist.');
            }
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred while adding the song.');
        });
    });
});

function getSongUri(songName) {
    // Implement a search to Spotify API to get the song's URI
    // For simplicity, maintain a mapping of song titles to URIs
    const songMapping = {
        'Someone Like You - Adele': 'spotify:track:4kflIGfjdZJW0y29J1pYce',
        'Stairway to Heaven - Led Zeppelin': 'spotify:track:7otXgaI1H0HyEgo02iRcjM',
        'Eye of the Tiger - Survivor': 'spotify:track:2rD1L9hhF7qv9AlHfjFX7C',
        'Shape of You - Ed Sheeran': 'spotify:track:7qiZfU4dY1lWllzX7mPBI3'
    };

    return songMapping[songName] || null;
}

function getDefaultPlaylistId() {
    // Can change this to a different playlist ID
    // You can get this from the playlist URL on Spotify
    // Example URL: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
    return '37i9dQZF1DXcBWIGoYBM5M'; // Example Playlist ID
}
