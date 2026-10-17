// Pure, server-authoritative marking of the published lesson's original quiz.
// The client submits the words it chose, never a self-reported score or answer key.
const norm=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('en').replace(/[’‘]/g,"'").replace(/[.!?,;:]/g,'').replace(/\s+/g,' ').trim();
function expected(q){
 if(!q||typeof q!=='object')return null;
 const kind=['bosluk','siralama','dogruyanlis'].includes(q.tip)?q.tip:'secim';
 if(kind==='siralama')return String(q.cevap||q.parcalar?.join(' ')||'');
 if(kind==='dogruyanlis')return q.dogru===false||q.dogru==='false'?'Yanlış':'Doğru';
 const i=Number(q.dogru);
 return Array.isArray(q.secenekler)&&Number.isInteger(i)&&i>=0&&i<q.secenekler.length?String(q.secenekler[i]):null;
}
export function gradeStudyQuiz(questions,answerTexts,indices=null){
 if(!Array.isArray(questions)||!Array.isArray(answerTexts)||questions.length<2||questions.length>40)return null;
 const selected=indices===null?questions.map((_,i)=>i):indices;
 if(!Array.isArray(selected)||!selected.length||selected.length!==answerTexts.length||new Set(selected).size!==selected.length)return null;
 let correct=0;const wrongIndices=[];
 for(let i=0;i<selected.length;i++){
  const index=selected[i],answer=answerTexts[i];
  if(!Number.isInteger(index)||index<0||index>=questions.length||typeof answer!=='string'||answer.length>500||!answer.trim())return null;
  const want=expected(questions[index]);if(want===null)return null;
  if(norm(want)===norm(answer))correct++;else wrongIndices.push(index);
 }
 return {correct,total:selected.length,wrongIndices};
}
export function studyTier(correct,total,recovered=false){
 if(recovered)return correct===3&&total===3?30:0;
 if(!Number.isInteger(correct)||!Number.isInteger(total)||total<2||correct<0||correct>total)return 0;
 if(correct===total)return 100;
 if(correct>=Math.max(Math.ceil(total*.8),total-1))return 80;
 if(correct>=Math.ceil(total*2/3))return 60;
 return 0;
}
export const recoveryQuestions=wrongIndices=>Array.isArray(wrongIndices)?wrongIndices.slice(0,3):[];
