#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
const notifier = require('node-notifier');
const player = require('play-sound');
const SpotifyWebApi = require('spotify-web-api-node');
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const server = new Server(
  {
    name: "suzu",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const sound = player({});

// Track active audio processes for keyboard interruption
let activeAudioProcesses: any[] = [];

// Track Spotify auto-pause timer to prevent conflicts
let spotifyPauseTimer: NodeJS.Timeout | null = null;


// Setup keyboard interrupt handling
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', () => {
  if (activeAudioProcesses.length > 0) {
    console.error('[DEBUG] Keyboard interrupt - stopping audio playback');
    activeAudioProcesses.forEach(proc => {
      try {
        if (proc && proc.kill) {
          proc.kill('SIGTERM');
        }
      } catch (e) {}
    });
    activeAudioProcesses = [];
  }
});

// Load configuration
let config: any = {};
try {
  const configPath = path.join(__dirname, '..', 'suzu-config.json');
  const userConfigPath = path.join(os.homedir(), '.suzu', 'config.json');
  
  // Try user config first, then default
  if (fs.existsSync(userConfigPath)) {
    config = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
  } else if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.error('[DEBUG] Config loading failed, using defaults:', error);
  config = { customSounds: { enabled: false }, fallbackToSystem: true };
}

// Token refresh function
async function refreshSpotifyToken(): Promise<boolean> {
  try {
    const refreshToken = config.customSounds?.sources?.spotify?.refreshToken;
    const refreshEndpoint = config.customSounds?.sources?.spotify?.refreshEndpoint;
    
    if (!refreshToken || !refreshEndpoint) {
      console.error('[DEBUG] Refresh token or endpoint not configured');
      return false;
    }
    
    console.error(`[DEBUG] Refreshing Spotify token using endpoint: ${refreshEndpoint}`);
    
    const response = await fetch(refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (!response.ok) {
      console.error(`[DEBUG] Token refresh failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.access_token) {
      // Update the in-memory config
      config.customSounds.sources.spotify.accessToken = data.access_token;
      
      // Update Spotify API instance
      if (spotifyApi) {
        spotifyApi.setAccessToken(data.access_token);
      }
      
      // Save to config file
      const configPath = path.join(__dirname, '..', 'suzu-config.json');
      const userConfigPath = path.join(os.homedir(), '.suzu', 'config.json');
      
      try {
        let configToUpdate = config;
        let fileToUpdate = configPath;
        
        // Use user config if it exists
        if (fs.existsSync(userConfigPath)) {
          fileToUpdate = userConfigPath;
          configToUpdate = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
        }
        
        configToUpdate.customSounds.sources.spotify.accessToken = data.access_token;
        fs.writeFileSync(fileToUpdate, JSON.stringify(configToUpdate, null, 2));
        
        const tokenPreview = data.access_token.substring(0, 12) + '...' + data.access_token.substring(data.access_token.length - 8);
        console.error(`[DEBUG] Token refreshed successfully: ${tokenPreview}`);
        console.error(`[DEBUG] Updated config file: ${fileToUpdate}`);
        
        return true;
      } catch (error) {
        console.error('[DEBUG] Failed to save refreshed token to config:', error);
        return false;
      }
    } else {
      console.error('[DEBUG] No access_token in refresh response:', data);
      return false;
    }
  } catch (error) {
    console.error('[DEBUG] Token refresh error:', error);
    return false;
  }
}

// Initialize Spotify API if configured
let spotifyApi: any = null;
if (config.customSounds?.sources?.spotify?.enabled) {
  spotifyApi = new SpotifyWebApi();
  if (config.customSounds.sources.spotify.accessToken) {
    spotifyApi.setAccessToken(config.customSounds.sources.spotify.accessToken);
  }
}

// Create a custom sound function with multiple source support
async function playNotificationSound(soundType: 'success' | 'error' | 'info' = 'success') {
  try {
    console.error(`[DEBUG] Playing ${soundType}: custom=${config.customSounds?.enabled} spotify=${config.customSounds?.sources?.spotify?.enabled} token=${!!config.customSounds?.sources?.spotify?.accessToken} api=${!!spotifyApi} local=${config.customSounds?.sources?.local?.enabled} fallback=${config.fallbackToSystem}`);
    
    // Try custom sounds first if enabled
    if (config.customSounds?.enabled) {
      console.error(`[DEBUG] STEP 1: Custom sounds enabled, trying sources...`);
      
      // Try Spotify first
      if (config.customSounds.sources?.spotify?.enabled && spotifyApi) {
        console.error(`[DEBUG] STEP 2: Spotify conditions met, attempting playback...`);
        console.error(`[DEBUG] Using soundType: ${soundType}`);
        const trackUri = config.customSounds.sources.spotify.tracks[soundType];
        if (trackUri) {
          console.error(`[DEBUG] STEP 3: Found track ${trackUri} for type ${soundType}, calling Spotify API...`);
          try {
            await spotifyApi.play({ uris: [trackUri] });
            console.error(`[DEBUG] STEP 4: Spotify API call SUCCESS - should be playing now!`);
            
            // Clear any existing pause timer to prevent conflicts
            if (spotifyPauseTimer) {
              clearTimeout(spotifyPauseTimer);
              console.error(`[DEBUG] Cleared previous Spotify pause timer`);
            }
            
            // Stop playback after 7 seconds
            spotifyPauseTimer = setTimeout(async () => {
              try {
                await spotifyApi.pause();
                console.error(`[DEBUG] Stopped Spotify playback after 7 seconds`);
                spotifyPauseTimer = null;
              } catch (pauseError) {
                console.error(`[DEBUG] Failed to pause Spotify after 7 seconds:`, pauseError);
                spotifyPauseTimer = null;
              }
            }, 7000);
            
            return;
          } catch (error: any) {
            console.error(`[DEBUG] ===== SPOTIFY ERROR DETAILS =====`);
            console.error(`[DEBUG] Error message: ${error?.message || 'No message'}`);
            console.error(`[DEBUG] Error status/statusCode: ${error?.status || error?.statusCode || 'No status'}`);
            console.error(`[DEBUG] Error body: ${JSON.stringify(error?.body || error?.response?.body || 'No body')}`);
            console.error(`[DEBUG] Full error object: ${JSON.stringify(error, null, 2)}`);
            console.error(`[DEBUG] Error name/type: ${error?.name || typeof error}`);
            
            // Check for common issues - check multiple possible locations for status code
            const statusCode = error?.status || error?.statusCode || error?.body?.error?.status;
            console.error(`[DEBUG] Extracted status code: ${statusCode}`);
            
            if (statusCode === 404) {
              console.error(`[DEBUG] ERROR TYPE: No active device found - open Spotify app`);
            } else if (statusCode === 401) {
              console.error(`[DEBUG] ERROR TYPE: Invalid/expired access token - attempting refresh...`);
              const refreshed = await refreshSpotifyToken();
              if (refreshed) {
                console.error(`[DEBUG] Token refreshed, retrying playback...`);
                try {
                  await spotifyApi.play({ uris: [trackUri] });
                  console.error(`[DEBUG] Spotify playback SUCCESS after token refresh!`);
                  
                  // Clear any existing pause timer to prevent conflicts
                  if (spotifyPauseTimer) {
                    clearTimeout(spotifyPauseTimer);
                    console.error(`[DEBUG] Cleared previous Spotify pause timer (post-refresh)`);
                  }
                  
                  // Stop playback after 7 seconds
                  spotifyPauseTimer = setTimeout(async () => {
                    try {
                      await spotifyApi.pause();
                      console.error(`[DEBUG] Stopped Spotify playback after 7 seconds (post-refresh)`);
                      spotifyPauseTimer = null;
                    } catch (pauseError) {
                      console.error(`[DEBUG] Failed to pause Spotify after 7 seconds (post-refresh):`, pauseError);
                      spotifyPauseTimer = null;
                    }
                  }, 7000);
                  
                  return;
                } catch (retryError: any) {
                  console.error(`[DEBUG] Playback still failed after token refresh:`, retryError?.message);
                }
              } else {
                console.error(`[DEBUG] Token refresh failed`);
              }
            } else if (statusCode === 403) {
              console.error(`[DEBUG] ERROR TYPE: Premium required or insufficient permissions`);
            } else if (error?.message?.includes('communicating')) {
              console.error(`[DEBUG] ERROR TYPE: Communication error - check network/device`);
            }
            console.error(`[DEBUG] ================================`);
            console.error(`[DEBUG] Continuing to fallback sounds...`);
            // Don't return here - let it fall through to other sound sources
          }
        } else {
          console.error(`[DEBUG] STEP 3: No Spotify track configured for ${soundType}`);
        }
      } else {
        console.error(`[DEBUG] STEP 2: SKIPPING Spotify - enabled=${config.customSounds.sources?.spotify?.enabled}, spotifyApi=${!!spotifyApi}`);
      }
      
      // Try local files
      if (config.customSounds.sources?.local?.enabled) {
        console.error(`[DEBUG] Trying local file playback...`);
        try {
          const soundsDir = config.customSounds.sources.local.soundsDir.replace('~', os.homedir());
          const fileName = config.customSounds.sources.local.files[soundType];
          const filePath = path.join(soundsDir, fileName);
          
          if (fs.existsSync(filePath)) {
            console.error(`[DEBUG] Playing local file: ${filePath}`);
            const { exec } = require('child_process');
            
            if (process.platform === 'darwin') {
              exec(`afplay "${filePath}"`, (error: any) => {
                if (error) {
                  console.error('[DEBUG] Local file playback failed:', error);
                  playSystemSound(soundType);
                } else {
                  console.error('[DEBUG] Local file playback succeeded');
                }
              });
              return;
            } else {
              // Use play-sound for other platforms
              sound.play(filePath, (err: any) => {
                if (err) {
                  console.error('[DEBUG] Local file playback failed:', err);
                  playSystemSound(soundType);
                } else {
                  console.error('[DEBUG] Local file playback succeeded');
                }
              });
              return;
            }
          }
        } catch (error) {
          console.error('[DEBUG] Local file playback failed:', error);
        }
      } else {
        console.error(`[DEBUG] Skipping local files: enabled=${config.customSounds.sources?.local?.enabled}`);
      }
    } else {
      console.error(`[DEBUG] Custom sounds disabled, going to fallback`);
    }
    
    // Fallback to system sounds
    if (config.fallbackToSystem !== false) {
      console.error(`[DEBUG] Using fallback system sound for ${soundType}`);
      playSystemSound(soundType);
    } else {
      console.error(`[DEBUG] Fallback to system sounds disabled, no sound played`);
    }
    
  } catch (error) {
    console.error('Error playing notification sound:', error);
    playSystemSound(soundType);
  }
}

// System sound fallback function
function playSystemSound(soundType: 'success' | 'error' | 'info' = 'success') {
  try {
    const { exec } = require('child_process');
    
    if (process.platform === 'darwin') {
      // Try gentle bell sounds that match the Suzu theme
      const bellSounds = {
        success: [
          'afplay /System/Library/Sounds/Glass.aiff',
          'afplay /System/Library/Sounds/Tink.aiff',
          'afplay /System/Library/Sounds/Ping.aiff'
        ],
        error: [
          'afplay /System/Library/Sounds/Sosumi.aiff',
          'afplay /System/Library/Sounds/Basso.aiff'
        ],
        info: [
          'afplay /System/Library/Sounds/Ping.aiff',
          'afplay /System/Library/Sounds/Pop.aiff'
        ]
      };
      
      // Play the first available sound for the type
      const soundsToTry = bellSounds[soundType] || bellSounds.success;
      
      soundsToTry.forEach((cmd, index) => {
        exec(cmd, (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.error(`[DEBUG] Bell sound ${index + 1} failed: ${cmd}`, error);
          } else {
            console.error(`[DEBUG] Bell sound ${index + 1} succeeded: ${cmd}`);
            return; // Stop trying other sounds once one succeeds
          }
        });
      });
    } else if (process.platform === 'linux') {
      // Linux - try multiple approaches
      exec('paplay /usr/share/sounds/alsa/Front_Left.wav || aplay /usr/share/sounds/alsa/Front_Left.wav || echo -e "\\a"', (error: any) => {
        if (error) {
          console.error('Error playing sound:', error);
        }
      });
    } else if (process.platform === 'win32') {
      // Windows
      exec('rundll32 user32.dll,MessageBeep', (error: any) => {
        if (error) {
          console.error('Error playing sound:', error);
        }
      });
    }
  } catch (error) {
    console.error('Error playing system sound:', error);
  }
}

function showNotification(title: string, message: string, soundType: 'success' | 'error' | 'info' = 'success') {
  // Show desktop notification
  notifier.notify({
    title: title,
    message: message,
    sound: false, // We'll handle sound separately
    timeout: 5,
  });
  
  // Play sound
  playNotificationSound(soundType);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "task_completed",
        description: "Play a notification sound and show a message when a task is completed",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The completion message to display",
              default: "Task completed successfully!"
            },
            sound_type: {
              type: "string",
              enum: ["success", "error", "info"],
              description: "Type of notification sound to play",
              default: "success"
            }
          },
        },
      },
      {
        name: "notify",
        description: "Show a general notification with sound",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Notification title",
              default: "Claude Code"
            },
            message: {
              type: "string",
              description: "Notification message",
              default: "Notification from Claude"
            },
            sound_type: {
              type: "string",
              enum: ["success", "error", "info"],
              description: "Type of notification sound to play",
              default: "info"
            }
          },
        },
      },
      {
        name: "configure_custom_sounds",
        description: "Set up custom sounds from Spotify, YouTube, or local files",
        inputSchema: {
          type: "object",
          properties: {
            source: {
              type: "string",
              enum: ["spotify", "youtube", "local"],
              description: "Sound source to configure"
            },
            sound_type: {
              type: "string",
              enum: ["success", "error", "info"],
              description: "Type of sound to set"
            },
            value: {
              type: "string",
              description: "Spotify track ID (e.g. '4uLU6hMCjMI75M1A2tKUQC'), Spotify URI, Spotify URL, or local file path"
            }
          },
          required: ["source", "sound_type", "value"]
        },
      },
      {
        name: "question_alert",
        description: "Alert the user when Claude is asking additional questions or needs clarification",
        inputSchema: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question or clarification Claude is asking",
              default: "Claude has a question"
            },
            context: {
              type: "string",
              description: "Brief context about what Claude needs help with",
              default: "Additional information needed"
            }
          },
        },
      },
      {
        name: "show_config",
        description: "Display current Suzu configuration for debugging",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "refresh_spotify_token",
        description: "Manually refresh the Spotify access token using the configured refresh endpoint",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "test_sound",
        description: "Test a specific sound configuration",
        inputSchema: {
          type: "object",
          properties: {
            sound_type: {
              type: "string",
              enum: ["success", "error", "info"],
              description: "Type of sound to test",
              default: "success"
            }
          },
        },
      },
      {
        name: "configure_spotify_tokens",
        description: "Configure Spotify access and refresh tokens for custom music notifications",
        inputSchema: {
          type: "object",
          properties: {
            access_token: {
              type: "string",
              description: "Spotify access token (starts with BQA...)"
            },
            refresh_token: {
              type: "string", 
              description: "Spotify refresh token (optional, for auto-renewal)"
            },
            refresh_endpoint: {
              type: "string",
              description: "Endpoint URL for token refresh (optional)"
            }
          },
          required: ["access_token"]
        },
      },
    ],
  };
});

// Enhanced question detection - proactively alert for likely questions
async function detectAndAlertQuestions(toolName: string, toolArgs: any, response: any) {
  // Check if this looks like Claude is about to ask a question
  const questionIndicators = [
    // Task completion with question marks
    toolName === 'task_completed' && toolArgs?.message?.toLowerCase().includes('?'),
    // Tool responses with confirmation patterns
    response?.content?.[0]?.text?.toLowerCase().includes('?') && 
    (response?.content?.[0]?.text?.toLowerCase().includes('proceed') || 
     response?.content?.[0]?.text?.toLowerCase().includes('confirm') ||
     response?.content?.[0]?.text?.toLowerCase().includes('continue') ||
     response?.content?.[0]?.text?.toLowerCase().includes('should') ||
     response?.content?.[0]?.text?.toLowerCase().includes('would you like')),
  ];

  if (questionIndicators.some(Boolean)) {
    console.error('[DEBUG] Detected question pattern - playing alert BEFORE response');
    // Play immediately - don't wait
    showNotification("Claude Code - Question", "Claude needs your attention", "info");
    // Small delay to let the sound start before the response is shown
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Pre-emptively detect questions and alert user
  await detectAndAlertQuestions(name, args, null);

  switch (name) {
    case "task_completed":
      const message = (args?.message as string) || "Task completed successfully!";
      const soundType = (args?.sound_type as string) || "success";
      
      showNotification("Claude Code - Task Completed", message, soundType as 'success' | 'error' | 'info');
      
      const response = {
        content: [
          {
            type: "text",
            text: `🔔 Task completion notification sent: "${message}" with ${soundType} sound`
          }
        ]
      };
      
      return response;

    case "notify":
      const title = (args?.title as string) || "Claude Code";
      const notifyMessage = (args?.message as string) || "Notification from Claude";
      const notifySoundType = (args?.sound_type as string) || "info";
      
      showNotification(title, notifyMessage, notifySoundType as 'success' | 'error' | 'info');
      
      return {
        content: [
          {
            type: "text",
            text: `🔔 Notification sent: "${title}: ${notifyMessage}" with ${notifySoundType} sound`
          }
        ]
      };

    case "configure_custom_sounds":
      const source = args?.source as string;
      const configSoundType = args?.sound_type as string;
      let value = args?.value as string;
      
      // Auto-format Spotify track IDs to full URIs
      if (source === 'spotify' && value && !value.startsWith('spotify:track:')) {
        // Handle various Spotify URL formats
        if (value.includes('open.spotify.com/track/')) {
          // Extract ID from URL like https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC
          const match = value.match(/track\/([a-zA-Z0-9]+)/);
          if (match) value = match[1];
        }
        // If it's just the track ID, format as URI
        if (value.match(/^[a-zA-Z0-9]{22}$/)) {
          value = `spotify:track:${value}`;
          console.error(`[DEBUG] Formatted track ID to URI: ${value}`);
        }
      }
      
      try {
        const userConfigPath = path.join(os.homedir(), '.suzu', 'config.json');
        
        // Create directory if it doesn't exist
        const configDir = path.dirname(userConfigPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Load existing config or create new one
        let userConfig = config;
        if (fs.existsSync(userConfigPath)) {
          userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
        }
        
        // Update configuration
        if (!userConfig.customSounds) userConfig.customSounds = { enabled: true, sources: {} };
        if (!userConfig.customSounds.sources) userConfig.customSounds.sources = {};
        if (!userConfig.customSounds.sources[source]) {
          userConfig.customSounds.sources[source] = { enabled: true, tracks: {} };
        }
        
        userConfig.customSounds.sources[source].tracks[configSoundType] = value;
        userConfig.customSounds.enabled = true;
        
        // Save configuration
        fs.writeFileSync(userConfigPath, JSON.stringify(userConfig, null, 2));
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Custom sound configured: ${source} ${configSoundType} = ${value}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to configure custom sound: ${error}`
            }
          ]
        };
      }

    case "question_alert":
      const question = (args?.question as string) || "Claude has a question";
      const context = (args?.context as string) || "Additional information needed";
      
      // Automatically trigger alert for questions
      showNotification("Claude Code - Question", `${context}: ${question}`, "info");
      
      return {
        content: [
          {
            type: "text",
            text: `❓ Question alert sent: "${question}" (${context})`
          }
        ]
      };

    case "show_config":
      const configSummary = {
        customSoundsEnabled: config.customSounds?.enabled || false,
        spotifyEnabled: config.customSounds?.sources?.spotify?.enabled || false,
        spotifyHasToken: !!config.customSounds?.sources?.spotify?.accessToken,
        spotifyTokenPreview: config.customSounds?.sources?.spotify?.accessToken ? 
          config.customSounds.sources.spotify.accessToken.substring(0, 12) + '...' + 
          config.customSounds.sources.spotify.accessToken.substring(config.customSounds.sources.spotify.accessToken.length - 8) 
          : 'NONE',
        refreshTokenConfigured: !!config.customSounds?.sources?.spotify?.refreshToken,
        refreshEndpoint: config.customSounds?.sources?.spotify?.refreshEndpoint || 'NOT SET',
        fallbackToSystem: config.fallbackToSystem
      };
      
      return {
        content: [
          {
            type: "text",
            text: `🔧 Current Suzu Configuration:\n${JSON.stringify(configSummary, null, 2)}`
          }
        ]
      };

    case "refresh_spotify_token":
      try {
        const refreshed = await refreshSpotifyToken();
        if (refreshed) {
          return {
            content: [
              {
                type: "text",
                text: "✅ Spotify token refreshed successfully"
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "❌ Failed to refresh Spotify token. Check refresh token and endpoint configuration."
              }
            ]
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error refreshing token: ${error}`
            }
          ]
        };
      }

    case "test_sound":
      console.error(`[DEBUG] test_sound args:`, JSON.stringify(args));
      const testSoundType = (args?.sound_type as string) || "success";
      console.error(`[DEBUG] test_sound resolved soundType: ${testSoundType}`);
      
      try {
        await playNotificationSound(testSoundType as 'success' | 'error' | 'info');
        return {
          content: [
            {
              type: "text",
              text: `🔊 Testing ${testSoundType} sound...`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to test sound: ${error}`
            }
          ]
        };
      }

    case "configure_spotify_tokens":
      const accessToken = args?.access_token as string;
      const refreshToken = args?.refresh_token as string;
      const refreshEndpoint = args?.refresh_endpoint as string;
      
      try {
        const userConfigPath = path.join(os.homedir(), '.suzu', 'config.json');
        
        // Create directory if it doesn't exist
        const configDir = path.dirname(userConfigPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Load existing config or create new one
        let userConfig = config;
        if (fs.existsSync(userConfigPath)) {
          userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
        }
        
        // Initialize Spotify config structure
        if (!userConfig.customSounds) userConfig.customSounds = { enabled: true, sources: {} };
        if (!userConfig.customSounds.sources) userConfig.customSounds.sources = {};
        if (!userConfig.customSounds.sources.spotify) {
          userConfig.customSounds.sources.spotify = {
            enabled: true,
            tracks: {
              success: "spotify:track:4uLU6hMCjMI75M1A2tKUQC", // Default gentle bell sound
              error: "spotify:track:60nZcImufyMA1MKQY3dcCH",
              info: "spotify:track:5QDLhrAOJJdNAmCTBusfHY"
            }
          };
        }
        
        // Update tokens
        userConfig.customSounds.sources.spotify.accessToken = accessToken;
        if (refreshToken) {
          userConfig.customSounds.sources.spotify.refreshToken = refreshToken;
        }
        if (refreshEndpoint) {
          userConfig.customSounds.sources.spotify.refreshEndpoint = refreshEndpoint;
        }
        
        userConfig.customSounds.enabled = true;
        
        // Save configuration
        fs.writeFileSync(userConfigPath, JSON.stringify(userConfig, null, 2));
        
        // Update runtime config
        config = userConfig;
        
        // Update Spotify API instance
        if (spotifyApi) {
          spotifyApi.setAccessToken(accessToken);
        } else {
          spotifyApi = new SpotifyWebApi();
          spotifyApi.setAccessToken(accessToken);
        }
        
        const tokenPreview = accessToken.substring(0, 12) + '...' + accessToken.substring(accessToken.length - 8);
        let message = `✅ Spotify configured successfully!\n- Access Token: ${tokenPreview}`;
        
        if (refreshToken) {
          const refreshPreview = refreshToken.substring(0, 8) + '...' + refreshToken.substring(refreshToken.length - 8);
          message += `\n- Refresh Token: ${refreshPreview}`;
        }
        
        if (refreshEndpoint) {
          message += `\n- Refresh Endpoint: ${refreshEndpoint}`;
        }
        
        message += `\n\nDefault notification sounds are set. Use configure_custom_sounds to change them.`;
        
        return {
          content: [
            {
              type: "text",
              text: message
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to configure Spotify tokens: ${error}`
            }
          ]
        };
      }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Suzu (鈴) MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});