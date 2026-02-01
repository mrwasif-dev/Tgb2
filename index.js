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

// ======= ADMIN BUTTON ACTIONS =======

// Admin: All Users Stats
bot.action('adminAllUsers', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const userCount = Object.keys(users).length;
    let totalBalance = 0;
    let activeUsers = 0;
    let bannedUsers = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    Object.values(users).forEach(user => {
        totalBalance += user.balance || 0;
        if (user.isBanned) {
            bannedUsers++;
        } else {
            activeUsers++;
        }
        
        // Calculate total deposits and withdrawals from transactions
        if (user.transactions) {
            user.transactions.forEach(transaction => {
                if (transaction.type.includes('Deposit')) {
                    totalDeposits += transaction.amount || 0;
                } else if (transaction.type.includes('Withdrawal')) {
                    totalWithdrawals += transaction.amount || 0;
                }
            });
        }
    });

    const { date, time } = getCurrentDateTime();

    await ctx.reply(
        '📊 All Users Statistics 📊\n\n' +
        `📅 Date: ${date}\n` +
        `⏰ Time: ${time}\n\n` +
        `👥 Total Users: ${userCount}\n` +
        `✅ Active Users: ${activeUsers}\n` +
        `🚫 Banned Users: ${bannedUsers}\n\n` +
        `💰 Total System Balance: ${totalBalance} PKR\n` +
        `📥 Total Deposits: ${totalDeposits} PKR\n` +
        `📤 Total Withdrawals: ${totalWithdrawals} PKR\n\n` +
        `💳 Average Balance per User: ${userCount > 0 ? Math.round(totalBalance / userCount) : 0} PKR`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📋 User List (First 10)', 'adminUserList')],
            [Markup.button.callback('🔄 Refresh Stats', 'adminAllUsers')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

// Admin: User List (First 10)
bot.action('adminUserList', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const userList = Object.entries(users).slice(0, 10);
    let message = '📋 First 10 Users 📋\n\n';

    userList.forEach(([username, user], index) => {
        const status = user.isBanned ? '🚫 BANNED' : '✅ ACTIVE';
        message += `${index + 1}. ${user.firstName} (@${username})\n`;
        message += `   📱 Phone: ${user.phone}\n`;
        message += `   💰 Balance: ${user.balance || 0} PKR\n`;
        message += `   📅 Registered: ${user.registered}\n`;
        message += `   📊 Status: ${status}\n\n`;
    });

    if (Object.keys(users).length > 10) {
        message += `📖 Showing 10 of ${Object.keys(users).length} users\n`;
    }

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔍 Search Specific User', 'adminSearchUser')],
            [Markup.button.callback('📊 Full Stats', 'adminAllUsers')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

// Admin: Search User
bot.action('adminSearchUser', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { flow: 'admin_search', step: 'enter_username' };
    
    await ctx.reply(
        '🔍 Search User 🔍\n\nEnter username to search:\n\n💡 You can search by:\n• Username\n• Phone number\n• First name\n\nEnter search term:'
    );
});

// Admin: Manual Balance Update
bot.action('adminBalanceUpdate', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { flow: 'admin_balance_update', step: 'enter_username' };
    
    await ctx.reply(
        '💰 Manual Balance Update 💰\n\nEnter username of the user whose balance you want to update:\n\nEnter username:'
    );
});

// Admin: View All Transactions
bot.action('adminAllTransactions', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    let allTransactions = [];
    Object.entries(users).forEach(([username, user]) => {
        if (user.transactions && user.transactions.length > 0) {
            user.transactions.forEach(transaction => {
                allTransactions.push({
                    username: username,
                    name: user.firstName,
                    ...transaction
                });
            });
        }
    });

    // Sort by date (newest first)
    allTransactions.sort((a, b) => {
        const dateA = new Date(a.date.split('-').reverse().join('-'));
        const dateB = new Date(b.date.split('-').reverse().join('-'));
        return dateB - dateA;
    });

    const recentTransactions = allTransactions.slice(0, 10);
    
    let message = '📋 Recent All Transactions 📋\n\n';
    
    if (recentTransactions.length === 0) {
        message += 'No transactions found in the system.\n';
    } else {
        recentTransactions.forEach((t, i) => {
            const emoji = t.type.includes('Deposit') ? '📥' : 
                         t.type.includes('Withdrawal') ? '📤' : 
                         t.type.includes('Bot') ? '🤖' : '💳';
            
            message += `${emoji} ${t.type}\n`;
            message += `   👤 User: ${t.name} (@${t.username})\n`;
            message += `   💰 Amount: ${t.amount} PKR\n`;
            message += `   📅 Date: ${t.date} at ${t.time}\n`;
            
            if (t.bonus) message += `   🎁 Bonus: +${t.bonus} PKR\n`;
            if (t.fee) message += `   📉 Fee: -${t.fee} PKR\n`;
            if (t.netAmount) message += `   💵 Net: ${t.netAmount} PKR\n`;
            if (t.status) message += `   📊 Status: ${t.status}\n`;
            
            message += '\n';
        });
        
        if (allTransactions.length > 10) {
            message += `📖 Showing 10 of ${allTransactions.length} total transactions\n\n`;
        }
    }

    message += '💡 Use search to find specific user transactions.';

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔍 Search User Transactions', 'adminSearchUser')],
            [Markup.button.callback('📊 All Users Stats', 'adminAllUsers')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

// Admin: Ban/Unban User
bot.action('adminBanUser', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { flow: 'admin_ban_user', step: 'enter_username' };
    
    await ctx.reply(
        '🚫 Ban/Unban User 🚫\n\nEnter username of the user:\n\nEnter username:'
    );
});

// Admin: Back to Admin Menu
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
            [Markup.button.callback('👤 User Mode', 'userMode')]
        ])
    );
});

// Admin: Switch to User Mode
bot.action('userMode', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    // Clear any admin session
    sessions[ctx.chat.id] = null;
    
    await ctx.reply(
        '👋 Welcome to Paid WhatsApp Bot! 👋\n\n✨ Your Complete WhatsApp Automation Solution ✨\n\n🚀 Features:\n✅ Automated WhatsApp Messaging\n✅ Bulk Message Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n✅ Real-time Analytics\n\n📱 Get Started:\nPlease sign up for a new account or log in to continue:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📝 Sign Up - Create New Account', 'signup')],
            [Markup.button.callback('🔐 Log In - Existing Account', 'login')],
            [Markup.button.callback('📞 Contact Support', 'contactSupport')],
            [Markup.button.callback('👑 Back to Admin', 'backToAdminMenu')]
        ])
    );
});

// ======= ADMIN TEXT HANDLER =======
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    const session = sessions[chatId];
    if (!session) return;

    // ===== ADMIN SEARCH USER =====
    if (session.flow === 'admin_search') {
        if (session.step === 'enter_username') {
            const searchTerm = text.toLowerCase();
            
            // Search in users
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
        }
        return;
    }

    // ===== ADMIN BALANCE UPDATE =====
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

    // ===== ADMIN BAN USER =====
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

    // ===== REGULAR USER FLOWS =====
    // ... (بقایا کوڈ جو پہلے تھا وہی رہے گا)
    // یہاں باقی سائن اپ، لاگ ان، ڈیپوزٹ، وٹھڈرا وغیرہ کا کوڈ وہی رہے گا جو پہلے تھا
    // میں صرف اوپر ایڈمن کے نئے فیچرز شامل کر رہا ہوں
});

// ======= ADMIN CONFIRM ACTIONS =======

// Admin: Confirm Ban User
bot.action(/admin_confirm_ban_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('User not found!', { show_alert: true });
    }

    user.isBanned = true;
    saveUsers();

    const { date, time } = getCurrentDateTime();

    await ctx.editMessageText(
        `✅ User Banned Successfully! ✅\n\n👤 User: @${username}\n👤 Name: ${user.firstName}\n📱 Phone: ${user.phone}\n\n📊 Status: 🚫 BANNED\n\n📅 Date: ${date}\n⏰ Time: ${time}\n\n⚠️ User can no longer:\n• Login to account\n• Deposit funds\n• Withdraw funds\n• Buy bots\n\nUser will see suspension message on login.`,
        Markup.inlineKeyboard([
            [Markup.button.callback(`👤 View ${username}`, `admin_view_user_${username}`)],
            [Markup.button.callback('🚫 Ban Another User', 'adminBanUser')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

// Admin: Confirm Unban User
bot.action(/admin_confirm_unban_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('User not found!', { show_alert: true });
    }

    user.isBanned = false;
    saveUsers();

    const { date, time } = getCurrentDateTime();

    await ctx.editMessageText(
        `✅ User Unbanned Successfully! ✅\n\n👤 User: @${username}\n👤 Name: ${user.firstName}\n📱 Phone: ${user.phone}\n\n📊 Status: ✅ ACTIVE\n\n📅 Date: ${date}\n⏰ Time: ${time}\n\n✅ User can now:\n• Login to account\n• Deposit funds\n• Withdraw funds\n• Buy bots\n\nAll features restored.`,
        Markup.inlineKeyboard([
            [Markup.button.callback(`👤 View ${username}`, `admin_view_user_${username}`)],
            [Markup.button.callback('🚫 Ban Another User', 'adminBanUser')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

// Admin: View Specific User
bot.action(/admin_view_user_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('User not found!', { show_alert: true });
    }

    const status = user.isBanned ? '🚫 BANNED' : '✅ ACTIVE';
    let message = `👤 User Details: @${username} 👤\n\n`;
    message += `📛 Name: ${user.firstName}\n`;
    message += `📱 Phone: ${user.phone}\n`;
    message += `🎂 Date of Birth: ${user.dob}\n`;
    message += `📅 Registered: ${user.registered}\n`;
    message += `💰 Current Balance: ${user.balance || 0} PKR\n`;
    message += `📊 Account Status: ${status}\n\n`;

    // Show daily limits
    const today = getCurrentDateTime().date;
    if (user.dailyDeposits && user.dailyDeposits.date === today) {
        message += `📥 Today's Deposits:\n`;
        message += `   • Amount: ${user.dailyDeposits.amount}/20,000 PKR\n`;
        message += `   • Transactions: ${user.dailyDeposits.count}/5\n\n`;
    }
    
    if (user.dailyWithdrawals && user.dailyWithdrawals.date === today) {
        message += `📤 Today's Withdrawals:\n`;
        message += `   • Amount: ${user.dailyWithdrawals.amount}/15,000 PKR\n`;
        message += `   • Transactions: ${user.dailyWithdrawals.count}/3\n\n`;
    }

    // Show pending requests
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        message += `📥 Pending Deposits: ${user.pendingDeposits.length}\n`;
    }
    
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        message += `📤 Pending Withdrawals: ${user.pendingWithdrawals.length}\n`;
    }

    // Show total transactions
    const totalTransactions = user.transactions ? user.transactions.length : 0;
    message += `\n📊 Total Transactions: ${totalTransactions}`;

    const buttons = [];
    
    // Ban/Unban button
    buttons.push([Markup.button.callback(
        user.isBanned ? '✅ Unban User' : '🚫 Ban User', 
        `admin_confirm_${user.isBanned ? 'unban' : 'ban'}_${username}`
    )]);
    
    // Balance update button
    buttons.push([Markup.button.callback('💰 Update Balance', `admin_balance_update_${username}`)]);
    
    // View transactions button
    buttons.push([Markup.button.callback('📜 View Transactions', `admin_user_transactions_${username}`)]);
    
    // Back buttons
    buttons.push(
        [Markup.button.callback('🔍 Search Another User', 'adminSearchUser')],
        [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
    );

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// Admin: Quick Balance Update for specific user
bot.action(/admin_balance_update_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('User not found!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { 
        flow: 'admin_balance_update', 
        step: 'enter_amount',
        targetUsername: username
    };
    
    await ctx.reply(
        `💰 Update Balance for @${username} 💰\n\nCurrent Balance: ${user.balance || 0} PKR\n\nEnter new balance amount (PKR):\n\n💡 Note: This will REPLACE the current balance.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Cancel', `admin_view_user_${username}`)]
        ])
    );
});

// Admin: View User Transactions
bot.action(/admin_user_transactions_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('User not found!', { show_alert: true });
    }

    if (!user.transactions || user.transactions.length === 0) {
        await ctx.reply(
            `📜 Transactions for @${username} 📜\n\nNo transactions found.\n\nThis user has not made any transactions yet.`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`👤 Back to ${username}`, `admin_view_user_${username}`)],
                [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
            ])
        );
        return;
    }

    const recentTransactions = user.transactions.slice(-10).reverse();
    
    let message = `📜 Recent Transactions: @${username} 📜\n\n`;
    message += `👤 Name: ${user.firstName}\n`;
    message += `📊 Total Transactions: ${user.transactions.length}\n\n`;

    recentTransactions.forEach((t, i) => {
        const emoji = t.type.includes('Deposit') ? '📥' : 
                     t.type.includes('Withdrawal') ? '📤' : 
                     t.type.includes('Bot') ? '🤖' : '💳';
        
        message += `${emoji} ${t.type}\n`;
        message += `   💰 Amount: ${t.amount} PKR\n`;
        message += `   📅 Date: ${t.date} at ${t.time}\n`;
        
        if (t.bonus) message += `   🎁 Bonus: +${t.bonus} PKR\n`;
        if (t.fee) message += `   📉 Fee: -${t.fee} PKR\n`;
        if (t.netAmount) message += `   💵 Net: ${t.netAmount} PKR\n`;
        if (t.status) message += `   📊 Status: ${t.status}\n`;
        if (t.note) message += `   📝 Note: ${t.note}\n`;
        
        message += '\n';
    });

    if (user.transactions.length > 10) {
        message += `📖 Showing last 10 of ${user.transactions.length} transactions\n`;
    }

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback(`👤 Back to ${username}`, `admin_view_user_${username}`)],
            [Markup.button.callback('🔍 Search Another User', 'adminSearchUser')],
            [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
    );
});

// ... (باقی کوڈ جو پہلے تھا وہی رہے گا)
// یہاں ڈیپوزٹ، وٹھڈرا، سائن اپ، لاگ ان وغیرہ کا باقی کوڈ وہی رہے گا

// باقی کوڈ وہی رہے گا جو پہلے تھا، بس اس کے آخر میں نیچے والا حصہ شامل کرنا ہے
