import PlayerInstance from 'play-sound';

const player = PlayerInstance();
const getRandomVoiceIndex = voices => Math.floor(Math.random() * voices.length);

const playAudio = (path, options) => {
  player.play(path, options || { afplay: ['-v', 1] }, err => {
    if (err) {
      console.error('Playback error:', err);
    }
  });
};

const extractUserId = rawMessage => {
  const userIdMatch = rawMessage.match(/user-id=(\d+)/);

  return userIdMatch ? userIdMatch[1] : null;
};

const extractMessageId = rawMessage => {
  // Try common tags: id= or target-msg-id=
  // rawMessage looks like: @...id=abcd-1234... :user!user@user.tmi.twitch.tv PRIVMSG #chan :hello
  const idMatch = rawMessage.match(/(?:\b(?:id|target-msg-id)=)([0-9a-fA-F-]+)/);

  return idMatch ? idMatch[1] : null;
};

const parseIrcMessage = rawMessage => {
  const usernameMatch = rawMessage.match(/:([^!]+)!/);
  const username = usernameMatch ? usernameMatch[1] : null;

  const privmsgIndex = rawMessage.indexOf('PRIVMSG');

  const colonAfterChannel = rawMessage.indexOf(' :', privmsgIndex);
  const userMessage = colonAfterChannel !== -1 ? rawMessage.substring(colonAfterChannel + 2) : null;

  return { username, userMessage };
};

export { getRandomVoiceIndex, playAudio, extractUserId, parseIrcMessage, extractMessageId };
