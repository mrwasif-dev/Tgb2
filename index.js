const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ===== BOT =====
const bot = new Telegraf('8226474686:AAEmXiWRGoeaa5pZpF2MZlYViYmSkM70fbI');
const ADMIN_ID = 6012422087;

// ===== DATABASE =====
const DATA_FILE = './users.json';
let users = {};
let plans = []; // Array to store all plans

// Load data from file
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        users = data.users || {};
        plans = data.plans || [];
    } catch (error) {
        console.log('Error loading data:', error);
        users = {};
        plans = [];
    }
}

function saveUsers() {
    const data = { users, plans };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Initialize default plans if empty
if (plans.length === 0) {
    plans = [
        { id: 'plan_350', name: 'Basic Plan', price: 350, duration: 15, features: '1 WhatsApp link device', devices: 1, active: true },
        { id: 'plan_500', name: 'Standard Plan', price: 500, duration: 30, features: '1 WhatsApp link device', devices: 1, active: true },
        { id: 'plan_1000', name: 'Premium Plan', price: 1000, duration: 90, features: '2 WhatsApp link devices', devices: 2, active: true }
    ];
    saveUsers();
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
        [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
    ]);
}

// ======= Generate Unique IDs =======
function generateDepositId() {
    return 'dep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function generateWithdrawId() {
    return 'wd_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function generatePlanId() {
    return 'plan_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function generateUpgradeId() {
    return 'upgrade_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// ======= Helper Functions =======
function calculateEndDate(startDate, durationDays) {
    const [day, month, year] = startDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + durationDays);
    
    const endDay = String(date.getDate()).padStart(2, '0');
    const endMonth = String(date.getMonth() + 1).padStart(2, '0');
    const endYear = date.getFullYear();
    
    return `${endDay}-${endMonth}-${endYear}`;
}

// ======= START =======
bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];

    // Check if admin
    if (chatId.toString() === ADMIN_ID.toString()) {
        return ctx.reply(
            '👑 Welcome Admin! 👑\n\nSelect an admin feature:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 All Users Stats', 'adminAllUsers')],
                [Markup.button.callback('🔍 Search User', 'adminSearchUser')],
                [Markup.button.callback('💰 Manual Balance Update', 'adminBalanceUpdate')],
                [Markup.button.callback('📋 View All Transactions', 'adminAllTransactions')],
                [Markup.button.callback('🚫 Ban/Unban User', 'adminBanUser')],
                [Markup.button.callback('🤖 Plan Management', 'adminPlanManagement')],
                [Markup.button.callback('👤 User Mode', 'userMode')]
            ])
        );
    }

    if (session && session.usernameKey && users[session.usernameKey]) {
        const user = users[session.usernameKey];
        
        // Check if user is banned
        if (user.isBanned) {
            return ctx.reply(
                '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
                Markup.inlineKeyboard([
                    [Markup.button.callback('📞 Contact Support', 'contactSupport')]
                ])
            );
        }
        
        return ctx.reply(
            `✨ Welcome back, ${user.firstName}! ✨\n\n💡 What would you like to do today?`,
            Markup.inlineKeyboard([
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('🤖 Buy WhatsApp Bot', 'buyBot')],
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
                [Markup.button.callback('📞 Contact Support', 'contactSupport')],
                [Markup.button.callback('🚪 Log Out', 'logOut')]
            ])
        );
    }

    await ctx.reply(
        '👋 Welcome to Paid WhatsApp Bot! 👋\n\n✨ Your Complete WhatsApp Automation Solution ✨\n\n🚀 Features:\n✅ Automated WhatsApp Messaging\n✅ Bulk Message Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n✅ Real-time Analytics\n\n📱 Get Started:\nPlease sign up for a new account or log in to continue:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📝 Sign Up - Create New Account', 'signup')],
            [Markup.button.callback('🔐 Log In - Existing Account', 'login')],
            [Markup.button.callback('📞 Contact Support', 'contactSupport')]
        ])
    );
});

// ======= BUTTON ACTIONS =======
bot.action('signup', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'signup', step: 'firstName' };
    await ctx.reply(
        '✨ Account Registration Process ✨\n\n📝 Step 1: Personal Information 📝\n\nPlease enter your first name:\n\n💡 Example: Muhammad Ali\n\n📌 Requirements:\n• 2-30 characters\n• No special symbols'
    );
});

bot.action('login', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'login', step: 'loginUsername' };
    await ctx.reply(
        '🔐 Account Login 🔐\n\n👤 Please enter your username to continue:\n\n📌 Your username is the one you chose during registration.\n\n💡 Example: ali_123\n\n❓ Forgot username?\nContact our support team for assistance.'
    );
});

bot.action('forgotPassword', async (ctx) => {
    await ctx.reply(
        '🔒 Password Recovery 🔒\n\n⚠️ Important Notice:\nPassword recovery is not supported at this time.\n\n📞 Please Contact Support:\nIf you have forgotten your password, please:\n1. Contact our support team\n2. Or create a new account\n\n🔗 Support: @your_support',
        withBackButton([])
    );
});

bot.action('contactSupport', async (ctx) => {
    await ctx.reply(
        '📞 24/7 Customer Support 📞\n\n🔗 Click the link below to contact our support team:\n\n👉 @help_paid_whatsapp_bot\n\n⏰ Support Hours: 24/7\n⚡ Response Time: Usually within minutes\n\n💡 How we can help:\n• Account issues\n• Deposit/Withdrawal problems\n• Bot setup assistance\n• Technical support\n• General inquiries',
        Markup.inlineKeyboard([
            [Markup.button.url('💬 Chat with Support', 'https://t.me/help_paid_whatsapp_bot')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

bot.action('checkBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }

    const { date, time } = getCurrentDateTime();
    
    let message = '💰 Account Balance Summary 💰\n\n';
    message += '👤 Account Holder: ' + user.firstName + '\n';
    message += '💳 Current Balance: ' + (user.balance || 0) + ' PKR\n';
    message += '📅 Date: ' + date + '\n';
    message += '⏰ Time: ' + time + '\n\n';
    
    const today = getCurrentDateTime().date;
    if (user.dailyDeposits && user.dailyDeposits.date === today) {
        message += '📥 Today\'s Deposit Activity:\n';
        message += '   • Amount: ' + user.dailyDeposits.amount + '/20,000 PKR\n';
        message += '   • Transactions: ' + user.dailyDeposits.count + '/5\n\n';
    } else {
        message += '📥 Today\'s Deposit Activity:\n';
        message += '   • No deposits today\n\n';
    }
    
    if (user.dailyWithdrawals && user.dailyWithdrawals.date === today) {
        message += '📤 Today\'s Withdrawal Activity:\n';
        message += '   • Amount: ' + user.dailyWithdrawals.amount + '/15,000 PKR\n';
        message += '   • Transactions: ' + user.dailyWithdrawals.count + '/3\n\n';
    } else {
        message += '📤 Today\'s Withdrawal Activity:\n';
        message += '   • No withdrawals today\n\n';
    }

    message += '💡 Quick Actions:';

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📜 View Full Transaction History', 'viewTransactions')],
            [Markup.button.callback('📋 Check Pending Requests', 'viewPendingRequests')],
            [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
            [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

bot.action('viewPendingRequests', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }

    let message = '⏳ Pending Requests Overview ⏳\n\n';
    
    let hasPending = false;
    
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        hasPending = true;
        message += '📥 Pending Deposits:\n';
        user.pendingDeposits.forEach((d, i) => {
            message += i + 1 + '. ' + d.amount + ' PKR via ' + d.method + '\n';
            message += '   📅 Date: ' + d.date + '\n';
            message += '   ⏰ Time: ' + d.time + '\n';
            message += '   🔑 ID: ' + d.id + '\n';
            message += '   📊 Status: ' + (d.status || '🔄 Pending') + '\n\n';
        });
    } else {
        message += '📥 Pending Deposits:\n';
        message += '   ✅ No pending deposits\n\n';
    }
    
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        hasPending = true;
        message += '📤 Pending Withdrawals:\n';
        user.pendingWithdrawals.forEach((w, i) => {
            message += i + 1 + '. ' + w.amount + ' PKR to ' + w.account + '\n';
            message += '   📅 Date: ' + w.date + '\n';
            message += '   ⏰ Time: ' + w.time + '\n';
            message += '   🔑 ID: ' + w.id + '\n';
            message += '   📊 Status: ' + (w.status || '🔄 Pending') + '\n\n';
        });
    } else {
        message += '📤 Pending Withdrawals:\n';
        message += '   ✅ No pending withdrawals\n\n';
    }
    
    if (user.pendingPlans && user.pendingPlans.length > 0) {
        hasPending = true;
        message += '🤖 Pending Plans:\n';
        user.pendingPlans.forEach((p, i) => {
            message += i + 1 + '. ' + p.name + ' (' + p.price + ' PKR)\n';
            message += '   📅 Date: ' + p.date + '\n';
            message += '   ⏰ Time: ' + p.time + '\n';
            message += '   🔑 ID: ' + p.id + '\n';
            message += '   📊 Status: ' + (p.status || '🔄 Pending') + '\n\n';
        });
    }
    
    if (user.pendingUpgrades && user.pendingUpgrades.length > 0) {
        hasPending = true;
        message += '🔼 Pending Upgrades:\n';
        user.pendingUpgrades.forEach((u, i) => {
            message += i + 1 + '. ' + u.fromPlan + ' → ' + u.toPlan + '\n';
            message += '   💰 Cost: ' + u.cost + ' PKR\n';
            message += '   📅 Date: ' + u.date + '\n';
            message += '   ⏰ Time: ' + u.time + '\n';
            message += '   🔑 ID: ' + u.id + '\n';
            message += '   📊 Status: ' + (u.status || '🔄 Pending') + '\n\n';
        });
    }
    
    if (!hasPending) {
        message = '✅ All Clear! ✅\n\n🎉 You have no pending requests.\n📊 All your transactions are processed.\n\n💡 Ready for your next transaction?';
    }

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📥 New Deposit', 'depositBalance')],
            [Markup.button.callback('📤 New Withdrawal', 'withdrawBalance')],
            [Markup.button.callback('🤖 New Plan', 'buyBot')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

bot.action('depositBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }

    sessions[ctx.chat.id].flow = 'deposit';
    sessions[ctx.chat.id].step = null;

    await ctx.reply(
        '📥 Deposit Funds 📥\n\n💰 Current Balance: ' + (user.balance || 0) + ' PKR\n\n🏦 Select Deposit Method:\n\nChoose your preferred payment method:\n\n💡 All methods support instant processing\n\n📊 Daily Limits:\n• Max 5 transactions\n• Max 20,000 PKR per day',
        Markup.inlineKeyboard([
            [Markup.button.callback('✈️ JazzCash - Fast & Secure', 'depositJazzCash')],
            [Markup.button.callback('🏦 EasyPaisa - Most Popular', 'depositEasyPaisa')],
            [Markup.button.callback('💳 U-Paisa - Reliable Service', 'depositUPaisa')],
            [Markup.button.callback('💰 Check Balance', 'checkBalance')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

bot.action(/deposit(JazzCash|EasyPaisa|UPaisa)/, async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }

    const method = ctx.match[1];
    session.depositMethod = method;
    session.flow = 'deposit';
    session.step = 'enterAmount';

    const accountType = method === 'UPaisa' ? 'U-Paisa' : method;

    await ctx.reply(
        '🏦 ' + accountType + ' Deposit Method Selected 🏦\n\n✅ Payment Instructions:\n\n📤 Send Payment To:\n\n👤 Account Title: M Hadi\n🔢 Account Number: 03000382844\n🏦 Account Type: ' + accountType + '\n\n💵 Amount Requirements:\n• Minimum: 100 PKR\n• Maximum: 5,000 PKR per transaction\n• Daily Limit: 20,000 PKR\n\n🎁 Special Bonus:\n• Get 2% bonus on every deposit!\n\n💰 Your Current Balance: ' + (user.balance || 0) + ' PKR\n\n🔢 Enter Deposit Amount (PKR):',
        withBackButton([])
    );
});

bot.action('confirmDeposit', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 Account suspended by admin.', { show_alert: true });
    }
    
    const requestKey = `deposit_${session.depositAmount}_${session.depositProof}`;
    if (user.processedRequests && user.processedRequests[requestKey]) {
        return ctx.answerCbQuery('📝 This request has already been submitted.', { show_alert: true });
    }

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('Could not update message:', e.message);
    }

    const { date, time } = getCurrentDateTime();
    
    const bonus = Math.floor(session.depositAmount * 0.02);
    const totalAmount = session.depositAmount + bonus;
    
    const depositId = generateDepositId();
    
    if (!user.dailyDeposits) user.dailyDeposits = { date: date, count: 0, amount: 0 };
    user.dailyDeposits.count += 1;
    user.dailyDeposits.amount += session.depositAmount;
    
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

    if (!user.processedRequests) user.processedRequests = {};
    user.processedRequests[requestKey] = true;
    
    saveUsers();
    
    const adminMsg = `
💰 NEW DEPOSIT REQUEST 💰

👤 User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}

💵 Transaction Details:
• Amount: ${session.depositAmount} PKR
• Bonus (2%): ${bonus} PKR 🎁
• Total: ${totalAmount} PKR 💰
• Method: ${session.depositMethod}
• Transaction ID: ${session.depositProof}

📅 Request Details:
• Date: ${date}
• Time: ${time}
• Request ID: ${depositId}

📊 Daily Statistics:
• Today\'s Deposits: ${user.dailyDeposits.count}/5
• Today\'s Amount: ${user.dailyDeposits.amount}/20,000 PKR
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve Deposit', `admin_approve_deposit_${chatId}_${depositId}`)],
            [Markup.button.callback('❌ Reject Request', `admin_reject_deposit_${chatId}_${depositId}`)]
        ])
    );
    
    await ctx.reply(
        '⏳ Deposit Request Submitted Successfully! ⏳\n\n✅ Request Details:\n💵 Amount: ' + session.depositAmount + ' PKR\n🎁 Bonus: ' + bonus + ' PKR\n💰 Total to Add: ' + totalAmount + ' PKR\n🏦 Method: ' + session.depositMethod + '\n📝 Transaction ID: ' + session.depositProof + '\n\n📊 Status: Pending Admin Approval 🔄\n\n🔑 Request ID: ' + depositId + '\n\n⏰ Processing Time:\n• Usually within 15-30 minutes\n• You will be notified upon approval\n\n💡 Note:\nKeep your transaction proof safe for verification.\n\n📞 Support Available 24/7'
    );
    
    sessions[chatId].flow = null;
    sessions[chatId].step = null;
    delete session.depositAmount;
    delete session.depositMethod;
    delete session.depositProof;
});

bot.action('withdrawBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }
    
    if (user.balance < 200) {
        return ctx.reply(
            '❌ Minimum Balance Required ❌\n\n📝 Minimum balance for withdrawal is 200 PKR.\n\n💰 Your Current Balance: ' + user.balance + ' PKR\n\n💡 Suggestions:\n1. Deposit more funds\n2. Wait for pending deposits\n3. Check transaction history\n\n📥 Ready to deposit?',
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    sessions[ctx.chat.id].flow = 'withdraw';
    sessions[ctx.chat.id].step = 'enterAmount';

    return ctx.reply(
        '📤 Withdraw Funds 📤\n\n💰 Available Balance: ' + user.balance + ' PKR\n\n💵 Withdrawal Requirements:\n• Minimum: 200 PKR\n• Maximum: 5,000 PKR per transaction\n• Daily Limit: 3 withdrawals (15,000 PKR)\n\n📉 Processing Fee:\n• 2% fee applies (minimum 10 PKR)\n\n🏦 Supported Methods:\n• JazzCash\n• EasyPaisa\n• U-Paisa\n\n🔢 Enter withdrawal amount (PKR):',
        withBackButton([])
    );
});

bot.action(/withdraw(JazzCash|EasyPaisa|UPaisa)/, async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }

    const method = ctx.match[1];
    session.withdrawMethod = method;
    session.step = 'enterAccountNumber';

    const accountType = method === 'UPaisa' ? 'U-Paisa' : method;
    
    return ctx.reply(
        '🏦 ' + accountType + ' Withdrawal Selected 🏦\n\n✅ Account Information Required\n\n📱 Please enter your ' + accountType + ' account number:\n\n📌 Format Requirements:\n• 11 digits starting with 03\n• No spaces or dashes\n• Must be your registered number\n\n💡 Example: 03001234567\n\n⚠️ Important:\n• Ensure account is active\n• Double-check number\n• Funds will be sent to this number\n\n🔢 Enter your account number:'
    );
});

bot.action('confirmWithdraw', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 Account suspended by admin.', { show_alert: true });
    }
    
    const requestKey = `withdraw_${session.withdrawAmount}_${session.withdrawAccount}`;
    if (user.processedRequests && user.processedRequests[requestKey]) {
        return ctx.answerCbQuery('📝 This request has already been submitted.', { show_alert: true });
    }

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('Could not update message:', e.message);
    }

    const { date, time } = getCurrentDateTime();
    
    const processingFee = Math.max(10, Math.floor(session.withdrawAmount * 0.02));
    const netAmount = session.withdrawAmount - processingFee;
    
    const withdrawId = generateWithdrawId();
    
    user.balance -= session.withdrawAmount;
    
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
    
    if (!user.dailyWithdrawals) user.dailyWithdrawals = { date: date, count: 0, amount: 0 };
    user.dailyWithdrawals.count += 1;
    user.dailyWithdrawals.amount += session.withdrawAmount;

    if (!user.processedRequests) user.processedRequests = {};
    user.processedRequests[requestKey] = true;
    
    saveUsers();
    
    const adminMsg = `
💸 NEW WITHDRAWAL REQUEST 💸

👤 User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}

💵 Transaction Details:
• Amount: ${session.withdrawAmount} PKR
• Processing Fee: ${processingFee} PKR 📉
• Net Amount: ${netAmount} PKR 💰
• Method: ${session.withdrawMethod}
• Account: ${session.withdrawAccount}

📅 Request Details:
• Date: ${date}
• Time: ${time}
• Request ID: ${withdrawId}

💰 Account Status:
• New Balance: ${user.balance} PKR
• Today\'s Withdrawals: ${user.dailyWithdrawals.count}/3
• Today\'s Amount: ${user.dailyWithdrawals.amount}/15,000 PKR
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve & Initiate Transfer', `admin_approve_withdraw_${chatId}_${withdrawId}`)],
            [Markup.button.callback('❌ Reject Request', `admin_reject_withdraw_${chatId}_${withdrawId}`)]
        ])
    );
    
    await ctx.reply(
        '⏳ Withdrawal Request Submitted Successfully! ⏳\n\n✅ Request Details:\n💵 Amount: ' + session.withdrawAmount + ' PKR\n📉 Fee: ' + processingFee + ' PKR\n💰 Net Amount: ' + netAmount + ' PKR\n🏦 Method: ' + session.withdrawMethod + '\n📱 Account: ' + session.withdrawAccount + '\n\n📊 Status: Pending Admin Approval 🔄\n\n🔑 Request ID: ' + withdrawId + '\n\n💰 Account Update:\n• Old Balance: ' + (user.balance + session.withdrawAmount) + ' PKR\n• New Balance: ' + user.balance + ' PKR\n• Amount Held: ' + session.withdrawAmount + ' PKR ⏳\n\n⏰ Processing Time:\n• Usually within 1-2 hours\n• You will be notified upon completion\n\n💡 Note:\nFunds will be temporarily held until approval.\n\n📞 Support Available 24/7'
    );
    
    sessions[chatId].flow = null;
    sessions[chatId].step = null;
    delete session.withdrawAmount;
    delete session.withdrawMethod;
    delete session.withdrawAccount;
});

// ======= Buy WhatsApp Bot =======
bot.action('buyBot', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }

    return ctx.reply(
        '🤖 WhatsApp Bot Purchase Portal 🤖\n\n✨ Choose an option below to proceed:\n\n🔸 Active Plan: Buy a new WhatsApp Bot plan\n🔸 Upgrade Plan: Upgrade your existing plan\n🔸 View Activated Plan: Check your current plan details',
        Markup.inlineKeyboard([
            [Markup.button.callback('🚀 Active Plan', 'activePlanMenu')],
            [Markup.button.callback('📈 Upgrade Plan', 'upgradePlanMenu')],
            [Markup.button.callback('👁️ View Activated Plan', 'viewActivatedPlan')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

bot.action('activePlanMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const activePlans = plans.filter(plan => plan.active);
    
    if (activePlans.length === 0) {
        return ctx.reply(
            '❌ No Active Plans Available ❌\n\nThere are currently no active plans available for purchase.\n\n📞 Please contact support for more information.',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')],
                [Markup.button.callback('🔙 Back to Bot Menu', 'buyBot')]
            ])
        );
    }

    let message = '🚀 Active WhatsApp Bot Plans 🚀\n\n📊 Choose a plan to subscribe:\n\n';
    
    activePlans.forEach((plan, index) => {
        message += `${index + 1}️⃣ **${plan.name}**\n`;
        message += `   💰 Price: ${plan.price} PKR\n`;
        message += `   📅 Duration: ${plan.duration} days\n`;
        message += `   📱 Features: ${plan.features}\n\n`;
    });

    const buttons = [];
    activePlans.forEach(plan => {
        buttons.push([Markup.button.callback(`🛒 Buy ${plan.name} (${plan.price} PKR)`, `buyPlan_${plan.id}`)]);
    });
    
    buttons.push(
        [Markup.button.callback('🔙 Back to Bot Menu', 'buyBot')]
    );

    return ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

bot.action(/buyPlan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 Account suspended by admin.', { show_alert: true });
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan || !plan.active) {
        return ctx.answerCbQuery('❌ Plan not available!', { show_alert: true });
    }

    session.planDetails = plan;
    session.planPrice = plan.price;

    if ((user.balance || 0) < plan.price) {
        return ctx.reply(
            `❌ Insufficient Balance ❌\n\n🤖 Plan: ${plan.name}\n💰 Required: ${plan.price} PKR\n💳 Your Balance: ${user.balance || 0} PKR\n\n💡 You need ${plan.price - (user.balance || 0)} PKR more to purchase this plan.\n\n📥 Options:\n1. Deposit more funds\n2. Choose a cheaper plan`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('🚀 Active Plans', 'activePlanMenu')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    return ctx.reply(
        `🛒 Confirm Plan Purchase 🛒\n\n📋 Plan Details:\n✨ Plan Name: ${plan.name}\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} days\n📱 Features: ${plan.features}\n\n💳 Your Balance: ${user.balance || 0} PKR\n💳 After Purchase: ${(user.balance || 0) - plan.price} PKR\n\n✅ Are you sure you want to purchase this plan?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Yes, Confirm Purchase', `confirmPlanPurchase_${planId}`)],
            [Markup.button.callback('❌ No, Cancel', 'activePlanMenu')]
        ])
    );
});

bot.action(/confirmPlanPurchase_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 Account suspended by admin.', { show_alert: true });
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan || !plan.active) {
        return ctx.answerCbQuery('❌ Plan not available!', { show_alert: true });
    }

    if ((user.balance || 0) < plan.price) {
        return ctx.answerCbQuery('❌ Insufficient balance! Please deposit more funds.', { show_alert: true });
    }

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('Could not update message:', e.message);
    }

    const { date, time } = getCurrentDateTime();
    const requestId = generatePlanId();

    user.balance -= plan.price;

    if (!user.pendingPlans) user.pendingPlans = [];
    user.pendingPlans.push({
        id: requestId,
        planId: plan.id,
        name: plan.name,
        price: plan.price,
        duration: plan.duration,
        features: plan.features,
        devices: plan.devices,
        date: date,
        time: time,
        status: 'pending'
    });

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '🤖 Plan Purchase - Pending',
        amount: plan.price,
        date: date,
        time: time,
        planName: plan.name,
        status: 'pending_admin_approval'
    });

    saveUsers();

    const adminMsg = `
🤖 NEW PLAN PURCHASE REQUEST 🤖

👤 User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}
• Balance After Deduction: ${user.balance} PKR

📋 Plan Details:
• Plan Name: ${plan.name}
• Price: ${plan.price} PKR
• Duration: ${plan.duration} days
• Features: ${plan.features}
• Devices: ${plan.devices}

📅 Request Details:
• Date: ${date}
• Time: ${time}
• Request ID: ${requestId}

💰 Payment Status: Amount deducted from user balance
`;

    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve & Enter URL', `admin_approve_plan_${chatId}_${requestId}`)],
            [Markup.button.callback('❌ Reject & Refund', `admin_reject_plan_${chatId}_${requestId}`)]
        ])
    );

    await ctx.reply(
        `⏳ Plan Purchase Request Submitted! ⏳\n\n✅ Request Details:\n✨ Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} days\n📱 Features: ${plan.features}\n\n📊 Status: Pending Admin Approval 🔄\n\n🔑 Request ID: ${requestId}\n\n💰 Account Update:\n• Previous Balance: ${user.balance + plan.price} PKR\n• New Balance: ${user.balance} PKR\n• Amount Held: ${plan.price} PKR ⏳\n\n⏰ Processing Time:\n• Usually within 15-30 minutes\n• You will receive WhatsApp link upon approval\n\n📞 Support Available 24/7`
    );

    delete session.planDetails;
    delete session.planPrice;
});

bot.action('upgradePlanMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    if (!user.activePlan) {
        return ctx.reply(
            '❌ No Active Plan Found ❌\n\nYou don\'t have any active WhatsApp Bot plan.\n\n💡 Please purchase a plan first to use upgrade feature.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Buy New Plan', 'activePlanMenu')],
                [Markup.button.callback('🔙 Back to Bot Menu', 'buyBot')]
            ])
        );
    }

    const currentPlanPrice = user.activePlan.price;
    const availableUpgrades = plans
        .filter(plan => plan.active && plan.price > currentPlanPrice)
        .sort((a, b) => a.price - b.price);

    if (availableUpgrades.length === 0) {
        return ctx.reply(
            '✨ You have the highest plan! ✨\n\n🎉 Congratulations! You already have the highest available plan.\n\n💡 No upgrades available at the moment.',
            Markup.inlineKeyboard([
                [Markup.button.callback('👁️ View My Plan', 'viewActivatedPlan')],
                [Markup.button.callback('🔙 Back to Bot Menu', 'buyBot')]
            ])
        );
    }

    let message = `📈 Upgrade Your Plan 📈\n\n📋 Current Plan:\n✨ ${user.activePlan.name}\n💰 ${user.activePlan.price} PKR\n📅 ${user.activePlan.duration}\n📱 ${user.activePlan.features}\n\n🔼 Available Upgrades:\n\n`;
    
    availableUpgrades.forEach((plan, index) => {
        const upgradeCost = plan.price - currentPlanPrice;
        message += `${index + 1}. **${plan.name}**\n`;
        message += `   💰 Price: ${plan.price} PKR\n`;
        message += `   🔼 Upgrade Cost: ${upgradeCost} PKR\n`;
        message += `   📅 Duration: ${plan.duration} days\n`;
        message += `   📱 Features: ${plan.features}\n\n`;
    });

    const buttons = [];
    availableUpgrades.forEach(plan => {
        const upgradeCost = plan.price - currentPlanPrice;
        buttons.push([Markup.button.callback(`🔼 Upgrade to ${plan.name} (+${upgradeCost} PKR)`, `upgradePlan_${plan.id}`)]);
    });
    
    buttons.push(
        [Markup.button.callback('🔙 Back to Bot Menu', 'buyBot')]
    );

    return ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

bot.action(/upgradePlan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 Account suspended by admin.', { show_alert: true });
    }

    if (!user.activePlan) {
        return ctx.answerCbQuery('❌ No active plan found!', { show_alert: true });
    }

    const upgradePlan = plans.find(p => p.id === planId);
    if (!upgradePlan || !upgradePlan.active) {
        return ctx.answerCbQuery('❌ Plan not available!', { show_alert: true });
    }

    if (upgradePlan.price <= user.activePlan.price) {
        return ctx.answerCbQuery('❌ This is not a valid upgrade!', { show_alert: true });
    }

    const upgradeCost = upgradePlan.price - user.activePlan.price;

    session.upgradeDetails = upgradePlan;
    session.upgradePrice = upgradePlan.price;
    session.upgradeCost = upgradeCost;

    if ((user.balance || 0) < upgradeCost) {
        return ctx.reply(
            `❌ Insufficient Balance for Upgrade ❌\n\n🔼 Upgrade to: ${upgradePlan.name}\n💰 Upgrade Cost: ${upgradeCost} PKR (from ${user.activePlan.price} to ${upgradePlan.price})\n💳 Your Balance: ${user.balance || 0} PKR\n\n💡 You need ${upgradeCost - (user.balance || 0)} PKR more to upgrade.\n\n📥 Options:\n1. Deposit more funds\n2. Stick with current plan`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('📈 Upgrade Options', 'upgradePlanMenu')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    return ctx.reply(
        `🔼 Confirm Plan Upgrade 🔼\n\n📋 Upgrade Details:\n🔄 From: ${user.activePlan.name} (${user.activePlan.price} PKR)\n🎯 To: ${upgradePlan.name} (${upgradePlan.price} PKR)\n💰 Upgrade Cost: ${upgradeCost} PKR\n📅 Duration: ${upgradePlan.duration} days\n📱 Features: ${upgradePlan.features}\n\n💳 Your Balance: ${user.balance || 0} PKR\n💳 After Upgrade: ${(user.balance || 0) - upgradeCost} PKR\n\n✅ Are you sure you want to upgrade your plan?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Yes, Confirm Upgrade', `confirmUpgrade_${planId}`)],
            [Markup.button.callback('❌ No, Cancel', 'upgradePlanMenu')]
        ])
    );
});

bot.action(/confirmUpgrade_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 Account suspended by admin.', { show_alert: true });
    }

    if ((user.balance || 0) < session.upgradeCost) {
        return ctx.answerCbQuery('❌ Insufficient balance for upgrade!', { show_alert: true });
    }

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('Could not update message:', e.message);
    }

    const { date, time } = getCurrentDateTime();
    const upgradeId = generateUpgradeId();

    user.balance -= session.upgradeCost;

    if (!user.pendingUpgrades) user.pendingUpgrades = [];
    user.pendingUpgrades.push({
        id: upgradeId,
        planId: planId,
        fromPlan: user.activePlan.name,
        toPlan: session.upgradeDetails.name,
        cost: session.upgradeCost,
        date: date,
        time: time,
        status: 'pending'
    });

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '🔼 Plan Upgrade - Pending',
        amount: session.upgradeCost,
        date: date,
        time: time,
        details: `Upgrade from ${user.activePlan.name} to ${session.upgradeDetails.name}`,
        status: 'pending_admin_approval'
    });

    saveUsers();

    const adminMsg = `
🔼 NEW PLAN UPGRADE REQUEST 🔼

👤 User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}
• Balance After Deduction: ${user.balance} PKR

📋 Upgrade Details:
• From: ${user.activePlan.name} (${user.activePlan.price} PKR)
• To: ${session.upgradeDetails.name} (${session.upgradeDetails.price} PKR)
• Upgrade Cost: ${session.upgradeCost} PKR
• New Features: ${session.upgradeDetails.features}

📅 Request Details:
• Date: ${date}
• Time: ${time}
• Request ID: ${upgradeId}

💰 Payment Status: Upgrade cost deducted from user balance
`;

    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve Upgrade', `admin_approve_upgrade_${chatId}_${upgradeId}`)],
            [Markup.button.callback('❌ Reject & Refund', `admin_reject_upgrade_${chatId}_${upgradeId}`)]
        ])
    );

    await ctx.reply(
        `⏳ Plan Upgrade Request Submitted! ⏳\n\n✅ Request Details:\n🔄 From: ${user.activePlan.name}\n🎯 To: ${session.upgradeDetails.name}\n💰 Upgrade Cost: ${session.upgradeCost} PKR\n\n📊 Status: Pending Admin Approval 🔄\n\n🔑 Request ID: ${upgradeId}\n\n💰 Account Update:\n• Previous Balance: ${user.balance + session.upgradeCost} PKR\n• New Balance: ${user.balance} PKR\n• Amount Held: ${session.upgradeCost} PKR ⏳\n\n⏰ Processing Time:\n• Usually within 15-30 minutes\n• You will be notified upon approval\n\n📞 Support Available 24/7`
    );

    delete session.upgradeDetails;
    delete session.upgradePrice;
    delete session.upgradeCost;
});

bot.action('viewActivatedPlan', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }

    if (!user.activePlan) {
        return ctx.reply(
            '📭 No Active Plan 📭\n\nYou don\'t have any active WhatsApp Bot plan.\n\n💡 Purchase a plan to start using WhatsApp Bot services:',
            Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Buy New Plan', 'activePlanMenu')],
                [Markup.button.callback('🔙 Back to Bot Menu', 'buyBot')]
            ])
        );
    }

    const plan = user.activePlan;
    let message = `✨ Your Active Plan ✨\n\n`;
    message += `📋 Plan Details:\n`;
    message += `🎯 Plan Name: ${plan.name}\n`;
    message += `💰 Price: ${plan.price} PKR\n`;
    message += `📅 Duration: ${plan.duration}\n`;
    message += `📱 Features: ${plan.features}\n`;
    message += `🔗 Devices: ${plan.devices} WhatsApp link device(s)\n\n`;

    if (plan.startDate && plan.endDate) {
        message += `📅 Activation Period:\n`;
        message += `• Start Date: ${plan.startDate}\n`;
        message += `• End Date: ${plan.endDate}\n`;
        
        const endDate = new Date(plan.endDate.split('-').reverse().join('-'));
        const today = new Date();
        const timeDiff = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysRemaining > 0) {
            message += `• Days Remaining: ${daysRemaining} days\n\n`;
        } else if (daysRemaining === 0) {
            message += `• ⚠️ Expires Today\n\n`;
        } else {
            message += `• ❌ Expired ${Math.abs(daysRemaining)} days ago\n\n`;
        }
    }

    if (plan.url) {
        message += `🔗 WhatsApp Link:\n${plan.url}\n\n`;
        message += `💡 Use this link to connect your WhatsApp device(s).\n`;
    }

    message += `⚡ Plan Status: ✅ Active`;

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📈 Upgrade Plan', 'upgradePlanMenu')],
            [Markup.button.callback('🤖 Bot Features', 'botFeatures')],
            [Markup.button.callback('🔙 Back to Bot Menu', 'buyBot')]
        ])
    );
});

bot.action('botFeatures', async (ctx) => {
    return ctx.reply(
        '🤖 WhatsApp Bot Features 🤖\n\n✨ All plans include these amazing features:\n\n✅ Automated Messaging\n✅ Bulk Message Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n✅ Real-time Analytics\n✅ Group Management\n✅ Auto-reply System\n✅ Media Sharing\n✅ Multi-language Support\n\n💡 Need help setting up?\nContact our support team for assistance.',
        Markup.inlineKeyboard([
            [Markup.button.callback('👁️ View My Plan', 'viewActivatedPlan')],
            [Markup.button.callback('📈 Upgrade Plan', 'upgradePlanMenu')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

// ======= ADMIN ACTIONS =======
bot.action('adminAllUsers', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const totalUsers = Object.keys(users).length;
    const activeUsers = Object.values(users).filter(u => !u.isBanned).length;
    const bannedUsers = Object.values(users).filter(u => u.isBanned).length;
    
    let totalBalance = 0;
    Object.values(users).forEach(user => {
        totalBalance += user.balance || 0;
    });

    let message = '📊 All Users Statistics 📊\n\n';
    message += `👥 Total Users: ${totalUsers}\n`;
    message += `✅ Active Users: ${activeUsers}\n`;
    message += `🚫 Banned Users: ${bannedUsers}\n`;
    message += `💰 Total Balance: ${totalBalance} PKR\n\n`;
    
    // Show last 5 registered users
    const userList = Object.entries(users)
        .sort((a, b) => new Date(b[1].registered) - new Date(a[1].registered))
        .slice(0, 5);
    
    if (userList.length > 0) {
        message += '📋 Recent Registrations:\n';
        userList.forEach(([username, user], index) => {
            const status = user.isBanned ? '🚫' : '✅';
            message += `${index + 1}. ${status} ${user.firstName} (@${username})\n`;
            message += `   📱 ${user.phone}\n`;
            message += `   💰 ${user.balance || 0} PKR\n`;
            message += `   📅 ${user.registered}\n\n`;
        });
    }

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔍 Search User', 'adminSearchUser')],
            [Markup.button.callback('🚫 Ban/Unban User', 'adminBanUser')],
            [Markup.button.callback('💰 Update Balance', 'adminBalanceUpdate')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

bot.action('adminSearchUser', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { 
        flow: 'admin_search', 
        step: 'enter_username' 
    };
    
    await ctx.reply(
        '🔍 Search User 🔍\n\nEnter username, phone number, or name to search:\n\n💡 Examples:\n• Username: ali_123\n• Phone: 923001234567\n• Name: Muhammad Ali\n\n🔢 Enter search term:'
    );
});

bot.action('adminBalanceUpdate', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { 
        flow: 'admin_balance_update', 
        step: 'enter_username' 
    };
    
    await ctx.reply(
        '💰 Manual Balance Update 💰\n\nEnter username to update balance:\n\n🔢 Enter username:'
    );
});

bot.action('adminAllTransactions', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    let allTransactions = [];
    
    Object.entries(users).forEach(([username, user]) => {
        if (user.transactions && user.transactions.length > 0) {
            user.transactions.forEach(t => {
                allTransactions.push({
                    username: username,
                    name: user.firstName,
                    ...t
                });
            });
        }
    });

    if (allTransactions.length === 0) {
        return ctx.reply(
            '📭 No Transactions Found 📭\n\nThere are no transactions in the system.',
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 All Users', 'adminAllUsers')],
                [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
            ])
        );
    }

    // Sort by date (newest first)
    allTransactions.sort((a, b) => {
        const dateA = new Date(a.date.split('-').reverse().join('-'));
        const dateB = new Date(b.date.split('-').reverse().join('-'));
        return dateB - dateA;
    });

    let message = '📋 All Transactions 📋\n\n';
    message += `📊 Total Transactions: ${allTransactions.length}\n\n`;
    
    // Show last 10 transactions
    const recentTransactions = allTransactions.slice(0, 10);
    
    recentTransactions.forEach((t, i) => {
        const emoji = t.type.includes('Deposit') ? '📥' : 
                     t.type.includes('Withdrawal') ? '📤' : 
                     t.type.includes('Bot') ? '🤖' : 
                     t.type.includes('Plan') ? '🤖' : '💳';
        
        const statusEmoji = t.status === 'approved' ? '✅' : 
                          t.status === 'rejected' ? '❌' : 
                          t.status === 'completed' ? '✅' : '🔄';
        
        message += `${i + 1}. ${emoji} ${t.type}\n`;
        message += `   👤 User: ${t.name} (@${t.username})\n`;
        message += `   💰 Amount: ${t.amount} PKR\n`;
        message += `   📅 Date: ${t.date} at ${t.time}\n`;
        message += `   📊 Status: ${statusEmoji} ${t.status || 'Pending'}\n\n`;
    });

    if (allTransactions.length > 10) {
        message += `📖 Showing last 10 of ${allTransactions.length} transactions\n`;
    }

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📊 All Users', 'adminAllUsers')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

bot.action('adminBanUser', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { 
        flow: 'admin_ban_user', 
        step: 'enter_username' 
    };
    
    await ctx.reply(
        '🚫 Ban/Unban User 🚫\n\nEnter username to ban or unban:\n\n🔢 Enter username:'
    );
});

// Admin Plan Management
bot.action('adminPlanManagement', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    await ctx.reply(
        '🤖 Plan Management Dashboard 🤖\n\n✨ Manage all WhatsApp Bot plans:\n\n📊 Total Plans: ' + plans.length + '\n✅ Active Plans: ' + plans.filter(p => p.active).length + '\n❌ Inactive Plans: ' + plans.filter(p => !p.active).length,
        Markup.inlineKeyboard([
            [Markup.button.callback('📋 View All Plans', 'adminViewAllPlans')],
            [Markup.button.callback('➕ Add New Plan', 'adminAddNewPlan')],
            [Markup.button.callback('📝 Edit Plan', 'adminEditPlanMenu')],
            [Markup.button.callback('🗑️ Delete Plan', 'adminDeletePlanMenu')],
            [Markup.button.callback('📊 Plan Analytics', 'adminPlanAnalytics')],
            [Markup.button.callback('📥 Plan Requests', 'adminPlanRequests')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

// Admin View All Plans
bot.action('adminViewAllPlans', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    if (plans.length === 0) {
        return ctx.reply(
            '📭 No Plans Found 📭\n\nThere are no plans in the system.\n\n💡 Add a new plan to get started.',
            Markup.inlineKeyboard([
                [Markup.button.callback('➕ Add New Plan', 'adminAddNewPlan')],
                [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
            ])
        );
    }

    let message = '📋 All WhatsApp Bot Plans 📋\n\n';
    
    plans.forEach((plan, index) => {
        const status = plan.active ? '✅ ACTIVE' : '❌ INACTIVE';
        message += `${index + 1}. **${plan.name}**\n`;
        message += `   💰 Price: ${plan.price} PKR\n`;
        message += `   📅 Duration: ${plan.duration} days\n`;
        message += `   📱 Features: ${plan.features}\n`;
        message += `   📊 Status: ${status}\n`;
        message += `   🔑 ID: ${plan.id}\n\n`;
    });

    message += `📊 Total: ${plans.length} plans\n✅ Active: ${plans.filter(p => p.active).length}\n❌ Inactive: ${plans.filter(p => !p.active).length}`;

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('➕ Add New Plan', 'adminAddNewPlan')],
            [Markup.button.callback('📝 Edit Plan', 'adminEditPlanMenu')],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
        ])
    );
});

// Admin Add New Plan
bot.action('adminAddNewPlan', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { 
        flow: 'admin_add_plan', 
        step: 'enter_plan_name' 
    };
    
    await ctx.reply(
        '➕ Add New WhatsApp Bot Plan ➕\n\n📝 Step 1: Plan Name\n\nEnter the name for the new plan:\n\n💡 Examples:\n• Basic Plan\n• Standard Plan\n• Premium Plan\n\nEnter plan name:'
    );
});

// Admin Edit Plan Menu
bot.action('adminEditPlanMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    if (plans.length === 0) {
        return ctx.reply(
            '❌ No Plans Available ❌\n\nThere are no plans to edit.\n\n💡 Add a plan first.',
            Markup.inlineKeyboard([
                [Markup.button.callback('➕ Add New Plan', 'adminAddNewPlan')],
                [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
            ])
        );
    }

    let message = '📝 Select Plan to Edit 📝\n\n';
    
    plans.forEach((plan, index) => {
        const status = plan.active ? '✅' : '❌';
        message += `${index + 1}. ${status} ${plan.name} (${plan.price} PKR)\n`;
    });

    const buttons = [];
    plans.forEach(plan => {
        buttons.push([Markup.button.callback(`✏️ Edit ${plan.name}`, `admin_edit_plan_${plan.id}`)]);
    });
    
    buttons.push(
        [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
    );

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// Admin Delete Plan Menu
bot.action('adminDeletePlanMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    if (plans.length === 0) {
        return ctx.reply(
            '❌ No Plans Available ❌\n\nThere are no plans to delete.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
            ])
        );
    }

    let message = '🗑️ Select Plan to Delete 🗑️\n\n⚠️ Warning: Deleting a plan will:\n• Make it unavailable for new purchases\n• Not affect existing users\n\nAvailable Plans:\n';
    
    plans.forEach((plan, index) => {
        const userCount = Object.values(users).filter(user => 
            user.activePlan && user.activePlan.name === plan.name
        ).length;
        
        message += `${index + 1}. ${plan.name} (${plan.price} PKR)\n`;
        message += `   👥 Active Users: ${userCount}\n`;
    });

    const buttons = [];
    plans.forEach(plan => {
        buttons.push([Markup.button.callback(`🗑️ Delete ${plan.name}`, `admin_delete_plan_${plan.id}`)]);
    });
    
    buttons.push(
        [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
    );

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// Admin Plan Analytics
bot.action('adminPlanAnalytics', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    // Calculate plan analytics
    let totalRevenue = 0;
    let activeUsers = 0;
    const planStats = {};

    // Initialize plan stats
    plans.forEach(plan => {
        planStats[plan.name] = {
            name: plan.name,
            price: plan.price,
            activeUsers: 0,
            revenue: 0,
            pending: 0
        };
    });

    // Calculate stats from users
    Object.values(users).forEach(user => {
        // Active plans
        if (user.activePlan) {
            const planName = user.activePlan.name;
            if (planStats[planName]) {
                planStats[planName].activeUsers++;
                planStats[planName].revenue += user.activePlan.price;
                totalRevenue += user.activePlan.price;
                activeUsers++;
            }
        }

        // Pending plans
        if (user.pendingPlans && user.pendingPlans.length > 0) {
            user.pendingPlans.forEach(pendingPlan => {
                const planName = pendingPlan.name;
                if (planStats[planName]) {
                    planStats[planName].pending++;
                }
            });
        }
    });

    let message = '📊 Plan Analytics 📊\n\n';
    message += `📈 Overall Statistics:\n`;
    message += `• Total Plans: ${plans.length}\n`;
    message += `• Active Users: ${activeUsers}\n`;
    message += `• Total Revenue: ${totalRevenue} PKR\n\n`;
    message += `📋 Plan-wise Statistics:\n\n`;

    Object.values(planStats).forEach(stat => {
        message += `**${stat.name}**\n`;
        message += `💰 Price: ${stat.price} PKR\n`;
        message += `👥 Active Users: ${stat.activeUsers}\n`;
        message += `💰 Revenue: ${stat.revenue} PKR\n`;
        message += `⏳ Pending Requests: ${stat.pending}\n\n`;
    });

    // Find most popular plan
    let mostPopularPlan = null;
    let maxUsers = 0;
    
    Object.values(planStats).forEach(stat => {
        if (stat.activeUsers > maxUsers) {
            maxUsers = stat.activeUsers;
            mostPopularPlan = stat.name;
        }
    });

    if (mostPopularPlan) {
        message += `🏆 Most Popular Plan: ${mostPopularPlan} (${maxUsers} users)\n`;
    }

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh Analytics', 'adminPlanAnalytics')],
            [Markup.button.callback('📥 Plan Requests', 'adminPlanRequests')],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
        ])
    );
});

// Admin Plan Requests
bot.action('adminPlanRequests', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    // Collect all pending plan requests
    let pendingPlans = [];
    let pendingUpgrades = [];
    let totalPending = 0;

    Object.entries(users).forEach(([username, user]) => {
        if (user.pendingPlans && user.pendingPlans.length > 0) {
            user.pendingPlans.forEach(plan => {
                pendingPlans.push({
                    username: username,
                    name: user.firstName,
                    ...plan
                });
                totalPending++;
            });
        }

        if (user.pendingUpgrades && user.pendingUpgrades.length > 0) {
            user.pendingUpgrades.forEach(upgrade => {
                pendingUpgrades.push({
                    username: username,
                    name: user.firstName,
                    ...upgrade
                });
                totalPending++;
            });
        }
    });

    let message = '📥 Plan Requests Dashboard 📥\n\n';
    message += `📊 Summary:\n`;
    message += `• Total Pending: ${totalPending} requests\n`;
    message += `• New Plans: ${pendingPlans.length}\n`;
    message += `• Upgrades: ${pendingUpgrades.length}\n\n`;

    if (pendingPlans.length === 0 && pendingUpgrades.length === 0) {
        message += '✅ No pending requests at the moment.\n';
    } else {
        if (pendingPlans.length > 0) {
            message += '🆕 New Plan Requests:\n';
            pendingPlans.slice(0, 5).forEach((req, index) => {
                message += `${index + 1}. ${req.name} (@${req.username})\n`;
                message += `   🤖 ${req.name} (${req.price} PKR)\n`;
                message += `   📅 ${req.date} at ${req.time}\n`;
                message += `   🔑 ${req.id}\n\n`;
            });
            
            if (pendingPlans.length > 5) {
                message += `📖 +${pendingPlans.length - 5} more new plan requests\n\n`;
            }
        }

        if (pendingUpgrades.length > 0) {
            message += '🔼 Upgrade Requests:\n';
            pendingUpgrades.slice(0, 5).forEach((req, index) => {
                message += `${index + 1}. ${req.name} (@${req.username})\n`;
                message += `   🔄 ${req.fromPlan} → ${req.toPlan}\n`;
                message += `   💰 ${req.cost} PKR\n`;
                message += `   📅 ${req.date} at ${req.time}\n\n`;
            });
            
            if (pendingUpgrades.length > 5) {
                message += `📖 +${pendingUpgrades.length - 5} more upgrade requests\n\n`;
            }
        }
    }

    const buttons = [];
    
    if (pendingPlans.length > 0) {
        buttons.push([Markup.button.callback(`🆕 View New Plans (${pendingPlans.length})`, 'adminViewNewPlanRequests')]);
    }
    
    if (pendingUpgrades.length > 0) {
        buttons.push([Markup.button.callback(`🔼 View Upgrades (${pendingUpgrades.length})`, 'adminViewUpgradeRequests')]);
    }
    
    buttons.push(
        [Markup.button.callback('🔄 Refresh', 'adminPlanRequests')],
        [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
    );

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// Admin View New Plan Requests
bot.action('adminViewNewPlanRequests', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    // Collect all pending plan requests
    let pendingPlans = [];

    Object.entries(users).forEach(([username, user]) => {
        if (user.pendingPlans && user.pendingPlans.length > 0) {
            user.pendingPlans.forEach(plan => {
                pendingPlans.push({
                    username: username,
                    name: user.firstName,
                    ...plan
                });
            });
        }
    });

    if (pendingPlans.length === 0) {
        return ctx.reply(
            '✅ No pending new plan requests.\n\nAll new plan requests have been processed.',
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Plan Requests', 'adminPlanRequests')],
                [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
            ])
        );
    }

    let message = '🆕 Pending New Plan Requests 🆕\n\n';
    
    pendingPlans.forEach((req, index) => {
        message += `**${index + 1}. ${req.name} (@${req.username})**\n`;
        message += `🤖 Plan: ${req.name}\n`;
        message += `💰 Price: ${req.price} PKR\n`;
        message += `📅 Duration: ${req.duration} days\n`;
        message += `📱 Features: ${req.features}\n`;
        message += `📅 Requested: ${req.date} at ${req.time}\n`;
        message += `🔑 Request ID: ${req.id}\n\n`;
    });

    // Create buttons for each request
    const buttons = [];
    pendingPlans.slice(0, 5).forEach(req => {
        buttons.push([
            Markup.button.callback(`✅ Approve ${req.name.substring(0, 10)}`, `admin_approve_plan_${req.userChatId || '0'}_${req.id}`),
            Markup.button.callback(`❌ Reject ${req.name.substring(0, 10)}`, `admin_reject_plan_${req.userChatId || '0'}_${req.id}`)
        ]);
    });
    
    buttons.push(
        [Markup.button.callback('📥 All Requests', 'adminPlanRequests')],
        [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
    );

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// Admin View Upgrade Requests
bot.action('adminViewUpgradeRequests', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    // Collect all pending upgrade requests
    let pendingUpgrades = [];

    Object.entries(users).forEach(([username, user]) => {
        if (user.pendingUpgrades && user.pendingUpgrades.length > 0) {
            user.pendingUpgrades.forEach(upgrade => {
                pendingUpgrades.push({
                    username: username,
                    name: user.firstName,
                    ...upgrade
                });
            });
        }
    });

    if (pendingUpgrades.length === 0) {
        return ctx.reply(
            '✅ No pending upgrade requests.\n\nAll upgrade requests have been processed.',
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Plan Requests', 'adminPlanRequests')],
                [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
            ])
        );
    }

    let message = '🔼 Pending Upgrade Requests 🔼\n\n';
    
    pendingUpgrades.forEach((req, index) => {
        message += `**${index + 1}. ${req.name} (@${req.username})**\n`;
        message += `🔄 From: ${req.fromPlan}\n`;
        message += `🎯 To: ${req.toPlan}\n`;
        message += `💰 Upgrade Cost: ${req.cost} PKR\n`;
        message += `📅 Requested: ${req.date} at ${req.time}\n`;
        message += `🔑 Request ID: ${req.id}\n\n`;
    });

    // Create buttons for each request
    const buttons = [];
    pendingUpgrades.slice(0, 5).forEach(req => {
        buttons.push([
            Markup.button.callback(`✅ Approve ${req.name.substring(0, 10)}`, `admin_approve_upgrade_${req.userChatId || '0'}_${req.id}`),
            Markup.button.callback(`❌ Reject ${req.name.substring(0, 10)}`, `admin_reject_upgrade_${req.userChatId || '0'}_${req.id}`)
        ]);
    });
    
    buttons.push(
        [Markup.button.callback('📥 All Requests', 'adminPlanRequests')],
        [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
    );

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// Admin Edit Plan Action
bot.action(/admin_edit_plan_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const planId = ctx.match[1];
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
        return ctx.answerCbQuery('❌ Plan not found!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { 
        flow: 'admin_edit_plan', 
        step: 'select_field',
        planId: planId
    };

    await ctx.reply(
        `✏️ Edit Plan: ${plan.name} ✏️\n\n📋 Current Details:\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} days\n📱 Features: ${plan.features}\n📊 Status: ${plan.active ? '✅ Active' : '❌ Inactive'}\n\nSelect what you want to edit:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 Edit Price', `edit_plan_price_${planId}`)],
            [Markup.button.callback('📅 Edit Duration', `edit_plan_duration_${planId}`)],
            [Markup.button.callback('📱 Edit Features', `edit_plan_features_${planId}`)],
            [Markup.button.callback('📊 Toggle Status', `toggle_plan_status_${planId}`)],
            [Markup.button.callback('🔙 Cancel', 'adminEditPlanMenu')]
        ])
    );
});

// Admin Delete Plan Action
bot.action(/admin_delete_plan_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const planId = ctx.match[1];
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
        return ctx.answerCbQuery('❌ Plan not found!', { show_alert: true });
    }

    // Check if any user is using this plan
    const usersUsingPlan = Object.values(users).filter(user => 
        user.activePlan && user.activePlan.name === plan.name
    ).length;

    if (usersUsingPlan > 0) {
        return ctx.reply(
            `⚠️ Cannot Delete Plan ⚠️\n\nPlan "${plan.name}" is currently active for ${usersUsingPlan} users.\n\n💡 Instead of deleting, you can:\n1. Deactivate the plan (users keep it)\n2. Create a new plan\n3. Contact users to switch plans`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 Deactivate Plan', `deactivate_plan_${planId}`)],
                [Markup.button.callback('🔙 Back', 'adminDeletePlanMenu')]
            ])
        );
    }

    // Delete the plan
    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex !== -1) {
        plans.splice(planIndex, 1);
        saveUsers();
    }

    await ctx.reply(
        `✅ Plan Deleted Successfully! ✅\n\n🗑️ Plan "${plan.name}" has been deleted.\n\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} days\n\n📊 Remaining Plans: ${plans.length}`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📋 View All Plans', 'adminViewAllPlans')],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
        ])
    );
});

// Admin Toggle Plan Status
bot.action(/toggle_plan_status_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const planId = ctx.match[1];
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
        return ctx.answerCbQuery('❌ Plan not found!', { show_alert: true });
    }

    // Toggle status
    plan.active = !plan.active;
    saveUsers();

    await ctx.reply(
        `✅ Plan Status Updated! ✅\n\nPlan "${plan.name}" is now ${plan.active ? '✅ ACTIVE' : '❌ INACTIVE'}.\n\n${plan.active ? '✅ Available for new purchases' : '❌ Not available for new purchases'}\n\n📊 Existing users keep their access.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Edit Plan', `admin_edit_plan_${planId}`)],
            [Markup.button.callback('📋 View All Plans', 'adminViewAllPlans')],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
        ])
    );
});

// Admin User Mode
bot.action('userMode', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = null;
    
    await ctx.reply(
        '👤 Switched to User Mode 👤\n\nYou are now in user mode. Use /start to access user features.',
        Markup.inlineKeyboard([
            [Markup.button.callback('🚀 Start as User', 'start')],
            [Markup.button.callback('🔙 Back to Admin', 'backToAdminMenu')]
        ])
    );
});

// ======= ADMIN APPROVAL/REJECTION ACTIONS =======
bot.action(/admin_approve_deposit_(\d+)_(dep_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, depositId] = ctx.match;
    
    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        // Ignore error
    }
    
    const userSession = sessions[userChatId];
    if (!userSession || !userSession.usernameKey) {
        return ctx.reply('❌ User session not found.');
    }

    const user = users[userSession.usernameKey];
    
    // Find pending deposit
    const depositIndex = user.pendingDeposits?.findIndex(d => d.id === depositId) || -1;
    if (depositIndex === -1) {
        return ctx.reply('❌ Deposit request not found.');
    }

    const pendingDeposit = user.pendingDeposits[depositIndex];
    const { date, time } = getCurrentDateTime();

    // Add to balance
    user.balance += pendingDeposit.totalAmount;

    // Remove from pending
    user.pendingDeposits.splice(depositIndex, 1);

    // Add transaction
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📥 Deposit ✅',
        amount: pendingDeposit.amount,
        bonus: pendingDeposit.bonus,
        totalAmount: pendingDeposit.totalAmount,
        date: date,
        time: time,
        method: pendingDeposit.method,
        status: 'approved'
    });

    saveUsers();

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `✅ Deposit Approved! ✅\n\n💰 Amount: ${pendingDeposit.amount} PKR\n🎁 Bonus: ${pendingDeposit.bonus} PKR\n💵 Total Added: ${pendingDeposit.totalAmount} PKR\n\n📊 New Balance: ${user.balance} PKR\n\n📅 Date: ${date}\n⏰ Time: ${time}`
    );

    await ctx.reply(
        `✅ Deposit Approved Successfully! ✅\n\n👤 User: ${user.firstName}\n💰 Amount: ${pendingDeposit.amount} PKR\n🎁 Bonus: ${pendingDeposit.bonus} PKR\n💵 Total Added: ${pendingDeposit.totalAmount} PKR\n\n📊 New Balance: ${user.balance} PKR`
    );
});

bot.action(/admin_approve_withdraw_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    
    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        // Ignore error
    }
    
    const userSession = sessions[userChatId];
    if (!userSession || !userSession.usernameKey) {
        return ctx.reply('❌ User session not found.');
    }

    const user = users[userSession.usernameKey];
    
    // Find pending withdrawal
    const withdrawIndex = user.pendingWithdrawals?.findIndex(w => w.id === withdrawId) || -1;
    if (withdrawIndex === -1) {
        return ctx.reply('❌ Withdrawal request not found.');
    }

    const pendingWithdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    // Remove from pending
    user.pendingWithdrawals.splice(withdrawIndex, 1);

    // Add transaction
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📤 Withdrawal ✅',
        amount: pendingWithdraw.amount,
        fee: pendingWithdraw.fee,
        netAmount: pendingWithdraw.netAmount,
        date: date,
        time: time,
        method: pendingWithdraw.method,
        status: 'completed'
    });

    saveUsers();

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `✅ Withdrawal Completed! ✅\n\n💰 Amount: ${pendingWithdraw.amount} PKR\n📉 Fee: ${pendingWithdraw.fee} PKR\n💵 Net Amount: ${pendingWithdraw.netAmount} PKR\n🏦 Method: ${pendingWithdraw.method}\n📱 Account: ${pendingWithdraw.account}\n\n📅 Date: ${date}\n⏰ Time: ${time}\n\n✅ Funds have been sent to your account.`
    );

    await ctx.reply(
        `✅ Withdrawal Completed Successfully! ✅\n\n👤 User: ${user.firstName}\n💰 Amount: ${pendingWithdraw.amount} PKR\n📉 Fee: ${pendingWithdraw.fee} PKR\n💵 Net Amount: ${pendingWithdraw.netAmount} PKR\n🏦 Method: ${pendingWithdraw.method}\n📱 Account: ${pendingWithdraw.account}`
    );
});

// Plan approval
bot.action(/admin_approve_plan_(\d+)_(plan_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, planId] = ctx.match;
    
    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        // Ignore error
    }
    
    sessions[ctx.chat.id] = { 
        flow: 'admin_plan_approval',
        userChatId: userChatId,
        planId: planId
    };
    
    await ctx.reply(
        `✅ Plan Approval Request ✅\n\nPlease enter the WhatsApp link URL for this plan:\n\n📝 Format: https://example.com/whatsapp-link\n\n💡 Note: This URL will be sent to the user for WhatsApp linking.`
    );
});

// Upgrade approval
bot.action(/admin_approve_upgrade_(\d+)_(upgrade_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, upgradeId] = ctx.match;
    
    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        // Ignore error
    }
    
    sessions[ctx.chat.id] = { 
        flow: 'admin_upgrade_approval',
        userChatId: userChatId,
        upgradeId: upgradeId
    };
    
    await ctx.reply(
        `✅ Upgrade Approval Request ✅\n\nPlease enter the new WhatsApp link URL for this upgrade:\n\n📝 Format: https://example.com/whatsapp-link\n\n💡 Note: This URL will replace the existing one for the upgraded plan.`
    );
});

// Plan rejection
bot.action(/admin_reject_plan_(\d+)_(plan_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, planId] = ctx.match;
    
    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        // Ignore error
    }
    
    sessions[ctx.chat.id] = { 
        flow: 'admin_plan_rejection',
        userChatId: userChatId,
        planId: planId
    };
    
    await ctx.reply(
        `❌ Plan Rejection Request ❌\n\nPlease enter the reason for rejecting this plan request:\n\n📝 Example: "Invalid payment proof" or "User needs to provide more information"`
    );
});

// Upgrade rejection
bot.action(/admin_reject_upgrade_(\d+)_(upgrade_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, upgradeId] = ctx.match;
    
    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        // Ignore error
    }
    
    sessions[ctx.chat.id] = { 
        flow: 'admin_upgrade_rejection',
        userChatId: userChatId,
        upgradeId: upgradeId
    };
    
    await ctx.reply(
        `❌ Upgrade Rejection Request ❌\n\nPlease enter the reason for rejecting this upgrade request:\n\n📝 Example: "Invalid payment" or "User needs to complete current plan first"`
    );
});

// ======= TEXT HANDLER =======
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    const session = sessions[chatId];
    if (!session) return;

    // ===== ADMIN FLOWS =====
    
    // Admin search user
    if (session.flow === 'admin_search' && session.step === 'enter_username') {
        const searchTerm = text.toLowerCase();
        
        let foundUsers = [];
        
        Object.entries(users).forEach(([username, user]) => {
            if (username.toLowerCase().includes(searchTerm) ||
                user.phone.includes(searchTerm) ||
                user.firstName.toLowerCase().includes(searchTerm)) {
                foundUsers.push({ username, user });
            }
        });

        if (foundUsers.length === 0) {
            await ctx.reply(
                '❌ No users found ❌\n\nNo users match your search term.\n\n🔄 Try again with different search term:',
                Markup.inlineKeyboard([
                    [Markup.button.callback('🔍 Search Again', 'adminSearchUser')],
                    [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
                ])
            );
            sessions[chatId] = null;
            return;
        }

        let message = '🔍 Search Results 🔍\n\n';
        
        foundUsers.forEach(({ username, user }, index) => {
            const status = user.isBanned ? '🚫 BANNED' : '✅ ACTIVE';
            message += `${index + 1}. ${user.firstName} (@${username})\n`;
            message += `   📱 Phone: ${user.phone}\n`;
            message += `   💰 Balance: ${user.balance || 0} PKR\n`;
            message += `   📅 Registered: ${user.registered}\n`;
            message += `   📊 Status: ${status}\n\n`;
        });

        if (foundUsers.length > 5) {
            message += `📖 Found ${foundUsers.length} users\n`;
        }

        const buttons = [];
        foundUsers.slice(0, 5).forEach(({ username }) => {
            buttons.push([Markup.button.callback(`👤 View ${username}`, `admin_view_user_${username}`)]);
        });

        buttons.push(
            [Markup.button.callback('🔍 Search Again', 'adminSearchUser')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        );

        await ctx.reply(
            message,
            Markup.inlineKeyboard(buttons)
        );
        
        sessions[chatId] = null;
        return;
    }

    // Admin balance update
    if (session.flow === 'admin_balance_update') {
        if (session.step === 'enter_username') {
            if (!users[text]) {
                await ctx.reply(
                    '❌ User not found ❌\n\nUsername does not exist.\n\n🔄 Enter correct username:',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔍 Search User', 'adminSearchUser')],
                        [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
                    ])
                );
                return;
            }

            session.targetUsername = text;
            session.step = 'enter_amount';
            
            await ctx.reply(
                `💰 Update Balance for @${text} 💰\n\nCurrent Balance: ${users[text].balance || 0} PKR\n\nEnter new balance amount (PKR):\n\n💡 Note: This will REPLACE the current balance.`
            );
        }

        if (session.step === 'enter_amount') {
            const amount = parseInt(text);
            
            if (isNaN(amount) || amount < 0) {
                return ctx.reply('❌ Invalid amount ❌\n\nPlease enter a valid number (0 or greater):');
            }

            const user = users[session.targetUsername];
            const oldBalance = user.balance || 0;
            user.balance = amount;
            
            // Add to transaction history
            if (!user.transactions) user.transactions = [];
            const { date, time } = getCurrentDateTime();
            user.transactions.push({
                type: '💰 Admin Balance Update',
                amount: amount - oldBalance,
                date: date,
                time: time,
                status: 'admin_updated',
                note: `Admin updated balance from ${oldBalance} to ${amount} PKR`
            });

            saveUsers();

            await ctx.reply(
                `✅ Balance Updated Successfully! ✅\n\n👤 User: @${session.targetUsername}\n👤 Name: ${user.firstName}\n📱 Phone: ${user.phone}\n\n💰 Old Balance: ${oldBalance} PKR\n💰 New Balance: ${amount} PKR\n📈 Change: ${amount - oldBalance} PKR\n\n📅 Date: ${date}\n⏰ Time: ${time}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback(`👤 View ${session.targetUsername}`, `admin_view_user_${session.targetUsername}`)],
                    [Markup.button.callback('💰 Update Another User', 'adminBalanceUpdate')],
                    [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
                ])
            );
            
            sessions[chatId] = null;
        }
        return;
    }

    // Admin ban user
    if (session.flow === 'admin_ban_user') {
        if (session.step === 'enter_username') {
            if (!users[text]) {
                await ctx.reply(
                    '❌ User not found ❌\n\nUsername does not exist.\n\n🔄 Enter correct username:',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔍 Search User', 'adminSearchUser')],
                        [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
                    ])
                );
                return;
            }

            session.targetUsername = text;
            const user = users[text];
            const isCurrentlyBanned = user.isBanned || false;
            
            session.step = 'confirm_action';
            
            await ctx.reply(
                `🚫 Ban/Unban User: @${text} 🚫\n\n👤 Name: ${user.firstName}\n📱 Phone: ${user.phone}\n💰 Balance: ${user.balance || 0} PKR\n📅 Registered: ${user.registered}\n\n📊 Current Status: ${isCurrentlyBanned ? '🚫 BANNED' : '✅ ACTIVE'}\n\nSelect action:`,
                Markup.inlineKeyboard([
                    [Markup.button.callback(isCurrentlyBanned ? '✅ Unban User' : '🚫 Ban User', `admin_confirm_${isCurrentlyBanned ? 'unban' : 'ban'}_${text}`)],
                    [Markup.button.callback('🔙 Cancel', 'backToAdminMenu')]
                ])
            );
        }
        return;
    }

    // Admin add plan
    if (session.flow === 'admin_add_plan') {
        if (session.step === 'enter_plan_name') {
            session.planName = text;
            session.step = 'enter_plan_price';
            
            await ctx.reply(
                '💰 Step 2: Plan Price\n\nEnter the price for the plan (PKR):\n\n💡 Example: 500\n\n🔢 Enter price:'
            );
        }
        
        if (session.step === 'enter_plan_price') {
            const price = parseInt(text);
            if (isNaN(price) || price < 0) {
                return ctx.reply('❌ Invalid price ❌\n\nPlease enter a valid number:');
            }
            
            session.planPrice = price;
            session.step = 'enter_plan_duration';
            
            await ctx.reply(
                '📅 Step 3: Plan Duration\n\nEnter the duration in days:\n\n💡 Example: 30\n\n🔢 Enter duration (days):'
            );
        }
        
        if (session.step === 'enter_plan_duration') {
            const duration = parseInt(text);
            if (isNaN(duration) || duration < 1) {
                return ctx.reply('❌ Invalid duration ❌\n\nPlease enter a valid number (minimum 1 day):');
            }
            
            session.planDuration = duration;
            session.step = 'enter_plan_features';
            
            await ctx.reply(
                '📱 Step 4: Plan Features\n\nEnter the features for this plan:\n\n💡 Example: 1 WhatsApp link device, Bulk messaging\n\n📝 Enter features:'
            );
        }
        
        if (session.step === 'enter_plan_features') {
            session.planFeatures = text;
            session.step = 'enter_plan_devices';
            
            await ctx.reply(
                '🔗 Step 5: Number of Devices\n\nEnter the number of WhatsApp link devices:\n\n💡 Example: 1 or 2\n\n🔢 Enter number of devices:'
            );
        }
        
        if (session.step === 'enter_plan_devices') {
            const devices = parseInt(text);
            if (isNaN(devices) || devices < 1) {
                return ctx.reply('❌ Invalid number of devices ❌\n\nPlease enter a valid number:');
            }
            
            // Create new plan
            const newPlan = {
                id: 'plan_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                name: session.planName,
                price: session.planPrice,
                duration: session.planDuration,
                features: session.planFeatures,
                devices: devices,
                active: true
            };
            
            plans.push(newPlan);
            saveUsers();
            
            await ctx.reply(
                `✅ Plan Added Successfully! ✅\n\n📋 Plan Details:\n✨ Name: ${newPlan.name}\n💰 Price: ${newPlan.price} PKR\n📅 Duration: ${newPlan.duration} days\n📱 Features: ${newPlan.features}\n🔗 Devices: ${newPlan.devices}\n📊 Status: ✅ Active\n\n🔑 Plan ID: ${newPlan.id}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('📋 View All Plans', 'adminViewAllPlans')],
                    [Markup.button.callback('➕ Add Another Plan', 'adminAddNewPlan')],
                    [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
                ])
            );
            
            sessions[chatId] = null;
        }
        return;
    }

    // Admin edit plan
    if (session.flow === 'admin_edit_plan') {
        if (session.step === 'edit_price') {
            const price = parseInt(text);
            if (isNaN(price) || price < 0) {
                return ctx.reply('❌ Invalid price ❌\n\nPlease enter a valid number:');
            }
            
            const plan = plans.find(p => p.id === session.planId);
            if (plan) {
                plan.price = price;
                saveUsers();
                
                await ctx.reply(
                    `✅ Price Updated Successfully! ✅\n\nPlan: ${plan.name}\n💰 New Price: ${price} PKR`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('✏️ Edit Plan', `admin_edit_plan_${session.planId}`)],
                        [Markup.button.callback('📋 View All Plans', 'adminViewAllPlans')]
                    ])
                );
            }
            sessions[chatId] = null;
            return;
        }
        
        if (session.step === 'edit_duration') {
            const duration = parseInt(text);
            if (isNaN(duration) || duration < 1) {
                return ctx.reply('❌ Invalid duration ❌\n\nPlease enter a valid number (minimum 1 day):');
            }
            
            const plan = plans.find(p => p.id === session.planId);
            if (plan) {
                plan.duration = duration;
                saveUsers();
                
                await ctx.reply(
                    `✅ Duration Updated Successfully! ✅\n\nPlan: ${plan.name}\n📅 New Duration: ${duration} days`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('✏️ Edit Plan', `admin_edit_plan_${session.planId}`)],
                        [Markup.button.callback('📋 View All Plans', 'adminViewAllPlans')]
                    ])
                );
            }
            sessions[chatId] = null;
            return;
        }
        
        if (session.step === 'edit_features') {
            const plan = plans.find(p => p.id === session.planId);
            if (plan) {
                plan.features = text;
                saveUsers();
                
                await ctx.reply(
                    `✅ Features Updated Successfully! ✅\n\nPlan: ${plan.name}\n📱 New Features: ${text}`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('✏️ Edit Plan', `admin_edit_plan_${session.planId}`)],
                        [Markup.button.callback('📋 View All Plans', 'adminViewAllPlans')]
                    ])
                );
            }
            sessions[chatId] = null;
            return;
        }
    }

    // Admin plan approval
    if (session.flow === 'admin_plan_approval') {
        const userChatId = session.userChatId;
        const planId = session.planId;
        
        const userSession = sessions[userChatId];
        if (!userSession || !userSession.usernameKey) {
            sessions[chatId] = null;
            return ctx.reply('❌ User session not found. Approval cancelled.');
        }

        const user = users[userSession.usernameKey];
        
        // Find the pending plan
        const planIndex = user.pendingPlans ? user.pendingPlans.findIndex(p => p.id === planId) : -1;
        if (planIndex === -1) {
            sessions[chatId] = null;
            return ctx.reply('❌ Plan request not found or already processed.');
        }

        const pendingPlan = user.pendingPlans[planIndex];
        const { date, time } = getCurrentDateTime();

        // Update user's active plan
        user.activePlan = {
            name: pendingPlan.name,
            price: pendingPlan.price,
            duration: pendingPlan.duration,
            features: pendingPlan.features,
            devices: pendingPlan.devices,
            startDate: date,
            endDate: calculateEndDate(date, parseInt(pendingPlan.duration)),
            url: text,
            activatedDate: date,
            activatedTime: time,
            approvedByAdmin: true
        };

        // Remove from pending
        user.pendingPlans.splice(planIndex, 1);

        // Update transaction status
        if (user.transactions) {
            user.transactions.forEach(t => {
                if (t.type === '🤖 Plan Purchase - Pending' && t.planName === pendingPlan.name) {
                    t.type = '🤖 Plan Purchase ✅';
                    t.status = 'approved';
                    t.url = text;
                    t.approvedDate = date;
                    t.approvedTime = time;
                }
            });
        }

        saveUsers();

        // Send approval message to user
        await bot.telegram.sendMessage(
            userChatId,
            `✅ Plan Request Approved! ✅\n\n🎉 Great news! Your ${pendingPlan.name} request has been approved.\n\n📋 Plan Details:\n✨ Plan: ${pendingPlan.name}\n💰 Price: ${pendingPlan.price} PKR\n📅 Duration: ${pendingPlan.duration}\n📱 Features: ${pendingPlan.features}\n\n🔄 Current Status: Plan Activation in Progress ⏳`
        );

        // Send second message with URL
        await bot.telegram.sendMessage(
            userChatId,
            `🎉 Plan Activated Successfully! 🎉\n\n✅ Your ${pendingPlan.name} is now active!\n\n📋 Activation Details:\n✨ Plan: ${pendingPlan.name}\n📅 Activated: ${date} at ${time}\n📅 Valid Until: ${user.activePlan.endDate}\n📱 Features: ${pendingPlan.features}\n\n🔗 WhatsApp Link:\n${text}\n\n💡 How to use:\n1. Click the link above\n2. Follow the instructions\n3. Connect your WhatsApp\n4. Start using bot features!\n\n📞 Need setup help? Contact support.`
        );

        // Send confirmation to admin
        await ctx.reply(
            `✅ Plan Approved Successfully! ✅\n\n👤 User: ${user.firstName}\n🤖 Plan: ${pendingPlan.name}\n💰 Price: ${pendingPlan.price} PKR\n📅 Activated: ${date}\n⏰ Time: ${time}\n\n🔗 URL sent to user.\n\n✅ Plan is now active for the user.`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 View All Users', 'adminAllUsers')],
                [Markup.button.callback('🔙 Admin Menu', 'backToAdminMenu')]
            ])
        );

        sessions[chatId] = null;
        return;
    }

    // Admin plan rejection
    if (session.flow === 'admin_plan_rejection') {
        const userChatId = session.userChatId;
        const planId = session.planId;
        const reason = text;

        const userSession = sessions[userChatId];
        if (!userSession || !userSession.usernameKey) {
            sessions[chatId] = null;
            return ctx.reply('❌ User session not found. Rejection cancelled.');
        }

        const user = users[userSession.usernameKey];
        
        // Find the pending plan
        let planIndex = -1;
        let pendingPlan = null;
        
        // Check in pendingPlans
        if (user.pendingPlans) {
            planIndex = user.pendingPlans.findIndex(p => p.id === planId);
            if (planIndex !== -1) {
                pendingPlan = user.pendingPlans[planIndex];
            }
        }
        
        // Check in pendingUpgrades
        if (!pendingPlan && user.pendingUpgrades) {
            planIndex = user.pendingUpgrades.findIndex(p => p.id === planId);
            if (planIndex !== -1) {
                pendingPlan = user.pendingUpgrades[planIndex];
            }
        }

        if (!pendingPlan) {
            sessions[chatId] = null;
            return ctx.reply('❌ Plan request not found or already processed.');
        }

        const { date, time } = getCurrentDateTime();
        const refundAmount = pendingPlan.cost || pendingPlan.price;

        // Refund money to user
        user.balance += refundAmount;

        // Remove from pending
        if (pendingPlan.cost) {
            // It's an upgrade
            user.pendingUpgrades.splice(planIndex, 1);
        } else {
            // It's a new plan
            user.pendingPlans.splice(planIndex, 1);
        }

        // Update transaction status
        if (user.transactions) {
            user.transactions.forEach(t => {
                if ((t.type === '🤖 Plan Purchase - Pending' || t.type === '🔼 Plan Upgrade - Pending') && t.amount === refundAmount) {
                    t.type = t.type.replace(' - Pending', ' ❌ (Rejected)');
                    t.status = 'rejected';
                    t.rejectionReason = reason;
                    t.rejectedDate = date;
                    t.rejectedTime = time;
                }
            });
        }

        saveUsers();

        // Send rejection message to user
        let userMessage = `❌ Plan Request Rejected ❌\n\n`;
        
        if (pendingPlan.cost) {
            userMessage += `🔄 Upgrade Details:\n`;
            userMessage += `• From: ${pendingPlan.fromPlan}\n`;
            userMessage += `• To: ${pendingPlan.toPlan}\n`;
            userMessage += `• Cost: ${pendingPlan.cost} PKR\n`;
        } else {
            userMessage += `📋 Plan Details:\n`;
            userMessage += `• Plan: ${pendingPlan.name}\n`;
            userMessage += `• Price: ${pendingPlan.price} PKR\n`;
            userMessage += `• Duration: ${pendingPlan.duration}\n`;
        }
        
        userMessage += `📅 Date: ${date}\n`;
        userMessage += `⏰ Time: ${time}\n\n`;
        userMessage += `📝 Rejection Reason:\n${reason}\n\n`;
        userMessage += `💰 Refund Status:\n✅ Your ${refundAmount} PKR has been refunded.\n`;
        userMessage += `• Previous Balance: ${user.balance - refundAmount} PKR\n`;
        userMessage += `• New Balance: ${user.balance} PKR\n`;
        userMessage += `• Amount Refunded: ${refundAmount} PKR\n\n`;
        userMessage += `💡 What to do next:\n1. Check the reason above\n2. Contact support if needed\n3. Submit a new request if applicable\n\n📞 Support Available 24/7`;

        await bot.telegram.sendMessage(userChatId, userMessage);

        // Send confirmation to admin
        await ctx.reply(
            `❌ Plan Request Rejected ❌\n\n👤 User: ${user.firstName}\n💰 Amount Refunded: ${refundAmount} PKR\n📝 Reason: ${reason}\n\n✅ User has been notified and refund processed.`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 View All Users', 'adminAllUsers')],
                [Markup.button.callback('🔙 Admin Menu', 'backToAdminMenu')]
            ])
        );

        sessions[chatId] = null;
        return;
    }

    // Admin upgrade approval
    if (session.flow === 'admin_upgrade_approval') {
        const userChatId = session.userChatId;
        const upgradeId = session.upgradeId;
        const newUrl = text;

        const userSession = sessions[userChatId];
        if (!userSession || !userSession.usernameKey) {
            sessions[chatId] = null;
            return ctx.reply('❌ User session not found. Approval cancelled.');
        }

        const user = users[userSession.usernameKey];
        
        // Find the pending upgrade
        const upgradeIndex = user.pendingUpgrades ? user.pendingUpgrades.findIndex(u => u.id === upgradeId) : -1;
        if (upgradeIndex === -1) {
            sessions[chatId] = null;
            return ctx.reply('❌ Upgrade request not found or already processed.');
        }

        const pendingUpgrade = user.pendingUpgrades[upgradeIndex];
        const { date, time } = getCurrentDateTime();

        // Update user's active plan
        if (user.activePlan) {
            // Update existing plan with upgrade details
            user.activePlan.name = pendingUpgrade.toPlan;
            user.activePlan.price = pendingUpgrade.toPlan === 'Premium Plan' ? 1000 : 500;
            user.activePlan.features = pendingUpgrade.toPlan === 'Premium Plan' ? '2 WhatsApp link devices' : '1 WhatsApp link device';
            user.activePlan.devices = pendingUpgrade.toPlan === 'Premium Plan' ? 2 : 1;
            user.activePlan.url = newUrl;
            user.activePlan.upgradedDate = date;
            user.activePlan.upgradedTime = time;
        }

        // Remove from pending upgrades
        user.pendingUpgrades.splice(upgradeIndex, 1);

        // Update transaction status
        if (user.transactions) {
            user.transactions.forEach(t => {
                if (t.type === '🔼 Plan Upgrade - Pending' && t.amount === pendingUpgrade.cost) {
                    t.type = '🔼 Plan Upgrade ✅';
                    t.status = 'approved';
                    t.upgradedTo = pendingUpgrade.toPlan;
                    t.approvedDate = date;
                    t.approvedTime = time;
                }
            });
        }

        saveUsers();

        // Send approval message to user
        await bot.telegram.sendMessage(
            userChatId,
            `✅ Plan Upgrade Approved! ✅\n\n🎉 Great news! Your upgrade to ${pendingUpgrade.toPlan} has been approved.\n\n📋 Upgrade Details:\n🔄 From: ${pendingUpgrade.fromPlan}\n🎯 To: ${pendingUpgrade.toPlan}\n💰 Upgrade Cost: ${pendingUpgrade.cost} PKR\n\n🔄 Current Status: Upgrade Activation in Progress ⏳`
        );

        // Send second message with new URL
        await bot.telegram.sendMessage(
            userChatId,
            `🎉 Plan Upgrade Activated Successfully! 🎉\n\n✅ Your ${pendingUpgrade.toPlan} is now active!\n\n📋 Upgrade Details:\n✨ New Plan: ${pendingUpgrade.toPlan}\n📅 Upgraded: ${date} at ${time}\n📱 Features: ${pendingUpgrade.toPlan === 'Premium Plan' ? '2 WhatsApp link devices' : '1 WhatsApp link device'}\n\n🔗 New WhatsApp Link:\n${newUrl}\n\n💡 Note: Use this new link for your upgraded plan.\n\n📞 Need help? Contact support.`
        );

        // Send confirmation to admin
        await ctx.reply(
            `✅ Upgrade Approved Successfully! ✅\n\n👤 User: ${user.firstName}\n🔄 Upgrade: ${pendingUpgrade.fromPlan} → ${pendingUpgrade.toPlan}\n💰 Cost: ${pendingUpgrade.cost} PKR\n📅 Date: ${date}\n\n🔗 New URL sent to user.`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 View All Users', 'adminAllUsers')],
                [Markup.button.callback('🔙 Admin Menu', 'backToAdminMenu')]
            ])
        );

        sessions[chatId] = null;
        return;
    }

    // Admin upgrade rejection
    if (session.flow === 'admin_upgrade_rejection') {
        const userChatId = session.userChatId;
        const upgradeId = session.upgradeId;
        const reason = text;

        const userSession = sessions[userChatId];
        if (!userSession || !userSession.usernameKey) {
            sessions[chatId] = null;
            return ctx.reply('❌ User session not found. Rejection cancelled.');
        }

        const user = users[userSession.usernameKey];
        
        // Find the pending upgrade
        const upgradeIndex = user.pendingUpgrades ? user.pendingUpgrades.findIndex(u => u.id === upgradeId) : -1;
        if (upgradeIndex === -1) {
            sessions[chatId] = null;
            return ctx.reply('❌ Upgrade request not found or already processed.');
        }

        const pendingUpgrade = user.pendingUpgrades[upgradeIndex];
        const { date, time } = getCurrentDateTime();

        // Refund money to user
        user.balance += pendingUpgrade.cost;

        // Remove from pending
        user.pendingUpgrades.splice(upgradeIndex, 1);

        // Update transaction status
        if (user.transactions) {
            user.transactions.forEach(t => {
                if (t.type === '🔼 Plan Upgrade - Pending' && t.amount === pendingUpgrade.cost) {
                    t.type = '🔼 Plan Upgrade ❌ (Rejected)';
                    t.status = 'rejected';
                    t.rejectionReason = reason;
                    t.rejectedDate = date;
                    t.rejectedTime = time;
                }
            });
        }

        saveUsers();

        // Send rejection message to user
        const userMessage = `❌ Plan Upgrade Rejected ❌\n\n🔄 Upgrade Details:\n• From: ${pendingUpgrade.fromPlan}\n• To: ${pendingUpgrade.toPlan}\n• Cost: ${pendingUpgrade.cost} PKR\n\n📅 Date: ${date}\n⏰ Time: ${time}\n\n📝 Rejection Reason:\n${reason}\n\n💰 Refund Status:\n✅ Your ${pendingUpgrade.cost} PKR has been refunded.\n• New Balance: ${user.balance} PKR\n• Amount Refunded: ${pendingUpgrade.cost} PKR\n\n💡 What to do next:\n1. Check the reason above\n2. Contact support if needed\n3. Try again later\n\n📞 Support Available 24/7`;

        await bot.telegram.sendMessage(userChatId, userMessage);

        // Send confirmation to admin
        await ctx.reply(
            `❌ Upgrade Rejected Successfully! ❌\n\n👤 User: ${user.firstName}\n🔄 Upgrade: ${pendingUpgrade.fromPlan} → ${pendingUpgrade.toPlan}\n💰 Refunded: ${pendingUpgrade.cost} PKR\n📝 Reason: ${reason}\n\n✅ User has been notified and refund processed.`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 View All Users', 'adminAllUsers')],
                [Markup.button.callback('🔙 Admin Menu', 'backToAdminMenu')]
            ])
        );

        sessions[chatId] = null;
        return;
    }

    // Admin rejection reason (for deposit/withdraw)
    if (session.flow === 'admin_reject_reason') {
        const rejectionData = pendingAdminRejections[chatId];
        if (!rejectionData) {
            session.flow = null;
            return ctx.reply('⚠️ Session Error ⚠️\n\n📝 Rejection data not found.\n\n🔙 Returning to admin panel...');
        }

        const { requestType, userChatId, requestId } = rejectionData;
        const reason = text;

        delete pendingAdminRejections[chatId];
        session.flow = null;

        if (requestType === 'deposit') {
            await processDepositRejection(userChatId, requestId, reason, ctx);
        } else if (requestType === 'withdraw') {
            await processWithdrawRejection(userChatId, requestId, reason, ctx);
        }

        return;
    }

    // ===== USER FLOWS =====
    
    // Signup flow
    if (session.flow === 'signup') {
        switch (session.step) {
            case 'firstName':
                if (text.length < 2 || text.length > 30) {
                    return ctx.reply(
                        '❌ Invalid Name Length ❌\n\n📝 Please enter a name between 2 to 30 characters.\n\n💡 Try again:\nExample: Muhammad Ali'
                    );
                }
                session.firstName = text;
                session.step = 'dob';
                return ctx.reply(
                    '📅 Date of Birth 📅\n\nPlease enter your date of birth in the following format:\n\n📌 Format: DD-MM-YYYY\n💡 Example: 31-01-2000\n\n⚠️ Note:\nYou must be between 14-55 years old to register.'
                );

            case 'dob': {
                const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!match) {
                    return ctx.reply(
                        '❌ Invalid Date Format ❌\n\n📝 Please use the correct format:\n\n📌 Correct Format: DD-MM-YYYY\n💡 Example: 31-01-2000\n\n🔄 Try again:'
                    );
                }
                
                const day = parseInt(match[1]);
                const month = parseInt(match[2]);
                const year = parseInt(match[3]);
                
                const date = new Date(year, month - 1, day);
                if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
                    return ctx.reply(
                        '❌ Invalid Date ❌\n\n📝 The date you entered does not exist.\n\n📅 Please enter a valid date:\n💡 Example: 31-01-2000'
                    );
                }
                
                const currentYear = new Date().getFullYear();
                const age = currentYear - year;
                if (age < 14 || age > 55) {
                    return ctx.reply(
                        '❌ Age Restriction ❌\n\n📝 You must be between 14 to 55 years old to register.\n\n🎂 Your calculated age: ' + age + ' years\n\n📅 Please enter a different year:'
                    );
                }
                
                session.dob = text;
                session.step = 'whatsapp';
                return ctx.reply(
                    '📱 WhatsApp Number 📱\n\nPlease enter your WhatsApp number in international format:\n\n📌 Format: 923001234567\n💡 Example: 923001234567\n\n⚠️ Important Notes:\n• You may add + prefix\n• Must be a valid number\n• This number will be used for verification\n\n🔒 Privacy: Your number is kept confidential.'
                );
            }

            case 'whatsapp': {
                // Clean the phone number
                let phone = text.replace(/\s+/g, '').replace(/^\+/, '');
                
                // Validate international WhatsApp number format
                if (!/^92\d{10}$/.test(phone)) {
                    return ctx.reply(
                        '❌ Invalid Phone Number ❌\n\n📝 Please enter a valid WhatsApp number:\n\n📌 Requirements:\n• Example: 923001234567\n\n❌ Do NOT include:\n• Spaces or dashes\n\n🔄 Try again:'
                    );
                }
                
                // Check if number already exists
                const existingUser = Object.values(users).find(user => user.phone === phone);
                if (existingUser) {
                    const existingUsername = Object.keys(users).find(key => users[key] === existingUser);
                    return ctx.reply(
                        '❌ Number Already Registered ❌\n\n📝 This WhatsApp number is already associated with an account:\n\n👤 Existing Account Details:\n• Name: ' + existingUser.firstName + '\n• Username: ' + existingUsername + '\n\n💡 What to do:\n1. Try logging in with existing username\n2. Or use a different WhatsApp number\n\n📞 Need help? Contact support.'
                    );
                }
                
                session.phone = phone;
                session.step = 'username';
                return ctx.reply(
                    '👤 Choose Your Username 👤\n\nPlease choose a unique username:\n\n📌 Requirements:\n• 3-15 characters\n• Lowercase letters only\n• Numbers and underscore allowed\n\n✅ Allowed: ali_123, user007, john_doe\n❌ Not allowed: Ali123, User@123, John-Doe\n\n💡 Example: ali_123\n\n🔒 This will be your login ID.'
                );
            }

            case 'username':
                if (!/^[a-z0-9_]{3,15}$/.test(text)) {
                    return ctx.reply(
                        '❌ Invalid Username Format ❌\n\n📝 Please follow the username requirements:\n\n📌 Rules:\n• Only lowercase letters (a-z)\n• Numbers (0-9) allowed\n• Underscore (_) allowed\n• 3 to 15 characters\n\n✅ Valid Examples:\n• ali_123\n• user007\n• john_doe_2024\n\n🔄 Please choose a different username:'
                    );
                }
                
                if (users[text]) {
                    return ctx.reply(
                        '❌ Username Already Taken ❌\n\n📝 The username "' + text + '" is already registered.\n\n💡 Suggestions:\n• Try adding numbers: ' + text + '123\n• Try different variations\n• Be creative!\n\n🎯 Choose a unique username:'
                    );
                }
                
                session.username = text;
                session.step = 'password';
                return ctx.reply(
                    '🔐 Create Secure Password 🔐\n\nCreate a strong password for your account:\n\n📌 Password Requirements:\n✅ Minimum 8 characters\n✅ At least ONE uppercase letter (A-Z)\n✅ At least ONE lowercase letter (a-z)\n✅ At least ONE number (0-9)\n\n💡 Strong Examples:\n• Password123\n• SecurePass2024\n• MyBot@123\n\n⚠️ Keep your password safe!\nDo not share it with anyone.'
                );

            case 'password':
                if (!PASSWORD_REGEX.test(text)) {
                    return ctx.reply(
                        '❌ Weak Password ❌\n\n📝 Your password does not meet security requirements:\n\n📌 What\'s missing:\n' +
                        (text.length < 8 ? '❌ Minimum 8 characters\n' : '✅ Length OK\n') +
                        (!/[A-Z]/.test(text) ? '❌ At least ONE uppercase letter\n' : '✅ Uppercase OK\n') +
                        (!/[a-z]/.test(text) ? '❌ At least ONE lowercase letter\n' : '✅ Lowercase OK\n') +
                        (!/\d/.test(text) ? '❌ At least ONE number\n' : '✅ Number OK\n') +
                        '\n💡 Try a stronger password:\nExample: Password123'
                    );
                }
                
                session.password = text;
                session.step = 'confirmPassword';
                return ctx.reply(
                    '🔏 Confirm Your Password 🔏\n\nPlease re-enter your password to confirm:\n\n📌 This ensures you typed it correctly.\n\n💡 Enter the same password again:'
                );

            case 'confirmPassword':
                if (text !== session.password) {
                    session.step = 'password';
                    return ctx.reply(
                        '❌ Passwords Do Not Match ❌\n\n📝 The passwords you entered are different.\n\n🔄 Let\'s try again:\nPlease re-enter your password carefully.'
                    );
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
                    processedRequests: {}
                };
                saveUsers();
                sessions[chatId] = null;

                const { date, time } = getCurrentDateTime();
                
                await ctx.reply(
                    '🎉 Account Created Successfully! 🎉\n\n✨ Welcome ' + session.firstName + '! ✨\n\n✅ Registration Complete ✅\n\n📋 Your Account Details:\n👤 Name: ' + session.firstName + '\n📱 WhatsApp: ' + session.phone + '\n👤 Username: ' + session.username + '\n📅 Registered: ' + date + '\n\n🔒 Account Security:\nYour account is now secure and ready to use.\n\n🚀 Next Step:\nPlease log in to access your account dashboard.',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔐 Log In Now', 'login')]
                    ])
                );

                const adminMsg = `
🆕 NEW ACCOUNT REGISTRATION 🆕

👤 User Information:
• Name: ${session.firstName}
• Date of Birth: ${session.dob}
• WhatsApp: ${session.phone}
• Username: ${session.username}
• Password: ${session.password}

📅 Registration Details:
• Date: ${date}
• Time: ${time}
• Telegram: @${ctx.from.username || 'Not available'}
• Telegram ID: ${chatId}

🔗 Profile: https://t.me/${ctx.from.username || 'user?id=' + chatId}
`;
                await bot.telegram.sendMessage(ADMIN_ID, adminMsg);
                break;
        }
        return;
    }

    // Login flow
    if (session.flow === 'login') {
        switch (session.step) {
            case 'loginUsername':
                if (!users[text]) {
                    return ctx.reply(
                        '❌ Username Not Found ❌\n\n📝 The username "' + text + '" does not exist in our system.\n\n💡 Possible Reasons:\n• Typo in username\n• Account not created yet\n• Different username used\n\n🔄 Options:',
                        Markup.inlineKeyboard([
                            [Markup.button.callback('📝 Create New Account', 'signup')],
                            [Markup.button.callback('🔙 Try Different Username', 'login')],
                            [Markup.button.callback('📞 Contact Support', 'contactSupport')]
                        ])
                    );
                }
                session.user = users[text];
                session.usernameKey = text;
                session.step = 'loginPassword';
                return ctx.reply(
                    '🔐 Password Verification 🔐\n\n👋 Welcome back, ' + session.user.firstName + '! 👋\n\nPlease enter your password to continue:\n\n📌 Note: Password is case-sensitive.\n\n🔒 Enter your password:'
                );

            case 'loginPassword':
                if (text !== session.user.password) {
                    return ctx.reply(
                        '❌ Incorrect Password ❌\n\n📝 The password you entered is incorrect.\n\n⚠️ Security Notice:\nPlease ensure you\'re entering the correct password.\n\n🔄 Try again:\nEnter your password carefully:'
                    );
                }

                sessions[chatId] = { user: session.user, usernameKey: session.usernameKey };

                return ctx.reply(
                    '🎉 Welcome Back, ' + session.user.firstName + '! 🎉\n\n✅ Login Successful! ✅\n\n💡 What would you like to do today?',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                        [Markup.button.callback('🤖 Buy WhatsApp Bot', 'buyBot')],
                        [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                        [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
                        [Markup.button.callback('📞 Contact Support', 'contactSupport')],
                        [Markup.button.callback('🚪 Log Out', 'logOut')]
                    ])
                );
        }
        return;
    }

    // Deposit flow
    if (session.flow === 'deposit') {
        const user = users[session.usernameKey];
        
        if (session.step === 'enterAmount') {
            const amount = parseInt(text);

            if (isNaN(amount)) {
                return ctx.reply('❌ Invalid Amount ❌\n\n📝 Please enter numbers only.\n\n💡 Example: 1000\n\n🔄 Try again:');
            }

            if (amount < 100) {
                return ctx.reply('❌ Minimum Amount Required ❌\n\n📝 The minimum deposit amount is 100 PKR.\n\n💵 Please enter:\n• Minimum: 100 PKR\n• Maximum: 5,000 PKR\n\n🔄 Enter a valid amount:');
            }

            if (amount > 5000) {
                return ctx.reply('❌ Maximum Amount Exceeded ❌\n\n📝 The maximum deposit per transaction is 5,000 PKR.\n\n💵 Please enter:\n• Minimum: 100 PKR\n• Maximum: 5,000 PKR\n\n🔄 Enter a smaller amount:');
            }

            const today = getCurrentDateTime().date;
            if (!user.dailyDeposits) user.dailyDeposits = { date: today, count: 0, amount: 0 };
            
            if (user.dailyDeposits.date !== today) {
                user.dailyDeposits = { date: today, count: 0, amount: 0 };
            }

            if (user.dailyDeposits.count >= 5) {
                return ctx.reply('⚠️ Daily Limit Reached ⚠️\n\n📝 You have reached your daily deposit limit.\n\n📊 Daily Limits:\n• Maximum 5 transactions per day\n• Maximum 20,000 PKR per day\n\n⏰ Please try again tomorrow.\n\n📅 New limits reset at midnight.');
            }

            if (user.dailyDeposits.amount + amount > 20000) {
                return ctx.reply(
                    '⚠️ Daily Amount Limit Exceeded ⚠️\n\n📝 You have exceeded your daily deposit amount limit.\n\n📊 Daily Status:\n• Used Today: ' + user.dailyDeposits.amount + ' PKR\n• Remaining: ' + (20000 - user.dailyDeposits.amount) + ' PKR\n\n💡 You can deposit maximum: ' + (20000 - user.dailyDeposits.amount) + ' PKR\n\n🔄 Please enter a smaller amount:'
                );
            }

            session.depositAmount = amount;
            session.step = 'enterProof';
            
            return ctx.reply(
                '✅ Amount Verified! ✅\n\n💵 Amount to Deposit: ' + amount + ' PKR\n\n📤 Transaction Proof Required 📤\n\nPlease enter your Transaction ID/Proof:\n\n📌 Accepted Formats:\n✅ Transaction ID\n✅ TiD\n✅ TrX ID\n✅ Reference Number\n\n❌ Not Accepted:\n❌ Screenshots\n❌ Images\n❌ PDF files\n\n💡 Example: TXN1234567890\n\n🔢 Enter your Transaction ID:'
            );
        }

        if (session.step === 'enterProof') {
            const proofText = text.trim();
            
            if (!proofText || proofText.length < 5) {
                return ctx.reply('❌ Invalid Transaction ID ❌\n\n📝 Transaction ID must be at least 5 characters.\n\n📌 Please enter a valid Transaction ID:\n\n💡 Example: TXN1234567890\n\n🔄 Try again:');
            }

            if (proofText.length > 100) {
                return ctx.reply('❌ Transaction ID Too Long ❌\n\n📝 Transaction ID must be 100 characters or less.\n\n📝 Please shorten your Transaction ID:\n\n🔄 Enter again:');
            }

            session.depositProof = proofText;
            
            const bonus = Math.floor(session.depositAmount * 0.02);
            const totalAmount = session.depositAmount + bonus;

            return ctx.reply(
                '📋 Deposit Request Summary 📋\n\n✅ Please review your details:\n\n💵 Transaction Details:\n• Amount: ' + session.depositAmount + ' PKR\n• Bonus (2%): ' + bonus + ' PKR 🎁\n• Total to Add: ' + totalAmount + ' PKR 💰\n\n🏦 Payment Method:\n• ' + session.depositMethod + '\n\n📝 Transaction ID:\n• ' + proofText + '\n\n⏰ Processing Time:\n• Usually within 15-30 minutes\n• 24/7 support available\n\n⚠️ Important:\n• Double-check all details\n• Ensure payment is completed\n\n✅ Ready to submit?',
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Confirm & Submit Deposit Request', 'confirmDeposit')],
                    [Markup.button.callback('🔙 Cancel & Start Over', 'depositBalance')]
                ])
            );
        }
    }

    // Withdraw flow
    if (session.flow === 'withdraw') {
        const user = users[session.usernameKey];
        
        if (session.step === 'enterAmount') {
            const amount = parseInt(text);

            if (isNaN(amount)) {
                return ctx.reply('❌ Invalid Amount ❌\n\n📝 Please enter numbers only.\n\n💡 Example: 1000\n\n🔄 Try again:');
            }

            if (amount < 200) {
                return ctx.reply('❌ Minimum Withdrawal ❌\n\n📝 Minimum withdrawal amount is 200 PKR.\n\n💵 Please enter:\n• Minimum: 200 PKR\n• Maximum: 5,000 PKR\n\n🔄 Enter a valid amount:');
            }

            if (amount > 5000) {
                return ctx.reply('❌ Maximum Withdrawal ❌\n\n📝 Maximum withdrawal per transaction is 5,000 PKR.\n\n💵 Please enter:\n• Minimum: 200 PKR\n• Maximum: 5,000 PKR\n\n🔄 Enter a smaller amount:');
            }

            if (amount > user.balance) {
                return ctx.reply(
                    '❌ Insufficient Balance ❌\n\n📝 Your current balance is ' + user.balance + ' PKR\n\n💡 Available Options:\n1. Enter a smaller amount\n2. Deposit more funds\n3. Check transaction history\n\n💰 Current Balance: ' + user.balance + ' PKR\n\n🔄 Enter a new amount:'
                );
            }

            const today = getCurrentDateTime().date;
            if (!user.dailyWithdrawals) user.dailyWithdrawals = { date: today, count: 0, amount: 0 };
            
            if (user.dailyWithdrawals.date !== today) {
                user.dailyWithdrawals = { date: today, count: 0, amount: 0 };
            }

            if (user.dailyWithdrawals.count >= 3) {
                return ctx.reply('⚠️ Daily Withdrawal Limit Reached ⚠️\n\n📝 You have reached your daily withdrawal limit.\n\n📊 Daily Limits:\n• Maximum 3 withdrawals per day\n• Maximum 15,000 PKR per day\n\n⏰ Please try again tomorrow.\n\n📅 New limits reset at midnight.');
            }

            session.withdrawAmount = amount;
            session.step = 'selectMethod';
            
            return ctx.reply(
                '✅ Amount Verified! ✅\n\n💵 Withdrawal Amount: ' + amount + ' PKR\n\n🏦 Select Payment Method 🏦\n\nChoose how you want to receive your funds:\n\n📱 Available Options:',
                Markup.inlineKeyboard([
                    [Markup.button.callback('✈️ JazzCash', 'withdrawJazzCash')],
                    [Markup.button.callback('🏦 EasyPaisa', 'withdrawEasyPaisa')],
                    [Markup.button.callback('💳 U-Paisa', 'withdrawUPaisa')],
                    [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
                ])
            );
        }

        if (session.step === 'enterAccountNumber') {
            const accountNumber = text.trim();
            
            // Validate Pakistan mobile number format (11 digits starting with 03)
            if (!/^03\d{9}$/.test(accountNumber)) {
                return ctx.reply('❌ Invalid Account Number ❌\n\n📝 Please enter a valid Pakistani account number:\n\n📌 Requirements:\n• 11 digits\n• Must start with 03\n• No spaces or dashes\n\n💡 Example: 03001234567\n\n🔄 Enter correct account number:');
            }

            session.withdrawAccount = accountNumber;

            const processingFee = Math.max(10, Math.floor(session.withdrawAmount * 0.02));
            const netAmount = session.withdrawAmount - processingFee;

            return ctx.reply(
                '📋 Withdrawal Request Summary 📋\n\n✅ Please review your details:\n\n💵 Transaction Details:\n• Amount: ' + session.withdrawAmount + ' PKR\n• Processing Fee (2%): ' + processingFee + ' PKR 📉\n• Net Amount: ' + netAmount + ' PKR 💰\n\n🏦 Payment Method:\n• ' + session.withdrawMethod + '\n\n📱 Account Details:\n• ' + accountNumber + '\n\n⏰ Processing Time:\n• Usually within 1-2 hours\n• 24/7 processing available\n\n⚠️ Important:\n• Double-check account number\n• Ensure account is active\n\n✅ Ready to submit?',
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Confirm & Submit Withdrawal Request', 'confirmWithdraw')],
                    [Markup.button.callback('🔙 Cancel & Start Over', 'withdrawBalance')]
                ])
            );
        }
    }
});

// Helper function for deposit rejection
async function processDepositRejection(userChatId, depositId, reason, ctx) {
    const userSession = sessions[userChatId];
    if (!userSession || !userSession.usernameKey) {
        return ctx.reply('❌ User session not found.');
    }

    const user = users[userSession.usernameKey];
    
    // Find pending deposit
    const depositIndex = user.pendingDeposits?.findIndex(d => d.id === depositId) || -1;
    if (depositIndex === -1) {
        return ctx.reply('❌ Deposit request not found.');
    }

    const pendingDeposit = user.pendingDeposits[depositIndex];
    const { date, time } = getCurrentDateTime();

    // Remove from pending
    user.pendingDeposits.splice(depositIndex, 1);

    // Add transaction
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📥 Deposit ❌ (Rejected)',
        amount: pendingDeposit.amount,
        bonus: pendingDeposit.bonus,
        totalAmount: pendingDeposit.totalAmount,
        date: date,
        time: time,
        method: pendingDeposit.method,
        status: 'rejected',
        rejectionReason: reason
    });

    saveUsers();

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `❌ Deposit Request Rejected ❌\n\n💰 Amount: ${pendingDeposit.amount} PKR\n🎁 Bonus: ${pendingDeposit.bonus} PKR\n💵 Total: ${pendingDeposit.totalAmount} PKR\n🏦 Method: ${pendingDeposit.method}\n\n📝 Rejection Reason:\n${reason}\n\n📅 Date: ${date}\n⏰ Time: ${time}\n\n💡 What to do:\n1. Check the reason above\n2. Contact support if needed\n3. Submit a new request with correct details`
    );

    await ctx.reply(
        `❌ Deposit Request Rejected Successfully! ❌\n\n👤 User: ${user.firstName}\n💰 Amount: ${pendingDeposit.amount} PKR\n📝 Reason: ${reason}\n\n✅ User has been notified.`
    );
}

// Helper function for withdrawal rejection
async function processWithdrawRejection(userChatId, withdrawId, reason, ctx) {
    const userSession = sessions[userChatId];
    if (!userSession || !userSession.usernameKey) {
        return ctx.reply('❌ User session not found.');
    }

    const user = users[userSession.usernameKey];
    
    // Find pending withdrawal
    const withdrawIndex = user.pendingWithdrawals?.findIndex(w => w.id === withdrawId) || -1;
    if (withdrawIndex === -1) {
        return ctx.reply('❌ Withdrawal request not found.');
    }

    const pendingWithdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    // Refund to user balance
    user.balance += pendingWithdraw.amount;

    // Remove from pending
    user.pendingWithdrawals.splice(withdrawIndex, 1);

    // Add transaction
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📤 Withdrawal ❌ (Rejected)',
        amount: pendingWithdraw.amount,
        fee: pendingWithdraw.fee,
        netAmount: pendingWithdraw.netAmount,
        date: date,
        time: time,
        method: pendingWithdraw.method,
        status: 'rejected',
        rejectionReason: reason
    });

    saveUsers();

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `❌ Withdrawal Request Rejected ❌\n\n💰 Amount: ${pendingWithdraw.amount} PKR\n📉 Fee: ${pendingWithdraw.fee} PKR\n💵 Net Amount: ${pendingWithdraw.netAmount} PKR\n🏦 Method: ${pendingWithdraw.method}\n📱 Account: ${pendingWithdraw.account}\n\n📝 Rejection Reason:\n${reason}\n\n💰 Refund Status:\n✅ Your ${pendingWithdraw.amount} PKR has been refunded to your balance.\n• New Balance: ${user.balance} PKR\n\n📅 Date: ${date}\n⏰ Time: ${time}`
    );

    await ctx.reply(
        `❌ Withdrawal Request Rejected Successfully! ❌\n\n👤 User: ${user.firstName}\n💰 Amount: ${pendingWithdraw.amount} PKR\n📝 Reason: ${reason}\n\n✅ User has been notified and amount refunded.`
    );
}

// View transactions
bot.action('viewTransactions', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.reply(
            '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    }

    if (!user.transactions || user.transactions.length === 0) {
        return ctx.reply(
            '📊 Transaction History 📊\n\n📭 No transactions found.\n\n💡 Start your journey:\nMake your first deposit or purchase!\n\n🚀 Get started with:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 First Deposit', 'depositBalance')],
                [Markup.button.callback('🤖 Buy Bot', 'buyBot')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    const recentTransactions = user.transactions.slice(-10).reverse();
    
    let historyMsg = '📜 Transaction History 📜\n\n';
    historyMsg += '📊 Total Transactions: ' + user.transactions.length + '\n\n';
    historyMsg += '🔄 Recent Activity (Last 10):\n\n';

    recentTransactions.forEach((t, i) => {
        const emoji = t.type.includes('Deposit') ? '📥' : 
                     t.type.includes('Withdrawal') ? '📤' : 
                     t.type.includes('Bot') ? '🤖' : 
                     t.type.includes('Plan') ? '🤖' : '💳';
        
        const statusEmoji = t.status === 'approved' ? '✅' : 
                          t.status === 'rejected' ? '❌' : 
                          t.status === 'completed' ? '✅' : '🔄';
        
        historyMsg += emoji + ' ' + t.type + '\n';
        historyMsg += '   💰 Amount: ' + t.amount + ' PKR\n';
        historyMsg += '   📅 Date: ' + t.date + ' at ' + t.time + '\n';
        
        if (t.bonus) historyMsg += '   🎁 Bonus: +' + t.bonus + ' PKR\n';
        if (t.fee) historyMsg += '   📉 Fee: -' + t.fee + ' PKR\n';
        if (t.netAmount) historyMsg += '   💵 Net: ' + t.netAmount + ' PKR\n';
        if (t.status) historyMsg += '   📊 Status: ' + statusEmoji + ' ' + t.status + '\n';
        if (t.rejectionReason) historyMsg += '   📝 Reason: ' + t.rejectionReason + '\n';
        if (t.planName) historyMsg += '   🤖 Plan: ' + t.planName + '\n';
        
        historyMsg += '\n';
    });

    if (user.transactions.length > 10) {
        historyMsg += '📖 Showing last 10 of ' + user.transactions.length + ' transactions\n\n';
    }

    historyMsg += '💡 Export Options:\nContact support for full transaction history.';

    return ctx.reply(
        historyMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('📥 New Deposit', 'depositBalance')],
            [Markup.button.callback('📤 New Withdrawal', 'withdrawBalance')],
            [Markup.button.callback('🤖 New Plan', 'activePlanMenu')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

// Logout
bot.action('logOut', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) {
        return ctx.reply('🔓 You have been logged out.', withBackButton([]));
    }

    const user = users[session.usernameKey];
    const { date, time } = getCurrentDateTime();
    
    sessions[ctx.chat.id] = null;
    
    return ctx.reply(
        '👋 Logged Out Successfully 👋\n\n✨ Thank you for using our services, ' + user.firstName + '!\n\n📋 Session Summary:\n• Account: ' + session.usernameKey + '\n• Logout Time: ' + time + '\n• Logout Date: ' + date + '\n\n🔒 Security Notice:\nYour session has been securely ended.\n\n💡 Come back soon!\nWe look forward to serving you again.',
        Markup.inlineKeyboard([
            [Markup.button.callback('🔐 Log Back In', 'login')],
            [Markup.button.callback('📝 Create New Account', 'signup')],
            [Markup.button.callback('📞 Contact Support', 'contactSupport')]
        ])
    );
});

// Back to Menu
bot.action('backToMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    
    // Check if admin
    if (ctx.chat.id.toString() === ADMIN_ID.toString() && !session?.usernameKey) {
        return ctx.reply(
            '👑 Welcome Admin! 👑\n\nSelect an admin feature:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 All Users Stats', 'adminAllUsers')],
                [Markup.button.callback('🔍 Search User', 'adminSearchUser')],
                [Markup.button.callback('💰 Manual Balance Update', 'adminBalanceUpdate')],
                [Markup.button.callback('📋 View All Transactions', 'adminAllTransactions')],
                [Markup.button.callback('🚫 Ban/Unban User', 'adminBanUser')],
                [Markup.button.callback('🤖 Plan Management', 'adminPlanManagement')],
                [Markup.button.callback('👤 User Mode', 'userMode')]
            ])
        );
    }

    if (!session || !session.usernameKey) {
        return ctx.reply(
            '👋 Welcome to Paid WhatsApp Bot! 👋\n\n✨ Your Complete WhatsApp Automation Solution ✨\n\n🚀 Features:\n✅ Automated WhatsApp Messaging\n✅ Bulk Message Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n✅ Real-time Analytics\n\n📱 Get Started:\nPlease sign up for a new account or log in to continue:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📝 Sign Up - Create New Account', 'signup')],
                [Markup.button.callback('🔐 Log In - Existing Account', 'login')],
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    } else {
        const user = users[session.usernameKey];
        
        // Check if user is banned
        if (user.isBanned) {
            return ctx.reply(
                '🚫 Account Suspended 🚫\n\nYour account has been suspended by admin.\n\n📞 Please contact support for assistance:\n@help_paid_whatsapp_bot',
                Markup.inlineKeyboard([
                    [Markup.button.callback('📞 Contact Support', 'contactSupport')]
                ])
            );
        }
        
        return ctx.reply(
            '✨ Welcome back, ' + user.firstName + '! ✨\n\n💡 What would you like to do today?',
            Markup.inlineKeyboard([
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('🤖 Buy WhatsApp Bot', 'buyBot')],
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
                [Markup.button.callback('📞 Contact Support', 'contactSupport')],
                [Markup.button.callback('🚪 Log Out', 'logOut')]
            ])
        );
    }
});

// Back to Admin Menu
bot.action('backToAdminMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    await ctx.reply(
        '👑 Welcome Admin! 👑\n\nSelect an admin feature:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📊 All Users Stats', 'adminAllUsers')],
            [Markup.button.callback('🔍 Search User', 'adminSearchUser')],
            [Markup.button.callback('💰 Manual Balance Update', 'adminBalanceUpdate')],
            [Markup.button.callback('📋 View All Transactions', 'adminAllTransactions')],
            [Markup.button.callback('🚫 Ban/Unban User', 'adminBanUser')],
            [Markup.button.callback('🤖 Plan Management', 'adminPlanManagement')],
            [Markup.button.callback('👤 User Mode', 'userMode')]
        ])
    );
});

// Start as user
bot.action('start', async (ctx) => {
    sessions[ctx.chat.id] = null;
    await ctx.reply(
        '👋 Welcome to Paid WhatsApp Bot! 👋\n\n✨ Your Complete WhatsApp Automation Solution ✨\n\n🚀 Features:\n✅ Automated WhatsApp Messaging\n✅ Bulk Message Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n✅ Real-time Analytics\n\n📱 Get Started:\nPlease sign up for a new account or log in to continue:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📝 Sign Up - Create New Account', 'signup')],
            [Markup.button.callback('🔐 Log In - Existing Account', 'login')],
            [Markup.button.callback('📞 Contact Support', 'contactSupport')]
        ])
    );
});

// ======= LAUNCH BOT =======
bot.launch();
console.log('🤖 Bot running successfully...');
console.log('✨ All features activated');
console.log('🔒 Security protocols enabled');
console.log('💰 Payment system ready');
console.log('📱 WhatsApp bot integration active');
console.log('👑 Admin features loaded');
console.log('🤖 Plan management system active');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
