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

  constructor(canvas) {
    if (!canvas) {
      throw new Error("No canvas provided");
    }

    this.canvas = canvas;

    if (!this.canvas.getContext) {
      throw new Error("No canvas.getContext");
    }

    this.ctx = this.canvas.getContext("2d");

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

  play() {
    this.beatmap.song.play();

    this.renderNotes();
  }

  renderNotes() {
    requestAnimationFrame(this.renderNotes.bind(this));

    this.ctx.clearRect(0, 0, this.canvas.width, this.trackHeight);

    this.renderTracks();

    const elapsedTime = this.beatmap.song.currentTime * 1000;

    this.beatmap.notes.forEach((note) => {
      note.render(elapsedTime);
    });
  }

  handleUserInput(key, type) {
    if (this.controlKeys.includes(key)) {
      this.handleControlInput(key, type);
    }

    if (key === " ") {
      this.beatmap.song.currentTime = this.beatmap.skipTime;
    }
  }

  handleControlInput(key, type) {
    if (type === "keydown") {
      this.controls[this.controlKeys.indexOf(key)].render("active");
    } else if (type === "keyup") {
      this.controls[this.controlKeys.indexOf(key)].render("inactive");
    }
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

  render(elapsedTime) {
    this.game.ctx.fillStyle = this.color;

    const y = elapsedTime - this.start + this.game.trackHeight;

    let height = this.height;
    if (y + this.height >= this.game.trackHeight) {
      height = Math.max(this.height - (y + this.height - this.game.trackHeight), 0);
    }

    this.game.ctx.fillRect(
      this.position.x,
      y,
      this.game.trackWidth,
      height
    );
  }
}
