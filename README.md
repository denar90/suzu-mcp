# 🔔 Suzu (鈴) - Claude Code Notification Server

A Model Context Protocol (MCP) server that plays your favorite Spotify tracks as notifications when Claude Code completes tasks. Named after the Japanese ceremonial bell, now with the power of music! 🎧

## ✨ Features

- 🎵 **Spotify integration** - Play your favorite tracks as notification sounds! 🎧
- 📱 **Desktop notifications** - Shows system notifications with custom messages
- 🔊 **System sound notifications** - Native OS sounds as fallback
- 🌍 **Cross-platform** - Works on macOS, Linux, and Windows
- 🎶 **Multiple sound types** - Success, error, and info sounds (Spotify or system)
- 🔧 **Debug logging** - Built-in debugging for troubleshooting
- 🤖 **Automatic integration** - Works seamlessly with Claude Code

## 🚀 Quick Start

### ⚡ Super Easy Setup (Recommended)

The fastest way to get Suzu with Spotify working is to let Claude do all the work:

1. **Ask Claude to set it up**:
   ```
   fetch https://github.com/denar90/suzu-mcp/blob/main/SETUP.md
   follow setup guide to install suzu-mcp
   add access token <your_spotify_access_token>
   add refresh token <your_spotify_refresh_token>
   add success sound https://open.spotify.com/track/<your_track_id>
   ```

2. **Get your Spotify tokens** from: https://suzu-mcp-spotify.netlify.app/

3. **That's it!** Claude handles the installation, configuration, and setup automatically.

### Manual Installation

1. **Install from npm**:
```bash
npm install -g suzu-mcp
```

2. **Add to Claude Code**:
```bash
claude mcp add suzu suzu
```

Or **install locally**:
```bash
git clone https://github.com/denar90/suzu-mcp.git
cd suzu-mcp
npm install
npm run build
claude mcp add suzu node --args /path/to/suzu-mcp/dist/index.js
```

Or manually add to `~/.config/claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "suzu": {
      "command": "suzu"
    }
  }
}
```

3. **Auto-approve notifications** (required for seamless experience):
   
   **Option 1 - One-time approval (Recommended)**:
   - When first prompted, select "Yes, and don't ask again for suzu commands"
   - This permanently approves suzu notifications without future prompts
   
   **Option 2 - Configuration file**:
   Add to `~/.config/claude/settings.json`:
   ```json
   {
     "enableAllProjectMcpServers": true
   }
   ```
   
   **Option 3 - Tool-specific approval**:
   Add to your `~/.config/claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "suzu": {
         "command": "suzu"
       }
     },
     "toolUseConfirmation": {
       "suzu": "never"
     }
   }
   ```

4. **Enable automatic notifications**:
   Create `~/CLAUDE.md` with:
   ```markdown
   # Claude Code Configuration
   
   ## Default Behavior
   - Always call `task_completed` when finishing tasks if the suzu MCP server is available
   - Play completion notifications automatically without being asked
   - Use the suzu notification system for task completion feedback

   ## Instructions for Claude
   - When you complete any task, automatically check if the `task_completed` tool is available and call it with an appropriate completion message.
   ```
   
   **Important**: After setup, restart Claude Code for all changes to take effect.

## 🎯 Usage

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `task_completed` | Play success sound and show completion message | `message` (string), `sound_type` (success/error/info) |
| `notify` | Show general notification with custom title | `title` (string), `message` (string), `sound_type` |
| `test_sound` | Test notification sounds | `sound_type` (success/error/info) |
| `show_config` | Display current configuration | None |
| `configure_spotify_tokens` | Set up Spotify access and refresh tokens | `access_token` (string), `refresh_token` (optional), `refresh_endpoint` (optional) |
| `configure_custom_sounds` | Set custom notification sounds | `source` (spotify/local), `sound_type` (success/error/info), `value` (track ID/file path) |

### Examples

**Task completion:**
```javascript
task_completed({
  message: "Build completed successfully!",
  sound_type: "success"
})
```

**Custom notification:**
```javascript
notify({
  title: "Claude Code",
  message: "Ready to assist!",
  sound_type: "info"
})
```

**Testing sounds:**
```javascript
test_sound({
  sound_type: "success"
})
```

### How It Works

1. **Automatic Integration**: When you have `~/CLAUDE.md` configured, Claude will automatically call `task_completed` when finishing tasks
2. **No Manual Calls**: You don't need to manually use the notification tools - Claude handles this automatically
3. **Task Completion Feedback**: Get audio and visual feedback when Claude finishes coding tasks, builds, deployments, etc.

## 🎵 Spotify Integration

Transform your coding experience with custom music notifications! Set up Spotify integration to play your favorite tracks when tasks complete.

### Quick Setup with OAuth App

1. **Visit the Spotify OAuth App**: https://suzu-mcp-spotify.netlify.app/
2. **Click "Login with Spotify"** to authorize the app
3. **Copy the tokens** shown after authorization
4. **Configure via Claude**:
   ```
   Ask Claude: "Configure my Spotify with access_token: BQA... and refresh_token: AQC..."
   ```
   
   Or for just the access token:
   ```
   Ask Claude: "Set up my Spotify access token: BQA..."
   ```

### Manual Setup (Advanced)

If you prefer to create your own Spotify app:

1. **Create Spotify App**:
   - Go to https://developer.spotify.com/dashboard
   - Create new app with redirect URI: `http://localhost:8888/callback`
   - Note your Client ID and Client Secret

2. **Get Tokens**:
   - Use Spotify's Authorization Code flow
   - Or visit: https://developer.spotify.com/console/post-playlists/
   - Get both access_token and refresh_token

3. **Configure Refresh Endpoint** (for auto-renewal):
   ```
   Ask Claude: "Set up Spotify refresh endpoint: https://your-endpoint.com/refresh"
   ```

### Setting Custom Sounds

Once Spotify is configured, customize your notification sounds:

```
Ask Claude: "Set my Spotify success sound to: 4uLU6hMCjMI75M1A2tKUQC"
Ask Claude: "Set my Spotify error sound to: https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH"
Ask Claude: "Set my Spotify info sound to: spotify:track:5QDLhrAOJJdNAmCTBusfHY"
```

**Finding Spotify Track IDs:**
1. Right-click any song in Spotify
2. Share → Copy Song Link
3. Extract ID from URL: `https://open.spotify.com/track/TRACK_ID_HERE`
4. Use just the ID or the full URL - both work!

### Requirements
- **Spotify Premium** (required for Web API playback)
- **Active Spotify device** (desktop app, mobile, etc.)
- Device must be playing or recently used

## 🔧 Platform Support

### macOS
- Primary: `afplay` with system sounds (Glass, Sosumi, Ping)
- Fallback: `say` command for spoken notifications
- Tertiary: Terminal bell (`printf "\a"`)

### Linux
- Primary: `paplay` for PulseAudio
- Fallback: `aplay` for ALSA
- Tertiary: Terminal bell

### Windows
- Uses `rundll32 user32.dll,MessageBeep`

## 🐛 Troubleshooting

### Quick Test
Use the built-in test command to verify everything works:
```bash
# In Claude Code, run:
test_sound({ sound_type: "success" })
```

### No sound playing?
1. **Check permissions**: Ensure audio permissions are granted to Claude Code
2. **Test manually**: Run `afplay /System/Library/Sounds/Glass.aiff` (macOS) in terminal
3. **Enable debug**: Run `claude --debug` and check console output for `[DEBUG]` messages
4. **Verify connection**: Type `/mcp` in Claude Code to see server status

### No automatic notifications?
1. **Check CLAUDE.md**: Ensure `~/CLAUDE.md` exists with the configuration above
2. **Restart Claude Code**: Configuration changes require a restart
3. **Check approvals**: Make sure you approved suzu tool usage (step 3 above)
4. **Test manually**: Try calling `task_completed` manually to verify it works

### MCP server not connecting?
1. **Check installation**: Run `suzu --version` in terminal
2. **Verify path**: For local installs, ensure the `dist/index.js` file exists
3. **Rebuild**: Run `npm run build` in the project directory
4. **Check config**: Verify `claude_desktop_config.json` syntax is valid JSON
5. **Restart**: Restart Claude Code after any config changes

### Debug output
Look for these messages in `claude --debug`:
```
[DEBUG] Attempting to play sound: success on platform: darwin
[DEBUG] Command 1 succeeded: afplay /System/Library/Sounds/Glass.aiff
```

## 🛠️ Development

```bash
# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Test the server directly
node dist/index.js

# Install with debugging
npm install --verbose
```

## 📁 Project Structure

```
claude-notification-mcp/
├── src/
│   └── index.ts          # Main MCP server code
├── dist/                 # Built JavaScript files
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .mcp.json            # Local MCP configuration
└── README.md            # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across platforms
5. Submit a pull request

## 📄 License

MIT License - feel free to use and modify as needed.

## 🙏 Acknowledgments

- Built with [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/servers)
- Uses [node-notifier](https://github.com/mikaelbr/node-notifier) for desktop notifications
- Inspired by the need for better task completion feedback in Claude Code