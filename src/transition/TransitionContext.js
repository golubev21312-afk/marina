import { createContext, useContext } from 'react';

/** Функция, которая уводит на новый маршрут через анимацию перехода. */
export const TransitionContext = createContext(() => {});

export const useTransitionTo = () => useContext(TransitionContext);
