(function () {
  const dataLayer = window.dataLayer || [];

  function track(eventName, params) {
    dataLayer.push({
      event: eventName,
      ...(params || {})
    });
  }

  function initHeaderState() {
    const header = document.querySelector("[data-header]");
    if (!header) return;

    const setState = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    setState();
    window.addEventListener("scroll", setState, { passive: true });
  }

  function initSlider() {
    const slides = Array.from(document.querySelectorAll("[data-slide]"));
    const dots = Array.from(document.querySelectorAll("[data-dot]"));
    const prev = document.querySelector('[data-slider="prev"]');
    const next = document.querySelector('[data-slider="next"]');
    if (!slides.length) return;

    let current = 0;
    let timer;

    const show = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle("active", slideIndex === current);
      });
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === current);
      });
    };

    const restart = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => show(current + 1), 5200);
    };

    prev?.addEventListener("click", () => {
      show(current - 1);
      restart();
    });

    next?.addEventListener("click", () => {
      show(current + 1);
      restart();
    });

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        show(Number(dot.dataset.dot));
        restart();
      });
    });

    restart();
  }

  function initTrackingLinks() {
    document.querySelectorAll("[data-track]").forEach((element) => {
      element.addEventListener("click", () => {
        const eventName = element.dataset.track;
        track(eventName, {
          link_text: element.textContent.trim(),
          link_url: element.getAttribute("href") || "",
          section: element.closest("section")?.id || element.closest("header")?.className || "mobile_sticky"
        });
      });
    });
  }

  function setError(form, fieldName, message) {
    const error = form.querySelector(`[data-error-for="${fieldName}"]`);
    const field = form.elements[fieldName];

    if (error) error.textContent = message || "";

    if (field instanceof RadioNodeList) {
      const fieldset = error?.closest("fieldset");
      fieldset?.classList.toggle("has-error", Boolean(message));
      return;
    }

    const row = field?.closest?.(".form-row");
    row?.classList.toggle("has-error", Boolean(message));
  }

  function getCheckedValues(form, name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
  }

  function getField(form, name) {
    return form.elements.namedItem(name);
  }

  function getFieldValue(form, name) {
    const field = getField(form, name);
    return typeof field?.value === "string" ? field.value.trim() : "";
  }

  function validateForm(form) {
    const revenueControl = form.querySelector('input[name="revenue"]:checked') || getField(form, "revenue");
    const payload = {
      name: getFieldValue(form, "name"),
      phone: getFieldValue(form, "phone"),
      lineId: getFieldValue(form, "lineId"),
      email: getFieldValue(form, "email"),
      company: getFieldValue(form, "company"),
      companyType: getFieldValue(form, "companyType"),
      employeeSize: getFieldValue(form, "employeeSize"),
      revenue: revenueControl?.value || "",
      needs: getCheckedValues(form, "needs"),
      appointmentDate: getFieldValue(form, "appointmentDate"),
      appointmentTime: getFieldValue(form, "appointmentTime"),
      message: getFieldValue(form, "message"),
      source: "yucheng_landing_page",
      submittedAt: new Date().toISOString()
    };

    let valid = true;
    const phonePattern = /^[0-9+\-\s()#]{8,20}$/;

    Object.keys(payload).forEach((key) => {
      if (["needs", "source", "submittedAt"].includes(key)) return;
      setError(form, key, "");
    });
    setError(form, "needs", "");

    if (!payload.name) {
      setError(form, "name", "請填寫姓名");
      valid = false;
    }

    if (!payload.phone) {
      setError(form, "phone", "請填寫電話");
      valid = false;
    } else if (!phonePattern.test(payload.phone)) {
      setError(form, "phone", "請填寫有效電話");
      valid = false;
    }

    if (!payload.company) {
      setError(form, "company", "請填寫公司名稱");
      valid = false;
    }

    if (form.querySelector('[name="revenue"]') && !payload.revenue) {
      setError(form, "revenue", "請選擇公司年營收");
      valid = false;
    }

    if (!payload.needs.length) {
      setError(form, "needs", "請至少選擇一個問題");
      valid = false;
    }

    const consentField = getField(form, "consent");
    if (consentField && !consentField.checked) {
      setError(form, "consent", "請勾選同意聯繫");
      valid = false;
    }

    return { valid, payload };
  }

  async function submitLead(payload) {
    // Replace this function when Supabase or CRM credentials are confirmed.
    // Suggested next step: POST payload to an edge function, then let the server write CRM/Supabase.
    window.localStorage.setItem("yucheng_last_lead_preview", JSON.stringify(payload));
    return { ok: true };
  }

  function initForm() {
    const forms = document.querySelectorAll("[data-lead-form]");
    if (!forms.length) return;

    forms.forEach((form) => {
      const status = form.querySelector("[data-form-status]");
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton && !submitButton.dataset.defaultText) {
        submitButton.dataset.defaultText = submitButton.textContent;
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (status) status.textContent = "";

        const { valid, payload } = validateForm(form);
        if (!valid) {
          if (status) status.textContent = "請確認必填欄位後再送出。";
          track("lead_form_validation_error", {
            form_name: "yucheng_finance_check"
          });
          return;
        }

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "送出中...";
        }

        try {
          await submitLead(payload);
          track("lead_form_submit", {
            form_name: "yucheng_finance_check",
            revenue: payload.revenue,
            needs: payload.needs.join(",")
          });
          if (status) status.textContent = "已收到您的預約資料，顧問將盡快與您聯繫。";
          form.reset();
        } catch (error) {
          console.error(error);
          if (status) status.textContent = "目前送出失敗，請稍後再試或改用 LINE 聯繫。";
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = submitButton.dataset.defaultText || "立即預約";
          }
        }
      });
    });
  }

  initHeaderState();
  initSlider();
  initTrackingLinks();
  initForm();
})();
