export const welcomeMessage = `Привет\\!👋
Для того чтоб мы правильно подтянули твой профиль из нашей бонусной системы \\- введи свой номер телефона в формате "__89999999999__"`;

export const notFoundMessage = `Твоего номера нет в системе, или ты неправильно его ввел 😞
Попробуй еще раз, или обратись к лысому чтоб он завел тебе карту!`;

export const foundMessage = `Есть карта с твоим номером! 😍
Жди смс и отправь мне проверочный код 🐸`;

export const wrongCode = `Ты ввел неправильный код, глаза раскрой 🤮`;

export const rightCode = `Красава\\! 
Теперь ты можешь смотреть количество своих баллов ☺️
~Вперед за бруско 50мг~`

export const returnMessage = `Вернулся\\?
Нажимай кнопки 😎`;

export const newQuestion = `*Новый вопрос!*`;

export const supportState = `Напиши мне что хочешь узнать и я отправлю это пацанам`;

export const supportSend = `Отправил сообщение, ответ придет сюда`;

export const supportError = `Сообщение не отправлено, возможно пользователь заблокировал бота`;

export const supportSuccess = `*Сообщение отправлено\\!* ✅`;

export async function profileMessage(phone_number: string, points: string) {
    const message = `Йоу!
Твой номер телефона: ${phone_number}
Количество баллов: ${points}
Что тебе еще от меня нужно?`;
    return message;
}