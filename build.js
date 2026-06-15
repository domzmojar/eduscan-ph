// EduScan PH — Build verification script
// Run with: node build.js
// Checks that all required PWA files are present before deploying.

const fs   = require('fs');
const path = require('path');

const REQUIRED = [
  'index.html',
  'manifest.json',
  'sw.js',
  'vercel.json',
  'icon-192-any.png',
  'icon-192-maskable.png',
  'icon-512-any.png',
  'icon-512-maskable.png',
];

const dir    = __dirname;
let   passed = true;

console.log('\n📋 EduScan PH — PWA build check\n');

REQUIRED.forEach(file => {
  const fullPath = path.join(dir, file);
  const exists   = fs.existsSync(fullPath);
  const size     = exists ? (fs.statSync(fullPath).size / 1024).toFixed(1) + ' KB' : '—';
  const icon     = exists ? '✅' : '❌';
  console.log(`  ${icon}  ${file.padEnd(28)} ${size}`);
  if (!exists) passed = false;
});

console.log('');
if (passed) {
  console.log('  ✅ All files present. Ready to deploy!\n');
  console.log('  Deploy to Vercel:  npx vercel --prod');
  console.log('  Deploy to GitHub:  git add . && git commit -m "deploy" && git push\n');
} else {
  console.log('  ❌ Some files are missing. Check above.\n');
  process.exit(1);
}
