let inputFilter=(a,b,c=!0)=>(b=("1"==a.dataset.signed&&"-"==(b??a.value)[0]?"-":"")+(b??a.value).toUpperCase().replaceAll(new RegExp(a.dataset.filter,"g"),""),c?a.value=b:b),inputMaxLength=a=>{if(a.value.length)for(;;)try{if(BigInt((a.dataset.bigintprefix??"")+inputFilter(a)).toString(2).length>a.maxLength)a.value=a.value.substr(1);else break}catch(b){break}},inputChange=b=>{let a=inputFilter(b,void 0,!1);a.length&&"-"==a[0]?setValues(a.length>1?BigInt((b.dataset.bigintprefix??"")+a.replace("-",""))-1n&2n**BigInt(b.maxLength-1)-1n^2n**BigInt(b.maxLength)-1n:"-"):setValues(a.length?BigInt((b.dataset.bigintprefix??"")+a):"")},setValues=a=>{"bigint"==typeof a?document.querySelectorAll(".input").forEach(b=>{"1"==b.dataset.signed&&a>>BigInt(b.maxLength-1)==1n?inputFilter(b,"-"+((a^2n**BigInt(b.maxLength)-1n)+1n).toString(b.dataset.base)):inputFilter(b,a.toString(b.dataset.base))}):document.querySelectorAll(".input").forEach(b=>b.value="-"==a&&"1"==b.dataset.signed?"-":"")},setBits=a=>{document.querySelector("form").style.setProperty("--input-size",a),document.querySelectorAll("input.input[maxlength]").forEach(b=>{b.maxLength=parseInt(a),inputMaxLength(b)}),inputChange(document.querySelector("input#base2"))},setSigned=a=>{document.querySelectorAll("input.input[data-signed]").forEach(b=>b.dataset.signed=a?1:0),inputChange(document.querySelector("input#base2"))},syncScroll=a=>{document.querySelectorAll(".input-scroll").forEach(b=>{b.scroll(a.target.scrollLeft,a.target.scrollTop)})};document.querySelectorAll(".input-scroll").forEach(a=>{a.addEventListener("scroll",syncScroll),a.addEventListener("wheel",b=>{b.preventDefault(),a.scrollLeft+=b.deltaY})}),document.querySelectorAll("input.input").forEach(a=>{a.addEventListener("input",a=>inputMaxLength(a.target)),a.addEventListener("keyup",a=>inputChange(a.target))}),document.querySelectorAll('input[name="bits"]').forEach(a=>{a.addEventListener("change",b=>{let a=parseInt(b.target.value);isNaN(a)?document.querySelector("input#bits-custom").style.display="inline-block":(document.querySelector("input#bits-custom").style.display="none",document.querySelector("input#bits-custom").value=a,setBits(a))})}),document.querySelector("input#bits-custom").addEventListener("change",a=>setBits(a.target.value)),document.querySelector("input#signed").addEventListener("change",a=>setSigned(a.target.checked))