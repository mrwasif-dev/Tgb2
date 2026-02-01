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

// Store admin rejection reasons
const pendingAdminRejections = {};

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
    await ctx.reply('✨ آپ کا پہلا نام درج کریں:\nمثال: محمد علی');
});

bot.action('login', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'login', step: 'loginUsername' };
    await ctx.reply('👤 اپنا یوزرنیم درج کریں:');
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
                if (text.length < 2 || text.length > 30) {
                    return ctx.reply('❌ نام 2 سے 30 حروف کے درمیان ہونا چاہیے۔ دوبارہ کوشش کریں:');
                }
                session.firstName = text;
                session.step = 'dob';
                return ctx.reply('📅 آپ کی تاریخ پیدائش درج کریں (دن-مہینہ-سال):\nمثال: 31-01-2000');

            case 'dob': {
                // Validate date format
                const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!match) {
                    return ctx.reply('❌ غلط فارمیٹ۔ صحیح فارمیٹ میں درج کریں:\nمثال: 31-01-2000');
                }
                
                const day = parseInt(match[1]);
                const month = parseInt(match[2]);
                const year = parseInt(match[3]);
                
                // Check if valid date
                const date = new Date(year, month - 1, day);
                if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
                    return ctx.reply('❌ غلط تاریخ۔ درست تاریخ درج کریں:');
                }
                
                // Check age between 14 and 55
                const currentYear = new Date().getFullYear();
                const age = currentYear - year;
                if (age < 14 || age > 55) {
                    return ctx.reply('❌ عمر 14 سے 55 سال کے درمیان ہونی چاہیے۔ نیا سال درج کریں:');
                }
                
                session.dob = text;
                session.step = 'whatsapp';
                return ctx.reply('📱 آپ کا واٹس ایپ نمبر درج کریں (پاکستان):\nمثال: 03001234567\n\n❌ +92 یا 92 مت لگائیں');
            }

            case 'whatsapp': {
                // Clean and validate Pakistani WhatsApp number
                let phone = text.replace(/\s+/g, '').replace(/^\+?92?/, '');
                
                if (!/^3\d{9}$/.test(phone)) {
                    return ctx.reply('❌ غلط نمبر۔ صحیح پاکستانی نمبر درج کریں:\nمثال: 03001234567');
                }
                
                // Check if number already exists
                const existingUser = Object.values(users).find(user => user.phone === phone);
                if (existingUser) {
                    const existingUsername = Object.keys(users).find(key => users[key] === existingUser);
                    return ctx.reply(`❌ یہ نمبر پہلے سے رجسٹر ہے۔\n\n📌 پہلے سے موجود اکاؤنٹ:\n👤 نام: ${existingUser.firstName}\n🔑 یوزرنیم: ${existingUsername}\n\nبراہ کرم نیا نمبر استعمال کریں:`);
                }
                
                session.phone = phone;
                session.step = 'username';
                return ctx.reply('👤 اپنا یوزرنیم منتخب کریں:\n• صرف چھوٹے حروف، نمبر اور انڈراسکور\n• 3 سے 15 حروف\nمثال: ali_123');
            }

            case 'username':
                if (!/^[a-z0-9_]{3,15}$/.test(text)) {
                    return ctx.reply('❌ غلط فارمیٹ۔ صرف چھوٹے حروف، نمبر اور _ استعمال کریں:\nمثال: ali_123');
                }
                
                if (users[text]) {
                    return ctx.reply(`❌ "${text}" یوزرنیم پہلے سے استعمال ہو رہا ہے۔\nبراہ کرم نیا یوزرنیم منتخب کریں:`);
                }
                
                session.username = text;
                session.step = 'password';
                return ctx.reply('🔐 اپنا پاسورڈ بنائیں:\n• کم از کم 8 حروف\n• ایک بڑا حرف\n• ایک چھوٹا حرف\n• ایک نمبر\nمثال: Password123');

            case 'password':
                if (!PASSWORD_REGEX.test(text)) {
                    return ctx.reply('❌ کمزور پاسورڈ۔ اوپر دیے گئے اصولوں کے مطابق پاسورڈ بنائیں:\nمثال: Password123');
                }
                
                session.password = text;
                session.step = 'confirmPassword';
                return ctx.reply('🔏 پاسورڈ کی تصدیق کریں:\nبراہ کرم اپنا پاسورڈ دوبارہ درج کریں:');

            case 'confirmPassword':
                if (text !== session.password) {
                    session.step = 'password';
                    return ctx.reply('❌ پاسورڈ مماثل نہیں ہیں۔\nبراہ کرم دوبارہ پاسورڈ درج کریں:');
                }

                users[session.username] = {
                    firstName: session.firstName,
                    dob: session.dob,
                    phone: session.phone,
                    password: session.password,
                    registered: getCurrentDateTime().date,
                    balance: 0,
                    transactions: [],
                    pendingDeposits: [],
                    pendingWithdrawals: [],
                    processedRequests: {} // Track processed requests
                };
                saveUsers();
                sessions[chatId] = null;

                await ctx.reply(
                    '✅ اکاؤنٹ کامیابی سے بن گیا ہے!\n\n' +
                    `👋 خوش آمدید ${session.firstName}!\n\n` +
                    'اب آپ لاگ ان کر سکتے ہیں۔',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔑 لاگ ان کریں', 'login')]
                    ])
                );

                const { date, time } = getCurrentDateTime();
                const adminMsg = `
🆕 نیا اکاؤنٹ بنا ہے
👤 نام: ${session.firstName}
🎂 تاریخ پیدائش: ${session.dob}
📱 واٹس ایپ: ${session.phone}
👤 یوزرنیم: ${session.username}
📅 تاریخ: ${date}
⏰ وقت: ${time}
📲 ٹیلیگرام: @${ctx.from.username || 'نہیں ہے'} (ID: ${chatId})
🔗 لنک: https://t.me/${ctx.from.username || 'user?id=' + chatId}
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
                        '❌ یوزرنیم موجود نہیں ہے۔\n\n' +
                        'کیا آپ کا اکاؤنٹ نہیں ہے؟ نیا اکاؤنٹ بنائیں:',
                        Markup.inlineKeyboard([
                            [Markup.button.callback('📝 نیا اکاؤنٹ بنائیں', 'signup')],
                            [Markup.button.callback('⬅️ Back', 'backToMenu')]
                        ])
                    );
                }
                session.user = users[text];
                session.usernameKey = text;
                session.step = 'loginPassword';
                return ctx.reply('🔐 اپنا پاسورڈ درج کریں:');

            case 'loginPassword':
                if (text !== session.user.password) {
                    return ctx.reply('❌ غلط پاسورڈ۔\nبراہ کرم دوبارہ کوشش کریں:');
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
        return;
    }

    // ===== ADMIN REJECTION REASON =====
    if (session.flow === 'admin_reject_reason') {
        const rejectionData = pendingAdminRejections[chatId];
        if (!rejectionData) {
            session.flow = null;
            return ctx.reply('Rejection data not found.');
        }

        const { requestType, userChatId, requestId } = rejectionData;
        const reason = text;

        // Remove from pending
        delete pendingAdminRejections[chatId];
        session.flow = null;

        // Process the rejection with reason
        if (requestType === 'deposit') {
            await processDepositRejection(userChatId, requestId, reason, ctx);
        } else if (requestType === 'withdraw') {
            await processWithdrawRejection(userChatId, requestId, reason, ctx);
        }

        return;
    }

    // ======= DEPOSIT FLOW =======
    if (session.flow === 'deposit') {
        const user = users[session.usernameKey];
        
        // Step 1: Enter Amount
        if (session.step === 'enterAmount') {
            const amount = parseInt(text);

            if (isNaN(amount)) {
                return ctx.reply('❌ Please enter numbers only.');
            }

            if (amount < 100) {
                return ctx.reply('❌ Minimum deposit amount is 100 PKR.');
            }

            if (amount > 5000) {
                return ctx.reply('❌ Maximum deposit amount is 5000 PKR per transaction.');
            }

            // Check daily deposit limit
            const today = getCurrentDateTime().date;
            if (!user.dailyDeposits) user.dailyDeposits = { date: today, count: 0, amount: 0 };
            
            if (user.dailyDeposits.date !== today) {
                user.dailyDeposits = { date: today, count: 0, amount: 0 };
            }

            if (user.dailyDeposits.count >= 5) {
                return ctx.reply('❌ Daily deposit limit (5 transactions) reached. Try again tomorrow.');
            }

            if (user.dailyDeposits.amount + amount > 20000) {
                return ctx.reply(`❌ Daily deposit limit (20,000 PKR) exceeded. You can deposit maximum ${20000 - user.dailyDeposits.amount} PKR today.`);
            }

            session.depositAmount = amount;
            session.step = 'enterProof';
            
            return ctx.reply(
                `✅ Amount ${amount} PKR noted for deposit.\n\n` +
                `📤 Please enter your Transaction ID/Proof:\n` +
                `• Only TiD, TrX ID, Transaction ID\n` +
                `• Screenshots are NOT accepted\n` +
                `• Example: TXN1234567890`
            );
        }

        // Step 2: Enter Proof
        if (session.step === 'enterProof') {
            const proofText = text.trim();
            
            if (!proofText || proofText.length < 5) {
                return ctx.reply('❌ Invalid Transaction ID. Please enter a valid Transaction ID (minimum 5 characters).');
            }

            if (proofText.length > 100) {
                return ctx.reply('❌ Transaction ID too long. Maximum 100 characters allowed.');
            }

            session.depositProof = proofText;
            
            // Show confirmation with ONLY Confirm button (NO Cancel button)
            const bonus = Math.floor(session.depositAmount * 0.02);
            const totalAmount = session.depositAmount + bonus;

            return ctx.reply(
                `📋 Deposit Request Summary:\n\n` +
                `💰 Amount: ${session.depositAmount} PKR\n` +
                `🎁 Bonus: ${bonus} PKR (2%)\n` +
                `💵 Total to be added: ${totalAmount} PKR\n` +
                `🏦 Method: ${session.depositMethod}\n` +
                `📝 Transaction ID: ${proofText}\n\n` +
                `Click "Confirm Deposit" to submit your request.`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Confirm Deposit', 'confirmDeposit')]
                ])
            );
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

            const processingFee = Math.max(10, Math.floor(session.withdrawAmount * 0.02));
            const netAmount = session.withdrawAmount - processingFee;

            // Show confirmation with ONLY Confirm button (NO Cancel button)
            return ctx.reply(
                `📋 Withdraw Request Summary:\n\n` +
                `💰 Amount: ${session.withdrawAmount} PKR\n` +
                `📉 Processing Fee: ${processingFee} PKR (2%)\n` +
                `💵 Net Amount: ${netAmount} PKR\n` +
                `🏦 Method: ${session.withdrawMethod}\n` +
                `📱 Account: ${accountNumber}\n\n` +
                `Click "Confirm Withdraw" to submit your request.`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Confirm Withdraw', 'confirmWithdraw')]
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
    
    let message = `Dear Customer, Your Account Balance Is: ${user.balance || 0} PKR\n`;
    message += `On Account: ${user.firstName}\n`;
    message += `Date: ${date} Time: ${time}\n\n`;
    
    // Show daily limits
    const today = getCurrentDateTime().date;
    if (user.dailyDeposits && user.dailyDeposits.date === today) {
        message += `📊 Today's Deposit: ${user.dailyDeposits.amount}/20,000 PKR (${user.dailyDeposits.count}/5 transactions)\n`;
    }
    
    if (user.dailyWithdrawals && user.dailyWithdrawals.date === today) {
        message += `📊 Today's Withdrawal: ${user.dailyWithdrawals.amount}/15,000 PKR (${user.dailyWithdrawals.count}/3 transactions)\n`;
    }

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📜 View Transaction History', 'viewTransactions')],
            [Markup.button.callback('📋 Pending Requests', 'viewPendingRequests')],
            [Markup.button.callback('⬅️ Back', 'backToMenu')]
        ])
    );
});

// --- View Pending Requests
bot.action('viewPendingRequests', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    let message = '⏳ Pending Requests:\n\n';
    
    let hasPending = false;
    
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        hasPending = true;
        message += '💰 Pending Deposits:\n';
        user.pendingDeposits.forEach((d, i) => {
            message += `${i + 1}. ${d.amount} PKR via ${d.method} - ${d.status || 'Pending'}\n`;
            message += `   ID: ${d.id}\n`;
        });
        message += '\n';
    }
    
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        hasPending = true;
        message += '💸 Pending Withdrawals:\n';
        user.pendingWithdrawals.forEach((w, i) => {
            message += `${i + 1}. ${w.amount} PKR to ${w.account} - ${w.status || 'Pending'}\n`;
            message += `   ID: ${w.id}\n`;
        });
    }
    
    if (!hasPending) {
        message = '✅ No pending requests.';
    }

    return ctx.reply(message, withBackButton([]));
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
        `💰 You selected ${accountType} for deposit.\n\n` +
        `📤 Please send payment to:\n\n` +
        `Account Title: M Hadi\n` +
        `Account Number: 03000382844\n` +
        `Account Type: ${accountType}\n\n` +
        `💵 Enter the amount you are sending (PKR):\n` +
        `• Minimum: 100 PKR\n` +
        `• Maximum: 5000 PKR\n` +
        `• Daily Limit: 20,000 PKR (5 transactions)`
    );
});

// --- Confirm Deposit (WITH DUPLICATE PREVENTION)
bot.action('confirmDeposit', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('Session expired.');

    const user = users[session.usernameKey];
    
    // Check if this request is already processed
    const requestKey = `deposit_${session.depositAmount}_${session.depositProof}`;
    if (user.processedRequests && user.processedRequests[requestKey]) {
        return ctx.answerCbQuery('This request has already been submitted.', { show_alert: true });
    }

    const { date, time } = getCurrentDateTime();
    
    // Calculate bonus (2%)
    const bonus = Math.floor(session.depositAmount * 0.02);
    const totalAmount = session.depositAmount + bonus;
    
    // Generate unique deposit ID
    const depositId = generateDepositId();
    
    // Update daily deposit count
    if (!user.dailyDeposits) user.dailyDeposits = { date: date, count: 0, amount: 0 };
    user.dailyDeposits.count += 1;
    user.dailyDeposits.amount += session.depositAmount;
    
    // Add to pending deposits
    if (!user.pendingDeposits) user.pendingDeposits = [];
    user.pendingDeposits.push({
        id: depositId,
        amount: session.depositAmount,
        bonus: bonus,
        totalAmount: totalAmount,
        method: session.depositMethod,
        proof: session.depositProof,
        date: date,
        time: time,
        status: 'pending'
    });

    // Mark as processed
    if (!user.processedRequests) user.processedRequests = {};
    user.processedRequests[requestKey] = true;
    
    saveUsers();
    
    // Send notification to admin
    const adminMsg = `
💰 DEPOSIT REQUEST
👤 User: ${user.firstName} (${session.usernameKey})
💵 Amount: ${session.depositAmount} PKR
🎁 Bonus: ${bonus} PKR (2%)
💰 Total: ${totalAmount} PKR
🏦 Method: ${session.depositMethod}
📝 Transaction ID: ${session.depositProof}
📅 Date: ${date} ⏰ Time: ${time}
📱 User Phone: ${user.phone}
📊 Daily: ${user.dailyDeposits.count}/5 deposits (${user.dailyDeposits.amount}/20,000 PKR)
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve Deposit', `admin_approve_deposit_${chatId}_${depositId}`)],
            [Markup.button.callback('❌ Reject', `admin_reject_deposit_${chatId}_${depositId}`)]
        ])
    );
    
    // Notify user
    await ctx.reply(
        `⏳ Deposit request submitted!\n\n` +
        `📋 Details:\n` +
        `• Amount: ${session.depositAmount} PKR\n` +
        `• Bonus: ${bonus} PKR\n` +
        `• Total to be added: ${totalAmount} PKR\n` +
        `• Method: ${session.depositMethod}\n` +
        `• Transaction ID: ${session.depositProof}\n` +
        `• Status: Pending Admin Approval\n\n` +
        `Request ID: ${depositId}\n` +
        `You will be notified once processed.`,
        withBackButton([])
    );
    
    // Reset session
    sessions[chatId].flow = null;
    sessions[chatId].step = null;
    delete session.depositAmount;
    delete session.depositMethod;
    delete session.depositProof;
});

// --- Withdraw Balance
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
        `• Daily Limit: 3 transactions (15,000 PKR)`,
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

// --- Confirm Withdraw (WITH DUPLICATE PREVENTION)
bot.action('confirmWithdraw', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('Session expired.');

    const user = users[session.usernameKey];
    
    // Check if this request is already processed
    const requestKey = `withdraw_${session.withdrawAmount}_${session.withdrawAccount}`;
    if (user.processedRequests && user.processedRequests[requestKey]) {
        return ctx.answerCbQuery('This request has already been submitted.', { show_alert: true });
    }

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

    // Mark as processed
    if (!user.processedRequests) user.processedRequests = {};
    user.processedRequests[requestKey] = true;
    
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
📱 User Phone: ${user.phone}
📊 Daily: ${user.dailyWithdrawals.count}/3 withdrawals (${user.dailyWithdrawals.amount}/15,000 PKR)
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve & Send', `admin_approve_withdraw_${chatId}_${withdrawId}`)],
            [Markup.button.callback('❌ Reject', `admin_reject_withdraw_${chatId}_${withdrawId}`)]
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
        if (t.bonus) historyMsg += `   Bonus: +${t.bonus} PKR\n`;
        if (t.fee) historyMsg += `   Fee: -${t.fee} PKR\n`;
        if (t.netAmount) historyMsg += `   Net: ${t.netAmount} PKR\n`;
        if (t.status) historyMsg += `   Status: ${t.status}\n`;
        if (t.rejectionReason) historyMsg += `   Reason: ${t.rejectionReason}\n`;
    });

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

// ======= HELPER FUNCTIONS =======
async function processDepositRejection(userChatId, depositId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('User not found.');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingDeposits) {
        await adminCtx.answerCbQuery('No pending deposits.');
        return;
    }

    const depositIndex = user.pendingDeposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
        await adminCtx.answerCbQuery('Deposit already processed.');
        return;
    }

    const deposit = user.pendingDeposits[depositIndex];
    const { date, time } = getCurrentDateTime();

    // Update daily deposit count
    if (user.dailyDeposits) {
        user.dailyDeposits.count = Math.max(0, user.dailyDeposits.count - 1);
        user.dailyDeposits.amount = Math.max(0, user.dailyDeposits.amount - deposit.amount);
    }

    // Add to transaction history with reason
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `Deposit ❌ (Rejected)`,
        amount: deposit.amount,
        date: date,
        time: time,
        proof: deposit.proof,
        status: 'rejected',
        rejectionReason: reason
    });

    // Notify user with reason
    await bot.telegram.sendMessage(
        userChatId,
        `❌ Deposit Rejected!\n\n` +
        `💰 Amount: ${deposit.amount} PKR\n` +
        `🏦 Method: ${deposit.method}\n` +
        `📝 Transaction ID: ${deposit.proof}\n` +
        `📅 Date: ${date} at ${time}\n\n` +
        `❌ Rejection Reason:\n${reason}\n\n` +
        `Contact admin for more information.`,
        withBackButton([])
    );

    // Remove from pending
    user.pendingDeposits.splice(depositIndex, 1);
    saveUsers();

    await adminCtx.editMessageText(`❌ Deposit Rejected\n\nUser: ${user.firstName}\nAmount: ${deposit.amount} PKR\nReason: ${reason}`);
}

async function processWithdrawRejection(userChatId, withdrawId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('User not found.');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) {
        await adminCtx.answerCbQuery('No pending withdrawals.');
        return;
    }

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) {
        await adminCtx.answerCbQuery('Withdrawal already processed.');
        return;
    }

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    // Return balance to user
    user.balance += withdraw.amount;
    
    // Update daily withdrawal count
    if (user.dailyWithdrawals) {
        user.dailyWithdrawals.count = Math.max(0, user.dailyWithdrawals.count - 1);
        user.dailyWithdrawals.amount = Math.max(0, user.dailyWithdrawals.amount - withdraw.amount);
    }

    // Add to transaction history with reason
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `Withdrawal ❌ (Rejected)`,
        amount: withdraw.amount,
        date: date,
        time: time,
        account: withdraw.account,
        status: 'rejected',
        rejectionReason: reason
    });

    // Notify user with reason
    await bot.telegram.sendMessage(
        userChatId,
        `❌ Withdrawal Rejected!\n\n` +
        `💰 Amount: ${withdraw.amount} PKR\n` +
        `🏦 Method: ${withdraw.method}\n` +
        `📱 Account: ${withdraw.account}\n` +
        `📅 Date: ${date} at ${time}\n\n` +
        `❌ Rejection Reason:\n${reason}\n\n` +
        `Your balance has been restored.\n` +
        `Current Balance: ${user.balance} PKR`,
        withBackButton([])
    );

    // Remove from pending
    user.pendingWithdrawals.splice(withdrawIndex, 1);
    saveUsers();

    await adminCtx.editMessageText(`❌ Withdrawal Rejected\n\nUser: ${user.firstName}\nAmount: ${withdraw.amount} PKR returned to balance.\nReason: ${reason}`);
}

// ======= ADMIN APPROVAL FOR DEPOSITS =======
bot.action(/admin_approve_deposit_(\d+)_(dep_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, depositId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('User not found.');

    const user = users[session.usernameKey];
    if (!user.pendingDeposits) return ctx.answerCbQuery('No pending deposits.');

    const depositIndex = user.pendingDeposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) return ctx.answerCbQuery('Deposit already processed.');

    const deposit = user.pendingDeposits[depositIndex];
    const { date, time } = getCurrentDateTime();

    // Add balance with bonus
    user.balance += deposit.totalAmount;
    
    // Add to transaction history
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `Deposit ➕ (${deposit.method})`,
        amount: deposit.amount,
        bonus: deposit.bonus,
        totalAmount: deposit.totalAmount,
        date: date,
        time: time,
        proof: deposit.proof,
        status: 'approved'
    });

    saveUsers();

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `✅ Deposit Approved!\n\n` +
        `💰 Amount: ${deposit.amount} PKR\n` +
        `🎁 Bonus: ${deposit.bonus} PKR\n` +
        `💵 Total Added: ${deposit.totalAmount} PKR\n` +
        `🏦 Method: ${deposit.method}\n` +
        `📝 Transaction ID: ${deposit.proof}\n` +
        `📅 Date: ${date} at ${time}\n\n` +
        `New Balance: ${user.balance} PKR`,
        withBackButton([])
    );

    // Remove from pending
    user.pendingDeposits.splice(depositIndex, 1);
    saveUsers();

    await ctx.editMessageText(`✅ Deposit Approved\n\nUser: ${user.firstName}\nAmount: ${deposit.totalAmount} PKR added (${deposit.amount} + ${deposit.bonus} bonus)`);
});

bot.action(/admin_reject_deposit_(\d+)_(dep_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, depositId] = ctx.match;
    
    // Store rejection data and ask for reason
    const adminSession = sessions[ctx.chat.id] || {};
    adminSession.flow = 'admin_reject_reason';
    sessions[ctx.chat.id] = adminSession;
    
    pendingAdminRejections[ctx.chat.id] = {
        requestType: 'deposit',
        userChatId: userChatId,
        requestId: depositId
    };
    
    await ctx.answerCbQuery();
    await ctx.reply('📝 Please enter the reason for rejecting this deposit request:');
});

// ======= ADMIN APPROVAL FOR WITHDRAWALS =======
bot.action(/admin_approve_withdraw_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
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

    await ctx.editMessageText(`✅ Withdrawal Approved & Amount Sent\n\nUser: ${user.firstName}\nAmount: ${withdraw.netAmount} PKR sent to ${withdraw.account}`);
});

bot.action(/admin_reject_withdraw_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    
    // Store rejection data and ask for reason
    const adminSession = sessions[ctx.chat.id] || {};
    adminSession.flow = 'admin_reject_reason';
    sessions[ctx.chat.id] = adminSession;
    
    pendingAdminRejections[ctx.chat.id] = {
        requestType: 'withdraw',
        userChatId: userChatId,
        requestId: withdrawId
    };
    
    await ctx.answerCbQuery();
    await ctx.reply('📝 Please enter the reason for rejecting this withdrawal request:');
});

// ===== LAUNCH =====
bot.launch();
console.log('Bot running...');

