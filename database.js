// database.js
const mongoose = require('mongoose');
require('dotenv').config();

class Database {
    constructor() {
        this.connection = null;
        this.connect();
    }

    async connect() {
        try {
            // MongoDB connection string - یہ آپ کے MogoDB URI سے تبدیل کریں
            const MONGODB_URI = process.env.MONGODB_URI || '';
            
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            this.connection = mongoose.connection;
            
            this.connection.on('connected', () => {
                console.log('✅ MongoDB Connected Successfully!');
                console.log('📊 Database:', this.connection.name);
                console.log('📍 Host:', this.connection.host);
            });

            this.connection.on('error', (err) => {
                console.error('❌ MongoDB Connection Error:', err.message);
            });

            this.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB Disconnected');
            });

            // Define Schemas
            this.defineSchemas();

        } catch (error) {
            console.error('❌ MongoDB Connection Failed:', error.message);
            console.log('🔄 Retrying connection in 5 seconds...');
            setTimeout(() => this.connect(), 5000);
        }
    }

    defineSchemas() {
        // User Schema
        this.UserSchema = new mongoose.Schema({
            username: { type: String, required: true, unique: true },
            firstName: { type: String, required: true },
            dob: { type: String, required: true },
            phone: { type: String, required: true, unique: true },
            password: { type: String, required: true },
            registered: { type: String, required: true },
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
                type: { type: String },
                amount: { type: Number },
                bonus: { type: Number },
                totalAmount: { type: Number },
                fee: { type: Number },
                netAmount: { type: Number },
                date: { type: String },
                time: { type: String },
                proof: { type: String },
                account: { type: String },
                plan: { type: String },
                status: { type: String },
                note: { type: String },
                rejectionReason: { type: String }
            }],
            pendingDeposits: [{
                id: { type: String },
                amount: { type: Number },
                bonus: { type: Number },
                totalAmount: { type: Number },
                method: { type: String },
                proof: { type: String },
                date: { type: String },
                time: { type: String },
                status: { type: String }
            }],
            pendingWithdrawals: [{
                id: { type: String },
                amount: { type: Number },
                netAmount: { type: Number },
                fee: { type: Number },
                method: { type: String },
                account: { type: String },
                date: { type: String },
                time: { type: String },
                status: { type: String },
                approvedDate: { type: String },
                approvedTime: { type: String },
                completedDate: { type: String },
                completedTime: { type: String }
            }],
            pendingPlanRequests: [{
                id: { type: String },
                planId: { type: String },
                planName: { type: String },
                price: { type: Number },
                duration: { type: Number },
                features: [{ type: String }],
                type: { type: String },
                date: { type: String },
                time: { type: String },
                status: { type: String }
            }],
            activePlan: {
                id: { type: String },
                name: { type: String },
                price: { type: Number },
                duration: { type: Number },
                features: [{ type: String }],
                whatsappLink: { type: String },
                purchaseDate: { type: String },
                expiryDate: { type: String },
                status: { type: String }
            },
            processedRequests: { type: Map, of: Boolean, default: {} }
        }, { timestamps: true });

        // Plan Schema
        this.PlanSchema = new mongoose.Schema({
            id: { type: String, required: true, unique: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            duration: { type: Number, required: true },
            features: [{ type: String }],
            whatsappCount: { type: Number, default: 1 }
        }, { timestamps: true });

        // Create Models
        this.User = mongoose.model('User', this.UserSchema);
        this.Plan = mongoose.model('Plan', this.PlanSchema);

        console.log('✅ Database Schemas Defined');
    }

    async isConnected() {
        return this.connection && this.connection.readyState === 1;
    }

    async disconnect() {
        if (this.connection) {
            await mongoose.disconnect();
            console.log('🔌 MongoDB Disconnected');
        }
    }
}

// Singleton instance
const database = new Database();
module.exports = database;
