'use strict';
/**
 * Media management: accepts an uploaded image buffer, strips metadata,
 * converts to optimized WebP, and generates responsive width variants.
 * Returns a base URL + srcset descriptor stored on product_images.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');
const { randomToken } = require('./util');

const OUT_DIR = path.join(config.paths.uploads, 'products');
fs.mkdirSync(OUT_DIR, { recursive: true });

const WIDTHS = [400, 800, 1200, 1600];
const ALLOWED = new Set(['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'tiff']);
const MAX_PIXELS = 40 * 1000 * 1000; // 40MP guard against decompression bombs

/**
 * Ingest an uploaded image: verify it genuinely decodes as a supported
 * raster format (magic bytes via sharp, not just the client MIME header),
 * reject oversized/decompression-bomb inputs, strip metadata, and emit
 * optimized WebP at responsive widths.
 *
 * @param {Buffer} buffer raw uploaded bytes
 * @returns {Promise<{url:string, srcset:{w:number,url:string}[], width:number, height:number}>}
 */
async function processImage(buffer) {
  // sharp with limitInputPixels re-decodes and validates the real bytes.
  let meta;
  try {
    meta = await sharp(buffer, { failOn: 'error', limitInputPixels: MAX_PIXELS }).metadata();
  } catch (e) {
    throw new Error('The uploaded file is not a valid image.');
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new Error('Unsupported image format.');
  if ((meta.width || 0) * (meta.height || 0) > MAX_PIXELS) throw new Error('Image resolution is too large.');
  if (!meta.width || !meta.height) throw new Error('Could not read image dimensions.');

  const id = randomToken(10);
  const maxW = Math.min(meta.width, 1600);

  const srcset = [];
  for (const w of WIDTHS) {
    if (w > maxW && srcset.length) break;
    const targetW = Math.min(w, maxW);
    const filename = `${id}-${targetW}.webp`;
    await sharp(buffer, { failOn: 'error', limitInputPixels: MAX_PIXELS })
      .rotate()                                   // honour EXIF orientation
      .resize({ width: targetW, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(OUT_DIR, filename));       // .webp() drops all metadata
    srcset.push({ w: targetW, url: `/uploads/products/${filename}` });
  }

  const base = srcset[srcset.length - 1];
  return { url: base.url, srcset, width: maxW, height: meta.height || 0 };
}

function remove(url) {
  try {
    if (url && url.startsWith('/uploads/')) {
      const p = path.join(config.paths.root, url.replace(/^\//, ''));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch (_) { /* ignore */ }
}

module.exports = { processImage, remove, WIDTHS };
