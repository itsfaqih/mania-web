import { timeToSeconds, renderCss, getKeyByValue } from "./helpers.js";

export class Game {
  animationCss = "";
  music = null;
  speed = 0.5;
  skipTime = 0;
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

  constructor(beatmap) {
    this.loadBeatmap.bind(this);
    this.start.bind(this);
    this.pause.bind(this);
    this.resume.bind(this);
    this.skipToMain.bind(this);
    this.handleKey.bind(this);

    if (!beatmap) {
      throw new Error("No beatmap provided");
    }
    
    this.loadBeatmap(`${beatmap}/beatmap.json`);
    this.music = new Audio(`${beatmap}/music.mp3`);

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

  loadBeatmap(path) {
    const createBeat = (id) => {
      return `<div id="beat-${id}" class="absolute w-full h-full transition duration-500">
        <div class="-mt-8 h-8 w-full bg-blue-200 absolute"></div>
      </div>`;
    };

    fetch(path)
      .then((res) => res.json())
      .then((data) => {
        this.skipTime = timeToSeconds(data.skipTime);

        data.beats.forEach((beat, index) => {
          this.animationCss += `#beat-${index} {
              animation: beat linear ${this.speed}s;
              animation-delay: ${timeToSeconds(beat.time) - this.speed}s;
            }
            
            .skip #beat-${index} {
              animation: beat linear ${this.speed}s;
              animation-delay: ${
                timeToSeconds(beat.time) - this.speed - this.skipTime + 1.5
              }s;
            }
            
            .pause #beat-${index} {
              animation-play-state: paused;
            }`;

          this.beats[beat.key].push(createBeat(index));
        });
      })
      .then(() => {
        this.elements.lines[1].innerHTML = this.beats[1].join("");
        this.elements.lines[2].innerHTML = this.beats[2].join("");
        this.elements.lines[3].innerHTML = this.beats[3].join("");
        this.elements.lines[4].innerHTML = this.beats[4].join("");
      });
  }

  handleKey(key, type) {
    const pressedKey = getKeyByValue(this.keybinds, key);
    const keyClassList = this.elements.keys[pressedKey].classList;

    switch (type) {
      case "down":
        keyClassList.remove("bg-gray-700");
        keyClassList.add("bg-gray-600");
        break;
      default:
        keyClassList.remove("bg-gray-600");
        keyClassList.add("bg-gray-700");
        break;
    }
  }

  start() {
    this.isStarted = true;

    this.elements.overlay.container.classList.add("hidden");
    this.elements.overlay.title.textContent =
      "Game paused. Press enter to resume";

    this.music.play().then(() => {
      renderCss(this.animationCss);
    });
  }

  pause() {
    this.isPaused = true;

    this.elements.overlay.container.classList.remove("hidden");
    this.elements.wrapper.classList.add("pause");

    this.music.pause();
  }

  resume() {
    this.isPaused = false;

    this.elements.overlay.container.classList.add("hidden");
    this.elements.wrapper.classList.remove("pause");

    this.music.play();
  }

  skipToMain() {
    this.music.currentTime = this.skipTime;
    this.elements.wrapper.classList.add("skip");
  }
}
