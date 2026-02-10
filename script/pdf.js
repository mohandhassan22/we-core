 // بيانات النماذج
        const forms = [
                    { 
                        title: "نموذج تقديم ارضي",
                        category: "landline",
                        size: "450KB",
                        link: "https://drive.google.com/file/d/1HkiB4BtjW7CxC46D1ffMwOVog7OYqiGM/view",
                    },
                    {
                        title: "نموذج استبدال شريحه",
                        category: "mobile",
                        size: "320KB",
                        link: "https://drive.google.com/file/d/1ecmi5n3onFSwtEMsj-q9u6NkpPFChTqZ/view",
                    },
                    {
                        title: "نموذج نقل ملكية خط محمول",
                        category:"mobile",
                        size:"265KB",
                        link:"https://drive.google.com/file/d/18M5aDE2JT6kmIXMaEJoYMKZI209_i_9k/view"
                    },
                    // اسال استلام نقديه يظهر في الثلاثة عن طريق تكرار الإدخال لكل فئة
                    {
                        title: "إيصال استلام نقديه",
                        category: "mobile",
                        size: "200KB",
                        link: "https://drive.google.com/file/d/15Lb6sYILbaEtM-lfpwHVeiCFB85P7znu/view"
                    },
                    {
                       title:"نموذج تعديل بيانات شخصيه",
                       category:"landline",
                       size:"150KB",
                       link:"https://drive.google.com/file/d/1atQXyMO0TD_PhhAKKQsHxZmcKTYpMrEM/view"
                    },
                    {
                      title:"أﺣﻜﺎم وﺷﺮوط ﺧﺪﻣﺔ ﺧﻄﻮط اﻟﺘﻠﻴﻔﻮن المحمول ذات اﻟﺸﺮاﺋﺢ المدمجة" ,
                      category:"mobile",
                      size:"60KB",
                      link:"https://drive.google.com/file/d/1Nxy8xYVzrPQJ-_E6tkFMaJ3DiuwwCUE-/view"
                    },
                    {
                       title:"استماره NTRA للارضي الجديد",
                       category:"Adsl",
                       size:"50KB",
                       link:"https://drive.google.com/file/d/18yoFrW46KWeQq9um5IrnY3xy8cfYCppJ/view"
                    },
                    {
                        title:"استماره NTRA للارضي الحالي",
                       category:"Adsl",
                       size:"50KB",
                       link:"https://drive.google.com/file/d/1XzZSlxLe7qi858EXd_GQguY7oKSVcTr-/view"
                    },
                    {
                        title:"اضافه خط ارضي جديد ع الوي جولد جديد)",
                        category:"landline",
                        size:"50KB",
                        link:"https://drive.google.com/file/d/1Edc9TDHYKgxcVvepuqabab-W1pXzL0Ce/view"
                    },
                    {
                        title:" اضافه خط ارضي جديد ع الوي جولد حالي",
                        category:"landline",
                        size:"50KB",
                        link:"https://drive.google.com/file/d/1vBkVNslIXvj-VkiNIjIJPGvKmqr3PGpa/view"
                    },
                    {
                        title:" اضافه خط ارضي حالي ع الوي جولد جديد",
                        category:"landline",
                        size:"50KB",
                        link:"https://drive.google.com/file/d/1_JOkzlQLq7g_N8KfE8MOnW9MdEFezzhU/view"
                    },
                    {
                        title:"اقرار الغاء محفظه",
                        category:"mobile",
                        size:"45KB",
                        link:"https://drive.google.com/file/d/1qkrZQL5DzbsP_91SxNJ98VDEvshqjSS1/view"
                    },
                    {
                        title:"اقرار 12 شهر وي جولد",
                        category:"mobile",
                        size:"42KB",
                        link:"https://drive.google.com/file/d/1FU93Nkhov9J6Fp5A1lXz5tglDA1q0wmz/view"
                    },
                    {
                       title:"اقرار ايقاف مؤقت لخط الفاتوره",
                       category:"mobile",
                       size:"35KB",
                       link:"https://drive.google.com/file/d/1lp2kcaXh9GDvOjzn8tg6P3DdbHaZWcej/view"
                    },
                    {
                        title:"اقرار عملاء الدبلوماسي",
                        category:"mobile",
                        size:"22KB",
                        link:"https://drive.google.com/file/d/1XXDRIqisUOP5u224pTDkTEUpP8fGMO5N/view"
                    },
                    {
                        title:"طلب استغناء عن خط ارضي",
                        category:"landline",
                        size:"48KB",
                        link:"https://drive.google.com/file/d/1PCSLJpeJ8g0pvhllxQ1jvD_vYYYqIObG/view"
                    },
                    {
                        title:"طلب الغاء MNP",
                        category:"mobile",
                        size:"45KB",
                        link:"https://drive.google.com/file/d/1LpwNzXxr_Yy6XoZYH3JRGNg6_JwJu0qq/view"
                    },
                    {
                        title:"طب MNP",
                        category:"mobile",
                        size:"22KB",
                        link:"https://drive.google.com/file/d/1qfAC9Y6ZogLQstKL-YqCK2AtYUYC-K3H/view"
                    },
                    {
                        title:"طلب الغاء انترنت",
                        category:"Adsl",
                        size:"35KB",
                        link:"https://drive.google.com/file/d/1rTM6sg_3H2VbgXKEj3rdr6TybDr4xs6-/view"
                    },
                    {
                        title:"طلب الغاء خط الفاتوره ",
                        category:"mobile",
                        size:"42KB",
                        link:"https://drive.google.com/file/d/1_BTIlkijUXe16ymLw5Fxvz4Q7VuKZUcH/view"
                    },
                    {
                        title:"طلب نقل ارضي ",
                        category:"landline",
                        size:"48KB",
                        link:"https://drive.google.com/file/d/1VsXUiKRMNWa39fxDK9Edr7U-DtvImhDl/view"
                    },
                    {
                        title:"عقد تقديم خدمة المكالمات الترويجية لخطوط الأفراد",
                        category:"mobile",
                        size:"35KB",
                        link:"https://drive.google.com/file/d/1XHn93Md-FmV_Oe8eCusBZrISgEn_dwau/view"
                    },
                    {
                        title:"عقد غرامه النت الارضي",
                        category:"Adsl",
                        size:"35KB",
                        link:"https://drive.google.com/file/d/1T-tO_yRJqC5xXNJYCRGTJOYkwE5y3oDR/view"
                    },
                    {
                        title:"فورمه اكتر من خط للعملاء الجدد",
                        category:"mobile",
                        size:"47KB",
                        link:"https://drive.google.com/file/d/1og9EoiFhmzIAVVwOBRYF3ay1uHA-n5L4/view"
                    },
                    {
                        title:"اقرار الراوتر 50ج ",
                        category:"Adsl",
                        size:"35KB",
                        link:"https://drive.google.com/file/d/1wxi24MuqCfmM6Q0vhXa6K_s-Ley8isW3/view"
                    },
                    {
                        title:"اقرار والي امر الطالب",
                        category:"mobile",
                        size:"30KB",
                        link:"https://drive.google.com/file/d/1og9EoiFhmzIAVVwOBRYF3ay1uHA-n5L4/view"
                    },
                    {
                        title:"طلب الغاء خط كارت ",
                        category:"mobile",
                        size:"25KB",
                        link:"https://drive.google.com/file/d/12gEHoa8XsNS8nrA1ikkeTQne4KzHTA0n/view"
                    },
                    {
                        title:"طلب نقل ملكيه خط طالب ",
                        category:"mobile",
                        size:"30KB",
                        link:"https://drive.google.com/file/d/1BGzT0xLZ1MiJXJH02nIHj41EvQ3LfAja/view"
                    },
                    {
                        title:"140 دليل ",
                        category:"landline",
                        size:"30KB",
                        link:"https://drive.google.com/file/d/1O6yfLP7FW6GicHXEGTUohcW7Y1kTUAmw/view"
                    },
                    {
                        title:"استماره اشتراك في خدمه الرقم الشخصي المنزلي",
                        category:"landline",
                        link:"https://drive.google.com/file/d/1Oe87u8JMjgp3WxEMmZ3ZhOfS5L5htzru/view"
                    },
                    {
                        title:"'طلب اشتراك في باقات محمول اكسترا",
                        category:"landline",
                        link:"https://drive.google.com/file/d/1W1Ck-8X6NtWWeAZKT_ZJm2AnCsQpn6-j/view"
                    },
                    {
                        title:"طلب تقسيط فاتوره ارضي",
                        category:"landline",
                        link:"https://drive.google.com/file/d/1Q6eGV4PgZh-3BlLT9-vA5koi7798Cwix/view"
                    },
                    {
                        title:"طلب تنازل ع تلفون ارضي",
                        category:"landline",
                        link:"https://doc-0k-a0-apps-viewer.googleusercontent.com/viewer/secure/pdf/3nb9bdfcv3e2h2k1cmql0ee9cvc5lole/tr6v7tdc1dtsrj5201gk8paj04dabn67/1770748350000/drive/*/ACFrOgCuJ0Bv137LDa7WYywScyWzwOPMjkB8r3g0AGXtJhkXlTBBxp1h9sFd_SOkNvSKhbgD4kB053GcDT-6Vv__RVJF695TVTQ82De1U8vPcA28AUvqOHHeFMNNcEn5GHUSX28fX39f3Wc7Ohv6_Hfpcwiju3oiVpnAH6dXlEOZjboZ7eMutmCpAA8zpwA4EpfElfeU9HEgSkDtF086s-Ofxo1adI7daOO2QUS7JBin1JXYyRYSWKbTHiAD02oSoCMMuPIhoF24v8xLtSYPskJf_ft6AvK4MNZYv5Kbg-O9lhqTBDVANnT_YSJubOA5BSbKlEjiwVaE1cYFX8iLXPwuSP8PDX2yXOPIHgiBT_h8q1eOzcE68rEPLoidve-bdB3S9Ak8Ow5DImklWmd4F5ubb4tiH4Cu3L7ij8FKEg==?print=true"
                    {
                        title:"طلب خواص و خدامات مضافه",
                        category:"landline",
                        link:"https://drive.google.com/file/d/1LZesd4pxR_qJFZdmuPpU_a-I0kLE54az/view"
                    },
                    {
                        title:"طلب تحويل رقم تليفون خدمة الـ ADSL",
                        category:"Adsl",
                        link:"https://drive.google.com/file/d/178HuJWK9_PRkn0ZJScdx2OzcAYvs2Xqf/view"
                    },
                    {
                        title:"طلب تحويل خدمة ADSL من موفر خدمة آخر",
                        category:"Adsl",
                        link:"https://drive.google.com/file/d/1xTCX_iOCxs_LNYkyCS2bVlKiPZDxELC9/view"
                    },

                
                ];

       /// توليد النماذج تلقائيًا (عرض فقط بدون تحميل)
function generateForms(category = 'all') {
    const container = document.getElementById('formsContainer');
    container.innerHTML = '';

    forms.forEach(form => {
        if (category === 'all' || form.category === category) {
            const viewerSrc = encodeURIComponent(form.link);
            const card = `
                <div class="form-card">
                    <div class="form-header">
                        <i class="fas fa-file-pdf form-icon"></i>
                        <h3>${form.title}</h3>
                    </div>
                    <p>الحجم: ${form.size}</p>
                    <a class="download-btn" href="viewpdf.html?src=${viewerSrc}" title="عرض النموذج">
                        <i class="fas fa-eye"></i> عرض النموذج
                    </a>
                </div>
            `;
            container.innerHTML += card;
        }
    });
}



        // البحث والتصفية
        function searchForms() {
            const term = document.getElementById('searchInput').value.toLowerCase();
            const cards = document.querySelectorAll('.form-card h3');
            let found = false;

            cards.forEach(card => {
                if (card.textContent.toLowerCase().includes(term)) {
                    card.parentElement.parentElement.style.display = 'block';
                    found = true;
                } else {
                    card.parentElement.parentElement.style.display = 'none';
                }
            });

            if (!found) {
                const container = document.getElementById('formsContainer');
                container.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <p>دور عدل</p>
                    </div>
                `;
            }
        }

        function filterForms(category) {
            generateForms(category);
        }

        // التهيئة الأولية

        generateForms();





