import dotenv from 'dotenv';
import open from 'open';
import PlayerInstance from 'play-sound';
import WebSocket, { WebSocketServer } from 'ws';

import { deleteMessage, timeOutUser } from './src/helpers/api.js';
import { WS_EVENT_TYPES, soundMap, spamMessages } from './src/helpers/consts.js';
import { extractMessageId, extractUserId, parseIrcMessage, playAudio } from './src/helpers/utils.js';
import { speakWithElevenLabs } from './src/tts_eleven_labs.js';

dotenv.config();

const server = new WebSocketServer({ port: 3000 });

let wsInstance = null;

const player = PlayerInstance();
// https://twitchtokengenerator.com/
const oAuth = process.env.TWITCH_OAUTH_TOCKEN;
const user = process.env.TWITCH_CHANNEL_NAME;
const channel = process.env.TWITCH_CHANNEL_NAME;

const sendMessageInChat = message => {
  socketTwitch.send(`PRIVMSG #${channel} : ${message}`);
};

// https://dev.twitch.tv/docs/chat/irc/
const socketTwitch = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

server.on('connection', ws => {
  console.log('Client connected');

  wsInstance = ws;

  ws.on('message', message => {
    const messageParsed = JSON.parse(message);

    if (messageParsed.type === WS_EVENT_TYPES.SONG_NAME_RECEIVED && messageParsed.payload) {
      sendMessageInChat(`The song name is: ${messageParsed.payload}`);
    }

    ws.send(JSON.stringify({ type: 'response', payload: 'Hello from server!' }));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

socketTwitch.addEventListener('open', () => {
  // Send a CAP REQ command to request the tags and commands capabilities. You will also need membership to receive join/leave notifications.

  // Capability	Description
  // twitch.tv/commands	Lets your bot send PRIVMSG messages that include /me, and receive Twitch-specific IRC messages.
  // twitch.tv/membership Lets your bot receive JOIN and PART messages when users join and leave the chat room.
  // twitch.tv/tags	Adds additional metadata to the command and membership messages. For the list of metadata available with each message, see Twitch tags. To request the tags capability, you must also request the commands capability.
  socketTwitch.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
  socketTwitch.send(`PASS oauth:${oAuth}`);
  socketTwitch.send(`NICK ${user}`);
  socketTwitch.send(`JOIN #${channel}`);
});

socketTwitch.addEventListener('message', async event => {
  const message = event.data;

  if (message.includes('PRIVMSG')) {
    const { username, userMessage } = parseIrcMessage(message);
    const messageId = extractMessageId(message);
    const userId = extractUserId(message);

    if (username.includes('dotabod')) {
      return;
    }

    for (const key in soundMap) {
      const { path, trigger } = soundMap[key];

      if (trigger.some(phrase => userMessage.includes(phrase))) {
        playAudio(path);

        return;
      }
    }

    if (spamMessages.some(item => userMessage.includes(item))) {
      // send moderator delete command
      await deleteMessage(messageId, process.env.TWITCH_CHANNEL_ID);

      const timedOut = await timeOutUser(
        userId,
        process.env.TWITCH_CHANNEL_ID,
        60,
        'Spam detected - automated moderation',
      );

      if (timedOut) {
        console.log(`Successfully timed out user ${username} (${userId})`);

        sendMessageInChat(`${username} has been timed out for spam.`);
      }

      sendMessageInChat(":Message removed. Don't spam please");

      return;
    }

    if (userMessage.includes('!song')) {
      try {
        // In case of using os default commands
        // const result = execSync(getFirstTabsPlayingTittle, { encoding: 'utf8' }).trim();

        wsInstance.send(JSON.stringify({ type: WS_EVENT_TYPES.GET_SONG }));
      } catch (err) {
        console.error('Error fetching song title:', err);
        // socketTwitch.send(`PRIVMSG #${channel} :Couldn't get the current song 😢`);
        sendMessageInChat("Couldn't get the current song 😢");
      }

      return;
    }

    if (userMessage.includes('youtube')) {
      // In case of using os default commands
      // try {
      //   execSync(stopPlayingMusicMac);
      //   execSync(stopPlayingAllTabsChrome);
      // } catch (e) {
      //   console.error('Error stopping playback:', e);
      // }

      wsInstance.send(JSON.stringify({ type: WS_EVENT_TYPES.STOP_AUDIO, payload: userMessage }));
      open(userMessage, { app: { name: 'google chrome' } });

      return;
    }

    console.log(`User: ${username}, Message: ${userMessage}`);
    await speakWithElevenLabs(`${username} said:  ${userMessage} `, player);

    // U can switch to google cloud but it takes much longer to sound the text and sounds more robotic
    // TTSWithGoogleCloud(`${username} said:  ${userMessage} `, player);
  }

  if (message.includes('NOTICE')) {
    // display human readable reason
    console.warn('NOTICE from server:', event.data);
  }

  if (message.includes('Hello World')) {
    sendMessageInChat('cringe');
  }

  if (message.includes('PING')) {
    socketTwitch.send('PONG');
  }

  if (message.includes('PART')) {
    socketTwitch.send(`JOIN #}`);
  }
});
