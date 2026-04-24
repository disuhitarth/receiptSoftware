const express = require('express');
const receiptline = require('receiptline');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/preview', (req, res) => {
  const { markup, cpl, encoding, cutting } = req.body;
  try {
    const svg = receiptline.transform(markup, {
      cpl: parseInt(cpl) || 42,
      encoding: encoding || 'cp437',
      spacing: false,
      cutting: cutting !== false,
      command: 'svg',
    });
    res.json({ svg });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/escpos', (req, res) => {
  const { markup, cpl, encoding, cutting } = req.body;
  try {
    const binary = receiptline.transform(markup, {
      cpl: parseInt(cpl) || 42,
      encoding: encoding || 'cp437',
      spacing: false,
      cutting: cutting !== false,
      command: 'escpos',
    });
    const buf = Buffer.from(binary, 'binary');

    // Build annotated hex dump
    const hex = [];
    for (let i = 0; i < buf.length; i += 16) {
      const slice = buf.slice(i, i + 16);
      const hexPart = [...slice].map(b => b.toString(16).padStart(2, '0')).join(' ');
      const asciiPart = [...slice].map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.').join('');
      hex.push({ offset: i.toString(16).padStart(4, '0'), hex: hexPart, ascii: asciiPart });
    }

    // Known ESC/POS command annotations
    const annotations = [];
    for (let i = 0; i < buf.length; i++) {
      const b0 = buf[i], b1 = buf[i + 1], b2 = buf[i + 2];
      if (b0 === 0x1b && b1 === 0x40) annotations.push({ offset: i, label: 'ESC @ — Initialize printer' });
      else if (b0 === 0x1b && b1 === 0x61) annotations.push({ offset: i, label: `ESC a ${b2} — Alignment (0=left 1=center 2=right)` });
      else if (b0 === 0x1b && b1 === 0x21) annotations.push({ offset: i, label: `ESC ! ${b2} — Print mode (bold/double)` });
      else if (b0 === 0x1d && b1 === 0x21) annotations.push({ offset: i, label: `GS ! ${b2} — Character size` });
      else if (b0 === 0x1d && b1 === 0x56) annotations.push({ offset: i, label: `GS V ${b2} — Cut paper` });
      else if (b0 === 0x1b && b1 === 0x45) annotations.push({ offset: i, label: `ESC E ${b2} — Bold ${b2 ? 'ON' : 'OFF'}` });
      else if (b0 === 0x1d && b1 === 0x42) annotations.push({ offset: i, label: `GS B ${b2} — Reverse print ${b2 ? 'ON' : 'OFF'}` });
      else if (b0 === 0x1b && b1 === 0x64) annotations.push({ offset: i, label: `ESC d ${b2} — Feed ${b2} lines` });
      else if (b0 === 0x1d && b1 === 0x6b) annotations.push({ offset: i, label: `GS k — Print barcode` });
      else if (b0 === 0x1d && b1 === 0x28 && b2 === 0x6b) annotations.push({ offset: i, label: 'GS ( k — Print QR code' });
    }

    res.json({ hex, annotations, byteLength: buf.length, base64: buf.toString('base64') });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`ReceiptLine UI running at http://localhost:${PORT}`));
