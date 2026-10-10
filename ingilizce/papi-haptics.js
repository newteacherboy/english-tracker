/* Optional tap haptics. iOS Safari may not expose navigator.vibrate. */
(()=>{'use strict';let last=0;
const targets='[data-answer],[data-token],[data-action="submit"],.yo-sik,.dc-quiz-opt,.ba-sik-btn,.km-sec,.bz-sec,.ds-option,.ds-token,button[data-i],button[data-choice],.game-modal-content button';
document.addEventListener('click',event=>{
 const b=event.target.closest?.(targets);if(!b||b.disabled||!b.getClientRects().length)return;
 const now=performance.now();if(now-last<85)return;last=now;
 try{if(typeof navigator.vibrate==='function')navigator.vibrate(12);}catch{}
},{capture:true,passive:true});
})();