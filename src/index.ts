import { Bot } from "grammy";
import { welcomeMessage } from "./locale/locale";
import { markdownWithoutPreview } from "./markdown/markdown";

if (!process.env.BOT_TOKEN) {
    console.error('Bot token is not defined');
    process.exit();
}

const bot = new Bot(process.env.BOT_TOKEN);

bot.command("start", (ctx) => ctx.reply(welcomeMessage, markdownWithoutPreview));

bot.start();