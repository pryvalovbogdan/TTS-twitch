import fs from 'fs';
import util from 'util';

import textToSpeech from '@google-cloud/text-to-speech';

import { fileNameGoogleCloud, voicesGoogleCloud } from './helpers/consts.js';
import { getRandomVoiceIndex, playAudio } from './helpers/utils.js';

const client = new textToSpeech.TextToSpeechClient();

async function TTSWithGoogleCloud(textToSound, player) {
  try {
    const text = textToSound || 'Just help me guys to make it work properly';

    const theVoiceRandom = getRandomVoiceIndex(voicesGoogleCloud);

    const request = {
      input: { text: text },
      voice: voicesGoogleCloud[theVoiceRandom],
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await client.synthesizeSpeech(request);
    // In case we want to check available voices request the list of voices
    // const listVoices = await client.listVoices(request);
    // console.log('response', response, JSON.stringify(listVoices));

    const writeFile = util.promisify(fs.writeFile);

    console.log('Audio content written to file: output.mp3', response.audioContent);
    await writeFile(fileNameGoogleCloud, response.audioContent, 'binary');

    playAudio(fileNameGoogleCloud, player);
  } catch (error) {
    console.error('Google cloud TTS Error:', error.response?.data || error.message);
  }
}

export { TTSWithGoogleCloud };
