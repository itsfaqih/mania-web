export const timeToMiliseconds = (time = null) => {
  if (time === null) {
    return null;
  }

  const [minutes, seconds, miliseconds] = time.split(":").map(Number);
  return miliseconds + seconds * 1000 + minutes * 60000;
};

export const timeToSeconds = (time = null) => {
  if (time === null) {
    return null;
  }

  const [minutes, seconds, miliseconds] = time.split(":").map(Number);
  return seconds + minutes * 60 + miliseconds / 1000;
};

export const getKeyByValue = (object, value) => {
  return Object.keys(object).find((key) => object[key] === value);
};
