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

  // Логирование всех обновлений
  bot.use(async (ctx, next) => {
    console.log('Received update:', JSON.stringify(ctx.update, null, 2));
    try {
      console.log('Received message:', ctx.message);

      // Проверка ID чата
      if (ctx.update.message?.chat.id == Number(process.env.SUPPORT_CHATID)) {
        console.log('Message is in the support chat.');

        let message;
        const replyMessage = ctx.message?.reply_to_message;

        if (replyMessage) {
          const split = replyMessage.text?.split(',') || replyMessage.caption?.split(',') || '';
          console.log('Reply message split:', split);

          // Обработка фото
          if (ctx.message.photo) {
            const reverse = ctx.message.photo.reverse();
            message = reverse[0].file_id;
            await bot.api.sendPhoto(Number(split[0]), `${message}`, {
              caption: `Ответ от шопа!\n${ctx.message.caption || ''}`,
            });
            await bot.api.sendMessage(
              Number(process.env.SUPPORT_CHATID),
              supportSuccess,
              markdownWithoutPreview,
            );
          }
          // Обработка текста
          else if (ctx.message.text) {
            message = ctx.message.text;
            await bot.api.sendMessage(Number(split[0]) || 0, `Ответ от шопа!\n\n${message}`);
            await bot.api.sendMessage(
              Number(process.env.SUPPORT_CHATID),
              supportSuccess,
              markdownWithoutPreview,
            );
          }
          // Обработка других типов сообщений
          else {
            await bot.api.sendMessage(
              Number(process.env.SUPPORT_CHATID),
              'Возникла ошибка свзяанная с типом файла, вы можете отправить текст либо фото.',
            );
          }

          console.log('Processed message:', message);
        } else {
          console.log('The message is not a reply.');
        }
      }
    } catch (e) {
      console.error('Error handling message:', e);
      await bot.api.sendMessage(Number(process.env.SUPPORT_CHATID), supportError);
    }
    await next();
  });

  bot.command('start', async ctx => {
    if (ctx.message?.chat.id == Number(process.env.SUPPORT_CHATID)) {
      await bot.api.sendMessage(Number(process.env.SUPPORT_CHATID), 'Михан не трогай');
    } else {
      const userDB = await getUser(ctx.message?.from?.id || 0);
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
    if (ctx.message && ctx.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    const userDB = await getUser(ctx.message?.from?.id || 0);
    if (!userDB) {
      ctx.session.step = 'register';
      await ctx.reply(wakeUp, markdownWithoutPreview);
      setTimeout(() => ctx.reply(welcomeMessage, markdownWithoutPreview), 1000);
    } else {
      ctx.session.step = 'signed';
      await ctx.reply(returnMessage, markdownWithMainButtons);
    }
  });

  router.route('register', async ctx => {
    if (ctx.message && ctx.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    const card = await getDiscountCards(Number(ctx.message?.text) || 0);
    if (!card.length) {
      await ctx.reply(notFoundMessage);
    } else {
      ctx.session.step = 'phoneVerification';
      ctx.session.phone_number = Number(ctx.message?.text);
      ctx.session.verification_code = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
      await sendSMS(ctx.session.verification_code, Number(ctx.message?.text));
      await ctx.reply(foundMessage);
    }
  });

  router.route('phoneVerification', async ctx => {
    if (ctx.message && ctx.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    if (Number(ctx.message?.text) === ctx.session.verification_code) {
      await setUser(
        ctx.message?.from?.id.toString() || '',
        ctx.message?.from?.first_name || '',
        ctx.session.phone_number?.toString() || '',
      );
      await ctx.reply(rightCode, markdownWithMainButtons);
      ctx.session.step = 'signed';
    } else {
      await ctx.reply(wrongCode);
    }
  });

  bot.hears(/Написать в шоп 🤫/, async ctx => {
    if (ctx.message && ctx.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    ctx.session.step = 'support';
    await ctx.reply(supportState, cancelButton);
  });

  bot.hears(/Выйти из чата ❌/, async ctx => {
    if (ctx.message && ctx.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    ctx.session.step = 'signed';
    await ctx.reply(returnMessage, markdownWithMainButtons);
  });

  router.route('support', async ctx => {
    if (ctx.message && ctx.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    let message;
    try {
      if (ctx.message?.photo) {
        const reverse = ctx.message.photo.reverse();
        message = reverse[0].file_id;
        console.log(message);
        await bot.api.sendPhoto(Number(process.env.SUPPORT_CHATID), `${message}`, {
          caption: `${ctx.message?.from?.id}, ${ctx.message?.from?.first_name}${newQuestion}
${ctx.message?.caption || ''}`,
        });
        await ctx.reply(supportSend);
      } else if (ctx.message?.text) {
        message = ctx.message.text;
        await bot.api.sendMessage(
          Number(process.env.SUPPORT_CHATID),
          `${ctx.message?.from?.id}, ${ctx.message?.from?.first_name}${newQuestion}

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
    if (ctx.message && ctx.message.chat.id === Number(process.env.SUPPORT_CHATID)) {
      return;
    }
    const user = await getUser(ctx.message?.from.id || 0);
    try {
      const profile = await getDiscountCards(Number(user?.phone_number));
      const message = await profileMessage(user?.phone_number || '', profile[0].bonus_sum);
      await ctx.reply(message);
    } catch (e) {
      await ctx.reply('Возникла непредвиденная ошибка');
    }
  });

  bot.use(router);

  // Обработка сообщений
  bot.on('message', async ctx => {
    try {
      console.log('Received message:', ctx.message);

      // Проверка ID чата
      if (ctx.update.message.chat.id == Number(process.env.SUPPORT_CHATID)) {
        console.log('Message is in the support chat.');

        let message;
        const replyMessage = ctx.message.reply_to_message;

        if (replyMessage) {
          const split = replyMessage.text?.split(',') || replyMessage.caption?.split(',') || '';
          console.log('Reply message split:', split);

          // Обработка фото
          if (ctx.message.photo) {
            const reverse = ctx.message.photo.reverse();
            message = reverse[0].file_id;
            await bot.api.sendPhoto(Number(split[0]), `${message}`, {
              caption: `Ответ от шопа!\n${ctx.message.caption || ''}`,
            });
            await bot.api.sendMessage(
              Number(process.env.SUPPORT_CHATID),
              supportSuccess,
              markdownWithoutPreview,
            );
          }
          // Обработка текста
          else if (ctx.message.text) {
            message = ctx.message.text;
            await bot.api.sendMessage(Number(split[0]) || 0, `Ответ от шопа!\n\n${message}`);
            await bot.api.sendMessage(
              Number(process.env.SUPPORT_CHATID),
              supportSuccess,
              markdownWithoutPreview,
            );
          }
          // Обработка других типов сообщений
          else {
            await bot.api.sendMessage(
              Number(process.env.SUPPORT_CHATID),
              'Возникла ошибка свзяанная с типом файла, вы можете отправить текст либо фото.',
            );
          }

          console.log('Processed message:', message);
        } else {
          console.log('The message is not a reply.');
        }
      }
    } catch (e) {
      console.error('Error handling message:', e);
      await bot.api.sendMessage(Number(process.env.SUPPORT_CHATID), supportError);
    }
  });

  // Запуск бота
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  bot.start();
}
