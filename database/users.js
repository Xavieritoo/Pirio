const { get, all, run } = require("./db");

async function getUserByDiscordId(discordId) {
  return get("SELECT * FROM users WHERE discord_id = ?", discordId);
}

async function createUser(discordId, username) {
  await run(
    "INSERT INTO users (discord_id, username) VALUES (?, ?)",
    discordId,
    username
  );
  return getUserByDiscordId(discordId);
}

async function ensureUser(discordId, username) {
  let user = await getUserByDiscordId(discordId);

  if (!user) {
    user = await createUser(discordId, username);
  } else if (user.username !== username) {
    await run(
      "UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?",
      username,
      discordId
    );
    user = await getUserByDiscordId(discordId);
  }

  return user;
}

async function updateUserFields(discordId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) {
    return;
  }

  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  const params = keys.map((key) => fields[key]);
  params.push(discordId);

  await run(
    `UPDATE users SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?`,
    ...params
  );
}

async function getTopUsers(limit = 10) {
  return all(
    "SELECT username, points, wins FROM users ORDER BY points DESC, wins DESC LIMIT ?",
    limit
  );
}

module.exports = {
  getUserByDiscordId,
  ensureUser,
  updateUserFields,
  getTopUsers
};
