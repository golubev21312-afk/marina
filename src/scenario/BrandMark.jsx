import logo from '../assets/logo.jpg';
import './BrandMark.css';

/** Фирменный знак: тёмный круг, золотое кольцо и мягкий ореол вокруг. */
export default function BrandMark({ size }) {
  return (
    <span className="brand-mark" style={size ? { '--mark-size': `${size}px` } : undefined}>
      <img src={logo} alt="Крафт" draggable={false} />
    </span>
  );
}
