const $=id=>document.getElementById(id);
  function openAboutModal(){$('aboutModal').classList.add('active');}
  function closeAboutModal(){$('aboutModal').classList.remove('active');}
  function showComingSoonModal(){$('comingSoonModal').classList.add('active');}
  function closeModal(){$('comingSoonModal').classList.remove('active');}

  $('aboutModal').addEventListener('click',function(e){if(e.target===this)closeAboutModal();});
  $('comingSoonModal').addEventListener('click',function(e){if(e.target===this)closeModal();});

  window.addEventListener('load',function(){
    if(typeof ActiveUsersWidget!=='undefined')ActiveUsersWidget.init({position:'corner'});
  });