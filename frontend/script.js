const CLIENT_ID = '7164f50cc1404eaeb7ddff90df15f827';
const REDIRECT_URI = 'http://localhost:5500/';
const BACKEND_URL = 'http://localhost:5001'; // Backend running on port 5001

const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative'
].join(' ');

// Utility Function to Generate Random String for State
function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Function to Get Query Parameters from URL
function getQueryParams() {
    const params = {};
    window.location.search.substring(1).split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
            params[key] = decodeURIComponent(value);
        }
    });
    return params;
}

// Login Button Event Listener
document.getElementById('login-button').addEventListener('click', () => {
    const state = generateRandomString(16);
    localStorage.setItem('auth_state', state);
    const authURL = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
    window.location = authURL;
});

// On Window Load
window.onload = () => {
    const params = getQueryParams();
    const storedState = localStorage.getItem('auth_state');

    if (params.state !== storedState) {
        if (params.error) {
            alert(`Error: ${params.error_description || params.error}`);
        }
        return;
    }

    if (params.code) {
        // Exchange code for tokens
        fetch(`${BACKEND_URL}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: params.code, state: params.state })
        })
        .then(response => response.json())
        .then(data => {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                document.getElementById('login-button').style.display = 'none';
                document.getElementById('content').style.display = 'block';
                fetchPlaylists(data.access_token);

                // Remove code and state from URL to prevent reuse
                window.history.replaceState({}, document.title, "/");
            } else {
                const errorMsg = data.error_description || 'Authentication failed.';
                alert(`Error: ${errorMsg}`);
            }
        })
        .catch(err => {
            console.error(err);
            alert('An unexpected error occurred during authentication.');
        });
    } else {
        // Check if user is already authenticated
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('content').style.display = 'block';
            fetchPlaylists(accessToken);
        }
    }
};

// Fetch User Playlists
function fetchPlaylists(accessToken) {
    fetch(`${BACKEND_URL}/api/playlists`, {
        method: 'GET',
        headers: {
            'Authorization': accessToken
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.items) {
            displayPlaylists(data.items);
        } else {
            alert('Failed to fetch playlists.');
        }
    })
    .catch(err => {
        console.error(err);
        alert('Failed to fetch playlists.');
    });
}

// Display Playlists on Frontend
function displayPlaylists(playlists) {
    const playlistsContainer = document.getElementById('playlists');
    playlistsContainer.innerHTML = ''; // Clear any existing content

    if (playlists.length === 0) {
        playlistsContainer.innerHTML = '<p>No playlists found.</p>';
        return;
    }

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

// Log Rejection and Suggest Song
document.getElementById('log-rejection').addEventListener('click', () => {
    const mood = document.getElementById('mood-select').value;
    // Suggest a song based on mood
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
        const playlistId = getDefaultPlaylistId(); // Replace with your actual playlist ID

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
                const errorMsg = data.error || 'Failed to add the song to your playlist.';
                alert(`Error: ${errorMsg}`);
            }
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred while adding the song.');
        });
    });
});

// Function to Map Song Names to Spotify URIs
function getSongUri(songName) {
    // For production, implement a dynamic search to Spotify API to fetch song URIs
    // Here, we use a predefined mapping for demonstration purposes
    const songMapping = {
        'Someone Like You - Adele': 'spotify:track:4kflIGfjdZJW0y29J1pYce',
        'Stairway to Heaven - Led Zeppelin': 'spotify:track:7otXgaI1H0HyEgo02iRcjM',
        'Eye of the Tiger - Survivor': 'spotify:track:2rD1L9hhF7qv9AlHfjFX7C',
        'Shape of You - Ed Sheeran': 'spotify:track:7qiZfU4dY1lWllzX7mPBI3'
    };

    return songMapping[songName] || null;
}

// Function to Get Default Playlist ID
function getDefaultPlaylistId() {
    // Replace with your actual playlist ID
    // You can get this from the playlist URL on Spotify
    // Example URL: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
    return '37i9dQZF1DXcBWIGoYBM5M'; // Example Playlist ID
}

// Function to Refresh Access Token (Optional Enhancement)
function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        alert('No refresh token available. Please log in again.');
        return;
    }

    fetch(`${BACKEND_URL}/api/refresh-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            // Optionally, update UI or notify user
            console.log('Access token refreshed successfully.');
        } else {
            const errorMsg = data.error_description || 'Token refresh failed.';
            alert(`Error: ${errorMsg}`);
        }
    })
    .catch(err => {
        console.error(err);
        alert('An unexpected error occurred during token refresh.');
    });
}
