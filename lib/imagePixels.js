// lib/imagePixels.js
// Récupération des données de pixels RGBA d'une image, de façon multiplateforme.
// - Web : rendu sur un <canvas> puis getImageData.
// - Natif (iOS/Android) : redimensionnement PNG via expo-image-manipulator puis
//   décodage 100% JS avec upng-js.

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIM = 160; // dimension max pour l'analyse (compromis vitesse/précision)

/**
 * Retourne { data: Uint8ClampedArray RGBA, width, height } pour une URI d'image.
 * @param {string} uri
 * @param {number} maxDim
 */
export async function getPixelData(uri, maxDim = MAX_DIM) {
  if (Platform.OS === 'web') {
    return getPixelDataWeb(uri, maxDim);
  }
  return getPixelDataNative(uri, maxDim);
}

/** Implémentation web via canvas. */
function getPixelDataWeb(uri, maxDim) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        resolve({ data: imageData.data, width, height });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(new Error('Impossible de charger l\'image.'));
    img.src = uri;
  });
}

/** Implémentation native : resize -> PNG base64 -> décodage upng-js. */
async function getPixelDataNative(uri, maxDim) {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDim } }],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true }
  );
  const base64 = manipulated.base64;
  const bytes = base64ToUint8Array(base64);
  const UPNG = require('upng-js');
  const png = UPNG.decode(bytes.buffer);
  const rgba = UPNG.toRGBA8(png)[0]; // ArrayBuffer du 1er frame
  return {
    data: new Uint8ClampedArray(rgba),
    width: png.width,
    height: png.height,
  };
}

/** Décode une chaîne base64 en Uint8Array (sans dépendance DOM atob garantie). */
function base64ToUint8Array(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let bufferLength = base64.length * 0.75;
  const len = base64.length;
  if (base64[len - 1] === '=') {
    bufferLength--;
    if (base64[len - 2] === '=') bufferLength--;
  }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (base64.charCodeAt(i + 2) !== 61) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (base64.charCodeAt(i + 3) !== 61) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}
