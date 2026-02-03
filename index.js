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

// ======= TEXT HANDLER =======
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

    // ===== ADMIN REJECTION REASON =====
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

    // ===== SIGNUP FLOW =====
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

    // ===== LOGIN FLOW =====
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

    // ======= DEPOSIT FLOW =======
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

    // ======= WITHDRAW FLOW =======
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
                    '❌ Insufficient Balance ❌\n\n📝 Your current balance is ' + user.balance + ' PKR.\n\n💡 Available Options:\n1. Enter a smaller amount\n2. Deposit more funds\n3. Check transaction history\n\n💰 Current Balance: ' + user.balance + ' PKR\n\n🔄 Enter a new amount:'
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

// ===== BUTTON ACTIONS =====

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
    
    if (!hasPending) {
        message = '✅ All Clear! ✅\n\n🎉 You have no pending requests.\n📊 All your transactions are processed.\n\n💡 Ready for your next transaction?';
    }

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📥 New Deposit', 'depositBalance')],
            [Markup.button.callback('📤 New Withdrawal', 'withdrawBalance')],
            [Markup.button.callback('💰 Check Balance', 'checkBalance')],
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

    // ✅ NEW CHECK: Check for existing pending deposit
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        return ctx.reply(
            '⚠️ Pending Deposit Exists ⚠️\n\n📝 You already have a pending deposit request.\n\n💡 Please wait for your current request to be processed:\n\n📥 Pending Deposit:\n• Amount: ' + user.pendingDeposits[0].amount + ' PKR\n• Method: ' + user.pendingDeposits[0].method + '\n• Status: ' + (user.pendingDeposits[0].status || 'Pending') + '\n\n⏰ Processing Time:\n• Usually within 15-30 minutes\n• You will be notified once processed\n\n📞 Need help? Contact support.',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 Check Pending Requests', 'viewPendingRequests')],
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
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
    
    // ✅ NEW CHECK: Verify no pending deposit exists
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        return ctx.answerCbQuery('⚠️ You already have a pending deposit request. Please wait for it to be processed.', { show_alert: true });
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

    // ✅ NEW CHECK: Check for existing pending withdrawal
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        return ctx.reply(
            '⚠️ Pending Withdrawal Exists ⚠️\n\n📝 You already have a pending withdrawal request.\n\n💡 Please wait for your current request to be processed:\n\n📤 Pending Withdrawal:\n• Amount: ' + user.pendingWithdrawals[0].amount + ' PKR\n• Method: ' + user.pendingWithdrawals[0].method + '\n• Status: ' + (user.pendingWithdrawals[0].status || 'Pending') + '\n\n⏰ Processing Time:\n• Usually within 1-2 hours\n• You will be notified once processed\n\n📞 Need help? Contact support.',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 Check Pending Requests', 'viewPendingRequests')],
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
    
    // ✅ NEW CHECK: Verify no pending withdrawal exists
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        return ctx.answerCbQuery('⚠️ You already have a pending withdrawal request. Please wait for it to be processed.', { show_alert: true });
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

    const cost = 100;
    
    if ((user.balance || 0) < cost) {
        return ctx.reply(
            '❌ Insufficient Balance ❌\n\n🤖 Bot Purchase Cost: ' + cost + ' PKR\n💰 Your Current Balance: ' + (user.balance || 0) + ' PKR\n\n💡 You need ' + (cost - user.balance) + ' PKR more to purchase the bot.\n\n📥 Options:\n1. Deposit more funds\n2. Check your balance\n3. View transaction history\n\n🚀 Ready to deposit?',
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('📜 View Transactions', 'viewTransactions')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    user.balance -= cost;
    if (!user.transactions) user.transactions = [];
    const { date, time } = getCurrentDateTime();
    
    user.transactions.push({ 
        type: '🤖 WhatsApp Bot Purchase', 
        amount: cost, 
        date, 
        time 
    });

    saveUsers();
    
    return ctx.reply(
        '🎉 WhatsApp Bot Purchased Successfully! 🎉\n\n✅ Purchase Details:\n🤖 Product: WhatsApp Automation Bot\n💰 Cost: ' + cost + ' PKR\n📅 Date: ' + date + '\n⏰ Time: ' + time + '\n\n💰 Account Update:\n• Previous Balance: ' + (user.balance + cost) + ' PKR\n• New Balance: ' + user.balance + ' PKR\n• Amount Deducted: ' + cost + ' PKR\n\n🚀 Bot Features Activated:\n✅ Automated Messaging\n✅ Bulk Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n\n📋 Next Steps:\n1. Check your email for bot credentials\n2. Set up your WhatsApp connection\n3. Start automating your messages!\n\n📞 Need Setup Help?\nContact our support team for assistance.',
        withBackButton([])
    );
});

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
                     t.type.includes('Bot') ? '🤖' : '💳';
        
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
            [Markup.button.callback('💰 Check Balance', 'checkBalance')],
            [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
        ])
    );
});

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

// ======= BACK BUTTON =====
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

// ======= ADMIN CONFIRM ACTIONS =======

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

// ======= HELPER FUNCTIONS =======
async function processDepositRejection(userChatId, depositId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('👤 User not found.');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingDeposits) {
        await adminCtx.answerCbQuery('📥 No pending deposits.');
        return;
    }

    const depositIndex = user.pendingDeposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
        await adminCtx.answerCbQuery('✅ Deposit already processed.');
        return;
    }

    const deposit = user.pendingDeposits[depositIndex];
    const { date, time } = getCurrentDateTime();

    if (user.dailyDeposits) {
        user.dailyDeposits.count = Math.max(0, user.dailyDeposits.count - 1);
        user.dailyDeposits.amount = Math.max(0, user.dailyDeposits.amount - deposit.amount);
    }

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📥 Deposit Request ❌ (Rejected)',
        amount: deposit.amount,
        date: date,
        time: time,
        proof: deposit.proof,
        status: 'rejected',
        rejectionReason: reason
    });

    await bot.telegram.sendMessage(
        userChatId,
        '❌ Deposit Request Rejected ❌\n\n⚠️ Transaction Details:\n💰 Amount: ' + deposit.amount + ' PKR\n🏦 Method: ' + deposit.method + '\n📝 Transaction ID: ' + deposit.proof + '\n📅 Date: ' + date + '\n⏰ Time: ' + time + '\n\n📝 Rejection Reason:\n' + reason + '\n\n💡 What to do next:\n1. Check the reason above\n2. Contact support if needed\n3. Submit a new request if applicable\n\n📞 Support Available 24/7\nWe\'re here to help!'
    );

    user.pendingDeposits.splice(depositIndex, 1);
    saveUsers();

    await adminCtx.editMessageText(
        '❌ Deposit Request Rejected ❌\n\n👤 User: ' + user.firstName + '\n💰 Amount: ' + deposit.amount + ' PKR\n🏦 Method: ' + deposit.method + '\n📝 Transaction ID: ' + deposit.proof + '\n\n📋 Rejection Reason:\n' + reason
    );
}

async function processWithdrawRejection(userChatId, withdrawId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('👤 User not found.');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) {
        await adminCtx.answerCbQuery('📤 No pending withdrawals.');
        return;
    }

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) {
        await adminCtx.answerCbQuery('✅ Withdrawal already processed.');
        return;
    }

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    user.balance += withdraw.amount;
    
    if (user.dailyWithdrawals) {
        user.dailyWithdrawals.count = Math.max(0, user.dailyWithdrawals.count - 1);
        user.dailyWithdrawals.amount = Math.max(0, user.dailyWithdrawals.amount - withdraw.amount);
    }

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📤 Withdrawal Request ❌ (Rejected)',
        amount: withdraw.amount,
        date: date,
        time: time,
        account: withdraw.account,
        status: 'rejected',
        rejectionReason: reason
    });

    await bot.telegram.sendMessage(
        userChatId,
        '❌ Withdrawal Request Rejected ❌\n\n⚠️ Transaction Details:\n💰 Amount: ' + withdraw.amount + ' PKR\n🏦 Method: ' + withdraw.method + '\n📱 Account: ' + withdraw.account + '\n📅 Date: ' + date + '\n⏰ Time: ' + time + '\n\n📝 Rejection Reason:\n' + reason + '\n\n💰 Balance Update:\n✅ Your balance has been restored.\n• Previous Balance: ' + (user.balance - withdraw.amount) + ' PKR\n• New Balance: ' + user.balance + ' PKR\n• Amount Returned: ' + withdraw.amount + ' PKR\n\n💡 What to do next:\n1. Check the reason above\n2. Contact support if needed\n3. Submit a new request if applicable\n\n📞 Support Available 24/7\nWe\'re here to help!'
    );

    user.pendingWithdrawals.splice(withdrawIndex, 1);
    saveUsers();

    await adminCtx.editMessageText(
        '❌ Withdrawal Request Rejected ❌\n\n👤 User: ' + user.firstName + '\n💰 Amount: ' + withdraw.amount + ' PKR returned to balance\n📱 Account: ' + withdraw.account + '\n🏦 Method: ' + withdraw.method + '\n\n📋 Rejection Reason:\n' + reason
    );
}

// ======= ADMIN APPROVAL FOR DEPOSITS =======
bot.action(/admin_approve_deposit_(\d+)_(dep_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, depositId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('👤 User not found.');

    const user = users[session.usernameKey];
    if (!user.pendingDeposits) return ctx.answerCbQuery('📥 No pending deposits.');

    const depositIndex = user.pendingDeposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) return ctx.answerCbQuery('✅ Deposit already processed.');

    const deposit = user.pendingDeposits[depositIndex];
    const { date, time } = getCurrentDateTime();

    user.balance += deposit.totalAmount;
    
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📥 Deposit ✅ (' + deposit.method + ')',
        amount: deposit.amount,
        bonus: deposit.bonus,
        totalAmount: deposit.totalAmount,
        date: date,
        time: time,
        proof: deposit.proof,
        status: 'approved'
    });

    saveUsers();

    await bot.telegram.sendMessage(
        userChatId,
        '🎉 Deposit Approved Successfully! 🎉\n\n✅ Transaction Details:\n💰 Amount: ' + deposit.amount + ' PKR\n🎁 Bonus (2%): ' + deposit.bonus + ' PKR\n💵 Total Added: ' + deposit.totalAmount + ' PKR\n🏦 Method: ' + deposit.method + '\n📝 Transaction ID: ' + deposit.proof + '\n📅 Date: ' + date + '\n⏰ Time: ' + time + '\n\n💰 Balance Update:\n• Previous Balance: ' + (user.balance - deposit.totalAmount) + ' PKR\n• New Balance: ' + user.balance + ' PKR\n• Amount Added: ' + deposit.totalAmount + ' PKR\n\n✨ Thank you for your deposit!\nYour funds are now available for use.\n\n🚀 Ready for your next transaction?'
    );

    user.pendingDeposits.splice(depositIndex, 1);
    saveUsers();

    await ctx.editMessageText(
        '✅ Deposit Approved Successfully ✅\n\n👤 User: ' + user.firstName + '\n💰 Amount: ' + deposit.amount + ' PKR\n🎁 Bonus: ' + deposit.bonus + ' PKR\n💵 Total: ' + deposit.totalAmount + ' PKR\n🏦 Method: ' + deposit.method + '\n📝 Transaction ID: ' + deposit.proof + '\n\n📊 User Balance Updated: ' + user.balance + ' PKR'
    );
});

bot.action(/admin_reject_deposit_(\d+)_(dep_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, depositId] = ctx.match;
    
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

// ======= ADMIN APPROVAL FOR WITHDRAWALS (TWO-STEP PROCESS) =======
bot.action(/admin_approve_withdraw_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('👤 User not found.');

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) return ctx.answerCbQuery('📤 No pending withdrawals.');

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) return ctx.answerCbQuery('✅ Withdrawal already processed.');

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    withdraw.status = 'processing';
    withdraw.approvedDate = date;
    withdraw.approvedTime = time;

    saveUsers();

    await bot.telegram.sendMessage(
        userChatId,
        '✅ Withdrawal Request Approved! ✅\n\n🎉 Great news! Your withdrawal has been approved.\n\n📋 Transaction Details:\n💰 Amount: ' + withdraw.amount + ' PKR\n📉 Processing Fee: ' + withdraw.fee + ' PKR\n💵 Net Amount: ' + withdraw.netAmount + ' PKR\n🏦 Method: ' + withdraw.method + '\n📱 Account: ' + withdraw.account + '\n📅 Date: ' + date + '\n⏰ Time: ' + time + '\n\n🔄 Current Status: Funds Transfer in Progress ⏳\n\n💡 What happens next:\n1. Funds are being transferred to your account\n2. Usually takes 1-2 hours\n3. You\'ll get another notification upon completion\n\n📞 Need help? Contact support 24/7.'
    );

    await ctx.editMessageText(
        '✅ Withdrawal Approved & Transfer Initiated ✅\n\n👤 User Information:\n• Name: ' + user.firstName + '\n• Username: ' + session.usernameKey + '\n• Phone: ' + user.phone + '\n\n💵 Transaction Details:\n• Amount: ' + withdraw.amount + ' PKR\n• Fee: ' + withdraw.fee + ' PKR\n• Net: ' + withdraw.netAmount + ' PKR\n• Method: ' + withdraw.method + '\n• Account: ' + withdraw.account + '\n\n📅 Approval Time:\n• Date: ' + date + '\n• Time: ' + time + '\n\n⚠️ Status: Funds Transfer in Progress ⏳\nPlease confirm when funds have been transferred.',
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Funds Transfer Completed', `fund_transfer_success_${userChatId}_${withdrawId}`)]
        ])
    );
});

// ======= FUND TRANSFER SUCCESS =======
bot.action(/fund_transfer_success_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('👤 User not found.');

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) return ctx.answerCbQuery('📤 No pending withdrawals.');

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) return ctx.answerCbQuery('✅ Withdrawal already completed.');

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    withdraw.status = 'completed';
    withdraw.completedDate = date;
    withdraw.completedTime = time;

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📤 Withdrawal ✅ (' + withdraw.method + ')',
        amount: withdraw.amount,
        netAmount: withdraw.netAmount,
        fee: withdraw.fee,
        date: date,
        time: time,
        account: withdraw.account,
        status: 'completed'
    });

    saveUsers();

    await bot.telegram.sendMessage(
        userChatId,
        '🎉 Funds Transfer Successful! 🎉\n\n✅ Transaction Completed Successfully\n\n📋 Transaction Summary:\n💰 Amount: ' + withdraw.amount + ' PKR\n📉 Processing Fee: ' + withdraw.fee + ' PKR\n💵 Net Amount Sent: ' + withdraw.netAmount + ' PKR\n🏦 Payment Method: ' + withdraw.method + '\n📱 Account Number: ' + withdraw.account + '\n📅 Transfer Date: ' + date + '\n⏰ Transfer Time: ' + time + '\n\n✅ Status: Successfully Transferred ✅\n\n💡 Next Steps:\n1. Check your ' + withdraw.method + ' account\n2. Confirm receipt of funds\n3. Contact us if any issues\n\n✨ Thank you for using our service!\nWe look forward to serving you again.\n\n📞 24/7 Support Available'
    );

    await ctx.editMessageText(
        '✅ Funds Transfer Completed Successfully ✅\n\n👤 User Information:\n• Name: ' + user.firstName + '\n• Username: ' + session.usernameKey + '\n• Phone: ' + user.phone + '\n\n💵 Transaction Details:\n• Amount: ' + withdraw.amount + ' PKR\n• Fee: ' + withdraw.fee + ' PKR\n• Net Sent: ' + withdraw.netAmount + ' PKR\n• Method: ' + withdraw.method + '\n• Account: ' + withdraw.account + '\n\n📅 Completion Time:\n• Date: ' + date + '\n• Time: ' + time + '\n\n✅ Status: Transfer Completed Successfully'
    );

    user.pendingWithdrawals.splice(withdrawIndex, 1);
    saveUsers();
});

bot.action(/admin_reject_withdraw_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    
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
console.log('🤖 Bot running successfully...');
console.log('✨ All features activated');
console.log('🔒 Security protocols enabled');
console.log('💰 Payment system ready');
console.log('📱 WhatsApp bot integration active');
console.log('👑 Admin features loaded');
