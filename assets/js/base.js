function hasClass(s,a){return s.classList?s.classList.contains(a):!!s.cl.match(new RegExp("(\\s|^)"+a+"(\\s|$)"))}function addClass(s,a){s.classList?s.classList.add(a):hasClass(s,a)||(s.cl+=" "+a)}function removeClass(s,a){if(s.classList)s.classList.remove(a);else if(hasClass(s,a)){var l=new RegExp("(\\s|^)"+a+"(\\s|$)");s.cl=s.cl.replace(l," ")}}

document.querySelector(".navicon i").onclick=function(e){var o=document.querySelector(".navbar");(hasClass(o,"show")?removeClass:addClass)(o,"show")};

var imglightbox = new SimpleLightbox({elements:'img.lightbox',urlAttribute:'src'});
var alightbox = new SimpleLightbox({elements:'a.lightbox'});