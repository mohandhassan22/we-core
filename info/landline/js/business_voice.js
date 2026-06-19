window.addEventListener('load', function() {
    if (typeof ActiveUsersWidget !== 'undefined') {
      ActiveUsersWidget.init({ position: 'corner' });
    }
  });

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      item.classList.toggle('open');
    });
  });
});
