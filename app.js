/* ---------- Hero: 3D grid floor + cursor spotlight ---------- */

const hero = document.querySelector(".hero");
const canvas = document.querySelector("#signalCanvas");
const ctx = canvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let width = 0;
let height = 0;
let animationId = 0;
let dpr = 1;

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(performance.now());
}

function drawHorizonGlow(horizon) {
  const glow = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 60);
  glow.addColorStop(0, "rgba(229, 54, 47, 0)");
  glow.addColorStop(0.5, "rgba(229, 54, 47, 0.22)");
  glow.addColorStop(1, "rgba(229, 54, 47, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon - 60, width, 120);

  // hard horizon line
  ctx.strokeStyle = "rgba(255, 122, 95, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(width, horizon);
  ctx.stroke();
}

function drawGridFloor(time) {
  const horizon = Math.round(height * 0.62);
  const floorHeight = height - horizon;
  if (floorHeight <= 0) return;

  const speed = reducedMotion ? 0 : (time / 36) % 1;
  const rowCount = 18;
  const vanishX = width / 2;

  // vertical lines converging to vanishing point
  const colCount = 18;
  for (let i = -colCount; i <= colCount; i += 1) {
    if (i === 0) continue;
    const ratio = i / colCount;
    const startX = vanishX + ratio * width * 0.04;
    const endX = vanishX + ratio * width * 1.9;
    const alpha = Math.max(0, 0.32 - Math.abs(ratio) * 0.18);
    ctx.strokeStyle = `rgba(229, 54, 47, ${alpha})`;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(startX, horizon);
    ctx.lineTo(endX, height);
    ctx.stroke();
  }

  // horizontal lines with perspective (further = nearer horizon = more transparent)
  for (let i = 0; i < rowCount; i += 1) {
    const t = ((i + speed) % rowCount) / rowCount;
    // perspective: heavier curve so nearer rows spread out
    const eased = Math.pow(t, 2.4);
    const y = horizon + eased * floorHeight;
    if (y > height + 1) continue;
    const alpha = Math.min(0.42, t * 0.55);
    ctx.strokeStyle = `rgba(229, 54, 47, ${alpha})`;
    ctx.lineWidth = Math.max(0.6, t * 1.6);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // subtle ground glow toward viewer
  const ground = ctx.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, "rgba(229, 54, 47, 0)");
  ground.addColorStop(1, "rgba(229, 54, 47, 0.12)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, width, floorHeight);
}

function drawBottomFade() {
  const fade = ctx.createLinearGradient(0, height * 0.64, 0, height);
  fade.addColorStop(0, "rgba(5, 5, 7, 0)");
  fade.addColorStop(0.56, "rgba(5, 5, 7, 0.74)");
  fade.addColorStop(1, "rgba(5, 5, 7, 1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, height * 0.64, width, height * 0.36);
}

function drawStarField(time) {
  // Quiet, drifting specks above the horizon — adds depth without busy-ness.
  const horizon = Math.round(height * 0.62);
  const drift = reducedMotion ? 0 : time * 0.012;
  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  for (let i = 0; i < 60; i += 1) {
    const seedX = Math.sin(i * 113.7) * 0.5 + 0.5;
    const seedY = Math.cos(i * 71.3) * 0.5 + 0.5;
    const x = (seedX * width + drift * (0.4 + seedY * 0.8)) % width;
    const y = seedY * (horizon - 20) + 12;
    const size = 0.4 + (Math.sin(i + time * 0.0014) * 0.5 + 0.5) * 1.1;
    ctx.fillRect(x, y, size, size);
  }
}

function draw(time) {
  ctx.clearRect(0, 0, width, height);
  const horizon = Math.round(height * 0.62);
  drawStarField(time);
  drawHorizonGlow(horizon);
  drawGridFloor(time);
  drawBottomFade();

  if (!reducedMotion) {
    animationId = requestAnimationFrame(draw);
  }
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
if (!reducedMotion) animationId = requestAnimationFrame(draw);

/* Cursor-follow spotlight (no-op on touch devices via CSS @media (hover: none)) */
if (hero && !reducedMotion) {
  let pendingFrame = 0;
  let pendingX = 50;
  let pendingY = 32;
  hero.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();
    pendingX = ((event.clientX - rect.left) / rect.width) * 100;
    pendingY = ((event.clientY - rect.top) / rect.height) * 100;
    if (pendingFrame) return;
    pendingFrame = window.requestAnimationFrame(() => {
      hero.style.setProperty("--mx", `${pendingX.toFixed(1)}%`);
      hero.style.setProperty("--my", `${pendingY.toFixed(1)}%`);
      pendingFrame = 0;
    });
  });
  hero.addEventListener("mouseleave", () => {
    hero.style.setProperty("--mx", "50%");
    hero.style.setProperty("--my", "32%");
  });
}

window.addEventListener("beforeunload", () => {
  if (animationId) cancelAnimationFrame(animationId);
});

/* ---------- Qualifier funnel ---------- */

const form = document.querySelector("#qualifierForm");
const stage = form.querySelector("[data-stage]");
const steps = Array.from(stage.querySelectorAll(".qualifier-step"));
const questionSteps = steps.filter((step) => step.dataset.step !== "success");
const totalSteps = questionSteps.length;
const progressFill = form.querySelector("[data-progress-fill]");
const currentStepEl = form.querySelector("[data-current-step]");
const totalStepsEl = form.querySelector("[data-total-steps]");
const backButton = form.querySelector("[data-back]");
const submitButton = form.querySelector("[data-submit]");
const errorEl = form.querySelector("[data-form-error]");
const phoneInput = form.querySelector("[data-phone-input]");
const toast = document.querySelector("[data-toast]");

const answers = {};
const stepHistory = [1];

totalStepsEl.textContent = String(totalSteps);

function showStep(stepKey) {
  steps.forEach((step) => {
    const isActive = step.dataset.step === String(stepKey);
    step.classList.toggle("active", isActive);
  });

  if (stepKey === "success") {
    progressFill.style.width = "100%";
    currentStepEl.textContent = String(totalSteps);
    backButton.hidden = true;
    return;
  }

  const stepNumber = Number(stepKey);
  const pct = (stepNumber / totalSteps) * 100;
  progressFill.style.width = `${pct}%`;
  currentStepEl.textContent = String(stepNumber);
  backButton.hidden = stepHistory.length <= 1;

  const focusable = steps
    .find((step) => step.dataset.step === String(stepKey))
    ?.querySelector("button.choice, input, textarea");
  if (focusable && stepNumber > 1) {
    window.requestAnimationFrame(() => focusable.focus({ preventScroll: true }));
  }
}

function goToStep(stepKey) {
  stepHistory.push(stepKey);
  showStep(stepKey);
}

function goBack() {
  if (stepHistory.length <= 1) return;
  stepHistory.pop();
  const previous = stepHistory[stepHistory.length - 1];
  showStep(previous);
}

backButton.addEventListener("click", goBack);

stage.addEventListener("click", (event) => {
  const choice = event.target.closest(".choice");
  if (!choice) return;
  const fieldset = choice.closest(".qualifier-step");
  if (!fieldset) return;
  const question = fieldset.dataset.question;
  const value = choice.dataset.value;
  if (!question || !value) return;

  answers[question] = {
    value,
    label: choice.querySelector(".choice-label")?.textContent.trim() || value,
  };

  fieldset
    .querySelectorAll(".choice")
    .forEach((node) => node.classList.toggle("selected", node === choice));

  const currentStep = Number(fieldset.dataset.step);
  const next = currentStep + 1;
  window.setTimeout(() => {
    if (next > totalSteps) return;
    goToStep(next);
  }, 220);
});

/* ---------- Phone formatting ---------- */

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

if (phoneInput) {
  phoneInput.addEventListener("input", (event) => {
    const before = event.target.value;
    const formatted = formatPhone(before);
    if (formatted !== before) {
      event.target.value = formatted;
    }
  });
}

/* ---------- Validation + submit ---------- */

function validateContact() {
  const requiredFields = form.querySelectorAll("[data-required-field]");
  let firstInvalid = null;

  requiredFields.forEach((field) => {
    const isCheckbox = field.type === "checkbox";
    const filled = isCheckbox ? field.checked : field.value.trim().length > 0;
    field.classList.toggle("invalid", !filled);
    if (!filled && !firstInvalid) firstInvalid = field;
  });

  if (firstInvalid) {
    firstInvalid.focus({ preventScroll: false });
    return "Please fill out the missing fields.";
  }

  const phoneDigits = (phoneInput?.value || "").replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    phoneInput?.classList.add("invalid");
    phoneInput?.focus();
    return "Enter a 10-digit phone number so Noah can reach you.";
  }

  return null;
}

function setError(message) {
  if (!errorEl) return;
  if (!message) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.textContent = message;
  errorEl.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError(null);

  const validationMessage = validateContact();
  if (validationMessage) {
    setError(validationMessage);
    return;
  }

  const originalText = submitButton.textContent;
  submitButton.textContent = "Sending…";
  submitButton.disabled = true;

  const contact = {
    name: form.elements.name.value.trim(),
    phone: form.elements.phone.value.trim(),
    phone_digits: form.elements.phone.value.replace(/\D/g, ""),
    location: form.elements.location.value.trim(),
    consent: form.elements.consent.checked,
  };

  const qualifier = Object.fromEntries(
    Object.entries(answers).map(([key, ans]) => [key, ans.value]),
  );
  const qualifierLabels = Object.fromEntries(
    Object.entries(answers).map(([key, ans]) => [key, ans.label]),
  );

  const payload = {
    source: "instagram-landing-page",
    page: "boyerscales.com/iamnoah",
    submittedAt: new Date().toISOString(),
    contact,
    qualifier,
    qualifierLabels,
  };

  const endpoint = form.dataset.endpoint;
  const bookingUrl = form.dataset.bookingUrl;
  const hasLiveEndpoint = endpoint && !endpoint.includes("PASTE_");
  const hasBookingUrl = bookingUrl && !bookingUrl.includes("PASTE_");

  try {
    if (hasLiveEndpoint) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    } else {
      // Local/preview mode — log so Noah can verify the payload before wiring up.
      // eslint-disable-next-line no-console
      console.info("[qualifier preview] webhook not set — payload:", payload);
    }

    showStep("success");

    const successMessage = form.querySelector("[data-success-message]");
    if (successMessage) {
      successMessage.textContent = hasBookingUrl
        ? "Opening the booking step now."
        : "Expect a call or text shortly. Save the number when it comes through.";
    }

    toast.hidden = false;
    toast.querySelector("strong").textContent = "Application received.";
    toast.querySelector("span").textContent = hasBookingUrl
      ? "Opening the booking step now."
      : "Noah's team can call or text with the next step.";

    if (hasBookingUrl) {
      window.setTimeout(() => {
        window.location.href = bookingUrl;
      }, 1100);
    }
  } catch (error) {
    setError("Something went wrong sending that. Please try again or text Noah directly.");
    toast.hidden = false;
    toast.querySelector("strong").textContent = "Couldn't send that.";
    toast.querySelector("span").textContent = "Please try again in a moment.";
  } finally {
    submitButton.textContent = originalText;
    submitButton.disabled = false;
    window.setTimeout(() => {
      toast.hidden = true;
    }, 5200);
  }
});

/* Clear invalid state as the user fixes fields */
form.addEventListener("input", (event) => {
  const target = event.target;
  if (target.classList?.contains("invalid")) {
    target.classList.remove("invalid");
  }
  if (errorEl && !errorEl.hidden) setError(null);
});

/* Ensure step 1 is shown on load */
showStep(1);
