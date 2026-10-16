import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public',{recursive:true});
await copyFile('comparison-evidence.json','public/comparison.json');
