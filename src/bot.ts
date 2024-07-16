import 'reflect-metadata';

import { Bot, Context, session, SessionFlavor } from 'grammy';
import { Router } from '@grammyjs/router';

import {
  foundMessage,
  newQuestion,
  notFoundMessage,
  profileMessage,
  returnMessage,
  rightCode,
  supportError,
  supportSend,
  supportState,
  supportSuccess,
  wakeUp,
  welcomeMessage,
  wrongCode,
} from './locale/locale';
import { cancelButton, markdownWithMainButtons, markdownWithoutPreview } from './markdown/markdown';
import { getUser } from './db/getters';
import { getDiscountCards } from './controllers/businessController';
import { sendSMS } from './controllers/verificationController';
import { setUser } from './db/setters';

export function start() {
  if (
    !process.env.BOT_TOKEN ||
    !process.env.BUSINESS_SECRET ||
    !process.env.BUSINESS_APPID ||
    !process.env.BUSINESS_ADRESS ||
    !process.env.SMS_TOKEN ||
    !process.env.SUPPORT_CHATID
  ) {
    console.error('Error! Check your environment variables');
    process.exit();
  }

  console.log('Started...');

  interface SessionData {
    step: 'register' | 'signed' | 'phoneVerification' | 'idle' | 'support';
    verification_code?: number;
    phone_number?: number;
  }

  type MyContext = Context & SessionFlavor<SessionData>;

  const bot = new Bot<MyContext>(process.env.BOT_TOKEN);

  bot.use(session({ initial: (): SessionData => ({ step: 'idle' }) }));

  bot.command('start', async ctx => {
    if (ctx.update.message?.chat.id == Number(process.env.SUPPORT_CHATID)) {
      await bot.api.sendMessage(Number(process.env.SUPPORT_CHATID), 'Михан не трогай');
    } else {
      const userDB = await getUser(ctx.update.message?.from.id || 0);
      if (!userDB) {
        ctx.session.step = 'register';
        await ctx.reply(welcomeMessage, markdownWithoutPreview);
      } else {
        ctx.session.step = 'signed';
        await ctx.reply(returnMessage, markdownWithMainButtons);
      }
    }
  });

  bot.command('rmmenu', async ctx => {
    ctx.session.step = 'idle';
    await ctx.reply(`Меню удалено!`, {
      reply_markup: {
        remove_keyboard: true,
      },
    });
  });

  const router = new Router<MyContext>(ctx => ctx.session.step);

  router.route('idle', async ctx => {
    if (ctx.update.message && ctx.update.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    const userDB = await getUser(ctx.msg?.from?.id || 0);
    if (!userDB) {
      ctx.session.step = 'register';
      await ctx.reply(wakeUp, markdownWithoutPreview);
      setTimeout(() => ctx.reply(welcomeMessage, markdownWithoutPreview), 1000);
      //await ctx.reply(welcomeMessage, markdownWithoutPreview);
    } else {
      ctx.session.step = 'signed';
      await ctx.reply(returnMessage, markdownWithMainButtons);
    }
  });

  router.route('register', async ctx => {
    if (ctx.update.message && ctx.update.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    const card = await getDiscountCards(Number(ctx.update.message?.text) || 0);
    if (!card.length) {
      await ctx.reply(notFoundMessage);
    } else {
      ctx.session.step = 'phoneVerification';
      ctx.session.phone_number = Number(ctx.update.message?.text);
      ctx.session.verification_code = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
      await sendSMS(ctx.session.verification_code, Number(ctx.update.message?.text));
      await ctx.reply(foundMessage);
    }
  });

  router.route('phoneVerification', async ctx => {
    if (ctx.update.message && ctx.update.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    if (Number(ctx.update.message?.text) === ctx.session.verification_code) {
      await setUser(
        ctx.update.message?.from?.id.toString() || '',
        ctx.update.message?.from?.first_name || '',
        ctx.session.phone_number?.toString() || '',
      );
      await ctx.reply(rightCode, markdownWithMainButtons);
      ctx.session.step = 'signed';
    } else {
      await ctx.reply(wrongCode);
    }
  });

  bot.hears(/Написать в шоп 🤫/, async ctx => {
    if (ctx.update.message && ctx.update.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    ctx.session.step = 'support';
    await ctx.reply(supportState, cancelButton);
  });

  bot.hears(/Выйти из чата ❌/, async ctx => {
    if (ctx.update.message && ctx.update.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    ctx.session.step = 'signed';
    await ctx.reply(returnMessage, markdownWithMainButtons);
  });

  router.route('support', async ctx => {
    if (ctx.update.message && ctx.update.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    let message;
    try {
      if (ctx.msg?.photo) {
        const reverse = ctx.msg.photo.reverse();
        message = reverse[0].file_id;
        console.log(message);
        await bot.api.sendPhoto(Number(process.env.SUPPORT_CHATID), `${message}`, {
          caption: `${ctx.msg?.from?.id}, ${ctx.msg?.from?.first_name}${newQuestion}
${ctx.msg?.caption || ''}`,
        });
        await ctx.reply(supportSend);
      } else if (ctx.msg?.text) {
        message = ctx.msg.text;
        await bot.api.sendMessage(
          Number(process.env.SUPPORT_CHATID),
          `${ctx.msg?.from?.id}, ${ctx.msg?.from?.first_name}${newQuestion}

${message}`,
        );
        await ctx.reply(supportSend);
      } else {
        await ctx.reply(`Ты вообще все сломал чел, давай заново, отправь фото или текст`);
      }
    } catch (e) {
      console.log(e);
      await ctx.reply(
        `Ты ВООБЩЕ ВСЕ сломал чел, давай заново, отправь фото или текст`,
        markdownWithMainButtons,
      );
      ctx.session.step = 'signed';
    }
  });

  bot.hears(/Мой Профиль 👽/, async ctx => {
    if (ctx.update.message && ctx.update.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    const user = await getUser(ctx.update.message?.from.id || 0);
    try {
      const profile = await getDiscountCards(Number(user?.phone_number));
      const message = await profileMessage(user?.phone_number || '', profile[0].bonus_sum);
      await ctx.reply(message);
    } catch (e) {
      await ctx.reply('Возникла непредвиденная ошибка');
    }
  });

  bot.use(router);

  bot.on('message', async ctx => {
    if (ctx.update.message.chat.id == Number(process.env.SUPPORT_CHATID)) {
      let message;
      try {
        const split =
          ctx.msg.reply_to_message?.text?.split(',') ||
          ctx.msg.reply_to_message?.caption?.split(',') ||
          '';
        if (ctx.msg.photo) {
          const reverse = ctx.msg.photo.reverse();
          message = reverse[0].file_id;
          await bot.api.sendPhoto(Number(split[0]), `${message}`, {
            caption: `Ответ от шопа!
${ctx.msg?.caption || ''}`,
          });
          await bot.api.sendMessage(
            Number(process.env.SUPPORT_CHATID),
            supportSuccess,
            markdownWithoutPreview,
          );
        } else if (ctx.msg.text) {
          message = ctx.msg.text;
          await bot.api.sendMessage(
            Number(split[0]) || 0,
            `Ответ от шопа!
    
${message}`,
          );
          await bot.api.sendMessage(
            Number(process.env.SUPPORT_CHATID),
            supportSuccess,
            markdownWithoutPreview,
          );
        } else {
          await bot.api.sendMessage(
            Number(process.env.SUPPORT_CHATID),
            `Возникла ошибка свзяанная с типом файла, вы можете отправить текст либо фото.`,
          );
        }
        console.log(message);
      } catch (e) {
        console.log(e);
        await bot.api.sendMessage(Number(process.env.SUPPORT_CHATID), supportError);
      }
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  bot.start();
}
