# 🔔 Suzu (鈴) - Claude Code Notification Server

A Model Context Protocol (MCP) server that provides gentle chime notifications and desktop alerts for Claude Code task completion. Named after the Japanese ceremonial bell.

## ✨ Features

- 🔊 **System sound notifications** - Plays native OS sounds when tasks complete
- 📱 **Desktop notifications** - Shows system notifications with custom messages
- 🌍 **Cross-platform** - Works on macOS, Linux, and Windows
- 🎵 **Multiple sound types** - Success, error, and info sounds
- 🔧 **Debug logging** - Built-in debugging for troubleshooting
- 🤖 **Automatic integration** - Works seamlessly with Claude Code

## 🚀 Quick Start

### Installation

1. **Install from npm**:
```bash
npm install -g suzu-mcp
```

2. **Add to Claude Code**:
```bash
claude mcp add suzu suzu-mcp
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
      "command": "suzu-mcp"
    }
  }
}
```

3. **Auto-approve notifications** (optional):
   - When prompted, select "Yes, and don't ask again for suzu commands"
   - Or add to `~/.config/claude/settings.json`:
   ```json
   {
     "enableAllProjectMcpServers": true
   }
   ```

4. **Enable automatic notifications**:
   Create `~/CLAUDE.md` with:
   ```markdown
   # Claude Code Configuration
   
   ## Default Behavior
   - Always call `task_completed` when finishing tasks if the chime MCP server is available
   - Play completion notifications automatically without being asked
   ```

## 🎯 Usage

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `task_completed` | Play success sound and show completion message | `message` (string), `sound_type` (success/error/info) |
| `notify` | Show general notification with custom title | `title` (string), `message` (string), `sound_type` |

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

### No sound playing?
1. **Check permissions**: Ensure audio permissions are granted
2. **Test manually**: Run `afplay /System/Library/Sounds/Glass.aiff` (macOS)
3. **Enable debug**: Run `claude --debug` and check console output
4. **Verify connection**: Check `/mcp` in Claude Code for server status

### MCP server not connecting?
1. **Check path**: Ensure the `dist/index.js` file exists
2. **Rebuild**: Run `npm run build`
3. **Check config**: Verify `claude_desktop_config.json` syntax
4. **Restart**: Restart Claude Code after config changes

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