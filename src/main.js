const appEl = document.getElementById('app');

const res = await fetch('/api/hello');
const data = await res.json();

appEl.textContent = data.message;
