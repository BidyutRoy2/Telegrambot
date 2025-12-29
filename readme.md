# Airdrop Telegram Bot
✅ Human verification (captcha)
✅ Task buttons
✅ Wallet submission (fixed)
✅ Show user data + referral link
✅ Refresh stats button
✅ Auto-export completed users → airdrop_users.txt (every 15 min)
✅ Auto leaderboard → leaderboard.txt (every 15 min)
✅ SQLite only (no MongoDB)
✅ Production-safe Telegraf patterns

```
git clone https://github.com/BidyutRoy2/Telegrambot.git && cd Telegrambot
```

```
npm install
```

```
sudo apt install sqlite3 -y
```

Create New Bot @BotFather & Copy Access Token
```
nano .env
```
Make Admin Bot in Your Channel & Group 

```
npm start
```

## Check User Data 
```
sqlite3 -header -column db.sqlite "SELECT * FROM users;"
```

