export function render(comment: { body: string }) {
  const el = document.createElement('div');
  el.innerHTML = comment.body;
  document.body.appendChild(el);
}
