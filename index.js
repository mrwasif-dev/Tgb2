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

// Helper function to delete messages
async function deleteMessage(ctx, messageId = null) {
    try {
        const msgId = messageId || ctx.message?.message_id || ctx.update?.callback_query?.message?.message_id;
        if (msgId) {
            await ctx.deleteMessage(msgId);
        }
    } catch (error) {
        console.log('Error deleting message:', error.message);
    }
}

// ===== START COMMAND =====
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete the user's /start message if exists
    if (ctx.message) {
        await deleteMessage(ctx, ctx.message.message_id);
    }

    if (users[userId]) {
        if (users[userId].role === 'admin') {
            const { date, time } = getCurrentDateTime();
            const msg = await ctx.reply(
                `🛡️ *Admin Panel*\n\n` +
                `📅 Date: ${date}\n` +
                `⏰ Time: ${time}\n\n` +
                `👥 Total Users: ${Object.keys(users).length}`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('📋 View All Users', 'view_all_users')],
                        [Markup.button.callback('⏳ View Pending Users', 'view_pending_users')],
                        [Markup.button.callback('📊 View Statistics', 'view_stats')],
                        [Markup.button.callback('📤 Broadcast Message', 'broadcast_message')],
                        [Markup.button.callback('🔒 Logout', 'admin_logout')]
                    ])
                }
            );
            sessions[userId] = { lastBotMessage: msg.message_id };
        } else if (users[userId].role === 'user') {
            const msg = await ctx.reply(
                `Welcome back, ${ctx.from.first_name}!\n\n` +
                `Your role: *${users[userId].role}*\n` +
                `Status: *${users[userId].approved ? 'Approved' : 'Pending'}*`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔄 Refresh Status', 'refresh_status')],
                        [Markup.button.callback('❌ Delete Account', 'delete_account')],
                        [Markup.button.callback('🆘 Help', 'help')]
                    ])
                }
            );
            sessions[userId] = { lastBotMessage: msg.message_id };
        }
    } else {
        const msg = await ctx.reply(
            `Welcome *${ctx.from.first_name}*! 👋\n\n` +
            `I'm your registration bot. Please choose an option:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📝 Register', 'register')],
                    [Markup.button.callback('🆘 Help', 'help')]
                ])
            }
        );
        sessions[userId] = { lastBotMessage: msg.message_id };
    }
});

// ===== REGISTRATION FLOW =====
bot.action('register', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete previous bot message
    if (sessions[userId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[userId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);

    if (users[userId]) {
        const msg = await ctx.reply(
            'You are already registered!',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Main', 'back_to_main')]
            ])
        );
        sessions[userId].lastBotMessage = msg.message_id;
        return;
    }

    sessions[userId] = {
        step: 'awaiting_password',
        lastBotMessage: null
    };

    const msg = await ctx.reply(
        'Please create a strong password for your account:\n\n' +
        'Requirements:\n' +
        '• At least 8 characters\n' +
        '• At least one uppercase letter\n' +
        '• At least one lowercase letter\n' +
        '• At least one number\n\n' +
        'Type your password:',
        { parse_mode: 'Markdown' }
    );
    
    sessions[userId].lastBotMessage = msg.message_id;
});

// Handle password input
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const session = sessions[userId];
    
    if (!session) return;
    
    // Delete user's text message
    if (ctx.message) {
        await deleteMessage(ctx, ctx.message.message_id);
    }
    
    // Delete previous bot message
    if (session.lastBotMessage) {
        await deleteMessage(ctx, session.lastBotMessage);
    }

    if (session.step === 'awaiting_password') {
        const password = ctx.message.text;
        
        if (!PASSWORD_REGEX.test(password)) {
            const msg = await ctx.reply(
                '❌ Password does not meet requirements!\n\n' +
                'Please create a strong password:\n' +
                '• At least 8 characters\n' +
                '• At least one uppercase letter\n' +
                '• At least one lowercase letter\n' +
                '• At least one number\n\n' +
                'Type your password again:',
                { parse_mode: 'Markdown' }
            );
            session.lastBotMessage = msg.message_id;
            return;
        }

        session.password = password;
        session.step = 'awaiting_name';
        
        const msg = await ctx.reply(
            '✅ Password accepted!\n\n' +
            'Now, please enter your full name:',
            { parse_mode: 'Markdown' }
        );
        session.lastBotMessage = msg.message_id;
        
    } else if (session.step === 'awaiting_name') {
        const name = ctx.message.text.trim();
        
        if (name.length < 2) {
            const msg = await ctx.reply(
                '❌ Name must be at least 2 characters long.\n\n' +
                'Please enter your full name again:',
                { parse_mode: 'Markdown' }
            );
            session.lastBotMessage = msg.message_id;
            return;
        }

        session.name = name;
        session.step = 'awaiting_phone';
        
        const msg = await ctx.reply(
            '✅ Name accepted!\n\n' +
            'Now, please send your phone number (with country code, e.g., +1234567890):',
            { parse_mode: 'Markdown' }
        );
        session.lastBotMessage = msg.message_id;
        
    } else if (session.step === 'awaiting_phone') {
        const phone = ctx.message.text.trim();
        
        // Simple phone validation
        if (!phone.match(/^\+?[1-9]\d{1,14}$/)) {
            const msg = await ctx.reply(
                '❌ Invalid phone number format.\n\n' +
                'Please send a valid phone number (with country code, e.g., +1234567890):',
                { parse_mode: 'Markdown' }
            );
            session.lastBotMessage = msg.message_id;
            return;
        }

        // Save user
        users[userId] = {
            name: session.name,
            phone: phone,
            password: session.password,
            role: 'user',
            approved: false,
            registrationDate: getCurrentDateTime().date,
            registrationTime: getCurrentDateTime().time
        };
        saveUsers();
        
        // Send confirmation to user
        const userMsg = await ctx.reply(
            `✅ *Registration Complete!*\n\n` +
            `Name: ${session.name}\n` +
            `Phone: ${phone}\n` +
            `Role: User\n` +
            `Status: *Pending Approval*\n\n` +
            `Your account is now pending approval from admin. You will be notified once approved.`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔄 Refresh Status', 'refresh_status')],
                    [Markup.button.callback('🔙 Back to Main', 'back_to_main')]
                ])
            }
        );
        
        // Send notification to admin
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `🆕 *New Registration Request!*\n\n` +
            `👤 Name: ${session.name}\n` +
            `📱 Phone: ${phone}\n` +
            `🆔 User ID: ${userId}\n` +
            `📅 Date: ${users[userId].registrationDate}\n` +
            `⏰ Time: ${users[userId].registrationTime}\n\n` +
            `Choose an action:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Approve', `approve_${userId}`)],
                    [Markup.button.callback('❌ Reject', `reject_${userId}`)]
                ])
            }
        );

        // Send second message to admin about pending count
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `📊 *Pending Requests*\n\n` +
            `You have new pending registration requests. Total pending: ${Object.values(users).filter(u => u.role === 'user' && !u.approved).length}`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📋 View All Pending', 'view_pending_users')]
                ])
            }
        );

        delete sessions[userId];
        sessions[userId] = { lastBotMessage: userMsg.message_id };
    }
});

// ===== ADMIN ACTIONS =====
bot.action(/^approve_(\d+)$/, async (ctx) => {
    const targetUserId = parseInt(ctx.match[1]);
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete admin's callback query message
    await deleteMessage(ctx);
    
    if (users[targetUserId]) {
        users[targetUserId].approved = true;
        users[targetUserId].approvedBy = adminId;
        users[targetUserId].approvalDate = getCurrentDateTime().date;
        users[targetUserId].approvalTime = getCurrentDateTime().time;
        saveUsers();
        
        // Notify user
        await bot.telegram.sendMessage(
            targetUserId,
            `🎉 *Your Account Has Been Approved!*\n\n` +
            `You can now use all features of the bot.\n\n` +
            `Thank you for registering!`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🚀 Get Started', 'get_started')]
                ])
            }
        );
        
        // Send confirmation to admin
        const msg = await ctx.reply(
            `✅ User *${users[targetUserId].name}* has been approved!`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📋 View All Users', 'view_all_users')],
                    [Markup.button.callback('⏳ View Pending', 'view_pending_users')]
                ])
            }
        );
        
        // Delete admin's previous messages related to this approval
        if (ctx.update.callback_query.message) {
            const chatId = ctx.update.callback_query.message.chat.id;
            const messageId = ctx.update.callback_query.message.message_id;
            try {
                await ctx.telegram.deleteMessage(chatId, messageId - 1);
                await ctx.telegram.deleteMessage(chatId, messageId - 2);
            } catch (error) {
                console.log('Error deleting admin messages:', error.message);
            }
        }
        
        sessions[adminId] = { lastBotMessage: msg.message_id };
    } else {
        const msg = await ctx.reply('User not found!');
        sessions[adminId] = { lastBotMessage: msg.message_id };
    }
    
    await ctx.answerCbQuery();
});

bot.action(/^reject_(\d+)$/, async (ctx) => {
    const targetUserId = parseInt(ctx.match[1]);
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    pendingAdminRejections[adminId] = targetUserId;
    
    const msg = await ctx.reply(
        `Please enter the reason for rejecting user ${targetUserId}:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel Rejection', `cancel_reject_${targetUserId}`)]
        ])
    );
    sessions[adminId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

// Handle admin rejection reason
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    
    if (userId === ADMIN_ID && pendingAdminRejections[userId]) {
        const targetUserId = pendingAdminRejections[userId];
        const reason = ctx.message.text;
        
        // Delete admin's text message
        if (ctx.message) {
            await deleteMessage(ctx, ctx.message.message_id);
        }
        
        // Delete previous bot message
        if (sessions[userId]?.lastBotMessage) {
            await deleteMessage(ctx, sessions[userId].lastBotMessage);
        }
        
        if (users[targetUserId]) {
            // Notify user
            await bot.telegram.sendMessage(
                targetUserId,
                `❌ *Your Registration Was Rejected*\n\n` +
                `Reason: ${reason}\n\n` +
                `Please contact support if you believe this was a mistake.`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔄 Try Again', 'register')],
                        [Markup.button.callback('🆘 Contact Support', 'contact_support')]
                    ])
                }
            );
            
            delete users[targetUserId];
            saveUsers();
            
            const msg = await ctx.reply(
                `✅ User has been rejected and notified.\nReason: ${reason}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('📋 View All Users', 'view_all_users')]
                ])
            );
            sessions[userId] = { lastBotMessage: msg.message_id };
        }
        
        delete pendingAdminRejections[userId];
    }
});

bot.action(/^cancel_reject_(\d+)$/, async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    delete pendingAdminRejections[adminId];
    
    const msg = await ctx.reply(
        'Rejection cancelled.',
        Markup.inlineKeyboard([
            [Markup.button.callback('📋 View Pending Users', 'view_pending_users')]
        ])
    );
    sessions[adminId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

// ===== VIEW ALL USERS =====
bot.action('view_all_users', async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete previous bot message
    if (sessions[adminId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[adminId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const allUsers = Object.entries(users);
    
    if (allUsers.length === 0) {
        const msg = await ctx.reply(
            'No users registered yet.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
            ])
        );
        sessions[adminId] = { lastBotMessage: msg.message_id };
        return;
    }
    
    let message = '👥 *All Registered Users:*\n\n';
    let userCount = 0;
    
    for (const [id, user] of allUsers) {
        userCount++;
        message += `*${userCount}. ${user.name}*\n`;
        message += `   ID: ${id}\n`;
        message += `   Phone: ${user.phone}\n`;
        message += `   Role: ${user.role}\n`;
        message += `   Status: ${user.approved ? '✅ Approved' : '⏳ Pending'}\n`;
        message += `   Registered: ${user.registrationDate} ${user.registrationTime}\n`;
        
        if (user.approved) {
            message += `   Approved: ${user.approvalDate} ${user.approvalTime}\n`;
        }
        
        message += '\n';
        
        // Split message if too long
        if (message.length > 3000) {
            const msgPart = await ctx.reply(
                message,
                { parse_mode: 'Markdown' }
            );
            message = '';
            sessions[adminId] = { lastBotMessage: msgPart.message_id };
        }
    }
    
    if (message.length > 0) {
        const msg = await ctx.reply(
            message + `\nTotal Users: ${userCount}`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⏳ View Pending Only', 'view_pending_users')],
                    [Markup.button.callback('📊 View Statistics', 'view_stats')],
                    [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
                ])
            }
        );
        sessions[adminId] = { lastBotMessage: msg.message_id };
    }
});

// ===== VIEW PENDING USERS =====
bot.action('view_pending_users', async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete previous bot message
    if (sessions[adminId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[adminId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const pendingUsers = Object.entries(users).filter(([_, user]) => 
        user.role === 'user' && !user.approved
    );
    
    if (pendingUsers.length === 0) {
        const msg = await ctx.reply(
            'No pending users.',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 View All Users', 'view_all_users')],
                [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
            ])
        );
        sessions[adminId] = { lastBotMessage: msg.message_id };
        return;
    }
    
    let message = '⏳ *Pending Users:*\n\n';
    let buttons = [];
    
    for (const [id, user] of pendingUsers) {
        message += `*${user.name}*\n`;
        message += `ID: ${id}\n`;
        message += `Phone: ${user.phone}\n`;
        message += `Registered: ${user.registrationDate} ${user.registrationTime}\n\n`;
        
        buttons.push([
            Markup.button.callback(`✅ ${user.name}`, `approve_${id}`),
            Markup.button.callback(`❌ ${user.name}`, `reject_${id}`)
        ]);
    }
    
    buttons.push([Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]);
    
    const msg = await ctx.reply(
        message + `Total Pending: ${pendingUsers.length}`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
        }
    );
    sessions[adminId] = { lastBotMessage: msg.message_id };
});

// ===== VIEW STATISTICS =====
bot.action('view_stats', async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete previous bot message
    if (sessions[adminId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[adminId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const totalUsers = Object.keys(users).length;
    const approvedUsers = Object.values(users).filter(u => u.approved).length;
    const pendingUsers = Object.values(users).filter(u => u.role === 'user' && !u.approved).length;
    const admins = Object.values(users).filter(u => u.role === 'admin').length;
    
    const msg = await ctx.reply(
        `📊 *Statistics*\n\n` +
        `👥 Total Users: ${totalUsers}\n` +
        `✅ Approved Users: ${approvedUsers}\n` +
        `⏳ Pending Users: ${pendingUsers}\n` +
        `🛡️ Admins: ${admins}\n\n` +
        `📅 Date: ${getCurrentDateTime().date}\n` +
        `⏰ Time: ${getCurrentDateTime().time}`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 View All Users', 'view_all_users')],
                [Markup.button.callback('⏳ View Pending', 'view_pending_users')],
                [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
            ])
        }
    );
    sessions[adminId] = { lastBotMessage: msg.message_id };
});

// ===== BROADCAST MESSAGE =====
bot.action('broadcast_message', async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete previous bot message
    if (sessions[adminId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[adminId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    sessions[adminId] = {
        step: 'awaiting_broadcast',
        lastBotMessage: null
    };
    
    const msg = await ctx.reply(
        '📤 *Broadcast Message*\n\n' +
        'Please enter the message you want to broadcast to all approved users:',
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel Broadcast', 'cancel_broadcast')]
            ])
        }
    );
    sessions[adminId].lastBotMessage = msg.message_id;
});

// Handle broadcast message
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    
    if (userId === ADMIN_ID && sessions[userId]?.step === 'awaiting_broadcast') {
        const message = ctx.message.text;
        
        // Delete admin's text message
        if (ctx.message) {
            await deleteMessage(ctx, ctx.message.message_id);
        }
        
        // Delete previous bot message
        if (sessions[userId]?.lastBotMessage) {
            await deleteMessage(ctx, sessions[userId].lastBotMessage);
        }
        
        const approvedUsers = Object.entries(users).filter(([_, user]) => user.approved);
        let successCount = 0;
        let failCount = 0;
        
        const progressMsg = await ctx.reply(`📤 Sending broadcast to ${approvedUsers.length} users...`);
        
        for (const [id, user] of approvedUsers) {
            try {
                await bot.telegram.sendMessage(
                    id,
                    `📢 *Broadcast Message from Admin*\n\n${message}`,
                    { parse_mode: 'Markdown' }
                );
                successCount++;
            } catch (error) {
                console.log(`Failed to send to ${id}:`, error.message);
                failCount++;
            }
        }
        
        // Delete progress message
        await ctx.deleteMessage(progressMsg.message_id);
        
        const resultMsg = await ctx.reply(
            `✅ *Broadcast Complete!*\n\n` +
            `✅ Successfully sent: ${successCount}\n` +
            `❌ Failed: ${failCount}\n` +
            `📊 Total attempted: ${approvedUsers.length}`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
                ])
            }
        );
        
        delete sessions[userId].step;
        sessions[userId].lastBotMessage = resultMsg.message_id;
    }
});

bot.action('cancel_broadcast', async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    delete sessions[adminId]?.step;
    
    const msg = await ctx.reply(
        'Broadcast cancelled.',
        Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
        ])
    );
    sessions[adminId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

// ===== LOGOUT =====
bot.action('admin_logout', async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const msg = await ctx.reply(
        'You have been logged out.',
        Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Start Menu', 'back_to_main')]
        ])
    );
    
    delete sessions[adminId];
    sessions[adminId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

// ===== USER ACTIONS =====
bot.action('refresh_status', async (ctx) => {
    const userId = ctx.from.id;
    
    if (!users[userId]) {
        await ctx.answerCbQuery('You are not registered!');
        return;
    }
    
    // Delete previous bot message
    if (sessions[userId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[userId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const user = users[userId];
    const msg = await ctx.reply(
        `🔄 *Status Updated*\n\n` +
        `Name: ${user.name}\n` +
        `Role: ${user.role}\n` +
        `Status: ${user.approved ? '✅ Approved' : '⏳ Pending Approval'}\n` +
        `Registered: ${user.registrationDate} ${user.registrationTime}\n\n` +
        `${user.approved ? 'You can now use all features!' : 'Please wait for admin approval.'}`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Refresh Again', 'refresh_status')],
                [Markup.button.callback('🔙 Back to Main', 'back_to_main')]
            ])
        }
    );
    sessions[userId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

bot.action('delete_account', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const msg = await ctx.reply(
        '⚠️ *Are you sure you want to delete your account?*\n\n' +
        'This action cannot be undone!',
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Yes, Delete', 'confirm_delete_account')],
                [Markup.button.callback('❌ No, Cancel', 'cancel_delete_account')]
            ])
        }
    );
    sessions[userId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

bot.action('confirm_delete_account', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    delete users[userId];
    saveUsers();
    
    const msg = await ctx.reply(
        '✅ Your account has been deleted successfully.',
        Markup.inlineKeyboard([
            [Markup.button.callback('📝 Register Again', 'register')]
        ])
    );
    delete sessions[userId];
    sessions[userId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

bot.action('cancel_delete_account', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const msg = await ctx.reply(
        'Account deletion cancelled.',
        Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Main', 'back_to_main')]
        ])
    );
    sessions[userId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

// ===== HELP =====
bot.action('help', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete previous bot message
    if (sessions[userId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[userId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const msg = await ctx.reply(
        `🆘 *Help & Support*\n\n` +
        `If you need assistance, please contact the admin.\n\n` +
        `Available commands:\n` +
        `/start - Start the bot\n` +
        `/help - Show this help message\n\n` +
        `For registration issues or account problems, please wait for admin approval or contact support.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Main', 'back_to_main')],
                [Markup.button.callback('📞 Contact Admin', 'contact_admin')]
            ])
        }
    );
    sessions[userId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

bot.action('contact_admin', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const msg = await ctx.reply(
        'Please send your message to the admin. Type your message below:'
    );
    
    sessions[userId] = {
        step: 'contacting_admin',
        lastBotMessage: msg.message_id
    };
    await ctx.answerCbQuery();
});

// Handle contact admin messages
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    
    if (sessions[userId]?.step === 'contacting_admin') {
        const message = ctx.message.text;
        const userName = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
        
        // Delete user's text message
        if (ctx.message) {
            await deleteMessage(ctx, ctx.message.message_id);
        }
        
        // Delete previous bot message
        if (sessions[userId]?.lastBotMessage) {
            await deleteMessage(ctx, sessions[userId].lastBotMessage);
        }
        
        // Forward to admin
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `📩 *New Message from User*\n\n` +
            `👤 Name: ${userName}\n` +
            `🆔 User ID: ${userId}\n\n` +
            `💬 Message:\n${message}\n\n` +
            `Reply options:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`📤 Reply to ${userName}`, `reply_to_${userId}`)],
                    [Markup.button.callback('👁️ View User Profile', `view_profile_${userId}`)]
                ])
            }
        );
        
        const msg = await ctx.reply(
            '✅ Your message has been sent to the admin. They will respond soon.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Main', 'back_to_main')]
            ])
        );
        
        delete sessions[userId].step;
        sessions[userId] = { lastBotMessage: msg.message_id };
    }
});

// ===== BACK TO MAIN =====
bot.action('back_to_main', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete previous bot message
    if (sessions[userId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[userId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const msg = await ctx.reply(
        `🏠 *Main Menu*\n\n` +
        `Welcome ${ctx.from.first_name}!`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📝 Register', 'register')],
                [Markup.button.callback('🆘 Help', 'help')]
            ])
        }
    );
    sessions[userId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

bot.action('back_to_admin', async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete previous bot message
    if (sessions[adminId]?.lastBotMessage) {
        await deleteMessage(ctx, sessions[adminId].lastBotMessage);
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const { date, time } = getCurrentDateTime();
    const msg = await ctx.reply(
        `🛡️ *Admin Panel*\n\n` +
        `📅 Date: ${date}\n` +
        `⏰ Time: ${time}\n\n` +
        `👥 Total Users: ${Object.keys(users).length}`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 View All Users', 'view_all_users')],
                [Markup.button.callback('⏳ View Pending Users', 'view_pending_users')],
                [Markup.button.callback('📊 View Statistics', 'view_stats')],
                [Markup.button.callback('📤 Broadcast Message', 'broadcast_message')],
                [Markup.button.callback('🔒 Logout', 'admin_logout')]
            ])
        }
    );
    sessions[adminId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

// ===== GET STARTED =====
bot.action('get_started', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const msg = await ctx.reply(
        `🚀 *Welcome ${ctx.from.first_name}!*\n\n` +
        `Your account is now active. You can start using all features.\n\n` +
        `Need help? Use the help button below.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🆘 Help', 'help')],
                [Markup.button.callback('🔄 Refresh Status', 'refresh_status')]
            ])
        }
    );
    sessions[userId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

bot.action('contact_support', async (ctx) => {
    const userId = ctx.from.id;
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    const msg = await ctx.reply(
        'Please describe your issue and our support team will help you:'
    );
    
    sessions[userId] = {
        step: 'contacting_support',
        lastBotMessage: msg.message_id
    };
    await ctx.answerCbQuery();
});

// Handle support messages
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    
    if (sessions[userId]?.step === 'contacting_support') {
        const message = ctx.message.text;
        
        // Delete user's text message
        if (ctx.message) {
            await deleteMessage(ctx, ctx.message.message_id);
        }
        
        // Delete previous bot message
        if (sessions[userId]?.lastBotMessage) {
            await deleteMessage(ctx, sessions[userId].lastBotMessage);
        }
        
        // Forward to admin as support request
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `🆘 *Support Request*\n\n` +
            `👤 User ID: ${userId}\n` +
            `📝 Issue:\n${message}`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`📤 Reply to User`, `reply_to_${userId}`)]
                ])
            }
        );
        
        const msg = await ctx.reply(
            '✅ Your support request has been submitted. We will contact you soon.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Main', 'back_to_main')]
            ])
        );
        
        delete sessions[userId].step;
        sessions[userId] = { lastBotMessage: msg.message_id };
    }
});

// ===== ADMIN REPLY TO USER =====
bot.action(/^reply_to_(\d+)$/, async (ctx) => {
    const targetUserId = parseInt(ctx.match[1]);
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    sessions[adminId] = {
        step: `replying_to_${targetUserId}`,
        lastBotMessage: null
    };
    
    const msg = await ctx.reply(
        `📤 Reply to user ${targetUserId}:\n\n` +
        `Please type your reply message:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel Reply', `cancel_reply_${targetUserId}`)]
        ])
    );
    sessions[adminId].lastBotMessage = msg.message_id;
    await ctx.answerCbQuery();
});

// Handle admin reply
bot.on('text', async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId === ADMIN_ID && sessions[adminId]?.step && sessions[adminId].step.startsWith('replying_to_')) {
        const targetUserId = parseInt(sessions[adminId].step.split('_')[2]);
        const replyMessage = ctx.message.text;
        
        // Delete admin's text message
        if (ctx.message) {
            await deleteMessage(ctx, ctx.message.message_id);
        }
        
        // Delete previous bot message
        if (sessions[adminId]?.lastBotMessage) {
            await deleteMessage(ctx, sessions[adminId].lastBotMessage);
        }
        
        try {
            await bot.telegram.sendMessage(
                targetUserId,
                `📩 *Message from Admin*\n\n${replyMessage}`,
                { parse_mode: 'Markdown' }
            );
            
            const msg = await ctx.reply(
                `✅ Reply sent to user ${targetUserId}.`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
                ])
            );
            sessions[adminId] = { lastBotMessage: msg.message_id };
        } catch (error) {
            const msg = await ctx.reply(
                `❌ Failed to send reply: ${error.message}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
                ])
            );
            sessions[adminId] = { lastBotMessage: msg.message_id };
        }
        
        delete sessions[adminId].step;
    }
});

bot.action(/^cancel_reply_(\d+)$/, async (ctx) => {
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    delete sessions[adminId]?.step;
    
    const msg = await ctx.reply(
        'Reply cancelled.',
        Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
        ])
    );
    sessions[adminId] = { lastBotMessage: msg.message_id };
    await ctx.answerCbQuery();
});

// ===== VIEW USER PROFILE =====
bot.action(/^view_profile_(\d+)$/, async (ctx) => {
    const targetUserId = parseInt(ctx.match[1]);
    const adminId = ctx.from.id;
    
    if (adminId !== ADMIN_ID) {
        await ctx.answerCbQuery('❌ Unauthorized!');
        return;
    }
    
    // Delete callback query message
    await deleteMessage(ctx);
    
    if (users[targetUserId]) {
        const user = users[targetUserId];
        const msg = await ctx.reply(
            `👤 *User Profile*\n\n` +
            `Name: ${user.name}\n` +
            `Phone: ${user.phone}\n` +
            `Role: ${user.role}\n` +
            `Status: ${user.approved ? '✅ Approved' : '⏳ Pending'}\n` +
            `Registered: ${user.registrationDate} ${user.registrationTime}\n` +
            `${user.approved ? `Approved: ${user.approvalDate} ${user.approvalTime}\n` : ''}\n` +
            `User ID: ${targetUserId}`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback(`📤 Reply to User`, `reply_to_${targetUserId}`)],
                    [!user.approved ? Markup.button.callback(`✅ Approve`, `approve_${targetUserId}`) : null,
                     !user.approved ? Markup.button.callback(`❌ Reject`, `reject_${targetUserId}`) : null].filter(Boolean),
                    [Markup.button.callback('🔙 Back', 'back_to_admin')]
                ])
            }
        );
        sessions[adminId] = { lastBotMessage: msg.message_id };
    } else {
        const msg = await ctx.reply(
            'User not found.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
            ])
        );
        sessions[adminId] = { lastBotMessage: msg.message_id };
    }
    await ctx.answerCbQuery();
});

// ===== ERROR HANDLING =====
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('An error occurred. Please try again.');
});

// ===== START BOT =====
bot.launch().then(() => {
    console.log('Bot is running...');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
