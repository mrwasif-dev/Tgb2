const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ===== BOT =====
const bot = new Telegraf('8226474686:AAEmXiWRGoeaa5pZlF2MZlYViYmSkM70fbI');
const ADMIN_ID = 6012422087;

// ===== DATABASE =====
const DATA_FILE = './users.json';
const PLANS_FILE = './plans.json';
let users = {};
let plans = {
  active: [
    {
      id: 1,
      name: "Basic Plan",
      price: 350,
      duration: 15,
      whatsappLinks: 1,
      features: "1 WhatsApp Link",
      type: "active"
    },
    {
      id: 2,
      name: "Standard Plan",
      price: 500,
      duration: 30,
      whatsappLinks: 1,
      features: "1 WhatsApp Link",
      type: "active"
    },
    {
      id: 3,
      name: "Pro Plan",
      price: 1200,
      duration: 90,
      whatsappLinks: 1,
      features: "1 WhatsApp Link",
      type: "active"
    },
    {
      id: 4,
      name: "Business Plan",
      price: 2000,
      duration: 90,
      whatsappLinks: 2,
      features: "2 WhatsApp Links",
      type: "active"
    }
  ]
};

if (fs.existsSync(DATA_FILE)) {
  users = JSON.parse(fs.readFileSync(DATA_FILE));
}

if (fs.existsSync(PLANS_FILE)) {
  const savedPlans = JSON.parse(fs.readFileSync(PLANS_FILE));
  if (savedPlans.active && savedPlans.active.length > 0) {
    plans = savedPlans;
  }
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

function addDaysToDate(days) {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const pakistanTime = new Date(utc + 5 * 60 * 60 * 1000);
  pakistanTime.setDate(pakistanTime.getDate() + days);
  
  return `${String(pakistanTime.getDate()).padStart(2,'0')}-${String(pakistanTime.getMonth()+1).padStart(2,'0')}-${pakistanTime.getFullYear()}`;
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
        [Markup.button.callback('📱 Manage Plans', 'adminManagePlans')],
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
        [Markup.button.callback('🤖 WhatsApp Bot Plans', 'buyBot')],
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
    } else if (requestType === 'plan') {
      await processPlanRejection(userChatId, requestId, reason, ctx);
    }

    return;
  }

  // ===== ADMIN ADD PLAN =====
  if (session.flow === 'admin_add_plan') {
    if (session.step === 'enter_name') {
      session.planName = text;
      session.step = 'enter_price';
      return ctx.reply(
        `📝 Adding Plan: ${text}\n\n💰 Enter plan price (PKR):`
      );
    }

    if (session.step === 'enter_price') {
      const price = parseInt(text);
      if (isNaN(price) || price <= 0) {
        return ctx.reply('❌ Invalid price ❌\n\nPlease enter a valid amount (PKR):');
      }
      session.planPrice = price;
      session.step = 'enter_duration';
      return ctx.reply(
        `⏰ Enter plan duration in days:\n\nExample: 30 (for 1 month)`
      );
    }

    if (session.step === 'enter_duration') {
      const duration = parseInt(text);
      if (isNaN(duration) || duration <= 0) {
        return ctx.reply('❌ Invalid duration ❌\n\nPlease enter valid days:');
      }
      session.planDuration = duration;
      session.step = 'enter_links';
      return ctx.reply(
        `🔗 Enter number of WhatsApp links for this plan:\n\nExample: 1 or 2`
      );
    }

    if (session.step === 'enter_links') {
      const links = parseInt(text);
      if (isNaN(links) || links <= 0) {
        return ctx.reply('❌ Invalid number ❌\n\nPlease enter valid number of links:');
      }
      session.planLinks = links;
      session.step = 'enter_features';
      return ctx.reply(
        `📋 Enter plan features (comma separated):\n\nExample: "WhatsApp Link, Bulk Messaging, Support"`
      );
    }

    if (session.step === 'enter_features') {
      const newPlan = {
        id: plans.active.length + 1,
        name: session.planName,
        price: session.planPrice,
        duration: session.planDuration,
        whatsappLinks: session.planLinks,
        features: text,
        type: 'active'
      };

      plans.active.push(newPlan);
      savePlans();

      await ctx.reply(
        `✅ Plan Added Successfully! ✅\n\n📋 Plan Details:\n• Name: ${session.planName}\n• Price: ${session.planPrice} PKR\n• Duration: ${session.planDuration} days\n• WhatsApp Links: ${session.planLinks}\n• Features: ${text}`,
        Markup.inlineKeyboard([
          [Markup.button.callback('➕ Add Another Plan', 'adminAddPlan')],
          [Markup.button.callback('📱 View All Plans', 'adminViewPlans')],
          [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
      );

      sessions[chatId] = null;
    }
    return;
  }

  // ===== ADMIN EDIT PLAN =====
  if (session.flow === 'admin_edit_plan') {
    if (session.step === 'enter_field') {
      const planId = session.planId;
      const field = session.editField;
      const planIndex = plans.active.findIndex(p => p.id === planId);
      
      if (planIndex === -1) {
        sessions[chatId] = null;
        return ctx.reply('❌ Plan not found');
      }

      if (field === 'price' || field === 'duration' || field === 'whatsappLinks') {
        const value = parseInt(text);
        if (isNaN(value) || value <= 0) {
          return ctx.reply('❌ Invalid value ❌\n\nPlease enter a valid number:');
        }
        plans.active[planIndex][field] = value;
      } else {
        plans.active[planIndex][field] = text;
      }

      savePlans();

      await ctx.reply(
        `✅ Plan Updated Successfully! ✅\n\n📋 Updated Details:\n• ${field}: ${text}`,
        Markup.inlineKeyboard([
          [Markup.button.callback('✏️ Edit Another Field', `admin_edit_plan_${planId}`)],
          [Markup.button.callback('📱 View All Plans', 'adminViewPlans')],
          [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
        ])
      );

      sessions[chatId] = null;
    }
    return;
  }

  // ===== ADMIN SEND PLAN LINK =====
  if (session.flow === 'admin_send_link') {
    const requestId = session.requestId;
    
    // Find the plan request
    let foundRequest = null;
    let foundUser = null;
    let foundUsername = '';
    
    for (const [username, user] of Object.entries(users)) {
      if (user.planRequests) {
        const requestIndex = user.planRequests.findIndex(r => r.id === requestId);
        if (requestIndex !== -1) {
          foundRequest = user.planRequests[requestIndex];
          foundUser = user;
          foundUsername = username;
          break;
        }
      }
    }

    if (!foundRequest) {
      sessions[chatId] = null;
      return ctx.reply('❌ Plan request not found');
    }

    // Validate WhatsApp link
    if (!text.includes('wa.me') && !text.includes('whatsapp.com') && !text.includes('https://')) {
      return ctx.reply('❌ Invalid WhatsApp link ❌\n\nPlease enter a valid WhatsApp link:\n\nExample: https://wa.me/923001234567');
    }

    // Update user's active plan
    foundUser.activePlan = {
      planId: foundRequest.planId,
      planName: foundRequest.planName,
      price: foundRequest.price,
      duration: foundRequest.duration,
      whatsappLinks: foundRequest.whatsappLinks,
      features: foundRequest.features,
      whatsappLink: text,
      activatedDate: getCurrentDateTime().date,
      expiryDate: addDaysToDate(foundRequest.duration)
    };

    // Remove from pending requests
    if (foundUser.planRequests) {
      foundUser.planRequests = foundUser.planRequests.filter(r => r.id !== requestId);
    }

    // Add to transactions
    if (!foundUser.transactions) foundUser.transactions = [];
    const { date, time } = getCurrentDateTime();
    foundUser.transactions.push({
      type: `🤖 ${foundRequest.planType === 'upgrade' ? 'Upgrade Plan' : 'Active Plan'} ✅`,
      amount: foundRequest.price,
      date: date,
      time: time,
      planName: foundRequest.planName,
      whatsappLink: text,
      status: 'activated'
    });

    saveUsers();

    // Send notification to user
    await bot.telegram.sendMessage(
      foundRequest.userChatId,
      `🎉 Plan Activated Successfully! 🎉\n\n✅ ${foundRequest.planType === 'upgrade' ? 'Upgrade' : 'Plan'} Details:\n• Plan: ${foundRequest.planName}\n• Price: ${foundRequest.price} PKR\n• Duration: ${foundRequest.duration} days\n• Expiry: ${foundUser.activePlan.expiryDate}\n• Features: ${foundRequest.features}\n\n🔗 Your WhatsApp Link:\n${text}\n\n✨ Thank you for your purchase!`
    );

    await ctx.reply(
      `✅ Plan Activated Successfully! ✅\n\n👤 User: ${foundUser.firstName} (@${foundUsername})\n📱 Plan: ${foundRequest.planName}\n💰 Price: ${foundRequest.price} PKR\n🔗 WhatsApp Link sent to user.\n\n✅ User notified successfully.`,
      Markup.inlineKeyboard([
        [Markup.button.callback('📱 Manage Plans', 'adminManagePlans')],
        [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
      ])
    );

    sessions[chatId] = null;
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
            [Markup.button.callback('🤖 WhatsApp Bot Plans', 'buyBot')],
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

  if (user.planRequests && user.planRequests.length > 0) {
    hasPending = true;
    message += '🤖 Pending Plan Requests:\n';
    user.planRequests.forEach((p, i) => {
      message += i + 1 + '. ' + p.planName + ' (' + (p.planType || 'active') + ')\n';
      message += '   💰 Price: ' + p.price + ' PKR\n';
      message += '   ⏰ Duration: ' + p.duration + ' days\n';
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
      [Markup.button.callback('🤖 WhatsApp Plans', 'buyBot')],
      [Markup.button.callback('💰 Check Balance', 'checkBalance')],
      [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
    ])
  );
});

// ======= WHATSAPP BOT PLANS =======
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
    '🤖 WhatsApp Bot Plans 🤖\n\n✨ Welcome to our WhatsApp Bot Plans section!\n\n💎 Choose Plan Type:',
    Markup.inlineKeyboard([
      [Markup.button.callback('🟢 Active Plan', 'activePlans')],
      [Markup.button.callback('🔄 Upgrade Plan', 'upgradePlans')],
      [Markup.button.callback('📞 Your Ringing Plan', 'ringingPlan')],
      [Markup.button.callback('🔙 Back to Menu', 'backToMenu')]
    ])
  );
});

// Active Plans
bot.action('activePlans', async (ctx) => {
  const session = sessions[ctx.chat.id];
  if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

  const user = users[session.usernameKey];
  
  // Check if user has pending plan request
  if (user.planRequests && user.planRequests.length > 0) {
    return ctx.reply(
      '⚠️ Pending Plan Request Exists ⚠️\n\n📝 You already have a pending plan request.\n\n💡 Please wait for your current request to be processed:\n\n🤖 Pending Plan:\n• Plan: ' + user.planRequests[0].planName + '\n• Type: ' + (user.planRequests[0].planType || 'active') + '\n• Status: ' + (user.planRequests[0].status || 'Pending') + '\n\n⏰ Processing Time:\n• Usually within 1-2 hours\n• You will be notified once processed\n\n📞 Need help? Contact support.',
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 Check Pending Requests', 'viewPendingRequests')],
        [Markup.button.callback('💰 Check Balance', 'checkBalance')],
        [Markup.button.callback('🔙 Back to Plans', 'buyBot')]
      ])
    );
  }

  let message = '🟢 Active Plans Available 🟢\n\n';
  
  plans.active.forEach((plan, index) => {
    message += `${index + 1}. ${plan.name}\n`;
    message += `   💰 Price: ${plan.price} PKR\n`;
    message += `   ⏰ Duration: ${plan.duration} days\n`;
    message += `   🔗 WhatsApp Links: ${plan.whatsappLinks}\n`;
    message += `   ✅ Features: ${plan.features}\n\n`;
  });

  const buttons = [];
  plans.active.forEach((plan, index) => {
    buttons.push([Markup.button.callback(`🛒 Buy ${plan.name}`, `buyActivePlan_${plan.id}`)]);
  });
  buttons.push([Markup.button.callback('🔙 Back to Plans', 'buyBot')]);

  await ctx.reply(
    message,
    Markup.inlineKeyboard(buttons)
  );
});

// Buy Active Plan
bot.action(/buyActivePlan_(\d+)/, async (ctx) => {
  const planId = parseInt(ctx.match[1]);
  const session = sessions[ctx.chat.id];
  if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Please login first.');

  const user = users[session.usernameKey];
  const plan = plans.active.find(p => p.id === planId);
  
  if (!plan) return ctx.answerCbQuery('❌ Plan not found', { show_alert: true });

  // Check balance
  if (user.balance < plan.price) {
    const needed = plan.price - user.balance;
    await ctx.reply(
      `❌ Insufficient Balance ❌\n\n🤖 Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n💵 Your Balance: ${user.balance} PKR\n\n📥 You need ${needed} PKR more to purchase this plan.`,
      Markup.inlineKeyboard([
        [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
        [Markup.button.callback('💰 Check Balance', 'checkBalance')],
        [Markup.button.callback('🔙 Back to Plans', 'activePlans')]
      ])
    );
    return;
  }

  session.selectedPlan = plan;
  session.planType = 'active';

  await ctx.reply(
    `🛒 Confirm Purchase 🛒\n\n📋 Plan Details:\n• Plan: ${plan.name}\n• Price: ${plan.price} PKR\n• Duration: ${plan.duration} days\n• WhatsApp Links: ${plan.whatsappLinks}\n• Features: ${plan.features}\n\n💰 Payment Details:\n• Amount to Deduct: ${plan.price} PKR\n• Your Balance: ${user.balance} PKR\n• After Purchase: ${user.balance - plan.price} PKR\n\n✅ Confirm purchase?`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Yes, Purchase Now', 'confirmPlanPurchase')],
      [Markup.button.callback('❌ Cancel', 'activePlans')]
    ])
  );
});

// Upgrade Plans
bot.action('upgradePlans', async (ctx) => {
  const session = sessions[ctx.chat.id];
  if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

  const user = users[session.usernameKey];
  
  // Check if user has active plan
  if (!user.activePlan) {
    await ctx.reply(
      '❌ No Active Plan Found ❌\n\n📝 You don\'t have an active plan to upgrade.\n\n💡 Please purchase an active plan first.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Buy Active Plan', 'activePlans')],
        [Markup.button.callback('🔙 Back to Plans', 'buyBot')]
      ])
    );
    return;
  }

  // Check if user has pending plan request
  if (user.planRequests && user.planRequests.length > 0) {
    return ctx.reply(
      '⚠️ Pending Plan Request Exists ⚠️\n\n📝 You already have a pending plan request.\n\n💡 Please wait for your current request to be processed.',
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 Check Pending Requests', 'viewPendingRequests')],
        [Markup.button.callback('🔙 Back to Plans', 'buyBot')]
      ])
    );
  }

  // Calculate days left in current plan
  const currentDate = new Date();
  const expiryDate = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
  const daysLeft = Math.max(0, Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24)));

  // Show available upgrade plans (only plans higher than current)
  const currentPlan = plans.active.find(p => p.name === user.activePlan.planName);
  const availableUpgrades = plans.active.filter(p => p.price > (currentPlan ? currentPlan.price : 0));

  if (availableUpgrades.length === 0) {
    await ctx.reply(
      '📈 No Upgrade Available 📈\n\n📝 You already have the highest plan.\n\n💡 No further upgrades available.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Plans', 'buyBot')]
      ])
    );
    return;
  }

  let message = `🔄 Upgrade Your Plan 🔄\n\n📊 Current Plan:\n• Plan: ${user.activePlan.planName}\n• Days Left: ${daysLeft} days\n• Expiry: ${user.activePlan.expiryDate}\n\n📈 Available Upgrades:\n\n`;

  availableUpgrades.forEach((plan, index) => {
    const totalDuration = daysLeft + plan.duration;
    message += `${index + 1}. ${plan.name}\n`;
    message += `   💰 Price: ${plan.price} PKR\n`;
    message += `   ⏰ New Duration: ${totalDuration} days\n`;
    message += `   🔗 WhatsApp Links: ${plan.whatsappLinks}\n`;
    message += `   ✅ Features: ${plan.features}\n\n`;
  });

  const buttons = [];
  availableUpgrades.forEach(plan => {
    buttons.push([Markup.button.callback(`🔼 Upgrade to ${plan.name}`, `buyUpgradePlan_${plan.id}`)]);
  });
  buttons.push([Markup.button.callback('🔙 Back to Plans', 'buyBot')]);

  await ctx.reply(
    message,
    Markup.inlineKeyboard(buttons)
  );
});

// Buy Upgrade Plan
bot.action(/buyUpgradePlan_(\d+)/, async (ctx) => {
  const planId = parseInt(ctx.match[1]);
  const session = sessions[ctx.chat.id];
  if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Please login first.');

  const user = users[session.usernameKey];
  const plan = plans.active.find(p => p.id === planId);
  
  if (!plan) return ctx.answerCbQuery('❌ Plan not found', { show_alert: true });

  // Check if user has active plan
  if (!user.activePlan) {
    return ctx.answerCbQuery('❌ No active plan found', { show_alert: true });
  }

  // Calculate days left in current plan
  const currentDate = new Date();
  const expiryDate = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
  const daysLeft = Math.max(0, Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24)));
  const totalDuration = daysLeft + plan.duration;

  // Check balance
  if (user.balance < plan.price) {
    const needed = plan.price - user.balance;
    await ctx.reply(
      `❌ Insufficient Balance ❌\n\n🤖 Upgrade to: ${plan.name}\n💰 Price: ${plan.price} PKR\n💵 Your Balance: ${user.balance} PKR\n\n📥 You need ${needed} PKR more to upgrade.`,
      Markup.inlineKeyboard([
        [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
        [Markup.button.callback('💰 Check Balance', 'checkBalance')],
        [Markup.button.callback('🔙 Back to Upgrades', 'upgradePlans')]
      ])
    );
    return;
  }

  session.selectedPlan = plan;
  session.planType = 'upgrade';
  session.daysLeft = daysLeft;
  session.totalDuration = totalDuration;

  await ctx.reply(
    `🔄 Confirm Upgrade 🔄\n\n📋 Upgrade Details:\n• Current Plan: ${user.activePlan.planName}\n• New Plan: ${plan.name}\n• Days Left (Current): ${daysLeft} days\n• New Duration: ${plan.duration} days\n• Total Duration: ${totalDuration} days\n• WhatsApp Links: ${plan.whatsappLinks}\n• Features: ${plan.features}\n\n💰 Payment Details:\n• Amount to Deduct: ${plan.price} PKR\n• Your Balance: ${user.balance} PKR\n• After Upgrade: ${user.balance - plan.price} PKR\n\n✅ Confirm upgrade?`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Yes, Upgrade Now', 'confirmPlanPurchase')],
      [Markup.button.callback('❌ Cancel', 'upgradePlans')]
    ])
  );
});

// Ringing Plan (View Current Plan)
bot.action('ringingPlan', async (ctx) => {
  const session = sessions[ctx.chat.id];
  if (!session || !session.usernameKey) return ctx.reply('📝 Please login first.');

  const user = users[session.usernameKey];
  
  if (!user.activePlan) {
    await ctx.reply(
      '📞 Your Ringing Plan 📞\n\n📝 You don\'t have an active plan.\n\n💡 Purchase your first plan to get started!',
      Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Buy Active Plan', 'activePlans')],
        [Markup.button.callback('🔙 Back to Plans', 'buyBot')]
      ])
    );
    return;
  }

  // Calculate days left
  const currentDate = new Date();
  const expiryDate = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
  const daysLeft = Math.max(0, Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24)));

  let message = `📞 Your Active Plan 📞\n\n📋 Plan Details:\n• Plan: ${user.activePlan.planName}\n• Price: ${user.activePlan.price} PKR\n• Activated: ${user.activePlan.activatedDate}\n• Expiry: ${user.activePlan.expiryDate}\n• Days Left: ${daysLeft} days\n• WhatsApp Links: ${user.activePlan.whatsappLinks}\n• Features: ${user.activePlan.features}\n`;

  if (user.activePlan.whatsappLink) {
    message += `\n🔗 Your WhatsApp Link:\n${user.activePlan.whatsappLink}\n`;
  }

  const buttons = [];
  if (daysLeft > 0) {
    // Check if upgrade is available
    const currentPlan = plans.active.find(p => p.name === user.activePlan.planName);
    const availableUpgrades = plans.active.filter(p => p.price > (currentPlan ? currentPlan.price : 0));
    
    if (availableUpgrades.length > 0) {
      buttons.push([Markup.button.callback('🔄 Upgrade Plan', 'upgradePlans')]);
    }
  } else {
    buttons.push([Markup.button.callback('🔄 Renew/Upgrade', 'upgradePlans')]);
  }

  buttons.push(
    [Markup.button.callback('🤖 Buy New Plan', 'activePlans')],
    [Markup.button.callback('🔙 Back to Plans', 'buyBot')]
  );

  await ctx.reply(
    message,
    Markup.inlineKeyboard(buttons)
  );
});

// Confirm Plan Purchase
bot.action('confirmPlanPurchase', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];
  if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 Session expired.');

  const user = users[session.usernameKey];
  const plan = session.selectedPlan;
  
  if (!plan) return ctx.answerCbQuery('❌ Plan not found', { show_alert: true });

  // Check if user already has pending request
  if (user.planRequests && user.planRequests.length > 0) {
    return ctx.answerCbQuery('⚠️ You already have a pending plan request.', { show_alert: true });
  }

  // Check balance again
  if (user.balance < plan.price) {
    return ctx.answerCbQuery('❌ Insufficient balance', { show_alert: true });
  }

  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  } catch (e) {
    console.log('Could not update message:', e.message);
  }

  // Deduct balance immediately
  user.balance -= plan.price;

  const requestId = generatePlanRequestId();
  const { date, time } = getCurrentDateTime();
  
  // Calculate total duration for upgrade
  let totalDuration = plan.duration;
  let note = '';
  
  if (session.planType === 'upgrade' && user.activePlan) {
    const currentDate = new Date();
    const expiryDate = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
    const daysLeft = Math.max(0, Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24)));
    totalDuration = daysLeft + plan.duration;
    note = `Upgrade from ${user.activePlan.planName}. ${daysLeft} days added from current plan.`;
  }

  // Create plan request
  if (!user.planRequests) user.planRequests = [];
  user.planRequests.push({
    id: requestId,
    planId: plan.id,
    planName: plan.name,
    planType: session.planType || 'active',
    price: plan.price,
    duration: totalDuration,
    whatsappLinks: plan.whatsappLinks,
    features: plan.features,
    userChatId: chatId,
    date: date,
    time: time,
    status: 'pending',
    note: note
  });

  // Add to transactions
  if (!user.transactions) user.transactions = [];
  user.transactions.push({
    type: `🤖 ${session.planType === 'upgrade' ? 'Upgrade Plan' : 'Active Plan'} Request`,
    amount: plan.price,
    date: date,
    time: time,
    planName: plan.name,
    status: 'pending_approval'
  });

  saveUsers();

  // Send to admin
  const adminMsg = `
🤖 NEW ${session.planType === 'upgrade' ? 'UPGRADE' : 'PLAN'} REQUEST 🤖

👤 User Information:
• Name: ${user.firstName}
• Username: ${session.usernameKey}
• Phone: ${user.phone}
• Balance: ${user.balance} PKR

📋 Plan Details:
• Plan: ${plan.name}
• Type: ${session.planType === 'upgrade' ? 'Upgrade' : 'New'}
• Price: ${plan.price} PKR
• Duration: ${totalDuration} days
• WhatsApp Links: ${plan.whatsappLinks}
• Features: ${plan.features}

${note ? `📝 Note: ${note}\n` : ''}
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
    `⏳ Plan Request Submitted! ⏳\n\n✅ Request Details:\n🤖 Plan: ${plan.name}\n💰 Price: ${plan.price} PKR\n⏰ Duration: ${totalDuration} days\n📅 Date: ${date}\n⏰ Time: ${time}\n\n📊 Status: Pending Admin Approval 🔄\n\n🔑 Request ID: ${requestId}\n\n💰 Balance Update:\n• Amount Deducted: ${plan.price} PKR\n• New Balance: ${user.balance} PKR\n\n⏰ Processing Time:\n• Usually within 1-2 hours\n• You will be notified upon approval\n\n💡 Note:\nFunds will be held until approval. If rejected, amount will be refunded.`
  );

  // Clear session data
  delete session.selectedPlan;
  delete session.planType;
  delete session.daysLeft;
  delete session.totalDuration;
});

// Continue with the rest of the original code...
// [The rest of your original code remains exactly the same]
// I'll continue from where I left off to save space, but all original functionality is preserved

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

// ... [Rest of the original deposit/withdrawal code remains exactly the same]

// ======= ADMIN PLAN MANAGEMENT =======
bot.action('adminManagePlans', async (ctx) => {
  if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
    return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
  }

  await ctx.reply(
    '📱 Plan Management 📱\n\n👑 Admin Plan Controls:',
    Markup.inlineKeyboard([
      [Markup.button.callback('➕ Add New Plan', 'adminAddPlan')],
      [Markup.button.callback('✏️ Edit Existing Plan', 'adminEditPlan')],
      [Markup.button.callback('👁️ View All Plans', 'adminViewPlans')],
      [Markup.button.callback('📋 Pending Plan Requests', 'adminPendingPlanRequests')],
      [Markup.button.callback('🔙 Back to Admin Menu', 'backToAdminMenu')]
    ])
  );
});

bot.action('adminAddPlan', async (ctx) => {
  if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
    return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
  }

  sessions[ctx.chat.id] = { flow: 'admin_add_plan', step: 'enter_name' };
  
  await ctx.reply(
    '➕ Add New Plan ➕\n\n📝 Enter plan name:\n\n💡 Example: "Premium Plan"'
  );
});

bot.action('adminEditPlan', async (ctx) => {
  if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
    return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
  }

  if (plans.active.length === 0) {
    return ctx.reply(
      '📱 No Plans Available 📱\n\n📝 There are no plans to edit.\n\n💡 Please add plans first.',
      Markup.inlineKeyboard([
        [Markup.button.callback('➕ Add New Plan', 'adminAddPlan')],
        [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
      ])
    );
  }

  let message = '✏️ Select Plan to Edit ✏️\n\n📋 Available Plans:\n\n';
  
  plans.active.forEach((plan, index) => {
    message += `${index + 1}. ${plan.name}\n`;
    message += `   💰 Price: ${plan.price} PKR\n`;
    message += `   ⏰ Duration: ${plan.duration} days\n`;
    message += `   🔗 Links: ${plan.whatsappLinks}\n\n`;
  });

  const buttons = [];
  plans.active.forEach(plan => {
    buttons.push([Markup.button.callback(`✏️ Edit ${plan.name}`, `admin_edit_plan_${plan.id}`)]);
  });
  buttons.push([Markup.button.callback('🔙 Back', 'adminManagePlans')]);

  await ctx.reply(
    message,
    Markup.inlineKeyboard(buttons)
  );
});

bot.action(/admin_edit_plan_(\d+)/, async (ctx) => {
  if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
    return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
  }

  const planId = parseInt(ctx.match[1]);
  const plan = plans.active.find(p => p.id === planId);
  
  if (!plan) return ctx.answerCbQuery('❌ Plan not found', { show_alert: true });

  await ctx.reply(
    `✏️ Edit Plan: ${plan.name} ✏️\n\n📋 Current Details:\n• Name: ${plan.name}\n• Price: ${plan.price} PKR\n• Duration: ${plan.duration} days\n• WhatsApp Links: ${plan.whatsappLinks}\n• Features: ${plan.features}\n\nSelect field to edit:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('📛 Edit Name', `admin_edit_field_${planId}_name`)],
      [Markup.button.callback('💰 Edit Price', `admin_edit_field_${planId}_price`)],
      [Markup.button.callback('⏰ Edit Duration', `admin_edit_field_${planId}_duration`)],
      [Markup.button.callback('🔗 Edit Links', `admin_edit_field_${planId}_whatsappLinks`)],
      [Markup.button.callback('📋 Edit Features', `admin_edit_field_${planId}_features`)],
      [Markup.button.callback('🔙 Back', 'adminEditPlan')]
    ])
  );
});

bot.action(/admin_edit_field_(\d+)_(.+)/, async (ctx) => {
  if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
    return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
  }

  const planId = parseInt(ctx.match[1]);
  const field = ctx.match[2];
  const plan = plans.active.find(p => p.id === planId);
  
  if (!plan) return ctx.answerCbQuery('❌ Plan not found', { show_alert: true });

  sessions[ctx.chat.id] = {
    flow: 'admin_edit_plan',
    step: 'enter_field',
    planId: planId,
    editField: field
  };

  const fieldNames = {
    name: 'plan name',
    price: 'plan price (PKR)',
    duration: 'plan duration (days)',
    whatsappLinks: 'number of WhatsApp links',
    features: 'plan features'
  };

  await ctx.reply(
    `✏️ Editing ${fieldNames[field]} for ${plan.name}\n\n📝 Current value: ${plan[field]}\n\nEnter new value:`
  );
});

bot.action('adminViewPlans', async (ctx) => {
  if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
    return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
  }

  if (plans.active.length === 0) {
    return ctx.reply(
      '📱 No Plans Available 📱\n\n📝 There are no plans in the system.\n\n💡 Please add plans first.',
      Markup.inlineKeyboard([
        [Markup.button.callback('➕ Add New Plan', 'adminAddPlan')],
        [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
      ])
    );
  }

  let message = '📋 All Active Plans 📋\n\n';
  
  plans.active.forEach((plan, index) => {
    message += `${index + 1}. ${plan.name}\n`;
    message += `   💰 Price: ${plan.price} PKR\n`;
    message += `   ⏰ Duration: ${plan.duration} days\n`;
    message += `   🔗 WhatsApp Links: ${plan.whatsappLinks}\n`;
    message += `   ✅ Features: ${plan.features}\n`;
    message += `   🆔 ID: ${plan.id}\n\n`;
  });

  message += `📊 Total Plans: ${plans.active.length}`;

  await ctx.reply(
    message,
    Markup.inlineKeyboard([
      [Markup.button.callback('➕ Add New Plan', 'adminAddPlan')],
      [Markup.button.callback('✏️ Edit Plans', 'adminEditPlan')],
      [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
    ])
  );
});

bot.action('adminPendingPlanRequests', async (ctx) => {
  if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
    return ctx.answerCbQuery('⚠️ Admin access only!', { show_alert: true });
  }

  // Collect all pending plan requests from all users
  let pendingRequests = [];
  
  Object.entries(users).forEach(([username, user]) => {
    if (user.planRequests && user.planRequests.length > 0) {
      user.planRequests.forEach(request => {
        if (request.status === 'pending') {
          pendingRequests.push({
            username: username,
            user: user,
            request: request
          });
        }
      });
    }
  });

  if (pendingRequests.length === 0) {
    return ctx.reply(
      '📋 No Pending Plan Requests 📋\n\n✅ All plan requests have been processed.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Plan Management', 'adminManagePlans')]
      ])
    );
  }

  let message = '📋 Pending Plan Requests 📋\n\n';
  
  pendingRequests.forEach((item, index) => {
    message += `${index + 1}. ${item.user.firstName} (@${item.username})\n`;
    message += `   🤖 Plan: ${item.request.planName}\n`;
    message += `   💰 Price: ${item.request.price} PKR\n`;
    message += `   ⏰ Duration: ${item.request.duration} days\n`;
    message += `   📅 Date: ${item.request.date} ${item.request.time}\n`;
    message += `   🔑 Request ID: ${item.request.id}\n\n`;
  });

  const buttons = [];
  pendingRequests.slice(0, 5).forEach(item => {
    buttons.push([Markup.button.callback(`👤 ${item.user.firstName} - ${item.request.planName}`, `admin_view_plan_request_${item.request.id}`)]);
  });
  buttons.push([Markup.button.callback('🔙 Back', 'adminManagePlans')]);

  await ctx.reply(
    message,
    Markup.inlineKeyboard(buttons)
  );
});

bot.action(/admin_view_plan_request_(.+)/, async (ctx) => {
  const requestId = ctx.match[1];
  
  // Find the request
  let foundRequest = null;
  let foundUser = null;
  let foundUsername = '';
  
  for (const [username, user] of Object.entries(users)) {
    if (user.planRequests) {
      const request = user.planRequests.find(r => r.id === requestId);
      if (request) {
        foundRequest = request;
        foundUser = user;
        foundUsername = username;
        break;
      }
    }
  }

  if (!foundRequest) {
    return ctx.answerCbQuery('❌ Request not found', { show_alert: true });
  }

  await ctx.reply(
    `📋 Plan Request Details 📋\n\n👤 User Information:\n• Name: ${foundUser.firstName}\n• Username: @${foundUsername}\n• Phone: ${foundUser.phone}\n• Balance: ${foundUser.balance} PKR\n\n📋 Plan Details:\n• Plan: ${foundRequest.planName}\n• Type: ${foundRequest.planType}\n• Price: ${foundRequest.price} PKR\n• Duration: ${foundRequest.duration} days\n• WhatsApp Links: ${foundRequest.whatsappLinks}\n• Features: ${foundRequest.features}\n\n📅 Request Details:\n• Date: ${foundRequest.date}\n• Time: ${foundRequest.time}\n• Request ID: ${foundRequest.id}\n\n${foundRequest.note ? `📝 Note: ${foundRequest.note}\n\n` : ''}Select action:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Approve Request', `admin_approve_plan_${foundRequest.userChatId}_${requestId}`)],
      [Markup.button.callback('❌ Reject Request', `admin_reject_plan_${foundRequest.userChatId}_${requestId}`)],
      [Markup.button.callback('🔙 Back to Requests', 'adminPendingPlanRequests')]
    ])
  );
});

// ======= ADMIN PLAN APPROVAL =======
bot.action(/admin_approve_plan_(\d+)_(.+)/, async (ctx) => {
  const [_, userChatId, requestId] = ctx.match;
  
  // Find the request
  let foundRequest = null;
  let foundUser = null;
  let foundUsername = '';
  
  for (const [username, user] of Object.entries(users)) {
    if (user.planRequests) {
      const requestIndex = user.planRequests.findIndex(r => r.id === requestId);
      if (requestIndex !== -1) {
        foundRequest = user.planRequests[requestIndex];
        foundUser = user;
        foundUsername = username;
        break;
      }
    }
  }

  if (!foundRequest) {
    return ctx.answerCbQuery('❌ Request not found', { show_alert: true });
  }

  // Update request status
  foundRequest.status = 'approved';
  foundRequest.approvedDate = getCurrentDateTime().date;
  foundRequest.approvedTime = getCurrentDateTime().time;

  await ctx.editMessageText(
    `✅ Plan Request Approved! ✅\n\n👤 User: ${foundUser.firstName} (@${foundUsername})\n🤖 Plan: ${foundRequest.planName}\n💰 Price: ${foundRequest.price} PKR\n⏰ Duration: ${foundRequest.duration} days\n\n📊 Status: Approved ✅\n\nNow send the WhatsApp link to activate the plan:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🔗 Send WhatsApp Link', `admin_send_link_${requestId}`)],
      [Markup.button.callback('📋 Back to Requests', 'adminPendingPlanRequests')]
    ])
  );
});

bot.action(/admin_send_link_(.+)/, async (ctx) => {
  const requestId = ctx.match[1];
  
  sessions[ctx.chat.id] = {
    flow: 'admin_send_link',
    requestId: requestId
  };

  await ctx.reply(
    '🔗 Send WhatsApp Link 🔗\n\nEnter the WhatsApp link for the user:\n\n💡 Format:\nhttps://wa.me/923001234567\n\nor\n\nhttps://whatsapp.com/channel/xxxxxxxxxx\n\nEnter link:'
  );
});

bot.action(/admin_reject_plan_(\d+)_(.+)/, async (ctx) => {
  const [_, userChatId, requestId] = ctx.match;
  
  const adminSession = sessions[ctx.chat.id] || {};
  adminSession.flow = 'admin_reject_reason';
  sessions[ctx.chat.id] = adminSession;
  
  pendingAdminRejections[ctx.chat.id] = {
    requestType: 'plan',
    userChatId: userChatId,
    requestId: requestId
  };
  
  await ctx.answerCbQuery();
  await ctx.reply('📝 Please enter the reason for rejecting this plan request:');
});

// ======= PROCESS PLAN REJECTION =======
async function processPlanRejection(userChatId, requestId, reason, adminCtx) {
  const session = sessions[userChatId];
  if (!session || !session.usernameKey) {
    await adminCtx.answerCbQuery('👤 User not found.');
    return;
  }

  const user = users[session.usernameKey];
  if (!user.planRequests) {
    await adminCtx.answerCbQuery('🤖 No pending plan requests.');
    return;
  }

  const requestIndex = user.planRequests.findIndex(r => r.id === requestId);
  if (requestIndex === -1) {
    await adminCtx.answerCbQuery('✅ Request already processed.');
    return;
  }

  const request = user.planRequests[requestIndex];
  const { date, time } = getCurrentDateTime();

  // Refund the amount
  user.balance += request.price;

  // Add to transactions
  if (!user.transactions) user.transactions = [];
  user.transactions.push({
    type: `🤖 ${request.planType === 'upgrade' ? 'Upgrade Plan' : 'Active Plan'} ❌ (Rejected)`,
    amount: request.price,
    date: date,
    time: time,
    planName: request.planName,
    status: 'rejected',
    rejectionReason: reason
  });

  // Notify user
  await bot.telegram.sendMessage(
    userChatId,
    `❌ Plan Request Rejected ❌\n\n⚠️ Request Details:\n🤖 Plan: ${request.planName}\n💰 Price: ${request.price} PKR\n⏰ Duration: ${request.duration} days\n📅 Date: ${date}\n⏰ Time: ${time}\n\n📝 Rejection Reason:\n${reason}\n\n💰 Balance Update:\n✅ Your balance has been refunded.\n• Amount Refunded: ${request.price} PKR\n• New Balance: ${user.balance} PKR\n\n💡 What to do next:\n1. Check the reason above\n2. Contact support if needed\n3. Submit a new request if applicable\n\n📞 Support Available 24/7`
  );

  // Remove request
  user.planRequests.splice(requestIndex, 1);
  saveUsers();

  await adminCtx.editMessageText(
    `❌ Plan Request Rejected ❌\n\n👤 User: ${user.firstName}\n🤖 Plan: ${request.planName}\n💰 Price: ${request.price} PKR refunded\n\n📋 Rejection Reason:\n${reason}`
  );
}

// ======= MODIFIED BACK TO MENU =======
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
        [Markup.button.callback('📱 Manage Plans', 'adminManagePlans')],
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
        [Markup.button.callback('🤖 WhatsApp Bot Plans', 'buyBot')],
        [Markup.button.callback('📥 Deposit Funds', 'depositBalance')],
        [Markup.button.callback('📤 Withdraw Funds', 'withdrawBalance')],
        [Markup.button.callback('📞 Contact Support', 'contactSupport')],
        [Markup.button.callback('🚪 Log Out', 'logOut')]
      ])
    );
  }
});

// ======= MODIFIED BACK TO ADMIN MENU =======
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
      [Markup.button.callback('📱 Manage Plans', 'adminManagePlans')],
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
console.log('📱 WhatsApp Bot Plans system loaded');
console.log('👑 Admin features loaded');
console.log('🔔 Plan Management System Active');
