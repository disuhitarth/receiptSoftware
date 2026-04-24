const receiptline = require('receiptline');
const fs = require('fs');

// --- 1. Define the receipt in ReceiptLine markup ---
const receiptMarkup = `
{align: center}
{image: }
{text: 2}CORNER STORE{text: 1}
123 Main Street, Springfield
Tel: (555) 012-3456
www.cornerstore.com
{text: 1}

{align: left}
--------------------------------
{w: *, 10}
Date         | 2026-04-24 14:32
Cashier      | Jane
Register     | POS-01
Order #      | 00842
--------------------------------

{w: *, 6, 8}
ITEM             | QTY |  PRICE
--------------------------------
Whole Milk 2L    |   2 |  $5.98
Sourdough Bread  |   1 |  $4.49
Cheddar Cheese   |   1 |  $6.99
Orange Juice 1L  |   3 | $11.97
Butter 250g      |   2 |  $7.98
Eggs (dozen)     |   1 |  $4.29
Coffee Beans 1kg |   1 | $15.99
--------------------------------

{w: *, 10}
Subtotal     |     $57.69
Tax (8%)     |      $4.62
{text: 2}
TOTAL        |     $62.31
{text: 1}
--------------------------------
Payment: VISA **** 4821 | $62.31
Change                  |  $0.00
--------------------------------

{align: center}
Points Earned: 62  |  Balance: 1,840

Thank you for shopping with us!
Please keep receipt for returns.

{code: 00842-20260424-CORNERSTORE; option: qrcode, 3, 0, m}

*** STORE COPY ***
`;

// --- 2. Epson ESC/POS config (for a typical 80mm Epson TM-T88 series) ---
const epsonConfig = {
  cpl: 42,           // characters per line for 80mm paper at standard font
  encoding: 'cp437', // standard Epson code page (Western Europe / US)
  spacing: false,    // no extra line spacing
  cutting: true,     // auto-cut paper at end
  upsideDown: false,
  gamma: 1.8,        // image gamma correction
  command: 'escpos'  // Epson ESC/POS protocol
};

// --- 3. SVG config (for visual preview — same receipt, rendered as image) ---
const svgConfig = {
  cpl: 42,
  encoding: 'cp437',
  spacing: false,
  cutting: true,
  command: 'svg'
};

console.log('=== ReceiptLine Demo — Epson ESC/POS ===\n');

// --- 4. Generate ESC/POS binary commands ---
const escposOutput = receiptline.transform(receiptMarkup, epsonConfig);

console.log('ESC/POS output generated.');
console.log('Byte length:', Buffer.byteLength(escposOutput, 'binary'), 'bytes');
console.log('\nFirst 80 bytes as hex (shows ESC/POS command sequences):');

const hexDump = Buffer.from(escposOutput, 'binary')
  .slice(0, 80)
  .toString('hex')
  .match(/.{1,2}/g)
  .join(' ');
console.log(hexDump);

console.log('\nKey ESC/POS commands you can spot in the hex:');
console.log('  1b 40       = ESC @ (Initialize printer)');
console.log('  1b 61 01    = ESC a 1 (Center alignment)');
console.log('  1b 21 xx    = ESC ! (Select print mode / text size)');
console.log('  1b 64 xx    = ESC d (Feed n lines)');
console.log('  1d 56 xx    = GS V  (Cut paper)');

// Save the raw ESC/POS binary to a .bin file
fs.writeFileSync('epson_receipt.bin', escposOutput, 'binary');
console.log('\nESC/POS binary saved to: epson_receipt.bin');
console.log('(Send this file directly to your Epson printer via USB/network)');

// --- 5. Generate SVG preview ---
const svgOutput = receiptline.transform(receiptMarkup, svgConfig);
fs.writeFileSync('epson_receipt_preview.svg', svgOutput);
console.log('SVG preview saved to:    epson_receipt_preview.svg');

// --- 6. Show how you would send to a real printer ---
console.log('\n=== How to send to your Epson printer ===');
console.log('Option A — USB (Linux):');
console.log('  cat epson_receipt.bin > /dev/usb/lp0');
console.log('\nOption B — Network (TCP/IP):');
console.log('  node -e "');
console.log('    const net = require(\'net\');');
console.log('    const fs  = require(\'fs\');');
console.log('    const s = net.connect(9100, \'192.168.1.100\', () => {');
console.log('      s.write(fs.readFileSync(\'epson_receipt.bin\'));');
console.log('      s.end();');
console.log('    });');
console.log('  "');
console.log('\nOption C — Windows USB share:');
console.log('  copy /b epson_receipt.bin \\\\\\\\localhost\\\\EpsonTM');

// --- 7. Demonstrate different CPL (paper width) configs ---
console.log('\n=== Paper Width Comparison ===');
const paperWidths = [
  { label: '58mm paper (32 CPL)', cpl: 32 },
  { label: '80mm paper (42 CPL)', cpl: 42 },
  { label: '80mm paper wide font (56 CPL)', cpl: 56 },
];
paperWidths.forEach(({ label, cpl }) => {
  const out = receiptline.transform(receiptMarkup, { ...epsonConfig, cpl, command: 'svg' });
  const filename = `preview_${cpl}cpl.svg`;
  fs.writeFileSync(filename, out);
  console.log(`  ${label} → ${filename}`);
});

console.log('\nDone! Open the .svg files in a browser to see the receipt previews.');
