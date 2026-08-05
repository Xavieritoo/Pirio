const GAMES = [
  { name: "wordle", label: "Wordle" },
  { name: "trivia", label: "Trivia" }
];

function getLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDailyGame() {
  const dateString = getLocalDateString();
  const seed = dateString
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return GAMES[seed % GAMES.length];
}

function getDailyCommandName() {
  return getDailyGame().name;
}

function getDailyCommandLabel() {
  return getDailyGame().label;
}

module.exports = {
  getLocalDateString,
  getDailyGame,
  getDailyCommandName,
  getDailyCommandLabel
};
