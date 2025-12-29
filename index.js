import { Telegraf } from "telegraf";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

/* ================= INIT ================= */
const bot = new Telegraf(process.env.BOT_TOKEN);
const db = new Database("db.sqlite");

/* ================= STATES ================= */
const captchaUsers = new Set();
const taskCompleted = new Set();
const VERIFIED_ANSWER = "109";

/* ================= DATABASE ================= */
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  userId INTEGER PRIMARY KEY,
  username TEXT,
  wallet TEXT UNIQUE,
  referredBy INTEGER,
  referrals INTEGER DEFAULT 0
)
`).run();

/* ================= TASK MESSAGE ================= */
function sendAirdropTasks(ctx) {
  ctx.reply(
`✅ That‘s correct! (Powered By HiddenGem)

➡️ *Welcome to our Official GiveWay Airdrop*

⬇️ Complete the tasks below to earn Free Rewards.

━━━━━━━━━━━━━━━━━━
*HiddenGem*
━━━━━━━━━━━━━━━━━━

⚠️ Never spend money on airdrops.

👇 Join all platforms using the buttons below, then click **Done**.`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔗 Telegram Group", url: process.env.TG_GROUP }],
      [{ text: "🔗 Telegram Channel", url: process.env.TG_CHANNEL }],
      [{ text: "🐦 Twitter", url: process.env.TWITTER }],
      [{ text: "▶️ YouTube", url: process.env.YOUTUBE }],
      [{ text: "💬 Support", url: process.env.SUPPORT }],
      [{ text: "✅ Done", callback_data: "tasks_done" }]
    ]
  }
});
}

/* ================= START + CAPTCHA ================= */
bot.start((ctx) => {
  const refId = ctx.startPayload ? parseInt(ctx.startPayload) : null;
  const userId = ctx.from.id;
  const username = ctx.from.username || "";

  const exists = db.prepare(
    "SELECT userId FROM users WHERE userId=?"
  ).get(userId);

  if (!exists) {
    db.prepare(`
      INSERT INTO users (userId, username, referredBy)
      VALUES (?, ?, ?)
    `).run(userId, username, refId);

    if (refId) {
      db.prepare(`
        UPDATE users SET referrals = referrals + 1
        WHERE userId=?
      `).run(refId);
    }
  }

  captchaUsers.add(userId);

  ctx.reply(
`➡️ Before we start the airdrop, please prove you are human.

Please answer:
*99 + 10 =*

Click **Continue** before typing.`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "➡️ Continue", callback_data: "captcha_continue" }]
    ]
  }
});
});

/* ================= CAPTCHA CONTINUE ================= */
bot.action("captcha_continue", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("✍️ Please type your answer now:");
});

/* ================= CAPTCHA ANSWER (FIXED) ================= */
bot.on("text", (ctx) => {
  // ONLY handle users who are still solving captcha
  if (!captchaUsers.has(ctx.from.id)) return;

  // Ignore wallet-like text during captcha
  if (/^0x[a-fA-F0-9]{40}$/.test(ctx.message.text)) return;

  if (ctx.message.text.trim() === VERIFIED_ANSWER) {
    captchaUsers.delete(ctx.from.id);
    sendAirdropTasks(ctx);
    return; // 🔥 IMPORTANT: stop here, allow other handlers
  }

  ctx.reply("❌ Wrong answer. Try again: 99 + 10 = ?");
});

/* ================= TASK DONE ================= */
bot.action("tasks_done", (ctx) => {
  ctx.answerCbQuery();
  taskCompleted.add(ctx.from.id);

  ctx.reply(
`✅ Tasks confirmed!

📥 Now send your *BSC (BEP-20)* wallet address.

Example:
\`0x1234abcd5678ef901234abcd5678ef901234abcd\``,
{ parse_mode: "Markdown" }
  );
});

/* ================= WALLET SUBMISSION ================= */
bot.hears(/0x[a-fA-F0-9]{40}/, (ctx) => {
  if (!taskCompleted.has(ctx.from.id)) {
    return ctx.reply("❌ Complete tasks and click Done first.");
  }

  try {
    db.prepare(`
      UPDATE users SET wallet=?
      WHERE userId=?
    `).run(ctx.message.text, ctx.from.id);

    ctx.reply("✅ Wallet saved successfully!");
  } catch {
    ctx.reply("❌ This wallet address is already used.");
  }
});

/* ================= REFERRALS ================= */
bot.command("referrals", (ctx) => {
  const user = db.prepare(
    "SELECT referrals FROM users WHERE userId=?"
  ).get(ctx.from.id);

  ctx.reply(`👥 Your referrals: ${user?.referrals || 0}`);
});

/* ================= ADMIN STATS ================= */
bot.command("stats", (ctx) => {
  if (ctx.from.id != process.env.ADMIN_ID) return;

  const total = db.prepare(
    "SELECT COUNT(*) AS c FROM users"
  ).get();

  ctx.reply(`📊 Total users: ${total.c}`);
});

/* ================= START BOT ================= */
bot.launch();
console.log("🤖 Telegram Airdrop Bot Running");
