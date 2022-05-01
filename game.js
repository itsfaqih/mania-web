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
  pauseTimeout = 3;
  time = 0;
  elements = {
    overlay: {
      container: document.getElementById("overlay"),
      title: document.getElementById("overlay-title"),
    },
    wrapper: document.getElementById("wrapper"),
    track: {
      1: document.getElementById("track-1"),
      2: document.getElementById("track-2"),
      3: document.getElementById("track-3"),
      4: document.getElementById("track-4"),
    },
    controls: {
      1: document.getElementById("control-1"),
      2: document.getElementById("control-2"),
      3: document.getElementById("control-3"),
      4: document.getElementById("control-4"),
    },
    combo: document.getElementById("combo"),
    interface: document.getElementById("interface"),
    skip: {
      container: document.getElementById("skip"),
      button: document.getElementById("skip-button"),
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
  isPaused = true;
  isResuming = false;

  initEventListener() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (!this.isStarted) {
          this.start();
        } else if (!this.isResuming && this.isPaused) {
          this.resume();
        }
      }

      if (this.isStarted && !this.isPaused && !this.isResuming) {
        if (Object.values(this.keybinds).includes(e.key)) {
          this.handleKey(e.key, "down");
        }

        if (e.key === "Escape") {
          if (this.isStarted && !this.isPaused && !this.isResuming) {
            this.pause();
          }
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

    this.elements.skip.button.addEventListener("click", () => {
      this.skipToMain();
    });
  }

  async load(beatmap) {
    const createBeatElement = (id, key) => {
      const color = key === 1 || key === 4 ? "bg-blue-400" : "bg-red-400";

      return `<div id="beat-${id}" class="absolute w-full h-full transition duration-500 opacity-0">
        <div class="w-full ${color} absolute"></div>
      </div>`;
    };

    return await fetch(`${beatmap}/beatmap.json`)
      .then((res) => res.json())
      .then((data) => {
        this.skipTime = timeToSeconds(data.skipTime);

        this.music = new Audio(`${beatmap}/music.mp3`);

        data.beats.forEach((beat, index) => {
          const noteBaseHeight = 2;
          const noteHeight = beat.end
            ? (timeToSeconds(beat.end) - timeToSeconds(beat.start)) * 10 * 2
            : noteBaseHeight;

          this.animationCss += `#beat-${index} {
              animation: beat linear ${this.speed}s;
              animation-delay: ${timeToSeconds(beat.start) - this.speed}s;
              animation-fill-mode: forwards;
            }

            #beat-${index} div {
              height: ${noteHeight}rem;
              ${
                beat.end
                  ? `transform: translateY(-${noteHeight - noteBaseHeight}rem);`
                  : ""
              }
            }
            
            .pause #beat-${index} {
              animation-play-state: paused !important;
            }`;

          this.beats[beat.key].push({
            start: timeToSeconds(beat.start),
            end: beat.end ? timeToSeconds(beat.end) : null,
            key: beat.key,
            id: index,
            pressed: false,
          });
        });

        this.elements.track[1].innerHTML = this.beats[1]
          .map((beat) => createBeatElement(beat.id, 1))
          .join("");
        this.elements.track[2].innerHTML = this.beats[2]
          .map((beat) => createBeatElement(beat.id, 2))
          .join("");
        this.elements.track[3].innerHTML = this.beats[3]
          .map((beat) => createBeatElement(beat.id, 3))
          .join("");
        this.elements.track[4].innerHTML = this.beats[4]
          .map((beat) => createBeatElement(beat.id, 4))
          .join("");
      })
      .then(() => {
        this.initEventListener();

        this.setOverlayTitle("Press Enter to Start");

        return { isLoaded: true };
      })
      .catch((err) => {
        console.error(err);
        this.setOverlayTitle("An error occured");
      });
  }

  handleKey(key, type) {
    const pressedKey = getKeyByValue(this.keybinds, key);
    const keyClassList = this.elements.controls[pressedKey].classList;

    switch (type) {
      case "down":
        keyClassList.remove("bg-gray-700");
        keyClassList.add("bg-gray-600");

        const pressedTime = this.music.currentTime;

        const pressedBeat = this.beats[pressedKey].findIndex((beat) => {
          return (
            Math.abs(beat.start - pressedTime) <= this.tolerance &&
            !beat.pressed
          );
        });

        if (pressedBeat !== -1) {
          this.beats[pressedKey][pressedBeat].pressed = true;

          this.elements.controls[pressedKey].classList.remove(
            "border-t-gray-700"
          );
          this.elements.controls[pressedKey].classList.add(
            "border-t-green-500"
          );

          this.combo += 1;
          this.elements.combo.textContent = this.combo;
        }

        break;
      default:
        keyClassList.remove("bg-gray-600");
        keyClassList.add("bg-gray-700");

        this.elements.controls[pressedKey].classList.add("border-t-gray-700");
        this.elements.controls[pressedKey].classList.remove(
          "border-t-green-500"
        );

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
      const beats = Object.values(this.beats)
        .reduce((prev, cur) => [...prev, ...cur], [])
        .sort((a, b) => a.id - b.id);

      const nearestCurrentBeatIndex = beats.findIndex((beat) => {
        return Math.abs(beat.start - this.music.currentTime) <= this.tolerance;
      });

      if (nearestCurrentBeatIndex === -1) {
        return;
      }

      const currentBeat = beats[nearestCurrentBeatIndex];
      const previousBeat = beats[nearestCurrentBeatIndex - 1];
      const isFirstBeat = nearestCurrentBeatIndex === 0;

      if (isFirstBeat || (!isFirstBeat && currentBeat.id !== previousBeat.id)) {
        setTimeout(() => {
          const currentBeatKeyIndex = this.beats[currentBeat.key].findIndex(
            (beat) => {
              return beat.id === currentBeat.id;
            }
          );

          if (!this.beats[currentBeat.key][currentBeatKeyIndex].pressed) {
            this.combo = 0;

            this.elements.combo.textContent = this.combo;

            this.showFailKeyIndicator(currentBeat.key);
          }
        }, this.tolerance * 1000);
      }
    }, 50);
  }

  pauseTimeCounter() {
    clearInterval(this.timeCounter);
  }

  pauseFailChecker() {
    clearInterval(this.failChecker);
  }

  start() {
    this.isStarted = true;
    this.isPaused = false;

    this.elements.overlay.container.classList.add("hidden");

    this.music.play().then(() => {
      renderCss(this.animationCss);
      this.startTimeCounter();
      this.startFailChecker();
    });

    this.elements.interface.classList.remove("hidden");
  }

  pause() {
    this.isPaused = true;

    this.setOverlayTitle("Game paused. Press enter to resume");
    this.elements.overlay.container.classList.remove("hidden");
    this.elements.wrapper.classList.add("pause");

    this.music.pause();
    this.pauseTimeCounter();
    this.pauseFailChecker();
  }

  resume() {
    this.isResuming = true;
    let countDown = this.pauseTimeout;
    this.setOverlayTitle(`Resuming in ${countDown}`);

    const timeoutCountdown = setInterval(() => {
      --countDown;
      this.setOverlayTitle(`Resuming in ${countDown}`);
    }, 1000);

    setTimeout(() => {
      clearInterval(timeoutCountdown);
      this.isPaused = false;
      this.isResuming = false;

      this.elements.overlay.container.classList.add("hidden");
      this.elements.wrapper.classList.remove("pause");
      this.setOverlayTitle("");

      this.music.play();
      this.startTimeCounter();
      this.startFailChecker();
    }, this.pauseTimeout * 1000);
  }

  skipToMain() {
    const skipTime = this.skipTime - this.music.currentTime;

    let animationCss = "";

    Object.values(this.beats).forEach((beats) => {
      beats.forEach((beat) => {
        animationCss += `
              .skip #beat-${beat.id} {
                animation: beat linear ${this.speed}s;
                animation-delay: ${
                  beat.start - this.speed - skipTime + this.tolerance
                }s;
                animation-fill-mode: forwards;
              }`;
      });
    });

    renderCss(animationCss);

    this.music.currentTime = this.skipTime;

    this.elements.wrapper.classList.add("skip");
    this.elements.skip.container.classList.add("hidden");
  }

  setOverlayTitle(text) {
    this.elements.overlay.title.textContent = text;
  }

  showFailKeyIndicator(key) {
    this.elements.controls[key].classList.remove("border-t-gray-700");
    this.elements.controls[key].classList.add("border-t-red-500");

    setTimeout(() => {
      this.elements.controls[key].classList.remove("border-t-red-500");
      this.elements.controls[key].classList.add("border-t-gray-700");
    }, 100);
  }
}
