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
          })
          .catch(err => {
            console.error(err);
            loading.classList.add("hidden");
            titleEl.textContent = "خطأ في صلاحية الوصول";
            document.title = "WE Core | خطأ";
          });
      } else {
        frame.src    = fileUrl;
        localBlobUrl = fileUrl;
      }

      frame.onload = () => setTimeout(() => loading.classList.add("hidden"), 450);
    }
    initViewer();

    /* ── Print via Ctrl+P ── */
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        printPDF();
      }
    });

    function printPDF() {
      if (frame.contentWindow) {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          return;
        } catch (_) { /* cross-origin fallback below */ }
      }
      if (localBlobUrl) {
        const w = window.open(localBlobUrl, "_blank");
        if (w) w.addEventListener('load', () => w.print());
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
