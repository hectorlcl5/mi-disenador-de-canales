import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import logoCortiza from './logo-cortiza.png';
import CorteLateralCanal from './CorteLateralCanal';

const DisenadorCanales = () => {
  // ==========================================
  // 1. ESTADOS DE CONFIGURACIÓN PRINCIPAL
  // ==========================================
  const [projectId, setProjectId] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState("Canales_xxxx");
  const [tituloHoja, setTituloHoja] = useState("DISEÑO PARA FABRICACIÓN DE CANALES CUBIERTA BODEGA");
  const [nombreEje, setNombreEje] = useState("Canal eje A");
  const [numColumnasInput, setNumColumnasInput] = useState("6");
  const [numColumnas, setNumColumnas] = useState(6);
  const [calibreCanal, setCalibreCanal] = useState("20");

  const [colorInterior, setColorInterior] = useState("Blanco");
  const [anchoAbertura, setAnchoAbertura] = useState("530");
  const [ladoAbrir, setLadoAbrir] = useState("ninguno");
  const [ladoCubierta, setLadoCubierta] = useState("ninguno");

  const [invertirNumeracion, setInvertirNumeracion] = useState(false);
  const [invertirTramos, setInvertirTramos] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [configColumnas, setConfigColumnas] = useState({});

  // ==========================================
  // 2. ESTADOS DE DOBLECES Y MATRIZ 3D
  // ==========================================
  const [pliegues, setPliegues] = useState([
    { longitud: 50, angulo: 0, detalle: "Pestaña" },
    { longitud: 220, angulo: 90, detalle: "Aleta Izq" },
    { longitud: 400, angulo: 0, detalle: "Fondo" },
    { longitud: 220, angulo: 270, detalle: "Aleta Der" },
    { longitud: 50, angulo: 0, detalle: "Pestaña Cubierta" }
  ]);
  const [nuevoLongitud, setNuevoLongitud] = useState("100");
  const [nuevoAngulo, setNuevoAngulo] = useState("90");
  const [nuevoDetalle, setNuevoDetalle] = useState("Nuevo pliegue");

  const [matrizPliegues, setMatrizPliegues] = useState({});
  const [hitoSeleccionado, setHitoSeleccionado] = useState("viga-0");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [listaProyectos, setListaProyectos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [menuFlotante, setMenuFlotante] = useState({
    visible: false, x: 0, y: 0, columnaId: null, esTraslapo: false, traslapoIndex: null
  });

  const tieneP1 = pliegues.some(p => p.detalle === "Pestaña" || p.detalle === "Pestaña Recuperada");
  const tieneUltima = pliegues.some(p => p.detalle === "Pestaña Cubierta" || p.detalle === "Cubierta Recuperada");

  // ==========================================
  // 4. EFECTOS (USEEFFECTS)
  // ==========================================
  useEffect(() => {
    if (numColumnasInput !== "") {
      const valor = parseInt(numColumnasInput);
      if (!isNaN(valor) && valor >= 2 && valor <= 25) setNumColumnas(valor);
    }
  }, [numColumnasInput]);

  useEffect(() => {
    const nuevaConfig = { ...configColumnas };
    let huboCambio = false;
    for (let i = 0; i < numColumnas; i++) {
      if (!nuevaConfig[i]) {
        nuevaConfig[i] = {
          unirDerecha: false, longitudDerecha: 2000, pendiente: 0,
          planaCentro: 0, planaDerecha: 0, planaIzquierda: 0,
          soscoCentro: false, soscoIzquierdo: false, soscoDerecho: false, dosSoscos: false,
          diametroSosco: '4"', listaTraslapos: []
        };
        huboCambio = true;
      }
    }
    if (huboCambio) setConfigColumnas(nuevaConfig);
  }, [numColumnas]);

  useEffect(() => {
    const nuevaMatriz = { ...matrizPliegues };
    let actualizo = false;
    const hitos = obtenerHitosOrdenados();
    hitos.forEach(hito => {
      if (!nuevaMatriz[hito.keyHash] || nuevaMatriz[hito.keyHash].length !== pliegues.length) {
        nuevaMatriz[hito.keyHash] = pliegues.map(p => ({ ...p }));
        actualizo = true;
      }
    });
    if (actualizo) setMatrizPliegues(nuevaMatriz);
  }, [pliegues, numColumnas, configColumnas]);


  // ==========================================
  // 5. FUNCIONES GEOMÉTRICAS Y DE HITOS
  // ==========================================
  const generarColumnasLineales = () => {
    const cols = [];
    const anchoMaxSvn = 1000;
    const anchoVisualPartePlana = 25;

    const colInicialConfig = configColumnas[0] || {};
    const colFinalConfig = configColumnas[numColumnas - 1] || {};

    const tienePlanaIzquierda = parseFloat(colInicialConfig.planaIzquierda) > 0 || parseFloat(colInicialConfig.planaCentro) > 0;
    const tienePlanaDerecha = parseFloat(colFinalConfig.planaDerecha) > 0 || parseFloat(colFinalConfig.planaCentro) > 0;

    const inicioRealX = tienePlanaIzquierda ? (15 + anchoVisualPartePlana) : 15;
    const finRealX = tienePlanaDerecha ? (anchoMaxSvn - 15 - anchoVisualPartePlana) : (anchoMaxSvn - 15);
    const anchoUtilCalculado = finRealX - inicioRealX;

    for (let i = 0; i < numColumnas; i++) {
      const x = inicioRealX + (numColumnas > 1 ? i * (anchoUtilCalculado / (numColumnas - 1)) : 0);
      const numeroMostrado = invertirNumeracion ? (numColumnas - i) : (i + 1);
      cols.push({ id: i, x, numero: numeroMostrado });
    }
    return cols;
  };

  const columnasCalculadas = generarColumnasLineales();

  const obtenerHitosOrdenados = () => {
    const hitos = [];
    columnasCalculadas.forEach((col, cIdx) => {
      hitos.push({ keyHash: `viga-${col.id}`, label: `Viga ${col.numero}` });
      if (cIdx < columnasCalculadas.length - 1) {
        const listaT = configColumnas[col.id]?.listaTraslapos || [];
        listaT.forEach((_, tIdx) => {
          hitos.push({ keyHash: `traslapo-${col.id}-${tIdx}`, label: `Traslapo T${tIdx + 1} de Viga ${col.numero}` });
        });
      }
    });
    return hitos;
  };

  const hitosOrdenados = obtenerHitosOrdenados();

  // ==========================================
  // 6. FUNCIONES CRUD Y DUPLICACIÓN ESTRUCTURAL
  // ==========================================

  // NUEVO DOCUMENTO (REINICIO TOTAL DE VARIABLES)
  const nuevoDocumento = () => {
    if (window.confirm("¿Crear un nuevo diseño? Se limpiará toda la pantalla.")) {
      setProjectId(null);
      setConfigColumnas({});
      setNumColumnasInput("6");
      setNumColumnas(6);
      setMatrizPliegues({});
      setNombreArchivo("Canales_xxxx");
      setTituloHoja("DISEÑO PARA FABRICACIÓN DE CANALES CUBIERTA BODEGA");
      setNombreEje("Canal eje A");
      setCalibreCanal("20");
      setColorInterior("Blanco");
      setAnchoAbertura("530");
      setLadoAbrir("ninguno");
      setLadoCubierta("ninguno");
      setPliegues([
        { longitud: 50, angulo: 0, detalle: "Pestaña" },
        { longitud: 220, angulo: 90, detalle: "Aleta Izq" },
        { longitud: 400, angulo: 0, detalle: "Fondo" },
        { longitud: 220, angulo: 270, detalle: "Aleta Der" },
        { longitud: 50, angulo: 0, detalle: "Pestaña Cubierta" }
      ]);
      setMensaje("✨ Documento Nuevo Creado");
    }
  };

  const duplicarEstructuraViga1 = () => {
    if (!configColumnas[0]) return;
    if (window.confirm("¿Copiar configuración de Viga 1 a toda la canal?")) {
      const configBase = configColumnas[0];
      const nuevaConfig = { ...configColumnas };
      for (let i = 1; i < numColumnas; i++) {
        nuevaConfig[i] = {
          ...configBase,
          listaTraslapos: configBase.listaTraslapos ? configBase.listaTraslapos.map(t => ({ ...t })) : []
        };
      }
      setConfigColumnas(nuevaConfig);
      setMensaje("📋 Diseño estructural copiado a todas.");
    }
  };

  const restaurarPlantillaEstandar = () => {
    if (window.confirm("¿Seguro que deseas restaurar la canal a las 5 caras estándar?")) {
      const plieguesEstandar = [
        { longitud: 50, angulo: 0, detalle: "Pestaña" },
        { longitud: 220, angulo: 90, detalle: "Aleta Izq" },
        { longitud: 400, angulo: 0, detalle: "Fondo" },
        { longitud: 220, angulo: 270, detalle: "Aleta Der" },
        { longitud: 50, angulo: 0, detalle: "Pestaña Cubierta" }
      ];
      setPliegues(plieguesEstandar);
      setMatrizPliegues({});
      setMensaje("✅ Plantilla estándar restaurada.");
    }
  };

  const agregarPliegue = () => {
    if (!nuevoLongitud || !nuevoAngulo) return;
    setPliegues([...pliegues, { longitud: parseFloat(nuevoLongitud) || 0, angulo: parseFloat(nuevoAngulo) || 0, detalle: nuevoDetalle }]);
    setNuevoLongitud(""); setNuevoAngulo(""); setNuevoDetalle("");
  };

  const eliminarPliegue = (index) => {
    const copia = [...pliegues];
    copia.splice(index, 1);
    setPliegues(copia);
  };

  const toggleCaraExtrema = (tipo) => {
    const copiaPliegues = [...pliegues];
    const copiaMatriz = { ...matrizPliegues };

    if (tipo === 'P1') {
      if (tieneP1) {
        copiaPliegues.shift();
        Object.keys(copiaMatriz).forEach(key => { if (Array.isArray(copiaMatriz[key])) copiaMatriz[key].shift(); });
        setMensaje("🗑️ Cara P1 eliminada de la canal.");
      } else {
        const nuevaP1 = { longitud: 80, angulo: 90, detalle: "Pestaña" };
        copiaPliegues.unshift(nuevaP1);
        Object.keys(copiaMatriz).forEach(key => { if (Array.isArray(copiaMatriz[key])) copiaMatriz[key].unshift({ ...nuevaP1 }); });
        setMensaje("➕ Cara P1 reincorporada.");
      }
    } else if (tipo === 'ULTIMA') {
      if (tieneUltima) {
        copiaPliegues.pop();
        Object.keys(copiaMatriz).forEach(key => { if (Array.isArray(copiaMatriz[key])) copiaMatriz[key].pop(); });
        setMensaje("🗑️ Última cara eliminada.");
      } else {
        const nuevaUlt = { longitud: 40, angulo: 0, detalle: "Pestaña Cubierta" };
        copiaPliegues.push(nuevaUlt);
        Object.keys(copiaMatriz).forEach(key => { if (Array.isArray(copiaMatriz[key])) copiaMatriz[key].push({ ...nuevaUlt }); });
        setMensaje("➕ Última cara reincorporada.");
      }
    }
    setPliegues(copiaPliegues);
    setMatrizPliegues(copiaMatriz);
  };

  const modificarPliegue = (index, campo, valor) => {
    const copia = [...pliegues];
    copia[index] = { ...copia[index], [campo]: valor };
    setPliegues(copia);
  };

  const modificarPliegueDeHito = (index, campo, valor) => {
    const copiaMatriz = { ...matrizPliegues };
    if (!copiaMatriz[hitoSeleccionado]) copiaMatriz[hitoSeleccionado] = pliegues.map(p => ({ ...p }));
    copiaMatriz[hitoSeleccionado][index] = { ...copiaMatriz[hitoSeleccionado][index], [campo]: valor };
    setMatrizPliegues(copiaMatriz);
  };

  const duplicarMedidasEnTodosLosHitos = () => {
    if (window.confirm("¿Copiar el patrón de medidas de la Viga 1 y sus traslapos a toda la canal?")) {
      const copiaMatriz = { ...matrizPliegues };

      // 1. Extraemos las medidas exactas configuradas en la Viga 1 (índice 0)
      const medidasViga1 = copiaMatriz['viga-0'] || pliegues.map(p => ({ ...p }));

      // 2. Extraemos las medidas de los traslapos que pertenezcan a la Viga 1
      const traslaposViga1 = [];
      const numTraslaposV1 = (configColumnas[0]?.listaTraslapos || []).length;
      for (let t = 0; t < numTraslaposV1; t++) {
        const keyT = `traslapo-0-${t}`;
        traslaposViga1.push(copiaMatriz[keyT] || pliegues.map(p => ({ ...p })));
      }

      // 3. Replicamos este "Patrón" a las demás vigas (desde la 2 en adelante)
      for (let i = 1; i < numColumnas; i++) {
        // Pegamos las medidas base en la Viga i
        copiaMatriz[`viga-${i}`] = medidasViga1.map(p => ({ ...p }));

        // Pegamos las medidas en los traslapos de la Viga i
        const numTraslaposI = (configColumnas[i]?.listaTraslapos || []).length;
        for (let t = 0; t < numTraslaposI; t++) {
          const keyT_I = `traslapo-${i}-${t}`;
          // Si la viga 1 tenía un traslapo equivalente, usamos esa medida. Si no, usamos la medida de la Viga 1 como respaldo.
          const medidasAUsar = traslaposViga1[t] || medidasViga1;
          copiaMatriz[keyT_I] = medidasAUsar.map(p => ({ ...p }));
        }
      }

      setMatrizPliegues(copiaMatriz);
      setMensaje("📋 Patrón de medidas de Viga 1 copiado a todas.");
    }
  };

  const reiniciarMatrizHitos = () => {
    setMatrizPliegues({});
    setMensaje("🗑️ Restablecido a plantilla base.");
  };

  const plieguesHitoActual = matrizPliegues[hitoSeleccionado] || pliegues.map(p => ({ ...p }));
  const desarrolloHitoActual = plieguesHitoActual.reduce((s, p) => s + (parseFloat(p.longitud) || 0), 0);
  const alertaDesarrollo = desarrolloHitoActual < 1000 ? { color: '#16a34a', texto: '✅ (Estándar 1m)' } : desarrolloHitoActual < 1200 ? { color: '#ea580c', texto: '⚠️ (Especial 1.2m)' } : { color: '#dc2626', texto: '🚨 EXCEDE MÁXIMO' };

  // ==========================================
  // 8. COMUNICACIÓN CON BD
  // ==========================================
  const guardarCanalDB = async () => {
    setMensaje("Guardando en BD...");
    const payload = {
      nombre_proyecto: nombreArchivo,
      tramos: { modulo: "canales", tituloHoja, nombreEje, numColumnas, calibreCanal, invertirNumeracion, configColumnas, pliegues, matrizPliegues, colorInterior, anchoAbertura, ladoAbrir, ladoCubierta },
      ultima_actualizacion: new Date()
    };
    let res = projectId ? await supabase.from('diseños_canales').update(payload).eq('id', projectId) : await supabase.from('diseños_canales').insert([payload]).select();
    if (!res.error && res.data?.length > 0) setProjectId(res.data[0].id);
    setMensaje(res.error ? "❌ Error de guardado" : "✅ Respaldo exitoso");
  };

  const abrirModalCarga = async () => {
    setModalAbierto(true); setCargandoLista(true);
    const { data, error } = await supabase.from('diseños_canales').select('id, nombre_proyecto, ultima_actualizacion, tramos').order('ultima_actualizacion', { ascending: false });
    if (!error) setListaProyectos(data.filter(p => p.tramos?.modulo === "canales"));
    setCargandoLista(false);
  };

  const cargarProyectoEspecifico = (p) => {
    const info = p.tramos;
    setProjectId(p.id);
    setNombreArchivo(p.nombre_proyecto);
    setTituloHoja(info.tituloHoja || "");
    setNombreEje(info.nombreEje || "");
    setNumColumnasInput((info.numColumnas || 6).toString());
    setNumColumnas(info.numColumnas || 6);
    setCalibreCanal(info.calibreCanal || "20");
    setColorInterior(info.colorInterior || "Blanco");
    setAnchoAbertura(info.anchoAbertura || "530");
    setLadoAbrir(info.ladoAbrir || "ninguno");
    setLadoCubierta(info.ladoCubierta || "ninguno");
    setInvertirNumeracion(!!info.invertirNumeracion);
    setConfigColumnas(info.configColumnas || {});
    if (info.pliegues) setPliegues(info.pliegues);
    if (info.matrizPliegues) setMatrizPliegues(info.matrizPliegues);
    setModalAbierto(false);
    setMensaje("✅ Diseño cargado");
  };

  const abrirMenuColumna = (e, colId) => { e.preventDefault(); setMenuFlotante({ visible: true, x: e.clientX, y: e.clientY, columnaId: colId, esTraslapo: false, traslapoIndex: null }); };
  const abrirMenuTraslapo = (e, colId, index) => { e.preventDefault(); e.stopPropagation(); setMenuFlotante({ visible: true, x: e.clientX, y: e.clientY, columnaId: colId, esTraslapo: true, traslapoIndex: index }); };

  const actualizarPropiedadColumna = (colId, campo, valor) => {
    let valorFinal = valor;
    if (campo === 'longitudDerecha' && parseFloat(valor) > 6000) valorFinal = "6000";
    setConfigColumnas(prev => ({ ...prev, [colId]: { ...prev[colId], [campo]: valorFinal } }));
  };

  const actualizarPropiedadTraslapo = (colId, index, campo, valor) => {
    let valorFinal = valor;
    if ((campo === 'longitud' || campo === 'longitudCierre') && parseFloat(valor) > 6000) valorFinal = "6000";
    setConfigColumnas(prev => {
      const listaOriginal = [...(prev[colId]?.listaTraslapos || [])];
      listaOriginal[index] = { ...listaOriginal[index], [campo]: valorFinal };
      return { ...prev, [colId]: { ...prev[colId], listaTraslapos: listaOriginal } };
    });
  };

  const agregarNuevoTraslapoCadena = (colId) => {
    setConfigColumnas(prev => {
      const listaOriginal = [...(prev[colId]?.listaTraslapos || [])];
      listaOriginal.push({ longitud: 3000, pendiente: 0, conectarA: 'columna', longitudCierre: 3000, pendienteCierre: 0 });
      return { ...prev, [colId]: { ...prev[colId], unirDerecha: false, listaTraslapos: listaOriginal } };
    });
    setMenuFlotante({ ...menuFlotante, visible: false });
  };

  const eliminarTraslapoEspecifico = (colId, index) => {
    setConfigColumnas(prev => {
      const listaOriginal = [...(prev[colId]?.listaTraslapos || [])];
      listaOriginal.splice(index, 1);
      return { ...prev, [colId]: { ...prev[colId], listaTraslapos: listaOriginal } };
    });
    setMenuFlotante({ ...menuFlotante, visible: false });
  };

  const eliminarUltimoTraslapo = (colId) => {
    setConfigColumnas(prev => {
      const listaOriginal = [...(prev[colId]?.listaTraslapos || [])];
      listaOriginal.pop();
      return { ...prev, [colId]: { ...prev[colId], listaTraslapos: listaOriginal } };
    });
    setMenuFlotante({ ...menuFlotante, visible: false });
  };

  const setSoscoType = (tipo) => {
    setConfigColumnas(prev => ({
      ...prev, [menuFlotante.columnaId]: { ...prev[menuFlotante.columnaId], soscoCentro: tipo === 'c', soscoIzquierdo: tipo === 'i', soscoDerecho: tipo === 'd', dosSoscos: tipo === 'dos' }
    }));
  };

  const fuentes = numColumnas <= 6 ? { cotas: 9.5, soscos: 8, columnas: 13 } : numColumnas <= 12 ? { cotas: 8, soscos: 7, columnas: 11 } : { cotas: 6.5, soscos: 5.5, columnas: 9 };

  // ==========================================
  // 10. MOTOR GEOMÉTRICO PLANTA (SVG)
  // ==========================================
  const datosGeometria = (() => {
    let puntosEstructura = {};
    let yActual = 75;
    const anchoFijoPlana = 25;

    columnasCalculadas.forEach((col, index) => {
      const config = configColumnas[col.id] || { listaTraslapos: [] };
      const listaT = config.listaTraslapos || [];
      puntosEstructura[col.id] = { xCol: col.x, yInicioColumna: yActual, lineas: [], cotas: [], soscosSVG: [], ejesTraslapos: [] };

      const renderizarSoscosLocal = (x, y) => {
        const soscos = [];
        const altoSosco = 13; const anchoSosco = 7;
        const diam = config.diametroSosco || '4"';

        const crearAux = (xPos, k) => (
          <g key={k}>
            <rect x={xPos - (anchoSosco + 4) / 2} y={y} width={anchoSosco + 4} height="3" fill="#7f8c8d" rx="1" />
            <rect x={xPos - anchoSosco / 2} y={y + 3} width={anchoSosco} height={altoSosco - 3} fill="#bdc3c7" />
            <rect x={xPos - anchoSosco / 2} width={anchoSosco / 3} y={y + 3} height={altoSosco - 3} fill="#95a5a6" opacity="0.4" />
            <text x={xPos + (anchoSosco / 2) + 2} y={y + (altoSosco / 2) + 3} fontSize={fuentes.soscos} fill="red" fontWeight="bold">{diam}</text>
          </g>
        );

        if (config.soscoCentro) soscos.push(crearAux(x, 'c'));
        if (config.soscoIzquierdo) soscos.push(crearAux(x - anchoFijoPlana / 2, 'i'));
        if (config.soscoDerecho) soscos.push(crearAux(x + anchoFijoPlana / 2, 'd'));
        if (config.dosSoscos) { soscos.push(crearAux(x - anchoFijoPlana / 2, 'di')); soscos.push(crearAux(x + anchoFijoPlana / 2, 'dd')); }
        return soscos;
      };

      if (parseFloat(config.planaIzquierda) > 0) {
        puntosEstructura[col.id].lineas.push({ x1: col.x - anchoFijoPlana, y1: yActual, x2: col.x, y2: yActual, color: "blue", width: 2 });
        puntosEstructura[col.id].cotas.push({ x: col.x - anchoFijoPlana / 2, y: yActual + 28, texto: config.planaIzquierda });
        puntosEstructura[col.id].soscosSVG.push(...renderizarSoscosLocal(col.x - anchoFijoPlana / 2, yActual));
      }
      if (parseFloat(config.planaCentro) > 0) {
        puntosEstructura[col.id].lineas.push({ x1: col.x - anchoFijoPlana / 2, y1: yActual, x2: col.x + anchoFijoPlana / 2, y2: yActual, color: "blue", width: 2 });
        puntosEstructura[col.id].cotas.push({ x: col.x, y: yActual + 28, texto: config.planaCentro });
        puntosEstructura[col.id].soscosSVG.push(...renderizarSoscosLocal(col.x, yActual));
      }
      if (parseFloat(config.planaDerecha) > 0) {
        puntosEstructura[col.id].lineas.push({ x1: col.x, y1: yActual, x2: col.x + anchoFijoPlana, y2: yActual, color: "blue", width: 2 });
        puntosEstructura[col.id].cotas.push({ x: col.x + anchoFijoPlana / 2, y: yActual + 28, texto: config.planaDerecha });
        puntosEstructura[col.id].soscosSVG.push(...renderizarSoscosLocal(col.x + anchoFijoPlana / 2, yActual));
      }

      if (index < columnasCalculadas.length - 1) {
        const sigCol = columnasCalculadas[index + 1];
        let inicioX = col.x + (parseFloat(config.planaDerecha) > 0 ? anchoFijoPlana : parseFloat(config.planaCentro) > 0 ? anchoFijoPlana / 2 : 0);
        let finX = sigCol.x - (parseFloat(configColumnas[sigCol.id]?.planaIzquierda) > 0 ? anchoFijoPlana : parseFloat(configColumnas[sigCol.id]?.planaCentro) > 0 ? anchoFijoPlana / 2 : 0);
        const anchoMaxDisponibleX = finX - inicioX;

        // 💡 LÓGICA RESTAURADA Y PROPORCIONAL PARA LOS TRASLAPOS DE VISTA 1
        if (listaT.length > 0) {
          const totalSegmentos = listaT.length + (listaT[listaT.length - 1].conectarA === 'columna' ? 1 : 0);
          const pixelMinimoGarantizado = Math.max(14, 22 - (numColumnas * 0.3));
          const pixelesFijosReservados = totalSegmentos * pixelMinimoGarantizado;
          const pixelesRemanentesProporcionales = Math.max(0, anchoMaxDisponibleX - pixelesFijosReservados);

          let sumatoriaMilimetrosTotal = 0;
          listaT.forEach(t => sumatoriaMilimetrosTotal += (parseFloat(t.longitud) || 0));
          const ultimoT = listaT[listaT.length - 1];
          if (ultimoT.conectarA === 'columna') sumatoriaMilimetrosTotal += (parseFloat(ultimoT.longitudCierre) || 0);

          let xCursor = inicioX;
          listaT.forEach((traslapo, idx) => {
            const mmTramoActual = parseFloat(traslapo.longitud) || 0;
            const parteProporcional = sumatoriaMilimetrosTotal > 0 ? (mmTramoActual / sumatoriaMilimetrosTotal) * pixelesRemanentesProporcionales : 0;
            const xSiguiente = xCursor + pixelMinimoGarantizado + parteProporcional;

            const pend = parseFloat(traslapo.pendiente) || 0;
            const dY = (xSiguiente - xCursor) * Math.sin((pend * Math.PI) / 180);
            const yFinal = yActual + dY;

            puntosEstructura[col.id].lineas.push({ x1: xCursor, y1: yActual, x2: xSiguiente, y2: yFinal, color: "#2c3e50", width: 1.8 });
            const desfaseY = (idx % 2 === 0) ? -6 : -15;
            puntosEstructura[col.id].cotas.push({ x: (xCursor + xSiguiente) / 2, y: yActual + (dY / 2) + desfaseY, texto: traslapo.longitud });
            puntosEstructura[col.id].ejesTraslapos.push({ x: xSiguiente, clickY: yFinal, index: idx });
            xCursor = xSiguiente; yActual = yFinal;
          });

          if (ultimoT.conectarA === 'columna') {
            const pendCierre = parseFloat(ultimoT.pendienteCierre) || 0;
            const dYCierre = (finX - xCursor) * Math.sin((pendCierre * Math.PI) / 180);
            puntosEstructura[col.id].lineas.push({ x1: xCursor, y1: yActual, x2: finX, y2: yActual + dYCierre, color: "#2c3e50", width: 1.8 });
            const desfaseY = (listaT.length % 2 === 0) ? -6 : -15;
            puntosEstructura[col.id].cotas.push({ x: (xCursor + finX) / 2, y: yActual + (dYCierre / 2) + desfaseY, texto: ultimoT.longitudCierre });
            yActual = yActual + dYCierre;
          }
        } else if (config.unirDerecha) {
          const pend = parseFloat(config.pendiente) || 0;
          const dY = (finX - inicioX) * Math.sin((pend * Math.PI) / 180);
          puntosEstructura[col.id].lineas.push({ x1: inicioX, y1: yActual, x2: finX, y2: yActual + dY, color: "#2c3e50", width: 1.8 });
          puntosEstructura[col.id].cotas.push({ x: (inicioX + finX) / 2, y: yActual + (dY / 2) - 6, texto: config.longitudDerecha });
          yActual = yActual + dY;
        }
      }
    });
    return puntosEstructura;
  })();

  const colActual = menuFlotante.columnaId !== null ? configColumnas[menuFlotante.columnaId] : null;
  const traslapoActual = (menuFlotante.esTraslapo && colActual && colActual.listaTraslapos && menuFlotante.traslapoIndex !== null)
    ? colActual.listaTraslapos[menuFlotante.traslapoIndex]
    : null;

  return (
    <div className="main-container" style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Arial', backgroundColor: '#f0f2f5', overflow: 'hidden' }} onClick={() => setMenuFlotante({ ...menuFlotante, visible: false })}>

      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body, html, .main-container, .right-panel { 
              background-color: white !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              height: auto !important; 
              overflow: visible !important;
              display: block !important;
            }
            @page { 
              size: letter landscape; 
              margin: 0.2cm; 
            }
            .carta-contenedor {
              width: 100% !important;
              max-width: 1000px !important;
              margin: 0 auto !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              page-break-after: avoid !important;
            }
            * { overflow: visible !important; }
          }
        `}
      </style>

      {/* ============================================================== */}
      {/* 🎛️ PANEL IZQUIERDO (CON SCROLL INDEPENDIENTE)                    */}
      {/* ============================================================== */}
      <div className="sidebar no-print" style={{ width: '215px', minWidth: '215px', height: '100%', backgroundColor: '#fff', borderRight: '2px solid #cbd5e1', overflowY: 'auto', padding: '10px', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
          {/* Fila 1: Nuevo, Abrir, Guardar */}
          <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
            <button onClick={nuevoDocumento} style={{ ...btnStyle, flex: 1, backgroundColor: '#f39c12', color: '#fff', fontWeight: 'bold', border: 'none' }}>Nuevo</button>
            <button onClick={abrirModalCarga} style={{ ...btnStyle, flex: 1, backgroundColor: '#f39c12', color: '#fff', fontWeight: 'bold', border: 'none' }}>Abrir</button>
            <button onClick={guardarCanalDB} style={{ ...btnStyle, flex: 1, backgroundColor: '#28a745', color: '#fff', fontWeight: 'bold', border: 'none' }}>Guardar</button>
          </div>
          {/* Fila 2: Imprimir */}
          <button onClick={() => window.print()} style={{ ...btnStyle, width: '100%', backgroundColor: '#5bc0de', color: '#fff', fontWeight: 'bold', border: 'none', padding: '8px' }}>Imprimir</button>
        </div>

        <p style={{ color: mensaje.includes("⚠️") || mensaje.includes("❌") || mensaje.includes("🚨") ? '#dc2626' : '#2563eb', fontSize: '11px', fontWeight: 'bold', margin: '4px 0' }}>{mensaje}</p>

        <label style={labelTitleStyle}>PROYECTO / ARCHIVO:</label>
        <input type="text" style={{ ...inputStyle, marginBottom: '4px' }} value={nombreArchivo} onChange={e => setNombreArchivo(e.target.value)} />

        <label style={labelTitleStyle}>TÍTULO HOJA:</label>
        <input type="text" style={{ ...inputStyle, marginBottom: '4px' }} value={tituloHoja} onChange={e => setTituloHoja(e.target.value)} />

        <label style={labelTitleStyle}>IDENTIFICACIÓN EJE:</label>
        <input type="text" style={{ ...inputStyle, marginBottom: '4px', color: 'red', fontWeight: 'bold' }} value={nombreEje} onChange={e => setNombreEje(e.target.value)} />

        <div style={cardStyle}>
          <label style={{ ...cardTitleStyle, fontSize: '9.5px' }}>Estructura y Calibres</label>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ fontSize: '9px' }}>N° Vigas:</label>
              <input type="number" style={inputStyle} value={numColumnasInput} onChange={e => setNumColumnasInput(e.target.value)} />
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ fontSize: '9px' }}>Calibre:</label>
              <select style={{ ...inputStyle, padding: '4px' }} value={calibreCanal} onChange={e => setCalibreCanal(e.target.value)}>
                <option value="18">Cal. 18</option>
                <option value="20">Cal. 20</option>
                <option value="22">Cal. 22</option>
              </select>
            </div>
          </div>
          <button onClick={duplicarEstructuraViga1} style={{ ...btnStyle, width: '100%', marginTop: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: '9px', fontWeight: 'bold' }}>📋 Copiar Diseño Viga 1 a Todas</button>
          <button onClick={() => setInvertirNumeracion(!invertirNumeracion)} style={{ ...btnStyle, width: '100%', marginTop: '4px', fontSize: '9px' }}>🔄 Voltear Sentido Numérico</button>
          <button onClick={() => setInvertirTramos(!invertirTramos)} style={{ ...btnStyle, width: '100%', marginTop: '4px', fontSize: '9px' }}>🔄 Voltear Tramos (T-1, T-2...)</button>
        </div>

        <div style={{ ...cardStyle, backgroundColor: '#f1f5f9', border: '1px solid #1e293b' }}>
          <label style={{ ...cardTitleStyle, color: '#1e293b', fontSize: '9.5px' }}>📐 MEDIDAS POR PUNTO</label>

          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            <select style={{ ...inputStyle, backgroundColor: '#fff', border: '2px solid #2563eb', fontWeight: 'bold', fontSize: '10px' }} value={hitoSeleccionado || "viga-0"} onChange={e => setHitoSeleccionado(e.target.value)}>
              {hitosOrdenados.map(h => <option key={h.keyHash} value={h.keyHash}>{h.label}</option>)}
            </select>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #94a3b8', marginBottom: '8px', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>Desarrollo:</span>
            <span style={{ fontSize: '11px', color: alertaDesarrollo.color }}>{desarrolloHitoActual} mm {alertaDesarrollo.texto}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexDirection: 'column' }}>
            <button onClick={duplicarMedidasEnTodosLosHitos} style={{ ...btnStyle, backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '9.5px' }}>📋 Copiar a todo</button>
            <button onClick={reiniciarMatrizHitos} style={{ ...btnStyle, backgroundColor: '#64748b', color: '#fff', border: 'none', fontSize: '9.5px' }}>🔄 Reiniciar</button>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexDirection: 'column' }}>
            <button onClick={() => toggleCaraExtrema('P1')} style={{ ...btnStyle, backgroundColor: tieneP1 ? '#ef4444' : '#1d4ed8', color: '#fff', border: 'none', fontSize: '9px', fontWeight: 'bold' }}>{tieneP1 ? '🗑️ Quitar Cara P1' : '➕ Devolver Cara P1'}</button>
            <button onClick={() => toggleCaraExtrema('ULTIMA')} style={{ ...btnStyle, backgroundColor: tieneUltima ? '#b91c1c' : '#2563eb', color: '#fff', border: 'none', fontSize: '9px', fontWeight: 'bold' }}>{tieneUltima ? '🗑️ Quitar Última' : '➕ Devolver Última'}</button>
          </div>

          <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#fff', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            {plieguesHitoActual.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '3px', marginBottom: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', width: '35px', color: '#2563eb' }}>P{idx + 1}:</span>
                <input type="text" style={{ ...inputMiniStyle, flex: 1, backgroundColor: '#fdfdfd', fontWeight: 'bold' }} value={p.longitud} onChange={e => modificarPliegueDeHito(idx, 'longitud', e.target.value)} />
                <span style={{ fontSize: '9px', color: '#64748b' }}>mm</span>
              </div>
            ))}
          </div>
        </div>

        {/* PLANTILLA BASE */}
        <div style={{ ...cardStyle, backgroundColor: '#fcfaf7', border: '1px solid #f39c12' }}>
          <label style={{ ...cardTitleStyle, color: '#d35400', fontSize: '9.5px' }}>Plantilla Base (Caras)</label>
          <button onClick={restaurarPlantillaEstandar} style={{ ...btnStyle, width: '100%', marginTop: '6px', marginBottom: '6px', backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #eab308', fontWeight: 'bold' }}>🔄 Restaurar 5 Caras Estándar</button>
          <div style={{ borderTop: '1px solid #fcd34d', borderBottom: '1px solid #fcd34d', padding: '6px 0', marginBottom: '6px', marginTop: '4px' }}>
            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#b45309', display: 'block', marginBottom: '2px' }}>Acabado de Color:</label>
            <select style={{ ...inputMiniStyle, fontSize: '10px' }} value={colorInterior} onChange={e => setColorInterior(e.target.value)}>
              <option value="Blanco">Interior Blanco / Exterior Gris</option>
              <option value="Gris">Interior Gris / Exterior Blanco</option>
            </select>
            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#b45309', display: 'block', marginTop: '6px', marginBottom: '2px' }}>Lado Cubierta:</label>
            <select style={{ ...inputMiniStyle, fontSize: '10px' }} value={ladoCubierta} onChange={e => setLadoCubierta(e.target.value)}>
              <option value="ninguno">Ninguno</option>
              <option value="P1">Pestaña P1 (Arriba)</option>
              <option value="P_ULTIMA">Última Pestaña (Abajo)</option>
            </select>
            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#b45309', display: 'block', marginTop: '6px', marginBottom: '2px' }}>Ancho de Abertura (mm):</label>
            <input type="text" style={{ ...inputMiniStyle, fontSize: '10px', fontWeight: 'bold', color: '#2563eb' }} value={anchoAbertura} onChange={e => setAnchoAbertura(e.target.value)} placeholder="Ej. 530" />
            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#b45309', display: 'block', marginTop: '6px', marginBottom: '2px' }}>Abrir Aleta (Ángulo Libre):</label>
            <select style={{ ...inputMiniStyle, fontSize: '10px' }} value={ladoAbrir} onChange={e => setLadoAbrir(e.target.value)}>
              <option value="ninguno">Ninguno (Todo Recto)</option>
              <option value="izquierdo">Abrir Aleta Izquierda</option>
              <option value="derecho">Abrir Aleta Derecha</option>
            </select>
          </div>

          <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '6px' }}>
            {pliegues.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '2px', marginBottom: '4px', alignItems: 'center', background: '#fff', padding: '2px' }}>
                <span style={{ fontSize: '8px', fontWeight: 'bold', minWidth: '15px' }}>P{idx + 1}</span>
                <input type="text" style={{ ...inputMiniStyle, width: '25px', fontSize: '9px' }} value={p.angulo} onChange={e => modificarPliegue(idx, 'angulo', e.target.value)} />
                <input type="text" style={{ ...inputMiniStyle, width: '35px', fontSize: '9px' }} value={p.longitud} onChange={e => modificarPliegue(idx, 'longitud', e.target.value)} />
                <input type="text" style={{ ...inputMiniStyle, flex: 1, fontSize: '9px' }} value={p.detalle} onChange={e => modificarPliegue(idx, 'detalle', e.target.value)} />
                <button onClick={() => eliminarPliegue(idx)} style={{ border: 'none', background: 'transparent', color: 'red', fontSize: '10px', padding: '0 2px' }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              <input type="number" style={{ ...inputMiniStyle, flex: 1 }} value={nuevoAngulo} placeholder="Ang (°)" onChange={e => setNuevoAngulo(e.target.value)} />
              <input type="number" style={{ ...inputMiniStyle, flex: 1 }} value={nuevoLongitud} placeholder="L (mm)" onChange={e => setNuevoLongitud(e.target.value)} />
            </div>
            <button onClick={agregarPliegue} style={{ ...btnStyle, backgroundColor: '#f39c12', color: '#fff', border: 'none' }}>➕ Añadir</button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 📄 PANEL DERECHO (CON SCROLL INDEPENDIENTE)                    */}
      {/* ============================================================== */}
      <div className="right-panel" style={{ flex: 1, padding: '5px', overflowY: 'auto', height: '100%', display: 'flex', justifyContent: 'center' }}>
        <div className="carta-contenedor" style={{ width: '100%', maxWidth: '1000px', background: '#fff', padding: '5px 12px', boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f39c12', paddingBottom: '2px', marginBottom: '2px' }}>
            <img src={logoCortiza} alt="Cortiza" style={{ width: '70px', objectFit: 'contain' }} />
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ margin: 0, fontSize: '17px', color: '#f39c12', fontWeight: 'bold' }}>{tituloHoja}</h1>
              <span style={{ fontSize: '12px', color: '#7f8c8d' }}>(Calibre {calibreCanal})</span>
            </div>
          </div>

          <div style={{ color: 'red', fontWeight: 'bold', fontSize: '12px', marginBottom: '2px' }}>{nombreEje}</div>

          {/* VISTA 1: DIBUJO GEOMÉTRICO (Altura escalable sin cortar el canvas) */}
          <div style={{ width: '100%', position: 'relative' }}>
            <svg width="100%" viewBox="0 0 1000 150" style={{ display: 'block' }}>

              {Object.keys(datosGeometria).map((colId) => {
                const geom = datosGeometria[colId];
                return (
                  <g key={`geom-${colId}`}>
                    {geom.lineas.map((l, idx) => (
                      <line key={idx} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={l.width} style={{ pointerEvents: 'none' }} />
                    ))}
                    {geom.ejesTraslapos.map((eje, tIdx) => (
                      <g key={`eje-t-${tIdx}`}>
                        <line x1={eje.x} y1={40} x2={eje.x} y2={120} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" style={{ pointerEvents: 'none' }} />
                        <text x={eje.x} y={eje.clickY + 4} fontSize="11" fill="blue" fontWeight="bold" textAnchor="middle" style={{ pointerEvents: 'none' }}>X</text>
                        <rect x={eje.x - 20} y={eje.clickY - 20} width="40" height="40" fill="transparent" style={{ cursor: 'context-menu' }} onContextMenu={(e) => abrirMenuTraslapo(e, colId, eje.index)} />
                      </g>
                    ))}
                  </g>
                );
              })}

              {Object.keys(datosGeometria).map((colId) => <g key={`sosco-${colId}`} style={{ pointerEvents: 'none' }}>{datosGeometria[colId].soscosSVG}</g>)}
              {Object.keys(datosGeometria).map((colId) => (
                <g key={`cota-planta-${colId}`} style={{ pointerEvents: 'none' }}>
                  {datosGeometria[colId].cotas.map((c, idx) => (
                    <g key={idx}>
                      <rect x={c.x - 12} y={c.y - 8} width="24" height="10" fill="white" fillOpacity="0.85" />
                      <text x={c.x} y={c.y} fontSize={fuentes.cotas} fill="red" fontWeight="bold" textAnchor="middle">{c.texto}</text>
                    </g>
                  ))}
                </g>
              ))}

              {columnasCalculadas.map((col) => (
                <g key={col.id}>
                  <text x={col.x} y={20} fontSize="12" fontWeight="bold" textAnchor="middle" style={{ pointerEvents: 'none' }}>{col.numero}</text>
                  <line x1={col.x} y1={45} x2={col.x} y2={120} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4" style={{ pointerEvents: 'none' }} />
                  <rect x={col.x - 30} y={0} width="60" height="150" fill="transparent" style={{ cursor: 'context-menu' }} onContextMenu={(e) => abrirMenuColumna(e, col.id)} />
                </g>
              ))}
            </svg>
          </div>

          <div style={{ marginTop: '2px' }}>
            <CorteLateralCanal
              plieguesGlobales={pliegues}
              matrizPliegues={matrizPliegues}
              columnasMapeadas={columnasCalculadas}
              configColumnas={configColumnas}
              colorInterior={colorInterior}
              anchoAbertura={anchoAbertura}
              ladoAbrir={ladoAbrir}
              ladoCubierta={ladoCubierta}
              //* ===> LAS 3 NUEVAS PROPIEDADES NECESARIAS PARA LA VISTA 4 <=== *//
              datosGeometria={datosGeometria}
              invertirTramos={invertirTramos}
              nombreEje={nombreEje}
            />
          </div>
          
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🧩 MODALES Y COMPONENTES FLOTANTES                             */}
      {/* ============================================================== */}

      {menuFlotante.visible && colActual && (
        <div style={{ ...menuContextStyle, top: menuFlotante.y, left: menuFlotante.x }} onClick={e => e.stopPropagation()}>
          {!menuFlotante.esTraslapo ? (
            <React.Fragment>
              <div style={menuHeaderStyle}>Viga {columnasCalculadas.find(c => c.id === menuFlotante.columnaId)?.numero}</div>
              <button onClick={() => agregarNuevoTraslapoCadena(menuFlotante.columnaId)} style={{ ...btnStyle, width: '100%', marginBottom: '8px', backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>➕ Activar Traslapo a la Der.</button>

              {colActual.listaTraslapos?.length > 0 && (
                <button onClick={() => { if (window.confirm("¿Seguro de remover el último traslapo?")) eliminarUltimoTraslapo(menuFlotante.columnaId); }} style={{ ...btnStyle, width: '100%', marginBottom: '8px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold', border: '1px solid #fca5a5' }}>❌ Eliminar Último Traslapo</button>
              )}

              {colActual.listaTraslapos?.length === 0 && (
                <React.Fragment>
                  <label style={itemMenuLabelStyle}><input type="checkbox" checked={colActual.unirDerecha} onChange={(e) => actualizarPropiedadColumna(menuFlotante.columnaId, 'unirDerecha', e.target.checked)} /> Unir con Col. Derecha</label>
                  {colActual.unirDerecha && (
                    <div style={subSeccionStyle}>
                      <label style={labelMiniStyle}>Long. Tramo (mm):</label><input type="text" style={inputMiniStyle} value={colActual.longitudDerecha} onChange={(e) => actualizarPropiedadColumna(menuFlotante.columnaId, 'longitudDerecha', e.target.value)} />
                      <label style={labelMiniStyle}>Pendiente (°):</label><input type="text" style={inputMiniStyle} value={colActual.pendiente} onChange={(e) => actualizarPropiedadColumna(menuFlotante.columnaId, 'pendiente', e.target.value)} />
                    </div>
                  )}
                </React.Fragment>
              )}

              <div style={seccionSeparadorStyle}>
                <span style={seccionTituloMiniStyle}>ZONAS PLANAS (mm)</span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <div><label style={labelMiniStyle}>Izq:</label><input type="text" style={inputMiniStyle} value={colActual.planaIzquierda || ''} onChange={(e) => actualizarPropiedadColumna(menuFlotante.columnaId, 'planaIzquierda', e.target.value)} /></div>
                  <div><label style={labelMiniStyle}>Cent:</label><input type="text" style={inputMiniStyle} value={colActual.planaCentro || ''} onChange={(e) => actualizarPropiedadColumna(menuFlotante.columnaId, 'planaCentro', e.target.value)} /></div>
                  <div><label style={labelMiniStyle}>Der:</label><input type="text" style={inputMiniStyle} value={colActual.planaDerecha || ''} onChange={(e) => actualizarPropiedadColumna(menuFlotante.columnaId, 'planaDerecha', e.target.value)} /></div>
                </div>
              </div>

              <div style={seccionSeparadorStyle}>
                <span style={seccionTituloMiniStyle}>ACCESORIOS DE SOSCOS</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={labelMiniStyle}>Ø Cota:</label>
                  <select style={{ fontSize: '10px', padding: '1px' }} value={colActual.diametroSosco || '4"'} onChange={(e) => actualizarPropiedadColumna(menuFlotante.columnaId, 'diametroSosco', e.target.value)}>
                    <option value='3"'>3"</option><option value='4"'>4"</option><option value='6"'>6"</option>
                  </select>
                </div>
                <label style={itemMenuLabelStyle}><input type="radio" name="soscoGroup" checked={!!colActual.soscoCentro} onChange={() => setSoscoType('c')} /> Sosco Central</label>
                <label style={itemMenuLabelStyle}><input type="radio" name="soscoGroup" checked={!!colActual.soscoIzquierdo} onChange={() => setSoscoType('i')} /> Sosco Izquierdo</label>
                <label style={itemMenuLabelStyle}><input type="radio" name="soscoGroup" checked={!!colActual.soscoDerecho} onChange={() => setSoscoType('d')} /> Sosco Derecho</label>
                <label style={itemMenuLabelStyle}><input type="radio" name="soscoGroup" checked={!!colActual.dosSoscos} onChange={() => setSoscoType('dos')} /> Dos Soscos</label>
                <button style={{ fontSize: '9px', padding: '2px', marginTop: '4px', cursor: 'pointer' }} onClick={() => setSoscoType('n')}>Quitar Bajantes</button>
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div style={menuHeaderStyle}>Traslapo (X)</div>
              <button onClick={() => eliminarTraslapoEspecifico(menuFlotante.columnaId, menuFlotante.traslapoIndex)} style={{ ...btnStyle, width: '100%', backgroundColor: '#ef4444', color: '#fff' }}>🗑️ Eliminar Traslapo</button>
              <div style={{ marginTop: '6px' }}>
                <label style={labelMiniStyle}>Longitud (mm):</label><input type="text" style={inputMiniStyle} value={traslapoActual?.longitud || ''} onChange={e => actualizarPropiedadTraslapo(menuFlotante.columnaId, menuFlotante.traslapoIndex, 'longitud', e.target.value)} />
                <label style={labelMiniStyle}>Pendiente (°):</label><input type="text" style={inputMiniStyle} value={traslapoActual?.pendiente || ''} onChange={e => actualizarPropiedadTraslapo(menuFlotante.columnaId, menuFlotante.traslapoIndex, 'pendiente', e.target.value)} />
              </div>
              <div style={seccionSeparadorStyle}>
                <span style={seccionTituloMiniStyle}>DESTINO DE SALIDA</span>
                <label style={itemMenuLabelStyle}><input type="radio" name="destinoGroup" checked={traslapoActual?.conectarA === 'traslapo'} onChange={() => actualizarPropiedadTraslapo(menuFlotante.columnaId, menuFlotante.traslapoIndex, 'conectarA', 'traslapo')} /> Encadenar otro Traslapo</label>
                <label style={itemMenuLabelStyle}><input type="radio" name="destinoGroup" checked={traslapoActual?.conectarA === 'columna'} onChange={() => actualizarPropiedadTraslapo(menuFlotante.columnaId, menuFlotante.traslapoIndex, 'conectarA', 'columna')} /> Cerrar Tramo a Col. Derecha</label>
              </div>
              {traslapoActual?.conectarA === 'traslapo' && <button onClick={() => agregarNuevoTraslapoCadena(menuFlotante.columnaId)} style={{ ...btnStyle, width: '100%', marginTop: '6px', backgroundColor: '#e2e8f0', fontSize: '10px' }}>➕ Insertar Siguiente X</button>}
              {traslapoActual?.conectarA === 'columna' && (
                <div style={subSeccionStyle}>
                  <label style={labelMiniStyle}>Long. Cierre (mm):</label><input type="text" style={inputMiniStyle} value={traslapoActual?.longitudCierre || ''} onChange={(e) => actualizarPropiedadTraslapo(menuFlotante.columnaId, menuFlotante.traslapoIndex, 'longitudCierre', e.target.value)} />
                  <label style={labelMiniStyle}>Pendiente Final (°):</label><input type="text" style={inputMiniStyle} value={traslapoActual?.pendienteCierre || ''} onChange={(e) => actualizarPropiedadTraslapo(menuFlotante.columnaId, menuFlotante.traslapoIndex, 'pendienteCierre', e.target.value)} />
                </div>
              )}
            </React.Fragment>
          )}
          <button onClick={() => setMenuFlotante({ ...menuFlotante, visible: false })} style={{ ...btnStyle, width: '100%', marginTop: '8px', backgroundColor: '#f39c12', color: '#fff', border: 'none' }}>Aplicar</button>
        </div>
      )}

      {modalAbierto && (
        <div style={modalOverlayStyle}>
          <div style={modalBodyStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
              <h4 style={{ margin: 0 }}>Abrir Canal Guardada</h4>
              <button onClick={() => setModalAbierto(false)} style={{ border: 'none', background: 'transparent' }}>✕</button>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '10px' }}>
              {listaProyectos.map(p => (
                <div key={p.id} style={proyectoItemStyle} onClick={() => cargarProyectoEspecifico(p)}><span style={{ fontWeight: 'bold', color: '#2563eb' }}>{p.nombre_proyecto}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const menuContextStyle = { position: 'fixed', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '10px', zIndex: 3000, width: '220px' };
const subSeccionStyle = { paddingLeft: '5px', borderLeft: '2px solid #cbd5e1', marginTop: '4px' };
const menuHeaderStyle = { fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px', color: '#1e293b' };
const itemMenuLabelStyle = { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', margin: '3px 0', cursor: 'pointer' };
const seccionSeparadorStyle = { borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '6px' };
const seccionTituloMiniStyle = { fontSize: '9px', fontWeight: 'bold', color: '#64748b', display: 'block' };
const labelMiniStyle = { fontSize: '10px', color: '#475569', marginTop: '3px' };
const inputMiniStyle = { padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', width: '100%' };
const btnStyle = { padding: '5px 8px', fontSize: '11px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px' };
const inputStyle = { width: '100%', padding: '5px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' };
const labelTitleStyle = { fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginTop: '5px', marginBottom: '2px' };
const cardStyle = { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', marginTop: '10px', borderRadius: '6px' };
const cardTitleStyle = { fontSize: '10.5px', fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000 };
const modalBodyStyle = { backgroundColor: '#fff', padding: '15px', borderRadius: '6px', width: '350px' };
const proyectoItemStyle = { padding: '6px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' };

export default DisenadorCanales;