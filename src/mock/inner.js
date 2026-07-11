document.addEventListener('DOMContentLoaded', () => {
  console.debug('[inner.js] DOMContentLoaded fired');

  fetch('https://api')
    .then((res) => res.json())
    .then((data) => {
      const result = document.createElement('pre');
      result.textContent = JSON.stringify(data, null, 2);
      document.body.appendChild(result);
    });
});
