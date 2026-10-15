/* Retired guest entry; ordinary member pages stay untouched. */
(()=>{'use strict';if(window.dmDiscoveryContext?.member)return;const p=new URLSearchParams(location.search);if(p.has('misafir')||p.has('kesif'))location.replace('./?giris=1');})();
