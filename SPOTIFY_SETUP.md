# Spotify Setup for Suzu

## Getting Your Spotify Access Token

1. **Create a Spotify App**
   - Go to https://developer.spotify.com/dashboard
   - Click "Create App"
   - Fill in:
     - App Name: "Suzu Notifications"
     - App Description: "Personal notification sounds"
     - Redirect URI: `http://localhost:8888/callback`
   - Check "Web API" and agree to terms

2. **Get Your Access Token**
   - Go to: https://developer.spotify.com/console/post-playlists/
   - Click "Get Token" and authorize with your Spotify account
   - Copy the access token (starts with `BQA...`)

3. **Configure via Claude**
   - Tell Claude: "Configure Spotify with access token: YOUR_TOKEN_HERE"
   - Tell Claude: "Set Spotify success sound to: 4uLU6hMCjMI75M1A2tKUQC" (just the track ID!)

## Finding Track IDs

**Easy way (just the ID):**
1. In Spotify, right-click any track
2. Go to "Share" → "Copy Song Link"  
3. Extract ID from URL: `https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC`
4. Use just the ID: `4uLU6hMCjMI75M1A2tKUQC`

**Alternative ways (all work):**
- Spotify URI: `spotify:track:4uLU6hMCjMI75M1A2tKUQC`
- Spotify URL: `https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC`
- Track ID only: `4uLU6hMCjMI75M1A2tKUQC`

## Requirements

- Spotify Premium account (required for Web API playback)
- Active Spotify device (desktop app, phone, etc.)
- Device must be playing or recently active

## Token Expiration

Access tokens expire after 1 hour. Get a new one from the Spotify Console when needed.