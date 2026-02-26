import { animate, stagger, splitText, type TextSplitter } from "animejs";
import navContent from "./pages/nav.html?raw";
import homeContent from "./pages/home.html?raw";
import aboutContent from "./pages/about.html?raw";
import workContent from "./pages/work.html?raw";
import arrowUpRight from "./assets/arrow-up-right.svg?raw";

// ── Text Shine Effect ───────────────────────────────────────────────

interface ShineOptions {
  baseOpacity?: string;
  shineOpacity?: string;
  duration?: number;
  staggerDelay?: number;
  interval?: number;
  initialDelay?: number;
}

function textShine(el: HTMLElement | TextSplitter, options: ShineOptions = {}): TextSplitter {
  const {
    baseOpacity = "1.0",
    shineOpacity = "0.0",
    duration = 1200,
    staggerDelay = 30,
    interval = 4000,
    initialDelay = 500,
  } = options;

  const splitter = "chars" in el ? el : splitText(el, { chars: true });

  for (const char of splitter.chars) {
    (char as HTMLElement).style.opacity = baseOpacity;
  }

  const runShine = () => {
    animate(splitter.chars, {
      opacity: [baseOpacity, shineOpacity, baseOpacity],
      delay: stagger(staggerDelay),
      duration,
      ease: "inOutSine",
    });
  };

  setTimeout(() => {
    runShine();
    setInterval(runShine, interval);
  }, initialDelay);

  return splitter;
}

// ── Text Scramble Effect ─────────────────────────────────────────────

const SCRAMBLE_CHARS = "##·$%&/=€|()@+09*+]}{[";

interface ScrambleOptions {
  fakeCount?: number;        // number of fake chars per real char (default 2)
  charStagger?: number;      // delay between each char in seconds (default 0.05)
  fakeDuration?: number;     // how long each fake char is visible in seconds (default 0.16)
  fakeStagger?: number;      // delay between fake chars within a single char (default 0.016)
  revealDuration?: number;   // duration for the real char fade-in (default 0.3)
  startDelay?: number;       // delay before animation starts in seconds (default 0)
}

/**
 * Prepares an element for the scramble effect by splitting text into chars
 * and inserting fake character spans. The element is hidden until animated.
 * Returns a cleanup function to call scrambleReveal or scrambleSweep.
 */
function scramblePrepare(el: HTMLElement, fakeCount = 2): void {
  const splitter = splitText(el, { chars: true });

  for (const char of splitter.chars) {
    const htmlEl = char as HTMLElement;
    const original = htmlEl.innerHTML;
    htmlEl.innerHTML = `<span class="scramble-real">${original}</span>`;

    for (let i = 0; i < fakeCount; i++) {
      const rnd = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      htmlEl.insertAdjacentHTML(
        "afterbegin",
        `<span class="scramble-fake" style="display:none;position:absolute;left:0" aria-hidden="true">${rnd}</span>`
      );
    }

    htmlEl.style.position = "relative";
    htmlEl.style.display = "inline-block";
  }
}

/**
 * Reveals text from hidden state with scramble effect (left to right).
 * Call scramblePrepare first.
 */
function scrambleReveal(el: HTMLElement, options: ScrambleOptions = {}): void {
  const {
    charStagger = 0.05,
    fakeDuration = 0.16,
    fakeStagger = 0.016,
    revealDuration = 0.3,
    startDelay = 0,
  } = options;

  // Find char wrappers that contain our scramble spans
  const chars = Array.from(el.querySelectorAll<HTMLElement>(".scramble-real"))
    .map((real) => real.parentElement!);

  // Hide everything initially, then reveal
  el.style.opacity = "1";
  chars.forEach((char) => {
    char.querySelector<HTMLElement>(".scramble-real")!.style.opacity = "0";
  });

  chars.forEach((char, i) => {
    const real = char.querySelector<HTMLElement>(".scramble-real")!;
    const fakes = char.querySelectorAll<HTMLElement>(".scramble-fake");
    const baseDelay = startDelay + i * charStagger;

    // Show and then hide each fake char in sequence
    fakes.forEach((fake, fi) => {
      const fakeDelay = baseDelay + (fi + 1) * fakeStagger;

      setTimeout(() => {
        fake.style.display = "block";
        fake.style.opacity = "1";
      }, fakeDelay * 1000);

      setTimeout(() => {
        fake.style.display = "none";
      }, (fakeDelay + fakeDuration) * 1000);
    });

    // Fade in the real character
    setTimeout(() => {
      real.style.transition = `opacity ${revealDuration}s ease`;
      real.style.opacity = "1";
    }, baseDelay * 1000);
  });
}

/**
 * Sweeps the scramble effect across already-prepared text.
 * Briefly shows fakes over each char in sequence, then restores.
 * Call scramblePrepare first.
 */
function scrambleSweep(el: HTMLElement, options: ScrambleOptions = {}, newChars?: string[], transform: (e: HTMLElement) => void = (e) => { }): () => void {
  const {
    charStagger = 0.05,
    fakeDuration = 0.12,
    fakeStagger = 0.016,
    startDelay = 0,
  } = options;

  let transformCancelled = false;

  const reals = Array.from(el.querySelectorAll<HTMLElement>(".scramble-real"));
  let sweepIndex = 0;

  reals.forEach((real, i) => {
    const char = real.parentElement!;
    const fakes = char.querySelectorAll<HTMLElement>(".scramble-fake");
    const newChar = newChars ? newChars[i] : null;

    // Skip chars that haven't changed (when updating text)
    //if (newChars && newChar === real.textContent) return;

    const baseDelay = startDelay + sweepIndex * charStagger;
    sweepIndex++;

    // Re-randomize fake chars each sweep
    fakes.forEach((fake) => {
      fake.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      if (!transformCancelled) transform(fake);
    });

    // Hide real, show fakes in sequence, then restore
    setTimeout(() => {
      real.style.opacity = "0";
      // Update text as soon as possible (while hidden) so subsequent checks see new value
      if (newChar != null) {
        real.textContent = newChar;
      }
    }, baseDelay * 1000);

    fakes.forEach((fake, fi) => {
      const fakeDelay = baseDelay + fi * fakeStagger;

      setTimeout(() => {
        fake.style.display = "block";
        fake.style.opacity = "1";
      }, fakeDelay * 1000);

      setTimeout(() => {
        fake.style.display = "none";
      }, (fakeDelay + fakeDuration) * 1000);
    });

    // Restore real char
    const restoreDelay = baseDelay + fakes.length * fakeStagger + fakeDuration;
    setTimeout(() => {
      real.style.opacity = "1";
      if (!transformCancelled) transform(real);
    }, restoreDelay * 1000);
  });

  return () => { transformCancelled = true; };
}

/**
 * Returns the current text of each prepared char span.
 */
function scrambleGetChars(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll<HTMLElement>(".scramble-real"))
    .map((real) => real.textContent || "");
}

// ── Page Class ──────────────────────────────────────────────────────

class Page {
  private container: HTMLElement;
  private html: string;

  constructor(container: HTMLElement, html: string) {
    this.container = container;
    this.html = html;
  }

  create(): void {
    this.container.innerHTML = this.html;
  }

  show(): Promise<void> {
    return new Promise((resolve) => {
      this.container.style.opacity = "0";
      this.container.style.transition = "opacity 0.4s ease";
      void this.container.offsetHeight;
      this.container.style.opacity = "1";
      this.container.addEventListener("transitionend", () => resolve(), { once: true });
    });
  }

  hide(): Promise<void> {
    return new Promise((resolve) => {
      this.container.style.transition = "opacity 0.3s ease";
      this.container.style.opacity = "0";
      this.container.addEventListener("transitionend", () => resolve(), { once: true });
    });
  }
}

// ── Router ──────────────────────────────────────────────────────────

interface Route {
  path: string;
  label: string;
  html: string;
}

class Router {
  private routes: Route[];
  private onNavigate: (path: string) => void;

  constructor(routes: Route[], onNavigate: (path: string) => void) {
    this.routes = routes;
    this.onNavigate = onNavigate;

    window.addEventListener("popstate", () => {
      this.onNavigate(window.location.pathname);
    });

    document.addEventListener("click", (e) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.endsWith(".pdf")) return;

      e.preventDefault();
      this.push(href);
    });
  }

  push(path: string): void {
    if (path === window.location.pathname) return;
    window.history.pushState(null, "", path);
    this.onNavigate(path);
  }

  resolve(path: string): Route | undefined {
    return this.routes.find((r) => r.path === path);
  }
}

// ── App ─────────────────────────────────────────────────────────────

class App {
  private root: HTMLElement;
  private contentEl!: HTMLElement;
  private router: Router;
  private currentPage: Page | null = null;

  private routes: Route[] = [
    { path: "/", label: "HOME", html: homeContent },
    { path: "/about", label: "ABOUT", html: aboutContent },
    { path: "/work", label: "WORK", html: workContent },
  ];

  private links = [
    { label: "GITHUB", url: "https://github.com/reed-evans" },
    { label: "LINKEDIN", url: "https://www.linkedin.com/in/reedaevans/" },
    { label: "READ.CV", url: "https://cv.reedevans.com" }
  ]

  constructor() {
    const el = document.getElementById("app");
    if (!el) throw new Error("Missing #app element");
    this.root = el;

    this.createDOM();
    this.router = new Router(this.routes, (path) => this.navigate(path));
    this.navigate(window.location.pathname);

    const quote = document.getElementById("quote")!;
    scramblePrepare(quote);
    const r43 = document.getElementById("r43")!;
    scramblePrepare(r43);

    const dt = document.querySelector<HTMLElement>(".nav_datetime")!;
    const loc = document.querySelector<HTMLElement>(".nav_location")!;
    scrambleReveal(dt, { startDelay: 0.5 });
    scrambleReveal(loc, { startDelay: 0.5 });
    scrambleReveal(quote, { startDelay: 0.5 });
    scrambleReveal(r43, { startDelay: 0.5 });
  }

  private createDOM(): void {
    this.root.insertAdjacentHTML("beforeend", navContent);

    const navLeft = this.root.querySelector(".nav_left")!;
    const navRight = this.root.querySelector(".nav_right")!;
    const navMiddle = this.root.querySelector(".nav_middle")!;

    const navText = document.createElement("span");
    navText.className = "nav_text";
    navText.textContent = "REED_EVANS";
    navMiddle.appendChild(navText);

    const navLocation = document.createElement("span");
    navLocation.className = "nav_location";
    navLocation.textContent = "BOSTON_US";
    const navDateTime = document.createElement("span");
    navDateTime.className = "nav_datetime";
    navDateTime.textContent = this.getESTDateTime();
    navLeft.appendChild(navLocation);
    navLeft.appendChild(navDateTime);

    scramblePrepare(navLocation);
    scramblePrepare(navDateTime);

    setInterval(() => {
      const currentChars = scrambleGetChars(navDateTime);
      // Strip spaces to match the prepared char spans (splitText skips spaces)
      const nextText = this.getESTDateTime();
      const nextChars = [...nextText].filter((c) => c !== " ");
      const changed = nextChars.some((c, i) => c !== currentChars[i]);
      if (changed) {
        scrambleSweep(navDateTime, {}, nextChars);
      }
    }, 2_000);

    /** Can uncomment when other pages are added and navigation is needed */
    // for (const route of this.routes) {
    //   const a = document.createElement("a");
    //   a.href = route.path;
    //   a.textContent = route.label;
    //   navRight.appendChild(a);
    // }

    for (const link of this.links) {
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.innerHTML = `${link.label}<i class="icon-external">${arrowUpRight}</i>`;
      scramblePrepare(a);
      let cancelSweep: (() => void) | null = null;
      a.addEventListener("mouseenter", function () {
        cancelSweep = scrambleSweep(this, { charStagger: 0.03, fakeDuration: 0.1 }, undefined, function (e: HTMLElement) { e.style.color = "black" });
      });
      a.addEventListener("mouseleave", function () {
        if (cancelSweep) cancelSweep();
        const els = this.querySelectorAll<HTMLElement>(".scramble-real")
        for (const el of els) {
          el.style.color = "#8A8A8A";
        }
      })
      navRight.appendChild(a);
    }

    this.contentEl = document.createElement("div");
    this.contentEl.id = "content";
    this.root.appendChild(this.contentEl);

    const navSplitter = textShine(navText, { initialDelay: 500, duration: 1000 });
    textShine(navSplitter, { initialDelay: 1300, duration: 600 });
    this.initParallax();
  }

  private initParallax(): void {
    const maxShift = 5; // percent of background shift
    let targetX = 50;
    let targetY = 0;
    let currentX = 50;
    let currentY = 0;

    document.addEventListener("mousemove", (e) => {
      targetX = 50 + ((e.clientX / window.innerWidth) - 0.5) * maxShift * 2;
      targetY = 0 + (e.clientY / window.innerHeight) * maxShift;
    });

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      currentX = lerp(currentX, targetX, 0.08);
      currentY = lerp(currentY, targetY, 0.08);
      document.body.style.backgroundPosition = `${currentX}% ${currentY}%`;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  private getESTDateTime(): string {
    const now = new Date();
    const day = now.toLocaleString("en-US", { timeZone: "America/New_York", day: "2-digit" });
    const month = now.toLocaleString("en-US", { timeZone: "America/New_York", month: "short" }).toUpperCase();
    const year = now.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric" });
    const time = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day}_${month}_${year} ${time}`;
  }

  private async navigate(path: string): Promise<void> {
    const route = this.router.resolve(path) ?? this.routes[0];

    if (this.currentPage) {
      await this.currentPage.hide();
    }

    const page = new Page(this.contentEl, route.html);
    page.create();
    await page.show();
    this.currentPage = page;
  }
}

// ── Bootstrap ───────────────────────────────────────────────────────

new App();
