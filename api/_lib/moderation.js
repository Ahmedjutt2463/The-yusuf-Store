require('dotenv').config();
const tf = require('@tensorflow/tfjs');
const nsfw = require('nsfwjs');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

/* ------------------------------------------------------------------ */
/*  TEXT MODERATION - offensive word filter                            */
/* ------------------------------------------------------------------ */

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '+': 't', '0': 'o' };

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[0-9@$!+]/g, c => LEET[c] || c)
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const OFFENSIVE_WORDS = [
  // English profanity / slurs
  'ass', 'asshole', 'bitch', 'bastard', 'cunt', 'pussy', 'whore', 'slut', 'cock', 'dick',
  'fuck', 'fucker', 'fucking', 'fuckin', 'motherfucker', 'motherfucking', 'fag',
  'faggot', 'nigga', 'nigger', 'coon', 'retard', 'bullshit', 'shit', 'bitchass',
  'cocksucker', 'cum', 'cumshot', 'dildo', 'gook', 'kike', 'spic', 'wank',
  'wanker', 'tits', 'titty', 'boobs', 'blowjob', 'handjob', 'rape',
  'rapist', 'pedo', 'paedo', 'douche', 'douchebag', 'porn', 'nude',
  'naked', 'sexting', 'sex', 'bitchy', 'cuntface', 'crap',
  // censor-evasion variants (f*ck, sh*t, a**hole, ...)
  'fck', 'fckn', 'fckin', 'fuk', 'fukin', 'fukn', 'fxck', 'fkn', 'fking', 'phuk', 'fuq',
  'ahole', 'ashole', 'sht', 'cnt', 'dck', 'slvt', 'twat', 'stfu',
  // Common Urdu / Hindi obscenities (romanized)
  'chut', 'chod', 'choda', 'bhenchod', 'madarchod', 'gaand', 'gandu', 'gandoo',
  'randi', 'kutti', 'harami', 'lauda', 'laundi', 'bhosda', 'bhosdi', 'bhosri',
  'jhantu', 'lund', 'bhadwa', 'bhadwe', 'sala', 'suar', 'kamina', 'kutte',
  'kuttiya', 'tatti', 'chhinal', 'chinal', 'chodu', 'kutiya', 'gadhha', 'gadha',
  'chakka', 'chutiya', 'chutiye', 'boob', 'boobie', 'chuchi', 'behanchod'
];

const OFFENSIVE_SET = new Set(OFFENSIVE_WORDS);
const OFFENSIVE_PHRASES = OFFENSIVE_WORDS.filter(w => w.includes(' '));

function hasOffensiveText(...fields) {
  const text = normalizeText(fields.join(' '));
  if (!text) return false;
  const tokens = text.split(' ');
  for (const t of tokens) {
    if (t.length >= 3 && OFFENSIVE_SET.has(t)) return true;
  }
  for (const phrase of OFFENSIVE_PHRASES) {
    if (text.includes(phrase)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  IMAGE MODERATION - NSFW classification (NSFWJS MobileNetV2)        */
/* ------------------------------------------------------------------ */

let modelPromise = null;

function getModelBaseUrl(req) {
  if (process.env.NSFW_MODEL_BASE_URL) return process.env.NSFW_MODEL_BASE_URL;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return proto + '://' + host;
}

function loadModel(req) {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      const base = getModelBaseUrl(req);
      const model = await nsfw.load(base + '/nsfw-model/model.json', { size: 224 });
      await model.classify(tf.zeros([224, 224, 3], 'int32'));
      return model;
    })().catch(err => {
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

function rgbaToTensor(data, width, height) {
  const numPixels = width * height;
  const values = new Int32Array(numPixels * 3);
  for (let i = 0; i < numPixels; i++) {
    values[i * 3] = data[i * 4];
    values[i * 3 + 1] = data[i * 4 + 1];
    values[i * 3 + 2] = data[i * 4 + 2];
  }
  return tf.tensor3d(values, [height, width, 3], 'int32');
}

/**
 * Returns true when the image is safe to publish.
 * Throws when the image cannot be verified (fail closed).
 */
async function isPhotoSafe(req, buffer, mime) {
  const pixels = mime === 'image/png'
    ? PNG.sync.read(buffer)
    : jpeg.decode(buffer, true);
  const input = rgbaToTensor(pixels.data, pixels.width, pixels.height);
  try {
    const model = await loadModel(req);
    const predictions = await model.classify(input);
    const p = {};
    predictions.forEach(x => { p[String(x.className).toLowerCase()] = Number(x.probability) || 0; });
    const safe = !(p.porn >= 0.55 || p.hentai >= 0.55 || p.sexy >= 0.75);
    return safe;
  } finally {
    input.dispose();
  }
}

module.exports = { hasOffensiveText, isPhotoSafe };
