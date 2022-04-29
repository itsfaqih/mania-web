import { timeToSeconds, renderCss, getKeyByValue } from "./helpers.js";

export class Game {
  animationCss = "";
  music = null;
  speed = 0.5;
  skipTime = 0;
  combo = 0;
  tolerance = 0.1;
  timeCounter = null;
  failChecker = null;
  time = 0;
  elements = {
    overlay: {
      container: document.getElementById("overlay"),
      title: document.getElementById("overlay-title"),
    },
    wrapper: document.getElementById("wrapper"),
    lines: {
      1: document.getElementById("line-1"),
      2: document.getElementById("line-2"),
      3: document.getElementById("line-3"),
      4: document.getElementById("line-4"),
    },
    keys: {
      1: document.getElementById("key-1"),
      2: document.getElementById("key-2"),
      3: document.getElementById("key-3"),
      4: document.getElementById("key-4"),
    },
    combo: document.getElementById("combo"),
  };
  beats = {
    1: [],
    2: [],
    3: [],
    4: [],
  };
  keybinds = {
    1: "d",
    2: "f",
    3: "j",
    4: "k",
  };
  isStarted = false;
  isPaused = false;

  initEventListener() {
    document.addEventListener("keydown", (e) => {
      if (!this.isStarted && e.key === "Enter") {
        this.start();
      }

      if (this.isStarted && this.isPaused && e.key === "Enter") {
        this.resume();
      }

      if (this.isStarted && !this.isPaused) {
        if (Object.values(this.keybinds).includes(e.key)) {
          this.handleKey(e.key, "down");
        }

        if (e.key === "Escape") {
          this.pause();
        }

        const hasPassedSkipTime = this.music.currentTime >= this.skipTime;

        if (!hasPassedSkipTime && e.key === " ") {
          this.skipToMain();
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      if (this.isStarted && !this.isPaused) {
        if (Object.values(this.keybinds).includes(e.key)) {
          this.handleKey(e.key, "up");
        }
      }
    });
  }

  async load(beatmap) {
    const createBeatElement = (id, key) => {
      const color = key === 1 || key === 4 ? "bg-blue-300" : "bg-red-300";

      return `<div id="beat-${id}" class="absolute w-full h-full transition duration-500">
        <div class="-mt-8 h-8 w-full ${color} absolute"></div>
      </div>`;
    };

    return await fetch(`${beatmap}/beatmap.json`)
      .then((res) => res.json())
      .then((data) => {
        this.skipTime = timeToSeconds(data.skipTime);

        this.music = new Audio(`${beatmap}/music.mp3`);

        data.beats.forEach((beat, index) => {
          this.animationCss += `#beat-${index} {
              animation: beat linear ${this.speed}s;
              animation-delay: ${timeToSeconds(beat.time) - this.speed}s;
            }
            
            .pause #beat-${index} {
              animation-play-state: paused !important;
            }`;

          this.beats[beat.key].push({
            time: timeToSeconds(beat.time),
            id: index,
            pressed: false,
          });
        });

        this.elements.lines[1].innerHTML = this.beats[1]
          .map((beat) => createBeatElement(beat.id, 1))
          .join("");
        this.elements.lines[2].innerHTML = this.beats[2]
          .map((beat) => createBeatElement(beat.id, 2))
          .join("");
        this.elements.lines[3].innerHTML = this.beats[3]
          .map((beat) => createBeatElement(beat.id, 3))
          .join("");
        this.elements.lines[4].innerHTML = this.beats[4]
          .map((beat) => createBeatElement(beat.id, 4))
          .join("");
      })
      .then(() => {
        this.initEventListener();

        return { isLoaded: true };
      });
  }

  handleKey(key, type) {
    const pressedKey = getKeyByValue(this.keybinds, key);
    const keyClassList = this.elements.keys[pressedKey].classList;

    switch (type) {
      case "down":
        keyClassList.remove("bg-gray-700");
        keyClassList.add("bg-gray-600");

        const pressedTime = this.music.currentTime;

        const pressedBeat = this.beats[pressedKey].findIndex((beat) => {
          return (
            Math.abs(beat.time - pressedTime) <= this.tolerance && !beat.pressed
          );
        });

        if (pressedBeat !== -1) {
          this.beats[pressedKey][pressedBeat].pressed = true;

          this.elements.keys[pressedKey].classList.remove("border-t-gray-700");
          this.elements.keys[pressedKey].classList.add("border-t-green-500");

          this.combo += 1;
          this.elements.combo.textContent = this.combo;
        }

        break;
      default:
        keyClassList.remove("bg-gray-600");
        keyClassList.add("bg-gray-700");

        this.elements.keys[pressedKey].classList.add("border-t-gray-700");
        this.elements.keys[pressedKey].classList.remove("border-t-green-500");

        break;
    }
  }

  startTimeCounter() {
    this.timeCounter = setInterval(() => {
      this.time++;
    }, 1000);
  }

  startFailChecker() {
    this.failChecker = setInterval(() => {
      if (this.combo === 0) {
        return;
      }

      Object.values(this.beats).forEach((beats) => {
        const nearestUnpressedBeat = beats.findIndex((beat) => {
          return (
            Math.abs(beat.time - this.music.currentTime) <= this.tolerance &&
            !beat.pressed
          );
        });

        if (nearestUnpressedBeat !== -1) {
          this.combo = 0;

          this.elements.combo.textContent = this.combo;
        }
      });
    }, (this.tolerance + this.speed) * 1000);
  }

  pauseTimeCounter() {
    clearInterval(this.timeCounter);
  }

  pauseFailChecker() {
    clearInterval(this.failChecker);
  }

  start() {
    this.isStarted = true;

    this.elements.overlay.container.classList.add("hidden");
    this.setOverlayTitle("Game paused. Press enter to resume");

    this.music.play().then(() => {
      renderCss(this.animationCss);
      this.startTimeCounter();
      this.startFailChecker();
    });
  }

  pause() {
    this.isPaused = true;

    this.elements.overlay.container.classList.remove("hidden");
    this.elements.wrapper.classList.add("pause");

    this.music.pause();
    this.pauseTimeCounter();
    this.pauseFailChecker();

    console.log(this.beats);
  }

  resume() {
    this.isPaused = false;

    this.elements.overlay.container.classList.add("hidden");
    this.elements.wrapper.classList.remove("pause");

    this.music.play();
    this.startTimeCounter();
    this.startFailChecker();
  }

  skipToMain() {
    const skipTime = this.skipTime - this.music.currentTime;

    let animationCss = "";

    Object.values(this.beats).forEach((beats) => {
      beats.forEach((beat) => {
        animationCss += `
              .skip #beat-${beat.id} {
                animation: beat linear ${this.speed}s;
                animation-delay: ${beat.time - this.speed - skipTime}s;
              }`;
      });
    });

    renderCss(animationCss);

    this.music.currentTime = this.skipTime;

    this.elements.wrapper.classList.add("skip");
  }

  setOverlayTitle(text) {
    this.elements.overlay.title.textContent = text;
  }
}
