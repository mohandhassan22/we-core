 document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('search-input');
            const packageCards = document.querySelectorAll('.package-card');
            const noResults = document.querySelector('.no-results');

            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.trim().toLowerCase();
                let hasResults = false;

                packageCards.forEach(card => {
                    const packageName = card.getAttribute('data-name').toLowerCase();
                    if (packageName.includes(searchTerm)) {
                        card.style.display = 'flex';
                        hasResults = true;
                    } else {
                        card.style.display = 'none';
                    }
                });

                if (!hasResults && searchTerm.length > 0) {
                    noResults.style.display = 'block';
                } else {
                    noResults.style.display = 'none';
                }
            });
        });
