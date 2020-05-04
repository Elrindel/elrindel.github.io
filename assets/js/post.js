function updateOutline() {
	var arrAllHeader = document.querySelectorAll("#markdown-container h1,#markdown-container h2,#markdown-container h3,#markdown-container h4,#markdown-container h5,#markdown-container h6");
	var arrOutline = ['<ul>'];
	var header, headerText;
	var id = 0;
	var level = 0,
		lastLevel = 1;
	var levelCount = 0;
	for (var i = 0, c = arrAllHeader.length; i < c; i++) {
		header = arrAllHeader[i];
		headerText = header.innerText;

		if(!header.getAttribute('id')){
			header.setAttribute('id', id);
		}

		level = header.tagName.match(/^h(\d)$/i)[1];
		levelCount = level - lastLevel;

		if (levelCount > 0) {
			for (var j = 0; j < levelCount; j++) {
				arrOutline.push('<ul>');
			}
		} else if (levelCount < 0) {
			levelCount *= -1;
			for (var j = 0; j < levelCount; j++) {
				arrOutline.push('</ul>');
			}
		};
		arrOutline.push('<li>');
		arrOutline.push('<a href="#' + header.getAttribute('id') + '">' + headerText + '</a>');
		arrOutline.push('</li>');
		lastLevel = level;
		id++;
	}
	arrOutline.push('</ul>')
	var outline = document.getElementById('markdown-outline');
	if(arrOutline.length > 2){
		outline.innerHTML = arrOutline.join('');
		showOutline();
	}
	else outline.style.display = 'none';
}

function showOutline() {
	var outline = document.getElementById('markdown-outline');
	var markdownContainer = document.getElementById('markdown-container');
	outline.style.display = 'block';
}

updateOutline();

var container=document.getElementById("markdown-container"),outline=document.getElementById("markdown-outline"),lsp=0,mioo=0,maoo=0,deo=0,cde=0;function refreshOutlineScroll(){mioo=parseInt(window.getComputedStyle(container).marginTop),maoo=container.offsetHeight+parseInt(window.getComputedStyle(container).marginTop)-outline.offsetHeight,deo=Math.max(0,outline.offsetHeight-window.innerHeight)}function scrollOutline(){cde+=window.scrollY-lsp,cde=Math.max(0,Math.min(deo,cde));0<deo&&Math.max(0,Math.min(deo,lsp-window.scrollY));outline.style.marginTop=Math.min(maoo,Math.max(mioo,window.scrollY-cde-outline.offsetTop+parseInt(window.getComputedStyle(outline).marginTop)))+"px",lsp=window.scrollY}refreshOutlineScroll(),window.addEventListener('scroll',scrollOutline),window.addEventListener('resize',refreshOutlineScroll);