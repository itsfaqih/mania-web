export const timeToSeconds = (time) => {
  const [minutes, seconds, miliseconds] = time.split(":").map(Number);
  return minutes * 60 + seconds + miliseconds / 1000;
};

export const renderCss = (css) => {
  const styleElement = document.createElement("style");
  styleElement.innerHTML = css;
  document.head.appendChild(styleElement);
};

export const getKeyByValue = (object, value) => {
  return Object.keys(object).find((key) => object[key] === value);
};
