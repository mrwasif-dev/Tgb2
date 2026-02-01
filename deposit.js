const { Markup } = require('telegraf');

module.exports = function depositFlow(bot, users, sessions, saveUsers, ADMIN_ID, getCurrentDateTime, genId) {

    // ===== DEPOSIT BUTTON =====
    bot.action('depositBalance', ctx => {
        const s = sessions[ctx.chat.id];
        if (!s || !s.usernameKey) return ctx.reply('Login first.');

        s.flow = 'deposit';
        s.step = 'method';

        ctx.reply(
            'Select Deposit Method:',
            Markup.inlineKeyboard([
                [Markup.button.callback('JazzCash', 'd_JazzCash')],
                [Markup.button.callback('EasyPaisa', 'd_EasyPaisa')],
                [Markup.button.callback('U-Paisa', 'd_UPaisa')]
            ])
        );
    });

    // ===== DEPOSIT METHOD =====
    bot.action(/d_(JazzCash|EasyPaisa|UPaisa)/, ctx => {
        const s = sessions[ctx.chat.id];
        s.depositMethod = ctx.match[1];
        s.step = 'amount';

        ctx.reply(`Enter deposit amount for ${s.depositMethod}:`);
    });

    // ===== TEXT HANDLER FOR DEPOSIT =====
    bot.on('text', async ctx => {
        const s = sessions[ctx.chat.id];
        if (!s || s.flow !== 'deposit') return;

        // amount
        if (s.step === 'amount') {
            const amt = parseInt(ctx.message.text);
            if (isNaN(amt) || amt < 500) {
                return ctx.reply('Minimum deposit is 500 PKR.');
            }

            s.depositAmount = amt;
            s.step = 'proof';

            return ctx.reply('Send transaction ID / payment proof text:');
        }

        // proof
        if (s.step === 'proof') {
            const depId = genId('dp');
            const { date, time } = getCurrentDateTime();

            await bot.telegram.sendMessage(
                ADMIN_ID,
`💰 Deposit Request
User: ${s.usernameKey}
Amount: ${s.depositAmount}
Method: ${s.depositMethod}
Proof: ${ctx.message.text}
${date} ${time}`,
                Markup.inlineKeyboard([
                    Markup.button.callback('✅ Approve', `ad_${ctx.chat.id}_${depId}`),
                    Markup.button.callback('❌ Reject', `rd_${ctx.chat.id}_${depId}`)
                ])
            );

            s.flow = null;
            ctx.reply('⏳ Deposit request sent for approval.');
        }
    });

    // ===== ADMIN APPROVE =====
    bot.action(/ad_(\d+)_(dp_\d+_\d+)/, async ctx => {
        const uid = ctx.match[1];
        const s = sessions[uid];
        const u = users[s.usernameKey];
        const { date, time } = getCurrentDateTime();

        u.balance += s.depositAmount;
        u.transactions.push({
            type: 'Deposit ➕',
            amount: s.depositAmount,
            method: s.depositMethod,
            date, time
        });

        saveUsers();

        await bot.telegram.sendMessage(uid, `✅ Deposit ${s.depositAmount} PKR approved.`);
        ctx.editMessageText('✅ Deposit Approved');
    });

    // ===== ADMIN REJECT =====
    bot.action(/rd_(\d+)_(dp_\d+_\d+)/, async ctx => {
        await bot.telegram.sendMessage(ctx.match[1], '❌ Deposit rejected.');
        ctx.editMessageText('❌ Deposit Rejected');
    });
};
