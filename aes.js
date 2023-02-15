const { log } = require("console");
const CryptoJS = require("crypto-js");
const FileStream = require("fs");

var K = CryptoJS.enc.Hex.parse("10101110");
log(K.sigBytes);
var option = {
  mode: CryptoJS.mode.ECB,
};
log
const getArrayToWordArray = (array) => {
  let shift = 24;
  let round = 0;
  let word = 0;
  let Data = [];
  array.forEach((e) => {
    if (round < 4) {
      word |= e << shift;
      shift -= 8;
      round++;
    }
    if (round == 4) {
      Data.push(word);
      word = 0;
      round = 0;
      shift = 24;
    }
  });
  if (round !== 0) {
    for (; round < 4; round++) {
      word <<= shift;
      shift -= 8;
    }
    Data.push(word);
  }

  return CryptoJS.lib.WordArray.create(Data, Data.length * 4);
};

const getNormalByteCount = (modelArray) => {
  return (
    ((modelArray[83] << 24) |
      (modelArray[82] << 16) |
      (modelArray[81] << 8) |
      modelArray[80]) * 12
  );
};

const getZeroNormalFieldModel = (modelArray) => {
  const length = modelArray.length;
  let model = [];

  model = modelArray.map((e) => {
    return e;
  });

  
  for (let i = 84; i < length; i += 50) {
    for (let j = 0; j < 12; j++) {
      model[i + j] = 0;
    }
  }

  return model;
};

const embedDataToNormal = (modelArray, normalArray) => {
  const length = modelArray.length;
  let index = 0;
  for (let i = 84; i < length; i += 50) {
    for (let j = 0; j < 12; j++) {
      modelArray[i + j] = normalArray[index];
      index++;
    }
  }
};

const getWordArrayToArray = (wordArray) => {
  const sigBytes = wordArray.sigBytes;
  let array = [];
  wordArray.words.forEach((word) => {
    for (let shift = 24; shift >= 0; shift -= 8) {
      array.push((word >> shift) & 0b11111111);
      if (array.length == sigBytes) {
        break;
      }
    }
  });
  return array;
};

const getXor = (H, E) => {
  let length;
  let zeroArray = new Array(Math.abs(E.length - H.length)).fill(0);

  if (E.length > H.length) {
    length = E.length;
    H.push(zeroArray);
  } else {
    length = H.length;
    E.push(zeroArray);
  }

  let data = [];

  for (let i = 0; i < length; i++) {
    data[i] = H[i] ^ E[i];
  }
  return data;
};

const getNormalFieldArrayFromModel = (modelArray) => {
  const length = modelArray.length;
  let index = 0;
  let normalArray = [];

  for (let i = 84; i < length; i += 50) {
    for (let j = 0; j < 12; j++) {
      normalArray[index] = modelArray[i + j];
      index++;
    }
  }

  return normalArray;
};

const getVertexFieldArrayFromModel = (modelArray) => {
  const length = modelArray.length;
  let vertexArray = [];

  for (let i = 84; i < length; i += 50) {
    for (let j = 12; j < 48; j++) {
      vertexArray.push(modelArray[i + j]);
    }
  }
  // log("go :" +vertexArray)
  return vertexArray;
  
};


/**
 * Start of Embedding
 */
{
  const secret = FileStream.readFileSync("E:\\proposal\\1.bmp");
  var S = getArrayToWordArray(secret);
  log("Ssigbyte"+S.sigBytes);
  log("s:"+S);
  var encryption = CryptoJS.AES.encrypt(S, K, option);
  var E = getWordArrayToArray(encryption.ciphertext);
  log("Elength"+E.length);
  log("E:"+E);
  const model = FileStream.readFileSync(
    "E:\\proposal\\tri.stl"
  );
  const O = getArrayToWordArray(getVertexFieldArrayFromModel(model));

  const MAX_LENGTH = getNormalByteCount(model);

  const zeroNormalModel = getZeroNormalFieldModel(model);

  var hash = CryptoJS.SHA3(O);
  var H = getWordArrayToArray(hash);
  log("H:"+H);
  log(H.length)
  const W = getXor(H, E);
  log("W:"+W);
  log("length:"+W.length)
  log("MAXLENGTH:"+MAX_LENGTH);
  if (W.length > MAX_LENGTH) {
    log("Over max length");

    return;
  }
  
  
  embedDataToNormal(zeroNormalModel, W);
  FileStream.writeFileSync(
    "E:\\proposal\\embeded.stl",
    zeroNormalModel
  );
}
/**
 * End of Embedding
 */

/**
 * Start of extraction
 */
{
  const watermarkedModel = FileStream.readFileSync(
    "E:\proposal\\embeded.stl"
  );
  var wM = [];
  watermarkedModel.forEach((e, index) => {
    wM[index] = e;
  });

  const w = getNormalFieldArrayFromModel(wM);
  const o = getArrayToWordArray(getVertexFieldArrayFromModel(watermarkedModel));
  const h = getWordArrayToArray(CryptoJS.SHA3(o));
  const e = getArrayToWordArray(getXor(h, w));

  const dencryption = CryptoJS.AES.decrypt(
    e.toString(CryptoJS.enc.Base64),
    K,
    option
  );
  const s = getWordArrayToArray(dencryption);

  const secretLength = s[2] | (s[3] << 8);

  const secret = s.slice(0, secretLength);
  const secretBuffer = Buffer.from(secret);

  FileStream.writeFileSync(
    "E:\\proposal\\secret.bmp",
    secretBuffer
  );
}
/**
 * End of extraction
 */