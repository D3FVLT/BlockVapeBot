import "reflect-metadata";

import { Bot, Context, session, SessionFlavor } from "grammy";
import { Router } from "@grammyjs/router";

import { foundMessage, newQuestion, notFoundMessage, profileMessage, returnMessage, rightCode, supportSend, supportState, welcomeMessage, wrongCode } from "./locale/locale";
import { cancelButton, markdownWithMainButtons, markdownWithoutPreview } from "./markdown/markdown";
import { getUser } from "./db/getters";
import { getDiscountCards } from "./controllers/businessController";
import { sendSMS } from "./controllers/verificationcontroller";
import { setUser } from "./db/setters";

export function start() {

if (!process.env.BOT_TOKEN || 
    !process.env.BUSINESS_SECRET || 
    !process.env.BUSINESS_APPID || 
    !process.env.BUSINESS_ADRESS ||
    !process.env.SMS_TOKEN ||
    !process.env.SUPPORT_CHATID) {
    console.error('Error! Check your environment variables');
    process.exit();
}

console.log('Started...');

interface SessionData {
    step: "register" | "signed" | "phoneVerification" | "idle" | "support";
    verification_code?: number;
    phone_number?:number; 
  }

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(process.env.BOT_TOKEN);

bot.use(session({ initial: (): SessionData => ({ step: "idle" }) }));


bot.command("start", async (ctx) => {
    const userDB = await getUser(ctx.update.message?.from.id || 0);
    if (!userDB) {
    ctx.session.step = "register";
    await ctx.reply(welcomeMessage, markdownWithoutPreview);
    } else {
        ctx.session.step = "signed";
        ctx.reply(returnMessage, markdownWithMainButtons);
    }
});

const router = new Router<MyContext>((ctx) => ctx.session.step);

router.route("register", async (ctx) => {
    const card = await getDiscountCards(Number(ctx.update.message?.text) || 0);
    if (!card.length) {
        await ctx.reply(notFoundMessage);
    } else {
        ctx.session.step = "phoneVerification";
        ctx.session.phone_number = Number(ctx.update.message?.text);
        ctx.session.verification_code = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
        await sendSMS(ctx.session.verification_code, Number(ctx.update.message?.text));
        await ctx.reply(foundMessage);
    }
});

router.route("phoneVerification", async (ctx) => {
    if (Number(ctx.update.message?.text) === ctx.session.verification_code) {
        await setUser(ctx.update.message?.from?.id.toString() || '', ctx.update.message?.from?.first_name || '', ctx.session.phone_number?.toString() || '' )
        await ctx.reply(rightCode, markdownWithMainButtons);
        ctx.session.step = "signed";
    } else {
        await ctx.reply(wrongCode);
    }
});

bot.hears(/Написать в шоп 🤫/, async (ctx) => {
    ctx.session.step = "support";
    ctx.reply(supportState, cancelButton);
});

router.route("support", async (ctx) => {
    console.log(ctx);
    ctx.session.step = "signed";
    await bot.api.sendMessage(Number(process.env.SUPPORT_CHATID), newQuestion)
    await bot.api.forwardMessage(Number(process.env.SUPPORT_CHATID), ctx.update.message?.chat.id || 0, ctx.update.message?.message_id || 0);
    await ctx.reply(supportSend, markdownWithMainButtons);
});

bot.hears(/Мой Профиль 👽/, async (ctx) => {
    const user = await getUser(ctx.update.message?.from.id || 0);
    const profile = await getDiscountCards(Number(user?.phone_number));
    const message = await profileMessage(user?.phone_number || '', profile[0].bonus_sum)
    await ctx.reply(message);
});

bot.use(router);

bot.on('message', async (ctx) => {
    if (ctx.update.message.chat.id == Number(process.env.SUPPORT_CHATID)) {
    try {
    await bot.api.sendMessage(ctx.update.message.reply_to_message?.forward_from?.id || 0, `*Ответ от шопа*

    ${ctx.update.message.text}`, markdownWithoutPreview);
    await bot.api.sendMessage(Number(process.env.SUPPORT_CHATID), `*Сообщение отправлено\\!* ✅`, markdownWithoutPreview);
     } catch (e) {
    await bot.api.sendMessage(Number(process.env.SUPPORT_CHATID), `Сообщение не отправлено, возможно пользователь заблокировал бота`);
     }
}
})

bot.start();
}