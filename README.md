Paid WhatsApp Bot - Documentation

📋 Project Overview

A complete WhatsApp Automation Bot controlled via Telegram. This bot allows users to purchase WhatsApp bot plans, manage their balance, and perform financial transactions.

🚀 Features

For Users:

· ✅ Account registration and login system
· ✅ Balance checking system
· ✅ Deposit and withdrawal system
· ✅ WhatsApp bot plan purchase
· ✅ Plan upgrade option
· ✅ Pending requests management
· ✅ Transaction history

For Admin:

· ✅ Complete admin panel
· ✅ User management (ban/unban)
· ✅ Temporary block system (6, 12, 24 hours)
· ✅ User account deletion
· ✅ Manual balance update
· ✅ Plan management (Add/Edit/Delete/Hide)
· ✅ Transaction approval/rejection
· ✅ Database status monitoring

🛠 Technologies

Core Libraries:

· Telegraf.js - Telegram Bot API
· Mongoose - MongoDB connection
· FS - File system (fallback storage)

Database:

· MongoDB - Primary database
· JSON Files - Fallback storage

Key Dependencies:

```json
{
  "telegraf": "^4.16.3",
  "mongoose": "^8.3.0",
  "fs": "0.0.1-security"
}
```

📁 File Structure

```
whatsapp-bot/
├── bot.js                    # Main bot file
├── database.js              # Database connection
├── sms-alert-bot.js         # SMS alert system
├── help.js                  # Help commands
├── users.json               # Local user storage (fallback)
├── plans.json              # Local plan storage (fallback)
└── README.md               # This file
```

🔧 Installation & Setup

Prerequisites:

· Node.js (v14 or higher)
· MongoDB database
· Telegram Bot Token
· Admin Telegram ID

Step 1: Clone and Install

```bash
git clone [repository-url]
cd whatsapp-bot
npm install telegraf mongoose
```

Step 2: Configure Bot

Edit bot.js and update these values:

```javascript
const bot = new Telegraf('YOUR_TELEGRAM_BOT_TOKEN'); // Line 7
const ADMIN_ID = YOUR_ADMIN_TELEGRAM_ID; // Line 8
```

Step 3: Configure Database

Create database.js:

```javascript
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: String,
    firstName: String,
    dob: String,
    phone: String,
    password: String,
    registered: String,
    balance: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    tempBlock: Object,
    transactions: Array,
    pendingDeposits: Array,
    pendingWithdrawals: Array,
    pendingPlanRequests: Array,
    activePlan: Object,
    dailyDeposits: Object,
    dailyWithdrawals: Object,
    processedRequests: Object
});

const PlanSchema = new mongoose.Schema({
    id: String,
    name: String,
    price: Number,
    duration: Number,
    features: Array,
    whatsappCount: Number,
    visible: { type: Boolean, default: true }
});

module.exports = {
    User: mongoose.model('User', UserSchema),
    Plan: mongoose.model('Plan', PlanSchema),
    connection: mongoose.connection,
    
    async connect() {
        try {
            await mongoose.connect('mongodb://localhost:27017/whatsappbot', {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
        }
    },
    
    async disconnect() {
        await mongoose.disconnect();
    },
    
    async isConnected() {
        return mongoose.connection.readyState === 1;
    }
};
```

Step 4: Run the Bot

```bash
node bot.js
```

⚙️ Configuration

Environment Variables:

· BOT_TOKEN: Your Telegram bot token
· ADMIN_ID: Admin's Telegram user ID
· MONGODB_URI: MongoDB connection string

Default Plans:

The bot creates 4 default plans:

1. Basic Plan - 350 PKR for 15 days
2. Standard Plan - 500 PKR for 30 days
3. Premium Plan - 1200 PKR for 90 days
4. Business Plan - 2000 PKR for 90 days

Payment Methods:

· JazzCash
· EasyPaisa
· U-Paisa

🎯 User Flow

1. Registration:

· User clicks "Sign Up"
· Enters: First Name, Date of Birth, WhatsApp Number
· Chooses username and password
· Account created successfully

2. Login:

· User clicks "Log In"
· Enters username and password
· Access to dashboard

3. Deposit Funds:

· User clicks "Deposit Funds"
· Selects payment method
· Enters amount and transaction proof
· Admin approval required

4. Purchase Plan:

· User clicks "Buy WhatsApp Bot"
· Selects plan
· Balance checked
· Payment deducted
· Admin approval required for WhatsApp link

5. Withdraw Funds:

· User clicks "Withdraw Funds"
· Enters amount (minimum 200 PKR)
· Selects payment method and account number
· 2% processing fee
· Admin approval required

👑 Admin Features

Admin Dashboard:

```
📊 All Users Stats
🔍 Search User
💰 Manual Balance Update
📋 View All Transactions
🚫 Ban/Unban User
⏱️ Temporary Block User
🗑️ Delete User Account
🤖 Plan Management
👤 User Mode
🔄 Database Status
```

Plan Management:

· Add new plans
· Edit existing plans
· Show/Hide plans from users
· Delete plans permanently
· View pending plan requests

User Management:

· Ban/Unban users
· Temporary block (6, 12, 24 hours)
· Delete user accounts
· Update user balance
· View user transactions

💰 Financial System

Deposits:

· Minimum: 100 PKR
· Maximum: 5,000 PKR per transaction
· Daily limit: 20,000 PKR
· 5 transactions per day max
· 2% bonus on every deposit

Withdrawals:

· Minimum: 200 PKR
· Maximum: 5,000 PKR per transaction
· Daily limit: 15,000 PKR
· 3 transactions per day max
· 2% processing fee (minimum 10 PKR)

🔒 Security Features

User Security:

· Password validation (8+ chars, uppercase, lowercase, numbers)
· Unique username validation
· Phone number validation (Pakistan format)
· Age restriction (14-55 years)

System Security:

· Session management
· Daily transaction limits
· Balance validation
· Pending request checks
· Duplicate request prevention

🚦 Bot Commands

User Commands:

· /start - Start the bot
· Check Balance - View account balance
· Buy WhatsApp Bot - Purchase plans
· Deposit Funds - Add money to account
· Withdraw Funds - Withdraw money
· Contact Support - Get support
· Log Out - End session

Admin Commands:

Available only to admin users through inline keyboard buttons.

📊 Database Schema

User Model:

```javascript
{
    username: String,          // Unique username
    firstName: String,         // User's first name
    dob: String,              // Date of birth
    phone: String,            // WhatsApp number
    password: String,         // Encrypted password
    registered: String,       // Registration date
    balance: Number,          // Account balance
    isBanned: Boolean,        // Ban status
    tempBlock: Object,        // Temporary block info
    transactions: Array,      // All transactions
    pendingDeposits: Array,   // Pending deposits
    pendingWithdrawals: Array, // Pending withdrawals
    pendingPlanRequests: Array, // Pending plan requests
    activePlan: Object,       // Current active plan
    dailyDeposits: Object,    // Daily deposit limits
    dailyWithdrawals: Object, // Daily withdrawal limits
    processedRequests: Object // Prevent duplicate requests
}
```

Plan Model:

```javascript
{
    id: String,              // Unique plan ID
    name: String,            // Plan name
    price: Number,           // Price in PKR
    duration: Number,        // Duration in days
    features: Array,         // Plan features
    whatsappCount: Number,   // Number of WhatsApp links
    visible: Boolean         // Show/hide from users
}
```

⚠️ Error Handling

Common Errors:

· Invalid username/password
· Insufficient balance
· Daily limits exceeded
· Invalid transaction proof
· Session expired
· User not found

Fallback System:

· If MongoDB fails, uses local JSON files
· Automatic reconnection attempts
· Data synchronization between DB and cache

📱 User Interface

Welcome Screen:

```
👋 Welcome to Paid WhatsApp Bot!
✨ Your Complete WhatsApp Automation Solution

🚀 Features:
✅ Automated WhatsApp Messaging
✅ Bulk Message Sending
✅ Contact Management
✅ Scheduled Campaigns
✅ Real-time Analytics

📱 Get Started:
Please sign up for a new account or log in...
```

Dashboard:

```
✨ Welcome back, [Name]!
💡 What would you like to do today?

💰 Check Balance
🤖 Buy WhatsApp Bot
📥 Deposit Funds
📤 Withdraw Funds
📞 Contact Support
🚪 Log Out
```

🔄 Workflow Examples

Example 1: User Registration

1. User clicks "Sign Up"
2. Enters: John, 15-05-1990, 923001234567
3. Chooses: john_123, Password123
4. Account created, notification sent to admin
5. User logs in with credentials

Example 2: Plan Purchase

1. User clicks "Buy WhatsApp Bot"
2. Selects "Premium Plan - 1200 PKR"
3. Balance checked (must have ≥1200 PKR)
4. Payment deducted
5. Request sent to admin for approval
6. Admin adds WhatsApp link
7. User notified, plan activated

Example 3: Admin Actions

1. Admin searches for user
2. Views user details
3. Temporarily blocks for 24 hours
4. Enters reason: "Suspicious activity"
5. User notified, cannot access features

🛡️ Security Best Practices

Implemented:

· Password complexity requirements
· Input validation and sanitization
· Session timeout
· Rate limiting
· Secure data storage

Recommended:

· Use environment variables for sensitive data
· Regular database backups
· SSL/TLS for production
· Regular security audits

🚀 Deployment

Local Development:

```bash
node bot.js
```

Production:

1. Use PM2 or similar process manager
2. Set up MongoDB Atlas for cloud database
3. Configure environment variables
4. Set up SSL certificate
5. Enable regular backups

PM2 Configuration:

```bash
npm install -g pm2
pm2 start bot.js --name whatsapp-bot
pm2 save
pm2 startup
```

🔍 Troubleshooting

Common Issues:

1. Bot not responding:
   · Check bot token
   · Verify internet connection
   · Check MongoDB connection
2. Database errors:
   · Verify MongoDB URI
   · Check database permissions
   · Ensure collections exist
3. Payment issues:
   · Verify payment method details
   · Check balance calculations
   · Review transaction logs

Logs:

· All actions logged to console
· Error messages include timestamps
· Success/failure notifications

📞 Support

Built-in Support:

· Contact support button in bot
· Direct Telegram link: @help_paid_whatsapp_bot

Technical Support:

· Check server logs
· Review database connections
· Verify configuration files

📝 License & Credits

License:

Proprietary - For internal use only

Credits:

· Developed for Paid WhatsApp Bot service
· Built with Telegraf.js and MongoDB
· Custom development for specific business needs

🔄 Updates & Maintenance

Regular Maintenance:

· Daily database backups
· Monitor transaction logs
· Review security logs
· Update dependencies regularly

Future Enhancements:

· Multi-language support
· More payment methods
· Advanced reporting
· Mobile app integration

---

Note: This bot is designed for specific business requirements and includes custom features for WhatsApp automation services. All financial transactions should be monitored and verified by administrators.
