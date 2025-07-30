import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

import { ELEVEN_LABS_URL, fileNameElevenLabs, voicesElevenLabs } from './helpers/consts.js';
import { getRandomVoiceIndex, playAudio } from './helpers/utils.js';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

async function speakWithElevenLabs(text, player) {
  const theVoiceRandom = getRandomVoiceIndex(voicesElevenLabs);

  try {
    const response = await axios.post(
      ELEVEN_LABS_URL + voicesElevenLabs[theVoiceRandom],
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
      },
    );

    const audioBuffer = response.data;
    const audioPath = fileNameElevenLabs;

    fs.writeFileSync(audioPath, audioBuffer);

    console.log('Audio generated, playing...');

    playAudio(audioPath, player);
  } catch (error) {
    console.error('ElevenLabs TTS Error:', error, error.response?.data || error.message);
  }
}

export { speakWithElevenLabs };
