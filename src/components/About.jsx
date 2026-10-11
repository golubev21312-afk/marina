import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import VkConfirm from './VkConfirm';
import './About.css';

const VK_COMMUNITY = 'https://vk.ru/craftthandmade';

const PHOTOS = [
  { src: '/img/about-nabor.jpg', alt: 'Детский набор из натурального дерева в подарочной коробке' },
  { src: '/img/about-romashki.jpg', alt: 'Неваляшка в славянском наряде с ромашками' },
  { src: '/img/about-angely.jpg', alt: 'Расписные ангелы под новогодней ёлкой' },
];

/** Текст заказчика о мастерской — дословно, как прислали. */
export default function About() {
  const [confirming, setConfirming] = useState(false);
  const close = useCallback(() => setConfirming(false), []);

  // Переход в ВК — через предупреждение, как у кнопок заказа;
  // Ctrl/Cmd-клик и средняя кнопка открывают сразу, как обычная ссылка
  const openConfirm = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setConfirming(true);
  };

  return (
    <section className="about" id="about">
      <div className="wrap about__inner">
        <div className="about__text">
          <h2>
            О мастерской <em>«Крафт»</em>
          </h2>
          <p>
            «Крафт» — это мастерская подарков ручной работы, где каждая вещь создаётся
            с душой и вниманием к деталям. Мы работаем только с натуральными материалами,
            чтобы каждый подарок был не только красивым, но и тёплым, живым, настоящим.
          </p>
          <p>
            Каждое изделие мы расписываем вручную — без шаблонов и конвейера. Узор, цвет,
            надпись — всё создаётся под конкретного человека и конкретный повод. Вы можете
            выбрать готовую работу или заказать индивидуальный дизайн: мы обсудим идею,
            предложим решение и воплотим её в жизнь.
          </p>
          <p>
            Подарки от «Крафт» — это вещи, которые не завянут и не забудутся. Они хранят
            тепло рук мастера и остаются с вашими близкими надолго.
          </p>
        </div>

        <ul className="about__facts">
          <li>
            <span>Сообщество ВКонтакте</span>
            <a href={VK_COMMUNITY} target="_blank" rel="noreferrer" onClick={openConfirm}>
              vk.ru/craftthandmade
            </a>
          </li>
          <li>
            <span>Адрес мастерской</span>
            <b>ул. Черных, д. 15</b>
            <small>Нижний Тагил</small>
          </li>
          <li className="about__privacy">
            <Link to="/privacy">Политика обработки персональных данных</Link>
          </li>
        </ul>
      </div>

      <div className="wrap about__photos">
        {PHOTOS.map((photo) => (
          <figure key={photo.src}>
            <img src={photo.src} alt={photo.alt} loading="lazy" />
          </figure>
        ))}
      </div>
      {confirming && <VkConfirm kind="community" href={VK_COMMUNITY} onClose={close} />}
    </section>
  );
}
