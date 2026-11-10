// The Web Worker behind sigship.dev/check/. It reads the folder or zip the visitor picked, runs every check,
// and posts the result back. It never fetches anything: the only bytes it touches are the ones it was handed.
import { contextFromEntries, scanFiles, skipped, VERSION } from './engine.js';
import { listZip, stripRoot } from './unzip.js';

const decoder = new TextDecoder();
const progress = (read) => postMessage({ type: 'progress', read });

// A directory handle from showDirectoryPicker or a drop (Chrome, Edge).
async function fromHandle(dir, prefix = '', out = []) {
  for await (const [name, handle] of dir.entries()) {
    const path = prefix + name;
    if (handle.kind === 'directory') {
      if (!skipped(path + '/')) await fromHandle(handle, path + '/', out);
    } else {
      out.push({
        path,
        size: undefined,
        async text() {
          const file = await handle.getFile();
          if (file.size > 1_000_000) return null;
          return file.text();
        },
      });
      if (out.length % 200 === 0) progress(out.length);
    }
  }
  return out;
}

// File objects with relative paths, from a webkitdirectory input or a dropped folder read on the page.
const fromFiles = (files) => files.map(({ path, file }) => ({ path, size: file.size, text: () => file.text() }));

// A zip, read with the plain inflate in unzip.js.
const fromZip = (buffer) =>
  stripRoot(listZip(new Uint8Array(buffer))).map((e) => ({ path: e.path, size: e.size, text: () => decoder.decode(e.read()) }));

onmessage = async ({ data }) => {
  try {
    let entries;
    if (data.kind === 'handle') entries = await fromHandle(data.handle);
    else if (data.kind === 'files') entries = fromFiles(data.files);
    else if (data.kind === 'zip') entries = fromZip(data.buffer);
    else throw new Error('Nothing to check');
    progress(entries.length);
    const ctx = await contextFromEntries(entries);
    const result = scanFiles(ctx);
    postMessage({ type: 'result', result, listed: entries.length, version: VERSION });
  } catch (err) {
    postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
  }
};
