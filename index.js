const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ===== BOT =====
const bot = new Telegraf('8226474686:AAEmXiWRGoeaa5pZpF2MZlYViYmSkM70fbI');
const ADMIN_ID = 6012422087;

// ===== DATABASE =====
const DATA_FILE = './users.json';
let users = {};

const PLANS_FILE = './plans.json';
let plans = {
    plan1: { id: 'plan1', name: 'Basic Plan', price: 350, duration: 15, features: ['1 WhatsApp Link'], whatsappCount: 1 },
    plan2: { id: 'plan2', name: 'Standard Plan', price: 500, duration: 30, features: ['1 WhatsApp Link'], whatsappCount: 1 },
    plan3: { id: 'plan3', name: 'Premium Plan', price: 1200, duration: 90, features: ['1 WhatsApp Link'], whatsappCount: 1 },
    plan4: { id: 'plan4', name: 'Business Plan', price: 2000, duration: 90, features: ['2 WhatsApp Links'], whatsappCount: 2 }
};

if (fs.existsSync(DATA_FILE)) {
    users = JSON.parse(fs.readFileSync(DATA_FILE));
}

if (fs.existsSync(PLANS_FILE)) {
    plans = JSON.parse(fs.readFileSync(PLANS_FILE));
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

function generatePlanRequestId() {
    return 'plan_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// ======= START (EXISTING CODE - NO CHANGES) =======
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

// ======= NEW PLAN SYSTEM - Buy Bot Flow =======
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

    // Check if user already has a pending plan request
    if (user.pendingPlanRequests && user.pendingPlanRequests.length > 0) {
        return ctx.reply(
            '⚠️ Pending Plan Request Exists ⚠️\n\n📝 You already have a pending plan request.\n\n💡 Please wait for your current request to be processed.\n\n⏰ Processing Time:\n• Usually within 1-2 hours\n• You will be notified once processed',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 View Pending Requests', 'viewPendingRequests')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    return ctx.reply(
        '🤖 WhatsApp Bot Plans 🤖\n\n✨ Choose an option to proceed:\n\n📊 Your Current Plan: ' + (user.activePlan ? user.activePlan.name : 'No Active Plan') + '\n💰 Your Balance: ' + (user.balance || 0) + ' PKR',
        Markup.inlineKeyboard([
            [Markup.button.callback('📱 Active Plan', 'activePlanMenu')],
            [Markup.button.callback('🆙 Upgrade Plan', 'upgradePlanMenu')],
            [Markup.button.callback('👁️ View Plan', 'viewPlan')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

// ======= ACTIVE PLAN MENU =======
bot.action('activePlanMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    // Check if user is banned
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 Account suspended by admin.', { show_alert: true });
    }

    let message = '📱 Active Plan Menu 📱\n\n✨ Choose a plan to activate:\n\n';

    // Display all available plans
    Object.values(plans).forEach((plan, index) => {
        message += `${index + 1}. ${plan.name}\n`;
        message += `   💰 Price: ${plan.price} PKR\n`;
        message += `   📅 Duration: ${plan.duration} days\n`;
        message += `   🎯 Features: ${plan.features.join(', ')}\n\n`;
    });

    message += '💡 Select a plan to purchase:';

    const buttons = [];
    Object.keys(plans).forEach((planId, index) => {
        const plan = plans[planId];
        buttons.push([Markup.button.callback(`${index + 1}. ${plan.name} - ${plan.price} PKR`, `selectPlan_${planId}`)]);
    });

    buttons.push([Markup.button.callback('🔙 Back to Plans Menu', 'buyBot')]);

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// ======= SELECT PLAN =======
bot.action(/selectPlan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Please login first.');

    const user = users[session.usernameKey];
    const plan = plans[planId];
    
    if (!plan) return ctx.answerCbQuery('❌ Plan not found.', { show_alert: true });

    // Store selected plan in session
    session.selectedPlanId = planId;
    session.planFlow = 'active';

    // Check balance
    if ((user.balance || 0) < plan.price) {
        const needed = plan.price - (user.balance || 0);
        return ctx.reply(
            `❌ Insufficient Balance ❌\n\n🤖 Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n💳 Your Balance: ${user.balance || 0} PKR\n\n📥 You need ${needed} PKR more to purchase this plan.\n\n💡 Please deposit funds first:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('🔙 Back to Plans', 'activePlanMenu')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    // Show confirmation
    return ctx.reply(
        `✅ Plan Selected ✅\n\n📋 Plan Details:\n🤖 Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} days\n🎯 Features: ${plan.features.join(', ')}\n\n💳 Your Balance: ${user.balance || 0} PKR\n💵 After Purchase: ${(user.balance || 0) - plan.price} PKR\n\n📝 Do you want to proceed with purchase?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirm Purchase', `confirmPlanPurchase_${planId}`)],
            [Markup.button.callback('🔙 Cancel', 'activePlanMenu')]
        ])
    );
});

// ======= CONFIRM PLAN PURCHASE =======
bot.action(/confirmPlanPurchase_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

    const user = users[session.usernameKey];
    const plan = plans[planId];
    
    if (!plan) return ctx.answerCbQuery('❌ Plan not found.', { show_alert: true });

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('Could not update message:', e.message);
    }

    const { date, time } = getCurrentDateTime();
    const requestId = generatePlanRequestId();

    // Deduct balance temporarily
    user.balance -= plan.price;
    
    // Create pending plan request
    if (!user.pendingPlanRequests) user.pendingPlanRequests = [];
    user.pendingPlanRequests.push({
        id: requestId,
        planId: planId,
        planName: plan.name,
        price: plan.price,
        duration: plan.duration,
        features: plan.features,
        type: session.planFlow === 'upgrade' ? 'upgrade' : 'new',
        date: date,
        time: time,
        status: 'pending'
    });

    saveUsers();

    // Send to admin
    const adminMsg = `
🤖 NEW PLAN REQUEST 🤖

👤 User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}

📋 Plan Details:
• Plan: ${plan.name}
• Type: ${session.planFlow === 'upgrade' ? 'Upgrade' : 'New'}
• Price: ${plan.price} PKR
• Duration: ${plan.duration} days
• Features: ${plan.features.join(', ')}

💰 Payment Status:
• Amount Deducted: ${plan.price} PKR
• User Balance: ${user.balance} PKR

📅 Request Details:
• Date: ${date}
• Time: ${time}
• Request ID: ${requestId}
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve Plan', `admin_approve_plan_${chatId}_${requestId}`)],
            [Markup.button.callback('❌ Reject Request', `admin_reject_plan_${chatId}_${requestId}`)]
        ])
    );

    await ctx.reply(
        `⏳ Plan Request Submitted Successfully! ⏳\n\n✅ Request Details:\n🤖 Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} days\n🎯 Features: ${plan.features.join(', ')}\n\n📊 Status: Pending Admin Approval 🔄\n\n🔑 Request ID: ${requestId}\n\n⏰ Processing Time:\n• Usually within 1-2 hours\n• You will be notified upon approval\n\n💰 Temporary Balance Hold:\n• Amount Held: ${plan.price} PKR ⏳\n• Will be refunded if rejected\n\n📞 Support Available 24/7`
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
    
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 Account suspended by admin.', { show_alert: true });
    }

    // Check if user has active plan
    if (!user.activePlan) {
        return ctx.reply(
            '❌ No Active Plan Found ❌\n\n📝 You don\'t have an active plan to upgrade.\n\n💡 Please purchase a plan first:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📱 Purchase New Plan', 'activePlanMenu')],
                [Markup.button.callback('🔙 Back to Plans Menu', 'buyBot')]
            ])
        );
    }

    // Show only plans that are better than current plan (by price)
    const currentPlanPrice = user.activePlan.price;
    let message = '🆙 Upgrade Plan Menu 🆙\n\n✨ Available Upgrade Plans:\n\n';
    
    const upgradePlans = Object.values(plans).filter(plan => plan.price > currentPlanPrice);
    
    if (upgradePlans.length === 0) {
        return ctx.reply(
            '✨ You have the Highest Plan ✨\n\n🎉 Congratulations! You already have the highest available plan.\n\n💡 No upgrades available at the moment.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Plans Menu', 'buyBot')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    upgradePlans.forEach((plan, index) => {
        message += `${index + 1}. ${plan.name}\n`;
        message += `   💰 Price: ${plan.price} PKR\n`;
        message += `   📅 Duration: ${plan.duration} days\n`;
        message += `   🎯 Features: ${plan.features.join(', ')}\n\n`;
    });

    message += '💡 Select a plan to upgrade:';

    const buttons = [];
    upgradePlans.forEach((plan, index) => {
        const planId = Object.keys(plans).find(key => plans[key] === plan);
        buttons.push([Markup.button.callback(`${index + 1}. ${plan.name} - ${plan.price} PKR`, `selectUpgradePlan_${planId}`)]);
    });

    buttons.push([Markup.button.callback('🔙 Back to Plans Menu', 'buyBot')]);

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// ======= SELECT UPGRADE PLAN =======
bot.action(/selectUpgradePlan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Please login first.');

    const user = users[session.usernameKey];
    const plan = plans[planId];
    
    if (!plan) return ctx.answerCbQuery('❌ Plan not found.', { show_alert: true });

    // Store selected plan in session for upgrade
    session.selectedPlanId = planId;
    session.planFlow = 'upgrade';

    // Check balance
    if ((user.balance || 0) < plan.price) {
        const needed = plan.price - (user.balance || 0);
        return ctx.reply(
            `❌ Insufficient Balance ❌\n\n🤖 Upgrade to: ${plan.name}\n💰 Price: ${plan.price} PKR\n💳 Your Balance: ${user.balance || 0} PKR\n\n📥 You need ${needed} PKR more to upgrade.\n\n💡 Please deposit funds first:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('🔙 Back to Upgrade Plans', 'upgradePlanMenu')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    // Calculate remaining days from current plan
    let remainingDays = 0;
    if (user.activePlan && user.activePlan.expiryDate) {
        const expiryDate = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
        const today = new Date();
        const timeDiff = expiryDate - today;
        remainingDays = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
    }

    // Show confirmation with remaining days
    return ctx.reply(
        `✅ Upgrade Plan Selected ✅\n\n📋 Upgrade Details:\n🤖 Current Plan: ${user.activePlan.name}\n🆙 Upgrade to: ${plan.name}\n💰 Price: ${plan.price} PKR\n📅 New Duration: ${plan.duration} days\n📅 Remaining Days (Current): ${remainingDays} days\n🎯 Features: ${plan.features.join(', ')}\n\n💳 Your Balance: ${user.balance || 0} PKR\n💵 After Purchase: ${(user.balance || 0) - plan.price} PKR\n\n📝 Do you want to proceed with upgrade?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirm Upgrade', `confirmPlanPurchase_${planId}`)],
            [Markup.button.callback('🔙 Cancel', 'upgradePlanMenu')]
        ])
    );
});

// ======= VIEW PLAN =======
bot.action('viewPlan', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

    const user = users[session.usernameKey];
    
    if (!user.activePlan) {
        return ctx.reply(
            '📊 Your Plan Status 📊\n\n📭 No Active Plan Found\n\n💡 You don\'t have an active WhatsApp Bot plan.\n\n🚀 Get started with:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📱 Purchase New Plan', 'activePlanMenu')],
                [Markup.button.callback('🔙 Back to Plans Menu', 'buyBot')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    // Calculate expiry date
    let expiryInfo = '';
    if (user.activePlan.expiryDate) {
        const expiryDate = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
        const today = new Date();
        const timeDiff = expiryDate - today;
        const remainingDays = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
        
        expiryInfo = `\n📅 Expiry Date: ${user.activePlan.expiryDate}\n⏳ Days Remaining: ${remainingDays} days`;
    }

    let message = `📊 Your Current Plan 📊\n\n`;
    message += `🤖 Plan: ${user.activePlan.name}\n`;
    message += `💰 Price Paid: ${user.activePlan.price} PKR\n`;
    message += `📅 Original Duration: ${user.activePlan.duration} days\n`;
    message += expiryInfo;
    message += `\n🎯 Features:\n`;
    user.activePlan.features.forEach((feature, index) => {
        message += `  ${index + 1}. ${feature}\n`;
    });

    if (user.activePlan.whatsappLink) {
        message += `\n🔗 Your WhatsApp Link:\n${user.activePlan.whatsappLink}\n`;
    }

    message += `\n📝 Status: ${user.activePlan.status || 'Active'}`;

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🆙 Upgrade Plan', 'upgradePlanMenu')],
            [Markup.button.callback('🔙 Back to Plans Menu', 'buyBot')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

// ======= ADMIN PLAN MANAGEMENT =======
bot.action('adminPlanManagement', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    let message = '🤖 Plan Management 🤖\n\n📊 Available Plans:\n\n';
    
    Object.values(plans).forEach((plan, index) => {
        message += `${index + 1}. ${plan.name}\n`;
        message += `   💰 Price: ${plan.price} PKR\n`;
        message += `   📅 Duration: ${plan.duration} days\n`;
        message += `   🎯 Features: ${plan.features.join(', ')}\n\n`;
    });

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('➕ Add New Plan', 'adminAddPlan')],
            [Markup.button.callback('✏️ Edit Existing Plan', 'adminEditPlanMenu')],
            [Markup.button.callback('📋 View Pending Requests', 'adminViewPlanRequests')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
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
        step: 'enter_plan_name' 
    };
    
    await ctx.reply(
        '➕ Add New Plan ➕\n\n📝 Enter plan name:\n\n💡 Example: Ultimate Plan'
    );
});

// ======= ADMIN EDIT PLAN MENU =======
bot.action('adminEditPlanMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const buttons = [];
    Object.keys(plans).forEach((planId, index) => {
        const plan = plans[planId];
        buttons.push([Markup.button.callback(`${index + 1}. ${plan.name}`, `admin_edit_plan_${planId}`)]);
    });

    buttons.push([Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]);

    await ctx.reply(
        '✏️ Edit Existing Plan ✏️\n\nSelect a plan to edit:',
        Markup.inlineKeyboard(buttons)
    );
});

// ======= ADMIN VIEW PLAN REQUESTS =======
bot.action('adminViewPlanRequests', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    // Collect all pending plan requests from all users
    let allPendingRequests = [];
    Object.entries(users).forEach(([username, user]) => {
        if (user.pendingPlanRequests && user.pendingPlanRequests.length > 0) {
            user.pendingPlanRequests.forEach(request => {
                allPendingRequests.push({
                    username: username,
                    user: user,
                    request: request
                });
            });
        }
    });

    if (allPendingRequests.length === 0) {
        return ctx.reply(
            '📋 Pending Plan Requests 📋\n\n✅ No pending plan requests found.\n\nAll requests have been processed.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')],
                [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
            ])
        );
    }

    let message = '📋 Pending Plan Requests 📋\n\n';
    
    allPendingRequests.forEach((item, index) => {
        const request = item.request;
        message += `${index + 1}. ${request.planName}\n`;
        message += `   👤 User: ${item.user.firstName} (@${item.username})\n`;
        message += `   💰 Price: ${request.price} PKR\n`;
        message += `   📅 Date: ${request.date} ${request.time}\n`;
        message += `   🔑 Request ID: ${request.id}\n\n`;
    });

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh List', 'adminViewPlanRequests')],
            [Markup.button.callback('🔙 Back to Plan Management', 'adminPlanManagement')]
        ])
    );
});

// ======= ADMIN APPROVE PLAN =======
bot.action(/admin_approve_plan_(\d+)_(plan_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, requestId] = ctx.match;
    
    const adminSession = sessions[ctx.chat.id] || {};
    adminSession.flow = 'admin_approve_plan_link';
    adminSession.pendingApproval = { userChatId, requestId };
    sessions[ctx.chat.id] = adminSession;
    
    await ctx.answerCbQuery();
    await ctx.reply(
        '✅ Plan Approved ✅\n\n📝 Please enter the WhatsApp link for this plan:\n\n💡 Format: https://wa.me/923001234567\n\nEnter link:'
    );
});

// ======= ADMIN REJECT PLAN =======
bot.action(/admin_reject_plan_(\d+)_(plan_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, requestId] = ctx.match;
    
    const adminSession = sessions[ctx.chat.id] || {};
    adminSession.flow = 'admin_reject_plan_reason';
    sessions[ctx.chat.id] = adminSession;
    
    pendingAdminRejections[ctx.chat.id] = {
        requestType: 'plan',
        userChatId: userChatId,
        requestId: requestId
    };
    
    await ctx.answerCbQuery();
    await ctx.reply('📝 Please enter the reason for rejecting this plan request:');
});

// ======= ADMIN EDIT PLAN =======
bot.action(/admin_edit_plan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const plan = plans[planId];
    if (!plan) return ctx.answerCbQuery('❌ Plan not found.', { show_alert: true });

    sessions[ctx.chat.id] = { 
        flow: 'admin_edit_plan', 
        step: 'select_field',
        planId: planId
    };
    
    await ctx.reply(
        `✏️ Edit Plan: ${plan.name} ✏️\n\nCurrent Details:\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} days\n🎯 Features: ${plan.features.join(', ')}\n\nSelect what you want to edit:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 Edit Price', `admin_edit_field_price_${planId}`)],
            [Markup.button.callback('📅 Edit Duration', `admin_edit_field_duration_${planId}`)],
            [Markup.button.callback('🎯 Edit Features', `admin_edit_field_features_${planId}`)],
            [Markup.button.callback('🔙 Back to Edit Menu', 'adminEditPlanMenu')]
        ])
    );
});

// ======= TEXT HANDLER FOR NEW PLAN SYSTEM =======
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    const session = sessions[chatId];
    if (!session) return;

    // ===== ADMIN ADD PLAN FLOW =====
    if (session.flow === 'admin_add_plan') {
        if (session.step === 'enter_plan_name') {
            if (text.length < 3 || text.length > 50) {
                return ctx.reply('❌ Invalid plan name ❌\n\n📝 Plan name must be 3-50 characters.\n\nEnter plan name:');
            }
            
            session.planName = text;
            session.step = 'enter_plan_price';
            return ctx.reply(
                `📝 Plan Name: ${text}\n\n💰 Enter plan price (PKR):\n\n💡 Example: 1000`
            );
        }
        
        if (session.step === 'enter_plan_price') {
            const price = parseInt(text);
            if (isNaN(price) || price < 100) {
                return ctx.reply('❌ Invalid price ❌\n\n📝 Price must be at least 100 PKR.\n\nEnter price:');
            }
            
            session.planPrice = price;
            session.step = 'enter_plan_duration';
            return ctx.reply(
                `💰 Price: ${price} PKR\n\n📅 Enter plan duration (in days):\n\n💡 Example: 30`
            );
        }
        
        if (session.step === 'enter_plan_duration') {
            const duration = parseInt(text);
            if (isNaN(duration) || duration < 1) {
                return ctx.reply('❌ Invalid duration ❌\n\n📝 Duration must be at least 1 day.\n\nEnter duration:');
            }
            
            session.planDuration = duration;
            session.step = 'enter_plan_features';
            return ctx.reply(
                `📅 Duration: ${duration} days\n\n🎯 Enter plan features (comma separated):\n\n💡 Example: 1 WhatsApp Link, 24/7 Support`
            );
        }
        
        if (session.step === 'enter_plan_features') {
            const features = text.split(',').map(f => f.trim()).filter(f => f.length > 0);
            if (features.length === 0) {
                return ctx.reply('❌ Invalid features ❌\n\n📝 Please enter at least one feature.\n\nEnter features:');
            }
            
            // Generate new plan ID
            const planId = 'plan_' + Date.now();
            const whatsappCount = text.toLowerCase().includes('2 whatsapp') ? 2 : 1;
            
            // Add new plan
            plans[planId] = {
                id: planId,
                name: session.planName,
                price: session.planPrice,
                duration: session.planDuration,
                features: features,
                whatsappCount: whatsappCount
            };
            
            savePlans();
            
            // Clear session
            sessions[chatId] = null;
            
            await ctx.reply(
                `✅ New Plan Added Successfully! ✅\n\n📋 Plan Details:\n🤖 Plan: ${session.planName}\n💰 Price: ${session.planPrice} PKR\n📅 Duration: ${session.planDuration} days\n🎯 Features: ${features.join(', ')}\n\n🔑 Plan ID: ${planId}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('➕ Add Another Plan', 'adminAddPlan')],
                    [Markup.button.callback('🤖 Plan Management', 'adminPlanManagement')],
                    [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
                ])
            );
        }
        return;
    }
    
    // ===== ADMIN EDIT PLAN FLOW =====
    if (session.flow === 'admin_edit_plan' && session.step === 'edit_price') {
        const price = parseInt(text);
        if (isNaN(price) || price < 100) {
            return ctx.reply('❌ Invalid price ❌\n\n📝 Price must be at least 100 PKR.\n\nEnter new price:');
        }
        
        const planId = session.planId;
        const oldPrice = plans[planId].price;
        plans[planId].price = price;
        savePlans();
        
        sessions[chatId] = null;
        
        await ctx.reply(
            `✅ Plan Price Updated Successfully! ✅\n\n🤖 Plan: ${plans[planId].name}\n💰 Old Price: ${oldPrice} PKR\n💰 New Price: ${price} PKR`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`✏️ Edit ${plans[planId].name}`, `admin_edit_plan_${planId}`)],
                [Markup.button.callback('✏️ Edit Another Plan', 'adminEditPlanMenu')],
                [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
            ])
        );
        return;
    }
    
    if (session.flow === 'admin_edit_plan' && session.step === 'edit_duration') {
        const duration = parseInt(text);
        if (isNaN(duration) || duration < 1) {
            return ctx.reply('❌ Invalid duration ❌\n\n📝 Duration must be at least 1 day.\n\nEnter new duration:');
        }
        
        const planId = session.planId;
        const oldDuration = plans[planId].duration;
        plans[planId].duration = duration;
        savePlans();
        
        sessions[chatId] = null;
        
        await ctx.reply(
            `✅ Plan Duration Updated Successfully! ✅\n\n🤖 Plan: ${plans[planId].name}\n📅 Old Duration: ${oldDuration} days\n📅 New Duration: ${duration} days`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`✏️ Edit ${plans[planId].name}`, `admin_edit_plan_${planId}`)],
                [Markup.button.callback('✏️ Edit Another Plan', 'adminEditPlanMenu')],
                [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
            ])
        );
        return;
    }
    
    if (session.flow === 'admin_edit_plan' && session.step === 'edit_features') {
        const features = text.split(',').map(f => f.trim()).filter(f => f.length > 0);
        if (features.length === 0) {
            return ctx.reply('❌ Invalid features ❌\n\n📝 Please enter at least one feature.\n\nEnter new features:');
        }
        
        const planId = session.planId;
        const oldFeatures = plans[planId].features;
        plans[planId].features = features;
        
        // Update whatsapp count based on features
        const whatsappCount = text.toLowerCase().includes('2 whatsapp') ? 2 : 1;
        plans[planId].whatsappCount = whatsappCount;
        
        savePlans();
        
        sessions[chatId] = null;
        
        await ctx.reply(
            `✅ Plan Features Updated Successfully! ✅\n\n🤖 Plan: ${plans[planId].name}\n🎯 Old Features: ${oldFeatures.join(', ')}\n🎯 New Features: ${features.join(', ')}`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`✏️ Edit ${plans[planId].name}`, `admin_edit_plan_${planId}`)],
                [Markup.button.callback('✏️ Edit Another Plan', 'adminEditPlanMenu')],
                [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
            ])
        );
        return;
    }
    
    // ===== ADMIN APPROVE PLAN LINK =====
    if (session.flow === 'admin_approve_plan_link' && session.pendingApproval) {
        const { userChatId, requestId } = session.pendingApproval;
        const whatsappLink = text.trim();
        
        // Validate WhatsApp link format
        if (!whatsappLink.includes('wa.me') && !whatsappLink.includes('whatsapp.com')) {
            return ctx.reply('❌ Invalid WhatsApp Link ❌\n\n📝 Please enter a valid WhatsApp link.\n\n💡 Format: https://wa.me/923001234567\n\nEnter link:');
        }
        
        const userSession = sessions[userChatId];
        if (!userSession || !userSession.usernameKey) {
            sessions[chatId] = null;
            return ctx.reply('❌ User session not found. Plan approval failed.');
        }
        
        const user = users[userSession.usernameKey];
        if (!user.pendingPlanRequests) {
            sessions[chatId] = null;
            return ctx.reply('❌ No pending requests found.');
        }
        
        const requestIndex = user.pendingPlanRequests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) {
            sessions[chatId] = null;
            return ctx.reply('❌ Request already processed.');
        }
        
        const request = user.pendingPlanRequests[requestIndex];
        const plan = plans[request.planId];
        const { date, time } = getCurrentDateTime();
        
        // Calculate expiry date
        let expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.duration);
        const expiryDateStr = `${String(expiryDate.getDate()).padStart(2,'0')}-${String(expiryDate.getMonth()+1).padStart(2,'0')}-${expiryDate.getFullYear()}`;
        
        // If upgrade, add remaining days
        if (request.type === 'upgrade' && user.activePlan && user.activePlan.expiryDate) {
            const oldExpiry = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
            const today = new Date();
            if (oldExpiry > today) {
                const timeDiff = oldExpiry - today;
                const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                expiryDate.setDate(expiryDate.getDate() + remainingDays);
            }
        }
        
        // Update user's active plan
        user.activePlan = {
            id: plan.id,
            name: plan.name,
            price: plan.price,
            duration: plan.duration,
            features: plan.features,
            whatsappLink: whatsappLink,
            purchaseDate: date,
            expiryDate: expiryDateStr,
            status: 'active'
        };
        
        // Add to transactions
        if (!user.transactions) user.transactions = [];
        user.transactions.push({
            type: `🤖 Plan Purchase ✅ (${plan.name})`,
            amount: plan.price,
            date: date,
            time: time,
            plan: plan.name,
            status: 'approved'
        });
        
        // Remove from pending requests
        user.pendingPlanRequests.splice(requestIndex, 1);
        saveUsers();
        
        // Clear admin session
        sessions[chatId] = null;
        
        // Notify user
        await bot.telegram.sendMessage(
            userChatId,
            `🎉 Plan Activated Successfully! 🎉\n\n✅ Plan Details:\n🤖 Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n📅 Duration: ${plan.duration} days\n📅 Expiry Date: ${expiryDateStr}\n🎯 Features: ${plan.features.join(', ')}\n\n🔗 Your WhatsApp Link:\n${whatsappLink}\n\n✨ Your plan is now active!\nYou can start using your WhatsApp bot.\n\n📞 Need help? Contact support 24/7.`
        );
        
        await ctx.reply(
            `✅ Plan Activated Successfully! ✅\n\n👤 User: ${user.firstName}\n🤖 Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n🔗 WhatsApp Link Sent\n\n✅ User has been notified.`
        );
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
    
    // ===== EXISTING TEXT HANDLER CODE (NO CHANGES) =====
    // (Your existing text handler code for signup, login, deposit, withdraw flows)
    // ... [Your existing text handler code remains exactly the same]
});

// ======= HELPER FUNCTIONS FOR PLAN SYSTEM =======
async function processPlanRejection(userChatId, requestId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('👤 User not found.');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingPlanRequests) {
        await adminCtx.answerCbQuery('🤖 No pending plan requests.');
        return;
    }

    const requestIndex = user.pendingPlanRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
        await adminCtx.answerCbQuery('✅ Plan request already processed.');
        return;
    }

    const request = user.pendingPlanRequests[requestIndex];
    const { date, time } = getCurrentDateTime();

    // Refund balance
    user.balance += request.price;
    
    // Add to transactions
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `🤖 Plan Request ❌ (Rejected)`,
        amount: request.price,
        date: date,
        time: time,
        plan: request.planName,
        status: 'rejected',
        rejectionReason: reason
    });

    // Notify user
    await bot.telegram.sendMessage(
        userChatId,
        `❌ Plan Request Rejected ❌\n\n⚠️ Request Details:\n🤖 Plan: ${request.planName}\n💰 Price: ${request.price} PKR\n📅 Date: ${date}\n⏰ Time: ${time}\n\n📝 Rejection Reason:\n${reason}\n\n💰 Balance Update:\n✅ Your balance has been refunded.\n• Amount Refunded: ${request.price} PKR\n• New Balance: ${user.balance} PKR\n\n💡 What to do next:\n1. Check the reason above\n2. Contact support if needed\n3. Submit a new request if applicable\n\n📞 Support Available 24/7`
    );

    // Remove from pending requests
    user.pendingPlanRequests.splice(requestIndex, 1);
    saveUsers();

    await adminCtx.reply(
        `❌ Plan Request Rejected ❌\n\n👤 User: ${user.firstName}\n🤖 Plan: ${request.planName}\n💰 Price Refunded: ${request.price} PKR\n\n📋 Rejection Reason:\n${reason}`
    );
}

// ======= ADMIN EDIT FIELD BUTTONS =======
bot.action(/admin_edit_field_(price|duration|features)_(.+)/, async (ctx) => {
    const [_, field, planId] = ctx.match;
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const plan = plans[planId];
    if (!plan) return ctx.answerCbQuery('❌ Plan not found.', { show_alert: true });

    sessions[ctx.chat.id].step = `edit_${field}`;
    
    let message = '';
    switch (field) {
        case 'price':
            message = `💰 Edit Price for: ${plan.name}\n\nCurrent Price: ${plan.price} PKR\n\nEnter new price (PKR):`;
            break;
        case 'duration':
            message = `📅 Edit Duration for: ${plan.name}\n\nCurrent Duration: ${plan.duration} days\n\nEnter new duration (days):`;
            break;
        case 'features':
            message = `🎯 Edit Features for: ${plan.name}\n\nCurrent Features: ${plan.features.join(', ')}\n\nEnter new features (comma separated):`;
            break;
    }

    await ctx.reply(message);
});

// ======= UPDATE PENDING REQUESTS VIEW =======
// Update the viewPendingRequests function to include plan requests
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
    
    // Pending Deposits
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
    
    // Pending Withdrawals
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
    
    // Pending Plan Requests
    if (user.pendingPlanRequests && user.pendingPlanRequests.length > 0) {
        hasPending = true;
        message += '🤖 Pending Plan Requests:\n';
        user.pendingPlanRequests.forEach((p, i) => {
            message += i + 1 + '. ' + p.planName + ' - ' + p.price + ' PKR\n';
            message += '   📅 Date: ' + p.date + '\n';
            message += '   ⏰ Time: ' + p.time + '\n';
            message += '   🔑 ID: ' + p.id + '\n';
            message += '   📊 Status: ' + (p.status || '🔄 Pending') + '\n\n';
        });
    } else {
        message += '🤖 Pending Plan Requests:\n';
        message += '   ✅ No pending plan requests\n\n';
    }
    
    if (!hasPending) {
        message = '✅ All Clear! ✅\n\n🎉 You have no pending requests.\n📊 All your transactions are processed.\n\n💡 Ready for your next transaction?';
    }

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📥 New Deposit', 'depositBalance')],
            [Markup.button.callback('📤 New Withdrawal', 'withdrawBalance')],
            [Markup.button.callback('🤖 Buy Plan', 'buyBot')],
            [Markup.button.callback('💰 Check Balance', 'checkBalance')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

// ======= UPDATE ADMIN MENU =======
// Update admin menu to include Plan Management
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

// ===== LAUNCH =====
bot.launch();
console.log('🤖 Bot running successfully...');
console.log('✨ All features activated');
console.log('🔒 Security protocols enabled');
console.log('💰 Payment system ready');
console.log('📱 WhatsApp bot integration active');
console.log('👑 Admin features loaded');
console.log('🔔 SMS Alert System Integrated');
console.log('📋 Plan Management System Activated');

// ===== EXISTING HELPER FUNCTIONS (NO CHANGES) =====
// ... [Your existing helper functions remain exactly the same]
// processDepositRejection, processWithdrawRejection functions remain unchanged
// SMS alert functions remain unchanged
// Admin deposit/withdraw approval functions remain unchanged
