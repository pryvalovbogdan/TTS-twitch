import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import open from 'open';
import PlayerInstance from 'play-sound';
import WebSocket, { WebSocketServer } from 'ws';

import { soundMap } from './src/helpers/consts.js';
import { playAudio } from './src/helpers/utils.js';
import { speakWithElevenLabs } from './src/tts_eleven_labs.js';

dotenv.config();

const server = new WebSocketServer({ port: 3000 });

let wsInstance = null;

const player = PlayerInstance();
//https://twitchtokengenerator.com/
const oAuth = process.env.TWITCH_OAUTH_TOCKEN;
const user = process.env.TWITCH_CHANNEL_NAME;
const channel = process.env.TWITCH_CHANNEL_NAME;

//https://dev.twitch.tv/docs/chat/irc/
const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

server.on('connection', ws => {
  console.log('Client connected');

  wsInstance = ws;

  ws.on('message', message => {
    console.log('Received:', JSON.parse(message));
    const messageParsed = JSON.parse(message);

    if (messageParsed.type === 'SONG_NAME' && messageParsed.payload) {
      socket.send(`PRIVMSG #${channel} : The song name is: ${messageParsed.payload}`);
    }

    ws.send(JSON.stringify({ type: 'response', payload: 'Hello from server!' }));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

socket.addEventListener('open', () => {
  socket.send(`PASS oauth:${oAuth}`);
  socket.send(`NICK ${user}`);
  socket.send(`JOIN #${channel}`);
});

socket.addEventListener('message', event => {
  const message = event.data;

  if (message.includes('PRIVMSG')) {
    const prefixEnd = message.indexOf('!');
    const messageStart = message.indexOf(' :');

    if (prefixEnd !== -1 && messageStart !== -1) {
      const username = message.substring(1, prefixEnd);
      const userMessage = message.substring(messageStart + 2);

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

      if (userMessage.includes('Cheap viewers') || userMessage.includes('Best viewers')) {
        return;
      }

      if (userMessage.includes('!song')) {
        try {
          // In case of using os default commands
          // const result = execSync(getFirstTabsPlayingTittle, { encoding: 'utf8' }).trim();

          // socket.send(`PRIVMSG #${channel} :Current song: ${result}`);
          wsInstance.send(JSON.stringify({ type: 'GET_SONG' }));
        } catch (err) {
          console.error('Error fetching song title:', err);
          socket.send(`PRIVMSG #${channel} :Couldn't get the current song 😢`);
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

        wsInstance.send(JSON.stringify({ type: 'stop', payload: userMessage }));
        open(userMessage, { app: { name: 'google chrome' } });

        return;
      }

      console.log(`User: ${username}, Message: ${userMessage}`);
      speakWithElevenLabs(`${username} said:  ${userMessage} `, player);

      // U can switch to google cloud but it takes much longer to sound the text and sounds more robotic
      // TTSWithGoogleCloud(`${username} said:  ${userMessage} `, player);
    }
  }

  if (event.data.includes('Hello World')) {
    socket.send(`PRIVMSG #${channel} :cringe`);
  }

  if (event.data.includes('PING')) {
    socket.send('PONG');
  }

  if (event.data.includes('PART')) {
    socket.send(`JOIN #}`);
  }
});

const app = express();
const port = 8080;

// Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = 'sha256=';

app.use(
  express.raw({
    // Need raw message body for signature verification
    type: 'application/json',
  }),
);

app.post('/eventsub', (req, res) => {
  console.log('eventsub', req, JSON.parse(req.body));
  let secret = getSecret();
  let message = getHmacMessage(req);
  let hmac = HMAC_PREFIX + getHmac(secret, message); // Signature to compare

  if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
    console.log('signatures match');

    // Get JSON object from body, so you can process the message.
    let notification = JSON.parse(req.body);

    if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
      // TODO: Do something with the event's data.

      console.log(`Event type: ${notification.subscription.type}`);
      console.log(JSON.stringify(notification.event, null, 4));

      res.sendStatus(204);
    } else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
      res.set('Content-Type', 'text/plain').status(200).send(notification.challenge);
    } else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
      res.sendStatus(204);

      console.log(`${notification.subscription.type} notifications revoked!`);
      console.log(`reason: ${notification.subscription.status}`);
      console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
    } else {
      res.sendStatus(204);
      console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
    }
  } else {
    console.log('403'); // Signatures didn't match.
    res.sendStatus(403);
  }
});

// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`);
// });

function getSecret() {
  // TODO: Get secret from secure storage. This is the secret you pass
  // when you subscribed to the event.
  return process.env.TWITCH_ACCESS_TOCKEN;
}

// Build the message used to get the HMAC.
function getHmacMessage(request) {
  return request.headers[TWITCH_MESSAGE_ID] + request.headers[TWITCH_MESSAGE_TIMESTAMP] + request.body;
}

// Get the HMAC.
function getHmac(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// Verify whether our hash matches the hash that Twitch passed in the header.
function verifyMessage(hmac, verifySignature) {
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
}
