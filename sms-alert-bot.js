const { Telegraf } = require('telegraf');

// SMS Alert Bot Token
const SMS_BOT_TOKEN = '8507060702:AAFpyyTbN3XYUIm8B0fwbw3Adi2hjrSL388';
const smsBot = new Telegraf(SMS_BOT_TOKEN);

// Admin ID (Your Telegram ID)
const SMS_ADMIN_ID = '6012422087'; // Your admin ID from main bot

// Store user connections: userTelegramID -> chatID
const userConnections = new Map();

// Function to send balance alerts (will be called from main bot)
async function sendBalanceAlert(userTelegramId, alertData) {
    try {
        const userChatId = userConnections.get(userTelegramId);
        
        if (!userChatId) {
            console.log(`⚠️ User ${userTelegramId} not connected to SMS bot`);
            return false;
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
                     `📱 Account Number: ${alertData.account}\n` +
                     `🏦 Method: ${alertData.method}`;
        }
        else if (alertData.type === 'bot_purchase') {
            message = `🤖 Bot Purchase Successful!\n\n` +
                     `📅 Date: ${alertData.date}\n` +
                     `⏰ Time: ${alertData.time}\n\n` +
                     `➖ Amount Deducted: ${alertData.amount} PKR\n` +
                     `📦 Product: WhatsApp Bot`;
        }
        else {
            return false;
        }

        // Send message to user
        await smsBot.telegram.sendMessage(userChatId, message);
        console.log(`✅ SMS sent to user ${userTelegramId}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error sending SMS alert:', error.message);
        return false;
    }
}

// SMS Bot Commands
smsBot.start((ctx) => {
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id;
    
    // Save user connection silently
    userConnections.set(userId, chatId);
    
    // Only reply to admin
    if (userId === SMS_ADMIN_ID) {
        ctx.reply(
            '👑 **Admin - SMS Alert Bot** 👑\n\n' +
            '✅ SMS Alert Bot is running.\n\n' +
            `📊 Connected Users: ${userConnections.size}\n` +
            '🤖 Status: Active\n' +
            '📱 Mode: Silent (only admin gets replies)'
        );
        console.log(`👑 Admin ${userId} connected to SMS bot`);
    } else {
        // Normal users - no reply, just store connection
        console.log(`🔗 User ${userId} connected silently`);
    }
});

// Admin-only commands
smsBot.command('status', (ctx) => {
    const userId = ctx.from.id.toString();
    
    // Only admin can see status
    if (userId === SMS_ADMIN_ID) {
        ctx.reply(
            `📊 **SMS Bot Status** 📊\n\n` +
            `👑 Admin: Connected ✅\n` +
            `👥 Total Users: ${userConnections.size}\n` +
            `🤖 Bot Status: Running\n` +
            `📅 Last Updated: ${new Date().toLocaleString()}\n\n` +
            `🔗 This bot sends balance alerts to ${userConnections.size} users silently.`
        );
    }
    // Normal users get no reply
});

smsBot.command('users', (ctx) => {
    const userId = ctx.from.id.toString();
    
    // Only admin can see users list
    if (userId === SMS_ADMIN_ID) {
        let userList = '';
        let count = 1;
        
        userConnections.forEach((chatId, userId) => {
            userList += `${count}. User ID: ${userId}\n`;
            count++;
        });
        
        ctx.reply(
            `👥 **Connected Users** 👥\n\n` +
            `Total: ${userConnections.size} users\n\n` +
            `${userList || 'No users connected yet'}`
        );
    }
    // Normal users get no reply
});

// Help command (only for admin)
smsBot.command('help', (ctx) => {
    const userId = ctx.from.id.toString();
    
    if (userId === SMS_ADMIN_ID) {
        ctx.reply(
            '🆘 **Admin Commands** 🆘\n\n' +
            '/status - Check bot status\n' +
            '/users - List connected users\n' +
            '/help - Show this help\n\n' +
            '📊 Normal users connect silently.\n' +
            '🔔 They only receive balance alerts.'
        );
    }
    // Normal users get no reply
});

// Launch SMS bot
smsBot.launch().then(() => {
    console.log('📱 SMS Alert Bot started successfully!');
    console.log('🤖 Bot is running in SILENT mode');
    console.log(`👑 Admin ID: ${SMS_ADMIN_ID}`);
    console.log(`🔗 Silent users connected: ${userConnections.size}`);
}).catch(error => {
    console.error('❌ Failed to start SMS bot:', error.message);
});

// Export the function for main bot
module.exports = {
    sendBalanceAlert
};

console.log('✨ SMS Alert Bot (Silent Mode) loaded');
