export const markdownWithoutPreview: object = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

export const markdownWithMainButtons: object = {
  reply_markup: {
    keyboard: [['Мой Профиль 👽', 'Написать в шоп 🤫']],
    resize_keyboard: true,
  },
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

export const cancelButton: object = {
  reply_markup: {
    keyboard: [['Выйти из чата ❌']],
    resize_keyboard: true,
  },
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

export const clearButtons: object = {
  reply_markup: {
    ketboard: {},
  },
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};
