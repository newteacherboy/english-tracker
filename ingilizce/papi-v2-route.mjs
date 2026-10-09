/* Route adapter for the new 80-chapter curriculum. Pure and side-effect-free. */
export const V2_LEVELS=Object.freeze(['A1','A2','B1','B2']);
export function getOrderedChapterIds(level){
 const i=V2_LEVELS.indexOf(level);if(i<0)throw new RangeError('Unknown CEFR level');
 return [...Array(10)].map((_,j)=>i*10+j).concat([...Array(10)].map((_,j)=>40+i*10+j));
}
export function locateChapter(chapterId){
 if(!Number.isInteger(chapterId)||chapterId<0||chapterId>79)return null;
 const levelIndex=chapterId<40?Math.floor(chapterId/10):Math.floor((chapterId-40)/10);
 const sequence=chapterId<40?chapterId%10+1:chapterId%10+11;
 return {id:chapterId,level:V2_LEVELS[levelIndex],sequence,
   source:chapterId<40?'legacy-server':'v2-preview',saveEnabled:chapterId<40};
}
export function nextChapter(chapterId){
 const c=locateChapter(chapterId);if(!c)return null;
 const ids=getOrderedChapterIds(c.level);const next=ids[c.sequence];
 if(next!==undefined)return next;
 return c.level==='B2'?null:getOrderedChapterIds(V2_LEVELS[V2_LEVELS.indexOf(c.level)+1])[0];
}
export function previewUrl(chapterId){
 const c=locateChapter(chapterId);
 if(!c||c.source!=='v2-preview')return null;
 return './papi-v2-preview.html?chapter='+encodeURIComponent(String(c.id));
}
/* Never send V2 chapter IDs to the existing API: it only understands 0..39. */
export function mayCallLegacyStoryAPI(chapterId){return Number.isInteger(chapterId)&&chapterId>=0&&chapterId<40}
