import * as qr from "./const-qr.js";
import * as fa from "./const-fa.js";

const NEW_COLOUR_HTML = '<li class="solo"><button class="icon remove for-grad linear radial conic"><i class="fa-solid fa-trash-can"></i></button><ul class="up-down for-grad linear radial conic"><li><button class="icon up"><i class="fa-solid fa-chevron-up"></i></button></li><li><button class="icon down"><i class="fa-solid fa-chevron-down"></i></button></li></ul><input type="text" value="0" class="for-grad linear radial conic"></input><input type="color"><ul class="copy-paste"><li><button class="icon copy"><i class="fa-solid fa-copy"></i></button></li><li><button class="icon paste"><i class="fa-solid fa-paste"></i></button></li></ul></li>';

const ICON_PACKS = {
  'solid': fa.FA_SOLID,
  'regular': fa.FA_REGULAR,
  'brands': fa.FA_BRANDS
}

// generating
let encoding;
let dataType;
let correctionLevel;
let version;

// drawing
let qrData;
let qrSize;
let qrGrid;

function init() {
  selectEncoding('byte');
  selectDataType('url');
  selectCorrectionLevel('q');
}
window.addEventListener('DOMContentLoaded', init);

function selectEncoding(mode) {
  encoding = mode;
  let buttons = document.querySelectorAll('#encoding-modes button');
  for (let i = 0; i < buttons.length; i ++) {
    buttons[i].classList.remove('selected');
    if (buttons[i].getAttribute('value') == mode) {
      buttons[i].classList.add('selected');
    }
  }
}
document.querySelectorAll('#encoding-modes button').forEach((el) => {
  el.addEventListener('click', () => {
    selectEncoding(el.getAttribute('value'));
  });
});

function selectDataType(type) {
  dataType = type;
  let buttons = document.querySelectorAll('#data-types button');
  document.querySelectorAll(`[id$="-config"]`).forEach((el) => {
    el.style.display = 'none';
  });
  for (let i = 0; i < buttons.length; i ++) {
    let val = buttons[i].getAttribute('value');
    buttons[i].classList.remove('selected');
    if (val == type) {
      buttons[i].classList.add('selected');
      document.querySelectorAll(`#${val}-config`).forEach((el) => {
        el.style.display = '';
      });
    }
  }
}
document.querySelectorAll('#data-types button').forEach((el) => {
  el.addEventListener('click', () => {
    selectDataType(el.getAttribute('value'));
  });
});

function selectCorrectionLevel(level) {
  correctionLevel = level;
  let buttons = document.querySelectorAll('#correction-levels button');
  for (let i = 0; i < buttons.length; i ++) {
    buttons[i].classList.remove('selected');
    if (buttons[i].getAttribute('value') == level) {
      buttons[i].classList.add('selected');
    }
  }
}
document.querySelectorAll('#correction-levels button').forEach((el) => {
  el.addEventListener('click', () => {
    selectCorrectionLevel(el.getAttribute('value'))
  });
});

function getRequiredCharCount(ver, enc) {
  if (ver < 9) {
    return qr.CHAR_COUNT[enc][0];
  }
  else if (ver < 26) {
    return qr.CHAR_COUNT[enc][1];
  }
  else {
    return qr.CHAR_COUNT[enc][2];
  }
}

function padZeroes(str, len, dir = 'l') {
  let newStr = str;
  for (let i = 0; i < len - str.length; i ++) {
    if (dir == 'r') {
      newStr += '0';
    }
    else if (dir == 'l') {
      newStr = '0' + newStr;
    }
  }
  return newStr;
}

function removeZeroes(str, dir = 'l') {
  if (dir == 'l') {
    for (let i = 0; i < str.length; i ++) {
      if (str.charAt(i) == '1') {
        return str.substring(i);
      }
    }
  }
  else {
    for (let i = str.length - 1; i >= 0; i --) {
      if (str.charAt(i) == '1') {
        return str.substring(0, i + 1);
      }
    }
  }
  return '';
}

function sumMod(a, b, m) {
  let ret = a + b;
  if (ret > m - 1) {
    ret = ret % m + Math.floor(ret / m);
  }
  return ret;
}

function polyMult(p, q) { // alpha notation
  const a = 0;
  const x = 1;

  // piece-wise multiplication
  let mult = [];
  for (let i = 0; i < p.length; i ++) {
    for (let j = 0; j < q.length; j ++) {
      mult.push([sumMod(p[i][a],q[j][a],256), sumMod(p[i][x],q[j][x],256)]);
    }
  }

  // find highest exp, just to loop
  let maxExp = Number.MIN_SAFE_INTEGER;
  for (let i = 0; i < mult.length; i ++) {
    if (mult[i][x] > maxExp) {
      maxExp = mult[i][x];
    }
  }

  // combine like terms
  let fin = [];
  for (let i = 0; i <= maxExp; i ++) {
    let xor = 0;
    for (let j = 0; j < mult.length; j ++) {
      if (mult[j][x] == i) {
        xor ^= qr.A_TO_INT[mult[j][a]];
      }
    }
    if (xor != 0) {
      fin.push([qr.INT_TO_A[xor],i]);
    }
  }

  return fin;
}

function polyXOR(p, q) { // alpha notation
  const a = 0;
  const x = 1;

  // find highest exp, just to loop
  let maxExp = Number.MIN_SAFE_INTEGER;
  for (let i = 0; i < p.length; i ++) {
    if (p[i][x] > maxExp) {
      maxExp = p[i][x];
    }
  }
  for (let i = 0; i < q.length; i ++) {
    if (q[i][x] > maxExp) {
      maxExp = q[i][x];
    }
  }

  let fin = [];
  for (let i = 0; i <= maxExp; i ++) {
    let pTerm = 0;
    for (let j = 0; j < p.length; j ++) {
      if (p[j][x] != i) { continue; }
      pTerm = qr.A_TO_INT[p[j][a]];
    }
    let qTerm = 0;
    for (let j = 0; j < q.length; j ++) {
      if (q[j][x] != i) { continue; }
      qTerm = qr.A_TO_INT[q[j][a]];
    }
    let xor = pTerm ^ qTerm;
    if (xor != 0) { // remove null terms
      fin.push([qr.INT_TO_A[xor],i]);
    }
  }
  return fin;
}

function genPoly(bytes) { // alpha notation
  const a = 0;
  const x = 1;
  let curr = [[0,1], [0,0]];

  for (let i = 1; i < bytes; i ++) {
    let gen = [[0,1], [i,0]];
    curr = polyMult(curr, gen);
  }
  return curr;
}

function dataPoly(data) { // alpha notation
  let fin = [];
  for (let i = 0; i < data.length / 8; i ++) {
    fin.push([qr.INT_TO_A[parseInt(data.substring(data.length - (i + 1) * 8, data.length - i * 8), 2)],i]);
  }
  return fin;
}

function getCorrBytes(data, numCorrBytes) {
  const a = 0;
  const x = 1;

  // prep for division
  let dPoly = dataPoly(data);
  for (let i = 0; i < dPoly.length; i ++) {
    dPoly[i][x] += numCorrBytes;
  }

  let gPoly = genPoly(numCorrBytes);
  const diff = dPoly[dPoly.length - 1][x] - gPoly[gPoly.length - 1][x];
  for (let i = 0; i < gPoly.length; i ++) {
    gPoly[i][x] += diff;
  }

  // loop
  let last = [];
  let curr = dPoly;
  for (let i = 0; i < dPoly.length; i ++) {
    last = curr;
    curr = polyMult(gPoly, [[last[last.length - 1][a],0]]);

    for (let j = 0; j < gPoly.length; j ++) {
      gPoly[j][x] --;
    }
    curr = polyXOR(curr, last);
  }

  let fin = [];
  for (let i = 0; i < numCorrBytes; i ++) {
    let toPush = 0;
    for (let j = 0; j < curr.length; j ++) {
      if (curr[j][x] == i) {
        toPush = qr.A_TO_INT[curr[j][a]];
        break;
      }
    }
    fin.push(toPush);
  }
  fin.reverse();
  return fin;
}

function getParam(dType, param) {
  try {
    let val = document.querySelector(`#${dType}-${param}`).value;
    if (val != null && val != '') {
      return val;
    }
  }
  catch (error) {}
  return null;
}

function generateQR() {
  // format input into appropriate string
  let content;
  let params;
  switch (dataType) {
    case 'url':
      content = getParam(dataType, 'url');
      break;
    case 'email':
      content = `mailto:${getParam(dataType, 'to')}`;
      params = ['cc','bcc','subject','body']
      for (let i = 0; i < params.length; i ++) {
        let val = getParam(dataType, params[i]);
        if (val != null) {
          content += `&${params[i]}=${val.replaceAll(' ','%20')}`;
        }
      }
      let firstAmp = content.indexOf('&');
      content = `${content.substring(0, firstAmp)}?${content.substring(firstAmp + 1)}`;
      break;
    case 'phone':
      let number = getParam(dataType, 'number');
      content = `+${number}`;
      break;
    case 'contact':
      content = `MECARD:N:`;
      params = ['name-family', 'name-given'];
      let firstEntry = true;
      for (let i = 0; i < params.length; i ++) {
        if (!firstEntry) {
          content += ',';
        }
        if (getParam(dataType, params[i]) != null) {
          content += getParam(dataType, params[i]);
          firstEntry = false;
        }
      }
      content += ';';
      params = ['tel', 'email', 'note', 'bday', 'adr', 'url', 'nickname'];
      for (let i = 0; i < params.length; i ++) {
        let val = getParam(dataType, params[i]);
        if (val != null) {
          content += `${params[i].toUpperCase()}:${val};`;
        }
      }
      content += ';';
      break;
    case 'sms':
      break;
    case 'facetime':
      break;
    case 'geo':
      break;
    case 'apple-maps':
      break;
    case 'google-maps':
      break;
    case 'event':
      break;
    case 'wifi':
      content = 'WIFI:T:WEP;S:Clark-WiFi;P:01189998819991197253;;';
      break;
    case 'google-play':
      break;
    case 'apple-music':
      break;
    case 'i-tunes':
      break;
    case 'i-books':
      break;
    case 'app-store':
      break;
    default:
      break;
  }

  // if (content == null) {
  //   return;
  // }

  // find minimum version required to store content
  for (let i = 0; i < 40; i ++) {
    version = i;
    if (qr.VERSION_CAPACITY[encoding][correctionLevel][version] >= content.length) {
      break;
    }
  }

  // add mode indicator
  let data = qr.MODE_INDICATOR[encoding];

  // add character count
  let charCount = padZeroes(content.length.toString(2), getRequiredCharCount(version, encoding));
  data += charCount;

  // encode content
  switch (encoding) {
    case 'numeric':
      break;
    case 'alphanumeric':
      for (let i = 0; i < content.length; i += 2) {
        if (i + 1 == content.length) { // odd length, final char
          data += padZeroes(ENCODING[encoding].indexOf(content[i].toUpperCase()).toString(2), 6);
        }
        else {
          data += padZeroes((qr.ENCODING[encoding].indexOf(content[i].toUpperCase()) * 45 + qr.ENCODING[encoding].indexOf(content[i + 1].toUpperCase())).toString(2), 11);
        }
      }
      break;
    case 'byte':
      new TextEncoder('iso-8859-1').encode(content).forEach((byte) => {
        data += padZeroes(byte.toString(2), 8);
      });
      break;
    case 'kanji':
      break;
    default:
      break;
  }
  
  // add terminator
  data = padZeroes(data, Math.min(qr.TOTAL_BYTES[correctionLevel][version] * 8, data.length + 4), 'r');

  // pad to mult of 8
  if (data.length % 8 != 0) {
    data = padZeroes(data, data.length + (8 - data.length % 8), 'r');
  }

  // continue to pad w/ alternating bytes
  let padToggle = true;
  while (data.length < qr.TOTAL_BYTES[correctionLevel][version] * 8) {
    if (padToggle) {
      data += '11101100';
    }
    else {
      data += '00010001';
    }
    padToggle = !padToggle;
  }

  // get correction bytes for each block
  let corrBytes = [];
  let dPointer = 0;
  for (let g = 1; g < 3; g ++) { // groups 1 and 2
    let blockSize = qr.DATA_BYTES[g.toString()][correctionLevel][version] * 8;
    for (let b = 0; b < qr.BLOCK_COUNT[g.toString()][correctionLevel][version]; b ++) { // blocks in each group
      corrBytes.push(getCorrBytes(data.substring(dPointer, dPointer + blockSize), qr.EC_BYTES[correctionLevel][version]));
      
      dPointer += blockSize;
    }
  }

  // interleave data
  let final = '';
  let maxOfBlocks = Math.max(qr.DATA_BYTES['1'][correctionLevel][version], qr.DATA_BYTES['2'][correctionLevel][version]);
  for (let i = 0; i < maxOfBlocks; i ++) {
    dPointer = i * 8;
    for (let g = 1; g < 3; g ++) {
      let blockSize = qr.DATA_BYTES[g.toString()][correctionLevel][version];
      if (i >= blockSize) {
        dPointer += blockSize * 8 * qr.BLOCK_COUNT[g.toString()][correctionLevel][version];
        continue;
      }
      for (let b = 0; b < qr.BLOCK_COUNT[g.toString()][correctionLevel][version]; b ++) { // blocks in each group
        final += data.substring(dPointer, dPointer + 8);
        dPointer += blockSize * 8;
      }
    }
  }

  // interleave corrections
  for (let i = 0; i < qr.EC_BYTES[correctionLevel][version]; i ++) {
    for (let b = 0; b < qr.BLOCK_COUNT['1'][correctionLevel][version] + qr.BLOCK_COUNT['2'][correctionLevel][version]; b ++) {
      final += padZeroes(corrBytes[b][i].toString(2), 8);
    }
  }

  // add remainder bits
  for (let i = 0; i < qr.REMAINDER_BITS[version]; i ++) {
    final += '0';
  }

  qrData = final;
  assembleQR();
}

function drawEye(x, y, anchor = 'nw') {
  const eye = [[1,1,1,1,1,1,1,0],[1,0,0,0,0,0,1,0],[1,0,1,1,1,0,1,0],[1,0,1,1,1,0,1,0],[1,0,1,1,1,0,1,0],[1,0,0,0,0,0,1,0],[1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]];
  let iDir = 1;
  let jDir = 1;

  if (anchor.charAt(0) == 's') {
    iDir = -1;
  }
  if (anchor.charAt(1) == 'e') {
    jDir = -1;
  }

  for (let i = 0; i < 8; i ++) {
    for (let j = 0; j < 8; j ++) {
      qrGrid[y + i * iDir][x + j * jDir] = eye[i][j];
    }
  }
}

function drawMarker(x, y, anchor = 'c') {
  const marker = [[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]];
  let iDir = 1;
  let jDir = 1;
  let iOffset = -2;
  let jOffset = -2;

  for (let i = 0; i < 5; i ++) {
    for (let j = 0; j < 5; j ++) {
      if (qrGrid[y + i * iDir + iOffset][x + j * jDir + jOffset] != -1) {
        return;
      }
    }
  }
  
  for (let i = 0; i < 5; i ++) {
    for (let j = 0; j < 5; j ++) {
      qrGrid[y + i * iDir + iOffset][x + j * jDir + jOffset] = marker[i][j];
    }
  }
}

function assembleQR() {
  qrSize = (version * 4) + 21;
  qrGrid = [];

  let qrRow = [];
  for (let i = 0; i < qrSize; i ++) {
    qrRow.push(-1);
  }
  for (let i = 0; i < qrSize; i ++) {
    qrGrid.push(qrRow.slice());
  }

  // eyes
  drawEye(0, 0, 'nw');
  drawEye(qrSize - 1, 0, 'ne');
  drawEye(0, qrSize - 1, 'sw');

  // alignment markers
  for (let i = 0; i < qr.ALIGNMENT_MARKERS[version].length; i ++) {
    for (let j = 0; j < qr.ALIGNMENT_MARKERS[version].length; j ++) {
      drawMarker(qr.ALIGNMENT_MARKERS[version][j], qr.ALIGNMENT_MARKERS[version][i], 'c');
    }
  }

  // timing patterns
  for (let i = 6; i < qrSize - 6; i ++) {
    let bit = (i + 1) % 2;
    if (qrGrid[6][i] == -1) {
      qrGrid[6][i] = bit;
    }
    if (qrGrid[i][6] == -1) {
      qrGrid[i][6] = bit;
    }
  }

  // dark bit 
  qrGrid[4 * (version + 1) + 9][8] = 1;

  // reserved areas
  for (let i = 0; i < qrSize; i ++) {
    if (i < 9 || i > qrSize - 9) {
      if (qrGrid[8][i] == -1) {
        qrGrid[8][i] = 2;
      }
      if (qrGrid[i][8] == -1) {
        qrGrid[i][8] = 2;
      }
    }
  }

  if (version > 5) {
    for (let i = 0; i < 3; i ++) {
      for (let j = 0; j < 6; j ++) {
        qrGrid[qrSize - 9 - i][j] = 2;
        qrGrid[j][qrSize - 9 - i] = 2;
      }
    }
  }

  // data with masks
  let qrMask = [];
  for (let i = 0; i < 8; i ++) {
    let grid = [];
    for (let j = 0; j < qrSize; j ++) {
      grid.push(qrGrid[j].slice());
    }
    qrMask.push(grid.slice());
  }

  let goingUp = true;
  let dPointer = 0;
  for (let i = 0; i < qrSize; i += 2) {
    if (i == qrSize - 7) {
      i ++; // skip vertical timing pattern
    }
    for (let j = 0; j < qrSize; j ++) {
      for (let k = 0; k < 2; k ++) {
        let y = goingUp ? qrSize - 1 - j : j;
        let x = qrSize - 1 - i - k;

        if (qrGrid[y][x] == -1) {
          if (dPointer >= qrData.length) { continue; }
          let bit = Number(qrData.charAt(dPointer));

          qrMask[0][y][x] = (y + x) % 2 == 0 ? (bit + 1) % 2 : bit;
          qrMask[1][y][x] = y % 2 == 0 ? (bit + 1) % 2 : bit;
          qrMask[2][y][x] = x % 3 == 0 ? (bit + 1) % 2 : bit;
          qrMask[3][y][x] = (y + x) % 3 == 0 ? (bit + 1) % 2 : bit;
          qrMask[4][y][x] = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 == 0 ? (bit + 1) % 2 : bit;
          qrMask[5][y][x] = (y * x) % 2 + (y * x) % 3 == 0 ? (bit + 1) % 2 : bit;
          qrMask[6][y][x] = ((y * x) % 2 + (y * x) % 3) % 2 == 0 ? (bit + 1) % 2 : bit;
          qrMask[7][y][x] = ((y + x) % 2 + (y * x) % 3) % 2 == 0 ? (bit + 1) % 2 : bit;

          dPointer ++;
        }
      }
    }
    goingUp = !goingUp;
  }

  // test masks
  let maskScore = [];
  let penalty;
  for (let m = 0; m < 8; m ++) {
    penalty = 0;
    // condition 1
    for (let d = 0; d < 2; d ++) {
      for (let i = 0; i < qrSize; i ++) {
        let consecutive = 0;
        let last = -1;
        for (let j = 0; j < qrSize; j ++) {
          let x = j;
          let y = i;
          if (d == 1) {
            x = j;
            y = i;
          }
          if (qrMask[m][y][x] == last) {
            consecutive ++;
          }
          else {
            consecutive = 0;
          }
          if (consecutive == 5) {
            penalty += 3;
          }
          if (consecutive > 5) {
            penalty ++;
          }
          last = qrMask[m][y][x];
        }
      }
    }

    // condition 2
    for (let i = 0; i < qrSize - 1; i ++) {
      for (let j = 0; j < qrSize - 1; j ++) {
        if (qrMask[m][i][j] != 2 && qrMask[m][i][j] == qrMask[m][i + 1][j] && qrMask[m][i][j] == qrMask[m][i][j + 1] && qrMask[m][i][j] == qrMask[m][i + 1][j + 1]) {
          penalty += 3;
        }
      }
    }

    // condition 3
    const badPattern = [[1,0,1,1,1,0,1,0,0,0,0],[0,0,0,0,1,0,1,1,1,0,1]];
    for (let d = 0; d < 2; d ++) {
      for (let i = 0; i < qrSize; i ++) {
        for (let j = 0; j < qrSize - 10; j ++) {
          let x;
          let y;
          let isPattern = [true, true];
          for (let p = 0; p < 2; p ++) {
            for (let k = 0; k < 11; k ++) {
              if (d == 0) {
                x = j + k;
                y = i;
              }
              else {
                x = i;
                y = j + k;
              }
              if (qrMask[m][y][x] != badPattern[p][k]) {
                isPattern[p] = false;
              }
            }
            if (isPattern[p]) {
              penalty += 40;
            }
          }
        }
      }
    }

    // condition 4
    let darkBits = 0;
    for (let i = 0; i < qrSize; i ++) {
      for (let j = 0; j < qrSize; j ++) {
        if (qrMask[m][i][j] == 1) {
          darkBits ++;
        }
      }
    }
    let pDark = Math.round(darkBits / (qrSize * qrSize) * 100);
    let pTest = [];
    for (let d = 0; d < 2; d ++) {
      pTest.push(Math.abs(Math.floor(pDark / 5) + d - 10) * 10);
    }
    penalty += Math.min(pTest[0], pTest[1]);

    maskScore.push(penalty);
  }

  // select best mask
  let minPenalty = Number.MAX_SAFE_INTEGER;
  let bestMask = -1;
  for (let i = 0; i < 8; i ++) {
    if (maskScore[i] < minPenalty) {
      minPenalty = maskScore[i];
      bestMask = i;
    }
  }
  qrGrid = qrMask[bestMask];

  document.getElementById('info-version').innerHTML = version + 1;
  document.getElementById('info-mask').innerHTML = bestMask;

  // create format info
  let format = padZeroes(['m', 'l', 'h', 'q'].indexOf(correctionLevel).toString(2), 2) + padZeroes(bestMask.toString(2), 3);
  let formatCorr = removeZeroes(padZeroes(format, 15, 'r'));

  while (formatCorr.length > 10) {
    let formatGen = padZeroes('10100110111', formatCorr.length, 'r');
    formatCorr = removeZeroes((parseInt(formatCorr, 2) ^ parseInt(formatGen, 2)).toString(2));
  }
  formatCorr = padZeroes(formatCorr, 10);

  format = padZeroes((parseInt(format + formatCorr, 2) ^ parseInt('101010000010010', 2)).toString(2), 15);

  // fill reserved info
  dPointer = [0, 0];
  for (let i = 0; i < qrSize; i ++) {
    if ((i < 8 || i > qrSize - 9) && i != 6) {
      qrGrid[8][i] = Number(format.charAt(dPointer[0]));
      dPointer[0] ++;
    }
    if ((i < 7 || i > qrSize - 10) && i != qrSize - 7) {
      qrGrid[qrSize - 1 - i][8] = Number(format.charAt(dPointer[1]));
      dPointer[1] ++;
    }
  }

  if (version > 5) {
    // create version info
    let verInfo = padZeroes((version + 1).toString(2), 6);
    let verInfoCorr = removeZeroes(padZeroes(verInfo, 18, 'r'));

    while (verInfoCorr.length > 12) {
      let verGen = padZeroes('1111100100101', verInfoCorr.length, 'r');
      verInfoCorr = removeZeroes((parseInt(verInfoCorr, 2) ^ parseInt(verGen, 2)).toString(2));
    }
    verInfoCorr = padZeroes(verInfoCorr, 12);

    verInfo = verInfo + verInfoCorr;

    // fill version info
    for (let i = 0; i < 6; i ++) {
      for (let j = 0; j < 3; j ++) {
        qrGrid[qrSize - 9 - j][5 - i] = verInfo.charAt(i * 3 + j);
        qrGrid[5 - i][qrSize - 9 - j] = verInfo.charAt(i * 3 + j);
      }
    }
  }

  drawQR();
  refreshSettings();
}
// document.querySelector('#generate').addEventListener('click', generateQR);
document.querySelectorAll('#config-cards input').forEach((el) => {
  el.addEventListener('input', generateQR);
});
document.querySelectorAll('#config-cards textarea').forEach((el) => {
  el.addEventListener('input', generateQR);
});
document.querySelectorAll('#config-cards select').forEach((el) => {
  el.addEventListener('input', generateQR);
});
document.querySelectorAll('#config-cards button').forEach((el) => {
  el.addEventListener('click', generateQR);
});

let allFonts = [];
initialiseColours();
initialiseFonts();
refreshSettings();

// drawQR();

function drawSquircle(ctx, x, y, w, h, r, acw = false, omit = '') {
  const start = [x - w / 2, y];
  // const points = [
  //   [x, y],
  //   [x + w / 2, y],
  //   [x + w, y],
  //   [x + w, y + h / 2],
  //   [x + w, y + h],
  //   [x + w / 2, y + h],
  //   [x, y + h]
  // ];

  const points = [
    [x - w / 2, y - h / 2],
    [x, y - h / 2],
    [x + w / 2, y - h / 2],
    [x + w / 2, y],
    [x + w / 2, y + h / 2],
    [x, y + h / 2],
    [x - w / 2, y + h / 2]
  ];

  const sides = ['nw','n','ne','e','es','s','sw'];

  const dir = acw ? -1 : 1;
  let indexes = [0, points.length - 1];
  if (acw) {
    indexes.reverse();
  }
  
  ctx.moveTo(start[0], start[1]);
  
  for (let i = indexes[0]; (i - indexes[1]) * dir <= 0; i += 2 * dir) {
    let from = points[i];
    let to = (i == indexes[1]) ? start : points[i + dir];
    
    let thisR = r;
    for (let j = 0; j < omit.length; j ++) {
      if (sides[i].indexOf(omit.charAt(j)) > -1) { thisR = 0; }
    }

    ctx.arcTo(from[0], from[1], to[0], to[1], thisR);
  }
}

const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;

function makeGradient(el, ctx, x, y, w, h, anchor = 'c') {
  const colours = document.querySelectorAll(`#${el}-colours > li`);
  const type = document.getElementById(`${el}-gradient-type`).value;
  
  if (type == 'single') {
    return `${colours[0].querySelector('input[type="color"]').value}`;
  }

  const a = document.getElementById(`${el}-gradient-angle`).value;
  
  switch (anchor) {
    case 'nw':
      x += w / 2;
      y += h / 2;
      break;
    default:
      break;
  }

  let gradient;
  switch (type) {
    case 'linear':
      let dx, dy, t, r;
      let dir = (a == 0) ? 0 : Math.abs(a) / a; // >0: CW, <0: ACW
      if (Math.abs(a) <= 45) {
        t = Math.abs(a * TO_RAD);
        r = h / 2 * 1 / Math.cos(t) + (w / 2 - h / 2 * Math.tan(t)) * Math.sin(t);
        dx = dir * r * Math.sin(t);
        dy = -r * Math.cos(t);
      }
      else if (Math.abs(a) <= 135) {
        t = (Math.abs(Math.abs(a) - 90)) * TO_RAD;
        r = w / 2 * 1 / Math.cos(t) + (h / 2 - w / 2 * Math.tan(t)) * Math.sin(t);
        dx = dir * r * Math.cos(t);
        dy = ((Math.abs(a) - 90) > 0 ? 1 : -1 ) * r * Math.sin(t);
      }
      else { // |a| <= 180
        t = (180 - Math.abs(a)) * TO_RAD;
        r = h / 2 * 1 / Math.cos(t) + (w / 2 - h / 2 * Math.tan(t)) * Math.sin(t);
        dx = dir * r * Math.sin(t);
        dy = r * Math.cos(t);
      }
      gradient = ctx.createLinearGradient(x + dx, y + dy, x - dx, y - dy);
      break;
    case 'radial':
      let rMax = Math.sqrt(Math.pow(h / 2, 2) + Math.pow(w / 2, 2));
      gradient = ctx.createRadialGradient(x, y, 0, x, y, rMax);
      break;
    case 'conic':
      gradient = ctx.createConicGradient((a - 90) * TO_RAD, x, y);
      break;
    default:
      break;
  }

  const evenSpacing = document.getElementById(`${el}-gradient-spacing`).checked;

  for (let i = 0; i < colours.length; i ++) {
    gradient.addColorStop((evenSpacing && colours.length > 1) ? i / (colours.length - 1) : colours[i].querySelector('input[type="text"]').value / 100, colours[i].querySelector('input[type="color"]').value);
  }

  return gradient;
}

function getLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i ++) {
    let word = words[i];
    let width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    }
    else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function getLineHeight(line, lineMetrics, totalLines, leading = 1) {
  let above = lineMetrics.fontBoundingBoxAscent;
  let below = lineMetrics.fontBoundingBoxAscent * (leading - 1);

  switch (line) {
    case 0:
      if (totalLines < 2) {
        above = lineMetrics.actualBoundingBoxAscent;
        below = lineMetrics.actualBoundingBoxDescent;
      }
      break;
    case totalLines - 1:
      below = lineMetrics.fontBoundingBoxDescent;
      break;
    default:
      break;
  }
  return above + below;
}

function measureTextBlock(ctx, text, maxWidth, leading = 1) {
  const lines = getLines(ctx, text, maxWidth);

  let textBlockWidth = 0;
  let textBlockHeight = 0;
  for (let i = 0; i < lines.length; i ++) {
    let lineMetrics = ctx.measureText(lines[i]);
    if (lineMetrics.width > textBlockWidth) {
      textBlockWidth = lineMetrics.width;
    }

    let lineHeight = getLineHeight(i, lineMetrics, lines.length, leading);
    textBlockHeight += lineHeight;
  }

  return { 'width': textBlockWidth, 'height': textBlockHeight };
}

function drawTextBlock(ctx, text, maxWidth, leading, stroke = false) {
  const lines = getLines(ctx, text, maxWidth);
  const textBlockMetrics = measureTextBlock(ctx, text, maxWidth, leading);

  let totalLineHeight = 0;
  for (let i = 0; i < lines.length; i ++) {
    let lineMetrics = ctx.measureText(lines[i]);
    let above = (i == 0 && lines.length == 1) ? lineMetrics.actualBoundingBoxAscent : lineMetrics.fontBoundingBoxAscent;
    if (stroke){
      ctx.strokeText(lines[i], -lineMetrics.width / 2, -textBlockMetrics.height / 2 + above + totalLineHeight);
    }
    else {
      ctx.fillText(lines[i], -lineMetrics.width / 2, -textBlockMetrics.height / 2 + above + totalLineHeight);
    }
    totalLineHeight += getLineHeight(i, lineMetrics, lines.length, leading);
  }
}

function drawQR() {
  const qrCanvas = document.getElementById('qr-canvas');
  const iconFillCanvas = document.getElementById('icon-fill-canvas');
  const iconStrokeCanvas = document.getElementById('icon-stroke-canvas');
  const textFillCanvas = document.getElementById('text-fill-canvas');
  const textStrokeCanvas = document.getElementById('text-stroke-canvas');
  
  if (!qrCanvas.getContext) { // if canvas unsupported
    return;
  }

  // SETTINGS
  const canvasWidth = document.getElementById('file-width').value * (qrSize + 8) * (1 + 2 * document.getElementById('frame-thickness').value / 100);

  qrCanvas.setAttribute('width', canvasWidth);
  qrCanvas.setAttribute('height', canvasWidth); // temp, just to get font measurements
  const ctx = qrCanvas.getContext('2d');

  // frame
  const frameThickness = document.getElementById('frame-thickness').value / 100 * canvasWidth;
  const frameRadius = document.getElementById('frame-radius').value / 100 * canvasWidth;

  // grid
  const gridWidth = (canvasWidth - 2 * frameThickness) * qrSize / (qrSize + 8);
  const dotWidth = gridWidth / qrSize;
  const dotRadius = document.getElementById('dot-radius').value / 100 * dotWidth;
  const dotPadding = document.getElementById('dot-padding').value / 100 * dotWidth;
  const connectDots = document.getElementById('connect-dots').checked;

  // icon
  iconFillCanvas.setAttribute('width', gridWidth);
  iconStrokeCanvas.setAttribute('width', gridWidth);
  const iconFillCtx = iconFillCanvas.getContext('2d');
  const iconStrokeCtx = iconStrokeCanvas.getContext('2d');

  const iconPack = document.getElementById('icon-pack').value;
  const iconName = document.getElementById('icon-name').value;
  const iconArea = Number(document.getElementById('icon-area').value);
  const iconSize = document.getElementById('icon-size').value / 100 * iconArea * dotWidth;
  const iconStrokeThickness = document.getElementById('icon-stroke-thickness').value / 100 * iconSize;

  const iconStyle = `${iconSize}px 'fa-${iconPack}'`;

  // label
  textFillCanvas.setAttribute('width', canvasWidth);
  textStrokeCanvas.setAttribute('width', canvasWidth);
  const textFillCtx = textFillCanvas.getContext('2d');
  const textStrokeCtx = textStrokeCanvas.getContext('2d');

  const fontFamily = (document.getElementById('label-font-family').value) != '' ? document.getElementById('label-font-family').value : 'Ubuntu';
  const fontSize = document.getElementById('label-font-size').value / 100 * canvasWidth;
  const fontWeight = document.getElementById('label-font-weight').value;
  const fontStyle = document.getElementById('label-font-style').value;
  const labelLeading = document.getElementById('label-leading').value;
  const labelStrokeThickness = document.getElementById('label-stroke-thickness').value / 100 * fontSize;
  const labelBorderThickness = document.getElementById('label-border-thickness').value / 100 * canvasWidth;
  const labelHorizontalPadding = document.getElementById('label-horizontal-padding').value / 100 * canvasWidth;

  const textStyle = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  const text = document.getElementById('label-text').value;
  textFillCtx.font = textStyle;
  const textMetrics = measureTextBlock(textFillCtx, text, canvasWidth - 2 * labelBorderThickness - 2 * labelHorizontalPadding, labelLeading);
  const textHeight = textMetrics.height;

  const labelVerticalPadding = (text != '') ? document.getElementById('label-vertical-padding').value / 100 * canvasWidth : 0;
  
  const labelPosition = document.getElementById('label-position').value;
  const labelConnection = document.getElementById('label-connection').value;

  const frameCorrection = ['separator', 'flat', 'continuous'].indexOf(labelConnection) > -1 ? -frameThickness : 0;
  const labelCorrection = ['separator', 'flat', 'continuous'].indexOf(labelConnection) > -1 ? -labelBorderThickness : 0;

  const frameOmissions = ['separator', 'flat', 'continuous'].indexOf(labelConnection) > -1 ? (labelPosition == 'above' ? 'n' : 's') : '';
  const innerOmissions = ['flat', 'continuous'].indexOf(labelConnection) > -1 ? (labelPosition == 'above' ? 'n' : 's') : '';
  const labelBorderOmissions = ['separator', 'flat', 'continuous'].indexOf(labelConnection) > -1 ? (labelPosition == 'above' ? 's' : 'n') : '';
  const labelInnerOmissions = ['flat', 'continuous'].indexOf(labelConnection) > -1 ? (labelPosition == 'above' ? 's' : 'n') : '';

  const labelHeight = 2 * labelBorderThickness + (labelConnection == 'continuous' ? 1 : 2) * labelVerticalPadding + textHeight;
  const labelBorderRadius = Math.min(document.getElementById('label-radius').value / 100 * canvasWidth, labelHeight / 2);
  // const labelGap = document.getElementById('label-gap').value / 100 * canvasWidth - (labelConnection != 'disconnected' ? Math.min(labelBorderThickness, frameThickness) / 2 : 0);
  const labelGap = document.getElementById('label-gap').value / 100 * canvasWidth;

  // initialise
  const canvasHeight = canvasWidth + labelGap + labelHeight + labelCorrection + frameCorrection;
  const dir = (labelPosition == 'above' ? -1 : 1);

  qrCanvas.setAttribute('height', canvasHeight);
  iconFillCanvas.setAttribute('height', gridWidth);
  iconStrokeCanvas.setAttribute('height', gridWidth);
  textFillCanvas.setAttribute('height', labelHeight);
  textStrokeCanvas.setAttribute('height', labelHeight);
  
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  iconFillCtx.clearRect(0, 0, gridWidth, gridWidth);
  iconStrokeCtx.clearRect(0, 0, gridWidth, gridWidth);
  textFillCtx.clearRect(0, 0, canvasWidth, labelHeight);
  textStrokeCtx.clearRect(0, 0, canvasWidth, labelHeight);

  if (labelPosition == 'above') {
    ctx.translate(0, canvasHeight);
  }
  
  ctx.translate(canvasWidth / 2, dir * canvasWidth / 2);
  iconFillCtx.translate(gridWidth / 2, gridWidth / 2);
  iconStrokeCtx.translate(gridWidth / 2, gridWidth / 2);
  textFillCtx.translate(canvasWidth / 2, labelHeight / 2);
  textStrokeCtx.translate(canvasWidth / 2, labelHeight / 2);

  // COLOURS
  const frameGradient = makeGradient('frame', ctx, 0, dir * frameCorrection / 2 + (labelConnection != 'disconnected' ? dir * labelGap / 4 : 0), canvasWidth, canvasWidth + frameCorrection + (labelConnection != 'disconnected' ? labelGap / 2 : 0));

  const innerGradient = makeGradient('grid-background', ctx, 0, labelConnection == 'continuous' ? dir * labelGap / 4 : 0, canvasWidth - 2 * frameThickness, canvasWidth - 2 * frameThickness + (labelConnection == 'continuous' ? labelGap / 2: 0));
  const dotsGradient = makeGradient('grid-foreground', ctx, 0, 0, gridWidth, gridWidth, 'nw');
  const outerEyeGradient = document.getElementById('eyes-inherit-grid-colours').checked ? dotsGradient : makeGradient('eyes-outer', ctx, 0, 0, gridWidth, gridWidth, 'nw');
  const innerEyeGradient = document.getElementById('eyes-inherit-grid-colours').checked ? dotsGradient : makeGradient('eyes-inner', ctx, 0, 0, gridWidth, gridWidth, 'nw');

  const iconFillGradient = document.getElementById('icon-inherit-grid-colours').checked ? dotsGradient : makeGradient('icon-fill', iconFillCtx, 0, 0, gridWidth, gridWidth, 'nw');
  const iconStrokeGradient = document.getElementById('icon-inherit-grid-colours').checked ? frameGradient : makeGradient('icon-stroke', iconStrokeCtx, 0, 0, gridWidth, gridWidth, 'nw');

  const labelFillGradient = makeGradient('label-fill', textFillCtx, 0, 0, canvasWidth - 2 * labelBorderThickness, labelHeight - 2 * labelBorderThickness, 'nw');
  const labelStrokeGradient = makeGradient('label-stroke', textStrokeCtx, 0, 0, canvasWidth - 2 * labelBorderThickness, labelHeight - 2 * labelBorderThickness, 'nw');
  const labelBorderGradient = makeGradient('label-border', ctx, 0, -dir * labelCorrection / 2 + (labelConnection != 'disconnected' ? dir * -labelGap / 4 : 0), canvasWidth, labelHeight + labelCorrection + (labelConnection != 'disconnected' ? labelGap / 2 : 0));
  const labelInnerGradient = makeGradient('label-background', ctx, 0, labelConnection == 'continuous' ? dir * -labelGap / 4 : 0, canvasWidth - 2 * labelBorderThickness, labelHeight - 2 * labelBorderThickness + (labelConnection == 'continuous' ? labelGap / 2 : 0));

  // FRAME
  // fill
  ctx.fillStyle = frameGradient;
  ctx.beginPath();
  drawSquircle(ctx, 0, dir * (frameCorrection / 2 + (frameCorrection != 0 ? labelGap / 2 : 0) / 2), canvasWidth, canvasWidth + frameCorrection + (frameCorrection != 0 ? labelGap / 2 : 0), frameRadius, false, frameOmissions);
  ctx.closePath();
  ctx.fill();

  // INNER
  // fill
  ctx.beginPath();
  ctx.fillStyle = innerGradient;
  drawSquircle(ctx, 0, dir * (labelConnection == 'continuous' ? labelGap / 2 : 0) / 2, canvasWidth - 2 * frameThickness, canvasWidth - 2 * frameThickness + (labelConnection == 'continuous' ? labelGap / 2 : 0), Math.max(0, frameRadius - frameThickness), false, innerOmissions);
  ctx.closePath();
  ctx.fill();

  // GRID
  ctx.save();
  ctx.translate(-gridWidth / 2, -gridWidth / 2);

  // dots
  ctx.save();
  ctx.beginPath();

  for (let i = 0; i < qrSize; i ++) {
    for (let j = 0; j < qrSize; j ++) {
      if (qrGrid[i][j] != 1) { continue; }

      let inEye = (i < 7 || i > qrSize - 8) && (j < 7 || j > qrSize - 8) && !(i > qrSize - 8 && j > qrSize - 8);
      if (inEye) {
        continue;
      }

      let inIconArea = (i >= (qrSize - iconArea) / 2 && i < (qrSize - iconArea) / 2 + iconArea && j >= (qrSize - iconArea) / 2 && j < (qrSize - iconArea) / 2 + iconArea);
      if (inIconArea && iconName != '') { continue; }

      let neighbours = '';
      if (i > 0 && qrGrid[i - 1][j] == 1) { neighbours += 'n'; }
      if (j < qrSize - 1 && qrGrid[i][j + 1] == 1) { neighbours += 'e'; }
      if (i < qrSize - 1 && qrGrid[i + 1][j] == 1) { neighbours += 's'; }
      if (j > 0 && qrGrid[i][j - 1] == 1) { neighbours += 'w'; }

      drawSquircle(ctx, (j + 0.5) * dotWidth, (i + 0.5) * dotWidth, dotWidth - 2 * dotPadding, dotWidth - 2 * dotPadding, Math.max(0, dotRadius - dotPadding), false, connectDots? neighbours : '');
    }
  }

  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = dotsGradient;
  ctx.fillRect(0, 0, gridWidth, gridWidth);

  ctx.restore(); // exit dots

  // outer eye
  ctx.save();
  ctx.beginPath();

  for (let i = 0; i < qrSize; i ++) {
    for (let j = 0; j < qrSize; j ++) {
      if (qrGrid[i][j] != 1) { continue; }

      let inEye = (i < 7 || i > qrSize - 8) && (j < 7 || j > qrSize - 8) && !(i > qrSize - 8 && j > qrSize - 8);
      let inOuterEye = inEye && ((i == 0 || i == 6 || i == qrSize - 7 || i == qrSize - 1) || (j == 0 || j == 6 || j == qrSize - 7 || j == qrSize - 1));

      if (!inOuterEye) {
        continue;
      }

      let neighbours = '';
      if (i > 0 && qrGrid[i - 1][j] == 1) { neighbours += 'n'; }
      if (j < qrSize - 1 && qrGrid[i][j + 1] == 1) { neighbours += 'e'; }
      if (i < qrSize - 1 && qrGrid[i + 1][j] == 1) { neighbours += 's'; }
      if (j > 0 && qrGrid[i][j - 1] == 1) { neighbours += 'w'; }

      drawSquircle(ctx, (j + 0.5) * dotWidth, (i + 0.5) * dotWidth, dotWidth, dotWidth, dotRadius, false, neighbours);
    }
  }

  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = outerEyeGradient;
  ctx.fillRect(0, 0, gridWidth, gridWidth);

  ctx.restore(); // exit outer eye

  // inner eye
  ctx.save();
  ctx.beginPath();

  for (let i = 0; i < qrSize; i ++) {
    for (let j = 0; j < qrSize; j ++) {
      if (qrGrid[i][j] != 1) { continue; }

      let inEye = (i < 7 || i > qrSize - 8) && (j < 7 || j > qrSize - 8) && !(i > qrSize - 8 && j > qrSize - 8);
      let inOuterEye = inEye && ((i == 0 || i == 6 || i == qrSize - 7 || i == qrSize - 1) || (j == 0 || j == 6 || j == qrSize - 7 || j == qrSize - 1));

      if (!inEye || inOuterEye) {
        continue;
      }

      let neighbours = '';
      if (i > 0 && qrGrid[i - 1][j] == 1) { neighbours += 'n'; }
      if (j < qrSize - 1 && qrGrid[i][j + 1] == 1) { neighbours += 'e'; }
      if (i < qrSize - 1 && qrGrid[i + 1][j] == 1) { neighbours += 's'; }
      if (j > 0 && qrGrid[i][j - 1] == 1) { neighbours += 'w'; }

      drawSquircle(ctx, (j + 0.5) * dotWidth, (i + 0.5) * dotWidth, dotWidth, dotWidth, dotRadius, false, neighbours);
    }
  }

  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = innerEyeGradient;
  ctx.fillRect(0, 0, gridWidth, gridWidth);

  ctx.restore(); // exit inner eye
  ctx.restore(); // exit grid

  // ICON
  if (iconName != '' && ICON_PACKS[iconPack].indexOf('fa-' + iconName) > -1) {
    if (iconStrokeThickness > 0) {
      // stroke
      iconStrokeCtx.save();

      iconStrokeCtx.font = iconStyle;
      iconStrokeCtx.strokeStyle = 'black';
      iconStrokeCtx.lineWidth = iconStrokeThickness;
      drawTextBlock(iconStrokeCtx, `${iconName}`, iconArea * dotWidth, 1, true);
      
      iconStrokeCtx.translate(-gridWidth / 2, -gridWidth / 2);

      iconStrokeCtx.globalCompositeOperation = 'source-atop';
      iconStrokeCtx.fillStyle = iconStrokeGradient;
      iconStrokeCtx.fillRect(0, 0, gridWidth, gridWidth);

      iconStrokeCtx.restore();
    }

    // fill
    iconFillCtx.save();
    
    iconFillCtx.font = iconStyle;
    iconFillCtx.fillStyle = 'black';
    drawTextBlock(iconFillCtx, `${iconName}`, iconArea * dotWidth, 1);
    
    iconFillCtx.translate(-gridWidth / 2, -gridWidth / 2);      

    iconFillCtx.globalCompositeOperation = 'source-atop';
    iconFillCtx.fillStyle = iconFillGradient;
    iconFillCtx.fillRect(0, 0, gridWidth, gridWidth);
  
    iconFillCtx.restore();

    ctx.save();
    ctx.translate(-gridWidth / 2, -gridWidth / 2);
    ctx.drawImage(iconStrokeCanvas, 0, 0, gridWidth, gridWidth, 0, 0, gridWidth, gridWidth);
    ctx.drawImage(iconFillCanvas, 0, 0, gridWidth, gridWidth, 0, 0, gridWidth, gridWidth);
    ctx.restore();
  }

  // LABEL
  if (text != '') {
    ctx.save();
    ctx.translate(0, dir * ((canvasWidth + labelHeight) / 2 + labelGap + labelCorrection + frameCorrection - 1));
    
    if (labelBorderThickness > -1) {
      // fill border
      ctx.fillStyle = labelBorderGradient;
      ctx.beginPath();
      drawSquircle(ctx, 0, dir * (-labelCorrection / 2 - (frameCorrection != 0 ? labelGap / 2 : 0) / 2), canvasWidth, labelHeight + labelCorrection + (frameCorrection != 0 ? labelGap / 2 : 0), labelBorderRadius, false, labelBorderOmissions);
      ctx.closePath();
      ctx.fill();
    }
  
    // fill inner
    ctx.fillStyle = labelInnerGradient;
    ctx.beginPath();
    drawSquircle(ctx, 0, -dir * (labelConnection == 'continuous' ? labelGap / 2 : 0) / 2, canvasWidth - 2 * labelBorderThickness, labelHeight - 2 * labelBorderThickness + (labelConnection == 'continuous' ? labelGap / 2 : 0) + 2, Math.max(0, labelBorderRadius - labelBorderThickness), false, labelInnerOmissions);
    ctx.closePath();
    ctx.fill();
  
    if (labelStrokeThickness > 0) {
      // stroke  
      textStrokeCtx.save();

      if (labelConnection == 'continuous') {
        textStrokeCtx.translate(0, dir * -labelVerticalPadding / 2);
      }

      textStrokeCtx.strokeStyle = 'black';
      textStrokeCtx.font = textStyle;
      textStrokeCtx.lineWidth = labelStrokeThickness;
      drawTextBlock(textStrokeCtx, text, canvasWidth - 2 * labelBorderThickness - 2 * labelHorizontalPadding, labelLeading, true);

      textStrokeCtx.translate(-canvasWidth / 2 + labelBorderThickness, -labelHeight / 2 + labelBorderThickness);
      textStrokeCtx.globalCompositeOperation = 'source-atop';
      textStrokeCtx.fillStyle = labelStrokeGradient;
      textStrokeCtx.fillRect(0, 0, canvasWidth - 2 * labelBorderThickness, labelHeight - 2 * labelBorderThickness);

      textStrokeCtx.restore();
    }
  
    // fill
    textFillCtx.save();

    if (labelConnection == 'continuous') {
      textFillCtx.translate(0, dir * -labelVerticalPadding / 2);
    }
    
    textFillCtx.fillStyle = 'black';
    textFillCtx.font = textStyle;
    drawTextBlock(textFillCtx, text, canvasWidth - 2 * labelBorderThickness - 2 * labelHorizontalPadding, labelLeading);

    textFillCtx.translate(-canvasWidth / 2 + labelBorderThickness, -labelHeight / 2 + labelBorderThickness);
    textFillCtx.globalCompositeOperation = 'source-atop';
    textFillCtx.fillStyle = labelFillGradient;
    textFillCtx.fillRect(0, 0, canvasWidth - 2 * labelBorderThickness, labelHeight - 2 * labelBorderThickness);

    textFillCtx.restore();

    ctx.save();
    ctx.translate(-canvasWidth / 2, -labelHeight / 2);

    ctx.drawImage(textStrokeCanvas, 0, 0, canvasWidth, labelHeight, 0, 0, canvasWidth, labelHeight);
    ctx.drawImage(textFillCanvas, 0, 0, canvasWidth, labelHeight, 0, 0, canvasWidth, labelHeight);

    ctx.restore();
  
    ctx.restore();
  }
}
document.querySelectorAll('input, select').forEach((el) => {
  el.addEventListener('input', drawQR);
});

function refreshSettings() {
  // inherit colours
  document.querySelectorAll('[id$="-inherit-grid-colours"]').forEach((el) => {
    const self = el.id.substring(0, el.id.indexOf('-inherit-grid-colours'));
    
    if (el.checked) {
      document.querySelector(`#${self}-colour-settings`).style.display = 'none';
    }
    else {
      document.querySelector(`#${self}-colour-settings`).style.display = '';
    }
  });

  // gradient options
  document.querySelectorAll('[id$="-gradient-type"]').forEach((el) => {
    const elements = el.id.substring(0, el.id.indexOf('-gradient-type'));

    document.querySelectorAll(`#${elements}-colour-settings .for-grad`).forEach((subEl) => {
      if (subEl.classList.contains(el.value)) {
        subEl.style.display = '';
      }
      else {
        subEl.style.display = 'none';
      }
    });

    if (el.value == 'single') {
      document.querySelectorAll(`#${elements}-colours > li:not(:first-child)`).forEach((subEl) => {
        subEl.style.display = 'none';
      });
    }
    else {
      document.querySelectorAll(`#${elements}-colours > li`).forEach((subEl) => {
        subEl.style.display = '';
      });
    }
  });

  // spacing
  document.querySelectorAll(`[id$="-gradient-spacing"]`).forEach((el) => {
    const elements = el.id.substring(0, el.id.indexOf('-gradient-spacing'));

    document.querySelectorAll(`#${elements}-colour-settings input[type="text"]`).forEach((subEl) => {
      if (el.checked) {
        subEl.style.display = 'none';
      }
      else {
        subEl.style.display = '';
      }
    })
  });

  // icon area size
  document.getElementById('icon-area').setAttribute('max', `${qrSize - 18}`);
}
document.querySelectorAll('#style-cards input, #style-cards select').forEach((el) => {
  el.addEventListener('input', refreshSettings);
});
document.querySelectorAll('#style-cards button').forEach((el) => {
  el.addEventListener('click', refreshSettings);
});

document.querySelectorAll('input[type="range"]').forEach((el) => {
  if (el.getAttribute('val') == null) {
    el.setAttribute('val', el.defaultValue + el.getAttribute('unit'));
  }
  el.style.width = `calc(100% - ${(Number(el.max) + Number(el.step) + el.getAttribute('unit')).toString().replace('.', '').replace('°', '').length * 0.66}em - var(--card-gap))`;
  el.addEventListener('input', () => {
    el.setAttribute('val', el.value + el.getAttribute('unit'));
  });
});

function populateIconList() {
  const input = document.getElementById('icon-name').value;
  const iconList = ICON_PACKS[document.getElementById('icon-pack').value];
  let html = '';
  
  for (let i = 0; i < iconList.length; i ++) {
    if (iconList[i].charAt(3).toLowerCase() == input.replaceAll(' ','').charAt(0).toLowerCase()) {
      html += `<option value="${iconList[i].substring(3)}" />`;
    }
  }
  document.getElementById('icon-list').innerHTML = html;
}
document.getElementById('icon-name').addEventListener('input', populateIconList);

async function initialiseFonts() {
  await fetchFontInfo().then((fontInfo) => {
    fontInfo.items.forEach((font) => {
      allFonts.push(font.family);
    });
  });

  setLabelFont().then(drawQR);
}

function populateFontList() {
  let input = document.getElementById('label-font-family').value;
  let html = '';
  for (let i = 0; i < allFonts.length; i ++) {
    // if (allFonts[i].indexOf(input) > -1) {
    if (allFonts[i].charAt(0).toLowerCase() == input.replaceAll(' ', '').charAt(0).toLowerCase()) {
      html += `<option value="${allFonts[i]}" />`;
    }
  }
  document.getElementById('font-families').innerHTML = html;
}

async function setLabelFont() {
  document.head.querySelectorAll('link.gFonts').forEach((el) => {
    document.head.removeChild(el);
    el.remove();
  });

  const labelFont = document.getElementById('label-font-family').value;

  await fetchFontInfo(labelFont).then((fontInfo) => {
    if (fontInfo != undefined) {
      const font = fontInfo.items[0];
      const weights = font.variants;
      const axes = font.axes;
  
      try {
        let tail = ':wght@';
        let thin = '';
        let thick = '';
        let weightCount = 0;

        if (axes != null) { // variable fonts
          for (let i = 0; i < axes.length; i ++) {
            if (axes[i].tag == 'wght') {
              thin = axes[i].start;
              thick = axes[i].end;
              tail += `${thin}..${thick}`;
            }
          }
          document.getElementById('label-font-weight').step = '10';
        }
        else {
          for (let i = 0; i < weights.length; i ++) {
            let thisWeight = (weights[i] == 'regular') ? '400' : weights[i];
            if (thisWeight.length == 3) {
              if (thin == '') { thin = thisWeight; }
              thick = thisWeight;
              if (weightCount != 0) { tail += ';'; }
              tail += thisWeight;
              weightCount ++;
            }
          }
          if (weightCount == 0) {
            tail = '';
          }

          document.getElementById('label-font-weight').step = '100';
        }
        document.getElementById('label-font-weight').min = thin;
        document.getElementById('label-font-weight').max = thick;
        
        const fontSrc = `https://fonts.googleapis.com/css2?family=${labelFont.replace(/ /g, '+')}${tail}&display=swap`;
        const fontLink = document.createElement('link');
        fontLink.classList.add('gFonts');
        fontLink.rel = 'stylesheet', fontLink.href = fontSrc;
        document.head.appendChild(fontLink);
      }
      catch (e) {
        document.head.querySelectorAll('link.gFonts').forEach((el) => {
          document.head.removeChild(el);
          el.remove();
        });
        labelFont = 'Ubuntu';
      }
    }
  });
}
document.getElementById('label-font-family').addEventListener('input', () => {
  populateFontList();
  setLabelFont();
});

async function fetchFontInfo(fontFamily = null) {
  let query = '';
  if (fontFamily != null) {
    if (allFonts.includes(fontFamily)) {
      query = `family=${fontFamily}&capability=VF`;
    }
    else {
      return undefined;
    }
  }

  const req = new Request(`https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyCS_HKTWqsYoHY3okRUhve3sgyIXn56Wss&${query}`);
  
  try {
    const res = await fetch(req);
    if (res.ok && res.status !== 204) {
      return res.json();
    }
    if (res.ok && res.status === 204) {
      return Promise.resolve();
    }
    // return Promise.reject(res);
  }
  catch (e) {
    // return Promise.reject(e);
  }
}

function addColourButtonEvents() {
  document.querySelectorAll('ul[id$="-colours"] button.remove').forEach((el) => {
    el.addEventListener('click', removeColour);
  });
  document.querySelectorAll('button.up').forEach((el) => {
    el.addEventListener('click', moveColour);
  });
  document.querySelectorAll('button.down').forEach((el) => {
    el.addEventListener('click', moveColour);
  });
  document.querySelectorAll('button.copy').forEach((el) => {
    el.addEventListener('click', copyColour);
  });
  document.querySelectorAll('button.paste').forEach((el) => {
    el.addEventListener('click', pasteColour);
  });
  document.querySelectorAll('[id$="-colours"] input').forEach((el) => {
    el.addEventListener('input', drawQR);
  });
}

function initialiseColours() {
  document.querySelectorAll('[id$="-colours"]').forEach((el) => {
    el.innerHTML = NEW_COLOUR_HTML;
    el.querySelector('input[type="text"]').value = '0';
    el.querySelector('input[type="color"]').value = el.getAttribute('initial');
  });

  addColourButtonEvents();
}

function makeNewColour(id) {
  const colourList = document.getElementById(`${id}-colours`);

  colourList.insertAdjacentHTML('beforeend', NEW_COLOUR_HTML);

  addColourButtonEvents();
  refreshSettings();
  drawQR();
}
document.querySelectorAll('[id$="-gradient-add"]').forEach((el) => {
  el.addEventListener('click', () => {
    makeNewColour(el.id.substring(0, el.id.indexOf('-gradient-add')));
  });
});

function moveColour(e) {
  const colour = this.parentElement.parentElement.parentElement;
  const colours = colour.parentElement;
  const rel = (this.classList.contains('up')) ? -1 : 1;
  
  for (let i = 0; i < colours.childElementCount; i ++) {
    if (colours.children.item(i) == colour) {
      if (i + rel < 0 || i + rel >= colours.childElementCount) { return; }
      if (rel < 0) { // moving up
        colours.insertBefore(colours.children.item(i), colours.children.item(i + rel));
      }
      else { // moving down
        colours.insertBefore(colours.children.item(i + rel), colours.children.item(i));
      }
      drawQR();
      return;
    }
  }
}

function removeColour(e) {
  const colourList = this.parentElement.parentElement;

  if (colourList.childElementCount > 1) {
    this.parentElement.remove();
  }

  drawQR();
}

function copyColour(e) {
  const colour = this.parentElement.parentElement.parentElement.querySelector('input[type="color"]');
  navigator.clipboard.writeText(colour.value);
}

async function pasteColour(e) {
  const colour = this.parentElement.parentElement.parentElement.querySelector('input[type="color"]');
  let content = await navigator.clipboard.readText();
  colour.value = content;
  
  refreshSettings();
  drawQR();
}

function saveImage() {
  const link = document.createElement('a');
  link.download = 'QR Code.png';
  link.href = document.getElementById('qr-canvas').toDataURL();
  link.click();
}
document.getElementById('save-image').addEventListener('click', saveImage);

function focusCards(e) {
  document.querySelectorAll('.card').forEach((card) => {
    const bound = card.getBoundingClientRect();
    if (bound.y <= window.innerHeight * 3 / 5 && bound.y + bound.height >= window.innerHeight * 3 / 10) {
      card.classList.add('make-visible');
    }
    else {
      card.classList.remove('make-visible');
    }
  });
}
window.addEventListener('scroll', focusCards);
window.addEventListener('DOMContentLoaded', focusCards);