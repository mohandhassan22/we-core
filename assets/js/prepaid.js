// إظهار رسالة "قريباً"
        function showComingSoonModal() {
            document.getElementById('comingSoonModal').style.display = 'block';
        }

        // إغلاق الرسالة
        function closeModal() {
            document.getElementById('comingSoonModal').style.display = 'none';
        }

        // إغلاق الرسالة عند الضغط خارجها
        window.onclick = function(event) {
            const modal = document.getElementById('comingSoonModal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }