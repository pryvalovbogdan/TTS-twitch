import dotenv from 'dotenv';
import open from 'open';
import PlayerInstance from 'play-sound';
import WebSocket, { WebSocketServer } from 'ws';

import { deleteMessage, timeOutUser } from './src/helpers/api.js';
import { TWITCH_WS_URL, WS_EVENT_TYPES, skipUsers, soundMap, spamMessages } from './src/helpers/consts.js';
import { extractMessageId, extractUserId, parseIrcMessage, playAudio } from './src/helpers/utils.js';
import { speakWithElevenLabs } from './src/tts_eleven_labs.js';

dotenv.config();

class TwitchBot {
  wsServer = null;

  twitchSocket = null;

  clientSocket = null;

  player = PlayerInstance();

  isConnected = false;

  config = {
    wsPort: parseInt(process.env.WS_PORT) || 3000,
    oAuth: process.env.TWITCH_OAUTH_TOCKEN, // https://twitchtokengenerator.com/
    channel: process.env.TWITCH_CHANNEL_NAME,
    channelId: process.env.TWITCH_CHANNEL_ID, // https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/
    twitchWsUrl: TWITCH_WS_URL, // https://dev.twitch.tv/docs/chat/irc/
  };

  constructor() {
    this.validateConfig();
  }

  validateConfig() {
    const required = ['oAuth', 'channel', 'channelId'];
    const missing = required.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async start() {
    try {
      await this.initializeWebSocketServer();
      await this.connectToTwitch();
      console.log('🤖 Twitch bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start bot:', error.message);
      process.exit(1);
    }
  }

  initializeWebSocketServer() {
    return new Promise(resolve => {
      this.wsServer = new WebSocketServer({ port: this.config.wsPort });

      this.wsServer.on('connection', ws => {
        console.log('🔌 Client connected to WebSocket');
        this.clientSocket = ws;

        ws.on('message', this.handleClientMessage);

        ws.on('close', () => {
          console.log('🔌 Client disconnected from WebSocket');
          this.clientSocket = null;
        });

        ws.on('error', error => {
          console.error('❌ WebSocket client error:', error.message);
        });
      });

      this.wsServer.on('listening', () => {
        console.log(`📡 WebSocket server listening on port ${this.config.wsPort}`);
        resolve();
      });
    });
  }

  connectToTwitch() {
    return new Promise((resolve, reject) => {
      this.twitchSocket = new WebSocket(this.config.twitchWsUrl);

      this.twitchSocket.on('open', () => {
        console.log('🎮 Connected to Twitch IRC');
        this.authenticateWithTwitch();
        this.isConnected = true;
        resolve();
      });

      this.twitchSocket.on('message', this.handleTwitchMessage);

      this.twitchSocket.on('close', () => {
        console.log('🎮 Disconnected from Twitch IRC');
        this.isConnected = false;
        this.reconnectToTwitch();
      });

      this.twitchSocket.on('error', error => {
        console.error('❌ Twitch WebSocket error:', error.message);
        reject(error);
      });
    });
  }

  authenticateWithTwitch() {
    // Send a CAP REQ command to request the tags and commands capabilities. You will also need membership to receive join/leave notifications.
    // Capability	Description
    // twitch.tv/commands	Lets your bot send PRIVMSG messages that include /me, and receive Twitch-specific IRC messages.
    // twitch.tv/membership Lets your bot receive JOIN and PART messages when users join and leave the chat room.
    // twitch.tv/tags	Adds additional metadata to the command and membership messages. For the list of metadata available with each message, see Twitch tags. To request the tags capability, you must also request the commands capability.
    const commands = [
      'CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership',
      `PASS oauth:${this.config.oAuth}`,
      `NICK ${this.config.channel}`,
      `JOIN #${this.config.channel}`,
    ];

    commands.forEach(cmd => this.twitchSocket.send(cmd));
  }

  async reconnectToTwitch() {
    console.log('🔄 Attempting to reconnect to Twitch...');

    setTimeout(() => {
      if (!this.isConnected) {
        this.connectToTwitch();
      }
    }, 5000);
  }

  handleClientMessage = message => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case WS_EVENT_TYPES.SONG_NAME_RECEIVED:
          if (data.payload) {
            this.sendChatMessage(`🎵 Now playing: ${data.payload}`);
          }

          break;

        default:
          console.log('📨 Unknown client message type:', data.type);
      }

      // Send acknowledgment
      this.sendToClient({ type: 'ack', payload: 'Message received' });
    } catch (error) {
      console.error('❌ Error parsing client message:', error.message);
    }
  };

  handleTwitchMessage = async data => {
    const message = data.toString();

    try {
      if (message.includes('PING')) {
        return this.twitchSocket.send('PONG');
      }

      if (message.includes('NOTICE')) {
        // display human readable reason
        return console.warn('⚠️ NOTICE from Twitch:', message);
      }

      if (message.includes('PRIVMSG')) {
        await this.processChatMessage(message);
      }

      if (message.includes('PART')) {
        this.twitchSocket.send(`JOIN #${this.config.channel}`);
      }
    } catch (error) {
      console.error('❌ Error handling Twitch message:', error.message);
    }
  };

  async processChatMessage(message) {
    const { username, userMessage } = parseIrcMessage(message);
    const messageId = extractMessageId(message);
    const userId = extractUserId(message);

    // Skip bot messages (dotabod, streamelements, nightbot, etc.)
    if (this.shouldSkipUser(username)) {
      return;
    }

    console.log(`💬 ${username}: ${userMessage}`);

    // Process message through handlers
    const handlers = [
      () => this.handleSoundTriggers(userMessage),
      () => this.handleSpamDetection(userMessage, messageId, userId, username),
      () => this.handleSongCommand(userMessage),
      () => this.handleYouTubeLinks(userMessage),
      () => this.handleTextToSpeech(username, userMessage),
    ];

    for (const handler of handlers) {
      const handled = await handler();

      if (handled) {
        break;
      } // Stop processing if message was handled
    }
  }

  shouldSkipUser(username) {
    return skipUsers.some(user => username.toLowerCase().includes(user.toLowerCase()));
  }

  handleSoundTriggers(userMessage) {
    for (const [key, { path, trigger }] of Object.entries(soundMap)) {
      if (trigger.some(phrase => userMessage.toLowerCase().includes(phrase.toLowerCase()))) {
        playAudio(path);
        console.log(`🔊 Playing sound: ${key}`);

        return true;
      }
    }

    return false;
  }

  async handleSpamDetection(userMessage, messageId, userId, username) {
    const isSpam = spamMessages.some(spam => userMessage.toLowerCase().includes(spam.toLowerCase()));

    if (!isSpam) {
      return false;
    }

    try {
      // Send moderator delete command and timeout user in parallel
      await Promise.all([
        deleteMessage(messageId, this.config.channelId),
        timeOutUser(userId, this.config.channelId, 60, 'Spam detected - automated moderation'),
      ]);

      console.log(`⏰ Timed out user ${username} for spam`);
      this.sendChatMessage(`${username} has been timed out for spam.`);
      this.sendChatMessage("⚠️ Message removed. Please don't spam.");

      return true;
    } catch (error) {
      console.error('❌ Error handling spam:', error.message);

      return false;
    }
  }

  handleSongCommand(userMessage) {
    if (!userMessage.toLowerCase().includes('!song')) {
      return false;
    }

    try {
      // In case of using os default commands
      // const result = execSync(getFirstTabsPlayingTittle, { encoding: 'utf8' }).trim();

      this.sendToClient({ type: WS_EVENT_TYPES.GET_SONG });
      console.log('🎵 Song request sent to client');
    } catch (error) {
      console.error('❌ Error fetching song:', error.message);
      this.sendChatMessage("😢 Couldn't get the current song");
      // socketTwitch.send(`PRIVMSG #${channel} :Couldn't get the current song 😢`);
    }

    return true;
  }

  handleYouTubeLinks(userMessage) {
    const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;

    if (!youtubeRegex.test(userMessage)) {
      return false;
    }

    try {
      // In case of using os default commands
      // try {
      //   execSync(stopPlayingMusicMac);
      //   execSync(stopPlayingAllTabsChrome);
      // } catch (e) {
      //   console.error('Error stopping playbook:', e);
      // }

      this.sendToClient({
        type: WS_EVENT_TYPES.STOP_AUDIO,
        payload: userMessage,
      });

      open(userMessage, { app: { name: 'google chrome' } });
      console.log('🎬 Opening YouTube link');
    } catch (error) {
      console.error('❌ Error opening YouTube link:', error.message);
    }

    return true;
  }

  async handleTextToSpeech(username, userMessage) {
    try {
      await speakWithElevenLabs(`${username} said: ${userMessage}`, this.player);

      // U can switch to google cloud but it takes much longer to sound the text and sounds more robotic
      // TTSWithGoogleCloud(`${username} said: ${userMessage}`, this.player);
      return true;
    } catch (error) {
      console.error('❌ TTS Error:', error.message);

      return false;
    }
  }

  sendChatMessage = message => {
    if (!this.isConnected || !this.twitchSocket) {
      console.warn('⚠️ Cannot send message: Not connected to Twitch');

      return;
    }

    this.twitchSocket.send(`PRIVMSG #${this.config.channel} :${message}`);
  };

  sendToClient(data) {
    if (!this.clientSocket) {
      console.warn('⚠️ No client connected to WebSocket');

      return;
    }

    try {
      this.clientSocket.send(JSON.stringify(data));
    } catch (error) {
      console.error('❌ Error sending to client:', error.message);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down bot...');

    if (this.twitchSocket) {
      this.twitchSocket.close();
    }

    if (this.wsServer) {
      this.wsServer.close();
    }

    process.exit(0);
  }
}

// Initialize and start the bot
const bot = new TwitchBot();

// Graceful shutdown
process.on('SIGINT', () => bot.shutdown());
process.on('SIGTERM', () => bot.shutdown());

// Start the bot
bot.start();

export default TwitchBot;
