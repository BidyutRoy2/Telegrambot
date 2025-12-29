# Professional Airdrop Telegram Bot
- ✅ Human verification (captcha)
- ✅ Task buttons
- ✅ Wallet submission (fixed)
- ✅ Show user data + referral link
- ✅ Refresh stats button
- ✅ Auto-export completed users → airdrop_users.txt (every 15 min)
- ✅ Auto leaderboard → leaderboard.txt (every 15 min)
- ✅ SQLite only (no MongoDB)
- ✅ Production-safe Telegraf patterns

```
git clone https://github.com/BidyutRoy2/Telegrambot.git && cd Telegrambot
```

```
npm install
```

```
sudo apt install sqlite3 -y
```
- ### Create New Bot @BotFather Copy Access Token and Make Admin Bot in Your Channel & Group
```
nano .env
```
- ### Modify and Setup Your Details in .env
```
BOT_TOKEN=
ADMIN_ID=
TG_GROUP=https://t.me/
TG_CHANNEL=https://t.me/
TWITTER=https://x.com/
YOUTUBE=https://www.youtube.com/
SUPPORT=https://t.me/
TG_GROUP_USERNAME=@
TG_CHANNEL_USERNAME=@
```
### Run Bot
```
npm start
```

### Check User Data 
```
sqlite3 -header -column db.sqlite "SELECT * FROM users;"
```

## 📁 FILES THIS CREATES AUTOMATICALLY - Telegrambot Folder
- db.sqlite → live database
- airdrop_users.txt → completed users (15 min)
- leaderboard.txt → referral leaderboard (15 min)
