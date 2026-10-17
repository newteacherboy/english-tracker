/* GitHub Pages cannot set frame-ancestors. Fail closed for this JS application
   inside a foreign frame while server/CDN headers remain a hosting concern. */
(()=>{try{if(window.top!==window.self){document.documentElement.style.display='none';window.addEventListener('DOMContentLoaded',()=>{document.body?.replaceChildren();},{once:true});}}catch{document.documentElement.style.display='none';}})();
