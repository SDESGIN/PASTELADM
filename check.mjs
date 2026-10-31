import fs from 'node:fs';
for(const f of ['site/index.html','site/css/estilo.css','site/js/painel.js','site/marca.jpeg','netlify/functions/api.mjs','server/api.js','server/domain.js','server/bootstrap.js'])if(!fs.existsSync(f))throw new Error('Arquivo ausente: '+f);
console.log('Site e servidor prontos para Netlify.');
