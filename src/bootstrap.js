const status = document.querySelector('#startup-status');
const message = document.querySelector('#startup-message');

function showFailure(error) {
  console.error('No se pudo iniciar el laboratorio:', error);
  document.body.dataset.appState = 'error';
  status.hidden = false;
  status.classList.add('startup-error');
  message.textContent =
    location.protocol === 'file:'
      ? 'Abre index.html con Go Live en VS Code o con el servidor local. El navegador necesita una dirección HTTP para cargar el laboratorio.'
      : 'No se pudieron cargar los recursos del laboratorio. Comprueba que abriste la carpeta completa del proyecto, incluida vendor, y vuelve a intentar.';
  document.querySelector('#startup-title').textContent = 'El laboratorio no pudo iniciar';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Volver a intentar';
  retry.onclick = () => location.reload();
  status.append(retry);
  document.querySelector('#controls').innerHTML =
    '<div class="panel-section"><h2>Recursos no disponibles</h2><p class="small-note">Revisa el mensaje sobre el laboratorio para continuar.</p><a href="docs/manual.html#inicio">Ver instrucciones de inicio</a></div>';
}

if (location.protocol === 'file:') showFailure(new Error('Se requiere un servidor HTTP.'));
else {
  try {
    await import('./app.js');
    document.body.dataset.appState = 'ready';
    status.hidden = true;
  } catch (error) {
    showFailure(error);
  }
}
