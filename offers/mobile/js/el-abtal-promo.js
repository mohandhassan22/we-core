// Stars
  const sc = document.getElementById('stars');
  for(let i=0;i<22;i++){
    const s=document.createElement('div');
    s.className='star';
    const sz=Math.random()*3+1;
    s.style.cssText=`width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;animation-delay:${Math.random()*3}s;animation-duration:${2+Math.random()*3}s`;
    sc.appendChild(s);
  }

  function toggleFaq(el){
    el.parentElement.classList.toggle('open');
  }