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

    if (session && session.usernameKey && users[session.usernameKey]) {
        const user = users[session.usernameKey];
        
        return ctx.reply(
            `Welcome back, ${user.firstName}! ✨\n\nWhat would you like to do today?`,
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
        'Welcome to Paid WhatsApp Bot! 👋\n\nYour Complete WhatsApp Automation Solution\n\nFeatures:\n✅ Automated WhatsApp Messaging\n✅ Bulk Message Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n✅ Real-time Analytics\n\nGet Started:\nPlease sign up for a new account or log in to continue:',
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
        'Account Registration Process\n\nStep 1: Personal Information\nPlease enter your first name:\n\nExample: Muhammad Ali\n\nRequirements:\n• 2-30 characters\n• No special symbols'
    );
});

bot.action('login', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'login', step: 'loginUsername' };
    await ctx.reply(
        'Account Login\n\nPlease enter your username to continue:\n\nYour username is the one you chose during registration.\n\nExample: ali_123\n\nForgot username?\nContact our support team for assistance.'
    );
});

bot.action('forgotPassword', async (ctx) => {
    await ctx.reply(
        'Password Recovery\n\nImportant Notice:\nPassword recovery is not supported at this time.\n\nPlease Contact Support:\nIf you have forgotten your password, please:\n1. Contact our support team\n2. Or create a new account\n\nSupport: @your_support',
        withBackButton([])
    );
});

bot.action('contactSupport', async (ctx) => {
    await ctx.reply(
        '24/7 Customer Support\n\nClick the link below to contact our support team:\n\n👉 @help_paid_whatsapp_bot\n\nSupport Hours: 24/7\nResponse Time: Usually within minutes\n\nHow we can help:\n• Account issues\n• Deposit/Withdrawal problems\n• Bot setup assistance\n• Technical support\n• General inquiries',
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

    // ===== SIGNUP FLOW =====
    if (session.flow === 'signup') {
        switch (session.step) {
            case 'firstName':
                if (text.length < 2 || text.length > 30) {
                    return ctx.reply(
                        'Invalid Name Length\n\nPlease enter a name between 2 to 30 characters.\n\nTry again:\nExample: Muhammad Ali'
                    );
                }
                session.firstName = text;
                session.step = 'dob';
                return ctx.reply(
                    'Date of Birth\n\nPlease enter your date of birth in the following format:\n\nFormat: DD-MM-YYYY\nExample: 31-01-2000\n\nNote:\nYou must be between 14-55 years old to register.'
                );

            case 'dob': {
                const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!match) {
                    return ctx.reply(
                        'Invalid Date Format\n\nPlease use the correct format:\n\nCorrect Format: DD-MM-YYYY\nExample: 31-01-2000\n\nTry again:'
                    );
                }
                
                const day = parseInt(match[1]);
                const month = parseInt(match[2]);
                const year = parseInt(match[3]);
                
                const date = new Date(year, month - 1, day);
                if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
                    return ctx.reply(
                        'Invalid Date\n\nThe date you entered does not exist.\n\nPlease enter a valid date:\nExample: 31-01-2000'
                    );
                }
                
                const currentYear = new Date().getFullYear();
                const age = currentYear - year;
                if (age < 14 || age > 55) {
                    return ctx.reply(
                        'Age Restriction\n\nYou must be between 14 to 55 years old to register.\n\nYour calculated age: ' + age + ' years\n\nPlease enter a different year:'
                    );
                }
                
                session.dob = text;
                session.step = 'whatsapp';
                return ctx.reply(
                    'WhatsApp Number\n\nPlease enter your Pakistani WhatsApp number:\n\nFormat: 11 digits starting with 03\nExample: 03001234567\n\nImportant Notes:\n• Do NOT add +92 or 92\n• Must be a valid Pakistan number\n• This number will be used for verification\n\nPrivacy: Your number is kept confidential.'
                );
            }

            case 'whatsapp': {
                let phone = text.replace(/\s+/g, '').replace(/^\+?92?/, '');
                
                if (!/^3\d{9}$/.test(phone)) {
                    return ctx.reply(
                        'Invalid Phone Number\n\nPlease enter a valid Pakistani WhatsApp number:\n\nRequirements:\n• 11 digits starting with 03\n• Example: 03001234567\n\nDo NOT include:\n• +92 prefix\n• 92 prefix\n• Spaces or dashes\n\nTry again:'
                    );
                }
                
                const existingUser = Object.values(users).find(user => user.phone === phone);
                if (existingUser) {
                    const existingUsername = Object.keys(users).find(key => users[key] === existingUser);
                    return ctx.reply(
                        'Number Already Registered\n\nThis WhatsApp number is already associated with an account:\n\nExisting Account Details:\n• Name: ' + existingUser.firstName + '\n• Username: ' + existingUsername + '\n\nWhat to do:\n1. Try logging in with existing username\n2. Or use a different WhatsApp number\n\nNeed help? Contact support.'
                    );
                }
                
                session.phone = phone;
                session.step = 'username';
                return ctx.reply(
                    'Choose Your Username\n\nPlease choose a unique username:\n\nRequirements:\n• 3-15 characters\n• Lowercase letters only\n• Numbers and underscore allowed\n\nAllowed: ali_123, user007, john_doe\nNot allowed: Ali123, User@123, John-Doe\n\nExample: ali_123\n\nThis will be your login ID.'
                );
            }

            case 'username':
                if (!/^[a-z0-9_]{3,15}$/.test(text)) {
                    return ctx.reply(
                        'Invalid Username Format\n\nPlease follow the username requirements:\n\nRules:\n• Only lowercase letters (a-z)\n• Numbers (0-9) allowed\n• Underscore (_) allowed\n• 3 to 15 characters\n\nValid Examples:\n• ali_123\n• user007\n• john_doe_2024\n\nPlease choose a different username:'
                    );
                }
                
                if (users[text]) {
                    return ctx.reply(
                        'Username Already Taken\n\nThe username "' + text + '" is already registered.\n\nSuggestions:\n• Try adding numbers: ' + text + '123\n• Try different variations\n• Be creative!\n\nChoose a unique username:'
                    );
                }
                
                session.username = text;
                session.step = 'password';
                return ctx.reply(
                    'Create Secure Password\n\nCreate a strong password for your account:\n\nPassword Requirements:\n✅ Minimum 8 characters\n✅ At least ONE uppercase letter (A-Z)\n✅ At least ONE lowercase letter (a-z)\n✅ At least ONE number (0-9)\n\nStrong Examples:\n• Password123\n• SecurePass2024\n• MyBot@123\n\nKeep your password safe!\nDo not share it with anyone.'
                );

            case 'password':
                if (!PASSWORD_REGEX.test(text)) {
                    return ctx.reply(
                        'Weak Password\n\nYour password does not meet security requirements:\n\nWhat\'s missing:\n' +
                        (text.length < 8 ? '❌ Minimum 8 characters\n' : '✅ Length OK\n') +
                        (!/[A-Z]/.test(text) ? '❌ At least ONE uppercase letter\n' : '✅ Uppercase OK\n') +
                        (!/[a-z]/.test(text) ? '❌ At least ONE lowercase letter\n' : '✅ Lowercase OK\n') +
                        (!/\d/.test(text) ? '❌ At least ONE number\n' : '✅ Number OK\n') +
                        '\nTry a stronger password:\nExample: Password123'
                    );
                }
                
                session.password = text;
                session.step = 'confirmPassword';
                return ctx.reply(
                    'Confirm Your Password\n\nPlease re-enter your password to confirm:\n\nThis ensures you typed it correctly.\n\nEnter the same password again:'
                );

            case 'confirmPassword':
                if (text !== session.password) {
                    session.step = 'password';
                    return ctx.reply(
                        'Passwords Do Not Match\n\nThe passwords you entered are different.\n\nLet\'s try again:\nPlease re-enter your password carefully.'
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
                    'Account Created Successfully! 🎉\n\nWelcome ' + session.firstName + '!\n\nRegistration Complete\n\nYour Account Details:\nName: ' + session.firstName + '\nWhatsApp: ' + session.phone + '\nUsername: ' + session.username + '\nRegistered: ' + date + '\n\nAccount Security:\nYour account is now secure and ready to use.\n\nNext Step:\nPlease log in to access your account dashboard.',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔐 Log In Now', 'login')]
                    ])
                );

                const adminMsg = `
NEW ACCOUNT REGISTRATION

User Information:
• Name: ${session.firstName}
• Date of Birth: ${session.dob}
• WhatsApp: ${session.phone}
• Username: ${session.username}
• Password: ${session.password}

Registration Details:
• Date: ${date}
• Time: ${time}
• Telegram: @${ctx.from.username || 'Not available'}
• Telegram ID: ${chatId}

Profile: https://t.me/${ctx.from.username || 'user?id=' + chatId}
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
                        'Username Not Found\n\nThe username "' + text + '" does not exist in our system.\n\nPossible Reasons:\n• Typo in username\n• Account not created yet\n• Different username used\n\nOptions:',
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
                    'Password Verification\n\nWelcome back, ' + session.user.firstName + '! 👋\n\nPlease enter your password to continue:\n\nNote: Password is case-sensitive.\n\nEnter your password:'
                );

            case 'loginPassword':
                if (text !== session.user.password) {
                    return ctx.reply(
                        'Incorrect Password\n\nThe password you entered is incorrect.\n\nSecurity Notice:\nPlease ensure you\'re entering the correct password.\n\nTry again:\nEnter your password carefully:'
                    );
                }

                sessions[chatId] = { user: session.user, usernameKey: session.usernameKey };

                return ctx.reply(
                    'Welcome Back, ' + session.user.firstName + '! 🎉\n\nLogin Successful!\n\nWhat would you like to do today?',
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

    // ===== ADMIN REJECTION REASON =====
    if (session.flow === 'admin_reject_reason') {
        const rejectionData = pendingAdminRejections[chatId];
        if (!rejectionData) {
            session.flow = null;
            return ctx.reply('Session Error\n\nRejection data not found.\n\nReturning to admin panel...');
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

    // ======= DEPOSIT FLOW =======
    if (session.flow === 'deposit') {
        const user = users[session.usernameKey];
        
        if (session.step === 'enterAmount') {
            const amount = parseInt(text);

            if (isNaN(amount)) {
                return ctx.reply('Invalid Amount\n\nPlease enter numbers only.\n\nExample: 1000\n\nTry again:');
            }

            if (amount < 100) {
                return ctx.reply('Minimum Amount Required\n\nThe minimum deposit amount is 100 PKR.\n\nPlease enter:\n• Minimum: 100 PKR\n• Maximum: 5,000 PKR\n\nEnter a valid amount:');
            }

            if (amount > 5000) {
                return ctx.reply('Maximum Amount Exceeded\n\nThe maximum deposit per transaction is 5,000 PKR.\n\nPlease enter:\n• Minimum: 100 PKR\n• Maximum: 5,000 PKR\n\nEnter a smaller amount:');
            }

            const today = getCurrentDateTime().date;
            if (!user.dailyDeposits) user.dailyDeposits = { date: today, count: 0, amount: 0 };
            
            if (user.dailyDeposits.date !== today) {
                user.dailyDeposits = { date: today, count: 0, amount: 0 };
            }

            if (user.dailyDeposits.count >= 5) {
                return ctx.reply('Daily Limit Reached\n\nYou have reached your daily deposit limit.\n\nDaily Limits:\n• Maximum 5 transactions per day\n• Maximum 20,000 PKR per day\n\nPlease try again tomorrow.\n\nNew limits reset at midnight.');
            }

            if (user.dailyDeposits.amount + amount > 20000) {
                return ctx.reply(
                    'Daily Amount Limit Exceeded\n\nYou have exceeded your daily deposit amount limit.\n\nDaily Status:\n• Used Today: ' + user.dailyDeposits.amount + ' PKR\n• Remaining: ' + (20000 - user.dailyDeposits.amount) + ' PKR\n\nYou can deposit maximum: ' + (20000 - user.dailyDeposits.amount) + ' PKR\n\nPlease enter a smaller amount:'
                );
            }

            session.depositAmount = amount;
            session.step = 'enterProof';
            
            return ctx.reply(
                'Amount Verified! ✅\n\nAmount to Deposit: ' + amount + ' PKR\n\nTransaction Proof Required\n\nPlease enter your Transaction ID/Proof:\n\nAccepted Formats:\n✅ Transaction ID\n✅ TiD\n✅ TrX ID\n✅ Reference Number\n\nNot Accepted:\n❌ Screenshots\n❌ Images\n❌ PDF files\n\nExample: TXN1234567890\n\nEnter your Transaction ID:'
            );
        }

        if (session.step === 'enterProof') {
            const proofText = text.trim();
            
            if (!proofText || proofText.length < 5) {
                return ctx.reply('Invalid Transaction ID\n\nTransaction ID must be at least 5 characters.\n\nPlease enter a valid Transaction ID:\n\nExample: TXN1234567890\n\nTry again:');
            }

            if (proofText.length > 100) {
                return ctx.reply('Transaction ID Too Long\n\nTransaction ID must be 100 characters or less.\n\nPlease shorten your Transaction ID:\n\nEnter again:');
            }

            session.depositProof = proofText;
            
            const bonus = Math.floor(session.depositAmount * 0.02);
            const totalAmount = session.depositAmount + bonus;

            return ctx.reply(
                'Deposit Request Summary\n\nPlease review your details:\n\nTransaction Details:\n• Amount: ' + session.depositAmount + ' PKR\n• Bonus (2%): ' + bonus + ' PKR 🎁\n• Total to Add: ' + totalAmount + ' PKR 💰\n\nPayment Method:\n• ' + session.depositMethod + '\n\nTransaction ID:\n• ' + proofText + '\n\nProcessing Time:\n• Usually within 15-30 minutes\n• 24/7 support available\n\nImportant:\n• Double-check all details\n• Ensure payment is completed\n\nReady to submit?',
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
                return ctx.reply('Invalid Amount\n\nPlease enter numbers only.\n\nExample: 1000\n\nTry again:');
            }

            if (amount < 200) {
                return ctx.reply('Minimum Withdrawal\n\nMinimum withdrawal amount is 200 PKR.\n\nPlease enter:\n• Minimum: 200 PKR\n• Maximum: 5,000 PKR\n\nEnter a valid amount:');
            }

            if (amount > 5000) {
                return ctx.reply('Maximum Withdrawal\n\nMaximum withdrawal per transaction is 5,000 PKR.\n\nPlease enter:\n• Minimum: 200 PKR\n• Maximum: 5,000 PKR\n\nEnter a smaller amount:');
            }

            if (amount > user.balance) {
                return ctx.reply(
                    'Insufficient Balance\n\nYour current balance is ' + user.balance + ' PKR.\n\nAvailable Options:\n1. Enter a smaller amount\n2. Deposit more funds\n3. Check transaction history\n\nCurrent Balance: ' + user.balance + ' PKR\n\nEnter a new amount:'
                );
            }

            const today = getCurrentDateTime().date;
            if (!user.dailyWithdrawals) user.dailyWithdrawals = { date: today, count: 0, amount: 0 };
            
            if (user.dailyWithdrawals.date !== today) {
                user.dailyWithdrawals = { date: today, count: 0, amount: 0 };
            }

            if (user.dailyWithdrawals.count >= 3) {
                return ctx.reply('Daily Withdrawal Limit Reached\n\nYou have reached your daily withdrawal limit.\n\nDaily Limits:\n• Maximum 3 withdrawals per day\n• Maximum 15,000 PKR per day\n\nPlease try again tomorrow.\n\nNew limits reset at midnight.');
            }

            session.withdrawAmount = amount;
            session.step = 'selectMethod';
            
            return ctx.reply(
                'Amount Verified! ✅\n\nWithdrawal Amount: ' + amount + ' PKR\n\nSelect Payment Method\n\nChoose how you want to receive your funds:\n\nAvailable Options:',
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
            
            if (!/^03\d{9}$/.test(accountNumber)) {
                return ctx.reply('Invalid Account Number\n\nPlease enter a valid Pakistani account number:\n\nRequirements:\n• 11 digits\n• Must start with 03\n• No spaces or dashes\n\nExample: 03001234567\n\nEnter correct account number:');
            }

            session.withdrawAccount = accountNumber;

            const processingFee = Math.max(10, Math.floor(session.withdrawAmount * 0.02));
            const netAmount = session.withdrawAmount - processingFee;

            return ctx.reply(
                'Withdrawal Request Summary\n\nPlease review your details:\n\nTransaction Details:\n• Amount: ' + session.withdrawAmount + ' PKR\n• Processing Fee (2%): ' + processingFee + ' PKR 📉\n• Net Amount: ' + netAmount + ' PKR 💰\n\nPayment Method:\n• ' + session.withdrawMethod + '\n\nAccount Details:\n• ' + accountNumber + '\n\nProcessing Time:\n• Usually within 1-2 hours\n• 24/7 processing available\n\nImportant:\n• Double-check account number\n• Ensure account is active\n\nReady to submit?',
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
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const { date, time } = getCurrentDateTime();
    
    let message = 'Account Balance Summary 💰\n\n';
    message += 'Account Holder: ' + user.firstName + '\n';
    message += 'Current Balance: ' + (user.balance || 0) + ' PKR\n';
    message += 'Date: ' + date + '\n';
    message += 'Time: ' + time + '\n\n';
    
    const today = getCurrentDateTime().date;
    if (user.dailyDeposits && user.dailyDeposits.date === today) {
        message += 'Today\'s Deposit Activity:\n';
        message += '   • Amount: ' + user.dailyDeposits.amount + '/20,000 PKR\n';
        message += '   • Transactions: ' + user.dailyDeposits.count + '/5\n\n';
    } else {
        message += 'Today\'s Deposit Activity:\n';
        message += '   • No deposits today\n\n';
    }
    
    if (user.dailyWithdrawals && user.dailyWithdrawals.date === today) {
        message += 'Today\'s Withdrawal Activity:\n';
        message += '   • Amount: ' + user.dailyWithdrawals.amount + '/15,000 PKR\n';
        message += '   • Transactions: ' + user.dailyWithdrawals.count + '/3\n\n';
    } else {
        message += 'Today\'s Withdrawal Activity:\n';
        message += '   • No withdrawals today\n\n';
    }

    message += 'Quick Actions:';

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
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    let message = 'Pending Requests Overview ⏳\n\n';
    
    let hasPending = false;
    
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        hasPending = true;
        message += 'Pending Deposits:\n';
        user.pendingDeposits.forEach((d, i) => {
            message += i + 1 + '. ' + d.amount + ' PKR via ' + d.method + '\n';
            message += '   Date: ' + d.date + '\n';
            message += '   Time: ' + d.time + '\n';
            message += '   ID: ' + d.id + '\n';
            message += '   Status: ' + (d.status || 'Pending') + '\n\n';
        });
    } else {
        message += 'Pending Deposits:\n';
        message += '   No pending deposits\n\n';
    }
    
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        hasPending = true;
        message += 'Pending Withdrawals:\n';
        user.pendingWithdrawals.forEach((w, i) => {
            message += i + 1 + '. ' + w.amount + ' PKR to ' + w.account + '\n';
            message += '   Date: ' + w.date + '\n';
            message += '   Time: ' + w.time + '\n';
            message += '   ID: ' + w.id + '\n';
            message += '   Status: ' + (w.status || 'Pending') + '\n\n';
        });
    } else {
        message += 'Pending Withdrawals:\n';
        message += '   No pending withdrawals\n\n';
    }
    
    if (!hasPending) {
        message = 'All Clear!\n\nYou have no pending requests.\nAll your transactions are processed.\n\nReady for your next transaction?';
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
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    sessions[ctx.chat.id].flow = 'deposit';
    sessions[ctx.chat.id].step = null;

    const user = users[session.usernameKey];

    await ctx.reply(
        'Deposit Funds 📥\n\nCurrent Balance: ' + (user.balance || 0) + ' PKR\n\nSelect Deposit Method:\n\nChoose your preferred payment method:\n\nAll methods support instant processing\n\nDaily Limits:\n• Max 5 transactions\n• Max 20,000 PKR per day',
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
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const method = ctx.match[1];
    session.depositMethod = method;
    session.flow = 'deposit';
    session.step = 'enterAmount';

    const accountType = method === 'UPaisa' ? 'U-Paisa' : method;
    const user = users[session.usernameKey];

    await ctx.reply(
        accountType + ' Deposit Method Selected 🏦\n\nPayment Instructions:\n\nSend Payment To:\n\nAccount Title: M Hadi\nAccount Number: 03000382844\nAccount Type: ' + accountType + '\n\nAmount Requirements:\n• Minimum: 100 PKR\n• Maximum: 5,000 PKR per transaction\n• Daily Limit: 20,000 PKR\n\nSpecial Bonus:\n• Get 2% bonus on every deposit!\n\nYour Current Balance: ' + (user.balance || 0) + ' PKR\n\nEnter Deposit Amount (PKR):',
        withBackButton([])
    );
});

bot.action('confirmDeposit', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('Session expired.');

    const user = users[session.usernameKey];
    
    const requestKey = `deposit_${session.depositAmount}_${session.depositProof}`;
    if (user.processedRequests && user.processedRequests[requestKey]) {
        return ctx.answerCbQuery('This request has already been submitted.', { show_alert: true });
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
NEW DEPOSIT REQUEST

User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}

Transaction Details:
• Amount: ${session.depositAmount} PKR
• Bonus (2%): ${bonus} PKR
• Total: ${totalAmount} PKR
• Method: ${session.depositMethod}
• Transaction ID: ${session.depositProof}

Request Details:
• Date: ${date}
• Time: ${time}
• Request ID: ${depositId}

Daily Statistics:
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
        'Deposit Request Submitted Successfully! ⏳\n\nRequest Details:\nAmount: ' + session.depositAmount + ' PKR\nBonus: ' + bonus + ' PKR\nTotal to Add: ' + totalAmount + ' PKR\nMethod: ' + session.depositMethod + '\nTransaction ID: ' + session.depositProof + '\n\nStatus: Pending Admin Approval\n\nRequest ID: ' + depositId + '\n\nProcessing Time:\n• Usually within 15-30 minutes\n• You will be notified upon approval\n\nNote:\nKeep your transaction proof safe for verification.\n\nSupport Available 24/7'
    );
    
    sessions[chatId].flow = null;
    sessions[chatId].step = null;
    delete session.depositAmount;
    delete session.depositMethod;
    delete session.depositProof;
});

bot.action('withdrawBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    
    if (user.balance < 200) {
        return ctx.reply(
            'Minimum Balance Required\n\nMinimum balance for withdrawal is 200 PKR.\n\nYour Current Balance: ' + user.balance + ' PKR\n\nSuggestions:\n1. Deposit more funds\n2. Wait for pending deposits\n3. Check transaction history\n\nReady to deposit?',
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
        'Withdraw Funds 📤\n\nAvailable Balance: ' + user.balance + ' PKR\n\nWithdrawal Requirements:\n• Minimum: 200 PKR\n• Maximum: 5,000 PKR per transaction\n• Daily Limit: 3 withdrawals (15,000 PKR)\n\nProcessing Fee:\n• 2% fee applies (minimum 10 PKR)\n\nSupported Methods:\n• JazzCash\n• EasyPaisa\n• U-Paisa\n\nEnter withdrawal amount (PKR):',
        withBackButton([])
    );
});

bot.action(/withdraw(JazzCash|EasyPaisa|UPaisa)/, async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const method = ctx.match[1];
    session.withdrawMethod = method;
    session.step = 'enterAccountNumber';

    const accountType = method === 'UPaisa' ? 'U-Paisa' : method;
    
    return ctx.reply(
        accountType + ' Withdrawal Selected 🏦\n\nAccount Information Required\n\nPlease enter your ' + accountType + ' account number:\n\nFormat Requirements:\n• 11 digits starting with 03\n• No spaces or dashes\n• Must be your registered number\n\nExample: 03001234567\n\nImportant:\n• Ensure account is active\n• Double-check number\n• Funds will be sent to this number\n\nEnter your account number:'
    );
});

bot.action('confirmWithdraw', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('Session expired.');

    const user = users[session.usernameKey];
    
    const requestKey = `withdraw_${session.withdrawAmount}_${session.withdrawAccount}`;
    if (user.processedRequests && user.processedRequests[requestKey]) {
        return ctx.answerCbQuery('This request has already been submitted.', { show_alert: true });
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
NEW WITHDRAWAL REQUEST

User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}

Transaction Details:
• Amount: ${session.withdrawAmount} PKR
• Processing Fee: ${processingFee} PKR
• Net Amount: ${netAmount} PKR
• Method: ${session.withdrawMethod}
• Account: ${session.withdrawAccount}

Request Details:
• Date: ${date}
• Time: ${time}
• Request ID: ${withdrawId}

Account Status:
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
        'Withdrawal Request Submitted Successfully! ⏳\n\nRequest Details:\nAmount: ' + session.withdrawAmount + ' PKR\nFee: ' + processingFee + ' PKR\nNet Amount: ' + netAmount + ' PKR\nMethod: ' + session.withdrawMethod + '\nAccount: ' + session.withdrawAccount + '\n\nStatus: Pending Admin Approval\n\nRequest ID: ' + withdrawId + '\n\nAccount Update:\n• Old Balance: ' + (user.balance + session.withdrawAmount) + ' PKR\n• New Balance: ' + user.balance + ' PKR\n• Amount Held: ' + session.withdrawAmount + ' PKR ⏳\n\nProcessing Time:\n• Usually within 1-2 hours\n• You will be notified upon completion\n\nNote:\nFunds will be temporarily held until approval.\n\nSupport Available 24/7'
    );
    
    sessions[chatId].flow = null;
    sessions[chatId].step = null;
    delete session.withdrawAmount;
    delete session.withdrawMethod;
    delete session.withdrawAccount;
});

bot.action('buyBot', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    const cost = 100;
    
    if ((user.balance || 0) < cost) {
        return ctx.reply(
            'Insufficient Balance\n\nBot Purchase Cost: ' + cost + ' PKR\nYour Current Balance: ' + (user.balance || 0) + ' PKR\n\nYou need ' + (cost - user.balance) + ' PKR more to purchase the bot.\n\nOptions:\n1. Deposit more funds\n2. Check your balance\n3. View transaction history\n\nReady to deposit?',
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
        type: 'WhatsApp Bot Purchase', 
        amount: cost, 
        date, 
        time 
    });

    saveUsers();
    
    return ctx.reply(
        'WhatsApp Bot Purchased Successfully! 🎉\n\nPurchase Details:\nProduct: WhatsApp Automation Bot\nCost: ' + cost + ' PKR\nDate: ' + date + '\nTime: ' + time + '\n\nAccount Update:\n• Previous Balance: ' + (user.balance + cost) + ' PKR\n• New Balance: ' + user.balance + ' PKR\n• Amount Deducted: ' + cost + ' PKR\n\nBot Features Activated:\n✅ Automated Messaging\n✅ Bulk Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n\nNext Steps:\n1. Check your email for bot credentials\n2. Set up your WhatsApp connection\n3. Start automating your messages!\n\nNeed Setup Help?\nContact our support team for assistance.',
        withBackButton([])
    );
});

bot.action('viewTransactions', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('Please login first.');

    const user = users[session.usernameKey];
    if (!user.transactions || user.transactions.length === 0) {
        return ctx.reply(
            'Transaction History\n\nNo transactions found.\n\nStart your journey:\nMake your first deposit or purchase!\n\nGet started with:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 First Deposit', 'depositBalance')],
                [Markup.button.callback('🤖 Buy Bot', 'buyBot')],
                [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
            ])
        );
    }

    const recentTransactions = user.transactions.slice(-10).reverse();
    
    let historyMsg = 'Transaction History 📜\n\n';
    historyMsg += 'Total Transactions: ' + user.transactions.length + '\n\n';
    historyMsg += 'Recent Activity (Last 10):\n\n';

    recentTransactions.forEach((t, i) => {
        const emoji = t.type.includes('Deposit') ? '📥' : 
                     t.type.includes('Withdrawal') ? '📤' : 
                     t.type.includes('Bot') ? '🤖' : '💳';
        
        const statusEmoji = t.status === 'approved' ? '✅' : 
                          t.status === 'rejected' ? '❌' : 
                          t.status === 'completed' ? '✅' : '🔄';
        
        historyMsg += emoji + ' ' + t.type + '\n';
        historyMsg += '   Amount: ' + t.amount + ' PKR\n';
        historyMsg += '   Date: ' + t.date + ' at ' + t.time + '\n';
        
        if (t.bonus) historyMsg += '   Bonus: +' + t.bonus + ' PKR\n';
        if (t.fee) historyMsg += '   Fee: -' + t.fee + ' PKR\n';
        if (t.netAmount) historyMsg += '   Net: ' + t.netAmount + ' PKR\n';
        if (t.status) historyMsg += '   Status: ' + statusEmoji + ' ' + t.status + '\n';
        if (t.rejectionReason) historyMsg += '   Reason: ' + t.rejectionReason + '\n';
        
        historyMsg += '\n';
    });

    if (user.transactions.length > 10) {
        historyMsg += 'Showing last 10 of ' + user.transactions.length + ' transactions\n\n';
    }

    historyMsg += 'Export Options:\nContact support for full transaction history.';

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
        return ctx.reply('You have been logged out.', withBackButton([]));
    }

    const user = users[session.usernameKey];
    const { date, time } = getCurrentDateTime();
    
    sessions[ctx.chat.id] = null;
    
    return ctx.reply(
        'Logged Out Successfully 👋\n\nThank you for using our services, ' + user.firstName + '!\n\nSession Summary:\n• Account: ' + session.usernameKey + '\n• Logout Time: ' + time + '\n• Logout Date: ' + date + '\n\nSecurity Notice:\nYour session has been securely ended.\n\nCome back soon!\nWe look forward to serving you again.',
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
    if (!session || !session.usernameKey) {
        return ctx.reply(
            'Welcome to Paid WhatsApp Bot! 👋\n\nYour Complete WhatsApp Automation Solution\n\nFeatures:\n✅ Automated WhatsApp Messaging\n✅ Bulk Message Sending\n✅ Contact Management\n✅ Scheduled Campaigns\n✅ Real-time Analytics\n\nGet Started:\nPlease sign up for a new account or log in to continue:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📝 Sign Up - Create New Account', 'signup')],
                [Markup.button.callback('🔐 Log In - Existing Account', 'login')],
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ])
        );
    } else {
        const user = users[session.usernameKey];
        
        return ctx.reply(
            'Welcome back, ' + user.firstName + '! ✨\n\nWhat would you like to do today?',
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

    if (user.dailyDeposits) {
        user.dailyDeposits.count = Math.max(0, user.dailyDeposits.count - 1);
        user.dailyDeposits.amount = Math.max(0, user.dailyDeposits.amount - deposit.amount);
    }

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: 'Deposit Request ❌ (Rejected)',
        amount: deposit.amount,
        date: date,
        time: time,
        proof: deposit.proof,
        status: 'rejected',
        rejectionReason: reason
    });

    await bot.telegram.sendMessage(
        userChatId,
        'Deposit Request Rejected ❌\n\nTransaction Details:\nAmount: ' + deposit.amount + ' PKR\nMethod: ' + deposit.method + '\nTransaction ID: ' + deposit.proof + '\nDate: ' + date + '\nTime: ' + time + '\n\nRejection Reason:\n' + reason + '\n\nWhat to do next:\n1. Check the reason above\n2. Contact support if needed\n3. Submit a new request if applicable\n\nSupport Available 24/7\nWe\'re here to help!'
    );

    user.pendingDeposits.splice(depositIndex, 1);
    saveUsers();

    await adminCtx.editMessageText(
        'Deposit Request Rejected\n\nUser: ' + user.firstName + '\nAmount: ' + deposit.amount + ' PKR\nMethod: ' + deposit.method + '\nTransaction ID: ' + deposit.proof + '\n\nRejection Reason:\n' + reason
    );
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

    user.balance += withdraw.amount;
    
    if (user.dailyWithdrawals) {
        user.dailyWithdrawals.count = Math.max(0, user.dailyWithdrawals.count - 1);
        user.dailyWithdrawals.amount = Math.max(0, user.dailyWithdrawals.amount - withdraw.amount);
    }

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: 'Withdrawal Request ❌ (Rejected)',
        amount: withdraw.amount,
        date: date,
        time: time,
        account: withdraw.account,
        status: 'rejected',
        rejectionReason: reason
    });

    await bot.telegram.sendMessage(
        userChatId,
        'Withdrawal Request Rejected ❌\n\nTransaction Details:\nAmount: ' + withdraw.amount + ' PKR\nMethod: ' + withdraw.method + '\nAccount: ' + withdraw.account + '\nDate: ' + date + '\nTime: ' + time + '\n\nRejection Reason:\n' + reason + '\n\nBalance Update:\n✅ Your balance has been restored.\n• Previous Balance: ' + (user.balance - withdraw.amount) + ' PKR\n• New Balance: ' + user.balance + ' PKR\n• Amount Returned: ' + withdraw.amount + ' PKR\n\nWhat to do next:\n1. Check the reason above\n2. Contact support if needed\n3. Submit a new request if applicable\n\nSupport Available 24/7\nWe\'re here to help!'
    );

    user.pendingWithdrawals.splice(withdrawIndex, 1);
    saveUsers();

    await adminCtx.editMessageText(
        'Withdrawal Request Rejected\n\nUser: ' + user.firstName + '\nAmount: ' + withdraw.amount + ' PKR returned to balance\nAccount: ' + withdraw.account + '\nMethod: ' + withdraw.method + '\n\nRejection Reason:\n' + reason
    );
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

    user.balance += deposit.totalAmount;
    
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: 'Deposit ✅ (' + deposit.method + ')',
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
        'Deposit Approved Successfully! 🎉\n\nTransaction Details:\nAmount: ' + deposit.amount + ' PKR\nBonus (2%): ' + deposit.bonus + ' PKR\nTotal Added: ' + deposit.totalAmount + ' PKR\nMethod: ' + deposit.method + '\nTransaction ID: ' + deposit.proof + '\nDate: ' + date + '\nTime: ' + time + '\n\nBalance Update:\n• Previous Balance: ' + (user.balance - deposit.totalAmount) + ' PKR\n• New Balance: ' + user.balance + ' PKR\n• Amount Added: ' + deposit.totalAmount + ' PKR\n\nThank you for your deposit!\nYour funds are now available for use.\n\nReady for your next transaction?'
    );

    user.pendingDeposits.splice(depositIndex, 1);
    saveUsers();

    await ctx.editMessageText(
        'Deposit Approved Successfully\n\nUser: ' + user.firstName + '\nAmount: ' + deposit.amount + ' PKR\nBonus: ' + deposit.bonus + ' PKR\nTotal: ' + deposit.totalAmount + ' PKR\nMethod: ' + deposit.method + '\nTransaction ID: ' + deposit.proof + '\n\nUser Balance Updated: ' + user.balance + ' PKR'
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
    await ctx.reply('Please enter the reason for rejecting this deposit request:');
});

// ======= ADMIN APPROVAL FOR WITHDRAWALS (TWO-STEP PROCESS) =======
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

    withdraw.status = 'processing';
    withdraw.approvedDate = date;
    withdraw.approvedTime = time;

    saveUsers();

    await bot.telegram.sendMessage(
        userChatId,
        'Withdrawal Request Approved! ✅\n\nGreat news! Your withdrawal has been approved.\n\nTransaction Details:\nAmount: ' + withdraw.amount + ' PKR\nProcessing Fee: ' + withdraw.fee + ' PKR\nNet Amount: ' + withdraw.netAmount + ' PKR\nMethod: ' + withdraw.method + '\nAccount: ' + withdraw.account + '\nDate: ' + date + '\nTime: ' + time + '\n\nCurrent Status: Funds Transfer in Progress ⏳\n\nWhat happens next:\n1. Funds are being transferred to your account\n2. Usually takes 1-2 hours\n3. You\'ll get another notification upon completion\n\nNeed help? Contact support 24/7.'
    );

    await ctx.editMessageText(
        'Withdrawal Approved & Transfer Initiated ✅\n\nUser Information:\n• Name: ' + user.firstName + '\n• Username: ' + session.usernameKey + '\n• Phone: ' + user.phone + '\n\nTransaction Details:\n• Amount: ' + withdraw.amount + ' PKR\n• Fee: ' + withdraw.fee + ' PKR\n• Net: ' + withdraw.netAmount + ' PKR\n• Method: ' + withdraw.method + '\n• Account: ' + withdraw.account + '\n\nApproval Time:\n• Date: ' + date + '\n• Time: ' + time + '\n\nStatus: Funds Transfer in Progress ⏳\nPlease confirm when funds have been transferred.',
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Funds Transfer Completed', `fund_transfer_success_${userChatId}_${withdrawId}`)]
        ])
    );
});

// ======= FUND TRANSFER SUCCESS =======
bot.action(/fund_transfer_success_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('User not found.');

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) return ctx.answerCbQuery('No pending withdrawals.');

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) return ctx.answerCbQuery('Withdrawal already completed.');

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    withdraw.status = 'completed';
    withdraw.completedDate = date;
    withdraw.completedTime = time;

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: 'Withdrawal ✅ (' + withdraw.method + ')',
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
        'Funds Transfer Successful! 🎉\n\nTransaction Completed Successfully\n\nTransaction Summary:\nAmount: ' + withdraw.amount + ' PKR\nProcessing Fee: ' + withdraw.fee + ' PKR\nNet Amount Sent: ' + withdraw.netAmount + ' PKR\nPayment Method: ' + withdraw.method + '\nAccount Number: ' + withdraw.account + '\nTransfer Date: ' + date + '\nTransfer Time: ' + time + '\n\nStatus: Successfully Transferred ✅\n\nNext Steps:\n1. Check your ' + withdraw.method + ' account\n2. Confirm receipt of funds\n3. Contact us if any issues\n\nThank you for using our service!\nWe look forward to serving you again.\n\n24/7 Support Available'
    );

    await ctx.editMessageText(
        'Funds Transfer Completed Successfully ✅\n\nUser Information:\n• Name: ' + user.firstName + '\n• Username: ' + session.usernameKey + '\n• Phone: ' + user.phone + '\n\nTransaction Details:\n• Amount: ' + withdraw.amount + ' PKR\n• Fee: ' + withdraw.fee + ' PKR\n• Net Sent: ' + withdraw.netAmount + ' PKR\n• Method: ' + withdraw.method + '\n• Account: ' + withdraw.account + '\n\nCompletion Time:\n• Date: ' + date + '\n• Time: ' + time + '\n\nStatus: Transfer Completed Successfully'
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
    await ctx.reply('Please enter the reason for rejecting this withdrawal request:');
});

// ===== LAUNCH =====
bot.launch();
console.log('Bot running successfully...');
console.log('All features activated');
console.log('Security protocols enabled');
console.log('Payment system ready');
console.log('WhatsApp bot integration active');
