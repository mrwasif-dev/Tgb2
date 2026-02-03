const { Telegraf, Markup } = require('telegraf');

require('./help.js');

// SMS Alert Bot Token
const SMS_BOT_TOKEN = '8507060702:AAFpyyTbN3XYUIm8B0fwbw3Adi2hjrSL388';
const smsBot = new Telegraf(SMS_BOT_TOKEN);

// Admin ID (Your Telegram ID)
const SMS_ADMIN_ID = '6012422087'; // Your admin ID from main bot

// Store user connections: userTelegramID -> chatID
const userConnections = new Map();

// Store admin session data
const adminSession = new Map();

// Store broadcast in progress state
let broadcastInProgress = false;

// Function to force contact user who hasn't started the bot
async function forceContactUser(userTelegramId) {
    try {
        // Skip if it's admin
        if (userTelegramId === SMS_ADMIN_ID) {
            console.log(`⚠️ Skipping force contact for admin ${userTelegramId}`);
            return false;
        }
        
        // Try to send a message to force contact
        await smsBot.telegram.sendMessage(
            userTelegramId,
            "📢 *Important Notification*\n\n" +
            "This is an automated alert from your account. " +
            "Please start the SMS Alert Bot by clicking /start to receive important updates about your account balance.",
            { parse_mode: 'Markdown' }
        );
        console.log(`✅ Force contact sent to user ${userTelegramId}`);
        return true;
    } catch (error) {
        console.log(`❌ Cannot force contact user ${userTelegramId}: ${error.message}`);
        return false;
    }
}

// Function to send balance alerts (will be called from main bot)
async function sendBalanceAlert(userTelegramId, alertData) {
    try {
        // Skip if it's admin (admin doesn't need SMS alerts)
        if (userTelegramId === SMS_ADMIN_ID) {
            console.log(`⚠️ Skipping balance alert for admin ${userTelegramId}`);
            return false;
        }
        
        const userChatId = userConnections.get(userTelegramId);
        
        if (!userChatId) {
            console.log(`⚠️ User ${userTelegramId} not connected to SMS bot, attempting force contact...`);
            // Try to force contact the user
            const contactResult = await forceContactUser(userTelegramId);
            return contactResult;
        }

        let message = '';
        
        // Create notification based on type
        if (alertData.type === 'deposit') {
            message = `🎉 Balance Added Successfully!\n\n` +
                     `📅 Date: ${alertData.date}\n` +
                     `⏰ Time: ${alertData.time}\n\n` +
                     `➕ Amount Added: ${alertData.amount} PKR\n` +
                     `🏦 Method: ${alertData.method}`;
        }
        else if (alertData.type === 'withdrawal') {
            message = `💸 Withdrawal Completed!\n\n` +
                     `📅 Date: ${alertData.date}\n` +
                     `⏰ Time: ${alertData.time}\n\n` +
                     `➖ Amount Withdrawn: ${alertData.amount} PKR\n` +
                     `🏦 Method: ${alertData.method}`;
        }

        // Send message to user
        await smsBot.telegram.sendMessage(userChatId, message);
        console.log(`✅ Balance alert sent to user ${userTelegramId}`);
        return true;
    } catch (error) {
        console.log(`❌ Error sending balance alert to ${userTelegramId}: ${error.message}`);
        return false;
    }
}

// Function for admin to send message to any user
async function adminSendMessage(targetUserTelegramId, messageText) {
    try {
        // Don't allow admin to send message to himself via this function
        if (targetUserTelegramId === SMS_ADMIN_ID) {
            console.log(`⚠️ Admin ${SMS_ADMIN_ID} tried to send message to himself`);
            return { success: false, status: 'self_message', error: 'Cannot send message to yourself via admin command' };
        }
        
        // Check if target user is in connections
        const userChatId = userConnections.get(targetUserTelegramId);
        
        if (userChatId) {
            // User has started the bot, send message DIRECTLY without "Admin Message" prefix
            await smsBot.telegram.sendMessage(userChatId, messageText);
            console.log(`✅ Admin message sent to connected user ${targetUserTelegramId}`);
            return { success: true, status: 'user_connected' };
        } else {
            // User hasn't started the bot, try force contact
            try {
                await smsBot.telegram.sendMessage(
                    targetUserTelegramId,
                    messageText + '\n\n' + // Only admin's message
                    `_Note: Please start this bot with /start to receive regular updates._`,
                    { parse_mode: 'Markdown' }
                );
                console.log(`✅ Admin message sent via force contact to ${targetUserTelegramId}`);
                return { success: true, status: 'force_contact' };
            } catch (error) {
                console.log(`❌ Cannot send admin message to ${targetUserTelegramId}: ${error.message}`);
                return { success: false, status: 'cannot_contact', error: error.message };
            }
        }
    } catch (error) {
        console.log(`❌ Error in adminSendMessage: ${error.message}`);
        return { success: false, status: 'error', error: error.message };
    }
}

// Function to get active users list for admin
function getActiveUsers() {
    const activeUsers = [];
    
    userConnections.forEach((chatId, telegramId) => {
        // Exclude admin from active users list
        if (telegramId !== SMS_ADMIN_ID) {
            activeUsers.push({
                telegramId: telegramId,
                chatId: chatId
            });
        }
    });
    
    return activeUsers;
}

// Function to check if user is admin
function isAdmin(userId) {
    return userId.toString() === SMS_ADMIN_ID;
}

// Show admin panel with buttons
function showAdminPanel(ctx) {
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('👥 Active Users', 'active_users'),
            Markup.button.callback('📊 Stats', 'stats')
        ],
        [
            Markup.button.callback('📤 Send Message', 'send_message'),
            Markup.button.callback('📢 Broadcast', 'broadcast')
        ],
        [
            Markup.button.callback('🔄 Refresh', 'refresh'),
            Markup.button.callback('❌ Close', 'close_panel')
        ]
    ]);
    
    return ctx.reply(
        '👑 *Admin Control Panel*\n\n' +
        'Select an option from the buttons below:',
        {
            parse_mode: 'Markdown',
            ...keyboard
        }
    );
}

// Admin commands handler - Only admin command remains
smsBot.command('admin', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.reply('⛔ Access denied.');
    }
    
    return showAdminPanel(ctx);
});

// Active users button handler
smsBot.action('active_users', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    await ctx.answerCbQuery();
    
    const activeUsers = getActiveUsers();
    
    if (activeUsers.length === 0) {
        await ctx.reply('📭 No active users found.');
        return showAdminPanel(ctx);
    }
    
    let message = `👥 *Active Users (${activeUsers.length}):*\n\n`;
    
    activeUsers.forEach((user, index) => {
        message += `${index + 1}. User ID: \`${user.telegramId}\`\n`;
        message += `   Chat ID: \`${user.chatId}\`\n\n`;
    });
    
    // Add copy button for each user ID
    const buttons = [];
    activeUsers.forEach((user, index) => {
        buttons.push([
            Markup.button.callback(
                `👤 User ${index + 1}: ${user.telegramId}`,
                `send_to_user_${user.telegramId}`
            )
        ]);
    });
    
    buttons.push([Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]);
    
    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
});

// Send to specific user button handler
smsBot.action(/^send_to_user_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    const userId = ctx.match[1];
    await ctx.answerCbQuery();
    
    // Store target user ID in admin session
    const adminId = ctx.from.id.toString();
    adminSession.set(adminId, {
        action: 'send_to_user',
        targetUserId: userId
    });
    
    await ctx.reply(
        `📤 *Send Message to User*\n\n` +
        `You are sending message to user ID: \`${userId}\`\n\n` +
        `📝 Please type your message now:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel', 'back_to_admin')]
            ])
        }
    );
});

// Send message button handler
smsBot.action('send_message', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    await ctx.answerCbQuery();
    
    // Store action in admin session
    const adminId = ctx.from.id.toString();
    adminSession.set(adminId, {
        action: 'ask_user_id'
    });
    
    await ctx.reply(
        '📤 *Send Message to User*\n\n' +
        'Please enter the User ID first:',
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel', 'back_to_admin')]
            ])
        }
    );
});

// Broadcast button handler
smsBot.action('broadcast', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    await ctx.answerCbQuery();
    
    // Store action in admin session
    const adminId = ctx.from.id.toString();
    adminSession.set(adminId, {
        action: 'ask_broadcast_message'
    });
    
    await ctx.reply(
        '📢 *Broadcast Message*\n\n' +
        'Please type your broadcast message:',
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel', 'back_to_admin')]
            ])
        }
    );
});

// Handle text messages from admin
smsBot.on('text', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return; // Only process admin messages
    }
    
    const adminId = ctx.from.id.toString();
    const session = adminSession.get(adminId);
    const userMessage = ctx.message.text;
    
    if (!session) {
        // If no session, show admin panel
        return showAdminPanel(ctx);
    }
    
    if (session.action === 'ask_user_id') {
        // User has entered user ID, now ask for message
        const userId = userMessage.trim();
        
        // Validate user ID (should be numeric)
        if (!/^\d+$/.test(userId)) {
            await ctx.reply(
                '❌ *Invalid User ID!*\n\n' +
                'User ID should contain only numbers.\n' +
                'Please enter a valid User ID:',
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('❌ Cancel', 'back_to_admin')]
                    ])
                }
            );
            return;
        }
        
        // Update session to ask for message
        adminSession.set(adminId, {
            action: 'ask_message_for_user',
            targetUserId: userId
        });
        
        await ctx.reply(
            `📤 *Send Message to User*\n\n` +
            `User ID: \`${userId}\`\n\n` +
            `📝 Please type your message now:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('❌ Cancel', 'back_to_admin')]
                ])
            }
        );
    }
    else if (session.action === 'ask_message_for_user') {
        // User has entered message for specific user
        const targetUserId = session.targetUserId;
        const messageText = userMessage;
        
        // Show sending indicator
        const sendingMsg = await ctx.reply('📤 Sending message...');
        
        // Send message
        const result = await adminSendMessage(targetUserId, messageText);
        
        // Update status
        let statusMessage = '';
        if (result.success) {
            if (result.status === 'user_connected') {
                statusMessage = `✅ Message sent to user ${targetUserId}`;
            } else if (result.status === 'force_contact') {
                statusMessage = `📨 Message sent via force contact to ${targetUserId}`;
            }
        } else {
            if (result.status === 'self_message') {
                statusMessage = `❌ Cannot send message to yourself`;
            } else {
                statusMessage = `❌ Failed to send message to ${targetUserId}\nError: ${result.error}`;
            }
        }
        
        // Clear session
        adminSession.delete(adminId);
        
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            sendingMsg.message_id,
            null,
            statusMessage + '\n\n' + 'Return to admin panel:',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
                ])
            }
        );
    }
    else if (session.action === 'ask_broadcast_message') {
        // User has entered broadcast message
        const messageText = userMessage;
        
        // Clear session first
        adminSession.delete(adminId);
        
        // Check if broadcast is already in progress
        if (broadcastInProgress) {
            await ctx.reply(
                '⚠️ *Broadcast Already in Progress!*\n\n' +
                'Please wait for the current broadcast to complete.',
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
                    ])
                }
            );
            return;
        }
        
        const activeUsers = getActiveUsers();
        
        if (activeUsers.length === 0) {
            await ctx.reply('📭 No active users to broadcast to.');
            return showAdminPanel(ctx);
        }
        
        // Set broadcast in progress
        broadcastInProgress = true;
        
        const broadcastMsg = await ctx.reply(
            `📢 *Broadcasting to ${activeUsers.length} users...*\n\n` +
            `0/${activeUsers.length} sent\n\n` +
            `🔄 Status: Starting...`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⏹️ Cancel Broadcast', 'cancel_broadcast')]
                ])
            }
        );
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < activeUsers.length; i++) {
            const user = activeUsers[i];
            
            // Check if broadcast was cancelled
            if (!broadcastInProgress) {
                break;
            }
            
            try {
                // Send message DIRECTLY without any prefix
                await smsBot.telegram.sendMessage(user.chatId, messageText);
                successCount++;
            } catch (error) {
                failCount++;
                console.log(`❌ Broadcast failed for user ${user.telegramId}: ${error.message}`);
            }
            
            // Update progress every 5 users or at the end
            if (i % 5 === 0 || i === activeUsers.length - 1) {
                const progressPercentage = Math.round(((i + 1) / activeUsers.length) * 100);
                const status = broadcastInProgress ? 'In Progress' : 'Cancelled';
                
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    broadcastMsg.message_id,
                    null,
                    `📢 *Broadcasting to ${activeUsers.length} users...*\n\n` +
                    `${i + 1}/${activeUsers.length} sent (${progressPercentage}%)\n\n` +
                    `✅ Success: ${successCount}\n` +
                    `❌ Failed: ${failCount}\n` +
                    `🔄 Status: ${status}`,
                    {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard(
                            broadcastInProgress ? [
                                [Markup.button.callback('⏹️ Cancel Broadcast', 'cancel_broadcast')]
                            ] : []
                        )
                    }
                );
                
                // Small delay to prevent rate limiting
                if (i < activeUsers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }
        
        // Final result
        const finalStatus = broadcastInProgress ? 'Completed' : 'Cancelled';
        
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            broadcastMsg.message_id,
            null,
            `📢 *Broadcast ${finalStatus}!*\n\n` +
            `✅ Successfully sent: ${successCount} users\n` +
            `❌ Failed: ${failCount} users\n` +
            `📊 Total: ${activeUsers.length} users\n\n` +
            `🔙 Return to admin panel:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
                ])
            }
        );
        
        // Reset broadcast state
        broadcastInProgress = false;
    }
    else if (session.action === 'send_to_user') {
        // Direct message from active users list
        const targetUserId = session.targetUserId;
        const messageText = userMessage;
        
        // Show sending indicator
        const sendingMsg = await ctx.reply('📤 Sending message...');
        
        // Send message
        const result = await adminSendMessage(targetUserId, messageText);
        
        // Update status
        let statusMessage = '';
        if (result.success) {
            if (result.status === 'user_connected') {
                statusMessage = `✅ Message sent to user ${targetUserId}`;
            } else if (result.status === 'force_contact') {
                statusMessage = `📨 Message sent via force contact to ${targetUserId}`;
            }
        } else {
            if (result.status === 'self_message') {
                statusMessage = `❌ Cannot send message to yourself`;
            } else {
                statusMessage = `❌ Failed to send message to ${targetUserId}\nError: ${result.error}`;
            }
        }
        
        // Clear session
        adminSession.delete(adminId);
        
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            sendingMsg.message_id,
            null,
            statusMessage + '\n\n' + 'Return to admin panel:',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
                ])
            }
        );
    }
});

// Cancel broadcast button handler
smsBot.action('cancel_broadcast', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    if (!broadcastInProgress) {
        return ctx.answerCbQuery('No broadcast in progress.');
    }
    
    broadcastInProgress = false;
    await ctx.answerCbQuery('Broadcast cancelled!');
});

// Stats button handler
smsBot.action('stats', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    await ctx.answerCbQuery();
    
    const activeUsers = getActiveUsers();
    const totalConnections = userConnections.size;
    const adminConnections = userConnections.has(SMS_ADMIN_ID) ? 1 : 0;
    const regularUsers = totalConnections - adminConnections;
    
    const statsMessage = `
📊 *Bot Statistics:*

👥 Total Connections: ${totalConnections}
👤 Admin Connections: ${adminConnections}
👤 Regular Users: ${regularUsers}
🆔 Admin ID: \`${SMS_ADMIN_ID}\`
🤖 Bot Status: ✅ Running

*Active Regular Users (${activeUsers.length}):*
${activeUsers.map((user, index) => `${index + 1}. User: ${user.telegramId}`).join('\n') || 'No active users'}
`;
    
    await ctx.reply(statsMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Admin Panel', 'back_to_admin')]
        ])
    });
});

// Refresh button handler
smsBot.action('refresh', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    await ctx.answerCbQuery('✅ Refreshed!');
    
    // Delete the old message and show new admin panel
    try {
        await ctx.deleteMessage();
    } catch (error) {
        // Ignore if message cannot be deleted
    }
    
    return showAdminPanel(ctx);
});

// Back to admin panel button handler
smsBot.action('back_to_admin', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    await ctx.answerCbQuery();
    
    // Clear admin session
    adminSession.delete(ctx.from.id.toString());
    
    // Delete the current message
    try {
        await ctx.deleteMessage();
    } catch (error) {
        // Ignore if message cannot be deleted
    }
    
    return showAdminPanel(ctx);
});

// Close panel button handler
smsBot.action('close_panel', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('⛔ Access denied.');
    }
    
    // Clear admin session
    adminSession.delete(ctx.from.id.toString());
    
    await ctx.answerCbQuery('Panel closed!');
    await ctx.deleteMessage();
});

// Start command - Store user connection
smsBot.start((ctx) => {
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id;
    
    // Store connection
    userConnections.set(userId, chatId);
    
    console.log(`✅ User ${userId} started SMS bot, chat ID: ${chatId}`);
    
    // Different welcome message for admin vs regular users
    if (isAdmin(userId)) {
        ctx.reply(
            '👑 *Admin Panel - SMS Alert Bot*\n\n' +
            'Welcome back Admin!\n\n' +
            'Use /admin to open control panel.',
            { parse_mode: 'Markdown' }
        );
    } else {
        ctx.reply(
            '🔔 *SMS Alert Bot Started!*\n\n' +
            'You will now receive notifications about your account balance updates.\n\n' +
            '✅ Connected successfully!',
            { parse_mode: 'Markdown' }
        );
    }
});

// Launch bot
smsBot.launch().then(() => {
    console.log('✅ SMS Alert Bot is running...');
    console.log(`👑 Admin ID: ${SMS_ADMIN_ID}`);
}).catch((error) => {
    console.error('❌ Failed to start SMS bot:', error);
});

// Export functions for use in main bot
module.exports = {
    sendBalanceAlert,
    adminSendMessage,
    getActiveUsers,
    forceContactUser,
    userConnections,
    isAdmin
};
