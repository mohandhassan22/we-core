// قائمة العروض - يمكنك تعديلها حسب الحاجة
        const offers = [
            {
                title: "عرض WE Space للعملاء الجدد",
                badge: "عرض خاص",
                highlight: "نص الباقه (50%) لمده 3 شهور",
                details: [
                    "للعملاء الجدد من باقة سوبر 200 جيجابايت",
                    "مضاعفة السعة لمدة 3 شهور كاملة",
                    "إمكانية الشحن من خلال طرق متعددة",
                    "يجب تجديد الباقة في موعدها"
                ],
                buttonText: "لتفاصيل اكثر ",
                buttonLink: "adslX2.html"
            },
                {
                title: " عرض الصيف على باقات WE SPACE  السنوية",
                badge: "عرض خاص",
                highlight: "لعرض هو اتاحة سعة إضافية هدية للعملاء عند الاشتراك على الباقات السنوية ",
                details: [
                    "",
                    "",
                    "",
                    ""
                ],
                buttonText: "لتفاصيل اكثر ",
                buttonLink: "we_space_offer.html"
            },
                {
                title: " عرض الصيف Win-Back 2026",
                badge: "عرض خاص",
                highlight: "لجدّد اشتراكك واستمتع بـ50% سعة إضافية مجانًا لمدة 3 أشهر",
                details: [
                        "يحصل العميل على 50% سعة إضافية (Extra Quota) من سعة الباقة الأساسية لمدة 3 أشهر بحد أقصى 3 مرات فقط، وذلك عند تجديد الاشتراك خلال فترة العرض."
                ],
                buttonText: "لتفاصيل اكثر ",
                buttonLink: "winback_offer.html"
            },
                {
                title: " WE Space Sahel",
                badge: "عرض خاص",
                highlight: "150 جيجابايت هدية على باقة WE Space Sahel ",
                details: [
                    "يحصل عملاء الإنترنت الأرضي على جيجابايتس هدية عند التجديد أو التجديد المبكر على باقة WE SPACE SAHEL، أو عند التحويل إليها — تُضاف تلقائيًا بدون أي إجراء إضافي.",
                  
                ],
                buttonText: "لتفاصيل اكثر ",
                buttonLink: "we-space-sahel.html"
            },
                {
                title: " Summer Top-up",
                badge: "عرض خاص",
                highlight: "اشحن باقتك الإضافية وخد جيجا زيادة عليها",
                details: [
                    "عرض صيفي لعملاء الإنترنت الثابت: اشحن باقات الشحن الإضافية بنفس السعر المعتاد، واحصل على جيجابايتس مجانية تُضاف تلقائيًا بمجرد إتمام عملية الشحن — بدون أي خطوات إضافية",
                 
                ],
                buttonText: "لتفاصيل اكثر ",
                buttonLink: "summer-topup-2026.html"
            },
           
          
        
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
