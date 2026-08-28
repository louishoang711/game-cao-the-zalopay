const scratchPrizeImages = [
  "images/anh3.jpg",
  "images/anh4.jpg",
];
const scratchThreshold = 70;
const scratchBrushRadius = 22;

const step1 = document.getElementById("step1");
const step3 = document.getElementById("step3");
const step4 = document.getElementById("step4");

const registerButton = document.getElementById("register-button");
const stampTouchZone = document.getElementById("stamp-touch-zone");
const stampCard = document.getElementById("stamp-card");
const displayName = document.getElementById("display-name");
const popupOverlay = document.getElementById("popup-overlay");
const popupCloseButton = document.getElementById("popup-close");
const popupHomeBtn = document.getElementById("popup-home-btn");
const homeBtn = document.getElementById("home-btn");
const prizeImage = document.getElementById("prize-image");
const nameField = document.getElementById("name");
const phoneField = document.getElementById("phone");
const canvas = document.getElementById("scratch-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let isDrawing = false;
let scratchInitialized = false;
let isPrizeRevealed = false;
let stampActivated = false;
let lastPoint = null;

function showStep(stepElement) {
  [step1, step3, step4].forEach((step) => {
    step.classList.remove("active");
  });

  stepElement.classList.add("active");
}

function goToStep1() {
  popupOverlay.classList.remove("active");
  resetStampStep();
  nameField.value = "";
  phoneField.value = "";
  showStep(step1);
}

function goToStep3() {
  resetStampStep();
  showStep(step3);
  // Chặn ghost click từ nút Đăng Ký
  stampTouchZone.style.pointerEvents = "none";
  window.setTimeout(() => {
    stampTouchZone.style.pointerEvents = "";
  }, 400);
}

function getRandomPrizeImage() {
  const randomIndex = Math.floor(Math.random() * scratchPrizeImages.length);
  return scratchPrizeImages[randomIndex];
}

function goToStep4() {
  displayName.textContent = nameField.value.trim() || "Khách hàng ZaloPay";
  prizeImage.src = getRandomPrizeImage();
  showStep(step4);
  initScratchCard();
}

function handleRegister() {
  const nameValue = nameField.value.trim();
  const phoneValue = phoneField.value.trim();

  if (!nameValue || !phoneValue) {
    alert("Vui lòng nhập đầy đủ thông tin!");
    return;
  }

  goToStep3();
}

function resetStampStep() {
  stampActivated = false;
  stampCard.classList.remove("revealed");
}

function handleStamp() {
  if (stampActivated) {
    return;
  }

  stampActivated = true;
  stampCard.classList.add("stamping");

  window.setTimeout(() => {
    goToStep4();
  }, 750);
}

function drawScratchLayer() {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#cfd4db");
  gradient.addColorStop(0.24, "#b4bbc6");
  gradient.addColorStop(0.46, "#f4f5f7");
  gradient.addColorStop(0.7, "#9ea7b4");
  gradient.addColorStop(1, "#d9dee5");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let index = -canvas.height; index < canvas.width; index += 10) {
    ctx.beginPath();
    ctx.moveTo(index, 0);
    ctx.lineTo(index + canvas.height, canvas.height);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = index % 20 === 0 ? "rgba(255,255,255,0.7)" : "rgba(115,125,140,0.55)";
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.fillRect(18, 16, canvas.width - 86, 14);
  ctx.restore();

  // ZaloPay watermark
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // "Zalo" part
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("Zalo", cx - 2, cy);

  // "Pay" part — green tint like ZaloPay brand
  ctx.fillStyle = "rgba(180,255,210,0.62)";
  ctx.textAlign = "left";
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.fillText("Pay", cx + 2, cy);

  // subtle underline
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 62, cy + 24);
  ctx.lineTo(cx + 62, cy + 24);
  ctx.stroke();
  ctx.restore();

  ctx.globalCompositeOperation = "destination-out";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = scratchBrushRadius * 2;
}

function getPointerPosition(event, targetCanvas) {
  const rect = targetCanvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  const scaleX = targetCanvas.width / rect.width;
  const scaleY = targetCanvas.height / rect.height;

  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY,
  };
}

function eraseAtPoint(point, radius = scratchBrushRadius) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawScratchStroke(fromPoint, toPoint) {
  ctx.beginPath();
  ctx.moveTo(fromPoint.x, fromPoint.y);
  ctx.lineTo(toPoint.x, toPoint.y);
  ctx.stroke();
  eraseAtPoint(toPoint);
}

function scratch(event) {
  if (!isDrawing || isPrizeRevealed) {
    return;
  }

  event.preventDefault();

  const currentPoint = getPointerPosition(event, canvas);

  if (!lastPoint) {
    eraseAtPoint(currentPoint);
    lastPoint = currentPoint;
  } else {
    drawScratchStroke(lastPoint, currentPoint);
    lastPoint = currentPoint;
  }

  if (getScratchedPercentage() >= scratchThreshold) {
    revealPrize();
  }
}

function getScratchedPercentage() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let transparentPixels = 0;

  for (let index = 3; index < imageData.length; index += 4) {
    if (imageData[index] < 30) {
      transparentPixels += 1;
    }
  }

  const totalPixels = imageData.length / 4;
  return (transparentPixels / totalPixels) * 100;
}

function revealPrize() {
  if (isPrizeRevealed) {
    return;
  }

  isPrizeRevealed = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  popupOverlay.classList.add("active");
}

function stopDrawing() {
  isDrawing = false;
  lastPoint = null;
}

function startDrawing(event) {
  if (isPrizeRevealed) {
    return;
  }

  event.preventDefault();
  isDrawing = true;
  lastPoint = getPointerPosition(event, canvas);
  eraseAtPoint(lastPoint);

  if (getScratchedPercentage() >= scratchThreshold) {
    revealPrize();
  }
}

function initScratchCard() {
  isPrizeRevealed = false;
  isDrawing = false;
  lastPoint = null;
  popupOverlay.classList.remove("active");
  drawScratchLayer();

  if (scratchInitialized) {
    return;
  }

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", scratch);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseleave", stopDrawing);

  canvas.addEventListener("touchstart", startDrawing, { passive: false });
  canvas.addEventListener("touchmove", scratch, { passive: false });
  canvas.addEventListener("touchend", stopDrawing);
  canvas.addEventListener("touchcancel", stopDrawing);

  scratchInitialized = true;
}

registerButton.addEventListener("click", handleRegister);
stampTouchZone.addEventListener("click", handleStamp);
popupCloseButton.addEventListener("click", () => {
  popupOverlay.classList.remove("active");
});
homeBtn.addEventListener("click", goToStep1);
if (popupHomeBtn) {
  popupHomeBtn.addEventListener("click", goToStep1);
}

popupOverlay.classList.remove("active");
