import axios from "axios";

import { Md5 } from "md5-typescript";


async function getBusinessToken() {
    try {
        const app_psw = Md5.init(`${process.env.BUSINESS_SECRET}app_id=${process.env.BUSINESS_APPID}`);
        const options: object = {
          method: 'GET',
          url: `https://${process.env.BUSINESS_ADRESS}.business.ru/api/rest/repair.json?app_id=${process.env.BUSINESS_APPID}&app_psw=${app_psw}`,
        };
        const response = await axios.request(options);
        return response.data.token;
      } catch (e) {
        console.error('Business.ru getToken Error');
      }
}

export async function getDiscountCards(phone_number: number) {
    try {
        const businessToken = await getBusinessToken();
        const app_psw = Md5.init(`${businessToken}${process.env.BUSINESS_SECRET}app_id=${process.env.BUSINESS_APPID}&num=${phone_number}`);
        const options: object = {
          method: 'GET',
          url: `https://${process.env.BUSINESS_ADRESS}.business.ru/api/rest/discountcards.json?app_id=${process.env.BUSINESS_APPID}&num=${phone_number}&app_psw=${app_psw}`,
        };
        const response = await axios.request(options);
        console.log(response.data.result);
        return response.data.result;
      } catch (e) {
        console.log(e);
        console.error('Business.ru getCards Error');
      }
}

/*


dkQnc5idfPVgv0nxhTreyOE19fZqTV1ll9RwGlrLv3HF4M0QjfkmGHofxqOxPLFBapp_id=623937&num=89998009420

*/