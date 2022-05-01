import { timeToMiliseconds, timeToSeconds } from "./helpers.js";

export class Game {
  beatmap = {
    song: null,
    notes: [],
  };
  controlKeys = ["d", "f", "j", "k"];
  borderWidth = 2;
  wrapperWidth = 560;
  trackWidth = this.wrapperWidth / 4;
  tileHeight = 28;
  tracks = [];
  controls = [];
  combo = 0;
  score = 0;
  scoreMultiplier = 1;
  tolerance = 100;
  latestCollidedNote = null;
  isStarted = false;
  isPaused = false;
  isResuming = false;

  constructor(canvas) {
    if (!canvas) {
      throw new Error("No canvas provided");
    }

    this.canvas = canvas;

    if (!this.canvas.getContext) {
      throw new Error("No canvas.getContext");
    }

    this.ctx = this.canvas.getContext("2d");

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.controlHeight = parseInt(this.canvas.height / 6);
    this.trackStartPosition =
      this.canvas.width / 2 - this.wrapperWidth / 2 - 4 * this.borderWidth;
    this.trackHeight =
      this.canvas.height - (this.controlHeight + this.tileHeight);

    this.controlKeys.forEach((key, index) => {
      const track = new Track(this, index);
      this.tracks.push(track);

      const control = new Control(this, index);
      this.controls.push(control);
    });

    this.render();
    this.initEventListeners();
  }

  render() {
    // background
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderTracks();
    this.renderControls();
  }

  renderTracks() {
    this.ctx.fillStyle = "#334155";
    this.ctx.fillRect(
      this.canvas.width / 2 - this.wrapperWidth / 2 - this.borderWidth * 5,
      0,
      this.wrapperWidth + this.borderWidth * 5,
      this.trackHeight
    );

    this.tracks.forEach((track) => {
      track.render();
    });
  }

  renderControls() {
    this.ctx.fillStyle = "#334155";
    this.ctx.fillRect(
      this.canvas.width / 2 - this.wrapperWidth / 2 - this.borderWidth * 5,
      this.trackHeight + this.tileHeight,
      this.wrapperWidth + this.borderWidth * 5,
      this.controlHeight
    );

    this.controls.forEach((control) => {
      control.render();
    });
  }

  renderCombo() {
    this.ctx.fillStyle = "white";
    this.ctx.font = "4rem Plus Jakarta Sans";
    this.ctx.textAlign = "left";

    this.ctx.fillText(`${this.combo}x`, 80, this.canvas.height - 80);
  }

  renderScore() {
    this.ctx.fillStyle = "white";
    this.ctx.font = "3rem Plus Jakarta Sans";
    this.ctx.textAlign = "right";

    const score = this.score.toString().padStart(10, "0");
    this.ctx.fillText(`${score}`, this.canvas.width - 80, 80);
  }

  initEventListeners() {
    window.addEventListener("keydown", (e) => {
      this.handleUserInput(e.key, "keydown");
    });

    window.addEventListener("keyup", (e) => {
      this.handleUserInput(e.key, "keyup");
    });
  }

  async loadBeatmap(path) {
    await fetch(`${path}/beatmap.json`)
      .then((res) => res.json())
      .then((beatmap) => {
        this.beatmap = {
          song: new Audio(beatmap.song),
          skipTime: timeToSeconds(beatmap.skipTime),
          notes: beatmap.notes.map((note) => {
            return new Note(
              this,
              note.key,
              timeToMiliseconds(note.start),
              timeToMiliseconds(note.end)
            );
          }),
        };
      });
  }

  renderPlay() {
    requestAnimationFrame(this.renderPlay.bind(this));

    // clear track
    this.ctx.clearRect(0, 0, this.canvas.width, this.trackHeight);

    // clear sides
    this.ctx.clearRect(
      0,
      this.trackHeight,
      (this.canvas.width - this.trackWidth * 4) / 2 - this.borderWidth * 6,
      this.canvas.height - this.trackHeight
    );

    this.ctx.clearRect(
      this.canvas.width + this.trackWidth + this.borderWidth,
      this.trackHeight,
      (this.canvas.width - this.trackWidth) / 2,
      this.canvas.height - this.trackHeight
    );

    this.handleCollision();
    this.handleMissedNote();

    this.scoreMultiplier = 1 + this.combo / 100;

    this.renderTracks();
    this.renderCombo();
    this.renderScore();

    this.beatmap.notes.forEach((note) => {
      note.render();
    });
  }

  handleUserInput(key, type) {
    if (this.controlKeys.includes(key)) {
      this.handleControlInput(key, type);
    }

    if (type === "keydown") {
      if (key === "Enter") {
        this.actionPlay();
      }

      if (key === " ") {
        this.actionSkip();
      }

      if (key === "Escape") {
        this.actionResume();
        this.actionPause();
      }
    }
  }

  handleControlInput(key, type) {
    if (type === "keydown") {
      this.controls[this.controlKeys.indexOf(key)].render("active");
      this.handlePressedNote(key);
    } else if (type === "keyup") {
      this.controls[this.controlKeys.indexOf(key)].render("inactive");
    }
  }

  handleCollision() {
    this.beatmap.notes.forEach((note) => {
      const elapsedTime = this.getElapsedTime();
      const isColliding = Math.abs(elapsedTime - note.start) < this.tolerance;

      if (isColliding) {
        this.latestCollidedNote = note;
      }
    });
  }

  handlePressedNote(key) {
    const isPressed =
      this.latestCollidedNote && this.latestCollidedNote.key === key;

    if (!isPressed) {
      return;
    }

    this.latestCollidedNote.pressed = true;
    this.combo += 1;
    this.score += 100 * this.scoreMultiplier;
  }

  handleMissedNote() {
    if (!this.latestCollidedNote) {
      return;
    }

    const elapsedTime = this.getElapsedTime();
    const passedTolerance =
      elapsedTime - this.latestCollidedNote.start > this.tolerance;

    if (passedTolerance && this.latestCollidedNote.pressed === false) {
      this.combo = 0;
    }
  }

  actionPlay() {
    if (this.isStarted) {
      return;
    }

    this.isStarted = true;

    this.beatmap.song.play();

    this.renderPlay();
  }

  actionSkip() {
    const passedSkipTime = this.getElapsedTime() > this.beatmap.skipTime * 1000;

    if (!this.isStarted || passedSkipTime || this.isPaused || this.isResuming) {
      return;
    }

    this.beatmap.song.currentTime = this.beatmap.skipTime;
  }

  actionPause() {
    if (!this.isStarted || this.isPaused || this.isResuming) {
      return;
    }

    this.isPaused = true;

    this.beatmap.song.pause();
  }

  actionResume() {
    if (!this.isStarted || !this.isPaused || this.isResuming) {
      return;
    }

    this.isPaused = false;
    this.isResuming = true;

    setTimeout(() => {
      this.isResuming = false;
      this.beatmap.song.play();
    }, 3000);
  }

  getElapsedTime() {
    return this.beatmap.song.currentTime * 1000;
  }
}

class Track {
  constructor(game, index) {
    this.game = game;
    this.index = index;
  }

  render() {
    this.game.ctx.fillStyle = "#0f172a";
    this.game.ctx.fillRect(
      this.game.trackStartPosition +
        (this.game.trackWidth + this.game.borderWidth) * this.index,
      0,
      this.game.trackWidth,
      this.game.trackHeight
    );
  }
}

class Control {
  constructor(game, index) {
    this.game = game;
    this.index = index;

    this.key = this.game.controlKeys[index];

    this.position = {
      x:
        this.game.trackStartPosition +
        (this.game.trackWidth + this.game.borderWidth) * index,
    };
  }

  render(state = "inactive") {
    this.game.ctx.fillStyle = state === "inactive" ? "#0369a1" : "#38bdf8";
    this.game.ctx.fillRect(
      this.position.x - this.game.borderWidth,
      this.game.trackHeight,
      this.game.trackWidth + 2 * this.game.borderWidth,
      this.game.tileHeight
    );

    this.game.ctx.fillStyle = state === "inactive" ? "#1e293b" : "#334155";
    this.game.ctx.fillRect(
      this.position.x,
      this.game.trackHeight + this.game.tileHeight,
      this.game.trackWidth,
      this.game.controlHeight
    );

    this.game.ctx.fillStyle = state === "inactive" ? "white" : "#bae6fd";
    this.game.ctx.font = 'bold 2rem "Plus Jakarta Sans", sans-serif';
    this.game.ctx.textAlign = "center";
    this.game.ctx.fillText(
      this.key.toUpperCase(),
      this.game.trackStartPosition +
        (this.game.trackWidth + this.game.borderWidth) * this.index +
        this.game.trackWidth / 2,
      this.game.canvas.height -
        this.game.controlHeight +
        this.game.controlHeight / 2 +
        16
    );
  }
}

class Note {
  constructor(game, trackIndex, start, end = null) {
    this.game = game;
    this.trackIndex = trackIndex;
    this.key = this.game.controlKeys[trackIndex];
    this.pressed = false;

    this.start = start;
    this.end = end;

    this.height = end ? end - start : 28;

    const isSideTrack =
      trackIndex === 0 || trackIndex === this.game.controlKeys.length - 1;

    this.color = isSideTrack ? "#38bdf8" : "#f87171";

    this.position = {
      x:
        this.game.trackStartPosition +
        (this.game.trackWidth + this.game.borderWidth) * this.trackIndex,
      y: this.height * -1,
    };
  }

  render() {
    this.game.ctx.fillStyle = this.color;

    const y = this.game.getElapsedTime() - this.start + this.game.trackHeight;

    let height = this.height;
    if (y + this.height >= this.game.trackHeight) {
      height = Math.max(
        this.height - (y + this.height - this.game.trackHeight),
        0
      );
    }

    this.game.ctx.fillRect(this.position.x, y, this.game.trackWidth, height);
  }
}
