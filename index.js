const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ===== BOT =====
const bot = new Telegraf('8226474686:AAEmXiWRGoeaa5pZpF2MZlYViYmSkM70fbI');
const ADMIN_ID = 6012422087;

// ===== DATABASE =====
const DATA_FILE = './users.json';
let users = {};

if (fs.existsSync(DATA_FILE)) {
    users = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveUsers() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

const sessions = {};
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// ===== DATE & TIME (Pakistan) =====
function getCurrentDateTime() {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const pk = new Date(utc + 5 * 60 * 60 * 1000);

    return {
        date: `${String(pk.getDate()).padStart(2,'0')}-${String(pk.getMonth()+1).padStart(2,'0')}-${pk.getFullYear()}`,
        time: `${String(pk.getHours()).padStart(2,'0')}:${String(pk.getMinutes()).padStart(2,'0')}:${String(pk.getSeconds()).padStart(2,'0')}`
    };
}

function withBackButton(btns = []) {
    return Markup.inlineKeyboard([...btns, [Markup.button.callback('⬅️ Back', 'backToMenu')]]);
}

function genId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.floor(Math.random()*1000);
}

// ===== START =====
bot.start(async (ctx) => {
    const s = sessions[ctx.chat.id];
    if (s && s.usernameKey && users[s.usernameKey]) {
        const u = users[s.usernameKey];
        return ctx.reply(
            `Dear ${u.firstName}, Welcome Back`,
            withBackButton([
                [Markup.button.callback('Check Balance', 'checkBalance')],
                [Markup.button.callback('Buy Bot', 'buyBot')],
                [Markup.button.callback('Deposit Balance', 'depositBalance')],
                [Markup.button.callback('Withdraw Balance', 'withdrawBalance')],
                [Markup.button.callback('Log Out', 'logOut')]
            ])
        );
    }

    ctx.reply(
        '👋 Welcome!\nPlease Sign Up or Log In:',
        Markup.inlineKeyboard([
            Markup.button.callback('Sign Up', 'signup'),
            Markup.button.callback('Log In', 'login')
        ])
    );
});

// ===== AUTH =====
bot.action('signup', ctx => {
    sessions[ctx.chat.id] = { flow:'signup', step:'firstName' };
    ctx.reply('Enter first name:');
});

bot.action('login', ctx => {
    sessions[ctx.chat.id] = { flow:'login', step:'loginUsername' };
    ctx.reply('Enter username:');
});

// ===== TEXT HANDLER =====
bot.on('text', async (ctx) => {
    const s = sessions[ctx.chat.id];
    if (!s) return;
    const text = ctx.message.text.trim();

    // ===== SIGNUP =====
    if (s.flow === 'signup') {
        if (s.step === 'firstName') {
            s.firstName = text;
            s.step = 'username';
            return ctx.reply('Create username:');
        }
        if (s.step === 'username') {
            if (users[text]) return ctx.reply('Username taken.');
            s.username = text;
            s.step = 'password';
            return ctx.reply('Create password:');
        }
        if (s.step === 'password') {
            if (!PASSWORD_REGEX.test(text)) return ctx.reply('Weak password.');
            users[s.username] = {
                firstName: s.firstName,
                password: text,
                balance: 0,
                transactions: []
            };
            saveUsers();
            sessions[ctx.chat.id] = null;
            return ctx.reply('✅ Account created. Login now.');
        }
    }

    // ===== LOGIN =====
    if (s.flow === 'login') {
        if (s.step === 'loginUsername') {
            if (!users[text]) return ctx.reply('User not found.');
            s.usernameKey = text;
            s.step = 'loginPassword';
            return ctx.reply('Enter password:');
        }
        if (s.step === 'loginPassword') {
            if (users[s.usernameKey].password !== text) return ctx.reply('Wrong password.');
            sessions[ctx.chat.id] = { usernameKey: s.usernameKey };
            return ctx.reply('✅ Logged in.', withBackButton([]));
        }
    }

    // ===== WITHDRAW FLOW =====
    if (s.flow === 'withdraw') {

        // amount
        if (s.step === 'amount') {
            const amt = parseInt(text);
            const u = users[s.usernameKey];

            if (isNaN(amt)) return ctx.reply('Enter numbers only.');
            if (amt < 500) return ctx.reply('Minimum withdraw 500 PKR.');
            if (u.balance < amt) return ctx.reply('Insufficient balance.');

            s.withdrawAmount = amt;
            s.step = 'method';

            return ctx.reply(
                'Select Withdraw Method:',
                Markup.inlineKeyboard([
                    [Markup.button.callback('JazzCash', 'w_JazzCash')],
                    [Markup.button.callback('EasyPaisa', 'w_EasyPaisa')],
                    [Markup.button.callback('U-Paisa', 'w_UPaisa')]
                ])
            );
        }

        // account
        if (s.step === 'account') {
            s.withdrawAccount = text;
            const wid = genId('wd');
            const { date, time } = getCurrentDateTime();
            if (!s.pendingWithdraws) s.pendingWithdraws = [];

            s.pendingWithdraws.push({
                id: wid,
                amount: s.withdrawAmount,
                method: s.withdrawMethod,
                account: s.withdrawAccount
            });

            await bot.telegram.sendMessage(
                ADMIN_ID,
`💸 Withdraw Request
User: ${s.usernameKey}
Amount: ${s.withdrawAmount}
Method: ${s.withdrawMethod}
Account: ${s.withdrawAccount}
${date} ${time}`,
                Markup.inlineKeyboard([
                    Markup.button.callback('✅ Approve', `aw_${ctx.chat.id}_${wid}`),
                    Markup.button.callback('❌ Reject', `rw_${ctx.chat.id}_${wid}`)
                ])
            );

            s.flow = null;
            return ctx.reply('⏳ Withdraw request sent. Waiting for admin approval.');
        }
    }
});

// ===== WITHDRAW BUTTON =====
bot.action('withdrawBalance', ctx => {
    const s = sessions[ctx.chat.id];
    if (!s || !s.usernameKey) return ctx.reply('Login first.');
    s.flow = 'withdraw';
    s.step = 'amount';
    ctx.reply('Enter withdraw amount (min 500 PKR):');
});

bot.action(/w_(JazzCash|EasyPaisa|UPaisa)/, ctx => {
    const s = sessions[ctx.chat.id];
    s.withdrawMethod = ctx.match[1];
    s.step = 'account';
    ctx.reply(`Enter ${s.withdrawMethod} account number:`);
});

// ===== ADMIN WITHDRAW =====
bot.action(/aw_(\d+)_(wd_\d+_\d+)/, async ctx => {
    const [_, uid, wid] = ctx.match;
    const s = sessions[uid];
    const wd = s.pendingWithdraws.find(x => x.id === wid);
    const u = users[s.usernameKey];
    const { date, time } = getCurrentDateTime();

    u.balance -= wd.amount;
    u.transactions.push({
        type: 'Withdraw ➖',
        amount: wd.amount,
        method: wd.method,
        date, time
    });
    saveUsers();

    await bot.telegram.sendMessage(uid, `✅ Withdraw ${wd.amount} PKR approved.`);
    s.pendingWithdraws = s.pendingWithdraws.filter(x => x.id !== wid);
    ctx.editMessageText('✅ Withdraw Approved');
});

bot.action(/rw_(\d+)_(wd_\d+_\d+)/, async ctx => {
    const [_, uid, wid] = ctx.match;
    const s = sessions[uid];
    const wd = s.pendingWithdraws.find(x => x.id === wid);

    await bot.telegram.sendMessage(uid, `❌ Withdraw ${wd.amount} PKR rejected.`);
    s.pendingWithdraws = s.pendingWithdraws.filter(x => x.id !== wid);
    ctx.editMessageText('❌ Withdraw Rejected');
});

// ===== OTHER =====
bot.action('checkBalance', ctx => {
    const s = sessions[ctx.chat.id];
    const u = users[s.usernameKey];
    ctx.reply(`Balance: ${u.balance} PKR`, withBackButton([]));
});

bot.action('logOut', ctx => {
    sessions[ctx.chat.id] = null;
    ctx.reply('Logged out.');
});

// ===== INCLUDE DEPOSIT FLOW =====
const depositFlow = require('./deposit');
depositFlow(bot, users, sessions, saveUsers, ADMIN_ID, getCurrentDateTime, genId);

// ===== LAUNCH =====
bot.launch();
console.log('BOT RUNNING...');
