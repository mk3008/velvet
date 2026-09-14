import {readFile,readdir} from 'node:fs/promises';
import {auditSource} from '@mk3008/serene/audit';
import {contentReview} from './content-review.mjs';

const report={construction:[],content:[],exceptions:[]};
for(const file of (await readdir(new URL('.',import.meta.url))).sort()){
 if(!/\.(mjs|sql)$/.test(file)||['audit.mjs','content-review.mjs'].includes(file))continue;
 const text=await readFile(new URL(file,import.meta.url),'utf8');
 if(file.endsWith('.mjs'))report.construction.push(...auditSource(text,file));
 // Conservative whole-file hint pass; literals/comments are intentionally not
 // claimed to be SQL grammar. This supplements, never removes, Serene signals.
 const signals=contentReview(text);if(signals.length)report.content.push({file,signals});
}
console.log(JSON.stringify(report,null,2));
