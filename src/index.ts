#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
const notifier = require('node-notifier');
const player = require('play-sound');
import * as path from 'path';
import * as fs from 'fs';

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

// Create a simple notification sound function
function playNotificationSound(soundType: 'success' | 'error' | 'info' = 'success') {
  try {
    const { exec } = require('child_process');
    
    console.error(`[DEBUG] Attempting to play sound: ${soundType} on platform: ${process.platform}`);
    
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
    console.error('Error playing notification sound:', error);
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "task_completed":
      const message = (args?.message as string) || "Task completed successfully!";
      const soundType = (args?.sound_type as string) || "success";
      
      showNotification("Claude Code - Task Completed", message, soundType as 'success' | 'error' | 'info');
      
      return {
        content: [
          {
            type: "text",
            text: `🔔 Task completion notification sent: "${message}" with ${soundType} sound`
          }
        ]
      };

    case "notify":
      const title = (args?.title as string) || "Claude Code";
      const notifyMessage = (args?.message as string) || "Notification from Claude";
      const notifySoundType = (args?.sound_type as string) || "info";
      
      showNotification(title, notifyMessage, notifySoundType as 'success' | 'error' | 'info');
      
      return {
        content: [
          {
            type: "text",
            text: `Notification sent: "${title}: ${notifyMessage}" with ${notifySoundType} sound`
          }
        ]
      };

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