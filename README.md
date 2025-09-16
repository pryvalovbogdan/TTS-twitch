# Twitch TTS Bot

A Node.js Twitch chat bot that provides text-to-speech functionality with sound effects. Connects to Twitch IRC, reads chat messages aloud using ElevenLabs TTS, and plays custom sound effects based on keyword triggers.

## Features
- Converts Twitch chat messages to speech using ElevenLabs API
- Plays custom sound effects triggered by specific keywords in chat
- Handles `!song` command to get current playing song via WebSocket
- Automatically opens YouTube links in Chrome browser
- Provides WebSocket server for external client communication (e.g., OBS overlays)
- Supports Twitch EventSub webhook notifications
- Randomly selects from multiple TTS voices for variety
- Filters spam messages and bot accounts
- Multi-language support (English/Ukrainian triggers)

## Installation
No external package manager beyond npm is required.  
Just ensure you have Node.js v14+ installed on your system.

```bash
# Clone and install dependencies
git clone https://github.com/pryvalovbogdan/TTS-twitch.git
cd twitch-tts-bot
npm install
```

## Environment Setup
Create a `.env` file in the root directory:

```env
TWITCH_OAUTH_TOKEN=oauth:your_twitch_oauth_token
TWITCH_CHANNEL_NAME=your_channel_name
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key
TWITCH_ACCESS_TOKEN=your_twitch_access_token
```

### Getting Your Tokens
**Twitch OAuth Token:**
1. Visit [Twitch Token Generator](https://twitchtokengenerator.com/)
2. To generate TWITCH_ACCESS_TOKEN, TWITCH_CLIENT_ID, go to and request all permissions
3. Add `oauth:` prefix in your `.env` file

**ElevenLabs API Key:**
1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Get API key from dashboard
3. Add to `.env` file

**Twitch Access Token:**
1. Register app on [Twitch Developer Console](https://dev.twitch.tv/console)
2. Generate access token for EventSub webhooks

## Usage

### Starting the Bot
```bash
npm start
```

The bot will automatically:
- Connect to your Twitch channel chat
- Start WebSocket server on port 3000
- Start HTTP server on port 8080 for webhooks

### Chat Commands
```
!song - Requests current song information via WebSocket
```

### Sound Effect Triggers
```javascript
// Examples of keyword triggers
"uwu", "піздюк"                    // Plays uwu.mp3
"sad", "failed"                    // Plays sad.mp3
"hey", "привіт", "hello"           // Plays hellothere.mp3
"john cena", "gg", "finally"       // Plays johncena.mp3
"nani", "what???", "що???"         // Plays nani.mp3
```

### WebSocket API
```javascript
// Client sends song name to bot
{
  "type": "SONG_NAME",
  "payload": "Current Song Title"
}

// Bot requests song info from client
{
  "type": "GET_SONG"
}

// Bot sends stop command for YouTube
{
  "type": "stop",
  "payload": "youtube_url"
}
```

## Configuration

### Adding Custom Sound Effects
Edit `src/helpers/consts.js`:

```javascript
const soundMap = {
  yourSound: {
    path: 'sounds/yoursound.mp3',
    trigger: ['keyword1', 'keyword2', 'phrase']
  },
  // Add more sound effects here
};
```

### Switching TTS Providers
```javascript
// Default: ElevenLabs (recommended)
speakWithElevenLabs(`${username} said: ${userMessage}`, player);

// Alternative: Google Cloud TTS (more robotic, slower)
// TTSWithGoogleCloud(`${username} said: ${userMessage}`, player);
```

## Project Structure
```
twitch-tts-bot/
├── src/
│   ├── helpers/
│   │   ├── consts.js          # Sound map & configuration
│   │   └── utils.js           # Audio playback utilities
│   ├── tts_eleven_labs.js     # ElevenLabs TTS integration
│   └── tts_google_cloud.js    # Google Cloud TTS (alternative)
├── sounds/                    # MP3 sound effect files
├── .env                       # Environment variables
└── server.js                  # Main application entry point
```

## Dependencies
```json
{
  "ws": "WebSocket server and client",
  "express": "HTTP server for Twitch webhooks",
  "axios": "HTTP requests to TTS APIs",
  "play-sound": "Cross-platform audio playback",
  "open": "Open URLs in default browser",
  "@google-cloud/text-to-speech": "Google TTS service",
  "dotenv": "Environment variable management"
}
```

## Troubleshooting

### Bot Not Connecting to Twitch
```bash
# Check your OAuth token format
TWITCH_OAUTH_TOCKEN=oauth:your_actual_token_here

# Verify channel name matches exactly (case-sensitive)
TWITCH_CHANNEL_NAME=your_exact_channel_name
```

### TTS Not Working
```bash
# Verify ElevenLabs API key
# Check console for "Audio generated, playing..." message
# Ensure system audio is not muted
# Try different audio output device
```

### Sound Effects Not Playing
```bash
# Check if sound files exist
ls -la sounds/

# Verify file permissions
chmod 644 sounds/*.mp3

# Test audio playback manually
# macOS: afplay sounds/uwu.mp3
# Linux: aplay sounds/uwu.mp3
```

### WebSocket Connection Issues
```bash
# Check if port 3000 is available
lsof -i :3000

# Test WebSocket connection
# Use browser console or WebSocket testing tool
```

## API Reference

### Sound Map Structure
```typescript
interface SoundEffect {
  path: string;           // Relative path to MP3 file
  trigger: string[];      // Array of trigger keywords/phrases
}
```

### WebSocket Message Types
```typescript
type ClientMessage = {
  type: 'SONG_NAME_RECEIVED';
  payload: string;
}

type ServerMessage = {
  type: 'GET_SONG' | 'STOP_AUDIO';
  payload?: string;
}
```

## License
MIT License - see LICENSE file for details.