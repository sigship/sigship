const cart = JSON.parse(localStorage.getItem('cart') ?? '[]');
export default () => <span>{cart.length}</span>;
