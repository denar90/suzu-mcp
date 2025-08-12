# Suzu Spotify OAuth Web App

A web application for generating Spotify access tokens and refresh tokens for the Suzu MCP notification system.

## Features

- 🎵 **Spotify OAuth Flow** - Complete authorization with Spotify
- 🔄 **Automatic Token Refresh** - API endpoint for refreshing expired tokens
- 🔐 **Secure Token Handling** - Environment-based client credentials
- 🌐 **Netlify Functions** - Serverless backend with Vite frontend
- 🔔 **MCP Integration** - Designed for Suzu MCP notification server

## Prerequisites

- Node.js 18+ installed
- ngrok installed (`brew install ngrok` or download from [ngrok.com](https://ngrok.com))
- Spotify Developer App (get from [Spotify Dashboard](https://developer.spotify.com/dashboard))

## Setup Instructions

### 1. Clone and Install

```bash
cd app
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials and app URL
# Get Spotify credentials from https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Set your app URL (important for OAuth redirects)
APP_URL=https://your-ngrok-url.ngrok-free.app  # For local development
# APP_URL=https://your-app.netlify.app         # For production
```

### 3. Start ngrok Tunnel

ngrok creates a secure tunnel to your local development server, providing an HTTPS URL that Spotify can use for OAuth redirects.

```bash
# In a separate terminal, start ngrok
ngrok http 5173
```

**Finding your ngrok URL:**

After running the command, you'll see output like this:
```
ngrok                                                                   
                                                                        
Session Status                online                                    
Session Expires               7 hours, 59 minutes                      
Terms of Service              https://ngrok.com/tos                    
Version                       3.x.x                                     
Region                        United States (us)                       
Latency                       -                                         
Web Interface                 http://127.0.0.1:4040                    
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:5173

Connections                   ttl     opn     rt1     rt5     p50     p90 
                              0       0       0.00    0.00    0.00    0.00
```

🔗 **Copy the HTTPS URL** from the "Forwarding" line (e.g., `https://abc123def456.ngrok-free.app`)

📝 **Update your .env file** with this URL:
```bash
APP_URL=https://abc123def456.ngrok-free.app
```

⚠️ **Important Notes:**
- Always use the **HTTPS** URL (not HTTP)
- The URL changes every time you restart ngrok (unless you have a paid plan)
- Keep the ngrok terminal window open while developing

### 4. Configure Spotify App Redirect URI

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click **"Edit Settings"**
4. Add redirect URI: `https://YOUR_NGROK_URL.ngrok-free.app/api/spotify-callback` (use the same URL from your APP_URL)
5. Click **"Save"**

### 5. Start Development Server

```bash
npm run dev
```

## Quick Start Workflow

1. **Start ngrok:** `ngrok http 5173`
2. **Copy HTTPS URL** from ngrok output 
3. **Update .env:** Set `APP_URL=https://your-ngrok-url.ngrok-free.app`
4. **Update Spotify app** redirect URI in dashboard
5. **Start dev server:** `npm run dev`
6. **Visit ngrok URL** to get tokens

## Usage

### For End Users (Getting Tokens)

1. **Visit the ngrok URL:** `https://YOUR_NGROK_URL.ngrok-free.app`
2. **Click "🎵 Authorize with Spotify"**
3. **Complete Spotify authorization**
4. **Copy both tokens:**
   - **Access Token** (expires in 1 hour)
   - **Refresh Token** (for automatic renewal)

### For MCP Server Integration

Configure your Suzu MCP server with both tokens:

```json
{
  "spotify_access_token": "BQC4hYs5wJYoq...",
  "spotify_refresh_token": "AQCq4hYs5wJYoq...",
  "spotify_refresh_url": "https://YOUR_NGROK_URL.ngrok-free.app/api/spotify-refresh"
}
```

## API Endpoints

### `GET /api/spotify-auth`
Initiates Spotify OAuth flow
- Returns: `{"authUrl": "https://accounts.spotify.com/authorize?..."}`

### `GET /api/spotify-callback`  
Handles OAuth callback from Spotify
- Returns: HTML page with access and refresh tokens

### `POST /api/spotify-refresh`
Refreshes expired access tokens

**Request:**
```json
{
  "refresh_token": "AQCq4hYs5wJYoq..."
}
```

**Response:**
```json
{
  "access_token": "BQC4hYs5wJYoq...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "user-modify-playbook-state ..."
}
```

## File Structure

```
app/
├── netlify/functions/          # Serverless functions
│   ├── spotify-auth.mjs       # OAuth initiation
│   ├── spotify-callback.mjs   # OAuth callback handler  
│   └── spotify-refresh.mjs    # Token refresh endpoint
├── index.html                 # Frontend UI
├── main.js                    # Frontend JavaScript
├── vite.config.js            # Vite configuration
├── netlify.toml              # Netlify configuration
├── .env.example              # Environment template
└── package.json              # Dependencies
```

## Development Notes

- **Environment Variables:** Loaded via `dotenv` in functions
- **APP_URL Configuration:** Must be set to your app's public URL (ngrok for dev, Netlify for production)
- **HTTPS Requirement:** Spotify OAuth requires HTTPS URLs
- **Token Security:** Never commit real tokens to version control
- **Function Logs:** Check terminal for detailed function execution logs

## Troubleshooting

### "Invalid redirect URI" Error
- Ensure ngrok URL is added to Spotify app settings
- Use HTTPS ngrok URL (not HTTP)
- Match exact callback path: `/api/spotify-callback`

### Functions Not Found (404)
- Check that functions are in `netlify/functions/` directory
- Ensure files have `.mjs` extension
- Verify ngrok is tunneling to correct port (5173)

### Environment Variables Not Loading
- Check `.env` file exists in project root
- Verify `dotenv.config()` is called in functions
- Ensure `APP_URL` is set to your current ngrok URL
- Restart development server after changing `.env`

### ngrok Issues
- **"ngrok not found":** Install ngrok with `brew install ngrok` or download from [ngrok.com](https://ngrok.com)
- **Authentication required:** Run `ngrok config add-authtoken <your_token>` (get token from [ngrok dashboard](https://dashboard.ngrok.com))
- **URL changed:** ngrok generates a new URL each restart - update `.env` and Spotify redirect URI
- **Port already in use:** Make sure only one ngrok instance is running on port 5173

### Production/Netlify Issues
- **Environment variables not working:** Ensure all variables are set in Netlify dashboard under Site Settings > Environment Variables
- **Functions returning 500 errors:** Check Netlify function logs in your site dashboard
- **"Server configuration error":** Verify `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `APP_URL` are set correctly
- **OAuth redirect mismatch:** Ensure `APP_URL` matches your actual Netlify domain and is added to Spotify app settings

## Production Deployment

For production use:

1. **Deploy to Netlify:** Connect your repo to Netlify
2. **Set Environment Variables:** In Netlify dashboard under **Site Settings > Environment Variables**, add:
   - `SPOTIFY_CLIENT_ID` (your Spotify app client ID)
   - `SPOTIFY_CLIENT_SECRET` (your Spotify app client secret)
   - `APP_URL` (your production domain, e.g., `https://your-app.netlify.app`)
   - `NODE_ENV` set to `production`
3. **Update Spotify App:** Add production domain to redirect URIs
4. **Update MCP Configuration:** Point to production URLs

## Security Notes

- 🔐 Keep client secret secure (never in frontend)
- 🔒 Use HTTPS in production
- ⏰ Access tokens expire in 1 hour
- 🔄 Refresh tokens for long-term access
- 🚫 Never commit `.env` to version control