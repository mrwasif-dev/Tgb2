// bot.js - مکمل مین فائل
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const database = require('./database');

require('./sms-alert-bot.js');
require('./help.js');

// ===== بوٹ =====
const bot = new Telegraf('8226474686:AAEmXiWRGoeaa5pZpF2MZlYViYmSkM70fbI');
const ADMIN_ID = 6012422087;

// ===== ڈیٹا بیس =====
let users = {};
let plans = {};

// ڈیٹا بیس سے ابتدائی ڈیٹا لوڈ کریں
async function initializeData() {
    try {
        if (await database.isConnected()) {
            // صارفین کو لوڈ کریں
            const userDocs = await database.User.find({});
            userDocs.forEach(user => {
                users[user.username] = user.toObject();
            });
            console.log(`✅ ڈیٹا بیس سے ${Object.keys(users).length} صارفین لوڈ ہوئے`);

            // پلانز کو لوڈ کریں
            let planDocs = await database.Plan.find({});
            if (planDocs.length === 0) {
                // ڈیفالٹ پلانز بنائیں اگر کوئی موجود نہ ہوں
                const defaultPlans = [
                    { id: 'plan1', name: 'بنیادی پلان', price: 350, duration: 15, features: ['1 واٹس ایپ لنک'], whatsappCount: 1 },
                    { id: 'plan2', name: 'معیاری پلان', price: 500, duration: 30, features: ['1 واٹس ایپ لنک'], whatsappCount: 1 },
                    { id: 'plan3', name: 'پریمیم پلان', price: 1200, duration: 90, features: ['1 واٹس ایپ لنک'], whatsappCount: 1 },
                    { id: 'plan4', name: 'کاروباری پلان', price: 2000, duration: 90, features: ['2 واٹس ایپ لنکس'], whatsappCount: 2 }
                ];
                
                await database.Plan.insertMany(defaultPlans);
                console.log('✅ ڈیفالٹ پلانز بن گئے');
                
                planDocs = await database.Plan.find({});
            }
            
            planDocs.forEach(plan => {
                plans[plan.id] = plan.toObject();
            });
            console.log(`✅ ڈیٹا بیس سے ${Object.keys(plans).length} پلانز لوڈ ہوئے`);
        } else {
            console.log('⚠️ مقامی اسٹوریج استعمال ہو رہی ہے');
            // اگر ڈیٹا بیس کنکٹ نہ ہو تو مقامی فائلوں کو استعمال کریں
            const DATA_FILE = './users.json';
            const PLANS_FILE = './plans.json';
            
            if (fs.existsSync(DATA_FILE)) {
                users = JSON.parse(fs.readFileSync(DATA_FILE));
                console.log(`✅ مقامی فائل سے ${Object.keys(users).length} صارفین لوڈ ہوئے`);
            }
            
            if (fs.existsSync(PLANS_FILE)) {
                plans = JSON.parse(fs.readFileSync(PLANS_FILE));
                console.log(`✅ مقامی فائل سے ${Object.keys(plans).length} پلانز لوڈ ہوئے`);
            }
        }
    } catch (error) {
        console.error('❌ ڈیٹا ابتدائی کرنے میں خرابی:', error.message);
    }
}

async function saveUser(username, userData) {
    try {
        if (await database.isConnected()) {
            await database.User.findOneAndUpdate(
                { username: username },
                userData,
                { upsert: true, new: true }
            );
            // مقامی کیش کو اپ ڈیٹ کریں
            users[username] = userData;
        } else {
            // مقامی فائل کا استعمال
            users[username] = userData;
            fs.writeFileSync('./users.json', JSON.stringify(users, null, 2));
        }
    } catch (error) {
        console.error('❌ صارف محفوظ کرنے میں خرابی:', error.message);
    }
}

async function savePlan(planId, planData) {
    try {
        if (await database.isConnected()) {
            await database.Plan.findOneAndUpdate(
                { id: planId },
                planData,
                { upsert: true, new: true }
            );
            // مقامی کیش کو اپ ڈیٹ کریں
            plans[planId] = planData;
        } else {
            // مقامی فائل کا استعمال
            plans[planId] = planData;
            fs.writeFileSync('./plans.json', JSON.stringify(plans, null, 2));
        }
    } catch (error) {
        console.error('❌ پلان محفوظ کرنے میں خرابی:', error.message);
    }
}

async function deletePlan(planId) {
    try {
        if (await database.isConnected()) {
            await database.Plan.findOneAndDelete({ id: planId });
        }
        delete plans[planId];
        if (!await database.isConnected()) {
            fs.writeFileSync('./plans.json', JSON.stringify(plans, null, 2));
        }
        return true;
    } catch (error) {
        console.error('❌ پلان ڈیلیٹ کرنے میں خرابی:', error.message);
        return false;
    }
}

const sessions = {};
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// ایڈمن ریجیکشن کی وجوہات محفوظ کریں
const pendingAdminRejections = {};

// ===== تاریخ اور وقت (پاکستان کا وقت) =====
function getCurrentDateTime() {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const pakistanTime = new Date(utc + 5 * 60 * 60 * 1000);

    const date = `${String(pakistanTime.getDate()).padStart(2,'0')}-${String(pakistanTime.getMonth()+1).padStart(2,'0')}-${pakistanTime.getFullYear()}`;
    const time = `${String(pakistanTime.getHours()).padStart(2,'0')}:${String(pakistanTime.getMinutes()).padStart(2,'0')}:${String(pakistanTime.getSeconds()).padStart(2,'0')}`;

    return { date, time };
}

// ======= بیک بٹن ہیلپر =======
function withBackButton(buttons = []) {
    return Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
    ]);
}

// ======= منفرد آئی ڈیز بنائیں =======
function generateDepositId() {
    return 'dep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function generateWithdrawId() {
    return 'wd_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function generatePlanRequestId() {
    return 'plan_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// ======= شروع =======
bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];

    // ڈیٹا کو ابتدائی کریں اگر لوڈ نہ ہوا ہو
    if (Object.keys(users).length === 0) {
        await initializeData();
    }

    // چیک کریں کہ ایڈمن ہے
    if (chatId.toString() === ADMIN_ID.toString()) {
        return ctx.reply(
            '👑 ایڈمن خوش آمدید! 👑\n\nایڈمن فیچر منتخب کریں:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 تمام صارفین کے اعداد و شمار', 'adminAllUsers')],
                [Markup.button.callback('🔍 صارف تلاش کریں', 'adminSearchUser')],
                [Markup.button.callback('💰 بیلنس دستی اپ ڈیٹ', 'adminBalanceUpdate')],
                [Markup.button.callback('📋 تمام ٹرانزیکشنز دیکھیں', 'adminAllTransactions')],
                [Markup.button.callback('🚫 صارف کو بلاک/ان بلاک کریں', 'adminBanUser')],
                [Markup.button.callback('🤖 پلان مینجمنٹ', 'adminPlanManagement')],
                [Markup.button.callback('👤 یوزر موڈ', 'userMode')],
                [Markup.button.callback('🔄 ڈیٹا بیس کی صورتحال', 'databaseStatus')]
            ])
        );
    }

    if (session && session.usernameKey && users[session.usernameKey]) {
        const user = users[session.usernameKey];
        
        // چیک کریں کہ صارف بلاک ہے
        if (user.isBanned) {
            return ctx.reply(
                '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
                Markup.inlineKeyboard([
                    [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
                ])
            );
        }
        
        return ctx.reply(
            `✨ واپسی پر خوش آمدید، ${user.firstName}! ✨\n\n💡 آپ آج کیا کرنا چاہیں گے؟`,
            Markup.inlineKeyboard([
                [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
                [Markup.button.callback('🤖 واٹس ایپ بوٹ خریدیں', 'buyBot')],
                [Markup.button.callback('📥 فنڈز جمع کروائیں', 'depositBalance')],
                [Markup.button.callback('📤 فنڈز نکلوائیں', 'withdrawBalance')],
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')],
                [Markup.button.callback('🚪 لاگ آؤٹ کریں', 'logOut')]
            ])
        );
    }

    await ctx.reply(
        '👋 پیڈ واٹس ایپ بوٹ میں خوش آمدید! 👋\n\n✨ آپ کا مکمل واٹس ایپ آٹومیشن حل ✨\n\n🚀 خصوصیات:\n✅ خودکار واٹس ایپ میسیجنگ\n✅ بڑی تعداد میں میسج بھیجنا\n✅ رابطوں کا انتظام\n✅ شیڈولڈ مہمات\n✅ ریئل ٹائم تجزیات\n\n📱 شروع کریں:\nبراہ کرم نیا اکاؤنٹ بنائیں یا لاگ ان کریں:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📝 سائن اپ - نیا اکاؤنٹ بنائیں', 'signup')],
            [Markup.button.callback('🔐 لاگ ان - موجودہ اکاؤنٹ', 'login')],
            [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
        ])
    );
});

// ======= ڈیٹا بیس کی صورتحال چیک کریں =======
bot.action('databaseStatus', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const isConnected = await database.isConnected();
    const status = isConnected ? '✅ کنکٹڈ' : '❌ ڈس کنکٹڈ';
    const dbInfo = database.connection ? {
        name: database.connection.name,
        host: database.connection.host,
        readyState: database.connection.readyState
    } : null;

    let message = `🛢️ ڈیٹا بیس کی صورتحال: ${status}\n\n`;
    
    if (isConnected && dbInfo) {
        message += `📊 ڈیٹا بیس: ${dbInfo.name}\n`;
        message += `📍 ہوسٹ: ${dbInfo.host}\n`;
        message += `⚡ اسٹیٹس کوڈ: ${dbInfo.readyState}\n\n`;
        message += `👥 کیش میں صارفین: ${Object.keys(users).length}\n`;
        message += `🤖 کیش میں پلانز: ${Object.keys(plans).length}\n`;
    } else {
        message += `⚠️ مقامی اسٹوریج استعمال ہو رہی ہے\n`;
        message += `👥 فائل میں صارفین: ${Object.keys(users).length}\n`;
        message += `🤖 فائل میں پلانز: ${Object.keys(plans).length}\n`;
    }

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔄 اسٹیٹس ریفریش کریں', 'databaseStatus')],
            [Markup.button.callback('🔄 ڈیٹا بیس سے دوبارہ کنکٹ کریں', 'reconnectDatabase')],
            [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
        ])
    );
});

bot.action('reconnectDatabase', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    await ctx.answerCbQuery('🔄 ڈیٹا بیس سے دوبارہ کنکٹ ہو رہا ہے...');
    await database.connect();
    await initializeData();
    
    const isConnected = await database.isConnected();
    if (isConnected) {
        await ctx.reply('✅ ڈیٹا بیس سے کامیابی سے کنکٹ ہو گیا!');
    } else {
        await ctx.reply('❌ ڈیٹا بیس سے کنکٹ نہیں ہو سکا۔');
    }
});

// ======= بٹن ایکشنز =======
bot.action('signup', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'signup', step: 'firstName' };
    await ctx.reply(
        '✨ اکاؤنٹ رجسٹریشن کا عمل ✨\n\n📝 مرحلہ 1: ذاتی معلومات 📝\n\nبراہ کرم اپنا پہلا نام درج کریں:\n\n💡 مثال: محمد علی\n\n📌 ضروریات:\n• 2-30 حروف\n• کوئی خاص علامات نہیں'
    );
});

bot.action('login', async (ctx) => {
    sessions[ctx.chat.id] = { flow: 'login', step: 'loginUsername' };
    await ctx.reply(
        '🔐 اکاؤنٹ لاگ ان 🔐\n\n👤 لاگ ان کرنے کے لیے اپنا صارف نام درج کریں:\n\n📌 آپ کا صارف نام وہی ہے جو آپ نے رجسٹریشن کے دوران منتخب کیا تھا۔\n\n💡 مثال: ali_123\n\n❓ صارف نام بھول گئے؟\nمدد کے لیے ہماری سپورٹ ٹیم سے رابطہ کریں۔'
    );
});

bot.action('forgotPassword', async (ctx) => {
    await ctx.reply(
        '🔒 پاس ورڈ بازیابی 🔒\n\n⚠️ اہم نوٹس:\پاس ورڈ کی بازیابی اس وقت دستیاب نہیں ہے۔\n\n📞 براہ کرم سپورٹ سے رابطہ کریں:\nاگر آپ اپنا پاس ورڈ بھول گئے ہیں، تو براہ کرم:\n1. ہماری سپورٹ ٹیم سے رابطہ کریں\n2. یا نیا اکاؤنٹ بنائیں\n\n🔗 سپورٹ: @your_support',
        withBackButton([])
    );
});

bot.action('contactSupport', async (ctx) => {
    await ctx.reply(
        '📞 24/7 کسٹمر سپورٹ 📞\n\n🔗 سپورٹ ٹیم سے رابطہ کرنے کے لیے نیچے دیے گئے لنک پر کلک کریں:\n\n👉 @help_paid_whatsapp_bot\n\n⏰ سپورٹ اوقات: 24/7\n⚡ جواب کا وقت: عام طور پر منٹوں میں\n\n💡 ہم کیسے مدد کر سکتے ہیں:\n• اکاؤنٹ کے مسائل\n• جمع/نکالنے کے مسائل\n• بوٹ سیٹ اپ میں مدد\n• تکنیکی مدد\n• عمومی استفسارات',
        Markup.inlineKeyboard([
            [Markup.button.url('💬 سپورٹ سے بات کریں', 'https://t.me/help_paid_whatsapp_bot')],
            [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
        ])
    );
});

// ======= نیا پلان سسٹم - بوٹ خریدنے کا فلو =======
bot.action('buyBot', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.reply(
            '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    }

    // چیک کریں کہ صارف کے پاس پہلے سے زیر التواء پلان درخواست ہے
    if (user.pendingPlanRequests && user.pendingPlanRequests.length > 0) {
        return ctx.reply(
            '⚠️ زیر التواء پلان درخواست موجود ہے ⚠️\n\n📝 آپ کے پاس پہلے سے ہی ایک زیر التواء پلان درخواست ہے۔\n\n💡 براہ کرم اپنی موجودہ درخواست کے پروسیس ہونے کا انتظار کریں۔\n\n⏰ پروسیسنگ کا وقت:\n• عام طور پر 1-2 گھنٹے کے اندر\n• پروسیس ہونے پر آپ کو مطلع کیا جائے گا',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 زیر التواء درخواستیں دیکھیں', 'viewPendingRequests')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    return ctx.reply(
        '🤖 واٹس ایپ بوٹ پلانز 🤖\n\n✨ آگے بڑھنے کے لیے ایک آپشن منتخب کریں:\n\n📊 آپ کا موجودہ پلان: ' + (user.activePlan ? user.activePlan.name : 'کوئی ایکٹو پلان نہیں') + '\n💰 آپ کا بیلنس: ' + (user.balance || 0) + ' روپے',
        Markup.inlineKeyboard([
            [Markup.button.callback('📱 ایکٹو پلان', 'activePlanMenu')],
            [Markup.button.callback('🆙 پلان اپ گریڈ کریں', 'upgradePlanMenu')],
            [Markup.button.callback('👁️ پلان دیکھیں', 'viewPlan')],
            [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
        ])
    );
});

// ======= ایکٹو پلان مینو =======
bot.action('activePlanMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 اکاؤنٹ ایڈمن کے ذریعے معطل ہے۔', { show_alert: true });
    }

    let message = '📱 ایکٹو پلان مینو 📱\n\n✨ ایکٹیویٹ کرنے کے لیے پلان منتخب کریں:\n\n';

    // تمام دستیاب پلانز دکھائیں
    Object.values(plans).forEach((plan, index) => {
        message += `${index + 1}. ${plan.name}\n`;
        message += `   💰 قیمت: ${plan.price} روپے\n`;
        message += `   📅 مدت: ${plan.duration} دن\n`;
        message += `   🎯 خصوصیات: ${plan.features.join(', ')}\n\n`;
    });

    message += '💡 خریدنے کے لیے پلان منتخب کریں:';

    const buttons = [];
    Object.keys(plans).forEach((planId, index) => {
        const plan = plans[planId];
        buttons.push([Markup.button.callback(`${index + 1}. ${plan.name} - ${plan.price} روپے`, `selectPlan_${planId}`)]);
    });

    buttons.push([Markup.button.callback('🔙 پلانز مینو پر واپس', 'buyBot')]);

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// ======= پلان منتخب کریں =======
bot.action(/selectPlan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    const plan = plans[planId];
    
    if (!plan) return ctx.answerCbQuery('❌ پلان نہیں ملا۔', { show_alert: true });

    // منتخب کردہ پلان کو سیشن میں محفوظ کریں
    session.selectedPlanId = planId;
    session.planFlow = 'active';

    // بیلنس چیک کریں
    if ((user.balance || 0) < plan.price) {
        const needed = plan.price - (user.balance || 0);
        return ctx.reply(
            `❌ ناکافی بیلنس ❌\n\n🤖 پلان: ${plan.name}\n💰 قیمت: ${plan.price} روپے\n💳 آپ کا بیلنس: ${user.balance || 0} روپے\n\n📥 آپ کو اس پلان کو خریدنے کے لیے ${needed} روپے مزید درکار ہیں۔\n\n💡 براہ کرم پہلے فنڈز جمع کروائیں:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 فنڈز جمع کروائیں', 'depositBalance')],
                [Markup.button.callback('🔙 پلانز پر واپس', 'activePlanMenu')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    // تصدیق دکھائیں
    return ctx.reply(
        `✅ پلان منتخب ہو گیا ✅\n\n📋 پلان کی تفصیلات:\n🤖 پلان: ${plan.name}\n💰 قیمت: ${plan.price} روپے\n📅 مدت: ${plan.duration} دن\n🎯 خصوصیات: ${plan.features.join(', ')}\n\n💳 آپ کا بیلنس: ${user.balance || 0} روپے\n💵 خریداری کے بعد: ${(user.balance || 0) - plan.price} روپے\n\n📝 کیا آپ خریداری جاری رکھنا چاہتے ہیں؟`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ خریداری کی تصدیق کریں', `confirmPlanPurchase_${planId}`)],
            [Markup.button.callback('🔙 منسوخ کریں', 'activePlanMenu')]
        ])
    );
});

// ======= پلان خریداری کی تصدیق کریں =======
bot.action(/confirmPlanPurchase_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 سیشن ختم ہو گیا۔');

    const user = users[session.usernameKey];
    const plan = plans[planId];
    
    if (!plan) return ctx.answerCbQuery('❌ پلان نہیں ملا۔', { show_alert: true });

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('پیغام اپ ڈیٹ نہیں ہو سکا:', e.message);
    }

    const { date, time } = getCurrentDateTime();
    const requestId = generatePlanRequestId();

    // بیلنس عارضی طور پر کٹوتی کریں
    user.balance -= plan.price;
    
    // زیر التواء پلان درخواست بنائیں
    if (!user.pendingPlanRequests) user.pendingPlanRequests = [];
    user.pendingPlanRequests.push({
        id: requestId,
        planId: planId,
        planName: plan.name,
        price: plan.price,
        duration: plan.duration,
        features: plan.features,
        type: session.planFlow === 'upgrade' ? 'upgrade' : 'new',
        date: date,
        time: time,
        status: 'pending'
    });

    await saveUser(session.usernameKey, user);

    // ایڈمن کو بھیجیں
    const adminMsg = `
🤖 نیا پلان درخواست 🤖

👤 صارف کی معلومات:
• نام: ${user.firstName}
• صارف نام: ${session.usernameKey}
• فون: ${user.phone}

📋 پلان کی تفصیلات:
• پلان: ${plan.name}
• قسم: ${session.planFlow === 'upgrade' ? 'اپ گریڈ' : 'نیا'}
• قیمت: ${plan.price} روپے
• مدت: ${plan.duration} دن
• خصوصیات: ${plan.features.join(', ')}

💰 ادائیگی کی حیثیت:
• رقم کٹوتی: ${plan.price} روپے
• صارف کا بیلنس: ${user.balance} روپے

📅 درخواست کی تفصیلات:
• تاریخ: ${date}
• وقت: ${time}
• درخواست آئی ڈی: ${requestId}
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ پلان منظور کریں', `admin_approve_plan_${chatId}_${requestId}`)],
            [Markup.button.callback('❌ درخواست مسترد کریں', `admin_reject_plan_${chatId}_${requestId}`)]
        ])
    );

    await ctx.reply(
        `⏳ پلان درخواست کامیابی سے جمع ہو گئی! ⏳\n\n✅ درخواست کی تفصیلات:\n🤖 پلان: ${plan.name}\n💰 قیمت: ${plan.price} روپے\n📅 مدت: ${plan.duration} دن\n🎯 خصوصیات: ${plan.features.join(', ')}\n\n📊 حیثیت: ایڈمن کی منظوری زیر التواء 🔄\n\n🔑 درخواست آئی ڈی: ${requestId}\n\n⏰ پروسیسنگ کا وقت:\n• عام طور پر 1-2 گھنٹے کے اندر\n• منظوری پر آپ کو مطلع کیا جائے گا\n\n💰 عارضی بیلنس ہولڈ:\n• رقم روک لی گئی: ${plan.price} روپے ⏳\n• مسترد کرنے پر واپس کردی جائے گی\n\n📞 سپورٹ 24/7 دستیاب`
    );

    // سیشن صاف کریں
    delete session.selectedPlanId;
    delete session.planFlow;
});

// ======= اپ گریڈ پلان مینو =======
bot.action('upgradePlanMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 اکاؤنٹ ایڈمن کے ذریعے معطل ہے۔', { show_alert: true });
    }

    // چیک کریں کہ صارف کے پاس ایکٹو پلان ہے
    if (!user.activePlan) {
        return ctx.reply(
            '❌ کوئی ایکٹو پلان نہیں ملا ❌\n\n📝 آپ کے پاس اپ گریڈ کرنے کے لیے کوئی ایکٹو پلان نہیں ہے۔\n\n💡 براہ کرم پہلے پلان خریدیں:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📱 نیا پلان خریدیں', 'activePlanMenu')],
                [Markup.button.callback('🔙 پلانز مینو پر واپس', 'buyBot')]
            ])
        );
    }

    // صرف وہ پلانز دکھائیں جو موجودہ پلان سے بہتر ہوں (قیمت کے لحاظ سے)
    const currentPlanPrice = user.activePlan.price;
    let message = '🆙 اپ گریڈ پلان مینو 🆙\n\n✨ دستیاب اپ گریڈ پلانز:\n\n';
    
    const upgradePlans = Object.values(plans).filter(plan => plan.price > currentPlanPrice);
    
    if (upgradePlans.length === 0) {
        return ctx.reply(
            '✨ آپ کے پاس سب سے اعلی پلان ہے ✨\n\n🎉 مبارک ہو! آپ کے پاس پہلے سے ہی سب سے اعلی دستیاب پلان ہے۔\n\n💡 اس وقت کوئی اپ گریڈ دستیاب نہیں ہے۔',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 پلانز مینو پر واپس', 'buyBot')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    upgradePlans.forEach((plan, index) => {
        message += `${index + 1}. ${plan.name}\n`;
        message += `   💰 قیمت: ${plan.price} روپے\n`;
        message += `   📅 مدت: ${plan.duration} دن\n`;
        message += `   🎯 خصوصیات: ${plan.features.join(', ')}\n\n`;
    });

    message += '💡 اپ گریڈ کرنے کے لیے پلان منتخب کریں:';

    const buttons = [];
    upgradePlans.forEach((plan, index) => {
        const planId = Object.keys(plans).find(key => plans[key] === plan);
        buttons.push([Markup.button.callback(`${index + 1}. ${plan.name} - ${plan.price} روپے`, `selectUpgradePlan_${planId}`)]);
    });

    buttons.push([Markup.button.callback('🔙 پلانز مینو پر واپس', 'buyBot')]);

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// ======= اپ گریڈ پلان منتخب کریں =======
bot.action(/selectUpgradePlan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    const plan = plans[planId];
    
    if (!plan) return ctx.answerCbQuery('❌ پلان نہیں ملا۔', { show_alert: true });

    // منتخب کردہ پلان کو سیشن میں اپ گریڈ کے لیے محفوظ کریں
    session.selectedPlanId = planId;
    session.planFlow = 'upgrade';

    // بیلنس چیک کریں
    if ((user.balance || 0) < plan.price) {
        const needed = plan.price - (user.balance || 0);
        return ctx.reply(
            `❌ ناکافی بیلنس ❌\n\n🤖 اپ گریڈ کریں: ${plan.name}\n💰 قیمت: ${plan.price} روپے\n💳 آپ کا بیلنس: ${user.balance || 0} روپے\n\n📥 آپ کو اپ گریڈ کرنے کے لیے ${needed} روپے مزید درکار ہیں۔\n\n💡 براہ کرم پہلے فنڈز جمع کروائیں:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 فنڈز جمع کروائیں', 'depositBalance')],
                [Markup.button.callback('🔙 اپ گریڈ پلانز پر واپس', 'upgradePlanMenu')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    // موجودہ پلان سے باقی دنوں کا حساب لگائیں
    let remainingDays = 0;
    if (user.activePlan && user.activePlan.expiryDate) {
        const expiryDate = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
        const today = new Date();
        const timeDiff = expiryDate - today;
        remainingDays = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
    }

    // باقی دنوں کے ساتھ تصدیق دکھائیں
    return ctx.reply(
        `✅ اپ گریڈ پلان منتخب ہو گیا ✅\n\n📋 اپ گریڈ کی تفصیلات:\n🤖 موجودہ پلان: ${user.activePlan.name}\n🆙 اپ گریڈ کریں: ${plan.name}\n💰 قیمت: ${plan.price} روپے\n📅 نئی مدت: ${plan.duration} دن\n📅 باقی دن (موجودہ): ${remainingDays} دن\n🎯 خصوصیات: ${plan.features.join(', ')}\n\n💳 آپ کا بیلنس: ${user.balance || 0} روپے\n💵 خریداری کے بعد: ${(user.balance || 0) - plan.price} روپے\n\n📝 کیا آپ اپ گریڈ جاری رکھنا چاہتے ہیں؟`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ اپ گریڈ کی تصدیق کریں', `confirmPlanPurchase_${planId}`)],
            [Markup.button.callback('🔙 منسوخ کریں', 'upgradePlanMenu')]
        ])
    );
});

// ======= پلان دیکھیں =======
bot.action('viewPlan', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    if (!user.activePlan) {
        return ctx.reply(
            '📊 آپ کی پلان کی حیثیت 📊\n\n📭 کوئی ایکٹو پلان نہیں ملا\n\n💡 آپ کے پاس ایکٹو واٹس ایپ بوٹ پلان نہیں ہے۔\n\n🚀 اس کے ساتھ شروع کریں:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📱 نیا پلان خریدیں', 'activePlanMenu')],
                [Markup.button.callback('🔙 پلانز مینو پر واپس', 'buyBot')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    // تاریخ اختتام کا حساب لگائیں
    let expiryInfo = '';
    if (user.activePlan.expiryDate) {
        const expiryDate = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
        const today = new Date();
        const timeDiff = expiryDate - today;
        const remainingDays = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
        
        expiryInfo = `\n📅 تاریخ اختتام: ${user.activePlan.expiryDate}\n⏰ باقی دن: ${remainingDays} دن`;
    }

    let message = `📊 آپ کا موجودہ پلان 📊\n\n`;
    message += `🤖 پلان: ${user.activePlan.name}\n`;
    message += `💰 ادا کردہ قیمت: ${user.activePlan.price} روپے\n`;
    message += `📅 اصل مدت: ${user.activePlan.duration} دن\n`;
    message += expiryInfo;
    message += `\n🎯 خصوصیات:\n`;
    user.activePlan.features.forEach((feature, index) => {
        message += `  ${index + 1}. ${feature}\n`;
    });

    if (user.activePlan.whatsappLink) {
        message += `\n🔗 آپ کا واٹس ایپ لنک:\n${user.activePlan.whatsappLink}\n`;
    }

    message += `\n📝 حیثیت: ${user.activePlan.status || 'ایکٹو'}`;

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🆙 پلان اپ گریڈ کریں', 'upgradePlanMenu')],
            [Markup.button.callback('🔙 پلانز مینو پر واپس', 'buyBot')],
            [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
        ])
    );
});

// ======= ٹیکسٹ ہینڈلر =======
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    const session = sessions[chatId];
    if (!session) return;

    // ===== ایڈمن صارف تلاش کریں =====
    if (session.flow === 'admin_search') {
        if (session.step === 'enter_username') {
            const searchTerm = text.toLowerCase();
            
            // صارفین میں تلاش کریں
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
                    '❌ کوئی صارف نہیں ملا ❌\n\nآپ کی تلاش کے مطابق کوئی صارف نہیں ملا۔\n\n🔄 مختلف تلاش کے الفاظ کے ساتھ دوبارہ کوشش کریں:',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔍 دوبارہ تلاش کریں', 'adminSearchUser')],
                        [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
                    ])
                );
                sessions[chatId] = null;
                return;
            }

            let message = '🔍 تلاش کے نتائج 🔍\n\n';
            
            foundUsers.forEach(({ username, user }, index) => {
                const status = user.isBanned ? '🚫 بلاک شدہ' : '✅ فعال';
                message += `${index + 1}. ${user.firstName} (@${username})\n`;
                message += `   📱 فون: ${user.phone}\n`;
                message += `   💰 بیلنس: ${user.balance || 0} روپے\n`;
                message += `   📅 رجسٹرڈ: ${user.registered}\n`;
                message += `   📊 حیثیت: ${status}\n\n`;
            });

            if (foundUsers.length > 5) {
                message += `📖 ${foundUsers.length} صارفین ملے\n`;
            }

            const buttons = [];
            foundUsers.slice(0, 5).forEach(({ username }) => {
                buttons.push([Markup.button.callback(`👤 ${username} دیکھیں`, `admin_view_user_${username}`)]);
            });

            buttons.push(
                [Markup.button.callback('🔍 دوبارہ تلاش کریں', 'adminSearchUser')],
                [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
            );

            await ctx.reply(
                message,
                Markup.inlineKeyboard(buttons)
            );
            
            sessions[chatId] = null;
        }
        return;
    }

    // ===== ایڈمن بیلنس اپ ڈیٹ =====
    if (session.flow === 'admin_balance_update') {
        if (session.step === 'enter_username') {
            if (!users[text]) {
                await ctx.reply(
                    '❌ صارف نہیں ملا ❌\n\nصارف نام موجود نہیں ہے۔\n\n🔄 صحیح صارف نام درج کریں:',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔍 صارف تلاش کریں', 'adminSearchUser')],
                        [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
                    ])
                );
                return;
            }

            session.targetUsername = text;
            session.step = 'enter_amount';
            
            await ctx.reply(
                `💰 @${text} کا بیلنس اپ ڈیٹ کریں 💰\n\nموجودہ بیلنس: ${users[text].balance || 0} روپے\n\nنیا بیلنس رقم درج کریں (روپے):\n\n💡 نوٹ: یہ موجودہ بیلنس کو تبدیل کر دے گا۔`
            );
        }

        if (session.step === 'enter_amount') {
            const amount = parseInt(text);
            
            if (isNaN(amount) || amount < 0) {
                return ctx.reply('❌ غلط رقم ❌\n\nبراہ کرم ایک درست نمبر درج کریں (0 یا زیادہ):');
            }

            const user = users[session.targetUsername];
            const oldBalance = user.balance || 0;
            user.balance = amount;
            
            // ٹرانزیکشن ہسٹری میں شامل کریں
            if (!user.transactions) user.transactions = [];
            const { date, time } = getCurrentDateTime();
            user.transactions.push({
                type: '💰 ایڈمن بیلنس اپ ڈیٹ',
                amount: amount - oldBalance,
                date: date,
                time: time,
                status: 'admin_updated',
                note: `ایڈمن نے بیلنس ${oldBalance} سے ${amount} روپے تک اپ ڈیٹ کیا`
            });

            await saveUser(session.targetUsername, user);

            await ctx.reply(
                `✅ بیلنس کامیابی سے اپ ڈیٹ ہو گیا! ✅\n\n👤 صارف: @${session.targetUsername}\n👤 نام: ${user.firstName}\n📱 فون: ${user.phone}\n\n💰 پرانا بیلنس: ${oldBalance} روپے\n💰 نیا بیلنس: ${amount} روپے\n📈 تبدیلی: ${amount - oldBalance} روپے\n\n📅 تاریخ: ${date}\n⏰ وقت: ${time}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback(`👤 ${session.targetUsername} دیکھیں`, `admin_view_user_${session.targetUsername}`)],
                    [Markup.button.callback('💰 دوسرے صارف کو اپ ڈیٹ کریں', 'adminBalanceUpdate')],
                    [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
                ])
            );
            
            sessions[chatId] = null;
        }
        return;
    }

    // ===== ایڈمن صارف بلاک کریں =====
    if (session.flow === 'admin_ban_user') {
        if (session.step === 'enter_username') {
            if (!users[text]) {
                await ctx.reply(
                    '❌ صارف نہیں ملا ❌\n\nصارف نام موجود نہیں ہے۔\n\n🔄 صحیح صارف نام درج کریں:',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔍 صارف تلاش کریں', 'adminSearchUser')],
                        [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
                    ])
                );
                return;
            }

            session.targetUsername = text;
            const user = users[text];
            const isCurrentlyBanned = user.isBanned || false;
            
            session.step = 'confirm_action';
            
            await ctx.reply(
                `🚫 صارف بلاک/ان بلاک کریں: @${text} 🚫\n\n👤 نام: ${user.firstName}\n📱 فون: ${user.phone}\n💰 بیلنس: ${user.balance || 0} روپے\n📅 رجسٹرڈ: ${user.registered}\n\n📊 موجودہ حیثیت: ${isCurrentlyBanned ? '🚫 بلاک شدہ' : '✅ فعال'}\n\nایکشن منتخب کریں:`,
                Markup.inlineKeyboard([
                    [Markup.button.callback(isCurrentlyBanned ? '✅ صارف ان بلاک کریں' : '🚫 صارف بلاک کریں', `admin_confirm_${isCurrentlyBanned ? 'unban' : 'ban'}_${text}`)],
                    [Markup.button.callback('🔙 منسوخ کریں', 'backToAdminMenu')]
                ])
            );
        }
        return;
    }

    // ===== ایڈمن مسترد کرنے کی وجہ =====
    if (session.flow === 'admin_reject_reason') {
        const rejectionData = pendingAdminRejections[chatId];
        if (!rejectionData) {
            session.flow = null;
            return ctx.reply('⚠️ سیشن خرابی ⚠️\n\n📝 مسترد کرنے کا ڈیٹا نہیں ملا۔\n\n🔙 ایڈمن پینل پر واپس جا رہا ہے...');
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

    // ===== ایڈمن پلان شامل کریں فلو =====
    if (session.flow === 'admin_add_plan') {
        if (session.step === 'enter_plan_name') {
            if (text.length < 3 || text.length > 50) {
                return ctx.reply('❌ غلط پلان نام ❌\n\n📝 پلان نام 3-50 حروف کا ہونا چاہیے۔\n\nپلان نام درج کریں:');
            }
            
            session.planName = text;
            session.step = 'enter_plan_price';
            return ctx.reply(
                `📝 پلان نام: ${text}\n\n💰 پلان قیمت درج کریں (روپے):\n\n💡 مثال: 1000`
            );
        }
        
        if (session.step === 'enter_plan_price') {
            const price = parseInt(text);
            if (isNaN(price) || price < 100) {
                return ctx.reply('❌ غلط قیمت ❌\n\n📝 قیمت کم از کم 100 روپے ہونی چاہیے۔\n\nقیمت درج کریں:');
            }
            
            session.planPrice = price;
            session.step = 'enter_plan_duration';
            return ctx.reply(
                `💰 قیمت: ${price} روپے\n\n📅 پلان مدت درج کریں (دنوں میں):\n\n💡 مثال: 30`
            );
        }
        
        if (session.step === 'enter_plan_duration') {
            const duration = parseInt(text);
            if (isNaN(duration) || duration < 1) {
                return ctx.reply('❌ غلط مدت ❌\n\n📝 مدت کم از کم 1 دن ہونی چاہیے۔\n\nمدت درج کریں:');
            }
            
            session.planDuration = duration;
            session.step = 'enter_plan_features';
            return ctx.reply(
                `📅 مدت: ${duration} دن\n\n🎯 پلان خصوصیات درج کریں (کوما سے علیحدہ):\n\n💡 مثال: 1 واٹس ایپ لنک، 24/7 سپورٹ`
            );
        }
        
        if (session.step === 'enter_plan_features') {
            const features = text.split(',').map(f => f.trim()).filter(f => f.length > 0);
            if (features.length === 0) {
                return ctx.reply('❌ غلط خصوصیات ❌\n\n📝 براہ کرم کم از کم ایک خصوصیت درج کریں۔\n\nخصوصیات درج کریں:');
            }
            
            // نیا پلان آئی ڈی بنائیں
            const planId = 'plan_' + Date.now();
            const whatsappCount = text.toLowerCase().includes('2 whatsapp') ? 2 : 1;
            
            // نیا پلان شامل کریں
            const newPlan = {
                id: planId,
                name: session.planName,
                price: session.planPrice,
                duration: session.planDuration,
                features: features,
                whatsappCount: whatsappCount
            };
            
            plans[planId] = newPlan;
            await savePlan(planId, newPlan);
            
            // سیشن صاف کریں
            sessions[chatId] = null;
            
            await ctx.reply(
                `✅ نیا پلان کامیابی سے شامل ہو گیا! ✅\n\n📋 پلان کی تفصیلات:\n🤖 پلان: ${session.planName}\n💰 قیمت: ${session.planPrice} روپے\n📅 مدت: ${session.planDuration} دن\n🎯 خصوصیات: ${features.join(', ')}\n\n🔑 پلان آئی ڈی: ${planId}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('➕ دوسرا پلان شامل کریں', 'adminAddPlan')],
                    [Markup.button.callback('🤖 پلان مینجمنٹ', 'adminPlanManagement')],
                    [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
                ])
            );
        }
        return;
    }
    
    // ===== ایڈمن پلان میں ترمیم فلو =====
    if (session.flow === 'admin_edit_plan' && session.step === 'edit_price') {
        const price = parseInt(text);
        if (isNaN(price) || price < 100) {
            return ctx.reply('❌ غلط قیمت ❌\n\n📝 قیمت کم از کم 100 روپے ہونی چاہیے۔\n\nنئی قیمت درج کریں:');
        }
        
        const planId = session.planId;
        const oldPrice = plans[planId].price;
        plans[planId].price = price;
        await savePlan(planId, plans[planId]);
        
        sessions[chatId] = null;
        
        await ctx.reply(
            `✅ پلان قیمت کامیابی سے اپ ڈیٹ ہو گئی! ✅\n\n🤖 پلان: ${plans[planId].name}\n💰 پرانی قیمت: ${oldPrice} روپے\n💰 نئی قیمت: ${price} روپے`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`✏️ ${plans[planId].name} میں ترمیم کریں`, `admin_edit_plan_${planId}`)],
                [Markup.button.callback('✏️ دوسرے پلان میں ترمیم کریں', 'adminEditPlanMenu')],
                [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
            ])
        );
        return;
    }
    
    if (session.flow === 'admin_edit_plan' && session.step === 'edit_duration') {
        const duration = parseInt(text);
        if (isNaN(duration) || duration < 1) {
            return ctx.reply('❌ غلط مدت ❌\n\n📝 مدت کم از کم 1 دن ہونی چاہیے۔\n\nنئی مدت درج کریں:');
        }
        
        const planId = session.planId;
        const oldDuration = plans[planId].duration;
        plans[planId].duration = duration;
        await savePlan(planId, plans[planId]);
        
        sessions[chatId] = null;
        
        await ctx.reply(
            `✅ پلان مدت کامیابی سے اپ ڈیٹ ہو گئی! ✅\n\n🤖 پلان: ${plans[planId].name}\n📅 پرانی مدت: ${oldDuration} دن\n📅 نئی مدت: ${duration} دن`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`✏️ ${plans[planId].name} میں ترمیم کریں`, `admin_edit_plan_${planId}`)],
                [Markup.button.callback('✏️ دوسرے پلان میں ترمیم کریں', 'adminEditPlanMenu')],
                [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
            ])
        );
        return;
    }
    
    if (session.flow === 'admin_edit_plan' && session.step === 'edit_features') {
        const features = text.split(',').map(f => f.trim()).filter(f => f.length > 0);
        if (features.length === 0) {
            return ctx.reply('❌ غلط خصوصیات ❌\n\n📝 براہ کرم کم از کم ایک خصوصیت درج کریں۔\n\nنئی خصوصیات درج کریں:');
        }
        
        const planId = session.planId;
        const oldFeatures = plans[planId].features;
        plans[planId].features = features;
        
        // خصوصیات کے مطابق واٹس ایپ کاؤنٹ اپ ڈیٹ کریں
        const whatsappCount = text.toLowerCase().includes('2 whatsapp') ? 2 : 1;
        plans[planId].whatsappCount = whatsappCount;
        
        await savePlan(planId, plans[planId]);
        
        sessions[chatId] = null;
        
        await ctx.reply(
            `✅ پلان خصوصیات کامیابی سے اپ ڈیٹ ہو گئیں! ✅\n\n🤖 پلان: ${plans[planId].name}\n🎯 پرانی خصوصیات: ${oldFeatures.join(', ')}\n🎯 نئی خصوصیات: ${features.join(', ')}`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`✏️ ${plans[planId].name} میں ترمیم کریں`, `admin_edit_plan_${planId}`)],
                [Markup.button.callback('✏️ دوسرے پلان میں ترمیم کریں', 'adminEditPlanMenu')],
                [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
            ])
        );
        return;
    }
    
    // ===== ایڈمن پلان لنک منظور کریں =====
    if (session.flow === 'admin_approve_plan_link' && session.pendingApproval) {
        const { userChatId, requestId } = session.pendingApproval;
        const whatsappLink = text.trim();
        
        // واٹس ایپ لنک فارمیٹ کی تصدیق کریں
        if (!whatsappLink.includes('wa.me') && !whatsappLink.includes('whatsapp.com')) {
            return ctx.reply('❌ غلط واٹس ایپ لنک ❌\n\n📝 براہ کرم ایک درست واٹس ایپ لنک درج کریں۔\n\n💡 فارمیٹ: https://wa.me/923001234567\n\nلنک درج کریں:');
        }
        
        const userSession = sessions[userChatId];
        if (!userSession || !userSession.usernameKey) {
            sessions[chatId] = null;
            return ctx.reply('❌ صارف سیشن نہیں ملا۔ پلان منظوری ناکام ہوئی۔');
        }
        
        const user = users[userSession.usernameKey];
        if (!user.pendingPlanRequests) {
            sessions[chatId] = null;
            return ctx.reply('❌ کوئی زیر التواء درخواستیں نہیں ملیں۔');
        }
        
        const requestIndex = user.pendingPlanRequests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) {
            sessions[chatId] = null;
            return ctx.reply('❌ درخواست پہلے ہی پروسیس ہو چکی ہے۔');
        }
        
        const request = user.pendingPlanRequests[requestIndex];
        const plan = plans[request.planId];
        const { date, time } = getCurrentDateTime();
        
        // تاریخ اختتام کا حساب لگائیں
        let expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.duration);
        const expiryDateStr = `${String(expiryDate.getDate()).padStart(2,'0')}-${String(expiryDate.getMonth()+1).padStart(2,'0')}-${expiryDate.getFullYear()}`;
        
        // اگر اپ گریڈ ہے، تو باقی دن شامل کریں
        if (request.type === 'upgrade' && user.activePlan && user.activePlan.expiryDate) {
            const oldExpiry = new Date(user.activePlan.expiryDate.split('-').reverse().join('-'));
            const today = new Date();
            if (oldExpiry > today) {
                const timeDiff = oldExpiry - today;
                const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                expiryDate.setDate(expiryDate.getDate() + remainingDays);
            }
        }
        
        // صارف کے ایکٹو پلان کو اپ ڈیٹ کریں
        user.activePlan = {
            id: plan.id,
            name: plan.name,
            price: plan.price,
            duration: plan.duration,
            features: plan.features,
            whatsappLink: whatsappLink,
            purchaseDate: date,
            expiryDate: expiryDateStr,
            status: 'active'
        };
        
        // ٹرانزیکشنز میں شامل کریں
        if (!user.transactions) user.transactions = [];
        user.transactions.push({
            type: `🤖 پلان خریداری ✅ (${plan.name})`,
            amount: plan.price,
            date: date,
            time: time,
            plan: plan.name,
            status: 'approved'
        });
        
        // زیر التواء درخواستوں سے ہٹائیں
        user.pendingPlanRequests.splice(requestIndex, 1);
        await saveUser(userSession.usernameKey, user);
        
        // ایڈمن سیشن صاف کریں
        sessions[chatId] = null;
        
        // صارف کو مطلع کریں
        await bot.telegram.sendMessage(
            userChatId,
            `🎉 پلان کامیابی سے ایکٹیویٹ ہو گیا! 🎉\n\n✅ پلان کی تفصیلات:\n🤖 پلان: ${plan.name}\n💰 قیمت: ${plan.price} روپے\n📅 مدت: ${plan.duration} دن\n📅 تاریخ اختتام: ${expiryDateStr}\n🎯 خصوصیات: ${plan.features.join(', ')}\n\n🔗 آپ کا واٹس ایپ لنک:\n${whatsappLink}\n\n✨ آپ کا پلان اب فعال ہے!\nآپ اپنا واٹس ایپ بوٹ استعمال کرنا شروع کر سکتے ہیں۔\n\n📞 مدد درکار؟ 24/7 سپورٹ سے رابطہ کریں۔`
        );
        
        await ctx.reply(
            `✅ پلان کامیابی سے ایکٹیویٹ ہو گیا! ✅\n\n👤 صارف: ${user.firstName}\n🤖 پلان: ${plan.name}\n💰 قیمت: ${plan.price} روپے\n🔗 واٹس ایپ لنک بھیج دیا گیا\n\n✅ صارف کو مطلع کر دیا گیا ہے۔`
        );
        return;
    }
    
    // ===== ایڈمن پلان مسترد کرنے کی وجہ =====
    if (session.flow === 'admin_reject_plan_reason') {
        const rejectionData = pendingAdminRejections[chatId];
        if (!rejectionData) {
            session.flow = null;
            return ctx.reply('⚠️ سیشن خرابی ⚠️\n\n📝 مسترد کرنے کا ڈیٹا نہیں ملا۔');
        }

        const { userChatId, requestId } = rejectionData;
        const reason = text;

        delete pendingAdminRejections[chatId];
        session.flow = null;

        await processPlanRejection(userChatId, requestId, reason, ctx);
        return;
    }

    // ===== سائن اپ فلو =====
    if (session.flow === 'signup') {
        switch (session.step) {
            case 'firstName':
                if (text.length < 2 || text.length > 30) {
                    return ctx.reply(
                        '❌ نام کی لمبائی غلط ہے ❌\n\n📝 براہ کرم 2 سے 30 حروف کے درمیان نام درج کریں۔\n\n💡 دوبارہ کوشش کریں:\nمثال: محمد علی'
                    );
                }
                session.firstName = text;
                session.step = 'dob';
                return ctx.reply(
                    '📅 تاریخ پیدائش 📅\n\nبراہ کرم اپنی تاریخ پیدائش درج ذیل فارمیٹ میں درج کریں:\n\n📌 فارمیٹ: DD-MM-YYYY\n💡 مثال: 31-01-2000\n\n⚠️ نوٹ:\nرجسٹر کرنے کے لیے آپ کی عمر 14-55 سال کے درمیان ہونی چاہیے۔'
                );

            case 'dob': {
                const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!match) {
                    return ctx.reply(
                        '❌ تاریخ کا فارمیٹ غلط ہے ❌\n\n📝 براہ کرم صحیح فارمیٹ استعمال کریں:\n\n📌 صحیح فارمیٹ: DD-MM-YYYY\n💡 مثال: 31-01-2000\n\n🔄 دوبارہ کوشش کریں:'
                    );
                }
                
                const day = parseInt(match[1]);
                const month = parseInt(match[2]);
                const year = parseInt(match[3]);
                
                const date = new Date(year, month - 1, day);
                if (date.getDate() !== day || date.getMonth() + 1 !== month || date.getFullYear() !== year) {
                    return ctx.reply(
                        '❌ غلط تاریخ ❌\n\n📝 آپ کی درج کردہ تاریخ موجود نہیں ہے۔\n\n📅 براہ کرم ایک درست تاریخ درج کریں:\n💡 مثال: 31-01-2000'
                    );
                }
                
                const currentYear = new Date().getFullYear();
                const age = currentYear - year;
                if (age < 14 || age > 55) {
                    return ctx.reply(
                        '❌ عمر کی پابندی ❌\n\n📝 رجسٹر کرنے کے لیے آپ کی عمر 14 سے 55 سال کے درمیان ہونی چاہیے۔\n\n🎂 آپ کی عمر: ' + age + ' سال\n\n📅 براہ کرم مختلف سال درج کریں:'
                    );
                }
                
                session.dob = text;
                session.step = 'whatsapp';
                return ctx.reply(
                    '📱 واٹس ایپ نمبر 📱\n\nبراہ کرم اپنا واٹس ایپ نمبر بین الاقوامی فارمیٹ میں درج کریں:\n\n📌 فارمیٹ: 923001234567\n💡 مثال: 923001234567\n\n⚠️ اہم نوٹس:\n• آپ + کا سابقہ شامل کر سکتے ہیں\n• ایک درست نمبر ہونا چاہیے\n• یہ نمبر تصدیق کے لیے استعمال ہوگا\n\n🔒 رازداری: آپ کا نمبر خفیہ رکھا جائے گا۔'
                );
            }

            case 'whatsapp': {
                // فون نمبر صاف کریں
                let phone = text.replace(/\s+/g, '').replace(/^\+/, '');
                
                // بین الاقوامی واٹس ایپ نمبر فارمیٹ کی تصدیق کریں
                if (!/^92\d{10}$/.test(phone)) {
                    return ctx.reply(
                        '❌ غلط فون نمبر ❌\n\n📝 براہ کرم ایک درست واٹس ایپ نمبر درج کریں:\n\n📌 ضروریات:\n• مثال: 923001234567\n\n❌ شامل نہ کریں:\n• فاصلے یا ڈیش\n\n🔄 دوبارہ کوشش کریں:'
                    );
                }
                
                // چیک کریں کہ نمبر پہلے سے موجود ہے
                const existingUser = Object.values(users).find(user => user.phone === phone);
                if (existingUser) {
                    const existingUsername = Object.keys(users).find(key => users[key] === existingUser);
                    return ctx.reply(
                        '❌ نمبر پہلے سے رجسٹرڈ ہے ❌\n\n📝 یہ واٹس ایپ نمبر پہلے سے کسی اکاؤنٹ سے منسلک ہے:\n\n👤 موجودہ اکاؤنٹ کی تفصیلات:\n• نام: ' + existingUser.firstName + '\n• صارف نام: ' + existingUsername + '\n\n💡 کیا کرنا ہے:\n1. موجودہ صارف نام کے ساتھ لاگ ان کرنے کی کوشش کریں\n2. یا مختلف واٹس ایپ نمبر استعمال کریں\n\n📞 مدد درکار؟ سپورٹ سے رابطہ کریں۔'
                    );
                }
                
                session.phone = phone;
                session.step = 'username';
                return ctx.reply(
                    '👤 اپنا صارف نام منتخب کریں 👤\n\nبراہ کرم ایک منفرد صارف نام منتخب کریں:\n\n📌 ضروریات:\n• 3-15 حروف\n• صرف چھوٹے حروف\n• نمبر اور انڈر سکور کی اجازت ہے\n\n✅ اجازت ہے: ali_123, user007, john_doe\n❌ اجازت نہیں: Ali123, User@123, John-Doe\n\n💡 مثال: ali_123\n\n🔒 یہ آپ کی لاگ ان آئی ڈی ہوگی۔'
                );
            }

            case 'username':
                if (!/^[a-z0-9_]{3,15}$/.test(text)) {
                    return ctx.reply(
                        '❌ صارف نام کا فارمیٹ غلط ہے ❌\n\n📝 براہ کرم صارف نام کی ضروریات پر عمل کریں:\n\n📌 قواعد:\n• صرف چھوٹے حروف (a-z)\n• نمبر (0-9) کی اجازت ہے\n• انڈر سکور (_) کی اجازت ہے\n• 3 سے 15 حروف\n\n✅ درست مثالیں:\n• ali_123\n• user007\n• john_doe_2024\n\n🔄 براہ کرم ایک مختلف صارف نام منتخب کریں:'
                    );
                }
                
                if (users[text]) {
                    return ctx.reply(
                        '❌ صارف نام پہلے سے لیا گیا ہے ❌\n\n📝 صارف نام "' + text + '" پہلے سے رجسٹرڈ ہے۔\n\n💡 تجاویز:\n• نمبر شامل کرنے کی کوشش کریں: ' + text + '123\n• مختلف تغیرات آز مائیں\n• تخلیقی بنیں!\n\n🎯 ایک منفرد صارف نام منتخب کریں:'
                    );
                }
                
                session.username = text;
                session.step = 'password';
                return ctx.reply(
                    '🔐 محفوظ پاس ورڈ بنائیں 🔐\n\nاپنے اکاؤنٹ کے لیے ایک مضبوط پاس ورڈ بنائیں:\n\n📌 پاس ورڈ کی ضروریات:\n✅ کم از کم 8 حروف\n✅ کم از کم ایک بڑا حرف (A-Z)\n✅ کم از کم ایک چھوٹا حرف (a-z)\n✅ کم از کم ایک نمبر (0-9)\n\n💡 مضبوط مثالیں:\n• Password123\n• SecurePass2024\n• MyBot@123\n\n⚠️ اپنا پاس ورڈ محفوظ رکھیں!\nکسی کے ساتھ شیئر نہ کریں۔'
                );

            case 'password':
                if (!PASSWORD_REGEX.test(text)) {
                    return ctx.reply(
                        '❌ کمزور پاس ورڈ ❌\n\n📝 آپ کا پاس ورڈ سیکورٹی کی ضروریات پر پورا نہیں اترتا:\n\n📌 کیا کمی ہے:\n' +
                        (text.length < 8 ? '❌ کم از کم 8 حروف\n' : '✅ لمبائی ٹھیک\n') +
                        (!/[A-Z]/.test(text) ? '❌ کم از کم ایک بڑا حرف\n' : '✅ بڑے حرف ٹھیک\n') +
                        (!/[a-z]/.test(text) ? '❌ کم از کم ایک چھوٹا حرف\n' : '✅ چھوٹے حرف ٹھیک\n') +
                        (!/\d/.test(text) ? '❌ کم از کم ایک نمبر\n' : '✅ نمبر ٹھیک\n') +
                        '\n💡 ایک مضبوط پاس ورڈ آز مائیں:\nمثال: Password123'
                    );
                }
                
                session.password = text;
                session.step = 'confirmPassword';
                return ctx.reply(
                    '🔏 اپنے پاس ورڈ کی تصدیق کریں 🔏\n\nتصدیق کے لیے براہ کرم اپنا پاس ورڈ دوبارہ درج کریں:\n\n📌 اس سے یہ یقینی بنایا جاتا ہے کہ آپ نے اسے صحیح ٹائپ کیا ہے۔\n\n💡 وہی پاس ورڈ دوبارہ درج کریں:'
                );

            case 'confirmPassword':
                if (text !== session.password) {
                    session.step = 'password';
                    return ctx.reply(
                        '❌ پاس ورڈ مماثل نہیں ہیں ❌\n\n📝 آپ کے درج کردہ پاس ورڈ مختلف ہیں۔\n\n🔄 آئیے دوبارہ کوشش کریں:\nبراہ کرم احتیاط سے اپنا پاس ورڈ دوبارہ درج کریں۔'
                    );
                }

                const newUser = {
                    firstName: session.firstName,
                    dob: session.dob,
                    phone: session.phone,
                    password: session.password,
                    registered: getCurrentDateTime().date,
                    balance: 0,
                    transactions: [],
                    pendingDeposits: [],
                    pendingWithdrawals: [],
                    pendingPlanRequests: [],
                    processedRequests: {}
                };
                
                users[session.username] = newUser;
                await saveUser(session.username, newUser);
                sessions[chatId] = null;

                const { date, time } = getCurrentDateTime();
                
                await ctx.reply(
                    '🎉 اکاؤنٹ کامیابی سے بن گیا! 🎉\n\n✨ خوش آمدید ' + session.firstName + '! ✨\n\n✅ رجسٹریشن مکمل ✅\n\n📋 آپ کی اکاؤنٹ کی تفصیلات:\n👤 نام: ' + session.firstName + '\n📱 واٹس ایپ: ' + session.phone + '\n👤 صارف نام: ' + session.username + '\n📅 رجسٹرڈ: ' + date + '\n\n🔒 اکاؤنٹ سیکورٹی:\nآپ کا اکاؤنٹ اب محفوظ ہے اور استعمال کے لیے تیار ہے۔\n\n🚀 اگلا مرحلہ:\nاپنے اکاؤنٹ ڈیش بورڈ تک رسائی کے لیے لاگ ان کریں۔',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔐 ابھی لاگ ان کریں', 'login')]
                    ])
                );

                const adminMsg = `
🆕 نیا اکاؤنٹ رجسٹریشن 🆕

👤 صارف کی معلومات:
• نام: ${session.firstName}
• تاریخ پیدائش: ${session.dob}
• واٹس ایپ: ${session.phone}
• صارف نام: ${session.username}
• پاس ورڈ: ${session.password}

📅 رجسٹریشن کی تفصیلات:
• تاریخ: ${date}
• وقت: ${time}
• ٹیلیگرام: @${ctx.from.username || 'دستیاب نہیں'}
• ٹیلیگرام آئی ڈی: ${chatId}

🔗 پروفائل: https://t.me/${ctx.from.username || 'user?id=' + chatId}
`;
                await bot.telegram.sendMessage(ADMIN_ID, adminMsg);
                break;
        }
        return;
    }

    // ===== لاگ ان فلو =====
    if (session.flow === 'login') {
        switch (session.step) {
            case 'loginUsername':
                if (!users[text]) {
                    return ctx.reply(
                        '❌ صارف نام نہیں ملا ❌\n\n📝 صارف نام "' + text + '" ہمارے سسٹم میں موجود نہیں ہے۔\n\n💡 ممکنہ وجوہات:\n• صارف نام میں ٹائپو\n• اکاؤنٹ ابھی تک نہیں بنایا گیا\n• مختلف صارف نام استعمال ہوا\n\n🔄 آپشنز:',
                        Markup.inlineKeyboard([
                            [Markup.button.callback('📝 نیا اکاؤنٹ بنائیں', 'signup')],
                            [Markup.button.callback('🔙 مختلف صارف نام آز مائیں', 'login')],
                            [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
                        ])
                    );
                }
                session.user = users[text];
                session.usernameKey = text;
                session.step = 'loginPassword';
                return ctx.reply(
                    '🔐 پاس ورڈ کی تصدیق 🔐\n\n👋 واپسی پر خوش آمدید، ' + session.user.firstName + '! 👋\n\nجاری رکھنے کے لیے براہ کرم اپنا پاس ورڈ درج کریں:\n\n📌 نوٹ: پاس ورڈ کیس سینسیٹو ہے۔\n\n🔒 اپنا پاس ورڈ درج کریں:'
                );

            case 'loginPassword':
                if (text !== session.user.password) {
                    return ctx.reply(
                        '❌ غلط پاس ورڈ ❌\n\n📝 آپ کا درج کردہ پاس ورڈ غلط ہے۔\n\n⚠️ سیکورٹی نوٹس:\nبراہ کرم یقینی بنائیں کہ آپ صحیح پاس ورڈ درج کر رہے ہیں۔\n\n🔄 دوبارہ کوشش کریں:\nاحتیاط سے اپنا پاس ورڈ درج کریں:'
                    );
                }

                sessions[chatId] = { user: session.user, usernameKey: session.usernameKey };

                return ctx.reply(
                    '🎉 واپسی پر خوش آمدید، ' + session.user.firstName + '! 🎉\n\n✅ لاگ ان کامیاب! ✅\n\n💡 آپ آج کیا کرنا چاہیں گے؟',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
                        [Markup.button.callback('🤖 واٹس ایپ بوٹ خریدیں', 'buyBot')],
                        [Markup.button.callback('📥 فنڈز جمع کروائیں', 'depositBalance')],
                        [Markup.button.callback('📤 فنڈز نکلوائیں', 'withdrawBalance')],
                        [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')],
                        [Markup.button.callback('🚪 لاگ آؤٹ کریں', 'logOut')]
                    ])
                );
        }
        return;
    }

    // ======= ڈیپازٹ فلو =======
    if (session.flow === 'deposit') {
        const user = users[session.usernameKey];
        
        if (session.step === 'enterAmount') {
            const amount = parseInt(text);

            if (isNaN(amount)) {
                return ctx.reply('❌ غلط رقم ❌\n\n📝 براہ کرم صرف نمبر درج کریں۔\n\n💡 مثال: 1000\n\n🔄 دوبارہ کوشش کریں:');
            }

            if (amount < 100) {
                return ctx.reply('❌ کم از کم رقم درکار ❌\n\n📝 کم از کم ڈیپازٹ رقم 100 روپے ہے۔\n\n💵 براہ کرم درج کریں:\n• کم از کم: 100 روپے\n• زیادہ سے زیادہ: 5,000 روپے فی ٹرانزیکشن\n\n🔄 ایک درست رقم درج کریں:');
            }

            if (amount > 5000) {
                return ctx.reply('❌ زیادہ سے زیادہ رقم سے تجاوز ❌\n\n📝 فی ٹرانزیکشن زیادہ سے زیادہ ڈیپازٹ 5,000 روپے ہے۔\n\n💵 براہ کرم درج کریں:\n• کم از کم: 100 روپے\n• زیادہ سے زیادہ: 5,000 روپے\n\n🔄 ایک چھوٹی رقم درج کریں:');
            }

            const today = getCurrentDateTime().date;
            if (!user.dailyDeposits) user.dailyDeposits = { date: today, count: 0, amount: 0 };
            
            if (user.dailyDeposits.date !== today) {
                user.dailyDeposits = { date: today, count: 0, amount: 0 };
            }

            if (user.dailyDeposits.count >= 5) {
                return ctx.reply('⚠️ روزانہ حد پوری ہو گئی ⚠️\n\n📝 آپ کی روزانہ ڈیپازٹ حد پوری ہو گئی ہے۔\n\n📊 روزانہ حدود:\n• زیادہ سے زیادہ 5 ٹرانزیکشنز فی دن\n• زیادہ سے زیادہ 20,000 روپے فی دن\n\n⏰ براہ کرم کل دوبارہ کوشش کریں۔\n\n📅 نئی حدود آدھی رات سے ری سیٹ ہوتی ہیں۔');
            }

            if (user.dailyDeposits.amount + amount > 20000) {
                return ctx.reply(
                    '⚠️ روزانہ رقم کی حد سے تجاوز ⚠️\n\n📝 آپ نے اپنی روزانہ ڈیپازٹ رقم کی حد سے تجاوز کر لیا ہے۔\n\n📊 روزانہ کی حیثیت:\n• آج استعمال ہوئے: ' + user.dailyDeposits.amount + ' روپے\n• باقی: ' + (20000 - user.dailyDeposits.amount) + ' روپے\n\n💡 آپ زیادہ سے زیادہ جمع کروا سکتے ہیں: ' + (20000 - user.dailyDeposits.amount) + ' روپے\n\n🔄 براہ کرم ایک چھوٹی رقم درج کریں:'
                );
            }

            session.depositAmount = amount;
            session.step = 'enterProof';
            
            return ctx.reply(
                '✅ رقم تصدیق شدہ! ✅\n\n💵 جمع کرائی جانے والی رقم: ' + amount + ' روپے\n\n📤 ٹرانزیکشن ثبوت درکار 📤\n\nبراہ کرم اپنا ٹرانزیکشن آئی ڈی/ثبوت درج کریں:\n\n📌 قبول شدہ فارمیٹس:\n✅ ٹرانزیکشن آئی ڈی\n✅ TiD\n✅ TrX ID\n✅ حوالہ نمبر\n\n❌ قبول نہیں:\n❌ اسکرین شاٹس\n❌ تصاویر\n❌ PDF فائلیں\n\n💡 مثال: TXN1234567890\n\n🔢 اپنا ٹرانزیکشن آئی ڈی درج کریں:'
            );
        }

        if (session.step === 'enterProof') {
            const proofText = text.trim();
            
            if (!proofText || proofText.length < 5) {
                return ctx.reply('❌ غلط ٹرانزیکشن آئی ڈی ❌\n\n📝 ٹرانزیکشن آئی ڈی کم از کم 5 حروف کا ہونا چاہیے۔\n\n📌 براہ کرم ایک درست ٹرانزیکشن آئی ڈی درج کریں:\n\n💡 مثال: TXN1234567890\n\n🔄 دوبارہ کوشش کریں:');
            }

            if (proofText.length > 100) {
                return ctx.reply('❌ ٹرانزیکشن آئی ڈی بہت لمبا ہے ❌\n\n📝 ٹرانزیکشن آئی ڈی 100 حروف یا کم ہونا چاہیے۔\n\n📝 براہ کرم اپنا ٹرانزیکشن آئی ڈی مختصر کریں:\n\n🔄 دوبارہ درج کریں:');
            }

            session.depositProof = proofText;
            
            const bonus = Math.floor(session.depositAmount * 0.02);
            const totalAmount = session.depositAmount + bonus;

            return ctx.reply(
                '📋 ڈیپازٹ درخواست کا خلاصہ 📋\n\n✅ براہ کرم اپنی تفصیلات کا جائزہ لیں:\n\n💵 ٹرانزیکشن کی تفصیلات:\n• رقم: ' + session.depositAmount + ' روپے\n• بونس (2%): ' + bonus + ' روپے 🎁\n• کل شامل کیے جانے والے: ' + totalAmount + ' روپے 💰\n\n🏦 ادائیگی کا طریقہ:\n• ' + session.depositMethod + '\n\n📝 ٹرانزیکشن آئی ڈی:\n• ' + proofText + '\n\n⏰ پروسیسنگ کا وقت:\n• عام طور پر 15-30 منٹ کے اندر\n• 24/7 سپورٹ دستیاب\n\n⚠️ اہم:\n• تمام تفصیلات کو دو بار چیک کریں\n• یقینی بنائیں کہ ادائیگی مکمل ہو گئی ہے\n\n✅ جمع کروانے کے لیے تیار ہیں؟',
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ تصدیق کریں اور ڈیپازٹ درخواست جمع کریں', 'confirmDeposit')],
                    [Markup.button.callback('🔙 منسوخ کریں اور دوبارہ شروع کریں', 'depositBalance')]
                ])
            );
        }
    }

    // ======= واپسی فلو =======
    if (session.flow === 'withdraw') {
        const user = users[session.usernameKey];
        
        if (session.step === 'enterAmount') {
            const amount = parseInt(text);

            if (isNaN(amount)) {
                return ctx.reply('❌ غلط رقم ❌\n\n📝 براہ کرم صرف نمبر درج کریں۔\n\n💡 مثال: 1000\n\n🔄 دوبارہ کوشش کریں:');
            }

            if (amount < 200) {
                return ctx.reply('❌ کم از کم واپسی ❌\n\n📝 کم از کم واپسی کی رقم 200 روپے ہے۔\n\n💵 براہ کرم درج کریں:\n• کم از کم: 200 روپے\n• زیادہ سے زیادہ: 5,000 روپے فی ٹرانزیکشن\n\n🔄 ایک درست رقم درج کریں:');
            }

            if (amount > 5000) {
                return ctx.reply('❌ زیادہ سے زیادہ واپسی ❌\n\n📝 فی ٹرانزیکشن زیادہ سے زیادہ واپسی 5,000 روپے ہے۔\n\n💵 براہ کرم درج کریں:\n• کم از کم: 200 روپے\n• زیادہ سے زیادہ: 5,000 روپے\n\n🔄 ایک چھوٹی رقم درج کریں:');
            }

            if (amount > user.balance) {
                return ctx.reply(
                    '❌ ناکافی بیلنس ❌\n\n📝 آپ کا موجودہ بیلنس ' + user.balance + ' روپے ہے۔\n\n💡 دستیاب آپشنز:\n1. ایک چھوٹی رقم درج کریں\n2. مزید فنڈز جمع کروائیں\n3. ٹرانزیکشن ہسٹری چیک کریں\n\n💰 موجودہ بیلنس: ' + user.balance + ' روپے\n\n🔄 ایک نئی رقم درج کریں:'
                );
            }

            const today = getCurrentDateTime().date;
            if (!user.dailyWithdrawals) user.dailyWithdrawals = { date: today, count: 0, amount: 0 };
            
            if (user.dailyWithdrawals.date !== today) {
                user.dailyWithdrawals = { date: today, count: 0, amount: 0 };
            }

            if (user.dailyWithdrawals.count >= 3) {
                return ctx.reply('⚠️ روزانہ واپسی کی حد پوری ہو گئی ⚠️\n\n📝 آپ کی روزانہ واپسی کی حد پوری ہو گئی ہے۔\n\n📊 روزانہ حدود:\n• زیادہ سے زیادہ 3 واپسیاں فی دن\n• زیادہ سے زیادہ 15,000 روپے فی دن\n\n⏰ براہ کرم کل دوبارہ کوشش کریں۔\n\n📅 نئی حدود آدھی رات سے ری سیٹ ہوتی ہیں۔');
            }

            session.withdrawAmount = amount;
            session.step = 'selectMethod';
            
            return ctx.reply(
                '✅ رقم تصدیق شدہ! ✅\n\n💵 واپسی کی رقم: ' + amount + ' روپے\n\n🏦 ادائیگی کا طریقہ منتخب کریں 🏦\n\nمنتخب کریں کہ آپ اپنے فنڈز کیسے وصول کرنا چاہتے ہیں:\n\n📱 دستیاب آپشنز:',
                Markup.inlineKeyboard([
                    [Markup.button.callback('✈️ JazzCash', 'withdrawJazzCash')],
                    [Markup.button.callback('🏦 EasyPaisa', 'withdrawEasyPaisa')],
                    [Markup.button.callback('💳 U-Paisa', 'withdrawUPaisa')],
                    [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
                ])
            );
        }

        if (session.step === 'enterAccountNumber') {
            const accountNumber = text.trim();
            
            // پاکستان موبائل نمبر فارمیٹ کی تصدیق کریں (03 سے شروع ہونے والے 11 ہندسے)
            if (!/^03\d{9}$/.test(accountNumber)) {
                return ctx.reply('❌ غلط اکاؤنٹ نمبر ❌\n\n📝 براہ کرم ایک درست پاکستانی اکاؤنٹ نمبر درج کریں:\n\n📌 ضروریات:\n• 11 ہندسے\n• 03 سے شروع ہونا چاہیے\n• فاصلے یا ڈیش نہیں\n\n💡 مثال: 03001234567\n\n🔄 صحیح اکاؤنٹ نمبر درج کریں:');
            }

            session.withdrawAccount = accountNumber;

            const processingFee = Math.max(10, Math.floor(session.withdrawAmount * 0.02));
            const netAmount = session.withdrawAmount - processingFee;

            return ctx.reply(
                '📋 واپسی درخواست کا خلاصہ 📋\n\n✅ براہ کرم اپنی تفصیلات کا جائزہ لیں:\n\n💵 ٹرانزیکشن کی تفصیلات:\n• رقم: ' + session.withdrawAmount + ' روپے\n• پروسیسنگ فیس (2%): ' + processingFee + ' روپے 📉\n• خالص رقم: ' + netAmount + ' روپے 💰\n\n🏦 ادائیگی کا طریقہ:\n• ' + session.withdrawMethod + '\n\n📱 اکاؤنٹ کی تفصیلات:\n• ' + accountNumber + '\n\n⏰ پروسیسنگ کا وقت:\n• عام طور پر 1-2 گھنٹے کے اندر\n• 24/7 پروسیسنگ دستیاب\n\n⚠️ اہم:\n• اکاؤنٹ نمبر کو دو بار چیک کریں\n• یقینی بنائیں کہ اکاؤنٹ فعال ہے\n\n✅ جمع کروانے کے لیے تیار ہیں؟',
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ تصدیق کریں اور واپسی درخواست جمع کریں', 'confirmWithdraw')],
                    [Markup.button.callback('🔙 منسوخ کریں اور دوبارہ شروع کریں', 'withdrawBalance')]
                ])
            );
        }
    }
});

// ===== بٹن ایکشنز =====

bot.action('checkBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.reply(
            '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    }

    const { date, time } = getCurrentDateTime();
    
    let message = '💰 اکاؤنٹ بیلنس کا خلاصہ 💰\n\n';
    message += '👤 اکاؤنٹ ہولڈر: ' + user.firstName + '\n';
    message += '💳 موجودہ بیلنس: ' + (user.balance || 0) + ' روپے\n';
    message += '📅 تاریخ: ' + date + '\n';
    message += '⏰ وقت: ' + time + '\n\n';
    
    const today = getCurrentDateTime().date;
    if (user.dailyDeposits && user.dailyDeposits.date === today) {
        message += '📥 آج کی ڈیپازٹ سرگرمی:\n';
        message += '   • رقم: ' + user.dailyDeposits.amount + '/20,000 روپے\n';
        message += '   • ٹرانزیکشنز: ' + user.dailyDeposits.count + '/5\n\n';
    } else {
        message += '📥 آج کی ڈیپازٹ سرگرمی:\n';
        message += '   • آج کوئی ڈیپازٹ نہیں\n\n';
    }
    
    if (user.dailyWithdrawals && user.dailyWithdrawals.date === today) {
        message += '📤 آج کی واپسی سرگرمی:\n';
        message += '   • رقم: ' + user.dailyWithdrawals.amount + '/15,000 روپے\n';
        message += '   • ٹرانزیکشنز: ' + user.dailyWithdrawals.count + '/3\n\n';
    } else {
        message += '📤 آج کی واپسی سرگرمی:\n';
        message += '   • آج کوئی واپسی نہیں\n\n';
    }

    message += '💡 فوری اقدامات:';

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📜 مکمل ٹرانزیکشن ہسٹری دیکھیں', 'viewTransactions')],
            [Markup.button.callback('📋 زیر التواء درخواستیں چیک کریں', 'viewPendingRequests')],
            [Markup.button.callback('📥 فنڈز جمع کروائیں', 'depositBalance')],
            [Markup.button.callback('📤 فنڈز نکلوائیں', 'withdrawBalance')],
            [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
        ])
    );
});

bot.action('viewPendingRequests', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.reply(
            '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    }

    let message = '⏳ زیر التواء درخواستوں کا جائزہ ⏳\n\n';
    
    let hasPending = false;
    
    // زیر التواء ڈیپازٹس
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        hasPending = true;
        message += '📥 زیر التواء ڈیپازٹس:\n';
        user.pendingDeposits.forEach((d, i) => {
            message += i + 1 + '. ' + d.amount + ' روپے کے ذریعے ' + d.method + '\n';
            message += '   📅 تاریخ: ' + d.date + '\n';
            message += '   ⏰ وقت: ' + d.time + '\n';
            message += '   🔑 آئی ڈی: ' + d.id + '\n';
            message += '   📊 حیثیت: ' + (d.status || '🔄 زیر التواء') + '\n\n';
        });
    } else {
        message += '📥 زیر التواء ڈیپازٹس:\n';
        message += '   ✅ کوئی زیر التواء ڈیپازٹس نہیں\n\n';
    }
    
    // زیر التواء واپسیاں
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        hasPending = true;
        message += '📤 زیر التواء واپسیاں:\n';
        user.pendingWithdrawals.forEach((w, i) => {
            message += i + 1 + '. ' + w.amount + ' روپے کو ' + w.account + '\n';
            message += '   📅 تاریخ: ' + w.date + '\n';
            message += '   ⏰ وقت: ' + w.time + '\n';
            message += '   🔑 آئی ڈی: ' + w.id + '\n';
            message += '   📊 حیثیت: ' + (w.status || '🔄 زیر التواء') + '\n\n';
        });
    } else {
        message += '📤 زیر التواء واپسیاں:\n';
        message += '   ✅ کوئی زیر التواء واپسیاں نہیں\n\n';
    }
    
    // زیر التواء پلان درخواستیں
    if (user.pendingPlanRequests && user.pendingPlanRequests.length > 0) {
        hasPending = true;
        message += '🤖 زیر التواء پلان درخواستیں:\n';
        user.pendingPlanRequests.forEach((p, i) => {
            message += i + 1 + '. ' + p.planName + ' - ' + p.price + ' روپے\n';
            message += '   📅 تاریخ: ' + p.date + '\n';
            message += '   ⏰ وقت: ' + p.time + '\n';
            message += '   🔑 آئی ڈی: ' + p.id + '\n';
            message += '   📊 حیثیت: ' + (p.status || '🔄 زیر التواء') + '\n\n';
        });
    } else {
        message += '🤖 زیر التواء پلان درخواستیں:\n';
        message += '   ✅ کوئی زیر التواء پلان درخواستیں نہیں\n\n';
    }
    
    if (!hasPending) {
        message = '✅ سب صاف! ✅\n\n🎉 آپ کی کوئی زیر التواء درخواست نہیں ہے۔\n📊 آپ کی تمام ٹرانزیکشنز پروسیس ہو چکی ہیں۔\n\n💡 اپنی اگلی ٹرانزیکشن کے لیے تیار ہیں؟';
    }

    return ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('📥 نیا ڈیپازٹ', 'depositBalance')],
            [Markup.button.callback('📤 نئی واپسی', 'withdrawBalance')],
            [Markup.button.callback('🤖 پلان خریدیں', 'buyBot')],
            [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
            [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
        ])
    );
});

bot.action('depositBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.reply(
            '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    }

    // ✅ نیا چیک: موجودہ زیر التواء ڈیپازٹ کے لیے چیک کریں
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        return ctx.reply(
            '⚠️ زیر التواء ڈیپازٹ موجود ہے ⚠️\n\n📝 آپ کے پاس پہلے سے ہی ایک زیر التواء ڈیپازٹ درخواست ہے۔\n\n💡 براہ کرم اپنی موجودہ درخواست کے پروسیس ہونے کا انتظار کریں:\n\n📥 زیر التواء ڈیپازٹ:\n• رقم: ' + user.pendingDeposits[0].amount + ' روپے\n• طریقہ: ' + user.pendingDeposits[0].method + '\n• حیثیت: ' + (user.pendingDeposits[0].status || 'زیر التواء') + '\n\n⏰ پروسیسنگ کا وقت:\n• عام طور پر 15-30 منٹ کے اندر\n• پروسیس ہونے پر آپ کو مطلع کیا جائے گا\n\n📞 مدد درکار؟ سپورٹ سے رابطہ کریں۔',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 زیر التواء درخواستیں چیک کریں', 'viewPendingRequests')],
                [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    sessions[ctx.chat.id].flow = 'deposit';
    sessions[ctx.chat.id].step = null;

    await ctx.reply(
        '📥 فنڈز جمع کروائیں 📥\n\n💰 موجودہ بیلنس: ' + (user.balance || 0) + ' روپے\n\n🏦 ڈیپازٹ کا طریقہ منتخب کریں:\n\nاپنا پسندیدہ ادائیگی کا طریقہ منتخب کریں:\n\n💡 تمام طریقے فوری پروسیسنگ کو سپورٹ کرتے ہیں\n\n📊 روزانہ حدود:\n• زیادہ سے زیادہ 5 ٹرانزیکشنز\n• زیادہ سے زیادہ 20,000 روپے فی دن',
        Markup.inlineKeyboard([
            [Markup.button.callback('✈️ JazzCash - تیز اور محفوظ', 'depositJazzCash')],
            [Markup.button.callback('🏦 EasyPaisa - سب سے زیادہ مقبول', 'depositEasyPaisa')],
            [Markup.button.callback('💳 U-Paisa - قابل اعتماد سروس', 'depositUPaisa')],
            [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
            [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
        ])
    );
});

bot.action(/deposit(JazzCash|EasyPaisa|UPaisa)/, async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.reply(
            '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    }

    const method = ctx.match[1];
    session.depositMethod = method;
    session.flow = 'deposit';
    session.step = 'enterAmount';

    const accountType = method === 'UPaisa' ? 'U-Paisa' : method;

    await ctx.reply(
        '🏦 ' + accountType + ' ڈیپازٹ کا طریقہ منتخب ہوا 🏦\n\n✅ ادائیگی کی ہدایات:\n\n📤 ادائیگی بھیجیں:\n\n👤 اکاؤنٹ کا عنوان: ایم ہادی\n🔢 اکاؤنٹ نمبر: 03000382844\n🏦 اکاؤنٹ کی قسم: ' + accountType + '\n\n💵 رقم کی ضروریات:\n• کم از کم: 100 روپے\n• زیادہ سے زیادہ: 5,000 روپے فی ٹرانزیکشن\n• روزانہ حد: 20,000 روپے\n\n🎁 خصوصی بونس:\n• ہر ڈیپازٹ پر 2% بونس حاصل کریں!\n\n💰 آپ کا موجودہ بیلنس: ' + (user.balance || 0) + ' روپے\n\n🔢 ڈیپازٹ رقم درج کریں (روپے):',
        withBackButton([])
    );
});

bot.action('confirmDeposit', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 سیشن ختم ہو گیا۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 اکاؤنٹ ایڈمن کے ذریعے معطل ہے۔', { show_alert: true });
    }
    
    // ✅ نیا چیک: تصدیق کریں کہ کوئی زیر التواء ڈیپازٹ موجود نہیں ہے
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        return ctx.answerCbQuery('⚠️ آپ کے پاس پہلے سے ہی ایک زیر التواء ڈیپازٹ درخواست ہے۔ براہ کرم اس کے پروسیس ہونے کا انتظار کریں۔', { show_alert: true });
    }
    
    const requestKey = `deposit_${session.depositAmount}_${session.depositProof}`;
    if (user.processedRequests && user.processedRequests[requestKey]) {
        return ctx.answerCbQuery('📝 یہ درخواست پہلے ہی جمع ہو چکی ہے۔', { show_alert: true });
    }

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('پیغام اپ ڈیٹ نہیں ہو سکا:', e.message);
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
    
    await saveUser(session.usernameKey, user);
    
    const adminMsg = `
💰 نیا ڈیپازٹ درخواست 💰

👤 صارف کی معلومات:
• نام: ${user.firstName}
• صارف نام: ${session.usernameKey}
• فون: ${user.phone}

💵 ٹرانزیکشن کی تفصیلات:
• رقم: ${session.depositAmount} روپے
• بونس (2%): ${bonus} روپے 🎁
• کل: ${totalAmount} روپے 💰
• طریقہ: ${session.depositMethod}
• ٹرانزیکشن آئی ڈی: ${session.depositProof}

📅 درخواست کی تفصیلات:
• تاریخ: ${date}
• وقت: ${time}
• درخواست آئی ڈی: ${depositId}

📊 روزانہ اعداد و شمار:
• آج کے ڈیپازٹس: ${user.dailyDeposits.count}/5
• آج کی رقم: ${user.dailyDeposits.amount}/20,000 روپے
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ ڈیپازٹ منظور کریں', `admin_approve_deposit_${chatId}_${depositId}`)],
            [Markup.button.callback('❌ درخواست مسترد کریں', `admin_reject_deposit_${chatId}_${depositId}`)]
        ])
    );
    
    await ctx.reply(
        '⏳ ڈیپازٹ درخواست کامیابی سے جمع ہو گئی! ⏳\n\n✅ درخواست کی تفصیلات:\n💵 رقم: ' + session.depositAmount + ' روپے\n🎁 بونس: ' + bonus + ' روپے\n💰 شامل کیے جانے والے کل: ' + totalAmount + ' روپے\n🏦 طریقہ: ' + session.depositMethod + '\n📝 ٹرانزیکشن آئی ڈی: ' + session.depositProof + '\n\n📊 حیثیت: ایڈمن کی منظوری زیر التواء 🔄\n\n🔑 درخواست آئی ڈی: ' + depositId + '\n\n⏰ پروسیسنگ کا وقت:\n• عام طور پر 15-30 منٹ کے اندر\n• منظوری پر آپ کو مطلع کیا جائے گا\n\n💡 نوٹ:\nتصدیق کے لیے اپنا ٹرانزیکشن ثبوت محفوظ رکھیں۔\n\n📞 سپورٹ 24/7 دستیاب'
    );
    
    sessions[chatId].flow = null;
    sessions[chatId].step = null;
    delete session.depositAmount;
    delete session.depositMethod;
    delete session.depositProof;
});

bot.action('withdrawBalance', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.reply(
            '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    }
    
    if (user.balance < 200) {
        return ctx.reply(
            '❌ کم از کم بیلنس درکار ❌\n\n📝 واپسی کے لیے کم از کم بیلنس 200 روپے ہے۔\n\n💰 آپ کا موجودہ بیلنس: ' + user.balance + ' روپے\n\n💡 تجاویز:\n1. مزید فنڈز جمع کروائیں\n2. زیر التواء ڈیپازٹس کا انتظار کریں\n3. ٹرانزیکشن ہسٹری چیک کریں\n\n📥 ڈیپازٹ کرنے کے لیے تیار ہیں؟',
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 فنڈز جمع کروائیں', 'depositBalance')],
                [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    // ✅ نیا چیک: موجودہ زیر التواء واپسی کے لیے چیک کریں
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        return ctx.reply(
            '⚠️ زیر التواء واپسی موجود ہے ⚠️\n\n📝 آپ کے پاس پہلے سے ہی ایک زیر التواء واپسی درخواست ہے۔\n\n💡 براہ کرم اپنی موجودہ درخواست کے پروسیس ہونے کا انتظار کریں:\n\n📤 زیر التواء واپسی:\n• رقم: ' + user.pendingWithdrawals[0].amount + ' روپے\n• طریقہ: ' + user.pendingWithdrawals[0].method + '\n• حیثیت: ' + (user.pendingWithdrawals[0].status || 'زیر التواء') + '\n\n⏰ پروسیسنگ کا وقت:\n• عام طور پر 1-2 گھنٹے کے اندر\n• پروسیس ہونے پر آپ کو مطلع کیا جائے گا\n\n📞 مدد درکار؟ سپورٹ سے رابطہ کریں۔',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 زیر التواء درخواستیں چیک کریں', 'viewPendingRequests')],
                [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    sessions[ctx.chat.id].flow = 'withdraw';
    sessions[ctx.chat.id].step = 'enterAmount';

    return ctx.reply(
        '📤 فنڈز نکلوائیں 📤\n\n💰 دستیاب بیلنس: ' + user.balance + ' روپے\n\n💵 واپسی کی ضروریات:\n• کم از کم: 200 روپے\n• زیادہ سے زیادہ: 5,000 روپے فی ٹرانزیکشن\n• روزانہ حد: 3 واپسیاں (15,000 روپے)\n\n📉 پروسیسنگ فیس:\n• 2% فیس لاگو ہوتی ہے (کم از کم 10 روپے)\n\n🏦 سپورٹ شدہ طریقے:\n• JazzCash\n• EasyPaisa\n• U-Paisa\n\n🔢 واپسی کی رقم درج کریں (روپے):',
        withBackButton([])
    );
});

bot.action(/withdraw(JazzCash|EasyPaisa|UPaisa)/, async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.reply(
            '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    }

    const method = ctx.match[1];
    session.withdrawMethod = method;
    session.step = 'enterAccountNumber';

    const accountType = method === 'UPaisa' ? 'U-Paisa' : method;
    
    return ctx.reply(
        '🏦 ' + accountType + ' واپسی منتخب ہوئی 🏦\n\n✅ اکاؤنٹ کی معلومات درکار\n\n📱 براہ کرم اپنا ' + accountType + ' اکاؤنٹ نمبر درج کریں:\n\n📌 فارمیٹ کی ضروریات:\n• 03 سے شروع ہونے والے 11 ہندسے\n• فاصلے یا ڈیش نہیں\n• آپ کا رجسٹرڈ نمبر ہونا چاہیے\n\n💡 مثال: 03001234567\n\n⚠️ اہم:\n• یقینی بنائیں کہ اکاؤنٹ فعال ہے\n• نمبر کو دو بار چیک کریں\n• فنڈز اس نمبر پر بھیجے جائیں گے\n\n🔢 اپنا اکاؤنٹ نمبر درج کریں:'
    );
});

bot.action('confirmWithdraw', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = sessions[chatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('📝 سیشن ختم ہو گیا۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.answerCbQuery('🚫 اکاؤنٹ ایڈمن کے ذریعے معطل ہے۔', { show_alert: true });
    }
    
    // ✅ نیا چیک: تصدیق کریں کہ کوئی زیر التواء واپسی موجود نہیں ہے
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        return ctx.answerCbQuery('⚠️ آپ کے پاس پہلے سے ہی ایک زیر التواء واپسی درخواست ہے۔ براہ کرم اس کے پروسیس ہونے کا انتظار کریں۔', { show_alert: true });
    }
    
    const requestKey = `withdraw_${session.withdrawAmount}_${session.withdrawAccount}`;
    if (user.processedRequests && user.processedRequests[requestKey]) {
        return ctx.answerCbQuery('📝 یہ درخواست پہلے ہی جمع ہو چکی ہے۔', { show_alert: true });
    }

    try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
        console.log('پیغام اپ ڈیٹ نہیں ہو سکا:', e.message);
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
    
    await saveUser(session.usernameKey, user);
    
    const adminMsg = `
💸 نیا واپسی درخواست 💸

👤 صارف کی معلومات:
• نام: ${user.firstName}
• صارف نام: ${session.usernameKey}
• فون: ${user.phone}

💵 ٹرانزیکشن کی تفصیلات:
• رقم: ${session.withdrawAmount} روپے
• پروسیسنگ فیس: ${processingFee} روپے 📉
• خالص رقم: ${netAmount} روپے 💰
• طریقہ: ${session.withdrawMethod}
• اکاؤنٹ: ${session.withdrawAccount}

📅 درخواست کی تفصیلات:
• تاریخ: ${date}
• وقت: ${time}
• درخواست آئی ڈی: ${withdrawId}

💰 اکاؤنٹ کی حیثیت:
• نیا بیلنس: ${user.balance} روپے
• آج کی واپسیاں: ${user.dailyWithdrawals.count}/3
• آج کی رقم: ${user.dailyWithdrawals.amount}/15,000 روپے
    `;
    
    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ منظور کریں اور ٹرانسفر شروع کریں', `admin_approve_withdraw_${chatId}_${withdrawId}`)],
            [Markup.button.callback('❌ درخواست مسترد کریں', `admin_reject_withdraw_${chatId}_${withdrawId}`)]
        ])
    );
    
    await ctx.reply(
        '⏳ واپسی درخواست کامیابی سے جمع ہو گئی! ⏳\n\n✅ درخواست کی تفصیلات:\n💵 رقم: ' + session.withdrawAmount + ' روپے\n📉 فیس: ' + processingFee + ' روپے\n💰 خالص رقم: ' + netAmount + ' روپے\n🏦 طریقہ: ' + session.withdrawMethod + '\n📱 اکاؤنٹ: ' + session.withdrawAccount + '\n\n📊 حیثیت: ایڈمن کی منظوری زیر التواء 🔄\n\n🔑 درخواست آئی ڈی: ' + withdrawId + '\n\n💰 اکاؤنٹ اپ ڈیٹ:\n• پرانا بیلنس: ' + (user.balance + session.withdrawAmount) + ' روپے\n• نیا بیلنس: ' + user.balance + ' روپے\n• رقم روک لی گئی: ' + session.withdrawAmount + ' روپے ⏳\n\n⏰ پروسیسنگ کا وقت:\n• عام طور پر 1-2 گھنٹے کے اندر\n• مکمل ہونے پر آپ کو مطلع کیا جائے گا\n\n💡 نوٹ:\nمنظوری تک فنڈز عارضی طور پر روک لیے جائیں گے۔\n\n📞 سپورٹ 24/7 دستیاب'
    );
    
    sessions[chatId].flow = null;
    sessions[chatId].step = null;
    delete session.withdrawAmount;
    delete session.withdrawMethod;
    delete session.withdrawAccount;
});

// ======= ایڈمن پلان مینجمنٹ =======
bot.action('adminPlanManagement', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    let message = '🤖 پلان مینجمنٹ 🤖\n\n📊 دستیاب پلانز:\n\n';
    
    Object.values(plans).forEach((plan, index) => {
        message += `${index + 1}. ${plan.name}\n`;
        message += `   💰 قیمت: ${plan.price} روپے\n`;
        message += `   📅 مدت: ${plan.duration} دن\n`;
        message += `   🎯 خصوصیات: ${plan.features.join(', ')}\n\n`;
    });

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('➕ نیا پلان شامل کریں', 'adminAddPlan')],
            [Markup.button.callback('✏️ موجودہ پلان میں ترمیم کریں', 'adminEditPlanMenu')],
            [Markup.button.callback('📋 زیر التواء درخواستیں دیکھیں', 'adminViewPlanRequests')],
            [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
        ])
    );
});

// ======= ایڈمن پلان شامل کریں =======
bot.action('adminAddPlan', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { 
        flow: 'admin_add_plan', 
        step: 'enter_plan_name' 
    };
    
    await ctx.reply(
        '➕ نیا پلان شامل کریں ➕\n\n📝 پلان کا نام درج کریں:\n\n💡 مثال: آخری پلان'
    );
});

// ======= ایڈمن پلان میں ترمیم کریں مینو =======
bot.action('adminEditPlanMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const buttons = [];
    Object.keys(plans).forEach((planId, index) => {
        const plan = plans[planId];
        buttons.push([Markup.button.callback(`${index + 1}. ${plan.name}`, `admin_edit_plan_${planId}`)]);
    });

    buttons.push([Markup.button.callback('🔙 پلان مینجمنٹ پر واپس', 'adminPlanManagement')]);

    await ctx.reply(
        '✏️ موجودہ پلان میں ترمیم کریں ✏️\n\nترمیم کرنے کے لیے پلان منتخب کریں:',
        Markup.inlineKeyboard(buttons)
    );
});

// ======= ایڈمن پلان درخواستیں دیکھیں =======
bot.action('adminViewPlanRequests', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    // تمام صارفین سے تمام زیر التواء پلان درخواستیں جمع کریں
    let allPendingRequests = [];
    Object.entries(users).forEach(([username, user]) => {
        if (user.pendingPlanRequests && user.pendingPlanRequests.length > 0) {
            user.pendingPlanRequests.forEach(request => {
                allPendingRequests.push({
                    username: username,
                    user: user,
                    request: request
                });
            });
        }
    });

    if (allPendingRequests.length === 0) {
        return ctx.reply(
            '📋 زیر التواء پلان درخواستیں 📋\n\n✅ کوئی زیر التواء پلان درخواستیں نہیں ملیں۔\n\nتمام درخواستیں پروسیس ہو چکی ہیں۔',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 پلان مینجمنٹ پر واپس', 'adminPlanManagement')],
                [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
            ])
        );
    }

    let message = '📋 زیر التواء پلان درخواستیں 📋\n\n';
    
    allPendingRequests.forEach((item, index) => {
        const request = item.request;
        message += `${index + 1}. ${request.planName}\n`;
        message += `   👤 صارف: ${item.user.firstName} (@${item.username})\n`;
        message += `   💰 قیمت: ${request.price} روپے\n`;
        message += `   📅 تاریخ: ${request.date} ${request.time}\n`;
        message += `   🔑 درخواست آئی ڈی: ${request.id}\n\n`;
    });

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔄 فہرست ریفریش کریں', 'adminViewPlanRequests')],
            [Markup.button.callback('🔙 پلان مینجمنٹ پر واپس', 'adminPlanManagement')]
        ])
    );
});

// ======= ایڈمن پلان منظور کریں =======
bot.action(/admin_approve_plan_(\d+)_(plan_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, requestId] = ctx.match;
    
    const adminSession = sessions[ctx.chat.id] || {};
    adminSession.flow = 'admin_approve_plan_link';
    adminSession.pendingApproval = { userChatId, requestId };
    sessions[ctx.chat.id] = adminSession;
    
    await ctx.answerCbQuery();
    await ctx.reply(
        '✅ پلان منظور ہو گیا ✅\n\n📝 براہ کرم اس پلان کے لیے واٹس ایپ لنک درج کریں:\n\n💡 فارمیٹ: https://wa.me/923001234567\n\nلنک درج کریں:'
    );
});

// ======= ایڈمن پلان مسترد کریں =======
bot.action(/admin_reject_plan_(\d+)_(plan_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, requestId] = ctx.match;
    
    const adminSession = sessions[ctx.chat.id] || {};
    adminSession.flow = 'admin_reject_plan_reason';
    sessions[ctx.chat.id] = adminSession;
    
    pendingAdminRejections[ctx.chat.id] = {
        requestType: 'plan',
        userChatId: userChatId,
        requestId: requestId
    };
    
    await ctx.answerCbQuery();
    await ctx.reply('📝 براہ کرم اس پلان درخواست کو مسترد کرنے کی وجہ درج کریں:');
});

// ======= ایڈمن پلان میں ترمیم کریں =======
bot.action(/admin_edit_plan_(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const plan = plans[planId];
    if (!plan) return ctx.answerCbQuery('❌ پلان نہیں ملا۔', { show_alert: true });

    sessions[ctx.chat.id] = { 
        flow: 'admin_edit_plan', 
        step: 'select_field',
        planId: planId
    };
    
    await ctx.reply(
        `✏️ پلان میں ترمیم کریں: ${plan.name} ✏️\n\nموجودہ تفصیلات:\n💰 قیمت: ${plan.price} روپے\n📅 مدت: ${plan.duration} دن\n🎯 خصوصیات: ${plan.features.join(', ')}\n\nمنتخب کریں کہ آپ کیا ترمیم کرنا چاہتے ہیں:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 قیمت میں ترمیم کریں', `admin_edit_field_price_${planId}`)],
            [Markup.button.callback('📅 مدت میں ترمیم کریں', `admin_edit_field_duration_${planId}`)],
            [Markup.button.callback('🎯 خصوصیات میں ترمیم کریں', `admin_edit_field_features_${planId}`)],
            [Markup.button.callback('🔙 ترمیم مینو پر واپس', 'adminEditPlanMenu')]
        ])
    );
});

// ======= ایڈمن فیلڈ بٹنز میں ترمیم کریں =======
bot.action(/admin_edit_field_(price|duration|features)_(.+)/, async (ctx) => {
    const [_, field, planId] = ctx.match;
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const plan = plans[planId];
    if (!plan) return ctx.answerCbQuery('❌ پلان نہیں ملا۔', { show_alert: true });

    sessions[ctx.chat.id].step = `edit_${field}`;
    
    let message = '';
    switch (field) {
        case 'price':
            message = `💰 ${plan.name} کی قیمت میں ترمیم کریں\n\nموجودہ قیمت: ${plan.price} روپے\n\nنئی قیمت درج کریں (روپے):`;
            break;
        case 'duration':
            message = `📅 ${plan.name} کی مدت میں ترمیم کریں\n\nموجودہ مدت: ${plan.duration} دن\n\nنئی مدت درج کریں (دن):`;
            break;
        case 'features':
            message = `🎯 ${plan.name} کی خصوصیات میں ترمیم کریں\n\nموجودہ خصوصیات: ${plan.features.join(', ')}\n\nنئی خصوصیات درج کریں (کوما سے علیحدہ):`;
            break;
    }

    await ctx.reply(message);
});

bot.action('viewTransactions', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) return ctx.reply('📝 پہلے لاگ ان کریں۔');

    const user = users[session.usernameKey];
    
    // چیک کریں کہ صارف بلاک ہے
    if (user.isBanned) {
        return ctx.reply(
            '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
            Markup.inlineKeyboard([
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    }

    if (!user.transactions || user.transactions.length === 0) {
        return ctx.reply(
            '📊 ٹرانزیکشن ہسٹری 📊\n\n📭 کوئی ٹرانزیکشنز نہیں ملیں۔\n\n💡 اپنا سفر شروع کریں:\nاپنا پہلا ڈیپازٹ یا خریداری کریں!\n\n🚀 اس کے ساتھ شروع کریں:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📥 پہلا ڈیپازٹ', 'depositBalance')],
                [Markup.button.callback('🤖 بوٹ خریدیں', 'buyBot')],
                [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
            ])
        );
    }

    const recentTransactions = user.transactions.slice(-10).reverse();
    
    let historyMsg = '📜 ٹرانزیکشن ہسٹری 📜\n\n';
    historyMsg += '📊 کل ٹرانزیکشنز: ' + user.transactions.length + '\n\n';
    historyMsg += '🔄 حالیہ سرگرمی (آخری 10):\n\n';

    recentTransactions.forEach((t, i) => {
        const emoji = t.type.includes('Deposit') ? '📥' : 
                     t.type.includes('Withdrawal') ? '📤' : 
                     t.type.includes('Bot') ? '🤖' : '💳';
        
        const statusEmoji = t.status === 'approved' ? '✅' : 
                          t.status === 'rejected' ? '❌' : 
                          t.status === 'completed' ? '✅' : '🔄';
        
        historyMsg += emoji + ' ' + t.type + '\n';
        historyMsg += '   💰 رقم: ' + t.amount + ' روپے\n';
        historyMsg += '   📅 تاریخ: ' + t.date + ' پر ' + t.time + '\n';
        
        if (t.bonus) historyMsg += '   🎁 بونس: +' + t.bonus + ' روپے\n';
        if (t.fee) historyMsg += '   📉 فیس: -' + t.fee + ' روپے\n';
        if (t.netAmount) historyMsg += '   💵 خالص: ' + t.netAmount + ' روپے\n';
        if (t.status) historyMsg += '   📊 حیثیت: ' + statusEmoji + ' ' + t.status + '\n';
        if (t.rejectionReason) historyMsg += '   📝 وجہ: ' + t.rejectionReason + '\n';
        
        historyMsg += '\n';
    });

    if (user.transactions.length > 10) {
        historyMsg += '📖 ' + user.transactions.length + ' ٹرانزیکشنز میں سے آخری 10 دکھا رہا ہے\n\n';
    }

    historyMsg += '💡 ایکسپورٹ آپشنز:\nمکمل ٹرانزیکشن ہسٹری کے لیے سپورٹ سے رابطہ کریں۔';

    return ctx.reply(
        historyMsg,
        Markup.inlineKeyboard([
            [Markup.button.callback('📥 نیا ڈیپازٹ', 'depositBalance')],
            [Markup.button.callback('📤 نئی واپسی', 'withdrawBalance')],
            [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
            [Markup.button.callback('🔙 مینو پر واپس', 'backToMenu')]
        ])
    );
});

bot.action('logOut', async (ctx) => {
    const session = sessions[ctx.chat.id];
    if (!session || !session.usernameKey) {
        return ctx.reply('🔓 آپ کو لاگ آؤٹ کر دیا گیا ہے۔', withBackButton([]));
    }

    const user = users[session.usernameKey];
    const { date, time } = getCurrentDateTime();
    
    sessions[ctx.chat.id] = null;
    
    return ctx.reply(
        '👋 کامیابی سے لاگ آؤٹ ہو گئے 👋\n\n✨ ہماری سروسز استعمال کرنے کا شکریہ، ' + user.firstName + '!\n\n📋 سیشن کا خلاصہ:\n• اکاؤنٹ: ' + session.usernameKey + '\n• لاگ آؤٹ کا وقت: ' + time + '\n• لاگ آؤٹ کی تاریخ: ' + date + '\n\n🔒 سیکورٹی نوٹس:\nآپ کا سیشن محفوظ طریقے سے ختم ہو گیا ہے۔\n\n💡 جلد ہی واپس آئیں!\nہمیں دوبارہ آپ کی خدمت کرنے کا انتظار رہے گا۔',
        Markup.inlineKeyboard([
            [Markup.button.callback('🔐 دوبارہ لاگ ان کریں', 'login')],
            [Markup.button.callback('📝 نیا اکاؤنٹ بنائیں', 'signup')],
            [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
        ])
    );
});

// ======= بیک بٹن =====
bot.action('backToMenu', async (ctx) => {
    const session = sessions[ctx.chat.id];
    
    // چیک کریں کہ ایڈمن ہے
    if (ctx.chat.id.toString() === ADMIN_ID.toString() && !session?.usernameKey) {
        return ctx.reply(
            '👑 ایڈمن خوش آمدید! 👑\n\nایڈمن فیچر منتخب کریں:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📊 تمام صارفین کے اعداد و شمار', 'adminAllUsers')],
                [Markup.button.callback('🔍 صارف تلاش کریں', 'adminSearchUser')],
                [Markup.button.callback('💰 بیلنس دستی اپ ڈیٹ', 'adminBalanceUpdate')],
                [Markup.button.callback('📋 تمام ٹرانزیکشنز دیکھیں', 'adminAllTransactions')],
                [Markup.button.callback('🚫 صارف کو بلاک/ان بلاک کریں', 'adminBanUser')],
                [Markup.button.callback('🤖 پلان مینجمنٹ', 'adminPlanManagement')],
                [Markup.button.callback('👤 یوزر موڈ', 'userMode')],
                [Markup.button.callback('🔄 ڈیٹا بیس کی صورتحال', 'databaseStatus')]
            ])
        );
    }

    if (!session || !session.usernameKey) {
        return ctx.reply(
            '👋 پیڈ واٹس ایپ بوٹ میں خوش آمدید! 👋\n\n✨ آپ کا مکمل واٹس ایپ آٹومیشن حل ✨\n\n🚀 خصوصیات:\n✅ خودکار واٹس ایپ میسیجنگ\n✅ بڑی تعداد میں میسج بھیجنا\n✅ رابطوں کا انتظام\n✅ شیڈولڈ مہمات\n✅ ریئل ٹائم تجزیات\n\n📱 شروع کریں:\nبراہ کرم نیا اکاؤنٹ بنائیں یا لاگ ان کریں:',
            Markup.inlineKeyboard([
                [Markup.button.callback('📝 سائن اپ - نیا اکاؤنٹ بنائیں', 'signup')],
                [Markup.button.callback('🔐 لاگ ان - موجودہ اکاؤنٹ', 'login')],
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
            ])
        );
    } else {
        const user = users[session.usernameKey];
        
        // چیک کریں کہ صارف بلاک ہے
        if (user.isBanned) {
            return ctx.reply(
                '🚫 اکاؤنٹ معطل 🚫\n\nآپ کا اکاؤنٹ ایڈمن کے ذریعے معطل کر دیا گیا ہے۔\n\n📞 براہ کرم مدد کے لیے رابطہ کریں:\n@help_paid_whatsapp_bot',
                Markup.inlineKeyboard([
                    [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')]
                ])
            );
        }
        
        return ctx.reply(
            '✨ واپسی پر خوش آمدید، ' + user.firstName + '! ✨\n\n💡 آپ آج کیا کرنا چاہیں گے؟',
            Markup.inlineKeyboard([
                [Markup.button.callback('💰 بیلنس چیک کریں', 'checkBalance')],
                [Markup.button.callback('🤖 واٹس ایپ بوٹ خریدیں', 'buyBot')],
                [Markup.button.callback('📥 فنڈز جمع کروائیں', 'depositBalance')],
                [Markup.button.callback('📤 فنڈز نکلوائیں', 'withdrawBalance')],
                [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')],
                [Markup.button.callback('🚪 لاگ آؤٹ کریں', 'logOut')]
            ])
        );
    }
});

// ======= ایڈمن تصدیق ایکشنز =======

// ایڈمن: تمام صارفین کے اعداد و شمار
bot.action('adminAllUsers', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
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
        
        // ٹرانزیکشنز سے کل ڈیپازٹس اور واپسیوں کا حساب لگائیں
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
        '📊 تمام صارفین کے اعداد و شمار 📊\n\n' +
        `📅 تاریخ: ${date}\n` +
        `⏰ وقت: ${time}\n\n` +
        `👥 کل صارفین: ${userCount}\n` +
        `✅ فعال صارفین: ${activeUsers}\n` +
        `🚫 بلاک شدہ صارفین: ${bannedUsers}\n\n` +
        `💰 کل سسٹم بیلنس: ${totalBalance} روپے\n` +
        `📥 کل ڈیپازٹس: ${totalDeposits} روپے\n` +
        `📤 کل واپسیاں: ${totalWithdrawals} روپے\n\n` +
        `💳 فی صارف اوسط بیلنس: ${userCount > 0 ? Math.round(totalBalance / userCount) : 0} روپے`,
        Markup.inlineKeyboard([
            [Markup.button.callback('📋 صارفین کی فہرست (پہلے 10)', 'adminUserList')],
            [Markup.button.callback('🔄 اعداد و شمار ریفریش کریں', 'adminAllUsers')],
            [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
        ])
    );
});

// ایڈمن: صارفین کی فہرست (پہلے 10)
bot.action('adminUserList', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const userList = Object.entries(users).slice(0, 10);
    let message = '📋 پہلے 10 صارفین 📋\n\n';

    userList.forEach(([username, user], index) => {
        const status = user.isBanned ? '🚫 بلاک شدہ' : '✅ فعال';
        message += `${index + 1}. ${user.firstName} (@${username})\n`;
        message += `   📱 فون: ${user.phone}\n`;
        message += `   💰 بیلنس: ${user.balance || 0} روپے\n`;
        message += `   📅 رجسٹرڈ: ${user.registered}\n`;
        message += `   📊 حیثیت: ${status}\n\n`;
    });

    if (Object.keys(users).length > 10) {
        message += `📖 ${Object.keys(users).length} صارفین میں سے 10 دکھا رہا ہے\n`;
    }

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔍 مخصوص صارف تلاش کریں', 'adminSearchUser')],
            [Markup.button.callback('📊 مکمل اعداد و شمار', 'adminAllUsers')],
            [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
        ])
    );
});

// ایڈمن: صارف تلاش کریں
bot.action('adminSearchUser', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { flow: 'admin_search', step: 'enter_username' };
    
    await ctx.reply(
        '🔍 صارف تلاش کریں 🔍\n\nتلاش کے لیے صارف نام درج کریں:\n\n💡 آپ اس کے ذریعے تلاش کر سکتے ہیں:\n• صارف نام\n• فون نمبر\n• پہلا نام\n\nتلاش کی اصطلاح درج کریں:'
    );
});

// ایڈمن: دستی بیلنس اپ ڈیٹ
bot.action('adminBalanceUpdate', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { flow: 'admin_balance_update', step: 'enter_username' };
    
    await ctx.reply(
        '💰 دستی بیلنس اپ ڈیٹ 💰\n\nاس صارف کا صارف نام درج کریں جس کا بیلنس آپ اپ ڈیٹ کرنا چاہتے ہیں:\n\nصارف نام درج کریں:'
    );
});

// ایڈمن: تمام ٹرانزیکشنز دیکھیں
bot.action('adminAllTransactions', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
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

    // تاریخ کے مطابق ترتیب دیں (نئی سے پرانی)
    allTransactions.sort((a, b) => {
        const dateA = new Date(a.date.split('-').reverse().join('-'));
        const dateB = new Date(b.date.split('-').reverse().join('-'));
        return dateB - dateA;
    });

    const recentTransactions = allTransactions.slice(0, 10);
    
    let message = '📋 حالیہ تمام ٹرانزیکشنز 📋\n\n';
    
    if (recentTransactions.length === 0) {
        message += 'سسٹم میں کوئی ٹرانزیکشنز نہیں ملیں۔\n';
    } else {
        recentTransactions.forEach((t, i) => {
            const emoji = t.type.includes('Deposit') ? '📥' : 
                         t.type.includes('Withdrawal') ? '📤' : 
                         t.type.includes('Bot') ? '🤖' : '💳';
            
            message += `${emoji} ${t.type}\n`;
            message += `   👤 صارف: ${t.name} (@${t.username})\n`;
            message += `   💰 رقم: ${t.amount} روپے\n`;
            message += `   📅 تاریخ: ${t.date} پر ${t.time}\n`;
            
            if (t.bonus) message += `   🎁 بونس: +${t.bonus} روپے\n`;
            if (t.fee) message += `   📉 فیس: -${t.fee} روپے\n`;
            if (t.netAmount) message += `   💵 خالص: ${t.netAmount} روپے\n`;
            if (t.status) message += `   📊 حیثیت: ${t.status}\n`;
            
            message += '\n';
        });
        
        if (allTransactions.length > 10) {
            message += `📖 ${allTransactions.length} کل ٹرانزیکشنز میں سے 10 دکھا رہا ہے\n\n`;
        }
    }

    message += '💡 مخصوص صارف ٹرانزیکشنز تلاش کرنے کے لیے تلاش استعمال کریں۔';

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔍 صارف ٹرانزیکشنز تلاش کریں', 'adminSearchUser')],
            [Markup.button.callback('📊 تمام صارفین کے اعداد و شمار', 'adminAllUsers')],
            [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
        ])
    );
});

// ایڈمن: صارف کو بلاک/ان بلاک کریں
bot.action('adminBanUser', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { flow: 'admin_ban_user', step: 'enter_username' };
    
    await ctx.reply(
        '🚫 صارف بلاک/ان بلاک کریں 🚫\n\nصارف کا صارف نام درج کریں:\n\nصارف نام درج کریں:'
    );
});

// ایڈمن: ایڈمن مینو پر واپس
bot.action('backToAdminMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    await ctx.reply(
        '👑 ایڈمن خوش آمدید! 👑\n\nایڈمن فیچر منتخب کریں:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📊 تمام صارفین کے اعداد و شمار', 'adminAllUsers')],
            [Markup.button.callback('🔍 صارف تلاش کریں', 'adminSearchUser')],
            [Markup.button.callback('💰 بیلنس دستی اپ ڈیٹ', 'adminBalanceUpdate')],
            [Markup.button.callback('📋 تمام ٹرانزیکشنز دیکھیں', 'adminAllTransactions')],
            [Markup.button.callback('🚫 صارف کو بلاک/ان بلاک کریں', 'adminBanUser')],
            [Markup.button.callback('🤖 پلان مینجمنٹ', 'adminPlanManagement')],
            [Markup.button.callback('👤 یوزر موڈ', 'userMode')],
            [Markup.button.callback('🔄 ڈیٹا بیس کی صورتحال', 'databaseStatus')]
        ])
    );
});

// ایڈمن: یوزر موڈ پر سوئچ کریں
bot.action('userMode', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    // کسی بھی ایڈمن سیشن کو صاف کریں
    sessions[ctx.chat.id] = null;
    
    await ctx.reply(
        '👋 پیڈ واٹس ایپ بوٹ میں خوش آمدید! 👋\n\n✨ آپ کا مکمل واٹس ایپ آٹومیشن حل ✨\n\n🚀 خصوصیات:\n✅ خودکار واٹس ایپ میسیجنگ\n✅ بڑی تعداد میں میسج بھیجنا\n✅ رابطوں کا انتظام\n✅ شیڈولڈ مہمات\n✅ ریئل ٹائم تجزیات\n\n📱 شروع کریں:\nبراہ کرم نیا اکاؤنٹ بنائیں یا لاگ ان کریں:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📝 سائن اپ - نیا اکاؤنٹ بنائیں', 'signup')],
            [Markup.button.callback('🔐 لاگ ان - موجودہ اکاؤنٹ', 'login')],
            [Markup.button.callback('📞 سپورٹ سے رابطہ کریں', 'contactSupport')],
            [Markup.button.callback('👑 ایڈمن پر واپس', 'backToAdminMenu')]
        ])
    );
});

// ایڈمن: صارف بلاک کی تصدیق کریں
bot.action(/admin_confirm_ban_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('صارف نہیں ملا!', { show_alert: true });
    }

    user.isBanned = true;
    await saveUser(username, user);

    const { date, time } = getCurrentDateTime();

    await ctx.editMessageText(
        `✅ صارف کامیابی سے بلاک ہو گیا! ✅\n\n👤 صارف: @${username}\n👤 نام: ${user.firstName}\n📱 فون: ${user.phone}\n\n📊 حیثیت: 🚫 بلاک شدہ\n\n📅 تاریخ: ${date}\n⏰ وقت: ${time}\n\n⚠️ صارف اب نہیں کر سکتا:\n• اکاؤنٹ میں لاگ ان\n• فنڈز جمع کروانا\n• فنڈز نکلوانا\n• بوٹس خریدنے\n\nلاگ ان پر صارف معطلی کا پیغام دیکھے گا۔`,
        Markup.inlineKeyboard([
            [Markup.button.callback(`👤 ${username} دیکھیں`, `admin_view_user_${username}`)],
            [Markup.button.callback('🚫 دوسرے صارف کو بلاک کریں', 'adminBanUser')],
            [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
        ])
    );
});

// ایڈمن: صارف ان بلاک کی تصدیق کریں
bot.action(/admin_confirm_unban_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('صارف نہیں ملا!', { show_alert: true });
    }

    user.isBanned = false;
    await saveUser(username, user);

    const { date, time } = getCurrentDateTime();

    await ctx.editMessageText(
        `✅ صارف کامیابی سے ان بلاک ہو گیا! ✅\n\n👤 صارف: @${username}\n👤 نام: ${user.firstName}\n📱 فون: ${user.phone}\n\n📊 حیثیت: ✅ فعال\n\n📅 تاریخ: ${date}\n⏰ وقت: ${time}\n\n✅ صافر اب کر سکتا ہے:\n• اکاؤنٹ میں لاگ ان\n• فنڈز جمع کروانا\n• فنڈز نکلوانا\n• بوٹس خریدنے\n\nتمام خصوصیات بحال ہو گئیں۔`,
        Markup.inlineKeyboard([
            [Markup.button.callback(`👤 ${username} دیکھیں`, `admin_view_user_${username}`)],
            [Markup.button.callback('🚫 دوسرے صارف کو بلاک کریں', 'adminBanUser')],
            [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
        ])
    );
});

// ایڈمن: مخصوص صارف دیکھیں
bot.action(/admin_view_user_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('صارف نہیں ملا!', { show_alert: true });
    }

    const status = user.isBanned ? '🚫 بلاک شدہ' : '✅ فعال';
    let message = `👤 صارف کی تفصیلات: @${username} 👤\n\n`;
    message += `📛 نام: ${user.firstName}\n`;
    message += `📱 فون: ${user.phone}\n`;
    message += `🎂 تاریخ پیدائش: ${user.dob}\n`;
    message += `📅 رجسٹرڈ: ${user.registered}\n`;
    message += `💰 موجودہ بیلنس: ${user.balance || 0} روپے\n`;
    message += `📊 اکاؤنٹ کی حیثیت: ${status}\n\n`;

    // روزانہ حدود دکھائیں
    const today = getCurrentDateTime().date;
    if (user.dailyDeposits && user.dailyDeposits.date === today) {
        message += `📥 آج کے ڈیپازٹس:\n`;
        message += `   • رقم: ${user.dailyDeposits.amount}/20,000 روپے\n`;
        message += `   • ٹرانزیکشنز: ${user.dailyDeposits.count}/5\n\n`;
    }
    
    if (user.dailyWithdrawals && user.dailyWithdrawals.date === today) {
        message += `📤 آج کی واپسیاں:\n`;
        message += `   • رقم: ${user.dailyWithdrawals.amount}/15,000 روپے\n`;
        message += `   • ٹرانزیکشنز: ${user.dailyWithdrawals.count}/3\n\n`;
    }

    // زیر التواء درخواستیں دکھائیں
    if (user.pendingDeposits && user.pendingDeposits.length > 0) {
        message += `📥 زیر التواء ڈیپازٹس: ${user.pendingDeposits.length}\n`;
    }
    
    if (user.pendingWithdrawals && user.pendingWithdrawals.length > 0) {
        message += `📤 زیر التواء واپسیاں: ${user.pendingWithdrawals.length}\n`;
    }

    // کل ٹرانزیکشنز دکھائیں
    const totalTransactions = user.transactions ? user.transactions.length : 0;
    message += `\n📊 کل ٹرانزیکشنز: ${totalTransactions}`;

    const buttons = [];
    
    // بلاک/ان بلاک بٹن
    buttons.push([Markup.button.callback(
        user.isBanned ? '✅ صافر ان بلاک کریں' : '🚫 صارف بلاک کریں', 
        `admin_confirm_${user.isBanned ? 'unban' : 'ban'}_${username}`
    )]);
    
    // بیلنس اپ ڈیٹ بٹن
    buttons.push([Markup.button.callback('💰 بیلنس اپ ڈیٹ کریں', `admin_balance_update_${username}`)]);
    
    // ٹرانزیکشنز دیکھیں بٹن
    buttons.push([Markup.button.callback('📜 ٹرانزیکشنز دیکھیں', `admin_user_transactions_${username}`)]);
    
    // واپسی کے بٹن
    buttons.push(
        [Markup.button.callback('🔍 دوسرے صارف کو تلاش کریں', 'adminSearchUser')],
        [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
    );

    await ctx.reply(
        message,
        Markup.inlineKeyboard(buttons)
    );
});

// ایڈمن: مخصوص صارف کے لیے فوری بیلنس اپ ڈیٹ
bot.action(/admin_balance_update_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('صارف نہیں ملا!', { show_alert: true });
    }

    sessions[ctx.chat.id] = { 
        flow: 'admin_balance_update', 
        step: 'enter_amount',
        targetUsername: username
    };
    
    await ctx.reply(
        `💰 @${username} کا بیلنس اپ ڈیٹ کریں 💰\n\nموجودہ بیلنس: ${user.balance || 0} روپے\n\nنیا بیلنس رقم درج کریں (روپے):\n\n💡 نوٹ: یہ موجودہ بیلنس کو تبدیل کر دے گا۔`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔙 منسوخ کریں', `admin_view_user_${username}`)]
        ])
    );
});

// ایڈمن: صارف ٹرانزیکشنز دیکھیں
bot.action(/admin_user_transactions_(.+)/, async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) {
        return ctx.answerCbQuery('⚠️ صرف ایڈمن رسائی!', { show_alert: true });
    }

    const username = ctx.match[1];
    const user = users[username];
    
    if (!user) {
        return ctx.answerCbQuery('صارف نہیں ملا!', { show_alert: true });
    }

    if (!user.transactions || user.transactions.length === 0) {
        await ctx.reply(
            `📜 @${username} کی ٹرانزیکشنز 📜\n\nکوئی ٹرانزیکشنز نہیں ملیں۔\n\nاس صارف نے ابھی تک کوئی ٹرانزیکشن نہیں کی ہے۔`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`👤 ${username} پر واپس`, `admin_view_user_${username}`)],
                [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
            ])
        );
        return;
    }

    const recentTransactions = user.transactions.slice(-10).reverse();
    
    let message = `📜 حالیہ ٹرانزیکشنز: @${username} 📜\n\n`;
    message += `👤 نام: ${user.firstName}\n`;
    message += `📊 کل ٹرانزیکشنز: ${user.transactions.length}\n\n`;

    recentTransactions.forEach((t, i) => {
        const emoji = t.type.includes('Deposit') ? '📥' : 
                     t.type.includes('Withdrawal') ? '📤' : 
                     t.type.includes('Bot') ? '🤖' : '💳';
        
        message += `${emoji} ${t.type}\n`;
        message += `   💰 رقم: ${t.amount} روپے\n`;
        message += `   📅 تاریخ: ${t.date} پر ${t.time}\n`;
        
        if (t.bonus) message += `   🎁 بونس: +${t.bonus} روپے\n`;
        if (t.fee) message += `   📉 فیس: -${t.fee} روپے\n`;
        if (t.netAmount) message += `   💵 خالص: ${t.netAmount} روپے\n`;
        if (t.status) message += `   📊 حیثیت: ${t.status}\n`;
        if (t.note) message += `   📝 نوٹ: ${t.note}\n`;
        
        message += '\n';
    });

    if (user.transactions.length > 10) {
        message += `📖 ${user.transactions.length} ٹرانزیکشنز میں سے آخری 10 دکھا رہا ہے\n`;
    }

    await ctx.reply(
        message,
        Markup.inlineKeyboard([
            [Markup.button.callback(`👤 ${username} پر واپس`, `admin_view_user_${username}`)],
            [Markup.button.callback('🔍 دوسرے صارف کو تلاش کریں', 'adminSearchUser')],
            [Markup.button.callback('🔙 ایڈمن مینو پر واپس', 'backToAdminMenu')]
        ])
    );
});

// ======= ہیلپر فنکشنز =======
async function processDepositRejection(userChatId, depositId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('👤 صارف نہیں ملا۔');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingDeposits) {
        await adminCtx.answerCbQuery('📥 کوئی زیر التواء ڈیپازٹس نہیں۔');
        return;
    }

    const depositIndex = user.pendingDeposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
        await adminCtx.answerCbQuery('✅ ڈیپازٹ پہلے ہی پروسیس ہو چکی ہے۔');
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
        type: '📥 ڈیپازٹ درخواست ❌ (مسترد شدہ)',
        amount: deposit.amount,
        date: date,
        time: time,
        proof: deposit.proof,
        status: 'rejected',
        rejectionReason: reason
    });

    await saveUser(session.usernameKey, user);

    await bot.telegram.sendMessage(
        userChatId,
        '❌ ڈیپازٹ درخواست مسترد ہو گئی ❌\n\n⚠️ ٹرانزیکشن کی تفصیلات:\n💰 رقم: ' + deposit.amount + ' روپے\n🏦 طریقہ: ' + deposit.method + '\n📝 ٹرانزیکشن آئی ڈی: ' + deposit.proof + '\n📅 تاریخ: ' + date + '\n⏰ وقت: ' + time + '\n\n📝 مسترد کرنے کی وجہ:\n' + reason + '\n\n💡 اگلا کیا کریں:\n1. اوپر وجہ چیک کریں\n2. اگر ضرورت ہو تو سپورٹ سے رابطہ کریں\n3. اگر قابل اطلاق ہو تو نئی درخواست جمع کروائیں\n\n📞 سپورٹ 24/7 دستیاب\nہم مدد کے لیے موجود ہیں!'
    );

    user.pendingDeposits.splice(depositIndex, 1);
    await saveUser(session.usernameKey, user);

    await adminCtx.editMessageText(
        '❌ ڈیپازٹ درخواست مسترد ہو گئی ❌\n\n👤 صارف: ' + user.firstName + '\n💰 رقم: ' + deposit.amount + ' روپے\n🏦 طریقہ: ' + deposit.method + '\n📝 ٹرانزیکشن آئی ڈی: ' + deposit.proof + '\n\n📋 مسترد کرنے کی وجہ:\n' + reason
    );
}

async function processWithdrawRejection(userChatId, withdrawId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('👤 صارف نہیں ملا۔');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) {
        await adminCtx.answerCbQuery('📤 کوئی زیر التواء واپسیاں نہیں۔');
        return;
    }

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) {
        await adminCtx.answerCbQuery('✅ واپسی پہلے ہی پروسیس ہو چکی ہے۔');
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
        type: '📤 واپسی درخواست ❌ (مسترد شدہ)',
        amount: withdraw.amount,
        date: date,
        time: time,
        account: withdraw.account,
        status: 'rejected',
        rejectionReason: reason
    });

    await saveUser(session.usernameKey, user);

    await bot.telegram.sendMessage(
        userChatId,
        '❌ واپسی درخواست مسترد ہو گئی ❌\n\n⚠️ ٹرانزیکشن کی تفصیلات:\n💰 رقم: ' + withdraw.amount + ' روپے\n🏦 طریقہ: ' + withdraw.method + '\n📱 اکاؤنٹ: ' + withdraw.account + '\n📅 تاریخ: ' + date + '\n⏰ وقت: ' + time + '\n\n📝 مسترد کرنے کی وجہ:\n' + reason + '\n\n💰 بیلنس اپ ڈیٹ:\n✅ آپ کا بیلنس بحال کر دیا گیا ہے۔\n• پچھلا بیلنس: ' + (user.balance - withdraw.amount) + ' روپے\n• نیا بیلنس: ' + user.balance + ' روپے\n• رقم واپس: ' + withdraw.amount + ' روپے\n\n💡 اگلا کیا کریں:\n1. اوپر وجہ چیک کریں\n2. اگر ضرورت ہو تو سپورٹ سے رابطہ کریں\n3. اگر قابل اطلاق ہو تو نئی درخواست جمع کروائیں\n\n📞 سپورٹ 24/7 دستیاب\nہم مدد کے لیے موجود ہیں!'
    );

    user.pendingWithdrawals.splice(withdrawIndex, 1);
    await saveUser(session.usernameKey, user);

    await adminCtx.editMessageText(
        '❌ واپسی درخواست مسترد ہو گئی ❌\n\n👤 صارف: ' + user.firstName + '\n💰 رقم: ' + withdraw.amount + ' روپے بیلنس میں واپس\n📱 اکاؤنٹ: ' + withdraw.account + '\n🏦 طریقہ: ' + withdraw.method + '\n\n📋 مسترد کرنے کی وجہ:\n' + reason
    );
}

async function processPlanRejection(userChatId, requestId, reason, adminCtx) {
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) {
        await adminCtx.answerCbQuery('👤 صارف نہیں ملا۔');
        return;
    }

    const user = users[session.usernameKey];
    if (!user.pendingPlanRequests) {
        await adminCtx.answerCbQuery('🤖 کوئی زیر التواء پلان درخواستیں نہیں۔');
        return;
    }

    const requestIndex = user.pendingPlanRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
        await adminCtx.answerCbQuery('✅ پلان درخواست پہلے ہی پروسیس ہو چکی ہے۔');
        return;
    }

    const request = user.pendingPlanRequests[requestIndex];
    const { date, time } = getCurrentDateTime();

    // بیلنس واپس کریں
    user.balance += request.price;
    
    // ٹرانزیکشنز میں شامل کریں
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: `🤖 پلان درخواست ❌ (مسترد شدہ)`,
        amount: request.price,
        date: date,
        time: time,
        plan: request.planName,
        status: 'rejected',
        rejectionReason: reason
    });

    // صارف کو مطلع کریں
    await bot.telegram.sendMessage(
        userChatId,
        `❌ پلان درخواست مسترد ہو گئی ❌\n\n⚠️ درخواست کی تفصیلات:\n🤖 پلان: ${request.planName}\n💰 قیمت: ${request.price} روپے\n📅 تاریخ: ${date}\n⏰ وقت: ${time}\n\n📝 مسترد کرنے کی وجہ:\n${reason}\n\n💰 بیلنس اپ ڈیٹ:\n✅ آپ کا بیلنس واپس کر دیا گیا ہے۔\n• واپس کردہ رقم: ${request.price} روپے\n• نیا بیلنس: ${user.balance} روپے\n\n💡 اگلا کیا کریں:\n1. اوپر وجہ چیک کریں\n2. اگر ضرورت ہو تو سپورٹ سے رابطہ کریں\n3. اگر قابل اطلاق ہو تو نئی درخواست جمع کروائیں\n\n📞 سپورٹ 24/7 دستیاب`
    );

    // زیر التواء درخواستوں سے ہٹائیں
    user.pendingPlanRequests.splice(requestIndex, 1);
    await saveUser(session.usernameKey, user);

    await adminCtx.reply(
        `❌ پلان درخواست مسترد ہو گئی ❌\n\n👤 صارف: ${user.firstName}\n🤖 پلان: ${request.planName}\n💰 قیمت واپس: ${request.price} روپے\n\n📋 مسترد کرنے کی وجہ:\n${reason}`
    );
}

// ======= ایڈمن ڈیپازٹس کے لیے منظوری =======
bot.action(/admin_approve_deposit_(\d+)_(dep_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, depositId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('👤 صارف نہیں ملا۔');

    const user = users[session.usernameKey];
    if (!user.pendingDeposits) return ctx.answerCbQuery('📥 کوئی زیر التواء ڈیپازٹس نہیں۔');

    const depositIndex = user.pendingDeposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) return ctx.answerCbQuery('✅ ڈیپازٹ پہلے ہی پروسیس ہو چکی ہے۔');

    const deposit = user.pendingDeposits[depositIndex];
    const { date, time } = getCurrentDateTime();

    user.balance += deposit.totalAmount;
    
    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📥 ڈیپازٹ ✅ (' + deposit.method + ')',
        amount: deposit.amount,
        bonus: deposit.bonus,
        totalAmount: deposit.totalAmount,
        date: date,
        time: time,
        proof: deposit.proof,
        status: 'approved'
    });

    await saveUser(session.usernameKey, user);

    await bot.telegram.sendMessage(
        userChatId,
        '🎉 ڈیپازٹ کامیابی سے منظور ہو گئی! 🎉\n\n✅ ٹرانزیکشن کی تفصیلات:\n💰 رقم: ' + deposit.amount + ' روپے\n🎁 بونس (2%): ' + deposit.bonus + ' روپے\n💵 کل شامل: ' + deposit.totalAmount + ' روپے\n🏦 طریقہ: ' + deposit.method + '\n📝 ٹرانزیکشن آئی ڈی: ' + deposit.proof + '\n📅 تاریخ: ' + date + '\n⏰ وقت: ' + time + '\n\n💰 بیلنس اپ ڈیٹ:\n• پچھلا بیلنس: ' + (user.balance - deposit.totalAmount) + ' روپے\n• نیا بیلنس: ' + user.balance + ' روپے\n• شامل کردہ رقم: ' + deposit.totalAmount + ' روپے\n\n✨ آپ کے ڈیپازٹ کا شکریہ!\nآپ کے فنڈز اب استعمال کے لیے دستیاب ہیں۔\n\n🚀 اپنی اگلی ٹرانزیکشن کے لیے تیار ہیں؟'
    );

    user.pendingDeposits.splice(depositIndex, 1);
    await saveUser(session.usernameKey, user);

    await ctx.editMessageText(
        '✅ ڈیپازٹ کامیابی سے منظور ہو گئی ✅\n\n👤 صافر: ' + user.firstName + '\n💰 رقم: ' + deposit.amount + ' روپے\n🎁 بونس: ' + deposit.bonus + ' روپے\n💵 کل: ' + deposit.totalAmount + ' روپے\n🏦 طریقہ: ' + deposit.method + '\n📝 ٹرانزیکشن آئی ڈی: ' + deposit.proof + '\n\n📊 صارف کا بیلنس اپ ڈیٹ: ' + user.balance + ' روپے'
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
    await ctx.reply('📝 براہ کرم اس ڈیپازٹ درخواست کو مسترد کرنے کی وجہ درج کریں:');
});

// ======= ایڈمن واپسیوں کے لیے منظوری (دو مرحلہ عمل) =======
bot.action(/admin_approve_withdraw_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('👤 صارف نہیں ملا۔');

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) return ctx.answerCbQuery('📤 کوئی زیر التواء واپسیاں نہیں۔');

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) return ctx.answerCbQuery('✅ واپسی پہلے ہی پروسیس ہو چکی ہے۔');

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    withdraw.status = 'processing';
    withdraw.approvedDate = date;
    withdraw.approvedTime = time;

    await saveUser(session.usernameKey, user);

    await bot.telegram.sendMessage(
        userChatId,
        '✅ واپسی درخواست منظور ہو گئی! ✅\n\n🎉 خوشخبری! آپ کی واپسی منظور ہو گئی ہے۔\n\n📋 ٹرانزیکشن کی تفصیلات:\n💰 رقم: ' + withdraw.amount + ' روپے\n📉 پروسیسنگ فیس: ' + withdraw.fee + ' روپے\n💵 خالص رقم: ' + withdraw.netAmount + ' روپے\n🏦 طریقہ: ' + withdraw.method + '\n📱 اکاؤنٹ: ' + withdraw.account + '\n📅 تاریخ: ' + date + '\n⏰ وقت: ' + time + '\n\n🔄 موجودہ حیثیت: فنڈز ٹرانسفر جاری ہے ⏳\n\n💡 اگلا کیا ہوتا ہے:\n1. فنڈز آپ کے اکاؤنٹ میں منتقل کیے جا رہے ہیں\n2. عام طور پر 1-2 گھنٹے لگتے ہیں\n3. مکمل ہونے پر آپ کو ایک اور نوٹیفیکیشن ملے گا\n\n📞 مدد درکار؟ 24/7 سپورٹ سے رابطہ کریں۔'
    );

    await ctx.editMessageText(
        '✅ واپسی منظور ہو گئی اور ٹرانسفر شروع ہو گیا ✅\n\n👤 صارف کی معلومات:\n• نام: ' + user.firstName + '\n• صارف نام: ' + session.usernameKey + '\n• فون: ' + user.phone + '\n\n💵 ٹرانزیکشن کی تفصیلات:\n• رقم: ' + withdraw.amount + ' روپے\n• فیس: ' + withdraw.fee + ' روپے\n• خالص: ' + withdraw.netAmount + ' روپے\n• طریقہ: ' + withdraw.method + '\n• اکاؤنٹ: ' + withdraw.account + '\n\n📅 منظوری کا وقت:\n• تاریخ: ' + date + '\n• وقت: ' + time + '\n\n⚠️ حیثیت: فنڈز ٹرانسفر جاری ہے ⏳\nبراہ کرم تصدیق کریں جب فنڈز منتقل ہو جائیں۔',
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ فنڈز ٹرانسفر مکمل ہو گیا', `fund_transfer_success_${userChatId}_${withdrawId}`)]
        ])
    );
});

// ======= فنڈز ٹرانسفر کامیابی =======
bot.action(/fund_transfer_success_(\d+)_(wd_\d+_\d+)/, async (ctx) => {
    const [_, userChatId, withdrawId] = ctx.match;
    const session = sessions[userChatId];
    if (!session || !session.usernameKey) return ctx.answerCbQuery('👤 صارف نہیں ملا۔');

    const user = users[session.usernameKey];
    if (!user.pendingWithdrawals) return ctx.answerCbQuery('📤 کوئی زیر التواء واپسیاں نہیں۔');

    const withdrawIndex = user.pendingWithdrawals.findIndex(w => w.id === withdrawId);
    if (withdrawIndex === -1) return ctx.answerCbQuery('✅ واپسی پہلے ہی مکمل ہو چکی ہے۔');

    const withdraw = user.pendingWithdrawals[withdrawIndex];
    const { date, time } = getCurrentDateTime();

    withdraw.status = 'completed';
    withdraw.completedDate = date;
    withdraw.completedTime = time;

    if (!user.transactions) user.transactions = [];
    user.transactions.push({
        type: '📤 واپسی ✅ (' + withdraw.method + ')',
        amount: withdraw.amount,
        netAmount: withdraw.netAmount,
        fee: withdraw.fee,
        date: date,
        time: time,
        account: withdraw.account,
        status: 'completed'
    });

    await saveUser(session.usernameKey, user);

    await bot.telegram.sendMessage(
        userChatId,
        '🎉 فنڈز ٹرانسفر کامیاب ہو گیا! 🎉\n\n✅ ٹرانزیکشن کامیابی سے مکمل ہو گئی\n\n📋 ٹرانزیکشن کا خلاصہ:\n💰 رقم: ' + withdraw.amount + ' روپے\n📉 پروسیسنگ فیس: ' + withdraw.fee + ' روپے\n💵 بھیجی گئی خالص رقم: ' + withdraw.netAmount + ' روپے\n🏦 ادائیگی کا طریقہ: ' + withdraw.method + '\n📱 اکاؤنٹ نمبر: ' + withdraw.account + '\n📅 ٹرانسفر کی تاریخ: ' + date + '\n⏰ ٹرانسفر کا وقت: ' + time + '\n\n✅ حیثیت: کامیابی سے منتقل ہو گیا ✅\n\n💡 اگلے اقدامات:\n1. اپنا ' + withdraw.method + ' اکاؤنٹ چیک کریں\n2. فنڈز کی وصولی کی تصدیق کریں\n3. اگر کوئی مسئلہ ہو تو ہم سے رابطہ کریں\n\n✨ ہماری سروس استعمال کرنے کا شکریہ!\nہمیں دوبارہ آپ کی خدمت کرنے کا انتظار رہے گا۔\n\n📞 24/7 سپورٹ دستیاب'
    );

    await ctx.editMessageText(
        '✅ فنڈز ٹرانسفر کامیابی سے مکمل ہو گیا ✅\n\n👤 صارف کی معلومات:\n• نام: ' + user.firstName + '\n• صارف نام: ' + session.usernameKey + '\n• فون: ' + user.phone + '\n\n💵 ٹرانزیکشن کی تفصیلات:\n• رقم: ' + withdraw.amount + ' روپے\n• فیس: ' + withdraw.fee + ' روپے\n• بھیجی گئی خالص رقم: ' + withdraw.netAmount + ' روپے\n• طریقہ: ' + withdraw.method + '\n• اکاؤنٹ: ' + withdraw.account + '\n\n📅 مکمل ہونے کا وقت:\n• تاریخ: ' + date + '\n• وقت: ' + time + '\n\n✅ حیثیت: ٹرانسفر کامیابی سے مکمل ہو گیا'
    );

    user.pendingWithdrawals.splice(withdrawIndex, 1);
    await saveUser(session.usernameKey, user);
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
    await ctx.reply('📝 براہ کرم اس واپسی درخواست کو مسترد کرنے کی وجہ درج کریں:');
});

// ===== لانچ =====
bot.launch().then(() => {
    console.log('🤖 بوٹ کامیابی سے چل رہا ہے...');
    console.log('✨ تمام خصوصیات فعال ہیں');
    console.log('🔒 سیکورٹی پروٹوکولز فعال ہیں');
    console.log('💰 ادائیگی کا نظام تیار ہے');
    console.log('📱 واٹس ایپ بوٹ انٹیگریشن فعال ہے');
    console.log('👑 ایڈمن خصوصیات لوڈ ہو گئی ہیں');
    console.log('📋 پلان مینجمنٹ سسٹم فعال');
    console.log('🎯 4 پلانز دستیاب: بنیادی، معیاری، پریمیم، کاروباری');
    
    // ڈیٹا کو ابتدائی کریں
    setTimeout(() => {
        initializeData();
    }, 1000);
});

// شائستگی سے بند ہونے کو ہینڈل کریں
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    database.disconnect();
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    database.disconnect();
});
