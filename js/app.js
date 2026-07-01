// Sincronización visual del resumen y controles de interfaz.
(function(){
  function $(id){return document.getElementById(id)}
  function syncSummary(){
    if($('resProducto')&&$('producto')) $('resProducto').textContent=$('producto').selectedOptions[0]?.textContent||'-';
    if($('resVariante')&&$('variante')) $('resVariante').textContent=$('variante').value||'-';
    if($('resColorDecorativo')&&$('colorDecorativo')) { const txt=($('producto').selectedOptions[0]?.textContent||'').toUpperCase(); $('resColorDecorativo').textContent=txt.includes('DECORATIVO')?($('colorDecorativo').value||'Pendiente'):'-'; }
    if($('resMedida')&&$('medida')) $('resMedida').textContent=$('medida').value?$('medida').value+' m':'-';
    if($('resAltura')&&$('alturaCordon')) $('resAltura').textContent=$('alturaCordon').value?$('alturaCordon').value+' m':'-';
    if($('resIva')) $('resIva').textContent='IVA incluido';
    if($('ivaLegend')) $('ivaLegend').textContent='IVA incluido';
    if($('quoteTotalMirror')&&$('total')) $('quoteTotalMirror').textContent=$('total').textContent;
    const rows=document.querySelectorAll('#tablaTramos tbody tr').length;
    if($('quoteCount')) $('quoteCount').textContent=rows;
    if($('emptyQuote')) $('emptyQuote').style.display=rows?'none':'block';
    const lado=$('ladoCarroMaestro'); if(lado) document.querySelectorAll('[data-side]').forEach(b=>b.classList.toggle('active',b.dataset.side===lado.value));
    const vm=$('varianteMotorizado'); if(vm) document.querySelectorAll('[data-motorvariant]').forEach(b=>b.classList.toggle('active',b.dataset.motorvariant===vm.value));
  }
  document.addEventListener('DOMContentLoaded',()=>{
    if($('ivaSelect')) $('ivaSelect').addEventListener('change',()=>{ $('ivaOpcional').checked=$('ivaSelect').value==='si'; $('ivaOpcional').dispatchEvent(new Event('input',{bubbles:true})); syncSummary(); });
    if($('btnPrintTop')) $('btnPrintTop').addEventListener('click',()=> $('btnPrint').click());
    if($('btnWhatsappTop')) $('btnWhatsappTop').addEventListener('click',()=> $('btnWhatsapp').click());
    if($('btnAgregarTramoSide')) $('btnAgregarTramoSide').addEventListener('click',()=> $('btnAgregarTramo').click());
    document.querySelectorAll('[data-side]').forEach(b=>b.addEventListener('click',()=>{ $('ladoCarroMaestro').value=b.dataset.side; $('ladoCarroMaestro').dispatchEvent(new Event('input',{bubbles:true})); syncSummary(); }));
    document.querySelectorAll('[data-motorvariant]').forEach(b=>b.addEventListener('click',()=>{ $('varianteMotorizado').value=b.dataset.motorvariant; $('varianteMotorizado').dispatchEvent(new Event('input',{bubbles:true})); syncSummary(); }));
    ['producto','variante','motorModelo','varianteMotorizado','colorDecorativo','medida','alturaCordon','ivaOpcional','cantidad','correderasExtraPct','instalacionTradTecho','soporteMuroTrad','cintaEspanolaActiva','cintaEspanolaPct','cintaEspanolaSep'].forEach(id=>{ if($(id)) $(id).addEventListener('input',syncSummary); if($(id)) $(id).addEventListener('change',syncSummary); });
    const oldRender=window.render;
    setInterval(syncSummary,300);
    syncSummary();
  });
})();
