import { SMSRu } from 'node-sms-ru';

export async function sendSMS(verification_code: number, phone_number: number) {
  const smsRu = new SMSRu(process.env.SMS_TOKEN || '');
  const sendResult = await smsRu.sendSms({
    to: `${phone_number}`,
    msg: `Ваш проверочный код: ${verification_code}`,
  });
  console.log(sendResult);
  return;
}
