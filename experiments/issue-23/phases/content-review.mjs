// Conservative content hints, independent of Serene construction provenance.
// Operates on reviewed SQL text; not a parser, safety proof, or execution rewrite.
export function contentReview(text) {
 const signals=[];
 for(const match of text.matchAll(/\bCREATE\s+(?:(TEMPORARY|TEMP|UNLOGGED)\s+)?TABLE\b/gi)){
  const temporary=/^TEMP/i.test(match[1]??'');
  signals.push({code:temporary?'SQL_CREATE_TEMP':'SQL_CREATE_TABLE',
   category:temporary?'temporary-state':'persistent-schema',priority:temporary?'advisory':'elevated'});
 }
 // Only the exact lifecycle phrase is discounted. A separate DROP is retained,
 // including mixed TEMP + permanent DDL. Strings/comments may produce hints.
 const remainder=text.replace(/\bON\s+COMMIT\s+DROP\b/gi,'');
 if(/\bDROP\b/i.test(remainder))signals.push({code:'SQL_DROP',category:'destructive-candidate',priority:'elevated'});
 return signals;
}
