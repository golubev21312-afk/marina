/// <reference path="../pb_data/types.d.ts" />

/**
 * «Забыли пароль?» в админке: письмо со ссылкой на страницу сайта
 * /admin/reset/<код>, где Марина задаёт новый пароль. Ссылка действует 30 минут.
 * Письма уходят, только когда настроена почта (SMTP) — на хостинге:
 * /_/ → Settings → Mail settings. Там же — адрес сайта (Application URL):
 * из него собирается ссылка в письме.
 * Заодно имя приложения: было «Acme» (стояло в именах автокопий базы).
 */
const OLD_TEMPLATE = {
  subject: 'Reset your {APP_NAME} password',
  body:
    '<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class="btn" href="{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}" target="_blank" rel="noopener">Reset password</a>\n</p>\n<p><i>If you didn\'t ask to reset your password, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
};

migrate(
  (app) => {
    const editors = app.findCollectionByNameOrId('editors');
    editors.resetPasswordTemplate = {
      subject: 'Новый пароль для админки «Крафт»',
      body: [
        '<p>Здравствуйте!</p>',
        '<p>Вы попросили сменить пароль от админки сайта мастерской «Крафт». Нажмите кнопку и задайте новый пароль:</p>',
        '<p><a class="btn" href="{APP_URL}/admin/reset/{TOKEN}" target="_blank" rel="noopener">Задать новый пароль</a></p>',
        '<p>Ссылка действует 30 минут и срабатывает один раз.</p>',
        '<p><i>Если вы не просили сменить пароль — просто не обращайте внимания на письмо, старый пароль продолжит работать.</i></p>',
      ].join('\n'),
    };
    app.save(editors);

    const settings = app.settings();
    settings.meta.appName = 'Kraft';
    settings.meta.senderName = 'Мастерская «Крафт»';
    app.save(settings);
  },
  (app) => {
    const editors = app.findCollectionByNameOrId('editors');
    editors.resetPasswordTemplate = OLD_TEMPLATE;
    app.save(editors);

    const settings = app.settings();
    settings.meta.appName = 'Acme';
    settings.meta.senderName = 'Support';
    app.save(settings);
  },
);
