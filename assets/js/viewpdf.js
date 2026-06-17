/* ── helpers ── */
    function getCookie(name) {
      const val = `; ${document.cookie}`;
      const parts = val.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    }

    /* ── init ── */
    const params   = new URLSearchParams(window.location.search);
    let   fileUrl  = params.get("src");
    const frame    = document.getElementById("pdfFrame");
    const titleEl  = document.getElementById("docTitle");
    const loading  = document.getElementById("loadingScreen");
    let   localBlobUrl = null;

    if (fileUrl) {
      const rawName  = decodeURIComponent(fileUrl.split("/").pop().split("?")[0]);
      const cleanName = rawName.replace(/\.pdf$/i, "");

      // Update tab title & toolbar title
      titleEl.textContent = cleanName;
      document.title = `WE Core | ${cleanName}`;

      const token = getCookie('sb-access-token');

      if (token && fileUrl.includes('/authenticated/')) {
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