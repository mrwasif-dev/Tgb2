const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ===== BOT CONFIGURATION =====
const BOT_TOKEN = process.env.BOT_TOKEN || '8395607834:AAGBFF85MRmNp1XxEcdZnKv3Fn4rq_IuC8k';
const ADMIN_ID = process.env.ADMIN_ID || '6012422087';

const bot = new Telegraf(BOT_TOKEN);

// ===== DATABASE =====
const DATA_FILE = './support_tickets.json';
let tickets = {};

if (fs.existsSync(DATA_FILE)) {
    try {
        tickets = JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (error) {
        console.log('Error loading tickets:', error.message);
        tickets = {};
    }
}

function saveTickets() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2));
}

// ===== SESSIONS =====
const sessions = {};
const activeChats = {};

// ===== UTILITY FUNCTIONS =====
function getCurrentDateTime() {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const pakistanTime = new Date(utc + 5 * 60 * 60 * 1000);
    const date = `${String(pakistanTime.getDate()).padStart(2,'0')}-${String(pakistanTime.getMonth()+1).padStart(2,'0')}-${pakistanTime.getFullYear()}`;
    const time = `${String(pakistanTime.getHours()).padStart(2,'0')}:${String(pakistanTime.getMinutes()).padStart(2,'0')}:${String(pakistanTime.getSeconds()).padStart(2,'0')}`;
    return { date, time };
}

function generateTicketId() {
    return 'TICKET_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// ===== START COMMAND =====
bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    
    if (chatId.toString() === ADMIN_ID.toString()) {
        return ctx.reply('👑 *Support Chat Admin Panel* 👑\n\nSelect an option:', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 Pending Requests', 'adminPendingRequests')],
                [Markup.button.callback('💬 Active Chats', 'adminActiveChats')],
                [Markup.button.callback('📊 All Tickets', 'adminAllTickets')],
                [Markup.button.callback('📈 Stats', 'adminStats')]
            ])
        });
    }

    await ctx.reply('👋 *Welcome to Paid WhatsApp Bot Support Chat!*\n\nHow can I help you today?', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Account Issues', 'issue_account')],
            [Markup.button.callback('✅ Deposit/Withdrawal Problems', 'issue_deposit')],
            [Markup.button.callback('✅ Bot Setup Assistance', 'issue_setup')],
            [Markup.button.callback('✅ Technical Support', 'issue_technical')],
            [Markup.button.callback('✅ General Inquiries', 'issue_general')],
            [Markup.button.callback('📞 Other Issues', 'issue_other')]
        ])
    });
});

// ===== ISSUE SELECTION =====
bot.action('issue_account', async (ctx) => { await createSupportRequest(ctx, 'Account Issues'); });
bot.action('issue_deposit', async (ctx) => { await createSupportRequest(ctx, 'Deposit/Withdrawal Problems'); });
bot.action('issue_setup', async (ctx) => { await createSupportRequest(ctx, 'Bot Setup Assistance'); });
bot.action('issue_technical', async (ctx) => { await createSupportRequest(ctx, 'Technical Support'); });
bot.action('issue_general', async (ctx) => { await createSupportRequest(ctx, 'General Inquiries'); });
bot.action('issue_other', async (ctx) => { await createSupportRequest(ctx, 'Other Issues'); });

// ===== CREATE SUPPORT REQUEST =====
async function createSupportRequest(ctx, issueType) {
    const userId = ctx.chat.id;
    const username = ctx.from.username || ctx.from.first_name;
    const { date, time } = getCurrentDateTime();
    const ticketId = generateTicketId();
    
    tickets[ticketId] = {
        id: ticketId,
        userId: userId,
        username: username,
        issueType: issueType,
        status: 'pending',
        createdAt: `${date} ${time}`,
        messages: [],
        adminAction: null,
        adminActionTime: null
    };
    
    saveTickets();
    
    await ctx.reply(`✅ *Support Request Sent!*\n\n📋 *Ticket Details:*\n• Ticket ID: ${ticketId}\n• Issue Type: ${issueType}\n• Status: ⏳ Pending Admin Approval\n\n📞 You will be notified when admin responds.`, { parse_mode: 'Markdown' });
    
    await bot.telegram.sendMessage(ADMIN_ID, `🆕 *NEW SUPPORT REQUEST* 🆕\n\n🎫 *Ticket ID:* ${ticketId}\n👤 *User:* ${username} (ID: ${userId})\n📌 *Issue Type:* ${issueType}\n📅 *Created:* ${date} at ${time}\n\n⚠️ *Action Required:*`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve & Start Chat', `admin_approve_${ticketId}`)],
            [Markup.button.callback('❌ Reject Request', `admin_reject_${ticketId}`)]
        ])
    });
}

// ===== ADMIN APPROVE TICKET =====
bot.action(/admin_approve_(TICKET_\d+_\d+)/, async (ctx) => {
    const ticketId = ctx.match[1];
    const ticket = tickets[ticketId];
    if (!ticket) return ctx.answerCbQuery('Ticket not found!', { show_alert: true });
    
    const { date, time } = getCurrentDateTime();
    ticket.status = 'approved';
    ticket.adminAction = 'approved';
    ticket.adminActionTime = `${date} ${time}`;
    ticket.adminId = ctx.chat.id;
    
    activeChats[ticketId] = { userId: ticket.userId, adminId: ctx.chat.id, startedAt: `${date} ${time}` };
    saveTickets();
    
    await bot.telegram.sendMessage(ticket.userId, `🎉 *Support Request Approved!*\n\n✅ Your support request has been approved.\n🎫 Ticket ID: ${ticketId}\n📌 Issue: ${ticket.issueType}\n👑 Admin is now available to chat.\n\n💬 *You can start chatting now!*\nType your message and I'll forward it to admin.`, { parse_mode: 'Markdown' });
    
    await ctx.editMessageText(`✅ *Chat Session Started* ✅\n\n🎫 Ticket ID: ${ticketId}\n👤 User: ${ticket.username}\n📌 Issue: ${ticket.issueType}\n🕐 Started: ${date} at ${time}\n\n💬 *You are now connected with the user.*\nType your messages below.\n\n⚠️ *Important:* User messages will appear here.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🚪 End Chat Session', `admin_end_chat_${ticketId}`)],
            [Markup.button.callback('📋 View Ticket Info', `admin_view_ticket_${ticketId}`)]
        ])
    });
    
    await ctx.reply(`💬 *Chat Session Active*\n\nYou are now chatting with ${ticket.username}\nTicket: ${ticketId}\nIssue: ${ticket.issueType}\n\n✍️ Type your messages here.\n📤 I'll forward them to the user.`, { parse_mode: 'Markdown' });
});

// ===== ADMIN REJECT TICKET =====
bot.action(/admin_reject_(TICKET_\d+_\d+)/, async (ctx) => {
    const ticketId = ctx.match[1];
    const ticket = tickets[ticketId];
    if (!ticket) return ctx.answerCbQuery('Ticket not found!', { show_alert: true });
    
    sessions[ctx.chat.id] = { flow: 'admin_reject_reason', ticketId: ticketId };
    await ctx.answerCbQuery();
    await ctx.reply(`❌ *Reject Support Request*\n\nTicket ID: ${ticketId}\nUser: ${ticket.username}\nIssue: ${ticket.issueType}\n\n📝 Please enter the reason for rejection:`, { parse_mode: 'Markdown' });
});

// ===== ADMIN END CHAT =====
bot.action(/admin_end_chat_(TICKET_\d+_\d+)/, async (ctx) => {
    const ticketId = ctx.match[1];
    const ticket = tickets[ticketId];
    if (!ticket) return ctx.answerCbQuery('Ticket not found!', { show_alert: true });
    
    const { date, time } = getCurrentDateTime();
    ticket.status = 'closed';
    ticket.closedAt = `${date} ${time}`;
    ticket.closedBy = 'admin';
    delete activeChats[ticketId];
    saveTickets();
    
    await bot.telegram.sendMessage(ticket.userId, `📞 *Chat Session Ended*\n\n🚪 Admin has ended the chat session.\n🎫 Ticket ID: ${ticketId}\n🕐 Closed: ${date} at ${time}\n\n🙏 Thank you for using our support service!\nIf you need further assistance, please create a new support request.`, { parse_mode: 'Markdown' });
    
    await ctx.editMessageText(`🚪 *Chat Session Ended* 🚪\n\n✅ Successfully closed chat session.\n🎫 Ticket ID: ${ticketId}\n👤 User: ${ticket.username}\n🕐 Closed: ${date} at ${time}\n\n📊 Total messages exchanged: ${ticket.messages ? ticket.messages.length : 0}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('📋 View All Tickets', 'adminAllTickets')],
            [Markup.button.callback('🔄 New Requests', 'adminPendingRequests')]
        ])
    });
    
    await ctx.reply(`✅ Chat session with ${ticket.username} has been closed.`, { parse_mode: 'Markdown' });
});

// ===== ADMIN PANEL BUTTONS =====
bot.action('adminPendingRequests', async (ctx) => {
    const pendingTickets = Object.values(tickets).filter(t => t.status === 'pending');
    if (pendingTickets.length === 0) return ctx.reply('📭 *No Pending Requests*\n\nThere are no pending support requests.', { parse_mode: 'Markdown' });
    
    let message = `📋 *Pending Support Requests (${pendingTickets.length})* 📋\n\n`;
    pendingTickets.forEach((ticket, index) => {
        message += `${index + 1}. ${ticket.issueType}\n   👤 ${ticket.username}\n   🎫 ${ticket.id}\n   📅 ${ticket.createdAt}\n\n`;
    });
    
    const buttons = pendingTickets.slice(0, 5).map(ticket => [
        Markup.button.callback(`👤 ${ticket.username} - ${ticket.issueType}`, `admin_view_pending_${ticket.id}`)
    ]);
    buttons.push([Markup.button.callback('🔙 Back to Admin Panel', 'backToAdminMenu')]);
    
    await ctx.reply(message, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.action(/admin_view_pending_(TICKET_\d+_\d+)/, async (ctx) => {
    const ticketId = ctx.match[1];
    const ticket = tickets[ticketId];
    if (!ticket) return ctx.answerCbQuery('Ticket not found!', { show_alert: true });
    
    await ctx.reply(`📋 *Pending Request Details*\n\n🎫 Ticket ID: ${ticket.id}\n👤 User: ${ticket.username} (ID: ${ticket.userId})\n📌 Issue: ${ticket.issueType}\n📅 Created: ${ticket.createdAt}\n\n⚠️ *Take Action:*`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve & Start Chat', `admin_approve_${ticketId}`)],
            [Markup.button.callback('❌ Reject Request', `admin_reject_${ticketId}`)],
            [Markup.button.callback('🔙 Back to Pending', 'adminPendingRequests')]
        ])
    });
});

bot.action('adminActiveChats', async (ctx) => {
    const activeTickets = Object.values(tickets).filter(t => t.status === 'approved');
    if (activeTickets.length === 0) return ctx.reply('💬 *No Active Chats*\n\nThere are no active chat sessions.', { parse_mode: 'Markdown' });
    
    let message = `💬 *Active Chat Sessions (${activeTickets.length})* 💬\n\n`;
    activeTickets.forEach((ticket, index) => {
        const chatSession = activeChats[ticket.id];
        message += `${index + 1}. ${ticket.username}\n   🎫 ${ticket.id}\n   📌 ${ticket.issueType}\n`;
        if (chatSession) message += `   🕐 Started: ${chatSession.startedAt}\n`;
        message += `\n`;
    });
    
    const buttons = activeTickets.slice(0, 5).map(ticket => [
        Markup.button.callback(`💬 Chat with ${ticket.username}`, `admin_join_chat_${ticket.id}`)
    ]);
    buttons.push([Markup.button.callback('🔙 Back to Admin Panel', 'backToAdminMenu')]);
    
    await ctx.reply(message, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.action(/admin_join_chat_(TICKET_\d+_\d+)/, async (ctx) => {
    const ticketId = ctx.match[1];
    const ticket = tickets[ticketId];
    if (!ticket) return ctx.answerCbQuery('Ticket not found!', { show_alert: true });
    
    await ctx.editMessageText(`💬 *Chat Session Active*\n\nYou are chatting with ${ticket.username}\nTicket: ${ticketId}\nIssue: ${ticket.issueType}\n\n✍️ Type your messages here.\n📤 I'll forward them to the user.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🚪 End Chat Session', `admin_end_chat_${ticketId}`)],
            [Markup.button.callback('📋 View Ticket Info', `admin_view_ticket_${ticketId}`)]
        ])
    });
});

bot.action('adminAllTickets', async (ctx) => {
    const allTickets = Object.values(tickets);
    if (allTickets.length === 0) return ctx.reply('📭 *No Tickets*\n\nThere are no support tickets yet.', { parse_mode: 'Markdown' });
    
    const pending = allTickets.filter(t => t.status === 'pending').length;
    const approved = allTickets.filter(t => t.status === 'approved').length;
    const closed = allTickets.filter(t => t.status === 'closed').length;
    
    await ctx.reply(`📊 *All Support Tickets* 📊\n\n📈 *Statistics:*\n⏳ Pending: ${pending}\n💬 Active: ${approved}\n✅ Closed: ${closed}\n📊 Total: ${allTickets.length}\n\nSelect view option:`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('⏳ View Pending', 'adminPendingRequests')],
            [Markup.button.callback('💬 View Active', 'adminActiveChats')],
            [Markup.button.callback('✅ View Closed', 'adminClosedTickets')],
            [Markup.button.callback('🔙 Back to Admin Panel', 'backToAdminMenu')]
        ])
    });
});

bot.action('adminStats', async (ctx) => {
    const allTickets = Object.values(tickets);
    const today = new Date().toDateString();
    const todayTickets = allTickets.filter(t => {
        const ticketDate = new Date(t.createdAt.split(' ')[0].split('-').reverse().join('-')).toDateString();
        return ticketDate === today;
    }).length;
    
    await ctx.reply(`📈 *Support System Statistics* 📈\n\n📊 *Overall:*\n• Total Tickets: ${allTickets.length}\n• Active Chats: ${Object.keys(activeChats).length}\n• Today's Tickets: ${todayTickets}\n\n📅 *Status Breakdown:*\n⏳ Pending: ${allTickets.filter(t => t.status === 'pending').length}\n💬 Active: ${allTickets.filter(t => t.status === 'approved').length}\n✅ Closed: ${allTickets.filter(t => t.status === 'closed').length}\n\n👤 *Top Issues:*\n${getTopIssues(allTickets)}`, { parse_mode: 'Markdown' });
});

function getTopIssues(tickets) {
    const issueCount = {};
    tickets.forEach(ticket => { issueCount[ticket.issueType] = (issueCount[ticket.issueType] || 0) + 1; });
    const sortedIssues = Object.entries(issueCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return sortedIssues.map(([issue, count], index) => `${index + 1}. ${issue}: ${count}`).join('\n');
}

// ===== TEXT MESSAGE HANDLING =====
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    const { date, time } = getCurrentDateTime();
    
    if (sessions[chatId] && sessions[chatId].flow === 'admin_reject_reason') {
        const { ticketId } = sessions[chatId];
        const ticket = tickets[ticketId];
        if (!ticket) { await ctx.reply('Ticket not found!'); delete sessions[chatId]; return; }
        
        ticket.status = 'rejected';
        ticket.adminAction = 'rejected';
        ticket.adminActionTime = `${date} ${time}`;
        ticket.rejectionReason = text;
        saveTickets();
        
        await bot.telegram.sendMessage(ticket.userId, `❌ *Support Request Rejected*\n\n⚠️ Your support request has been rejected.\n🎫 Ticket ID: ${ticketId}\n📌 Issue: ${ticket.issueType}\n\n📝 *Rejection Reason:*\n${text}\n\n🙏 Thank you for contacting support.\nYou can create a new request if needed.`, { parse_mode: 'Markdown' });
        
        await ctx.reply(`✅ *Request Rejected*\n\nSuccessfully rejected support request.\nTicket: ${ticketId}\nUser: ${ticket.username}\nReason sent to user.`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('📋 View All Tickets', 'adminAllTickets')]])
        });
        
        delete sessions[chatId];
        return;
    }
    
    if (chatId.toString() === ADMIN_ID.toString()) {
        const activeTicketId = Object.keys(activeChats).find(ticketId => activeChats[ticketId].adminId === chatId);
        if (activeTicketId) {
            const ticket = tickets[activeTicketId];
            if (ticket && ticket.status === 'approved') {
                if (!ticket.messages) ticket.messages = [];
                ticket.messages.push({ from: 'admin', text: text, time: `${date} ${time}` });
                saveTickets();
                await bot.telegram.sendMessage(ticket.userId, `👑 *Admin:* ${text}\n\n💬 *You can reply to this message.*`, { parse_mode: 'Markdown' });
                await ctx.reply(`✅ Message sent to ${ticket.username}`);
                return;
            }
        }
    } else {
        const activeTicketId = Object.keys(activeChats).find(ticketId => activeChats[ticketId].userId === chatId);
        if (activeTicketId) {
            const ticket = tickets[activeTicketId];
            if (ticket && ticket.status === 'approved') {
                if (!ticket.messages) ticket.messages = [];
                ticket.messages.push({ from: 'user', text: text, time: `${date} ${time}` });
                saveTickets();
                await bot.telegram.sendMessage(ADMIN_ID, `👤 *${ticket.username}:* ${text}\n\n🎫 Ticket: ${activeTicketId}\n💬 *Type your reply below.*`, { parse_mode: 'Markdown' });
                await ctx.reply(`✅ Message sent to admin`);
                return;
            }
        }
    }
    
    if (chatId.toString() !== ADMIN_ID.toString()) {
        await ctx.reply(`📞 *Please select a support option first*\n\nUse /start to see available support options.`, { parse_mode: 'Markdown' });
    }
});

// ===== BACK TO ADMIN MENU =====
bot.action('backToAdminMenu', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID.toString()) return ctx.answerCbQuery('Admin access only!', { show_alert: true });
    
    await ctx.editMessageText('👑 *Support Chat Admin Panel* 👑\n\nSelect an option:', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('📋 Pending Requests', 'adminPendingRequests')],
            [Markup.button.callback('💬 Active Chats', 'adminActiveChats')],
            [Markup.button.callback('📊 All Tickets', 'adminAllTickets')],
            [Markup.button.callback('📈 Stats', 'adminStats')]
        ])
    });
});

// ===== LAUNCH BOT =====
bot.launch().then(() => {
    console.log('✅ TG-Help Support Bot Started Successfully');
    console.log('🤖 Bot is ready to receive commands');
    console.log('👑 Admin ID configured:', ADMIN_ID);
});

// Keep bot running
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
