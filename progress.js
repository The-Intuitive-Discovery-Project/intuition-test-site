(()=>{
  // Android browsers can expose the root page background when the on-screen
  // keyboard resizes the visual viewport. Keep the root canvas dark so no
  // white strip appears behind/above the keyboard.
  const style=document.createElement('style');
  style.textContent='html{background:#07070a!important;min-height:100%;}body{min-height:100dvh;}';
  document.head.appendChild(style);
})();
