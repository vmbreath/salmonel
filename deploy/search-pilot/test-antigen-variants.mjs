import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
const source=fs.readFileSync(root+'/frontend-v2/app.js','utf8');
const fn=source.slice(source.indexOf('function splitVariant('),source.indexOf('function buildVariants('));
const split=vm.runInNewContext('('+fn.trim()+')');
function legacy(elem){
 let result;
 if(elem[0]==='['||elem[0]==='{'||elem[0]==='('){
  result=(elem[elem.length-1]===']'||elem[elem.length-1]==='}'||elem[elem.length-1]===')')?elem.slice(1,-1):elem.slice(1);
 }else if(elem[elem.length-1]===']'||elem[elem.length-1]==='}'||elem[elem.length-1]===')')result=elem.slice(0,-1);
 else result=elem;
 return result.includes(',')?result.split(','):[result];
}
const rows=JSON.parse(fs.readFileSync(root+'/app/data.json','utf8'));
let count=0;
for(const row of rows)for(const antigenArray of row.slice(2))for(const value of antigenArray){
 assert.deepEqual(Array.from(split(value)),legacy(value));count++;
}
console.log(JSON.stringify({seedRows:rows.length,antigenValuesChecked:count,variantExtraction:'identical_to_legacy'}));
