(function(){
  if(!window.chatbase||window.chatbase("getState")!=="initialized"){
    window.chatbase=(...a)=>{if(!window.chatbase.q)window.chatbase.q=[];window.chatbase.q.push(a);};
    window.chatbase=new Proxy(window.chatbase,{get(t,p){if(p==="q")return t.q;return(...a)=>t(p,...a);}});
  }
  const onLoad=()=>{const s=document.createElement("script");s.src="https://www.chatbase.co/embed.min.js";s.id="roJIVJEXYM9eO6mqqwXeN";s.domain="www.chatbase.co";document.body.appendChild(s);};
  document.readyState==="complete"?onLoad():window.addEventListener("load",onLoad);
})();