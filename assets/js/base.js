function hasClass(s,a){return s.classList?s.classList.contains(a):!!s.cl.match(new RegExp("(\\s|^)"+a+"(\\s|$)"))}function addClass(s,a){s.classList?s.classList.add(a):hasClass(s,a)||(s.cl+=" "+a)}function removeClass(s,a){if(s.classList)s.classList.remove(a);else if(hasClass(s,a)){var l=new RegExp("(\\s|^)"+a+"(\\s|$)");s.cl=s.cl.replace(l," ")}}

$('document').ready(function(){
    $('.navicon i').click(function(e) {
        e.preventDefault();

        $('.navbar').slideToggle('fast');
    });
});