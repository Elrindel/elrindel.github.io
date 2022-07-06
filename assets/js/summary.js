let titles = document.querySelectorAll('article h1,article h2,article h3,article h4,article h5,article h6');
let summary = ['<ul>'];
let id = 0, lastLevel = 1, levelCount = 0;
for(let i = 0, c = titles.length; i < c; i++){
    let header = titles[i];
    if(!header.getAttribute('id')){
        header.setAttribute('id', id);
    }
    let level = header.tagName.match(/^h(\d)$/i)[1];
    levelCount = level - lastLevel;

    if(levelCount > 0){
        for(let j = 0; j < levelCount; j++){
            summary.push('<ul>');
        }
    }else if(levelCount < 0){
        levelCount *= -1;
        for(let j = 0; j < levelCount; j++){
            summary.push('</ul>');
        }
    };
    summary.push('<li>');
    summary.push('<a href="#'+header.getAttribute('id')+'">'+header.innerText+'</a>');
    summary.push('</li>');
    lastLevel = level;
    id++;
}
summary.push('</ul>')
if(summary.length > 2){
    document.getElementById('summary').innerHTML = summary.join('');
}