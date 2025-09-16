const soundMap = {
  uwu: {
    path: 'sounds/uwu.mp3',
    trigger: ['uwu', 'піздюк'],
  },
  fart: {
    path: 'sounds/fart.mp3',
    trigger: ['wizardsdev', 'you are wrong', 'shit', 'fart', 'angular'],
  },
  sad: {
    path: 'sounds/sad.mp3',
    trigger: ['sad', 'failed'],
  },
  noo: {
    path: 'sounds/noo.mp3',
    trigger: ['noo', 'please', 'god'],
  },
  nani: {
    path: 'sounds/nani.mp3',
    trigger: ['nani', 'what???', 'how did it happened', 'що???'],
  },
  gtacj: {
    path: 'sounds/gtacj.mp3',
    trigger: ['again?', 'repeat', 'повтори'],
  },
  emotionaldamage: {
    path: 'sounds/emotionaldamage.mp3',
    trigger: ['you are so bad', 'look at you', 'disgusting'],
  },
  tobey: {
    path: 'sounds/tobey.mp3',
    trigger: [
      'tobey',
      'spider-man',
      'what did you just said',
      'are u talking to me?',
      'що ти сказав',
      'great power',
      'great responsibility',
    ],
  },
  thatswhatshesaid: {
    path: 'sounds/thatswhatshesaid.mp3',
    trigger: [
      "that's rly hard",
      'my mom is coming',
      'this is huge',
      'get it up',
      "don't make it harder that it has to be",
      'you me to get on top',
      'this is gonna feel so god getting this thing of my chest',
      'why is this so hard',
      'force it as deep as you can',
      'long and hard',
      'i want you to think long and hard',
      'i need two man on this',
      "that's job looks hard",
      'you already did me',
      'why did you get it so big',
      'ypu always left me satisfied',
      'to long',
      'to hard',
      'all night long',
      'i wish i were there',
      "that's what she said",
    ],
  },
  greeting: {
    path: 'sounds/hellothere.mp3',
    trigger: ['hey', 'привіт', 'hello'],
  },
  kurva: {
    path: 'sounds/kurva.mp3',
    trigger: ['kurva', 'bober'],
  },
  surprise: {
    path: 'sounds/surprise.mp3',
    trigger: ['nice', 'wtf'],
  },
  johncena: {
    path: 'sounds/johncena.mp3',
    trigger: ['john cena', 'gg', 'finally'],
  },
  directedby: {
    path: 'sounds/directedby.mp3',
    trigger: ['directed by', 'boring', 'not interesting'],
  },
};
// Voices ids
const voicesElevenLabs = ['CeNX9CMwmxDxUF5Q2Inm', 'eVItLK1UvXctxuaRV2Oq', 'flHkNRp1BlvT73UL6gyz'];
const ELEVEN_LABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech/';
const fileNameElevenLabs = 'sounds/output-elevenlabs.mp3';

const voicesGoogleCloud = [
  { languageCode: 'en-US', ssmlGender: 'MALE', name: 'en-US-Casual-K' },
  { languageCode: 'en-US', ssmlGender: 'MALE', name: 'en-US-Chirp-HD-D' },
  { languageCode: 'en-US', ssmlGender: 'FEMALE', name: 'en-US-Studio-O' },
  { languageCode: 'en-GB', ssmlGender: 'FEMALE', name: 'en-GB-Wavenet-F' },
  { languageCode: 'en-GB', ssmlGender: 'FEMALE', name: 'en-GB-Chirp3-HD-Kore' },
  { languageCode: 'en-GB', ssmlGender: 'MALE', name: 'en-GB-Studio-B' },
];
const fileNameGoogleCloud = 'sounds/output-googlecloud.mp3';

const getFirstTabsPlayingTittle = `osascript -e '
            tell application "Google Chrome"
              repeat with w in windows
                repeat with t in tabs of w
                  if URL of t contains "youtube.com/watch" then
                    return title of t
                  end if
                end repeat
              end repeat
            end tell
          '`;

const stopPlayingMusicMac = `osascript -e 'tell application "Music" to pause'`;

const stopPlayingAllTabsChrome = `osascript -e '
            tell application "Google Chrome"
              repeat with w in windows
                repeat with t in tabs of w
                  if URL of t contains "youtube.com/watch" then
                    tell t to execute javascript "document.querySelector(\\"video\\").pause();"
                  end if
                end repeat
              end repeat
            end tell
           '`;

const TWITCH_BASE_URL = 'https://api.twitch.tv/helix/moderation/';

const WS_EVENT_TYPES = {
  GET_SONG: 'GET_SONG',
  SONG_NAME_RECEIVED: 'SONG_NAME_RECEIVED',
  STOP_AUDIO: 'STOP_AUDIO',
};

const spamMessages = ['Cheap viewers', 'Best viewers'];

export {
  soundMap,
  voicesElevenLabs,
  ELEVEN_LABS_URL,
  fileNameElevenLabs,
  voicesGoogleCloud,
  fileNameGoogleCloud,
  getFirstTabsPlayingTittle,
  stopPlayingMusicMac,
  stopPlayingAllTabsChrome,
  TWITCH_BASE_URL,
  WS_EVENT_TYPES,
  spamMessages,
};
