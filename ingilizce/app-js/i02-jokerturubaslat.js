/* Legacy game hooks: joker rights and effects were retired. */
const jk = Object.freeze({oyun:null,donuk:false,bakis:false,kalkan:false,ikinci:false,cift:false});
function jokerTuruBaslat() {}
function jokerBarCiz() {}
function jokerSoruTemizle() {}
function jokerMesaj() {}
function jokerKullan() { return false; }
function jokerKalkanTuket() { return false; }
function jokerIkinciTuket() { return false; }
function jokerCiftCarpan() { return 1; }
