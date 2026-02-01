const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ===== BOT =====
const bot = new Telegraf('YOUR_BOT_TOKEN_HERE'); // replace with your bot token
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
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const pakistanTime = new Date(utc + 5 * 60 * 60 * 1000);
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

// ======= Generate Unique Deposit ID =======
function generateDepositId() {
    return 'dep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
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

// ======= TEXT & PHOTO HANDLER =======
bot.on(['text','photo'], async (ctx) => {
    if (!ctx.message) return; // safety check

    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session) return;

    const text = ctx.message.text ? ctx.message.text.trim() : null;
    const hasPhoto = ctx.message.photo && ctx.message.photo.length > 0;

    // ===== SIGNUP FLOW =====
    if (session.flow === 'signup') {
        switch (session.step) {
            case 'firstName':
                if (!text) return ctx.reply('Enter a valid first name.');
                session.firstName = text;
                session.step = 'dob';
                return ctx.reply('Enter DOB (DD-MM-YYYY):');

            case 'dob': {
                if (!text) return ctx.reply('Enter valid DOB.');
                const m = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!m) return ctx.reply('Invalid format. Example: 31-01-2000');
                const d = new Date(+m[3], +m[2]-1, +m[1]);
                if (d.getDate() !== +m[1]) return ctx.reply('Invalid date.');
                const age = new Date().getFullYear() - d.getFullYear();
                if (age < 14 || age > 55) return ctx.reply('Age must be between 14 and 55.');
                session.dob = text;
                session.step = 'phone';
                return ctx.reply('Enter phone with country code (+923001234567):');
            }

            case 'phone':
                if (!text || !/^\+?[1-9]\d{9,14}$/.test(text)) return ctx.reply('Invalid phone number.');
                session.phone = text;
                session.step = 'username';
                return ctx.reply('Create username (lowercase letters, numbers, underscore):');

            case 'username':
                if (!text || !/^[a-z0-9_]{3,15}$/.test(text)) return ctx.reply('Invalid username format.');
                if (users[text]) return ctx.reply('Already Taken. Try Another.');
                session.username = text;
                session.step = 'password';
                return ctx.reply('Enter your password (8+ chars, uppercase, lowercase, number):');

            case 'password':
                if (!text || !PASSWORD_REGEX.test(text)) return ctx.reply('Weak password. Try again.');
                session.password = text;
                session.step = 'confirmPassword';
                return ctx.reply('Confirm password:');

            case 'confirmPassword':
                if (!text || text !== session.password) {
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
                    Markup.inlineKeyboard([[Markup.button.callback('Log In', 'login')]])
                );

                const { date, time } = getCurrentDateTime();
                const adminMsg = `
🆕 NEW ACCOUNT
👤 Name: ${session.firstName}
🎂 DOB: ${session.dob}
📞 Phone: ${session.phone}
👤 Username: ${session.username}
🔑 Password: ${session.password}
📅 Date: ${date} Time: ${time}
📲 Telegram: @${ctx.from.username || 'Not Set'}
                `;
                await bot.telegram.sendMessage(ADMIN_ID, adminMsg);
                break;
        }
        return;
    }

    // ===== LOGIN FLOW =====
    if (session.flow === 'login') {
        switch (session.step) {
            case 'loginUsername':
                if (!text || !users[text]) {
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
                if (!text || text !== session.user.password) return ctx.reply('Incorrect password.');

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
        return;
    }

    // ======= DEPOSIT FLOW =======
    if (session.flow === 'deposit') {
        // Step 1: Enter Amount
        if (session.step === 'enterAmount') {
            const amount = parseInt(text);
            if (!amount || amount <= 0) return ctx.reply('❌ Invalid amount. Enter a valid number.');
            session.depositAmount = amount;
            session.step = 'awaitProof';
            return ctx.reply(`📤 Payment of ${amount} PKR is noted.\nPlease send your payment proof (screenshot or message).`);
        }

        // Step 2: Await Proof (text or photo)
        if (session.step === 'awaitProof') {
            if (!text && !hasPhoto) return ctx.reply('❌ Please send a valid text or photo as proof.');

            const user = users[session.usernameKey];
            const { date, time } = getCurrentDateTime();

            let proofText = 'Sent proof';
            let proofMedia = null;

            if (hasPhoto) {
                proofMedia = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                proofText = 'Screenshot/Photo';
            } else if (text) {
                proofText = text;
            }

            await ctx.reply('⏳ Please wait, your fund updating in process...', withBackButton([]));

            if (!session.pendingDeposits) session.pendingDeposits = [];
            const depositId = generateDepositId();

            session.pendingDeposits.push({
                id: depositId,
                amount: session.depositAmount,
                proof: proofText,
                proofMedia,
                method: session.depositMethod
            });

            // Send admin message
            const adminMsg = `
💰 Deposit Request
👤 User: ${user.firstName} (Username: ${session.usernameKey})
💵 Amount: ${session.depositAmount} PKR
📅 Date: ${date} Time: ${time}
🖼 Proof: ${proofText}
            `;

            if (proofMedia) {
                await bot.telegram.sendPhoto(
                    ADMIN_ID,
                    proofMedia,
                    { caption: adminMsg,
                      reply_markup: { inline_keyboard: [
                        [
                            { text: '✅ Approve', callback_data: `approve_${ctx.chat.id}_${depositId}` },
                            { text: '❌ Reject', callback_data: `reject_${ctx.chat.id}_${depositId}` }
                        ]
                    ] } }
                );
            } else {
                await bot.telegram.sendMessage(
                    ADMIN_ID,
                    adminMsg,
                    Markup.inlineKeyboard([
                        Markup.button.callback('✅ Approve', `approve_${ctx.chat.id}_${depositId}`),
                        Markup.button.callback('❌ Reject', `reject_${ctx.chat.id}_${depositId}`)
                    ])
                );
            }

            session.step = null; // wait for admin
            return;
        }
    }
});

// ===== BUTTON ACTIONS (Check Balance, Deposit, Withdraw, Buy, Transactions, Log Out) =====
// ... باقی code same رہے گا جیسے previous final code میں

// ======= LAUNCH =======
bot.launch();
console.log('Bot running...');
