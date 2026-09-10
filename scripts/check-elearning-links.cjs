const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/data/eLearningData.ts', 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject, URL });
const { getGoogleDrivePreviewUrl: preview, getGoogleDriveDownloadUrl: download, extractGoogleDriveFileId: id } = exportsObject;
for (const link of ['https://drive.google.com/file/d/book_123-abc/view?usp=sharing', 'https://drive.google.com/open?id=book_123-abc', 'https://drive.google.com/uc?id=book_123-abc&export=download']) {
  assert.equal(id(link), 'book_123-abc');
  assert.equal(preview(link), 'https://drive.google.com/file/d/book_123-abc/preview');
  const target = new URL(download(link));
  assert.equal(target.searchParams.get('export'), 'download');
  assert.equal(target.searchParams.get('id'), 'book_123-abc');
}
for (const link of ['', 'not a URL', 'https://evilgoogle.com/open?id=book', 'https://example.com/file/d/book/view', 'javascript:alert(1)', 'https://drive.google.com/open?id=bad%2Fid', 'https://drive.google.com/drive/folders/folder']) {
  assert.equal(preview(link), '');
  assert.equal(download(link), '');
}
const protectedLink = 'https://drive.google.com/file/d/book/view?resourcekey=0-shared-key';
assert.equal(new URL(preview(protectedLink)).searchParams.get('resourcekey'), '0-shared-key');
assert.equal(new URL(download(protectedLink)).searchParams.get('resourcekey'), '0-shared-key');
console.log('PASS: preview/download links, missing files, invalid hosts, and shared resource keys');
