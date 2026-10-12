// Click a thumbnail to open its photo or video full size. Close with the X,
// the backdrop or Escape. Step between items with the arrows, the keyboard or
// a horizontal swipe. The list wraps at both ends.
const cells = Array.from(document.querySelectorAll(".cell"));
const lightbox = document.getElementById("lightbox");
const img = document.getElementById("lightbox-img");
const video = document.getElementById("lightbox-video");
const closeButton = document.getElementById("lightbox-close");
let index = 0;
let returnFocus = null;

function show(i) {
    index = (i + cells.length) % cells.length;
    const cell = cells[index];
    const alt = cell.querySelector("img").alt;
    if (cell.dataset.video) {
        img.hidden = true;
        img.removeAttribute("src");
        video.hidden = false;
        video.poster = cell.dataset.poster;
        video.src = cell.dataset.video;
        video.setAttribute("aria-label", alt);
        video.play().catch(() => {});
    } else {
        video.pause();
        video.hidden = true;
        video.removeAttribute("src");
        img.hidden = false;
        img.src = cell.dataset.full;
        img.alt = alt;
    }
    history.replaceState(null, "", "#" + (index + 1));
}

function open(i) {
    show(i);
    lightbox.classList.add("is-open");
    lightbox.inert = false;
    document.body.classList.add("lb-open");
    returnFocus = document.activeElement;
    closeButton.focus();
}

function close() {
    video.pause();
    lightbox.classList.remove("is-open");
    lightbox.inert = true;
    document.body.classList.remove("lb-open");
    history.replaceState(null, "", location.pathname);
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
}

const isOpen = () => lightbox.classList.contains("is-open");

cells.forEach((cell, i) => cell.addEventListener("click", () => open(i)));
closeButton.addEventListener("click", close);
document.getElementById("lightbox-prev").addEventListener("click", () => show(index - 1));
document.getElementById("lightbox-next").addEventListener("click", () => show(index + 1));
lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
});
document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
});

// A mostly horizontal swipe of 40px or more steps to the next or previous item.
let touch = null;
lightbox.addEventListener("touchstart", (e) => {
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
lightbox.addEventListener("touchend", (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
});

// A link such as gallery.html#7 opens the seventh item.
const start = parseInt(location.hash.slice(1), 10);
if (start >= 1 && start <= cells.length) open(start - 1);
