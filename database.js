const mongoose = require('mongoose');

// Heroku کے لیے: Environment variable سے connection string لیں
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DB?retryWrites=true&w=majority';

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    firstName: String,
    dob: String,
    phone: String,
    password: String,
    registered: String,
    balance: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    
    dailyDeposits: {
        date: String,
        count: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
    },
    
    dailyWithdrawals: {
        date: String,
        count: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
    },
    
    transactions: [{
        type: String,
        amount: Number,
        bonus: Number,
        totalAmount: Number,
        netAmount: Number,
        fee: Number,
        date: String,
        time: String,
        proof: String,
        account: String,
        plan: String,
        status: String,
        rejectionReason: String,
        note: String
    }],
    
    pendingDeposits: [{
        id: String,
        amount: Number,
        bonus: Number,
        totalAmount: Number,
        method: String,
        proof: String,
        date: String,
        time: String,
        status: String
    }],
    
    pendingWithdrawals: [{
        id: String,
        amount: Number,
        netAmount: Number,
        fee: Number,
        method: String,
        account: String,
        date: String,
        time: String,
        status: String
    }],
    
    pendingPlanRequests: [{
        id: String,
        planId: String,
        planName: String,
        price: Number,
        duration: Number,
        features: [String],
        type: String,
        date: String,
        time: String,
        status: String
    }],
    
    activePlan: {
        id: String,
        name: String,
        price: Number,
        duration: Number,
        features: [String],
        whatsappLink: String,
        purchaseDate: String,
        expiryDate: String,
        status: String
    },
    
    processedRequests: {
        type: Map,
        of: Boolean,
        default: {}
    }
});

const User = mongoose.model('User', userSchema);

// In-memory cache for users
let usersCache = {};

// Connect to MongoDB
async function connectDB() {
    try {
        console.log('🔗 Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ MongoDB Atlas connected successfully!');
        
        // Load all users into cache
        const allUsers = await User.find({});
        allUsers.forEach(user => {
            const userObj = user.toObject();
            // Remove MongoDB internal fields
            delete userObj._id;
            delete userObj.__v;
            usersCache[userObj.username] = userObj;
        });
        
        console.log(`📊 Loaded ${Object.keys(usersCache).length} users from database`);
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        // Fallback to local JSON file if MongoDB fails
        try {
            const fs = require('fs');
            if (fs.existsSync('./users.json')) {
                const localUsers = JSON.parse(fs.readFileSync('./users.json', 'utf8'));
                usersCache = localUsers;
                console.log(`📂 Fallback: Loaded ${Object.keys(usersCache).length} users from local JSON`);
            }
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError.message);
        }
        return false;
    }
}

// Save a user to database
async function saveUser(username) {
    try {
        const userData = usersCache[username];
        if (!userData) {
            console.log(`⚠️ User ${username} not found in cache`);
            return false;
        }
        
        await User.findOneAndUpdate(
            { username: username },
            userData,
            { 
                upsert: true,
                new: true,
                setDefaultsOnInsert: true 
            }
        );
        
        console.log(`💾 Saved user: ${username}`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving user ${username}:`, error.message);
        return false;
    }
}

// Auto-save all users periodically (every 5 minutes)
function startAutoSave(intervalMinutes = 5) {
    setInterval(async () => {
        console.log(`🔄 Auto-saving ${Object.keys(usersCache).length} users...`);
        for (const username in usersCache) {
            await saveUser(username);
        }
        console.log('✅ Auto-save completed');
    }, intervalMinutes * 60 * 1000);
}

// Export functions and cache
module.exports = {
    connectDB,
    saveUser,
    startAutoSave,
    users: usersCache,
    
    // Helper functions
    getUser: (username) => usersCache[username],
    userExists: (username) => username in usersCache,
    getAllUsers: () => usersCache,
    
    // Add user to cache
    addUser: (username, userData) => {
        usersCache[username] = userData;
        return saveUser(username);
    },
    
    // Update user in cache
    updateUser: (username, updates) => {
        if (usersCache[username]) {
            usersCache[username] = { ...usersCache[username], ...updates };
            return saveUser(username);
        }
        return false;
    }
};
