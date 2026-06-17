function toggleQA(id) {
    const item = document.getElementById(id);
    if (!item) return;
    item.classList.toggle('open');
  }

  window.addEventListener('load', function() {
    if (typeof ActiveUsersWidget !== 'undefined') {
      ActiveUsersWidget.init({ position: 'corner' });
    }
  });