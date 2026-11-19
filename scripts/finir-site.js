// Après `expo export`, ajoute à la page les balises qui permettent d'installer
// l'app sur l'écran d'accueil. Expo ne génère pas de manifeste lui-même
// (vérifié sur SDK 58), et `app/+html.tsx` est ignoré quand la sortie web est « single ».
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const page = path.join(dist, 'index.html');
const base = (process.env.BASE_URL || '').replace(/\/$/, '');
const lien = (f) => `${base}/${f}`;

let html = fs.readFileSync(page, 'utf8');
if (html.includes('rel="manifest"')) {
  console.log('Les balises d’installation sont déjà là.');
} else {
  const balises = [
    `<link rel="manifest" href="${lien('manifest.json')}">`,
    `<link rel="apple-touch-icon" href="${lien('icone-180.png')}">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
    `<meta name="apple-mobile-web-app-title" content="Coiffures">`,
    `<meta name="mobile-web-app-capable" content="yes">`,
  ].join('\n');
  html = html.replace('</head>', `${balises}\n</head>`);
  fs.writeFileSync(page, html);
  console.log('Balises d’installation ajoutées à index.html.');
}

// Les liens directs vers un écran (par exemple /creer) passent par cette page.
fs.copyFileSync(page, path.join(dist, '404.html'));
// Empêche GitHub Pages de traiter le site comme un site Jekyll.
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('404.html et .nojekyll écrits.');
