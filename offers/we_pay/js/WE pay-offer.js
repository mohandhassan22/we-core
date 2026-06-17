// مصفوفة العروض بعد تصحيح الـ Syntax
        const offers = [
            {
                title: "We pay Voucher",
                badge: "عرض خاص",
                highlight: "لفترة محدودة",
                details: [
                    "قسائم شراء حصرية عبر WE Pay",
                    "كاش باك عند الشحن أو دفع الفواتير",
                    "سهولة الاشتراك من تطبيق المحفظة"
                ],
                buttonText: "تفاصيل أكثر",
                buttonLink: "we-pay.html"
            }
        ];

        function displayOffers() {
            const container = document.getElementById('offersContainer');
            const noOffers = document.getElementById('noOffersMessage');

            if (offers.length === 0) {
                container.innerHTML = '';
                noOffers.style.display = 'block';
                return;
            }

            noOffers.style.display = 'none';

            let html = '<div class="offers-grid">';
            offers.forEach(offer => {
                html += `
                    <div class="offer-card">
                        <div class="offer-header">
                            <h3>${offer.title}</h3>
                            <span class="offer-badge">${offer.badge}</span>
                        </div>
                        <div class="offer-body">
                            <div class="offer-highlight">
                                <p>🎁 ${offer.highlight}</p>
                            </div>
                            <div class="offer-details">
                                <ul>
                                    ${offer.details.map(d => `<li>${d}</li>`).join('')}
                                </ul>
                            </div>
                            <a href="${offer.buttonLink}" class="offer-button">
                                <i class="fas fa-arrow-left"></i> ${offer.buttonText}
                            </a>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        }

        window.addEventListener('load', displayOffers);

        // Widget Initialization
        window.addEventListener('load', function() {
            if (typeof ActiveUsersWidget !== 'undefined') {
                ActiveUsersWidget.init({ position: 'corner' });
            }
        });