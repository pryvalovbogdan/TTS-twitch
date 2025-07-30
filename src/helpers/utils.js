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

export { getRandomVoiceIndex, playAudio };
