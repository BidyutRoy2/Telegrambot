import { Telegraf } from "telegraf";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import fs from "fs";
import cron from "node-cron";

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

/* ================= HELPERS ================= */
function referralLink(ctx, userId) {
  return `https://t.me/${ctx.botInfo.username}?start=${userId}`;
}

function showUserSummary(ctx) {
  const user = db.prepare(
    "SELECT * FROM users WHERE userId=?"
  ).get(ctx.from.id);

  if (!user || !user.wallet) return;

  ctx.reply(
`📊 *Your Airdrop Summary*

👤 User ID: ${user.userId}
👤 Username: @${user.username || "N/A"}
💼 Wallet: \`${user.wallet}\`
👥 Referrals: *${user.referrals}*

🔗 *Your Referral Link*
${referralLink(ctx, user.userId)}`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔄 Refresh Stats", callback_data: "refresh_stats" }]
    ]
  }
});
}

/* ================= EXPORT FILES ================= */
function exportUsersToTxt() {
  const users = db.prepare(
    "SELECT * FROM users WHERE wallet IS NOT NULL"
  ).all();

  let output = "=== AIRDROP COMPLETED USERS ===\n";
  output += `Updated: ${new Date().toUTCString()}\n\n`;

  users.forEach(u => {
    output +=
`UserID: ${u.userId}
Username: ${u.username || "N/A"}
Wallet: ${u.wallet}
Referrals: ${u.referrals}
------------------------------\n`;
  });

  fs.writeFileSync("airdrop_users.txt", output);
}

function exportLeaderboard() {
  const users = db.prepare(`
    SELECT userId, username, referrals
    FROM users
    WHERE referrals > 0
    ORDER BY referrals DESC
    LIMIT 100
  `).all();

  let output = "=== AIRDROP REFERRAL LEADERBOARD ===\n";
  output += `Updated: ${new Date().toUTCString()}\n\n`;
  output += "Rank | UserID     | Username        | Referrals\n";
  output += "-----------------------------------------------\n";

  users.forEach((u, i) => {
    output +=
`${String(i + 1).padEnd(4)} | ` +
`${String(u.userId).padEnd(10)} | ` +
`${(u.username || "N/A").padEnd(15)} | ` +
`${u.referrals}\n`;
  });

  output += "-----------------------------------------------\n";
  fs.writeFileSync("leaderboard.txt", output);
}

/* Auto export every 15 minutes */
cron.schedule("*/15 * * * *", () => {
  exportUsersToTxt();
  exportLeaderboard();
});

/* ================= TASK MESSAGE ================= */
function sendAirdropTasks(ctx) {
  ctx.reply(
`✅ That‘s Correct!

➡️ *Official Giveaway Airdrop*

⬇️ Join our Telegram Group & Channel using the Buttons Below. 

➡️ Then Click **Done**.

⚠️ Never spend money on Airdrops.`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔗 Telegram Group", url: process.env.TG_GROUP }],
      [{ text: "🔗 Telegram Channel", url: process.env.TG_CHANNEL }],
      [{ text: "💬 Support Group", url: process.env.SUPPORT }],
      [{ text: "🐦 Twitter", url: process.env.TWITTER }],
      [{ text: "▶️ YouTube", url: process.env.YOUTUBE }],      
      [{ text: "✅ Done", callback_data: "tasks_done" }]
    ]
  }
});
}

/* ================= START + CAPTCHA ================= */
bot.start((ctx) => {
  const refId = ctx.startPayload ? parseInt(ctx.startPayload) : null;
  const userId = ctx.from.id;

  const exists = db.prepare(
    "SELECT userId FROM users WHERE userId=?"
  ).get(userId);

  if (!exists) {
    db.prepare(`
      INSERT INTO users (userId, username, referredBy)
      VALUES (?, ?, ?)
    `).run(userId, ctx.from.username || "", refId);

    if (refId) {
      db.prepare(`
        UPDATE users SET referrals = referrals + 1
        WHERE userId=?
      `).run(refId);
    }
  }

  captchaUsers.add(userId);

  ctx.reply(
`➡️ Human Verification Required

Solve Captcha : *99 + 10 =*

Click **Continue** First.`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "➡️ Continue", callback_data: "captcha_continue" }]
    ]
  }
});
});

/* ================= CAPTCHA ================= */
bot.action("captcha_continue", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("✍️ Type Right Answer:");
});

bot.hears(/^\d+$/, (ctx) => {
  if (!captchaUsers.has(ctx.from.id)) return;

  if (ctx.message.text.trim() === VERIFIED_ANSWER) {
    captchaUsers.delete(ctx.from.id);
    sendAirdropTasks(ctx);
  } else {
    ctx.reply("❌ Wrong answer. Try again.");
  }
});

/* ================= DONE BUTTON (JOIN CHECK) ================= */
bot.action("tasks_done", async (ctx) => {
  ctx.answerCbQuery();
  const userId = ctx.from.id;

  try {
    const group = await ctx.telegram.getChatMember(
      process.env.TG_GROUP_USERNAME,
      userId
    );

    const channel = await ctx.telegram.getChatMember(
      process.env.TG_CHANNEL_USERNAME,
      userId
    );

    const ok = ["member", "administrator", "creator"];

    if (!ok.includes(group.status) || !ok.includes(channel.status)) {
      return ctx.reply(
`❌ Tasks not completed!

✅ Please: Join Telegram Group & Channel

✅ Then Click **Done** Again.`
      );
    }

    taskCompleted.add(userId);

    ctx.reply(
`✅ Tasks Verified!

📥 Now send your *BSC (BEP-20)* wallet address.`,
{ parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error("Join check error:", err);
    ctx.reply(
`⚠️ Verification failed.

Make sure:
• Bot is ADMIN
• Group & Channel are PUBLIC`
    );
  }
});

/* ================= WALLET SUBMISSION ================= */
bot.hears(/^0x[a-fA-F0-9]{40}$/, (ctx) => {
  if (!taskCompleted.has(ctx.from.id)) {
    return ctx.reply("❌ Complete Telegram tasks first.");
  }

  try {
    db.prepare(`
      UPDATE users SET wallet=?
      WHERE userId=?
    `).run(ctx.message.text, ctx.from.id);

    ctx.reply("✅ Wallet Saved Successfully!");
    showUserSummary(ctx);

  } catch {
    ctx.reply("❌ Wallet already used.");
  }
});

/* ================= REFRESH ================= */
bot.action("refresh_stats", (ctx) => {
  ctx.answerCbQuery("Refreshing...");
  showUserSummary(ctx);
});

/* ================= ADMIN ================= */
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
