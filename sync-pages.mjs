import {copyFileSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
mkdirSync(join(root,'docs'),{recursive:true});
for(const file of readdirSync(join(root,'dist'),{withFileTypes:true})){
  if(file.isFile())copyFileSync(join(root,'dist',file.name),join(root,'docs',file.name));
}
writeFileSync(join(root,'docs','.nojekyll'),'');
console.log('GitHub Pages files synchronized from dist/ to docs/.');
