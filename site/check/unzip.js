// A small zip reader for the in-browser check. Plain JavaScript, no dependency.
// Reads stored (method 0) and deflated (method 8) entries from a zip's central directory.
// Runs in a page, in a Web Worker, or in Node (the tests zip a fixture with node:zlib and read it back here).

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

// A canonical Huffman table: for each code length, how many codes have it, and the symbols in order.
function buildHuffman(lengths) {
  const count = new Uint16Array(16);
  for (const l of lengths) count[l]++;
  count[0] = 0;
  const offsets = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offsets[i] = offsets[i - 1] + count[i - 1];
  const symbols = new Uint16Array(lengths.length);
  for (let s = 0; s < lengths.length; s++) if (lengths[s]) symbols[offsets[lengths[s]]++] = s;
  return { count, symbols };
}

class BitReader {
  constructor(bytes, pos = 0) {
    this.bytes = bytes;
    this.pos = pos;
    this.bit = 0;
    this.buf = 0;
  }
  bits(n) {
    while (this.bit < n) {
      if (this.pos >= this.bytes.length) throw new Error('Zip data ends early');
      this.buf |= this.bytes[this.pos++] << this.bit;
      this.bit += 8;
    }
    const v = this.buf & ((1 << n) - 1);
    this.buf >>>= n;
    this.bit -= n;
    return v;
  }
  symbol(h) {
    let code = 0, first = 0, index = 0;
    for (let len = 1; len < 16; len++) {
      code |= this.bits(1);
      const count = h.count[len];
      if (code - first < count) return h.symbols[index + (code - first)];
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw new Error('Bad Huffman code');
  }
  align() {
    this.buf = 0;
    this.bit = 0;
  }
}

let FIXED = null;
function fixedTables() {
  if (FIXED) return FIXED;
  const lit = new Uint8Array(288);
  lit.fill(8, 0, 144); lit.fill(9, 144, 256); lit.fill(7, 256, 280); lit.fill(8, 280, 288);
  const dist = new Uint8Array(30).fill(5);
  FIXED = { lit: buildHuffman(lit), dist: buildHuffman(dist) };
  return FIXED;
}

function dynamicTables(r) {
  const hlit = r.bits(5) + 257, hdist = r.bits(5) + 1, hclen = r.bits(4) + 4;
  const cl = new Uint8Array(19);
  for (let i = 0; i < hclen; i++) cl[CL_ORDER[i]] = r.bits(3);
  const clh = buildHuffman(cl);
  const lengths = new Uint8Array(hlit + hdist);
  for (let i = 0; i < hlit + hdist; ) {
    const sym = r.symbol(clh);
    if (sym < 16) lengths[i++] = sym;
    else if (sym === 16) { const prev = lengths[i - 1]; for (let n = 3 + r.bits(2); n; n--) lengths[i++] = prev; }
    else if (sym === 17) i += 3 + r.bits(3);
    else i += 11 + r.bits(7);
  }
  return { lit: buildHuffman(lengths.subarray(0, hlit)), dist: buildHuffman(lengths.subarray(hlit)) };
}

// Raw DEFLATE (RFC 1951). `size` is the expected output length from the zip header, used to size the buffer.
export function inflate(bytes, size) {
  let out = new Uint8Array(size > 0 ? size : Math.max(1024, bytes.length * 4));
  let n = 0;
  const grow = (need) => {
    if (n + need <= out.length) return;
    const bigger = new Uint8Array(Math.max(out.length * 2, n + need));
    bigger.set(out.subarray(0, n));
    out = bigger;
  };
  const r = new BitReader(bytes);
  let last = 0;
  while (!last) {
    last = r.bits(1);
    const type = r.bits(2);
    if (type === 0) {
      r.align();
      if (r.pos + 4 > bytes.length) throw new Error('Zip data ends early');
      const len = bytes[r.pos] | (bytes[r.pos + 1] << 8);
      const nlen = bytes[r.pos + 2] | (bytes[r.pos + 3] << 8);
      if ((len ^ 0xffff) !== nlen) throw new Error('Bad stored block');
      r.pos += 4;
      if (r.pos + len > bytes.length) throw new Error('Zip data ends early');
      grow(len);
      out.set(bytes.subarray(r.pos, r.pos + len), n);
      n += len;
      r.pos += len;
    } else if (type === 1 || type === 2) {
      const { lit, dist } = type === 1 ? fixedTables() : dynamicTables(r);
      for (;;) {
        const sym = r.symbol(lit);
        if (sym < 256) { grow(1); out[n++] = sym; }
        else if (sym === 256) break;
        else {
          const li = sym - 257;
          if (li >= 29) throw new Error('Bad length code');
          const len = LENGTH_BASE[li] + r.bits(LENGTH_EXTRA[li]);
          const di = r.symbol(dist);
          if (di >= 30) throw new Error('Bad distance code');
          const d = DIST_BASE[di] + r.bits(DIST_EXTRA[di]);
          if (d > n) throw new Error('Distance reaches before the start');
          grow(len);
          for (let i = 0; i < len; i++) { out[n] = out[n - d]; n++; }
        }
      }
    } else {
      throw new Error('Bad block type');
    }
  }
  return out.subarray(0, n);
}

const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

// Lists every entry in a zip (from the central directory) and returns { path, size, read() }.
// Folders and entries with an unsupported method are skipped. Paths are normalised to posix and never climb out.
export function listZip(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 0x05 && b[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a zip file');
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const decoder = new TextDecoder();
  const entries = [];
  for (let k = 0; k < count && p + 46 <= b.length; k++) {
    if (u32(b, p) !== 0x02014b50) break;
    const method = u16(b, p + 10), csize = u32(b, p + 20), size = u32(b, p + 24);
    const nameLen = u16(b, p + 28), extraLen = u16(b, p + 30), commentLen = u16(b, p + 32), local = u32(b, p + 42);
    const rawName = decoder.decode(b.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    const path = rawName.replace(/\\/g, '/').split('/').filter((s) => s && s !== '.' && s !== '..').join('/');
    if (!path || rawName.endsWith('/') || (method !== 0 && method !== 8)) continue;
    entries.push({
      path,
      size,
      method,
      read() {
        if (u32(b, local) !== 0x04034b50) throw new Error('Bad zip entry');
        const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
        const data = b.subarray(start, start + csize);
        return method === 0 ? data : inflate(data, size);
      },
    });
  }
  return entries;
}

// Zips made by Finder, GitHub and most tools wrap everything in one top folder. Strip it when every entry shares it.
export function stripRoot(entries) {
  const tops = new Set(entries.map((e) => e.path.split('/')[0]));
  if (tops.size !== 1 || entries.every((e) => !e.path.includes('/'))) return entries;
  return entries.map((e) => ({ ...e, path: e.path.split('/').slice(1).join('/') })).filter((e) => e.path);
}
