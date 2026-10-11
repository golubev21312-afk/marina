const rubles = new Intl.NumberFormat('ru-RU');

export const formatPrice = (value) => `${rubles.format(value)} ₽`;
