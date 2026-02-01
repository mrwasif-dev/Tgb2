const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const crypto = require('crypto');

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
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ===== SECURITY =====
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateReferralCode() {
    return 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function generateUserId() {
    return 'USER-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

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
        [Markup.button.callback('⬅️ Back to Menu', 'backToMenu')]
    ]);
}

// ======= START =======
bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];

    // Check for referral link
    const referralCode = ctx.startPayload;
    if (referralCode && referralCode.startsWith('REF-')) {
        sessions[chatId] = { referralCode: referralCode };
    }

    if (session && session.usernameKey && users[session.usernameKey]) {
        const user = users[session.usernameKey];
        return ctx.replyWithPhoto(
            { url: 'https://via.placeholder.com/600x200/0088cc/FFFFFF?text=Paid+WhatsApp+Bot' },
            {
                caption: `👋 Welcome Back, ${user.firstName} ${user.lastName || ''}!\n\n` +
                        `🆔 Account ID: ${user.userId}\n` +
                        `⭐ Member Since: ${user.registered}\n` +
                        `💰 Balance: ${user.balance} PKR\n` +
                        `🏆 Level: ${user.level || 'Basic'}`,
                reply_markup: withBackButton([
                    [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                    [Markup.button.callback('🤖 Buy WhatsApp Bot', 'buyBot')],
                    [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                    [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
                    [Markup.button.callback('👥 Refer & Earn', 'referFriends')],
                    [Markup.button.callback('⚙️ Account Settings', 'accountSettings')]
                ]).reply_markup
            }
        );
    }

    await ctx.replyWithPhoto(
        { url: 'https://via.placeholder.com/600x300/0088cc/FFFFFF?text=Welcome+to+Paid+WhatsApp+Bot' },
        {
            caption: `🌟 *Welcome to Paid WhatsApp Bot* 🌟\n\n` +
                    `Your premier platform for WhatsApp automation services.\n\n` +
                    `✨ *Features:*\n` +
                    `• 🤖 Automated WhatsApp Bots\n` +
                    `• 💰 Instant Withdrawals\n` +
                    `• 🏦 Secure Transactions\n` +
                    `• 🎁 Referral Bonuses\n` +
                    `• 24/7 📞 Support\n\n` +
                    `Join thousands of satisfied users today!`,
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('📝 Create Account', 'signup')],
                [Markup.button.callback('🔐 Login to Account', 'login')],
                [Markup.button.callback('ℹ️ About Services', 'aboutServices')],
                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
            ]).reply_markup
        }
    );
});

// ======= SIGNUP FLOW =======
bot.action('signup', async (ctx) => {
    sessions[ctx.chat.id] = { 
        flow: 'signup', 
        step: 'firstName',
        data: {
            registrationTime: Date.now()
        }
    };
    
    await ctx.reply(
        `📝 *Account Registration*\n\n` +
        `Let's create your professional account.\n\n` +
        `Please enter your *First Name*:`,
        { parse_mode: 'Markdown' }
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
                if (text.length < 2 || text.length > 50) {
                    return ctx.reply('❌ First name must be between 2-50 characters.\n\nPlease enter your first name:');
                }
                session.data.firstName = text;
                session.step = 'lastName';
                return ctx.reply(
                    `✅ First Name: ${text}\n\n` +
                    `Now enter your *Last Name* (optional):`,
                    { parse_mode: 'Markdown' }
                );

            case 'lastName':
                if (text.length > 50) {
                    return ctx.reply('❌ Last name too long (max 50 characters).\n\nEnter your last name (or type "Skip"):');
                }
                if (text.toLowerCase() === 'skip') {
                    session.data.lastName = '';
                } else {
                    session.data.lastName = text;
                }
                session.step = 'dob';
                return ctx.reply(
                    `✅ Name: ${session.data.firstName} ${session.data.lastName || ''}\n\n` +
                    `Enter your *Date of Birth* (DD-MM-YYYY):\n` +
                    `Example: 15-05-1995`,
                    { parse_mode: 'Markdown' }
                );

            case 'dob': {
                const m = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!m) return ctx.reply('❌ Invalid format. Please use DD-MM-YYYY format.\n\nExample: 15-05-1995');
                
                const day = parseInt(m[1]);
                const month = parseInt(m[2]);
                const year = parseInt(m[3]);
                
                const today = new Date();
                const dob = new Date(year, month - 1, day);
                
                // Validate date
                if (dob.getDate() !== day || dob.getMonth() !== month - 1 || dob.getFullYear() !== year) {
                    return ctx.reply('❌ Invalid date. Please check and enter again.');
                }
                
                // Calculate age
                const age = today.getFullYear() - dob.getFullYear();
                const monthDiff = today.getMonth() - dob.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                
                if (age < 18) {
                    return ctx.reply('❌ You must be at least 18 years old to register.\n\nPlease enter your DOB again:');
                }
                if (age > 100) {
                    return ctx.reply('❌ Please enter a valid date of birth.\n\nEnter your DOB (DD-MM-YYYY):');
                }
                
                session.data.dob = text;
                session.data.age = age;
                session.step = 'gender';
                
                return ctx.reply(
                    `✅ DOB: ${text} (Age: ${age})\n\n` +
                    `Select your *Gender*:`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('👨 Male', 'gender_male')],
                            [Markup.button.callback('👩 Female', 'gender_female')],
                            [Markup.button.callback('🤖 Prefer not to say', 'gender_other')]
                        ]).reply_markup
                    }
                );
            }

            case 'phone': {
                // Clean phone number
                let phone = text.replace(/[^0-9+]/g, '');
                
                // Add +92 if missing
                if (!phone.startsWith('+')) {
                    if (phone.startsWith('0')) {
                        phone = '+92' + phone.substring(1);
                    } else if (phone.startsWith('92')) {
                        phone = '+' + phone;
                    } else {
                        phone = '+92' + phone;
                    }
                }
                
                // Validate Pakistan number
                if (!/^\+923[0-9]{9}$/.test(phone)) {
                    return ctx.reply(
                        '❌ Invalid Pakistan mobile number.\n\n' +
                        'Please enter a valid Pakistan number:\n' +
                        'Format: 03001234567 or +923001234567'
                    );
                }
                
                // Check if number already exists
                const existingUser = Object.values(users).find(u => u.phone === phone);
                if (existingUser) {
                    return ctx.reply(
                        '❌ This phone number is already registered.\n\n' +
                        'Please use a different number or contact support if this is your number.'
                    );
                }
                
                session.data.phone = phone;
                session.step = 'email';
                
                return ctx.reply(
                    `✅ Phone: ${phone}\n\n` +
                    `Enter your *Email Address* (optional):\n` +
                    `Type "Skip" if you don't want to add email`,
                    { parse_mode: 'Markdown' }
                );
            }

            case 'email':
                if (text.toLowerCase() === 'skip') {
                    session.data.email = '';
                } else {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(text)) {
                        return ctx.reply('❌ Invalid email format.\n\nPlease enter a valid email or type "Skip":');
                    }
                    
                    // Check if email already exists
                    const existingUser = Object.values(users).find(u => u.email === text);
                    if (existingUser) {
                        return ctx.reply('❌ This email is already registered.\n\nPlease use a different email or type "Skip":');
                    }
                    
                    session.data.email = text;
                }
                session.step = 'username';
                
                return ctx.reply(
                    `✅ Email: ${session.data.email || 'Not provided'}\n\n` +
                    `Create your *Username*:\n` +
                    `• 4-15 characters\n` +
                    `• Letters, numbers, and underscores only\n` +
                    `• Example: john_doe123`,
                    { parse_mode: 'Markdown' }
                );

            case 'username':
                if (!/^[a-zA-Z0-9_]{4,15}$/.test(text)) {
                    return ctx.reply(
                        '❌ Invalid username format.\n\n' +
                        'Username must be:\n' +
                        '• 4-15 characters\n' +
                        '• Letters, numbers, and underscores only\n' +
                        '• Example: john_doe123\n\n' +
                        'Please choose a username:'
                    );
                }
                
                if (users[text.toLowerCase()]) {
                    return ctx.reply(
                        '❌ Username already taken.\n\n' +
                        'Suggested usernames:\n' +
                        `• ${text}${Math.floor(Math.random() * 100)}\n` +
                        `• ${text}_${Math.floor(Math.random() * 1000)}\n\n` +
                        'Please choose another username:'
                    );
                }
                
                session.data.username = text.toLowerCase();
                session.step = 'password';
                
                return ctx.reply(
                    `✅ Username: ${text}\n\n` +
                    `Create a *Strong Password*:\n` +
                    `• Minimum 8 characters\n` +
                    `• At least one uppercase letter\n` +
                    `• At least one lowercase letter\n` +
                    `• At least one number\n` +
                    `• At least one special character (@$!%*?&)\n\n` +
                    `Enter your password:`,
                    { parse_mode: 'Markdown' }
                );

            case 'password':
                if (!PASSWORD_REGEX.test(text)) {
                    return ctx.reply(
                        '❌ Password is not strong enough.\n\n' +
                        'Requirements:\n' +
                        '• Minimum 8 characters\n' +
                        '• At least one uppercase letter\n' +
                        '• At least one lowercase letter\n' +
                        '• At least one number\n' +
                        '• At least one special character (@$!%*?&)\n\n' +
                        'Please enter a stronger password:'
                    );
                }
                
                session.data.password = hashPassword(text);
                session.step = 'confirmPassword';
                
                return ctx.reply('🔐 Please *confirm your password*:', { parse_mode: 'Markdown' });

            case 'confirmPassword':
                if (hashPassword(text) !== session.data.password) {
                    session.step = 'password';
                    return ctx.reply('❌ Passwords do not match.\n\nPlease enter your password again:');
                }
                
                session.data.plainPassword = text; // Store for admin notification only
                session.step = 'terms';
                
                return ctx.reply(
                    `📋 *Account Summary*\n\n` +
                    `👤 *Personal Information:*\n` +
                    `• Name: ${session.data.firstName} ${session.data.lastName || ''}\n` +
                    `• DOB: ${session.data.dob} (Age: ${session.data.age})\n` +
                    `• Gender: ${session.data.gender || 'Not specified'}\n\n` +
                    `📞 *Contact Information:*\n` +
                    `• Phone: ${session.data.phone}\n` +
                    `• Email: ${session.data.email || 'Not provided'}\n\n` +
                    `🔐 *Account Details:*\n` +
                    `• Username: ${session.data.username}\n\n` +
                    `*Do you agree to our Terms & Conditions?*`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('✅ I Agree to Terms', 'agreeTerms')],
                            [Markup.button.callback('📄 View Terms', 'viewTerms')],
                            [Markup.button.callback('❌ Cancel', 'cancelSignup')]
                        ]).reply_markup
                    }
                );
        }
        return;
    }

    // ===== LOGIN FLOW =====
    if (session.flow === 'login') {
        switch (session.step) {
            case 'loginUsername':
                const username = text.toLowerCase();
                
                if (!users[username]) {
                    return ctx.reply(
                        '❌ Username not found.\n\n' +
                        'Please check your username or:\n',
                        Markup.inlineKeyboard([
                            [Markup.button.callback('📝 Create New Account', 'signup')],
                            [Markup.button.callback('🔍 Forgot Username?', 'forgotUsername')],
                            [Markup.button.callback('⬅️ Back', 'backToMenu')]
                        ])
                    );
                }
                
                session.user = users[username];
                session.usernameKey = username;
                session.loginAttempts = 0;
                session.step = 'loginPassword';
                
                return ctx.reply(
                    `👋 Welcome back, ${session.user.firstName}!\n\n` +
                    `Please enter your password:`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔑 Forgot Password?', 'forgotPassword')]
                    ])
                );

            case 'loginPassword':
                if (hashPassword(text) !== session.user.password) {
                    session.loginAttempts = (session.loginAttempts || 0) + 1;
                    
                    if (session.loginAttempts >= 3) {
                        delete sessions[chatId];
                        return ctx.reply(
                            '❌ Too many failed attempts. Please try again later.\n\n' +
                            'For security, your session has been terminated.',
                            Markup.inlineKeyboard([
                                [Markup.button.callback('📞 Contact Support', 'contactSupport')]
                            ])
                        );
                    }
                    
                    const remaining = 3 - session.loginAttempts;
                    return ctx.reply(
                        `❌ Incorrect password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.\n\n` +
                        'Please enter your password again:'
                    );
                }
                
                // Successful login
                sessions[chatId] = { user: session.user, usernameKey: session.usernameKey };
                
                // Update last login
                session.user.lastLogin = {
                    date: getCurrentDateTime().date,
                    time: getCurrentDateTime().time,
                    ip: ctx.from.id.toString()
                };
                saveUsers();
                
                return ctx.replyWithPhoto(
                    { url: 'https://via.placeholder.com/600x200/4CAF50/FFFFFF?text=Login+Successful' },
                    {
                        caption: `🎉 *Login Successful!*\n\n` +
                                `Welcome back, ${session.user.firstName}!\n\n` +
                                `📊 *Account Status:*\n` +
                                `• Balance: ${session.user.balance || 0} PKR\n` +
                                `• Member Since: ${session.user.registered}\n` +
                                `• Last Login: ${session.user.lastLogin?.date || 'First time'}\n\n` +
                                `What would you like to do today?`,
                        parse_mode: 'Markdown',
                        reply_markup: withBackButton([
                            [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                            [Markup.button.callback('🤖 Buy WhatsApp Bot', 'buyBot')],
                            [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                            [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
                            [Markup.button.callback('👥 Refer & Earn', 'referFriends')],
                            [Markup.button.callback('⚙️ Account Settings', 'accountSettings')]
                        ]).reply_markup
                    }
                );
        }
        return;
    }
});

// ===== GENDER SELECTION =====
bot.action(/gender_(male|female|other)/, async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || session.flow !== 'signup') return;
    
    const gender = ctx.match[1];
    const genderMap = { male: 'Male', female: 'Female', other: 'Prefer not to say' };
    
    session.data.gender = genderMap[gender];
    session.step = 'phone';
    
    await ctx.answerCbQuery();
    await ctx.reply(
        `✅ Gender: ${session.data.gender}\n\n` +
        `Enter your *Pakistan Mobile Number*:\n` +
        `Format: 03001234567 or +923001234567\n\n` +
        `📱 This will be used for:\n` +
        `• Account verification\n` +
        `• Withdrawal processing\n` +
        `• Security alerts`,
        { parse_mode: 'Markdown' }
    );
});

// ===== TERMS AGREEMENT =====
bot.action('agreeTerms', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || session.flow !== 'signup') return;
    
    // Generate user data
    const userData = session.data;
    const { date, time } = getCurrentDateTime();
    
    // Generate unique IDs
    const userId = generateUserId();
    const referralCode = generateReferralCode();
    
    // Create user object
    users[userData.username] = {
        userId: userId,
        referralCode: referralCode,
        firstName: userData.firstName,
        lastName: userData.lastName || '',
        fullName: userData.firstName + (userData.lastName ? ' ' + userData.lastName : ''),
        dob: userData.dob,
        age: userData.age,
        gender: userData.gender || 'Not specified',
        phone: userData.phone,
        email: userData.email || '',
        username: userData.username,
        password: userData.password,
        registered: date,
        registrationTime: time,
        balance: 0,
        bonusBalance: 0,
        level: 'Basic',
        status: 'active',
        verified: false,
        referralCount: 0,
        referralEarnings: 0,
        transactions: [],
        pendingDeposits: [],
        pendingWithdrawals: [],
        processedRequests: {},
        lastLogin: null,
        accountSettings: {
            notifications: true,
            twoFA: false,
            autoLogout: true
        }
    };
    
    // Apply referral bonus if exists
    if (session.referralCode) {
        const referrer = Object.values(users).find(u => u.referralCode === session.referralCode);
        if (referrer) {
            referrer.referralCount = (referrer.referralCount || 0) + 1;
            referrer.referralEarnings = (referrer.referralEarnings || 0) + 50;
            referrer.bonusBalance = (referrer.bonusBalance || 0) + 50;
            
            // Add to transactions
            referrer.transactions.push({
                type: 'Referral Bonus ➕',
                amount: 50,
                date: date,
                time: time,
                referredUser: userData.username
            });
        }
    }
    
    saveUsers();
    
    // Clear session
    sessions[chatId] = null;
    
    // Send welcome message to user
    await ctx.replyWithPhoto(
        { url: 'https://via.placeholder.com/600x300/4CAF50/FFFFFF?text=Account+Created+Successfully' },
        {
            caption: `🎉 *Account Created Successfully!*\n\n` +
                    `Welcome to Paid WhatsApp Bot, ${userData.firstName}!\n\n` +
                    `📋 *Account Details:*\n` +
                    `• User ID: ${userId}\n` +
                    `• Username: ${userData.username}\n` +
                    `• Referral Code: ${referralCode}\n` +
                    `• Registration: ${date} ${time}\n\n` +
                    `✨ *Welcome Bonus:* 50 PKR\n\n` +
                    `💰 *Account Balance:* 50 PKR\n\n` +
                    `🔐 *Security Tips:*\n` +
                    `• Never share your password\n` +
                    `• Enable 2FA in settings\n` +
                    `• Log out from public devices\n\n` +
                    `🎁 *Refer friends and earn 50 PKR each!*`,
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Go to Dashboard', 'goToDashboard')],
                [Markup.button.callback('👥 Share Referral Link', 'shareReferral')],
                [Markup.button.callback('⚙️ Account Settings', 'accountSettings')]
            ]).reply_markup
        }
    );
    
    // Send notification to admin
    const adminMsg = `
🆕 *NEW ACCOUNT REGISTRATION*

👤 *Personal Information:*
• Name: ${userData.firstName} ${userData.lastName || ''}
• DOB: ${userData.dob} (Age: ${userData.age})
• Gender: ${userData.gender || 'Not specified'}

📞 *Contact Details:*
• Phone: ${userData.phone}
• Email: ${userData.email || 'Not provided'}
• Username: ${userData.username}
• User ID: ${userId}

📊 *Account Information:*
• Referral Code: ${referralCode}
• Registration: ${date} ${time}
• IP/Telegram ID: ${ctx.from.id}

🔗 *Referral Info:*
• Referred by: ${session.referralCode || 'Direct'}
• Welcome Bonus: 50 PKR applied

📲 Telegram: @${ctx.from.username || 'N/A'} [${ctx.from.first_name} ${ctx.from.last_name || ''}]
    `;
    
    await bot.telegram.sendMessage(ADMIN_ID, adminMsg, { parse_mode: 'Markdown' });
});

// ===== VIEW TERMS =====
bot.action('viewTerms', async (ctx) => {
    await ctx.reply(
        `📄 *Terms & Conditions*\n\n` +
        `1. **Account Security**\n` +
        `   • You are responsible for keeping your password secure\n` +
        `   • Report any unauthorized access immediately\n\n` +
        `2. **Transactions**\n` +
        `   • All transactions are final\n` +
        `   • Refunds are subject to admin approval\n\n` +
        `3. **Service Usage**\n` +
        `   • Services must not be used for illegal activities\n` +
        `   • We reserve the right to suspend accounts\n\n` +
        `4. **Privacy**\n` +
        `   • We protect your personal information\n` +
        `   • Data is used only for service provision\n\n` +
        `5. **Amendments**\n` +
        `   • Terms may be updated periodically\n` +
        `   • Continued use implies acceptance\n\n` +
        `Do you agree to these terms?`,
        {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('✅ I Agree', 'agreeTerms')],
                [Markup.button.callback('❌ Cancel', 'cancelSignup')]
            ]).reply_markup
        }
    );
});

// ===== CANCEL SIGNUP =====
bot.action('cancelSignup', async (ctx) => {
    const chatId = ctx.chat.id;
    delete sessions[chatId];
    
    await ctx.reply(
        '❌ Account registration cancelled.\n\n' +
        'If you change your mind, you can register anytime.',
        Markup.inlineKeyboard([
            [Markup.button.callback('📝 Try Again', 'signup')],
            [Markup.button.callback('🏠 Home', 'backToMenu')]
        ])
    );
});

// ===== GO TO DASHBOARD =====
bot.action('goToDashboard', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    
    if (!session || !session.usernameKey) {
        return ctx.reply(
            'Please login first.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔐 Login', 'login')],
                [Markup.button.callback('📝 Sign Up', 'signup')]
            ])
        );
    }
    
    const user = users[session.usernameKey];
    
    return ctx.replyWithPhoto(
        { url: 'https://via.placeholder.com/600x200/0088cc/FFFFFF?text=Account+Dashboard' },
        {
            caption: `📊 *Account Dashboard*\n\n` +
                    `👤 *Profile:*\n` +
                    `• Name: ${user.firstName} ${user.lastName || ''}\n` +
                    `• User ID: ${user.userId}\n` +
                    `• Level: ${user.level}\n` +
                    `• Status: ${user.status}\n\n` +
                    `💰 *Financial:*\n` +
                    `• Main Balance: ${user.balance} PKR\n` +
                    `• Bonus Balance: ${user.bonusBalance || 0} PKR\n` +
                    `• Total Earnings: ${user.balance + (user.bonusBalance || 0)} PKR\n\n` +
                    `📈 *Stats:*\n` +
                    `• Referrals: ${user.referralCount || 0}\n` +
                    `• Referral Earnings: ${user.referralEarnings || 0} PKR\n` +
                    `• Member Since: ${user.registered}`,
            parse_mode: 'Markdown',
            reply_markup: withBackButton([
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('🤖 Buy WhatsApp Bot', 'buyBot')],
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
                [Markup.button.callback('👥 Refer & Earn', 'referFriends')],
                [Markup.button.callback('⚙️ Account Settings', 'accountSettings')],
                [Markup.button.callback('📊 Transaction History', 'viewTransactions')]
            ]).reply_markup
        }
    );
});

// ===== SHARE REFERRAL =====
bot.action('shareReferral', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    
    if (!session || !session.usernameKey) {
        return ctx.answerCbQuery('Please login first.');
    }
    
    const user = users[session.usernameKey];
    const referralLink = `https://t.me/${ctx.botInfo.username}?start=${user.referralCode}`;
    
    await ctx.reply(
        `👥 *Refer & Earn Program*\n\n` +
        `Invite friends and earn *50 PKR* for each successful referral!\n\n` +
        `🎁 *How it works:*\n` +
        `1. Share your referral link\n` +
        `2. Friend signs up using your link\n` +
        `3. You get 50 PKR bonus\n` +
        `4. Friend gets 50 PKR welcome bonus\n\n` +
        `🔗 *Your Referral Link:*\n` +
        `${referralLink}\n\n` +
        `📋 *Your Referral Code:*\n` +
        `${user.referralCode}\n\n` +
        `📊 *Stats:*\n` +
        `• Total Referrals: ${user.referralCount || 0}\n` +
        `• Earnings from Referrals: ${user.referralEarnings || 0} PKR`,
        {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.url('📱 Share on Telegram', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Paid WhatsApp Bot and earn money! Use my referral link:')}`)],
                [Markup.button.callback('📊 View Referrals', 'viewReferrals')],
                [Markup.button.callback('⬅️ Back', 'backToMenu')]
            ]).reply_markup
        }
    );
});

// ===== ACCOUNT SETTINGS =====
bot.action('accountSettings', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    
    if (!session || !session.usernameKey) {
        return ctx.reply('Please login first to access settings.');
    }
    
    const user = users[session.usernameKey];
    
    await ctx.reply(
        `⚙️ *Account Settings*\n\n` +
        `👤 *Profile Information:*\n` +
        `• Name: ${user.firstName} ${user.lastName || ''}\n` +
        `• Username: ${user.username}\n` +
        `• Email: ${user.email || 'Not set'}\n` +
        `• Phone: ${user.phone}\n\n` +
        `🔐 *Security Settings:*\n` +
        `• 2FA: ${user.accountSettings?.twoFA ? 'Enabled' : 'Disabled'}\n` +
        `• Auto Logout: ${user.accountSettings?.autoLogout ? '15 mins' : 'Disabled'}\n` +
        `• Notifications: ${user.accountSettings?.notifications ? 'Enabled' : 'Disabled'}\n\n` +
        `Select an option to manage:`,
        {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Edit Profile', 'editProfile')],
                [Markup.button.callback('🔐 Change Password', 'changePassword')],
                [Markup.button.callback('📧 Update Email', 'updateEmail')],
                [Markup.button.callback('🔒 Security Settings', 'securitySettings')],
                [Markup.button.callback('📱 Update Phone', 'updatePhone')],
                [Markup.button.callback('📄 Account Statement', 'accountStatement')],
                [Markup.button.callback('⬅️ Back to Dashboard', 'goToDashboard')]
            ]).reply_markup
        }
    );
});

// ===== ABOUT SERVICES =====
bot.action('aboutServices', async (ctx) => {
    await ctx.reply(
        `🤖 *About Our WhatsApp Bot Services*\n\n` +
        `🌟 *Premium Features:*\n` +
        `• Auto-reply system\n` +
        `• Bulk messaging\n` +
        `• Group management\n` +
        `• Analytics dashboard\n` +
        `• 24/7 support\n\n` +
        `💰 *Pricing Plans:*\n` +
        `• Basic: 100 PKR/month\n` +
        `• Pro: 300 PKR/month\n` +
        `• Business: 500 PKR/month\n\n` +
        `📊 *Benefits:*\n` +
        `• Increase efficiency\n` +
        `• Save time\n` +
        `• Professional communication\n` +
        `• Detailed reports\n\n` +
        `🎯 *Perfect For:*\n` +
        `• Small businesses\n` +
        `• Freelancers\n` +
        `• Marketing agencies\n` +
        `• Customer support\n\n` +
        `Ready to get started?`,
        {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Get Started', 'signup')],
                [Markup.button.callback('📞 Contact Sales', 'contactSupport')],
                [Markup.button.callback('⬅️ Back', 'backToMenu')]
            ]).reply_markup
        }
    );
});

// ===== CONTACT SUPPORT =====
bot.action('contactSupport', async (ctx) => {
    await ctx.reply(
        `📞 *Contact Support*\n\n` +
        `We're here to help you 24/7!\n\n` +
        `📱 *Support Channels:*\n` +
        `• Telegram: @SupportBotHelp\n` +
        `• Email: support@paidwhatsappbot.com\n` +
        `• Phone: +92 300 382844\n\n` +
        `⏰ *Business Hours:*\n` +
        `Monday - Sunday: 24/7\n\n` +
        `💡 *Before Contacting:*\n` +
        `1. Check our FAQs\n` +
        `2. Have your User ID ready\n` +
        `3. Describe your issue clearly\n\n` +
        `Need immediate assistance?`,
        {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.url('💬 Live Chat', 'https://t.me/SupportBotHelp')],
                [Markup.button.callback('❓ FAQs', 'viewFAQs')],
                [Markup.button.callback('⬅️ Back', 'backToMenu')]
            ]).reply_markup
        }
    );
});

// ===== LOGIN ACTION =====
bot.action('login', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'login', step: 'loginUsername' };
    
    await ctx.reply(
        `🔐 *Account Login*\n\n` +
        `Please enter your *Username*:\n\n` +
        `📝 *Don't have an account?*\n` +
        `Create one now to get 50 PKR welcome bonus!`,
        {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('📝 Create Account', 'signup')]
            ]).reply_markup
        }
    );
});

// ===== FORGOT PASSWORD =====
bot.action('forgotPassword', async (ctx) => {
    await ctx.reply(
        `🔑 *Password Recovery*\n\n` +
        `Please contact our support team for password reset:\n\n` +
        `📞 Support: @SupportBotHelp\n` +
        `📧 Email: support@paidwhatsappbot.com\n\n` +
        `For security reasons, password reset requires:\n` +
        `• Account verification\n` +
        `• Email/Phone confirmation\n` +
        `• Security questions\n\n` +
        `We'll help you regain access quickly!`,
        {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.url('📱 Contact Support', 'https://t.me/SupportBotHelp')],
                [Markup.button.callback('⬅️ Back to Login', 'login')]
            ]).reply_markup
        }
    );
});

// ===== BACK TO MENU =====
bot.action('backToMenu', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    
    if (!session || !session.usernameKey) {
        return ctx.reply(
            '🌟 *Welcome to Paid WhatsApp Bot* 🌟\n\nChoose an option:',
            {
                parse_mode: 'Markdown',
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('📝 Create Account', 'signup')],
                    [Markup.button.callback('🔐 Login to Account', 'login')],
                    [Markup.button.callback('ℹ️ About Services', 'aboutServices')],
                    [Markup.button.callback('📞 Contact Support', 'contactSupport')]
                ]).reply_markup
            }
        );
    }
    
    const user = users[session.usernameKey];
    
    return ctx.replyWithPhoto(
        { url: 'https://via.placeholder.com/600x200/0088cc/FFFFFF?text=Welcome+Back' },
        {
            caption: `👋 Welcome Back, ${user.firstName}!\n\n` +
                    `What would you like to do today?`,
            reply_markup: withBackButton([
                [Markup.button.callback('💰 Check Balance', 'checkBalance')],
                [Markup.button.callback('🤖 Buy WhatsApp Bot', 'buyBot')],
                [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
                [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
                [Markup.button.callback('👥 Refer & Earn', 'referFriends')],
                [Markup.button.callback('⚙️ Account Settings', 'accountSettings')]
            ]).reply_markup
        }
    );
});

// ===== LAUNCH =====
bot.launch();
console.log('🤖 Professional WhatsApp Bot is running...');
