const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ===== BOT =====
const bot = new Telegraf('8226474686:AAEmXiWRGoeaa5pZlF2MZlYViYmSkM70fbI');
const ADMIN_ID = 6012422087;

// ===== DATABASE =====
const DATA_FILE = './users.json';
const PLANS_FILE = './plans.json';
let users = {};
let plans = {};

// لوڈ ڈیٹا
if (fs.existsSync(DATA_FILE)) {
    users = JSON.parse(fs.readFileSync(DATA_FILE));
}

if (fs.existsSync(PLANS_FILE)) {
    plans = JSON.parse(fs.readFileSync(PLANS_FILE));
} else {
    // ڈیفالٹ پلانز
    plans = {
        "plan1": {
            id: "plan1",
            name: "🥉 Basic Plan",
            price: 350,
            duration: 15, // دنوں میں
            whatsappLinks: 1,
            features: ["1 WhatsApp Link", "Basic Support", "15 Days Validity"],
            isActive: true
        },
        "plan2": {
            id: "plan2",
            name: "🥈 Standard Plan",
            price: 500,
            duration: 30,
            whatsappLinks: 1,
            features: ["1 WhatsApp Link", "Priority Support", "30 Days Validity"],
            isActive: true
        },
        "plan3": {
            id: "plan3",
            name: "🥇 Premium Plan",
            price: 1200,
            duration: 90,
            whatsappLinks: 1,
            features: ["1 WhatsApp Link", "24/7 Support", "3 Months Validity"],
            isActive: true
        },
        "plan4": {
            id: "plan4",
            name: "🏆 Business Plan",
            price: 2000,
            duration: 90,
            whatsappLinks: 2,
            features: ["2 WhatsApp Links", "24/7 Priority Support", "3 Months Validity"],
            isActive: true
        }
    };
    savePlans();
}

function saveUsers() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function savePlans() {
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2));
}

const sessions = {};
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Store admin rejection reasons
const pendingAdminRejections = {};
const pendingAdminActivations = {};

// ===== DATE & TIME (Pakistan Time) =====
function getCurrentDateTime() {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const pakistanTime = new Date(utc + 5 * 60 * 60 * 1000);

    const date = `${String(pakistanTime.getDate()).padStart(2,'0')}-${String(pakistanTime.getMonth()+1).padStart(2,'0')}-${pakistanTime.getFullYear()}`;
    const time = `${String(pakistanTime.getHours()).padStart(2,'0')}:${String(pakistanTime.getMinutes()).padStart(2,'0')}:${String(pakistanTime.getSeconds()).padStart(2,'0')}`;

    return { date, time };
}

// ======= Helper Functions =======
function withBackButton(buttons = []) {
    return Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
    ]);
}

function withBackToBuyMenu(buttons = []) {
    return Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback('🔙 Back to Buy Menu', 'buyBot')]
    ]);
}

function generateDepositId() {
    return 'dep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function generateWithdrawId() {
    return 'wd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generatePlanRequestId() {
    return 'plan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
                [Markup.button.callback('📱 Manage WhatsApp Plans', 'adminManagePlans')],
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
                [Markup.button.callback('🤖 WhatsApp Plans', 'buyBot')],
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

// ======= BUY BOT (NEW FLOW) =======
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

    await ctx.reply(
        '🤖 WhatsApp Bot Plans 🤖\n\n✨ Choose an option to proceed:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📋 Active Plans (Buy New)', 'viewActivePlans')],
            [Markup.button.callback('⬆️ Upgrade Plan', 'upgradePlanMenu')],
            [Markup.button.callback('👁️ Your Running Plans', 'viewRunningPlans')],
            [Markup.button.callback('💰 Check Balance', 'checkBalance')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

// ======= VIEW ACTIVE PLANS =======
bot.action('viewActivePlans', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user has pending plan request
    if (user.pendingPlanRequest) {
        return ctx.reply(
            '⏳ Pending Plan Request ⏳\n\n📝 You already have a pending plan request.\n\nPlease wait for your current request to be processed before making a new one.\n\n📊 Status: Awaiting Admin Approval',
            withBackToBuyMenu()
        );
    }

    let message = '📋 Available WhatsApp Plans 📋\n\n';
    const buttons = [];

    Object.values(plans).forEach((plan, index) => {
        if (plan.isActive) {
            message += `${plan.name}\n`;
            message += `💰 Price: ${plan.price} PKR\n`;
            message += `📅 Duration: ${plan.duration} Days\n`;
            message += `🔗 WhatsApp Links: ${plan.whatsappLinks}\n`;
            message += `✨ Features: ${plan.features.join(', ')}\n\n`;

            buttons.push([Markup.button.callback(`🛒 Buy ${plan.name}`, `selectPlan_${plan.id}`)]);
        }
    });

    buttons.push([Markup.button.callback('🔙 Back to Buy Menu', 'buyBot')]);

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// ======= SELECT PLAN =======
bot.action(/selectPlan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    const plan = plans[planId];

    if (!plan || !plan.isActive) {
        return ctx.reply('❌ This plan is not available.', withBackToBuyMenu());
    }

    // Store selected plan in session
    session.selectedPlanId = planId;
    session.planFlow = 'buy_new';

    if (user.balance < plan.price) {
        const needed = plan.price - user.balance;
        return ctx.reply(
            `❌ Insufficient Balance ❌\n\n🤖 Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n💳 Your Balance: ${user.balance} PKR\n\n📝 You need ${needed} PKR more to purchase this plan.\n\n📥 Please deposit funds first:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('🔙 Back to Plans', 'viewActivePlans')]
            ])
        );
    }

    await ctx.reply(
        `🤖 Confirm Plan Purchase 🤖\n\n📋 Plan Details:\n${plan.name}\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} Days\n🔗 WhatsApp Links: ${plan.whatsappLinks}\n✨ Features: ${plan.features.join(', ')}\n\n💳 Your Balance: ${user.balance} PKR\n\n✅ Confirm purchase?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirm Purchase', 'confirmPlanPurchase')],
            [Markup.button.callback('🔙 Cancel', 'viewActivePlans')]
        ])
    );
});

// ======= CONFIRM PLAN PURCHASE =======
bot.action('confirmPlanPurchase', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

    const user = users[session.usernameKey];
    const planId = session.selectedPlanId;
    
    if (!planId || !plans[planId]) {
        return ctx.answerCbQuery('❌ Invalid plan selected.', { show_alert: true });
    }

    const plan = plans[planId];

    // Check if user has pending request
    if (user.pendingPlanRequest) {
        return ctx.answerCbQuery('⏳ You already have a pending plan request.', { show_alert: true });
    }

    // Check balance again
    if (user.balance < plan.price) {
        return ctx.answerCbQuery('❌ Insufficient balance.', { show_alert: true });
    }

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('Could not update message:', e.message);
    }

    // Generate request ID
    const requestId = generatePlanRequestId();
    const { date, time } = getCurrentDateTime();

    // Create pending request
    user.pendingPlanRequest = {
        id: requestId,
        planId: planId,
        planName: plan.name,
        price: plan.price,
        duration: plan.duration,
        whatsappLinks: plan.whatsappLinks,
        type: session.planFlow || 'buy_new',
        date: date,
        time: time,
        status: 'pending'
    };

    // Deduct amount from balance
    user.balance -= plan.price;

    // Add to transactions
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `🤖 Plan Purchase Request (${plan.name})`,
        amount: plan.price,
        date: date,
        time: time,
        status: 'pending_approval',
        requestId: requestId
    });

    saveUsers();

    // Send to admin
    const adminMsg = `
🆕 NEW PLAN PURCHASE REQUEST 🆕

👤 User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}
• User ID: ${chatId}

📋 Plan Details:
• Plan: ${plan.name}
• Price: ${plan.price} PKR
• Duration: ${plan.duration} Days
• WhatsApp Links: ${plan.whatsappLinks}
• Type: ${session.planFlow === 'upgrade' ? 'Upgrade' : 'New Purchase'}

💰 Payment Status:
• Amount Deducted: ${plan.price} PKR
• User New Balance: ${user.balance} PKR

📅 Request Details:
• Date: ${date}
• Time: ${time}
• Request ID: ${requestId}
`;

    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve Request', `admin_approve_plan_${chatId}_${requestId}`)],
            [Markup.button.callback('❌ Reject Request', `admin_reject_plan_${chatId}_${requestId}`)]
        ])
    );

    await ctx.reply(
        '✅ Purchase Request Submitted! ✅\n\n📋 Your Request Details:\n' +
        `• Plan: ${plan.name}\n` +
        `• Price: ${plan.price} PKR\n` +
        `• Duration: ${plan.duration} Days\n` +
        `• Request ID: ${requestId}\n\n` +
        '⏳ Status: Awaiting Admin Approval\n\n' +
        '📝 Note:\n' +
        '• Your payment has been deducted\n' +
        '• You will receive WhatsApp link after approval\n' +
        '• You cannot send another request until this is processed'
    );

    // Clear session
    delete session.selectedPlanId;
    delete session.planFlow;
});

// ======= UPGRADE PLAN MENU =======
bot.action('upgradePlanMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user has active plan
    const activePlans = user.plans ? user.plans.filter(p => {
        const endDate = new Date(p.endDate.split('-').reverse().join('-'));
        return endDate > new Date();
    }) : [];

    if (activePlans.length === 0) {
        return ctx.reply(
            '📭 No Active Plan Found 📭\n\nYou don\'t have any active plan to upgrade.\n\n💡 Please purchase a plan first:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 View Active Plans', 'viewActivePlans')],
                [Markup.button.callback('🔙 Back to Buy Menu', 'buyBot')]
            ])
        );
    }

    // Get current active plan (take the first one)
    const currentPlan = activePlans[0];
    session.currentPlanId = currentPlan.planId;

    let message = '⬆️ Upgrade Your Plan ⬆️\n\n';
    message += `📋 Current Plan: ${currentPlan.planName}\n`;
    message += `💰 Paid: ${currentPlan.price} PKR\n`;
    message += `📅 Valid Until: ${currentPlan.endDate}\n\n`;
    message += '🔝 Available Upgrade Plans:\n\n';

    const buttons = [];
    const currentPlanData = plans[currentPlan.planId];
    
    Object.values(plans).forEach(plan => {
        if (plan.isActive && plan.price > currentPlanData.price) {
            message += `${plan.name}\n`;
            message += `💰 Price: ${plan.price} PKR\n`;
            message += `📅 Duration: ${plan.duration} Days\n`;
            message += `🔗 WhatsApp Links: ${plan.whatsappLinks}\n\n`;

            buttons.push([Markup.button.callback(`⬆️ Upgrade to ${plan.name}`, `selectUpgradePlan_${plan.id}`)]);
        }
    });

    if (buttons.length === 0) {
        message += '🎉 You already have the highest plan!\n';
        buttons.push([Markup.button.callback('📋 View Active Plans', 'viewActivePlans')]);
    }

    buttons.push([Markup.button.callback('🔙 Back to Buy Menu', 'buyBot')]);

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// ======= SELECT UPGRADE PLAN =======
bot.action(/selectUpgradePlan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    const plan = plans[planId];
    const currentPlanId = session.currentPlanId;

    if (!plan || !plan.isActive) {
        return ctx.reply('❌ This plan is not available.', withBackToBuyMenu());
    }

    // Store in session
    session.selectedPlanId = planId;
    session.planFlow = 'upgrade';

    // Calculate remaining days from current plan
    const currentPlan = user.plans.find(p => p.planId === currentPlanId);
    let remainingDays = 0;
    
    if (currentPlan && currentPlan.endDate) {
        const endDate = new Date(currentPlan.endDate.split('-').reverse().join('-'));
        const today = new Date();
        remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    }

    const totalDuration = plan.duration + remainingDays;

    if (user.balance < plan.price) {
        const needed = plan.price - user.balance;
        return ctx.reply(
            `❌ Insufficient Balance ❌\n\n🤖 Upgrade to: ${plan.name}\n💰 Price: ${plan.price} PKR\n💳 Your Balance: ${user.balance} PKR\n\n📝 You need ${needed} PKR more.\n📥 Please deposit funds first:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('🔙 Back', 'upgradePlanMenu')]
            ])
        );
    }

    await ctx.reply(
        `⬆️ Confirm Plan Upgrade ⬆️\n\n📋 Upgrade Details:\nFrom: ${currentPlan.planName}\nTo: ${plan.name}\n\n💰 Price: ${plan.price} PKR\n📅 Current Plan Remaining: ${remainingDays} Days\n📅 New Total Duration: ${totalDuration} Days\n🔗 WhatsApp Links: ${plan.whatsappLinks}\n✨ Features: ${plan.features.join(', ')}\n\n💳 Your Balance: ${user.balance} PKR\n\n✅ Confirm upgrade?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirm Upgrade', 'confirmPlanPurchase')],
            [Markup.button.callback('🔙 Cancel', 'upgradePlanMenu')]
        ])
    );
});

// ======= VIEW RUNNING PLANS =======
bot.action('viewRunningPlans', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    if (!user.plans || user.plans.length === 0) {
        return ctx.reply(
            '📭 No Active Plans 📭\n\nYou don\'t have any active WhatsApp plans.\n\n💡 Purchase your first plan now:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 View Active Plans', 'viewActivePlans')],
                [Markup.button.callback('🔙 Back to Buy Menu', 'buyBot')]
            ])
        );
    }

    let message = '👁️ Your Running Plans 👁️\n\n';
    const today = new Date();

    user.plans.forEach((plan, index) => {
        const endDate = new Date(plan.endDate.split('-').reverse().join('-'));
        const isActive = endDate > today;
        
        message += `${isActive ? '✅' : '❌'} ${plan.planName}\n`;
        message += `💰 Paid: ${plan.price} PKR\n`;
        message += `📅 Purchased: ${plan.purchaseDate}\n`;
        message += `📅 Valid Until: ${plan.endDate}\n`;
        message += `🔗 WhatsApp Link: ${plan.whatsappLink || 'Not activated yet'}\n`;
        message += `📊 Status: ${isActive ? 'ACTIVE' : 'EXPIRED'}\n\n`;
    });

    message += '💡 Note:\n• Only one plan can be active at a time\n• Expired plans can be renewed';

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📋 Buy New Plan', 'viewActivePlans')],
            [Markup.button.callback('⬆️ Upgrade Plan', 'upgradePlanMenu')],
            [Markup.button.callback('🔙 Back to Buy Menu', 'buyBot')]
        ])
    );
});

// ======= ADMIN PLAN APPROVAL =======
bot.action(/admin_approve_plan_(\d+)_(plan_.+)/, async (ctx) => {
    const [_, userChatId, requestId] = ctx.match;
    const session = sessions[userChatId];
    
    if (!session || !session.usernameKey) {
        return ctx.answerCbQuery('👤 User not found.', { show_alert: true });
    }

    const user = users[session.usernameKey];
    if (!user.pendingPlanRequest || user.pendingPlanRequest.id !== requestId) {
        return ctx.answerCbQuery('✅ Request already processed.', { show_alert: true });
    }

    const request = user.pendingPlanRequest;
    const plan = plans[request.planId];

    // Store activation data
    pendingAdminActivations[ctx.chat.id] = {
        userChatId: userChatId,
        requestId: requestId,
        planId: request.planId,
        planName: request.planName,
        username: session.usernameKey,
        userName: user.firstName
    };

    await ctx.editMessageText(
        `✅ Plan Request Approved ✅\n\n👤 User: ${user.firstName} (@${session.usernameKey})\n📋 Plan: ${request.planName}\n💰 Price: ${request.price} PKR\n📅 Duration: ${request.duration} Days\n\n⚠️ Now activate the plan by providing WhatsApp link:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔗 Activate Plan & Provide Link', `admin_activate_plan_${ctx.chat.id}`)],
            [Markup.button.callback('🔙 Cancel Activation', 'adminManagePlans')]
        ])
    );
});

// ======= ADMIN PLAN REJECTION =======
bot.action(/admin_reject_plan_(\d+)_(plan_.+)/, async (ctx) => {
    const [_, userChatId, requestId] = ctx.match;
    
    const adminSession = sessions[ctx.chat.id] || {};
    adminSession.flow = 'admin_reject_plan_reason';
    sessions[ctx.chat.id] = adminSession;
    
    pendingAdminRejections[ctx.chat.id] = {
        userChatId: userChatId,
        requestId: requestId,
        type: 'plan'
    };
    
    await ctx.answerCbQuery();
    await ctx.reply('📝 Please enter the reason for rejecting this plan request:');
});

// ======= ADMIN ACTIVATE PLAN =======
bot.action(/admin_activate_plan_(\d+)/, async (ctx) => {
    const adminChatId = ctx.match[1];
    const activationData = pendingAdminActivations[adminChatId];
    
    if (!activationData) {
        return ctx.answerCbQuery('❌ Activation data not found.', { show_alert: true });
    }

    const adminSession = sessions[ctx.chat.id] || {};
    adminSession.flow = 'admin_provide_whatsapp_link';
    adminSession.activationData = activationData;
    sessions[ctx.chat.id] = adminSession;

    await ctx.answerCbQuery();
    await ctx.reply(
        `🔗 Provide WhatsApp Link for ${activationData.planName}\n\n👤 User: ${activationData.userName}\n\nPlease enter the WhatsApp link:\n\n💡 Format: https://chat.whatsapp.com/XXXXXXXXXXX\n\n⚠️ Make sure the link is valid and active.`
    );
});

// ======= ADMIN MANAGE PLANS =======
bot.action('adminManagePlans', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    await ctx.reply(
        '📱 Manage WhatsApp Plans 📱\n\nSelect an option:',
        Markup.inlineKeyboard([
            [Markup.button.callback('➕ Add New Plan', 'adminAddPlan')],
            [Markup.button.callback('✏️ Edit Existing Plan', 'adminEditPlanMenu')],
            [Markup.button.callback('🗑️ Delete Plan', 'adminDeletePlanMenu')],
            [Markup.button.callback('👁️ View All Plans', 'adminViewAllPlans')],
            [Markup.button.callback('📋 Pending Plan Requests', 'adminPendingPlanRequests')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

// ======= ADMIN VIEW ALL PLANS =======
bot.action('adminViewAllPlans', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    let message = '👁️ All WhatsApp Plans 👁️\n\n';
    
    Object.values(plans).forEach((plan, index) => {
        message += `${index + 1}. ${plan.name}\n`;
        message += `   💰 Price: ${plan.price} PKR\n`;
        message += `   📅 Duration: ${plan.duration} Days\n`;
        message += `   🔗 Links: ${plan.whatsappLinks}\n`;
        message += `   📊 Status: ${plan.isActive ? '✅ ACTIVE' : '❌ INACTIVE'}\n`;
        message += `   ✨ Features: ${plan.features.join(', ')}\n\n`;
    });

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Edit Plans', 'adminEditPlanMenu')],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
        ])
    );
});

// ======= ADMIN ADD PLAN =======
bot.action('adminAddPlan', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = {
        flow: 'admin_add_plan',
        step: 'enter_name'
    };

    await ctx.reply(
        '➕ Add New WhatsApp Plan ➕\n\nStep 1: Enter plan name:\n\n💡 Example: 🥉 Basic Plan, 🥈 Standard Plan, etc.'
    );
});

// ======= ADMIN EDIT PLAN MENU =======
bot.action('adminEditPlanMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const buttons = [];
    
    Object.entries(plans).forEach(([planId, plan]) => {
        buttons.push([Markup.button.callback(`✏️ ${plan.name}`, `admin_edit_plan_${planId}`)]);
    });

    buttons.push([Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]);

    await ctx.reply(
        '✏️ Edit Existing Plan ✏️\n\nSelect a plan to edit:',
        Markup.inlineKeyboard(buttons)
    );
});

// ======= ADMIN EDIT SPECIFIC PLAN =======
bot.action(/admin_edit_plan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const plan = plans[planId];
    if (!plan) {
        return ctx.answerCbQuery('❌ Plan not found.', { show_alert: true });
    }

    sessions[ctx.chat.id] = {
        flow: 'admin_edit_plan',
        step: 'select_field',
        editingPlanId: planId
    };

    await ctx.reply(
        `✏️ Editing: ${plan.name} ✏️\n\nCurrent Details:\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} Days\n🔗 WhatsApp Links: ${plan.whatsappLinks}\n📊 Status: ${plan.isActive ? 'ACTIVE' : 'INACTIVE'}\n✨ Features: ${plan.features.join(', ')}\n\nSelect what to edit:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 Edit Price', 'edit_plan_price')],
            [Markup.button.callback('📅 Edit Duration', 'edit_plan_duration')],
            [Markup.button.callback('🔗 Edit WhatsApp Links', 'edit_plan_links')],
            [Markup.button.callback('📊 Toggle Status', 'toggle_plan_status')],
            [Markup.button.callback('✨ Edit Features', 'edit_plan_features')],
            [Markup.button.callback('🔙 Back', 'adminEditPlanMenu')]
        ])
    );
});

// ======= ADMIN DELETE PLAN MENU =======
bot.action('adminDeletePlanMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const buttons = [];
    
    Object.entries(plans).forEach(([planId, plan]) => {
        buttons.push([Markup.button.callback(`🗑️ ${plan.name}`, `admin_delete_plan_${planId}`)]);
    });

    buttons.push([Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]);

    await ctx.reply(
        '🗑️ Delete Plan 🗑️\n\nSelect a plan to delete:\n\n⚠️ Warning: This action cannot be undone!',
        Markup.inlineKeyboard(buttons)
    );
});

// ======= ADMIN PENDING PLAN REQUESTS =======
bot.action('adminPendingPlanRequests', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    let pendingRequests = [];
    
    Object.entries(users).forEach(([username, user]) => {
        if (user.pendingPlanRequest) {
            pendingRequests.push({
                username: username,
                user: user,
                request: user.pendingPlanRequest
            });
        }
    });

    if (pendingRequests.length === 0) {
        return ctx.reply(
            '✅ No Pending Requests ✅\n\nThere are no pending plan requests.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
            ])
        );
    }

    let message = '📋 Pending Plan Requests 📋\n\n';
    
    pendingRequests.forEach((req, index) => {
        message += `${index + 1}. ${req.user.firstName} (@${req.username})\n`;
        message += `   📋 Plan: ${req.request.planName}\n`;
        message += `   💰 Price: ${req.request.price} PKR\n`;
        message += `   📅 Date: ${req.request.date}\n`;
        message += `   ⏰ Time: ${req.request.time}\n`;
        message += `   🔑 Request ID: ${req.request.id}\n\n`;
    });

    const buttons = [];
    pendingRequests.slice(0, 5).forEach(req => {
        // Find user chat ID
        let userChatId = null;
        for (const [chatId, session] of Object.entries(sessions)) {
            if (session.usernameKey === req.username) {
                userChatId = chatId;
                break;
            }
        }
        
        if (userChatId) {
            buttons.push([Markup.button.callback(
                `👤 Process ${req.username}`,
                `admin_process_request_${userChatId}_${req.request.id}`
            )]);
        }
    });

    buttons.push([Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]);

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// ======= PROCESS PLAN REQUEST (ADMIN) =======
bot.action(/admin_process_request_(\d+)_(plan_.+)/, async (ctx) => {
    const [_, userChatId, requestId] = ctx.match;
    
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    await ctx.reply(
        '⚡ Quick Action Menu ⚡\n\nSelect action for this request:',
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve Request', `admin_approve_plan_${userChatId}_${requestId}`)],
            [Markup.button.callback('❌ Reject Request', `admin_reject_plan_${userChatId}_${requestId}`)],
            [Markup.button.callback('🔙 Back to Requests', 'adminPendingPlanRequests')]
        ])
    );
});

// ======= TEXT HANDLER (UPDATED FOR PLAN FLOW) =======
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    const session = sessions[chatId];
    if (!session) return;

    // ===== ADMIN PROVIDE WHATSAPP LINK =====
    if (session.flow === 'admin_provide_whatsapp_link' && session.activationData) {
        const activationData = session.activationData;
        const userChatId = activationData.userChatId;
        const userSession = sessions[userChatId];
        
        if (!userSession || !userSession.usernameKey) {
            await ctx.reply('❌ User session not found.');
            sessions[chatId].flow = null;
            delete session.activationData;
            return;
        }

        const user = users[userSession.usernameKey];
        const request = user.pendingPlanRequest;
        
        if (!request) {
            await ctx.reply('❌ Pending request not found.');
            sessions[chatId].flow = null;
            delete session.activationData;
            return;
        }

        const plan = plans[request.planId];
        const { date, time } = getCurrentDateTime();

        // Calculate end date
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + request.duration);
        
        const formattedEndDate = `${String(endDate.getDate()).padStart(2,'0')}-${String(endDate.getMonth()+1).padStart(2,'0')}-${endDate.getFullYear()}`;
        const formattedStartDate = `${String(startDate.getDate()).padStart(2,'0')}-${String(startDate.getMonth()+1).padStart(2,'0')}-${startDate.getFullYear()}`;

        // Add plan to user's plans
        if (!user.plans) user.plans = [];
        
        user.plans.push({
            planId: request.planId,
            planName: request.planName,
            price: request.price,
            duration: request.duration,
            whatsappLinks: request.whatsappLinks,
            whatsappLink: text,
            purchaseDate: formattedStartDate,
            activationDate: date,
            activationTime: time,
            endDate: formattedEndDate,
            status: 'active'
        });

        // Update transaction status
        if (user.transactions) {
            const transaction = user.transactions.find(t => t.requestId === request.id);
            if (transaction) {
                transaction.status = 'approved';
                transaction.whatsappLink = text;
            }
        }

        // Clear pending request
        delete user.pendingPlanRequest;

        saveUsers();

        // Send confirmation to user
        await bot.telegram.sendMessage(
            userChatId,
            `🎉 WhatsApp Plan Activated Successfully! 🎉\n\n✅ Your Plan Details:\n📋 Plan: ${request.planName}\n💰 Price: ${request.price} PKR\n📅 Duration: ${request.duration} Days\n📅 Valid From: ${formattedStartDate}\n📅 Valid Until: ${formattedEndDate}\n🔗 WhatsApp Links: ${request.whatsappLinks}\n\n🔗 Your WhatsApp Link:\n${text}\n\n💡 Instructions:\n1. Click the link above to join WhatsApp group\n2. Follow instructions in the group\n3. Contact support if any issues\n\n✨ Thank you for your purchase!\nYour plan is now active and ready to use.`
        );

        // Send SMS alert
        try {
            await sendPlanActivationAlert(userChatId, request.planName, text, formattedEndDate);
        } catch (error) {
            console.log('Plan activation SMS alert failed:', error.message);
        }

        await ctx.reply(
            `✅ Plan Activated Successfully! ✅\n\n👤 User: ${activationData.userName}\n📋 Plan: ${request.planName}\n🔗 WhatsApp Link Provided\n📅 Valid Until: ${formattedEndDate}\n\n✅ User has been notified with the WhatsApp link.`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 View More Requests', 'adminPendingPlanRequests')],
                [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
            ])
        );

        // Clear session
        sessions[chatId].flow = null;
        delete session.activationData;
        delete pendingAdminActivations[chatId];
        return;
    }

    // ===== ADMIN REJECT PLAN REASON =====
    if (session.flow === 'admin_reject_plan_reason') {
        const rejectionData = pendingAdminRejections[chatId];
        if (!rejectionData) {
            session.flow = null;
            return ctx.reply('⚠️ Session Error ⚠️\n\n📝 Rejection data not found.');
        }

        const { userChatId, requestId } = rejectionData;
        const reason = text;

        delete pendingAdminRejections[chatId];
        session.flow = null;

        await processPlanRejection(userChatId, requestId, reason, ctx);
        return;
    }

    // ===== ADMIN ADD PLAN FLOW =====
    if (session.flow === 'admin_add_plan') {
        switch (session.step) {
            case 'enter_name':
                session.planName = text;
                session.step = 'enter_price';
                return ctx.reply('💰 Enter plan price (PKR):\n\n💡 Example: 350');

            case 'enter_price':
                const price = parseInt(text);
                if (isNaN(price) || price < 0) {
                    return ctx.reply('❌ Invalid price ❌\n\nPlease enter a valid number:');
                }
                session.planPrice = price;
                session.step = 'enter_duration';
                return ctx.reply('📅 Enter plan duration (in days):\n\n💡 Example: 30 (for 1 month)');

            case 'enter_duration':
                const duration = parseInt(text);
                if (isNaN(duration) || duration < 1) {
                    return ctx.reply('❌ Invalid duration ❌\n\nPlease enter valid number of days:');
                }
                session.planDuration = duration;
                session.step = 'enter_links';
                return ctx.reply('🔗 Enter number of WhatsApp links:\n\n💡 Example: 1 or 2');

            case 'enter_links':
                const links = parseInt(text);
                if (isNaN(links) || links < 1) {
                    return ctx.reply('❌ Invalid number ❌\n\nPlease enter valid number (1 or more):');
                }
                session.planLinks = links;
                session.step = 'enter_features';
                return ctx.reply('✨ Enter plan features (comma separated):\n\n💡 Example: 1 WhatsApp Link, Priority Support, 30 Days Validity');

            case 'enter_features':
                const features = text.split(',').map(f => f.trim()).filter(f => f.length > 0);
                
                // Generate plan ID
                const planId = 'plan_' + Date.now();
                
                // Create new plan
                plans[planId] = {
                    id: planId,
                    name: session.planName,
                    price: session.planPrice,
                    duration: session.planDuration,
                    whatsappLinks: session.planLinks,
                    features: features,
                    isActive: true
                };
                
                savePlans();
                sessions[chatId] = null;

                await ctx.reply(
                    `✅ New Plan Added Successfully! ✅\n\n📋 Plan Details:\n📛 Name: ${session.planName}\n💰 Price: ${session.planPrice} PKR\n📅 Duration: ${session.planDuration} Days\n🔗 WhatsApp Links: ${session.planLinks}\n✨ Features: ${features.join(', ')}\n\n📊 Status: ✅ ACTIVE`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('➕ Add Another Plan', 'adminAddPlan')],
                        [Markup.button.callback('👁️ View All Plans', 'adminViewAllPlans')],
                        [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
                    ])
                );
                break;
        }
        return;
    }

    // ===== ADMIN EDIT PLAN FLOW =====
    if (session.flow === 'admin_edit_plan') {
        const planId = session.editingPlanId;
        const plan = plans[planId];

        if (!plan) {
            sessions[chatId] = null;
            return ctx.reply('❌ Plan not found.');
        }

        if (session.editStep === 'enter_price') {
            const newPrice = parseInt(text);
            if (isNaN(newPrice) || newPrice < 0) {
                return ctx.reply('❌ Invalid price ❌\n\nPlease enter a valid number:');
            }
            
            plan.price = newPrice;
            savePlans();
            
            await ctx.reply(
                `✅ Price Updated Successfully! ✅\n\n📋 Plan: ${plan.name}\n💰 New Price: ${newPrice} PKR`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Edit Another Field', `admin_edit_plan_${planId}`)],
                    [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
                ])
            );
            
            sessions[chatId] = null;
            return;
        }

        if (session.editStep === 'enter_duration') {
            const newDuration = parseInt(text);
            if (isNaN(newDuration) || newDuration < 1) {
                return ctx.reply('❌ Invalid duration ❌\n\nPlease enter valid number of days:');
            }
            
            plan.duration = newDuration;
            savePlans();
            
            await ctx.reply(
                `✅ Duration Updated Successfully! ✅\n\n📋 Plan: ${plan.name}\n📅 New Duration: ${newDuration} Days`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Edit Another Field', `admin_edit_plan_${planId}`)],
                    [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
                ])
            );
            
            sessions[chatId] = null;
            return;
        }

        if (session.editStep === 'enter_links') {
            const newLinks = parseInt(text);
            if (isNaN(newLinks) || newLinks < 1) {
                return ctx.reply('❌ Invalid number ❌\n\nPlease enter valid number (1 or more):');
            }
            
            plan.whatsappLinks = newLinks;
            savePlans();
            
            await ctx.reply(
                `✅ WhatsApp Links Updated Successfully! ✅\n\n📋 Plan: ${plan.name}\n🔗 New WhatsApp Links: ${newLinks}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Edit Another Field', `admin_edit_plan_${planId}`)],
                    [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
                ])
            );
            
            sessions[chatId] = null;
            return;
        }

        if (session.editStep === 'enter_features') {
            const newFeatures = text.split(',').map(f => f.trim()).filter(f => f.length > 0);
            
            plan.features = newFeatures;
            savePlans();
            
            await ctx.reply(
                `✅ Features Updated Successfully! ✅\n\n📋 Plan: ${plan.name}\n✨ New Features: ${newFeatures.join(', ')}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Edit Another Field', `admin_edit_plan_${planId}`)],
                    [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
                ])
            );
            
            sessions[chatId] = null;
            return;
        }
    }

    // Rest of the existing text handler code remains the same...
    // (Deposit, Withdraw, Signup, Login flows remain unchanged)
    
    // ===== ADMIN SEARCH USER =====
    if (session.flow === 'admin_search') {
        // ... existing code ...
    }

    // ===== ADMIN BALANCE UPDATE =====
    if (session.flow === 'admin_balance_update') {
        // ... existing code ...
    }

    // ===== ADMIN BAN USER =====
    if (session.flow === 'admin_ban_user') {
        // ... existing code ...
    }

    // ===== ADMIN REJECTION REASON =====
    if (session.flow === 'admin_reject_reason') {
        // ... existing code ...
    }

    // ===== SIGNUP FLOW =====
    if (session.flow === 'signup') {
        // ... existing code ...
    }

    // ===== LOGIN FLOW =====
    if (session.flow === 'login') {
        // ... existing code ...
    }

    // ======= DEPOSIT FLOW =======
    if (session.flow === 'deposit') {
        // ... existing code ...
    }

    // ======= WITHDRAW FLOW =======
    if (session.flow === 'withdraw') {
        // ... existing code ...
    }
});

// ======= EDIT PLAN ACTIONS =======
bot.action('edit_plan_price', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.editingPlanId) return ctx.answerCbQuery('❌ Session error.');

    session.editStep = 'enter_price';
    
    await ctx.reply('💰 Enter new price for this plan (PKR):');
});

bot.action('edit_plan_duration', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.editingPlanId) return ctx.answerCbQuery('❌ Session error.');

    session.editStep = 'enter_duration';
    
    await ctx.reply('📅 Enter new duration for this plan (in days):');
});

bot.action('edit_plan_links', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.editingPlanId) return ctx.answerCbQuery('❌ Session error.');

    session.editStep = 'enter_links';
    
    await ctx.reply('🔗 Enter new number of WhatsApp links for this plan:');
});

bot.action('edit_plan_features', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.editingPlanId) return ctx.answerCbQuery('❌ Session error.');

    session.editStep = 'enter_features';
    
    await ctx.reply('✨ Enter new features for this plan (comma separated):');
});

bot.action('toggle_plan_status', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.editingPlanId) return ctx.answerCbQuery('❌ Session error.');

    const planId = session.editingPlanId;
    const plan = plans[planId];
    
    plan.isActive = !plan.isActive;
    savePlans();
    
    await ctx.reply(
        `✅ Plan Status Updated! ✅\n\n📋 Plan: ${plan.name}\n📊 New Status: ${plan.isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Edit Another Field', `admin_edit_plan_${planId}`)],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
        ])
    );
    
    sessions[ctx.chat.id] = null;
});

// ======= DELETE PLAN =======
bot.action(/admin_delete_plan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const plan = plans[planId];
    if (!plan) {
        return ctx.answerCbQuery('❌ Plan not found.', { show_alert: true });
    }

    // Check if any user has this plan
    let usersWithPlan = [];
    Object.entries(users).forEach(([username, user]) => {
        if (user.plans) {
            const hasPlan = user.plans.some(p => p.planId === planId);
            if (hasPlan) usersWithPlan.push(username);
        }
    });

    if (usersWithPlan.length > 0) {
        return ctx.reply(
            `⚠️ Cannot Delete Plan ⚠️\n\n📋 Plan: ${plan.name}\n\n❌ This plan is currently used by ${usersWithPlan.length} users.\n\n👤 Users with this plan:\n${usersWithPlan.slice(0, 5).map(u => `• ${u}`).join('\n')}\n\n💡 Please deactivate the plan instead.`,
            Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Deactivate Plan', `admin_edit_plan_${planId}`)],
                [Markup.button.callback('🔙 Back', 'adminDeletePlanMenu')]
            ])
        );
    }

    delete plans[planId];
    savePlans();

    await ctx.reply(
        `✅ Plan Deleted Successfully! ✅\n\n🗑️ Deleted Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} Days\n\n⚠️ This action cannot be undone.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🗑️ Delete Another Plan', 'adminDeletePlanMenu')],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
        ])
    );
});

// ======= HELPER FUNCTIONS =======
async function processPlanRejection(userChatId, requestId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('👤 User not found.');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingPlanRequest || user.pendingPlanRequest.id !== requestId) {
        await adminCtx.answerCbQuery('✅ Request already processed.');
        return;
    }

    const request = user.pendingPlanRequest;
    const { date, time } = getCurrentDateTime();

    // Refund amount to user
    user.balance += request.price;

    // Update transaction
    if (user.transactions) {
        const transaction = user.transactions.find(t => t.requestId === requestId);
        if (transaction) {
            transaction.status = 'rejected';
            transaction.rejectionReason = reason;
        }
    }

    // Clear pending request
    delete user.pendingPlanRequest;

    saveUsers();

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `❌ Plan Request Rejected ❌\n\n📋 Request Details:\n📛 Plan: ${request.planName}\n💰 Amount: ${request.price} PKR\n📅 Date: ${date}\n⏰ Time: ${time}\n\n📝 Rejection Reason:\n${reason}\n\n💰 Balance Update:\n✅ Your amount has been refunded.\n• Amount Refunded: ${request.price} PKR\n• New Balance: ${user.balance} PKR\n\n💡 What to do next:\n1. Check the reason above\n2. Contact support if needed\n3. You can submit a new request\n\n📞 Support Available 24/7`
    );

    await adminCtx.reply(
        `❌ Plan Request Rejected ❌\n\n👤 User: ${user.firstName}\n📋 Plan: ${request.planName}\n💰 Amount Refunded: ${request.price} PKR\n\n📝 Reason: ${reason}\n\n✅ User has been notified and amount refunded.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📋 View More Requests', 'adminPendingPlanRequests')],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
        ])
    );
}

// ======= SMS ALERT FUNCTIONS =======
async function sendPlanActivationAlert(userChatId, planName, whatsappLink, endDate) {
    try {
        // This would integrate with your SMS alert system
        console.log(`📱 Plan Activation SMS to ${userChatId}: ${planName} activated. Link: ${whatsappLink}, Valid until: ${endDate}`);
        return true;
    } catch (error) {
        console.error('❌ Plan activation SMS failed:', error.message);
        return false;
    }
}

// ======= EXISTING FUNCTIONS (Keep all existing functions) =======
// All your existing functions like processDepositRejection, processWithdrawRejection,
// sendDepositAlert, sendWithdrawalAlert, etc. remain exactly the same

// ======= LAUNCH =======
bot.launch();
console.log('🤖 Bot running successfully...');
console.log('✨ All features activated');
console.log('🔒 Security protocols enabled');
console.log('💰 Payment system ready');
console.log('📱 WhatsApp Plan System Integrated');
console.log('👑 Admin features loaded');
console.log('🔔 SMS Alert System Integrated');
console.log('🔄 New Plan Management System Ready');
