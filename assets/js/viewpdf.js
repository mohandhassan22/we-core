/* ── helpers ── */
    function getCookie(name) {
      const val = `; ${document.cookie}`;
      const parts = val.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    }

    /* ── init ── */
    const params   = new URLSearchParams(window.location.search);
    let   fileUrl  = params.get("src");
    const STORAGE_ORIGIN = "https://iygwhapcpdmsasqlfelv.supabase.co";
    const frame    = document.getElementById("pdfFrame");
    const titleEl  = document.getElementById("docTitle");
    const loading  = document.getElementById("loadingScreen");
    let   localBlobUrl = null;

    function hideLoading() {
      loading.classList.add("hidden");
    }

    function initViewer() {
      if (!fileUrl) return;
      // Never send the user's Supabase access token to a URL supplied by the query string.
      // Authenticated documents must come only from this project's Supabase storage.
      let parsedUrl;
      try { parsedUrl = new URL(fileUrl, window.location.origin); } catch (_) { parsedUrl = null; }
      const isHttps = parsedUrl && parsedUrl.protocol === "https:";
      const isSameOrigin = parsedUrl && parsedUrl.origin === window.location.origin;
      const isProjectStorage = parsedUrl && parsedUrl.origin === STORAGE_ORIGIN && parsedUrl.pathname.startsWith("/storage/v1/object/");
      if (!parsedUrl || !isHttps || (!isSameOrigin && !isProjectStorage)) {
        loading.classList.add("hidden");
        titleEl.textContent = "رابط الملف غير مسموح";
        document.title = "WE Core | رابط غير مسموح";
        return;
      }
      fileUrl = parsedUrl.href;
      const rawName  = decodeURIComponent(fileUrl.split("/").pop().split("?")[0]);
      const cleanName = rawName.replace(/\.pdf$/i, "");

      // Update tab title & toolbar title
      titleEl.textContent = cleanName;
      document.title = `WE Core | ${cleanName}`;

      const token = getCookie('sb-access-token');

      if (token && parsedUrl.origin === STORAGE_ORIGIN && parsedUrl.pathname.includes('/authenticated/')) {
        fetch(fileUrl, { headers: { "Authorization": `Bearer ${token}` } })
          .then(res => {
            if (!res.ok) throw new Error("Authorization Required");
            return res.blob();
          })
          .then(blob => {
            localBlobUrl = URL.createObjectURL(blob);
            frame.src    = localBlobUrl;
            // بعض المتصفحات لا تطلق load لعنصر embed، لذلك لا نترك شاشة التحميل معلقة.
            setTimeout(hideLoading, 350);
          })
          .catch(err => {
            console.error(err);
            hideLoading();
            titleEl.textContent = "خطأ في صلاحية الوصول";
            document.title = "WE Core | خطأ";
          });
      } else {
        frame.src    = fileUrl;
        localBlobUrl = fileUrl;
        setTimeout(hideLoading, 350);
      }

      frame.onload = () => setTimeout(hideLoading, 150);
    }
    initViewer();

    /* ── Print via Ctrl+P ── */
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && String(e.key).toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        printPDF();
      }
    }, true);

    /* ── Print: always from this page (no new tab/window) ── */
    let printBlobUrl = null;       // same-origin blob copy of the PDF, used for printing
    let printing     = false;

    async function getPrintableUrl() {
      if (localBlobUrl && localBlobUrl.startsWith('blob:')) return localBlobUrl;
      if (printBlobUrl) return printBlobUrl;
      // Public (cross-origin) URL: fetch it once so it can be printed from a same-origin frame
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error('fetch failed');
      printBlobUrl = URL.createObjectURL(await res.blob());
      return printBlobUrl;
    }

    async function printPDF() {
      if (printing) return;
      printing = true;
      try {
        const url = await getPrintableUrl();

        // Dedicated hidden frame: prints only the PDF, never the toolbar / page chrome
        const h = document.createElement('iframe');
        h.setAttribute('aria-hidden', 'true');
        h.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
        h.onload = () => {
          setTimeout(() => {
            try {
              h.contentWindow.focus();
              h.contentWindow.print();
              window.focus();            // give focus back so Ctrl+P keeps working
            } catch (err) {
              window.focus();
              console.warn('Print failed:', err);
              alert('تعذّرت الطباعة من هذه الصفحة. استخدم زر التحميل ثم اطبع الملف.');
            }
            printing = false;
            setTimeout(() => h.remove(), 1500);
          }, 400);
        };
        h.src = url;
        document.body.appendChild(h);
      } catch (err) {
        console.warn('Print failed:', err);
        printing = false;
        alert('تعذّر تجهيز الملف للطباعة. حاول مرة أخرى أو استخدم زر التحميل.');
      }
    }

    function downloadPDF() {
      if (!localBlobUrl) return;
      const a = document.createElement("a");
      a.href     = localBlobUrl;
      a.download = decodeURIComponent(fileUrl.split("/").pop());
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
