// قائمة العروض - يمكنك تعديلها حسب الحاجة
        const offers = [
                        {
        title: "el-abtal-promo",
        badge: "عرض خاص",
        highlight: "فترة محدودة",
        details: [
            
        ],
        buttonText: "تفاصيل أكثر",
        buttonLink: "el-abtal-promo.html" // تأكد من صحة هذا المسار
    },
         {   
        title: "we-gold-tod-offer",
        badge: "عرض خاص",
        highlight: "فترة محدودة",
        details: [
            
        ],
        buttonText: "تفاصيل أكثر",
        buttonLink: "we-gold-tod-offer.html" // تأكد من صحة هذا المسار
        }
           
        // يمكنك إضافة المزيد من العروض هنا
            // أو حذف جميع العروض لعرض رسالة "لا توجد عروض"
        ];

        // دالة لعرض العروض
        function displayOffers() {
            const offersContainer = document.getElementById('offersContainer');
            const noOffersMessage = document.getElementById('noOffersMessage');

            // إذا لم يكن هناك عروض، اعرض رسالة "لا توجد عروض"
            if (offers.length === 0) {
                offersContainer.innerHTML = '';
                noOffersMessage.style.display = 'block';
                return;
            }

            // إخفاء رسالة "لا توجد عروض"
            noOffersMessage.style.display = 'none';

            // إنشاء HTML للعروض
            let offersHTML = '<div class="offers-grid">';
            
            offers.forEach(offer => {
                offersHTML += `
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
                                    ${offer.details.map(detail => `<li>${detail}</li>`).join('')}
                                </ul>
                            </div>
                            <a href="${offer.buttonLink}" class="offer-button">
                                <i class="fas fa-arrow-left"></i> ${offer.buttonText}
                            </a>
                        </div>
                    </div>
                `;
            });

            offersHTML += '</div>';
            offersContainer.innerHTML = offersHTML;
        }

        // عرض العروض عند تحميل الصفحة
        window.addEventListener('load', displayOffers);