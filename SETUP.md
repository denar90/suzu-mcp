# Suzu MCP Setup Guide

## Installation
```bash
npm install -g suzu-mcp
claude mcp add suzu suzu-mcp
```

## Spotify Setup
1. Get tokens: https://suzu-mcp-spotify.netlify.app/
2. Configure:
   ```
   configure_spotify_tokens({ access_token: "BQA...", refresh_token: "AQC..." })
   configure_custom_sounds({ source: "spotify", sound_type: "success", value: "TRACK_ID_OR_URL" })
   ```

## Auto-notifications
Add to `~/CLAUDE.md`:
```markdown
## Default Behavior
- Always call `task_completed` when finishing tasks if the suzu MCP server is available
```

## Tools
- `task_completed` - Play notification
- `configure_spotify_tokens` - Set Spotify access
- `configure_custom_sounds` - Set notification tracks
- `test_sound` - Test sounds