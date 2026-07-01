// Motor de cálculo, validaciones, render, PDF/impresión y WhatsApp.
(function(){
'use strict';
const productosArr = window.ZACBE_PRODUCTOS_DATA || [];
const accesoriosArr = window.ZACBE_ACCESORIOS_DATA || [];

const correderasExtrasArr = window.ZACBE_CORREDERAS_EXTRAS_DATA || [];
const medidas = [1,1.5,2,2.5,3,3.5,4,4.5,5,5.5];

// Catálogo visible final solicitado por ZacBe.
// Se conservan las tablas originales de precio; solo se ajusta el nombre visible y, en motorizados,
// se separa Tradicional/Ripplefold como productos independientes para que el selector sea más claro.
(function prepararCatalogoVisible(){
  window.motorCatalog = { Tradicional: {}, Ripplefold: {} };
  for(const p of [...productosArr]){
    const title=String(p.title||'').toUpperCase();
    if(!title.includes('MOTORIZADOS')) continue;
    const mc=(title.match(/MC\s*([0-9]+)/)||[])[1];
    if(!mc) continue;
    if(p.variants && p.variants.Tradicional) window.motorCatalog.Tradicional[`MC${mc}`]=p.variants.Tradicional;
    if(p.variants && p.variants.Ripplefold) window.motorCatalog.Ripplefold[`MC${mc}`]=p.variants.Ripplefold;
  }
  const permitidos = new Set([
    'LISTA DE PRECIOS TRADICIONAL A TECHO',
    'LISTA DE PRECIOS TRADICIONAL A TECHO COLOR NEGRO',
    'LISTA DE PRECIOS RIPPLEFOLD A TECHO',
    'LISTA DE PRECIOS RIPPLEFOLD A TECHO COLOR NEGRO',
    'LISTA DE PRECIOS ESPANOLA RIPPLEFOLD A TECHO',
    'LISTA DE PRECIOS TRADICIONAL DECORATIVO',
    'LISTA DE PRECIOS RIPPLEFOLD DECORATIVO',
    'LISTA DE PRECIOS TRADICIONAL CORDON',
    'LISTA DE PRECIOS RIPPLEFOLD CORDON'
  ]);
  const visibles = productosArr.filter(p=>permitidos.has(String(p.title||'').toUpperCase()));
  visibles.push({title:'Motorizado Tradicional Blanco', virtualMotor:true, motorTipo:'Tradicional', variants:{'1 carro':[], '2 carros':[]}, source:'Motorizados'});
  visibles.push({title:'Motorizado Ripplefold', virtualMotor:true, motorTipo:'Ripplefold', variants:{'1 carro':[], '2 carros':[]}, source:'Motorizados'});
  productosArr.splice(0, productosArr.length, ...visibles);
})();;

function ordenProductoTitulo(t){
  const orden = [
    'Tradicional a techo Blanco',
    'Tradicional a techo Negro',
    'Ripplefold a techo Blanco',
    'Ripplefold a techo Negro',
    'Ripplefold española',
    'Tradicional decorativo',
    'Ripplefold decorativo',
    'Tradicional con cordón Blanco',
    'Ripplefold con cordón Blanco',
    'Motorizado Tradicional Blanco',
    'Motorizado Ripplefold'
  ];
  const nombre = nombreProducto(t);
  const idx = orden.findIndex(x=>x.toUpperCase()===nombre.toUpperCase());
  return idx === -1 ? 999 : idx;
}
productosArr.sort((a,b)=>ordenProductoTitulo(a.title)-ordenProductoTitulo(b.title));
const productos = Object.fromEntries(productosArr.map(p=>[p.title,p]));
const accesorios = Object.fromEntries(accesoriosArr.map(a=>[a.name,a]));
let tramos=[]; let accs=[];
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const conIva=()=>true;
function medidaCobrada(m){m=Number(m||0); if($('redondeo').value==='exacto') return m; return medidas.find(x=>m<=x)||m;}
function medidaExtendida(m){
  m=Number(m||0);
  if(m<=5.5) return medidaCobrada(m);
  if($('redondeo').value==='exacto') return m;
  return 5.5 + Math.ceil((m-5.5)/0.5)*0.5;
}
function getRowByMedida(arr,medida){ return arr.find(r=>Math.abs(Number(r.m)-Number(medida))<0.0001); }
function extensionDesde550(arr,m){
  const row50=getRowByMedida(arr,5.0);
  const row55=getRowByMedida(arr,5.5) || arr[arr.length-1];
  if(!row50 || !row55) return null;
  const medidaCalc=medidaExtendida(m);
  const pasos=$('redondeo').value==='exacto' ? Math.max(0,(medidaCalc-5.5)/0.5) : Math.max(0,Math.ceil((medidaCalc-5.5)/0.5));
  const diffSin=Number((row55.sin-row50.sin).toFixed(2));
  const diffCon=Number((row55.con-row50.con).toFixed(2));
  return {sin:row55.sin+(diffSin*pasos), con:row55.con+(diffCon*pasos), diffSin, diffCon, pasos, medidaCalc};
}
function medidaCobradaProducto(prod,variant,m){ return Number(m||0)>5.5 ? medidaExtendida(m) : medidaCobrada(m); }
function motorSeleccionadoActual(){ return $('motorModelo')?.value || 'MC40'; }
function esProductoMotorVirtual(prod){ return !!productos[prod]?.virtualMotor; }
function variantData(prod,variant,motor){
  const p=productos[prod];
  if(p?.virtualMotor){
    const modelo=motor || motorSeleccionadoActual();
    return (window.motorCatalog?.[p.motorTipo]?.[modelo]) || [];
  }
  return p?.variants?.[variant]||[];
}
function precioBase(prod,variant,m,motor){
  const arr=variantData(prod,variant,motor); if(!arr.length) return {sin:0,con:0}; m=Number(m||0);
  if(m>5.5){
    const ext=extensionDesde550(arr,m);
    if(ext) return {sin:ext.sin, con:ext.con};
  }
  if($('redondeo').value==='exacto'){
    const sorted=[...arr].sort((a,b)=>a.m-b.m);
    const row=sorted.find(r=>m<=r.m)||sorted[sorted.length-1];
    return {sin:(row.sin/row.m)*m, con:(row.con/row.m)*m};
  }
  const mc=medidaCobrada(m); const row=getRowByMedida(arr,mc); if(row) return {sin:row.sin,con:row.con};
  const sorted=[...arr].sort((a,b)=>a.m-b.m); const last=sorted[sorted.length-1]; return {sin:(last.sin/last.m)*m, con:(last.con/last.m)*m};
}
function esRipplefoldEspanola(prod){ return normaliza(nombreProducto(prod)+' '+prod).includes('ESPANOLA') || normaliza(nombreProducto(prod)+' '+prod).includes('ESPANOL'); }
function tablaCorrederasPorProducto(prod){
  if(esRipplefoldEspanola(prod) && window.ZACBE_CORREDERAS_EXTRAS_ESPANOLA_DATA) return window.ZACBE_CORREDERAS_EXTRAS_ESPANOLA_DATA;
  return correderasExtrasArr;
}
function precioCorrederasExtra(pct,m,prod){
  pct=String(pct||'0'); if(pct==='0') return {sin:0,con:0};
  const tablas=tablaCorrederasPorProducto(prod);
  const arr=tablas[pct]||[]; if(!arr.length) return {sin:0,con:0}; m=Number(m||0);
  if(m>5.5){
    const ext=extensionDesde550(arr,m);
    if(ext) return {sin:ext.sin, con:ext.con};
  }
  if($('redondeo').value==='exacto'){
    const sorted=[...arr].sort((a,b)=>a.m-b.m); const row=sorted.find(r=>m<=r.m)||sorted[sorted.length-1];
    return {sin:(row.sin/row.m)*m, con:(row.con/row.m)*m};
  }
  const mc=medidaCobrada(m); const row=getRowByMedida(arr,mc);
  if(row) return {sin:row.sin,con:row.con};
  const sorted=[...arr].sort((a,b)=>a.m-b.m); const last=sorted[sorted.length-1]; return {sin:(last.sin/last.m)*m, con:(last.con/last.m)*m};
}
function precioMostrado(p){return conIva()?p.con:p.sin;}

function nombreProducto(prod){
  let t = String(prod || '').trim();
  t = t.replace(/^LISTA\s+DE\s+PRECIOS\s+/i,'');
  t = t.replace(/\s+/g,' ').trim();
  const map = {
    'TRADICIONAL A TECHO':'Tradicional a techo Blanco',
    'TRADICIONAL A TECHO COLOR NEGRO':'Tradicional a techo Negro',
    'RIPPLEFOLD A TECHO':'Ripplefold a techo Blanco',
    'RIPPLEFOLD A TECHO COLOR NEGRO':'Ripplefold a techo Negro',
    'ESPANOLA RIPPLEFOLD A TECHO':'Ripplefold española',
    'TRADICIONAL DECORATIVO':'Tradicional decorativo',
    'RIPPLEFOLD DECORATIVO':'Ripplefold decorativo',
    'TRADICIONAL CORDON':'Tradicional con cordón Blanco',
    'RIPPLEFOLD CORDON':'Ripplefold con cordón Blanco',
    'MOTORIZADO TRADICIONAL BLANCO':'Motorizado Tradicional Blanco',
    'MOTORIZADO RIPPLEFOLD':'Motorizado Ripplefold'
  };
  const key = t.toUpperCase();
  if(map[key]) return map[key];
  return t.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Mc40/g,'MC40').replace(/Mc46/g,'MC46').replace(/Mc360/g,'MC360').replace(/Mc950/g,'MC950')
    .replace(/Cordon/g,'Cordón').replace(/Cafe/g,'Café').replace(/Espanola/g,'Española');
}
function esRipplefold(prod,variant){ const txt=((prod||'')+' '+(variant||'')).toUpperCase(); return txt.includes('RIPPLEFOLD') || txt.includes('RIPP'); }
function esCordon(prod,variant){ const txt=((prod||'')+' '+(variant||'')).toUpperCase(); return txt.includes('CORDON') || txt.includes('CORDÓN'); }
function esDecorativo(prod,variant){ const txt=((prod||'')+' '+(variant||'')).toUpperCase(); return txt.includes('DECORATIVO'); }
function esMotorizado(prod,variant){ const txt=((prod||'')+' '+(variant||'')).toUpperCase(); return txt.includes('MOTORIZADO') || txt.includes('MOTORIZADOS') || txt.includes('MOTOR') || /\bMC\s*(40|46|360|950)\b/.test(txt); }
function actualizarBloqueMotorModelo(){ const visible=esMotorizado($('producto').value,$('variante').value); const bloque=$('bloqueMotorModelo'); if(bloque){ bloque.style.display=visible?'block':'none'; } return visible; }
function actualizarBloqueVarianteMotorizado(){ const visible=esMotorizado($('producto').value,$('variante').value); const bloque=$('bloqueVarianteMotorizado'); if(bloque){ bloque.style.display=visible?'block':'none'; } if(visible && !$('varianteMotorizado').value) $('varianteMotorizado').value='1 carro'; if(!visible && $('varianteMotorizado')) $('varianteMotorizado').value=''; return visible; }
function requiereLadoCarroMaestro(prod,variant){ const v=(variant||'').toUpperCase().trim(); return !esMotorizado(prod,variant) && (v==='1 CARRO' || v.includes('1 CARRO')); }
function actualizarBloqueLadoCarroMaestro(){ const visible=requiereLadoCarroMaestro($('producto').value,$('variante').value); const bloque=$('bloqueLadoCarroMaestro'); if(bloque){ bloque.style.display=visible?'block':'none'; } if(!visible && $('ladoCarroMaestro')) $('ladoCarroMaestro').value=''; return visible; }
function permiteCurvaPlantilla(prod,variant){ const txt=((prod||'')+' '+(variant||'')).toUpperCase(); return txt.includes('A TECHO') || txt.includes('MOTORIZADO') || txt.includes('MOTORIZADOS'); }
function esCurvaPlantilla(nombre){ const txt=(nombre||'').toUpperCase(); return txt.includes('CURVA SOBRE PLANTILLA') || txt.includes('RIEL CURVO BAJO PLANTILLA'); }

function esTradicionalATecho(prod){ return nombreProducto(prod).toUpperCase().includes('TRADICIONAL A TECHO'); }
function esRipplefoldATecho(prod){ const n=nombreProducto(prod).toUpperCase(); return n.includes('RIPPLEFOLD A TECHO'); }
function esProductoNegro(prod){ return nombreProducto(prod).toUpperCase().includes('NEGRO'); }
function normaliza(txt){ return String(txt||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
function esUnion(nombre){ return normaliza(nombre).includes('UNION PARA RIELES') || normaliza(nombre).includes('UNION PARA RIEL'); }
function tieneUnionAgregada(){ return accs.some(a=>esUnion(a.nombre) && Number(a.cantidad||0)>0); }
function requiereUnionPorMedida(m){ return Number(m||0)>5.55; }
function unionAutoInfo(prod,variant,m){
  if(!requiereUnionPorMedida(m)) return {aplica:false,nombre:'',cantidad:0,precio:{sin:0,con:0},total:{sin:0,con:0}};
  let nombre='UNION PARA RIELES TIPO RIEL MURO';
  if(esDecorativo(prod,variant)) nombre='UNION PARA RIELES TIPO RIEL DECORATIVO';
  else if(esCordon(prod,variant)) nombre='UNION PARA RIELES TIPO RIEL CORDON';
  else if(esMotorizado(prod,variant)) nombre='UNION RIEL RAM (MOTORIZADO)';
  const precio=obtenerAccesorioPorNombre(nombre) || {name:nombre,sin:0,con:0};
  const cantidad=1;
  return {aplica:true,nombre:precio.name||nombre,cantidad,precio,total:{sin:Number(precio.sin||0)*cantidad,con:Number(precio.con||0)*cantidad}};
}
function calcularCantidadSoportes(m){ return Math.max(1, Math.ceil(Number(m||0) / 0.70)); }
function obtenerAccesorioPorNombre(nombre){ return accesoriosArr.find(a=>normaliza(a.name)===normaliza(nombre)) || accesoriosArr.find(a=>normaliza(a.name).includes(normaliza(nombre))); }
function soporteAutoInfo(prod,m,instalacion,soporteMuro,colorDecorativo){
  const cantidad=calcularCantidadSoportes(m);
  const txt=normaliza(nombreProducto(prod)+' '+prod);
  // Tradicional a techo: mantiene los precios originales del riel RM y calcula cada 70 cm.
  if(esTradicionalATecho(prod)){
    const negro=esProductoNegro(prod);
    let nombre='';
    // Si eligen "Riel de muro" también debe poder seleccionarse "Soporte de techo".
    // Precios sin IVA oficiales: Blanco $21.95 / Negro $24.30.
    if(instalacion==='muro' && String(soporteMuro)==='6'){
      nombre='SOPORTE 6" DOBLE PARA RIEL';
    } else if(instalacion==='muro' && String(soporteMuro)==='3'){
      nombre=negro?'SOPORTE 3" NEGRO PARA RIEL RM':'SOPORTE 3" PARA RIEL RM';
    } else {
      nombre=negro?'SOPORTE NEGRO PARA TECHO RIEL RM':'SOPORTE PARA TECHO RIEL RM';
    }
    let precio=obtenerAccesorioPorNombre(nombre) || {name:nombre,sin:0,con:0};
    if(String(soporteMuro)==='techo' || instalacion!=='muro'){
      precio=negro
        ? {name:'SOPORTE NEGRO PARA TECHO RIEL RM', sin:24.30, con:28.18}
        : {name:'SOPORTE PARA TECHO RIEL RM', sin:21.95, con:25.46};
    }
    return {aplica:true,nombre:precio.name||nombre,cantidad,precio,total:{sin:Number(precio.sin||0)*cantidad,con:Number(precio.con||0)*cantidad}};
  }
  // Ripplefold a techo: mismas variantes que tradicional a techo, usando precios de su propia lista.
  if(esRipplefoldATecho(prod)){
    const negro=esProductoNegro(prod);
    let nombre='';
    // Si eligen "Riel de muro" también debe poder seleccionarse "Soporte de techo".
    // Precios sin IVA oficiales: Blanco $21.95 / Negro $24.30.
    if(instalacion==='muro' && String(soporteMuro)==='6'){
      nombre='SOPORTE 6" DOBLE PARA RIEL';
    } else if(instalacion==='muro' && String(soporteMuro)==='3'){
      nombre=negro?'SOPORTE 3" NEGRO PARA RIEL RM':'SOPORTE 3" PARA RIEL RM';
    } else {
      nombre=negro?'SOPORTE NEGRO PARA TECHO RIEL RM':'SOPORTE PARA TECHO RIEL RM';
    }
    let precio=obtenerAccesorioPorNombre(nombre) || {name:nombre,sin:0,con:0};
    if(String(soporteMuro)==='techo' || instalacion!=='muro'){
      precio=negro
        ? {name:'SOPORTE NEGRO PARA TECHO RIEL RM', sin:24.30, con:28.18}
        : {name:'SOPORTE PARA TECHO RIEL RM', sin:21.95, con:25.46};
    }
    return {aplica:true,nombre:precio.name||nombre,cantidad,precio,total:{sin:Number(precio.sin||0)*cantidad,con:Number(precio.con||0)*cantidad}};
  }
  // Decorativo tradicional/ripplefold: soportes según instalación y color seleccionado.
  // Precios iguales para Blanco, Negro, Oxford (gris) y Plata.
  if(esDecorativo(prod,'')){
    const color=(colorDecorativo || ($('colorDecorativo')?.value||'')).trim();
    const colorTxt=color ? ` ${color}` : '';
    let nombre='', precio={sin:0,con:0};
    if(instalacion==='muro'){
      if(String(soporteMuro)==='6'){
        nombre=`Soporte decorativo 6\"${colorTxt}`;
        precio={name:nombre,sin:130.22,con:130.22*1.16};
      } else {
        nombre=`Soporte decorativo 3\"${colorTxt}`;
        precio={name:nombre,sin:92.26,con:92.26*1.16};
      }
    } else {
      nombre=`Soporte decorativo para techo${colorTxt}`;
      precio={name:nombre,sin:52.85,con:52.85*1.16};
    }
    return {aplica:true,nombre:precio.name||nombre,cantidad,precio,total:{sin:Number(precio.sin||0)*cantidad,con:Number(precio.con||0)*cantidad}};
  }
  // Riel de cordón tradicional/ripplefold: soporte de techo obligatorio $106.35 c/u.
  // También permite escoger soporte 3" o 6" cuando se use a muro.
  if(esCordon(prod,'')){
    let nombre='', precio={sin:0,con:0};
    if(String(soporteMuro)==='6'){
      nombre='SOPORTE DE ALUMINIO BLANCO 6" PARA RIEL DE CORDÓN';
      precio={name:nombre,sin:148.09,con:148.09*1.16};
    } else if(String(soporteMuro)==='3') {
      nombre='SOPORTE DE ALUMINIO BLANCO 3" PARA RIEL DE CORDÓN';
      precio={name:nombre,sin:102.09,con:102.09*1.16};
    } else {
      nombre='SOPORTE PARA TECHO RIEL CORDON';
      precio={name:nombre,sin:106.35,con:106.35*1.16};
    }
    return {aplica:true,nombre:precio.name||nombre,cantidad,precio,total:{sin:Number(precio.sin||0)*cantidad,con:Number(precio.con||0)*cantidad}};
  }
  // Motorizados tradicional/ripplefold: soporte de techo, 3" o 6" con cálculo cada 70 cm.
  if(esMotorizado(prod,'')){
    let nombre='', precio={sin:0,con:0};
    if(String(soporteMuro)==='6'){
      nombre='SOPORTE DE ALUMINIO BLANCO 6" PARA RIEL MOTORIZADO';
      precio={name:nombre,sin:148.09,con:148.09*1.16};
    } else if(String(soporteMuro)==='3') {
      nombre='SOPORTE DE ALUMINIO BLANCO 3" PARA RIEL MOTORIZADO';
      precio={name:nombre,sin:102.09,con:102.09*1.16};
    } else {
      nombre='SOPORTE PARA TECHO RIEL MOTORIZADO';
      precio={name:nombre,sin:106.35,con:106.35*1.16};
    }
    return {aplica:true,nombre:precio.name||nombre,cantidad,precio,total:{sin:Number(precio.sin||0)*cantidad,con:Number(precio.con||0)*cantidad}};
  }
  return {aplica:false,nombre:'',cantidad:0,precio:{sin:0,con:0},total:{sin:0,con:0}};
}

function taponDecorativoInfo(prod,tipo,colorDecorativo){
  if(!esDecorativo(prod,'')) return {aplica:false,nombre:'',cantidad:0,precio:{sin:0,con:0},total:{sin:0,con:0}};
  if(!tipo) return {aplica:false,nombre:'',cantidad:0,precio:{sin:0,con:0},total:{sin:0,con:0}};
  const base=accesoriosArr.find(a=>normaliza(a.name)===normaliza(tipo)) || accesoriosArr.find(a=>normaliza(a.name).includes(normaliza(tipo)));
  const color=(colorDecorativo||'').trim();
  const nombre=(base?.name||tipo) + (color ? ` ${color}` : '');
  const cantidad=2;
  const precio={name:nombre,sin:Number(base?.sin||0),con:Number(base?.con||((base?.sin||0)*1.16))};
  return {aplica:true,nombre,cantidad,precio,total:{sin:precio.sin*cantidad,con:precio.con*cantidad}};
}
function actualizarBloqueTaponesDecorativos(){
  const visible=esDecorativo($('producto').value,$('variante').value);
  const bloque=$('bloqueTaponesDecorativos');
  if(bloque) bloque.style.display=visible?'block':'none';
  if(!visible && $('taponDecorativo')) $('taponDecorativo').value='';
  const info=taponDecorativoInfo($('producto').value,$('taponDecorativo')?.value||'', $('colorDecorativo')?.value||'');
  if($('taponesDecorativosVista')) $('taponesDecorativosVista').textContent=info.aplica?`${info.cantidad} pzas · ${money(precioMostrado(info.total))}`:'$0.00';
  return visible;
}
function actualizarBloqueInstalacionTradTecho(){
  const prod=$('producto').value;
  const visibleInstalacion=esTradicionalATecho(prod) || esRipplefoldATecho(prod) || esCordon(prod,'') || esDecorativo(prod,'');
  const visibleSoportes=esTradicionalATecho(prod) || esRipplefoldATecho(prod) || esCordon(prod,'') || esMotorizado(prod,'') || esDecorativo(prod,'');
  const esMotor=esMotorizado(prod,'');
  const b1=$('bloqueInstalacionTradTecho'), b2=$('bloqueSoporteMuroTrad'), b3=$('bloqueSoportesAuto'), b4=$('avisoSoportesMuro');
  if(b1) b1.style.display=visibleInstalacion?'block':'none';
  const esMuro=(visibleInstalacion && $('instalacionTradTecho')?.value==='muro') || (esMotor && $('soporteMuroTrad')?.value!=='techo');
  const visibleSelectorSoporte=esRipplefoldATecho(prod) || esDecorativo(prod,'') || esCordon(prod,'') || esMotor || (esTradicionalATecho(prod) && $('instalacionTradTecho')?.value==='muro');
  if(b2) b2.style.display=visibleSelectorSoporte?'block':'none';
  if(b3) b3.style.display=visibleSoportes?'block':'none';
  if(b4) b4.style.display=esMuro?'block':'none';
  const labelTipo=b1?.querySelector('label');
  const hintTipo=b1?.querySelector('.hint');
  if(labelTipo) labelTipo.innerHTML='Tipo de riel <span class="req">*</span>';
  if(hintTipo) hintTipo.textContent=(esCordon(prod,'')||esRipplefoldATecho(prod)||esDecorativo(prod,''))?'Selecciona techo o muro para calcular los soportes obligatorios.':'Selecciona si el riel será de techo o de muro.';
  const hintMuro=b2?.querySelector('.hint');
  if(hintMuro) hintMuro.textContent='Selecciona soporte de techo, 3" o 6". Se calcula 1 pza cada 70 cm por cada riel.';
  if(!visibleSoportes){ if($('instalacionTradTecho')) $('instalacionTradTecho').value='techo'; if($('soporteMuroTrad')) $('soporteMuroTrad').value='techo'; if($('soportesAutoVista')) $('soportesAutoVista').textContent='$0.00'; }
  return visibleSoportes;
}

function accesoriosDisponibles(){ const puede=permiteCurvaPlantilla($('producto').value,$('variante').value); return accesoriosArr.filter(a=>(puede || !esCurvaPlantilla(a.name)) && !normaliza(a.name).includes('TAPON FINAL')); }
function actualizarAccesorios(){ const sel=$('accesorio'); if(!sel) return; const actual=sel.value; const lista=accesoriosDisponibles(); sel.innerHTML=lista.map(a=>`<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)} - ${money(a.sin)} sin IVA / ${money(a.con)} c/IVA</option>`).join(''); if(lista.some(a=>a.name===actual)) sel.value=actual; }
function actualizarBloqueAlturaCordon(){ const visible=esCordon($('producto').value,$('variante').value); const bloque=$('bloqueAlturaCordon'); if(bloque){ bloque.style.display=visible?'block':'none'; } if(!visible && $('alturaCordon')){ $('alturaCordon').value=''; } return visible; }
function actualizarBloqueColorDecorativo(){ const visible=esDecorativo($('producto').value,$('variante').value); const bloque=$('bloqueColorDecorativo'); if(bloque){ bloque.style.display=visible?'block':'none'; } if(!visible && $('colorDecorativo')){ $('colorDecorativo').value=''; } actualizarBloqueTaponesDecorativos(); return visible; }
function actualizarBloqueCorrederas(){ const visible=esRipplefold($('producto').value,$('variante').value); const bloque=$('bloqueCorrederasRipp'); if(bloque){ bloque.style.display=visible?'block':'none'; } if(!visible && $('correderasExtraPct')){ $('correderasExtraPct').value='0'; $('correderasExtraVista').textContent='$0.00'; } return visible; }
function actualizarVariante(){ const p=$('producto').value; if(productos[p]?.virtualMotor){ $('variante').innerHTML='<option value="Motorizado">Motorizado</option>'; if($('varianteMotorizado')) $('varianteMotorizado').value='1 carro'; } else { $('variante').innerHTML=Object.keys(productos[p].variants).map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join(''); } actualizarAccesorios(); actualizarVistaPrecio(); }
function actualizarVistaPrecio(){
  const m=parseFloat($('medida').value||0), prod=$('producto').value, variant=$('variante').value;
  const permiteCorrederas=actualizarBloqueCorrederas();
  const permiteAltura=actualizarBloqueAlturaCordon();
  const permiteColorDecorativo=actualizarBloqueColorDecorativo();
  const requiereLado=actualizarBloqueLadoCarroMaestro();
  const permiteMotor=actualizarBloqueMotorModelo();
  const permiteVarMotor=actualizarBloqueVarianteMotorizado();
  const permiteInstalacion=actualizarBloqueInstalacionTradTecho();
  const motorModelo=permiteMotor ? ($('motorModelo')?.value||'MC40') : '';
  const varianteMotor=permiteVarMotor ? ($('varianteMotorizado')?.value||'1 carro') : '';
  const lado=$('ladoCarroMaestro')?.value||'';
  const altura=parseFloat($('alturaCordon')?.value||0);
  const colorDecorativo=permiteColorDecorativo ? ($('colorDecorativo')?.value||'') : '';
  const pct=permiteCorrederas ? $('correderasExtraPct').value : '0';
  if($('avisoUnionObligatoria')) $('avisoUnionObligatoria').style.display=requiereUnionPorMedida(m)?'block':'none';
  if(!m||m<=0){$('precioSeleccionado').textContent='Selecciona producto, variante y medida.';$('correderasExtraVista').textContent='$0.00'; if($('soportesAutoVista')) $('soportesAutoVista').textContent='$0.00'; return;}
  const mc=medidaCobradaProducto(prod,variant,m), p=precioBase(prod,variant,m,motorModelo), ce=permiteCorrederas?precioCorrederasExtra(pct,m,prod):{sin:0,con:0};
  const soporte=soporteAutoInfo(prod,m,$('instalacionTradTecho')?.value||'techo',$('soporteMuroTrad')?.value||'techo',colorDecorativo);
  const union=unionAutoInfo(prod,variant,m);
  const tapon=taponDecorativoInfo(prod,$('taponDecorativo')?.value||'',colorDecorativo);
  if($('soportesAutoVista')) $('soportesAutoVista').textContent=soporte.aplica?`${soporte.cantidad} pzas · ${money(precioMostrado(soporte.total))}`:'$0.00';
  $('correderasExtraVista').textContent=pct==='0'?'$0.00':`${pct}% · ${money(precioMostrado(ce))}`;
  const lineaCorrederas=permiteCorrederas?`<br>Correderas extras: <b>${money(precioMostrado(ce))}</b>`:'';
  const lineaAltura=permiteAltura&&altura>0?`<br>Altura cordón: <b>${altura.toFixed(2)} m</b>`:'';
  const lineaColor=permiteColorDecorativo?`<br>Color decorativo: <b>${colorDecorativo?escapeHtml(colorDecorativo):'Pendiente obligatorio'}</b>`:'';
  const lineaLado=requiereLado?`<br>Lado carro maestro: <b>${lado?escapeHtml(lado):'Pendiente obligatorio'}</b>`:'';
  const lineaMotorModelo=permiteMotor?`<br>Motor: <b>${escapeHtml(motorModelo)}</b>`:'';
  const lineaMotor=permiteVarMotor?`<br>Tipo/variante motorizado: <b>${escapeHtml(varianteMotor)}</b>`:'';
  const lineaInstalacion=permiteInstalacion?`<br>Tipo de riel: <b>${$('instalacionTradTecho').value==='muro'?'Riel de muro':'Riel de techo'}</b>`:'';
  const lineaSoporte=soporte.aplica?`<br>Soportes automáticos: <b>${soporte.cantidad} pzas · ${escapeHtml(soporte.nombre)} · ${money(precioMostrado(soporte.total))}</b>`:'';
  const lineaUnion=union.aplica?`<br>Unión obligatoria sugerida: <b>${union.cantidad} pza · ${escapeHtml(union.nombre)} · ${money(precioMostrado(union.total))}</b>`:'';
  const lineaTapon=tapon.aplica?`<br>Tapones finales decorativos: <b>${tapon.cantidad} pzas · ${escapeHtml(tapon.nombre)} · ${money(precioMostrado(tapon.total))}</b>`:(permiteColorDecorativo?`<br>Tapones finales decorativos: <b>Pendiente obligatorio</b>`:'');
  $('precioSeleccionado').innerHTML=`<b>${escapeHtml(nombreProducto(prod))}</b><br>${escapeHtml(variant)}<br>Medida real: ${m.toFixed(2)} m<br>Medida cobrada: ${mc.toFixed(2)} m${lineaInstalacion}${lineaSoporte}${lineaTapon}${lineaAltura}${lineaColor}${lineaLado}${lineaMotorModelo}${lineaMotor}<br>Base: <b>${money(precioMostrado(p))}</b> IVA incluido${lineaCorrederas}${lineaUnion}<br>Total unitario: <b>${money(precioMostrado(p)+precioMostrado(ce)+precioMostrado(soporte.total)+precioMostrado(union.total)+precioMostrado(tapon.total))}</b>`;
}
function agregarTramo(){
  const m=parseFloat($('medida').value), c=parseInt($('cantidad').value||'1',10);
  if(!m||m<=0){alert('Captura una medida válida. Ejemplo: 2.35');return}
  if(!c||c<=0){alert('Captura una cantidad válida.');return}
  if(requiereUnionPorMedida(m) && !tieneUnionAgregada()){
    alert('Para medidas mayores a 5.55 m el cotizador agregará automáticamente la Unión obligatoria correspondiente al tipo de producto. Agrégalo en la sección de accesorios opcionales.');
    $('accesorio')?.focus(); return;
  }
  const prod=$('producto').value, variant=$('variante').value;
  const esMotor=esMotorizado(prod,variant); const motorModelo=esMotor ? ($('motorModelo')?.value||'') : ''; const varianteMotorizado=esMotor ? ($('varianteMotorizado')?.value||'') : '';
  if(esMotor && !motorModelo){alert('Selecciona el motor: MC40, MC46, MC360 o MC950.'); $('motorModelo').focus(); return;}
  if(esMotor && !varianteMotorizado){alert('Selecciona la variante motorizada: 1 carro o 2 carros.'); return;}
  const requiereColorDecorativo=esDecorativo(prod,variant); const colorDecorativo=$('colorDecorativo')?.value||'';
  if(requiereColorDecorativo && !colorDecorativo){ alert('Selecciona el color decorativo: negro, blanco, oxford (gris) o plata.'); $('colorDecorativo').focus(); return;}
  const taponDecorativo=requiereColorDecorativo?($('taponDecorativo')?.value||''):'';
  if(requiereColorDecorativo && !taponDecorativo){ alert('Selecciona el tipo de tapón final decorativo. Es obligatorio y se agregan 2 piezas.'); $('taponDecorativo').focus(); return;}
  const requiereLado=requiereLadoCarroMaestro(prod,variant); const lado=$('ladoCarroMaestro')?.value||'';
  if(requiereLado && !lado){alert('Selecciona el lado del carro maestro: izquierda o derecha. Este dato es obligatorio para 1 hoja / 1 carro.'); $('ladoCarroMaestro').focus(); return;}
  const pct=esRipplefold(prod,variant)?$('correderasExtraPct').value:'0'; const altura=esCordon(prod,variant)?parseFloat($('alturaCordon').value||0):0;
  const aplicaInstalacion=esTradicionalATecho(prod)||esCordon(prod,'')||esMotorizado(prod,'')||esDecorativo(prod,''); const soporteMuroTrad=aplicaInstalacion?($('soporteMuroTrad')?.value||'techo'):''; const instalacionTradTecho=aplicaInstalacion?(esMotorizado(prod,'')?(soporteMuroTrad==='techo'?'techo':'muro'):($('instalacionTradTecho')?.value||'techo')):'';
  tramos.push({ubicacion:$('ubicacion').value||'Sin ubicación',medida:m,cantidad:c,producto:prod,variante:variant,colorDecorativo:requiereColorDecorativo?colorDecorativo:'',taponDecorativo:requiereColorDecorativo?taponDecorativo:'',correderasExtraPct:pct,alturaCordon:altura,ladoCarroMaestro:requiereLado?lado:'',motorModelo, varianteMotorizado, instalacionTradTecho, soporteMuroTrad});
  $('ubicacion').value='';$('medida').value='';$('alturaCordon').value='';$('ladoCarroMaestro').value='';$('colorDecorativo').value='';$('cantidad').value=1;$('correderasExtraPct').value='0'; if($('varianteMotorizado')) $('varianteMotorizado').value='1 carro'; if($('motorModelo')) $('motorModelo').value='MC40'; render();
}
function agregarAccesorio(){ const c=parseInt($('accCantidad').value||'1',10); if(!c||c<=0){alert('Captura una cantidad válida.');return} const nombre=$('accesorio').value; accs.push({nombre,precio:accesorios[nombre],cantidad:c}); $('accCantidad').value=1;render(); }
function delTramo(i){tramos.splice(i,1);render();} function delAcc(i){accs.splice(i,1);render();}
function calcTotals(){
  let stSin=0, stCon=0, saSin=0, saCon=0, ceSin=0, ceCon=0, sopSin=0, sopCon=0, uniSin=0, uniCon=0, tapSin=0, tapCon=0;
  for(const t of tramos){
    const p=precioBase(t.producto,t.variante,t.medida,t.motorModelo), ce=esRipplefold(t.producto,t.variante)?precioCorrederasExtra(t.correderasExtraPct,t.medida,t.producto):{sin:0,con:0};
    const sop=soporteAutoInfo(t.producto,t.medida,t.instalacionTradTecho||'techo',t.soporteMuroTrad||'techo',t.colorDecorativo||'');
    const uni=unionAutoInfo(t.producto,t.variante,t.medida);
    const tap=taponDecorativoInfo(t.producto,t.taponDecorativo||'',t.colorDecorativo||'');
    stSin+=p.sin*t.cantidad; stCon+=p.con*t.cantidad; ceSin+=ce.sin*t.cantidad; ceCon+=ce.con*t.cantidad; sopSin+=sop.total.sin*t.cantidad; sopCon+=sop.total.con*t.cantidad; uniSin+=uni.total.sin*t.cantidad; uniCon+=uni.total.con*t.cantidad; tapSin+=tap.total.sin*t.cantidad; tapCon+=tap.total.con*t.cantidad;
  }
  for(const a of accs){saSin+=a.precio.sin*a.cantidad; saCon+=a.precio.con*a.cantidad;}
  const baseSin=stSin+saSin+ceSin+sopSin+uniSin+tapSin; const baseCon=stCon+saCon+ceCon+sopCon+uniCon+tapCon;
  const logSin=(baseSin>0&&baseSin<1500)?100:0; const logCon=(baseSin>0&&baseSin<1500)?116:0; const totalSin=baseSin+logSin; const totalCon=baseCon+logCon;
  return {stSin,stCon,saSin,saCon,ceSin,ceCon,sopSin,sopCon,uniSin,uniCon,tapSin,tapCon,logSin,logCon,totalSin,totalCon,iva:totalCon-totalSin,total:conIva()?totalCon:totalSin};
}
function render(){ actualizarVistaPrecio(); $('tablaTramos').querySelector('tbody').innerHTML=tramos.map((t,i)=>{const mc=medidaCobradaProducto(t.producto,t.variante,t.medida), p=precioBase(t.producto,t.variante,t.medida,t.motorModelo), ce=esRipplefold(t.producto,t.variante)?precioCorrederasExtra(t.correderasExtraPct,t.medida,t.producto):{sin:0,con:0}, sop=soporteAutoInfo(t.producto,t.medida,t.instalacionTradTecho||'techo',t.soporteMuroTrad||'techo',t.colorDecorativo||''), uni=unionAutoInfo(t.producto,t.variante,t.medida), tap=taponDecorativoInfo(t.producto,t.taponDecorativo||'',t.colorDecorativo||''), unit=precioMostrado(p)+precioMostrado(ce)+precioMostrado(sop.total)+precioMostrado(uni.total)+precioMostrado(tap.total), imp=unit*t.cantidad; const unionTxt=uni.aplica?`${uni.cantidad} pza<br><span class="muted">${escapeHtml(uni.nombre)}<br>${money(precioMostrado(uni.total))}</span>`:'-'; const soporteTxt=(sop.aplica?`${sop.cantidad} pzas<br><span class="muted">${escapeHtml(sop.nombre)}<br>${money(precioMostrado(sop.total))}</span>`:'-')+(tap.aplica?`<br><br>${tap.cantidad} pzas<br><span class="muted">${escapeHtml(tap.nombre)}<br>${money(precioMostrado(tap.total))}</span>`:''); const extraTxt=(esRipplefold(t.producto,t.variante)&&t.correderasExtraPct&&t.correderasExtraPct!=='0')?`${t.correderasExtraPct}%<br><span class="muted">${money(precioMostrado(ce))}</span>`:'Sin extras'; return `<tr><td>${escapeHtml(t.ubicacion)}<br><span class="muted">${escapeHtml(nombreProducto(t.producto))} · ${escapeHtml(t.variante)}${t.colorDecorativo?`<br>Color: ${escapeHtml(t.colorDecorativo)}`:''}${t.taponDecorativo?`<br>Tapón final: ${escapeHtml(t.taponDecorativo)}`:''}${t.motorModelo?`<br>Motor: ${escapeHtml(t.motorModelo)}`:''}${t.varianteMotorizado?`<br>Tipo/variante motorizado: ${escapeHtml(t.varianteMotorizado)}`:''}${t.instalacionTradTecho?`<br>Tipo de riel: ${t.instalacionTradTecho==='muro'?'Riel de muro':'Riel de techo'}`:''}${t.instalacionTradTecho?`<br>Soporte: ${t.soporteMuroTrad==='6'?'6"':(t.soporteMuroTrad==='3'?'3"':'Techo')}`:''}${t.ladoCarroMaestro?`<br>Carro maestro: ${escapeHtml(t.ladoCarroMaestro)}`:''}${t.alturaCordon?`<br>Altura cordón: ${Number(t.alturaCordon).toFixed(2)} m`:''}</span></td><td>${t.medida.toFixed(2)} m</td><td>${mc.toFixed(2)} m<br><span class="muted">Base: ${money(precioMostrado(p))}</span></td><td>${extraTxt}</td><td>${soporteTxt}</td><td>${unionTxt}</td><td>${t.cantidad}</td><td class="right">${money(imp)}</td><td><button type="button" class="btn danger" data-del-tramo="${i}">X</button></td></tr>`;}).join('');
$('tablaAcc').querySelector('tbody').innerHTML=accs.map((a,i)=>{const unit=conIva()?a.precio.con:a.precio.sin, imp=unit*a.cantidad; return `<tr><td>${escapeHtml(a.nombre)}</td><td class="right">${money(unit)}</td><td>${a.cantidad}</td><td class="right">${money(imp)}</td><td><button type="button" class="btn danger" data-del-acc="${i}">X</button></td></tr>`;}).join('');
const c=calcTotals(); $('subtotalTramos').textContent=money(c.stSin); $('subtotalAcc').textContent=money(c.saSin); $('subtotalCorrederas').textContent=money(c.ceSin); if($('subtotalSoportes')) $('subtotalSoportes').textContent=money(c.sopSin); if($('subtotalUniones')) $('subtotalUniones').textContent=money(c.uniSin); $('logistica').textContent=money(c.logSin); $('ivaMonto').textContent=money(c.iva); $('total').textContent=money(c.totalCon); crearPrint(c); }
function crearPrint(c){ $('cotizacionPrint').innerHTML=`<h2>Cotización</h2><p><b>Cliente:</b> ${escapeHtml($('cliente').value||'')} &nbsp; <b>WhatsApp:</b> ${escapeHtml($('telefonoCliente').value||'')} &nbsp; <b>Fecha:</b> ${escapeHtml($('fecha').value||'')} &nbsp; <b>Vendedor:</b> ${escapeHtml($('vendedor').value||'')}</p><h3>Productos</h3>${$('tablaTramos').outerHTML}<h3>Accesorios</h3>${$('tablaAcc').outerHTML}<h3>Resumen</h3><p>Subtotal productos: <b>${money(c.stSin)}</b><br>Soportes automáticos: <b>${money(c.sopSin)}</b><br>Uniones obligatorias: <b>${money(c.uniSin)}</b><br>Tapones finales decorativos: <b>${money(c.tapSin)}</b><br>Subtotal accesorios: <b>${money(c.saSin)}</b><br>Correderas extras: <b>${money(c.ceSin)}</b><br>Logística: <b>${money(c.logSin)}</b><br>IVA: <b>${money(c.iva)}</b><br>Total: <b>${money(c.totalCon)}</b></p><p><b>Observaciones:</b><br>${escapeHtml($('notas').value||'').replace(/\n/g,'<br>')}</p><p class="small">Cotización sujeta a cambios sin previo aviso.</p>`; }
function textoWhatsapp(){ const c=calcTotals(); const lineasTramos=tramos.length?tramos.map((t,i)=>{const mc=medidaCobradaProducto(t.producto,t.variante,t.medida), p=precioBase(t.producto,t.variante,t.medida,t.motorModelo), ce=esRipplefold(t.producto,t.variante)?precioCorrederasExtra(t.correderasExtraPct,t.medida,t.producto):{sin:0,con:0}, sop=soporteAutoInfo(t.producto,t.medida,t.instalacionTradTecho||'techo',t.soporteMuroTrad||'techo',t.colorDecorativo||''), uni=unionAutoInfo(t.producto,t.variante,t.medida), tap=taponDecorativoInfo(t.producto,t.taponDecorativo||'',t.colorDecorativo||''), extra=(esRipplefold(t.producto,t.variante)&&t.correderasExtraPct&&t.correderasExtraPct!=='0')?` + correderas extras ${t.correderasExtraPct}% (${money(precioMostrado(ce))})`:''; const altura=t.alturaCordon?` - altura cordón ${Number(t.alturaCordon).toFixed(2)} m`:''; const color=t.colorDecorativo?` - color ${t.colorDecorativo}`:''; const lado=t.ladoCarroMaestro?` - carro maestro ${t.ladoCarroMaestro}`:''; const motorTxt=t.motorModelo?` - motor ${t.motorModelo}`:''; const varMot=t.varianteMotorizado?` - tipo/variante motorizado ${t.varianteMotorizado}`:''; const instal=t.instalacionTradTecho?` - ${t.instalacionTradTecho==='muro'?'riel de muro':'riel de techo'}`:''; const sopTxt=sop.aplica?` - soportes ${sop.cantidad} pzas ${sop.nombre} (${money(precioMostrado(sop.total))})`:''; const uniTxt=uni.aplica?` - unión obligatoria ${uni.cantidad} pza ${uni.nombre} (${money(precioMostrado(uni.total))})`:''; const tapTxt=tap.aplica?` - tapones finales ${tap.cantidad} pzas ${tap.nombre} (${money(precioMostrado(tap.total))})`:''; return `${i+1}. ${t.ubicacion} - ${nombreProducto(t.producto)} / ${t.variante} - ${t.medida.toFixed(2)} m (cobra ${mc.toFixed(2)} m)${color}${motorTxt}${varMot}${lado}${altura}${instal}${sopTxt}${uniTxt}${tapTxt}${extra} x ${t.cantidad}: ${money((precioMostrado(p)+precioMostrado(ce)+precioMostrado(sop.total)+precioMostrado(uni.total)+precioMostrado(tap.total))*t.cantidad)}`;}).join('\n'):'Sin productos agregados'; const lineasAcc=accs.length?accs.map((a,i)=>`${i+1}. ${a.nombre} x ${a.cantidad}: ${money((conIva()?a.precio.con:a.precio.sin)*a.cantidad)}`).join('\n'):'Sin accesorios'; return `*Cotización de cortineros*
Grupo Zacbe · Drapery & Carpet

Cliente: ${$('cliente').value||'Cliente'}
Fecha: ${$('fecha').value||''}
Vendedor: ${$('vendedor').value||''}

*Productos*
${lineasTramos}

*Accesorios*
${lineasAcc}

Subtotal productos: ${money(c.stSin)}
Soportes automáticos: ${money(c.sopSin)}
Uniones obligatorias: ${money(c.uniSin)}
Tapones finales decorativos: ${money(c.tapSin)}
Subtotal accesorios: ${money(c.saSin)}
Correderas extras: ${money(c.ceSin)}
Logística: ${money(c.logSin)}
IVA: ${money(c.iva)}
*Total: ${money(c.totalCon)}*

Observaciones: ${$('notas').value||'Sin observaciones'}
`;}
function validarUnionesCotizacion(){ return true; }
function enviarWhatsapp(){ const texto=encodeURIComponent('Hola, te envío esta cotización.'); const url=`https://wa.me/528112883151?text=${texto}`; window.open(url,'_blank'); }
function limpiar(){ if(confirm('¿Limpiar la cotización?')){tramos=[];accs=[];['cliente','telefonoCliente','vendedor','ubicacion','medida','alturaCordon','ladoCarroMaestro','colorDecorativo','taponDecorativo','notas'].forEach(id=>$(id).value='');$('ivaOpcional').checked=true;$('cantidad').value=1;$('accCantidad').value=1;$('correderasExtraPct').value='0';render();} }
function escapeHtml(str){return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function init(){ $('fecha').valueAsDate=new Date(); if($('ivaOpcional')) $('ivaOpcional').checked=true; $('producto').innerHTML=productosArr.map(p=>`<option value="${escapeHtml(p.title)}">${escapeHtml(nombreProducto(p.title))}</option>`).join(''); actualizarVariante(); actualizarAccesorios(); $('producto').addEventListener('change',()=>{actualizarVariante();render();}); $('variante').addEventListener('change',()=>{actualizarAccesorios();render();}); ['variante','redondeo','cliente','telefonoCliente','vendedor','notas','medida','ivaOpcional','correderasExtraPct','alturaCordon','ladoCarroMaestro','varianteMotorizado','motorModelo','colorDecorativo','taponDecorativo','instalacionTradTecho','soporteMuroTrad'].forEach(id=>$(id).addEventListener('input',render)); $('btnAgregarTramo').addEventListener('click',agregarTramo); $('btnAgregarAccesorio').addEventListener('click',agregarAccesorio); $('btnPrint').addEventListener('click',()=>{ if(validarUnionesCotizacion()) window.print(); }); $('btnWhatsapp').addEventListener('click',enviarWhatsapp); $('btnLimpiar').addEventListener('click',limpiar); $('tablaTramos').addEventListener('click',e=>{if(e.target.matches('[data-del-tramo]'))delTramo(Number(e.target.dataset.delTramo));}); $('tablaAcc').addEventListener('click',e=>{if(e.target.matches('[data-del-acc]'))delAcc(Number(e.target.dataset.delAcc));}); render(); }
document.addEventListener('DOMContentLoaded',init);
})();
