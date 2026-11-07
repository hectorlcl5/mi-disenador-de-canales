import React, { useState, useEffect } from "react";
import logoCortiza from "../../logo-cortiza.png";
import { supabase } from "../../supabaseClient";

const CalculoDespieces = () => {
  const [tabActiva, setTabActiva] = useState("tejas");
  const [mensaje, setMensaje] = useState("");

  // ==========================================
  // METADATOS Y CONTROL DE ARCHIVO (GLOBAL)
  // ==========================================
  const [projectId, setProjectId] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState("Cubierta_Estructura_1");
  const [tituloDocumento, setTituloDocumento] = useState("DESPIECE DE CUBIERTA BODEGA");
  const [disenador, setDisenador] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [listaProyectos, setListaProyectos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(false);

  // ==========================================
  // ESTADOS DE GEOMETRÍA Y ESTRUCTURA
  // ==========================================
  const geoBase = { largoCubierta: 12, anchoCubierta: 6, esSimetrica: true, esDosAguas: false, anchoAgua2: 6, direccionUnAgua: 1 };
  const [geoCubierta, setGeoCubierta] = useState(geoBase);

  const pendBase = { conoceAngulo: true, anguloA1: 15, anguloA2: 15, longitudPlanaA1: 6, alturaCaballeteA1: 1.5, longitudPlanaA2: 6, alturaCaballeteA2: 1.5 };
  const [pendiente, setPendiente] = useState(pendBase);

  const estBase = { cantCorreasIguales: true, correasA1: 7, correasA2: 7 };
  const [estructura, setEstructura] = useState(estBase);

  const catalogoTejas = [
    { id: "t1", nombre: "Teja Ancho útil 1 m", util: 1.0 },
    { id: "t2", nombre: "Teja Ancho útil 0,5 m", util: 0.5 },
    { id: "t3", nombre: "Teja Ancho útil 0,84 m", util: 0.84 },
    { id: "t4", nombre: "Teja Ancho útil 1,05 m", util: 1.05 },
    { id: "t5", nombre: "Teja Ancho útil 0,92 m", util: 0.92 }
  ];
  const espBase = { tejaSeleccionada: catalogoTejas[0], voladizoA1: 0.3, voladizoA2: 0.3 };
  const [especificaciones, setEspecificaciones] = useState(espBase);

  const fijBase = { fijacionTodas: true, fijacionA1: "", fijacionA2: "", refuerzoCant: 0, refuerzoTodas: true, refuerzoA1: "", refuerzoA2: "" };
  const [fijaciones, setFijaciones] = useState(fijBase);

  const trasBase = { habilitada: false, tejaSeleccionada: catalogoTejas[0], posicionesA1: "", posicionesA2: "", refuerzoCant: 0 };
  const [traslucidas, setTraslucidas] = useState(trasBase);

  const [traslaposA1, setTraslaposA1] = useState({});
  const [traslaposA2, setTraslaposA2] = useState({});
  const [menuCorrea, setMenuCorrea] = useState({ visible: false, x: 0, y: 0, index: null, isAgua1: true, extraTraslapo: "0.20" });

  // ==========================================
  // ESCUDOS MATEMÁTICOS (Evita Crashes y Ciclos Infinitos)
  // ==========================================
  const numGeoLargo = Math.max(0.1, parseFloat(geoCubierta?.largoCubierta) || 0);
  const numGeoAncho1 = Math.max(0.1, parseFloat(geoCubierta?.anchoCubierta) || 0);
  const numGeoAncho2 = geoCubierta?.esSimetrica ? numGeoAncho1 : Math.max(0.1, parseFloat(geoCubierta?.anchoAgua2) || 0);
  
  const numVolA1 = parseFloat(especificaciones?.voladizoA1) || 0;
  const numVolA2 = geoCubierta?.esDosAguas ? (geoCubierta?.esSimetrica ? numVolA1 : (parseFloat(especificaciones?.voladizoA2) || 0)) : 0;
  
  const numCorreasA1 = Math.min(100, Math.max(2, parseInt(estructura?.correasA1) || 2));
  const numCorreasA2 = estructura?.cantCorreasIguales ? numCorreasA1 : Math.min(100, Math.max(2, parseInt(estructura?.correasA2) || 2));
  
  const anchoUtilTeja = Math.max(0.1, parseFloat(especificaciones?.tejaSeleccionada?.util) || 1);
  const nombreTeja = especificaciones?.tejaSeleccionada?.nombre || "Teja Estándar";

  // ==========================================
  // MOTOR MATEMÁTICO PURO Y CUBICACIÓN INTELIGENTE
  // ==========================================
  const calcularAngulo = (altura, base) => base <= 0 ? 0 : (Math.atan(altura / base) * (180 / Math.PI)).toFixed(1);
  const anguloRealA1 = Math.min(85, Math.max(0, parseFloat(pendiente?.conoceAngulo ? pendiente?.anguloA1 : calcularAngulo(pendiente?.alturaCaballeteA1, pendiente?.longitudPlanaA1)) || 0));
  const anguloRealA2 = geoCubierta?.esSimetrica ? anguloRealA1 : Math.min(85, Math.max(0, parseFloat(pendiente?.conoceAngulo ? pendiente?.anguloA2 : calcularAngulo(pendiente?.alturaCaballeteA2, pendiente?.longitudPlanaA2)) || 0));

  const L_r1 = numGeoAncho1 > 0 ? (numGeoAncho1 / Math.cos(anguloRealA1 * Math.PI / 180)) : 0;
  const L_r2 = numGeoAncho2 > 0 ? (numGeoAncho2 / Math.cos(anguloRealA2 * Math.PI / 180)) : 0;

  const D_cab = 0.15; 
  const getPurlinMathPos = (i, N, L_r) => {
    if (N < 2 || L_r <= 0) return L_r || 0;
    if (i === 0) return D_cab;
    if (i === N - 1) return L_r;
    const S = (L_r - D_cab) / (N - 1);
    return D_cab + (i * S);
  };

  // --- CÁLCULOS DE TEJAS METÁLICAS VS TRASLÚCIDAS ---
  const parsePosiciones = (str) => {
    if (typeof str !== 'string' || str.trim() === '') return [];
    return str.split(',').map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n) && n >= 0);
  };

  const colTraslucidasA1 = traslucidas?.habilitada ? parsePosiciones(traslucidas.posicionesA1) : [];
  const colTraslucidasA2 = (traslucidas?.habilitada && geoCubierta?.esDosAguas) ? parsePosiciones(traslucidas.posicionesA2) : [];

  const cantTraslucidasA1 = colTraslucidasA1.length;
  const cantTraslucidasA2 = colTraslucidasA2.length;
  const anchoUtilTraslucida = Math.max(0.1, parseFloat(traslucidas?.tejaSeleccionada?.util) || 1);

  const anchoCubiertoTrasA1 = cantTraslucidasA1 * anchoUtilTraslucida;
  const anchoCubiertoTrasA2 = cantTraslucidasA2 * anchoUtilTraslucida;

  // Descontar los metros de traslúcida del largo total y calcular tejas metálicas reales
  const cantMetalicasA1 = Math.max(0, Math.ceil((numGeoLargo - anchoCubiertoTrasA1) / anchoUtilTeja));
  const cantMetalicasA2 = geoCubierta?.esDosAguas ? Math.max(0, Math.ceil((numGeoLargo - anchoCubiertoTrasA2) / anchoUtilTeja)) : 0;

  // Cantidad real de columnas en el techo (metálicas + traslúcidas)
  const totalHojasA1 = cantMetalicasA1 + cantTraslucidasA1;
  const totalHojasA2 = cantMetalicasA2 + cantTraslucidasA2;

  const generarTramosTeja = (isAgua1, L_r, cantCorreas, voladizoM, cMetalicas, cTraslucidas) => {
    if (L_r <= 0) return [];
    const traslapos = isAgua1 ? (traslaposA1 || {}) : (traslaposA2 || {});
    const indicesConTraslapo = Object.keys(traslapos).map(Number).filter(i => !isNaN(i) && i > 0 && i < cantCorreas - 1).sort((a,b) => a - b);
    
    let tramos = [];
    let prevMathPos = 0;
    let prevName = "Caballete";

    const cuts = [...indicesConTraslapo, 'EAVE'];
    cuts.forEach((cut) => {
      let currentMathPos, extra, currentName;
      if (cut === 'EAVE') {
        currentMathPos = L_r;
        extra = parseFloat(voladizoM) || 0;
        currentName = "Voladizo Final";
      } else {
        currentMathPos = getPurlinMathPos(cut, cantCorreas, L_r);
        extra = parseFloat(traslapos[cut]?.extra) || 0;
        currentName = `Correa ${cut + 1}`;
      }
      
      const length = (currentMathPos - prevMathPos) + extra;
      
      // 💡 NUEVO: Cambiamos el nombre en la tabla si el agua está invertida visualmente
      const isAgua1Invertida = !geoCubierta?.esDosAguas && geoCubierta?.direccionUnAgua === 2;
      const nombreAgua = isAgua1 ? (isAgua1Invertida ? "Agua 2" : "Agua 1") : "Agua 2";

      if (cMetalicas > 0) tramos.push({ agua: nombreAgua, tipo: "Metálica", etiqueta: `${prevName} ➔ ${currentName}`, medida: length, cantidad: cMetalicas });
      if (cTraslucidas > 0) tramos.push({ agua: nombreAgua, tipo: "Traslúcida", etiqueta: `${prevName} ➔ ${currentName}`, medida: length, cantidad: cTraslucidas });
      
      prevMathPos = currentMathPos;
      prevName = `Correa ${cut + 1} (Traslapo)`;
    });
    return tramos;
  };

  const tramosAgua1 = generarTramosTeja(true, L_r1, numCorreasA1, numVolA1, cantMetalicasA1, cantTraslucidasA1);
  const tramosAgua2 = geoCubierta?.esDosAguas ? generarTramosTeja(false, L_r2, numCorreasA2, numVolA2, cantMetalicasA2, cantTraslucidasA2) : [];
  const todosLosTramos = [...tramosAgua1, ...tramosAgua2];

  // 💡 REDONDEO UNIFICADO: Forzamos 2 decimales (.toFixed(2)) en la suma de longitudes para igualar lo visual
  const longTotalFabricacionA1 = parseFloat(tramosAgua1.filter(t => t.tipo === "Metálica").reduce((sum, t) => sum + (parseFloat(t.medida) || 0), 0).toFixed(2));
  const longTotalFabricacionA2 = geoCubierta?.esDosAguas ? parseFloat(tramosAgua2.filter(t => t.tipo === "Metálica").reduce((sum, t) => sum + (parseFloat(t.medida) || 0), 0).toFixed(2)) : 0;
  
  const areaAgua1 = longTotalFabricacionA1 * (cantMetalicasA1 * anchoUtilTeja);
  // 💡 CORRECCIÓN: Quitamos el "geoCubierta?.esSimetrica ? areaAgua1 :" para que el Agua 2 calcule sus propias franjas
  const areaAgua2 = geoCubierta?.esDosAguas ? (longTotalFabricacionA2 * (cantMetalicasA2 * anchoUtilTeja)) : 0;
  const areaTotal = areaAgua1 + areaAgua2;

  // --- CÁLCULO ÁREA TRASLÚCIDA (Redondeo Unificado) ---
  const longTotalTraslucidaA1 = parseFloat(tramosAgua1.filter(t => t.tipo === "Traslúcida").reduce((sum, t) => sum + (parseFloat(t.medida) || 0), 0).toFixed(2));
  const longTotalTraslucidaA2 = geoCubierta?.esDosAguas ? parseFloat(tramosAgua2.filter(t => t.tipo === "Traslúcida").reduce((sum, t) => sum + (parseFloat(t.medida) || 0), 0).toFixed(2)) : 0;
  
  const areaTraslucidaA1 = longTotalTraslucidaA1 * (cantTraslucidasA1 * anchoUtilTraslucida);
  // 💡 CORRECCIÓN: Quitamos el copiado por simetría aquí también
  const areaTraslucidaA2 = geoCubierta?.esDosAguas ? (longTotalTraslucidaA2 * (cantTraslucidasA2 * anchoUtilTraslucida)) : 0;
  const areaTotalTraslucida = areaTraslucidaA1 + areaTraslucidaA2;

  // ==========================================
  // CÁLCULO DE TORNILLOS (LÓGICA EXACTA DE BORDES Y TRASLAPOS)
  // ==========================================
  const parseCorreas = (str, max) => {
    if (typeof str !== 'string') return [];
    return str.split(',').map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n) && n >= 0 && n < max);
  };

  const arrFijacionA1 = fijaciones?.fijacionTodas ? Array.from({length: numCorreasA1}, (_, i)=>i) : parseCorreas(fijaciones?.fijacionA1, numCorreasA1);
  const arrFijacionA2 = geoCubierta?.esDosAguas ? (fijaciones?.fijacionTodas ? Array.from({length: numCorreasA2}, (_, i)=>i) : parseCorreas(fijaciones?.fijacionA2, numCorreasA2)) : [];
  
  const cantRefuerzos = parseInt(fijaciones?.refuerzoCant) || 0;
  const arrRefuerzoA1 = fijaciones?.refuerzoTodas ? Array.from({length: numCorreasA1}, (_, i)=>i) : parseCorreas(fijaciones?.refuerzoA1, numCorreasA1);
  const arrRefuerzoA2 = geoCubierta?.esDosAguas ? (fijaciones?.refuerzoTodas ? Array.from({length: numCorreasA2}, (_, i)=>i) : parseCorreas(fijaciones?.refuerzoA2, numCorreasA2)) : [];

  // 💡 NUEVO: Algoritmo de barrido que soporta refuerzos independientes
  const calcularTornillosAgua = (arrFijacion, arrRefuerzo, totalHojas, colsTraslucidas, cantRefMetal, cantRefTrasl) => {
    let fijMetalica = 0, fijTrasl = 0, refMetalica = 0, refTrasl = 0;

    arrFijacion.forEach(() => {
      for (let edge = 0; edge <= totalHojas; edge++) {
        const tocaTraslucidaIzquierda = edge > 0 && colsTraslucidas.includes(edge - 1);
        const tocaTraslucidaDerecha = edge < totalHojas && colsTraslucidas.includes(edge);
        if (tocaTraslucidaIzquierda || tocaTraslucidaDerecha) {
          fijTrasl++;
        } else {
          fijMetalica++;
        }
      }
    });

    arrRefuerzo.forEach(() => {
      for (let sheet = 0; sheet < totalHojas; sheet++) {
        if (colsTraslucidas.includes(sheet)) {
          refTrasl += cantRefTrasl; // Cuenta los de traslúcida separados
        } else {
          refMetalica += cantRefMetal; // Cuenta los metálicos normales
        }
      }
    });

    return { fijMetalica, fijTrasl, refMetalica, refTrasl };
  };

  const cantRefuerzosTrasl = parseInt(traslucidas?.refuerzoCant) || 0;
  const tornillosA1 = calcularTornillosAgua(arrFijacionA1, arrRefuerzoA1, totalHojasA1, colTraslucidasA1, cantRefuerzos, cantRefuerzosTrasl);
  const tornillosA2 = geoCubierta?.esDosAguas ? calcularTornillosAgua(arrFijacionA2, arrRefuerzoA2, totalHojasA2, colTraslucidasA2, cantRefuerzos, cantRefuerzosTrasl) : { fijMetalica: 0, fijTrasl: 0, refMetalica: 0, refTrasl: 0 };

  const fijacionMetalica = tornillosA1.fijMetalica + tornillosA2.fijMetalica;
  const fijacionTraslucida = tornillosA1.fijTrasl + tornillosA2.fijTrasl;
  const refuerzoMetalica = tornillosA1.refMetalica + tornillosA2.refMetalica;
  const refuerzoTraslucida = tornillosA1.refTrasl + tornillosA2.refTrasl;
  
  const totalTornillosMetalica = fijacionMetalica + refuerzoMetalica;
  const totalTornillosTraslucida = fijacionTraslucida + refuerzoTraslucida;
  const totalTornillos = totalTornillosMetalica + totalTornillosTraslucida;

  // ==========================================
  // MENÚ CONTEXTUAL PARA CORREAS
  // ==========================================
  const abrirMenuCorrea = (e, index, isAgua1) => {
    e.preventDefault();
    const traslapos = isAgua1 ? (traslaposA1 || {}) : (traslaposA2 || {});
    const traslapoExistente = traslapos[index];
    setMenuCorrea({ visible: true, x: e.clientX, y: e.clientY, index, isAgua1, extraTraslapo: traslapoExistente ? traslapoExistente.extra : "0.20" });
  };

  const aplicarTraslapoTransversal = () => {
    const { index, isAgua1, extraTraslapo } = menuCorrea;
    if (isAgua1) setTraslaposA1({ ...(traslaposA1 || {}), [index]: { extra: parseFloat(extraTraslapo) || 0 } });
    else setTraslaposA2({ ...(traslaposA2 || {}), [index]: { extra: parseFloat(extraTraslapo) || 0 } });
    setMenuCorrea({ ...menuCorrea, visible: false });
  };

  const eliminarTraslapoTransversal = () => {
    const { index, isAgua1 } = menuCorrea;
    if (isAgua1) { const copy = { ...(traslaposA1 || {}) }; delete copy[index]; setTraslaposA1(copy); } 
    else { const copy = { ...(traslaposA2 || {}) }; delete copy[index]; setTraslaposA2(copy); }
    setMenuCorrea({ ...menuCorrea, visible: false });
  };

  useEffect(() => {
    const handleClick = () => setMenuCorrea((prev) => ({ ...prev, visible: false }));
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ==========================================
  // FUNCIONES CRUD DE ARCHIVOS (SUPABASE)
  // ==========================================
  const nuevoDocumento = () => {
    if (window.confirm("¿Crear un nuevo despiece? Se limpiará la información actual.")) {
      setProjectId(null); setNombreArchivo("Cubierta_Nueva"); setTituloDocumento("NUEVO DESPIECE"); setDisenador("");
      setGeoCubierta(geoBase); setPendiente(pendBase); setEstructura(estBase); setEspecificaciones(espBase); setFijaciones(fijBase);
      setTraslucidas(trasBase); setTraslaposA1({}); setTraslaposA2({});
      setMensaje("✨ Documento Nuevo Creado"); setTimeout(() => setMensaje(""), 3000);
    }
  };

  const guardarDocumento = async () => {
    setMensaje("Guardando en BD...");
    const payload = {
      nombre_proyecto: nombreArchivo,
      tramos: { modulo: "despieces_unificados", tituloDocumento, disenador, fecha, geoCubierta, pendiente, estructura, especificaciones, fijaciones, traslaposA1, traslaposA2, traslucidas },
      ultima_actualizacion: new Date(),
    };
    let res = projectId ? await supabase.from("diseños_canales").update(payload).eq("id", projectId) : await supabase.from("diseños_canales").insert([payload]).select();
    if (!res.error && res.data?.length > 0) setProjectId(res.data[0].id);
    setMensaje(res.error ? "❌ Error de guardado" : "✅ Respaldo exitoso"); setTimeout(() => setMensaje(""), 3000);
  };

  const guardarComoDocumento = async () => {
    const nuevoNombre = window.prompt("Ingrese el nuevo nombre para este archivo:", nombreArchivo + "_Copia");
    if (!nuevoNombre) return;
    setMensaje("Guardando como archivo nuevo...");
    const payload = {
      nombre_proyecto: nuevoNombre,
      tramos: { modulo: "despieces_unificados", tituloDocumento, disenador, fecha, geoCubierta, pendiente, estructura, especificaciones, fijaciones, traslaposA1, traslaposA2, traslucidas },
      ultima_actualizacion: new Date(),
    };
    let res = await supabase.from("diseños_canales").insert([payload]).select();
    if (!res.error && res.data?.length > 0) { setProjectId(res.data[0].id); setNombreArchivo(nuevoNombre); }
    setMensaje(res.error ? "❌ Error al guardar como" : "✅ Archivo nuevo creado exitosamente"); setTimeout(() => setMensaje(""), 3000);
  };

  const abrirModalCarga = async () => {
    setModalAbierto(true); setCargandoLista(true);
    const { data, error } = await supabase.from("diseños_canales").select("id, nombre_proyecto, ultima_actualizacion, tramos").order("ultima_actualizacion", { ascending: false });
    if (!error) setListaProyectos(data.filter((p) => p.tramos?.modulo === "despieces_unificados"));
    setCargandoLista(false);
  };

  const safeMerge = (base, loaded) => {
    if (!loaded || typeof loaded !== 'object') return base;
    const res = { ...base };
    Object.keys(loaded).forEach(k => { if (loaded[k] !== undefined && loaded[k] !== null) res[k] = loaded[k]; });
    return res;
  };

  const cargarProyecto = (p) => {
    try {
      let info = p.tramos || {};
      if (typeof info === 'string') info = JSON.parse(info); 

      setProjectId(p.id); 
      setNombreArchivo(p.nombre_proyecto || "Archivo_Recuperado"); 
      setTituloDocumento(info.tituloDocumento || "DESPIECE DE CUBIERTA"); 
      setDisenador(info.disenador || ""); 
      setFecha(info.fecha || new Date().toISOString().split("T")[0]);
      
      let legacyGeo = {};
      if (info.geoTecho) {
        legacyGeo = {
          largoCubierta: (parseFloat(info.geoTecho.anchoVertiente) / 1000) || geoBase.largoCubierta,
          anchoCubierta: (parseFloat(info.geoTecho.longitudPendiente) / 1000) || geoBase.anchoCubierta,
          esSimetrica: true, 
          esDosAguas: !!info.geoTecho.esDosAguas,
          anchoAgua2: (parseFloat(info.geoTecho.longitudPendiente) / 1000) || geoBase.anchoAgua2
        };
      }
      setGeoCubierta(safeMerge(geoBase, info.geoCubierta || legacyGeo));

      let legacyPend = {};
      if (info.geoTecho) {
        legacyPend = {
          conoceAngulo: true, 
          anguloA1: parseFloat(info.geoTecho.pendienteGrados) || pendBase.anguloA1,
          anguloA2: parseFloat(info.geoTecho.pendienteGrados) || pendBase.anguloA2
        };
      }
      setPendiente(safeMerge(pendBase, info.pendiente || legacyPend));

      setEstructura(safeMerge(estBase, info.estructura));
      setFijaciones(safeMerge(fijBase, info.fijaciones));

      const loadedTras = safeMerge(trasBase, info.traslucidas);
      if (!loadedTras.tejaSeleccionada || !loadedTras.tejaSeleccionada.id) loadedTras.tejaSeleccionada = catalogoTejas[0];
      setTraslucidas(loadedTras);
      
      const loadedEsp = safeMerge(espBase, info.especificaciones);
      if (!loadedEsp.tejaSeleccionada || !loadedEsp.tejaSeleccionada.id) loadedEsp.tejaSeleccionada = catalogoTejas[0];
      setEspecificaciones(loadedEsp);
      
      setTraslaposA1(info.traslaposA1 || {});
      setTraslaposA2(info.traslaposA2 || {});
      
      setModalAbierto(false); 
      setMensaje("✅ Diseño antiguo restaurado con éxito"); 
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("Error al cargar el archivo viejo:", error);
      setMensaje("❌ Error al recuperar el archivo.");
    }
  };

  // ==========================================
  // DIBUJO SVG PARAMÉTRICO (AUTO-ESCALADO MEJORADO)
  // ==========================================
  const dibujarEstructuraSVG = () => {
    const proportion = (numGeoAncho1 + (geoCubierta?.esDosAguas ? numGeoAncho2 : 0)) / Math.max(0.1, numGeoLargo);
    const dynamicScale = Math.max(1, proportion * 0.7);

    const anchoSVG = 1050 * Math.max(1, dynamicScale * 0.4); 
    const paddingX = 100 * dynamicScale;   
    const paddingY = 40 * dynamicScale; 
    const anchoDibujo = anchoSVG - (paddingX * 2);
    
    const factorEscala = (numGeoLargo > 0) ? (anchoDibujo / numGeoLargo) : 1;
    const altoAgua1 = numGeoAncho1 * factorEscala;
    const altoAgua2 = geoCubierta?.esDosAguas ? numGeoAncho2 * factorEscala : 0;
    const voladizo1Px = numVolA1 * factorEscala;
    const voladizo2Px = numVolA2 * factorEscala;

    const altoTotalDibujo = voladizo1Px + altoAgua1 + altoAgua2 + voladizo2Px;
    const altoSVG = altoTotalDibujo + (paddingY * 2);

    const maxDim = Math.max(anchoSVG, altoSVG);
    const textScale = Math.max(1, maxDim / 1050);

    const fSizeVert = 13 * textScale;
    const fSizeEjes = 16 * textScale;
    const fSizeVoladizo = 14 * textScale;
    const fSizeLargo = 17 * textScale;
    const strk = 1.5 * textScale;
    const off1 = 20 * textScale;
    const off2 = 25 * textScale;
    const off3 = 15 * textScale;

    // 💡 NUEVO: Lógica de inversión visual del Lienzo
    const isAgua1Invertida = !geoCubierta?.esDosAguas && geoCubierta?.direccionUnAgua === 2;

    let yCaballete, yInicioAgua1, yInicioVoladizo1;
    if (isAgua1Invertida) {
      yCaballete = paddingY;
      yInicioAgua1 = yCaballete; // El agua dibuja hacia abajo desde el caballete
      yInicioVoladizo1 = yCaballete + altoAgua1; // El voladizo va al final abajo
    } else {
      yInicioVoladizo1 = paddingY;
      yInicioAgua1 = yInicioVoladizo1 + voladizo1Px;
      yCaballete = yInicioAgua1 + altoAgua1; // Normal hacia arriba
    }

    const yFinAgua2 = geoCubierta?.esDosAguas ? (yCaballete + altoAgua2) : yCaballete; 
    const yFinVoladizo2 = geoCubierta?.esDosAguas ? (yFinAgua2 + voladizo2Px) : yCaballete;

    const getPurlinVisualY = (i, N, altoAgua, isAgua1, L_r) => {
      if (L_r <= 0) return yCaballete;
      const d = getPurlinMathPos(i, N, L_r);
      if (isAgua1) {
        // Si está invertida, la dibujamos sumando Y (hacia abajo) en lugar de restando Y (hacia arriba)
        return isAgua1Invertida ? yCaballete + (d / L_r) * altoAgua : yCaballete - (d / L_r) * altoAgua; 
      }
      return yCaballete + (d / L_r) * altoAgua; 
    };

    const cortesCotasA1 = [{ math: 0, y: yCaballete, extra: 0 }];
    const cortesCotasA2 = [{ math: 0, y: yCaballete, extra: 0 }];

    const tejaPxA1 = numGeoLargo > 0 ? (anchoDibujo / Math.max(1, totalHojasA1)) : 0;
    const tejaPxA2 = (geoCubierta?.esDosAguas && numGeoLargo > 0) ? (anchoDibujo / Math.max(1, totalHojasA2)) : 0;

    // --- RENDER DE TEJAS TRASLÚCIDAS (CORREGIDO PARA INVERSIÓN) ---
    const renderTraslucidas = (isAgua1) => {
      if (!traslucidas?.habilitada) return null;
      const cols = isAgua1 ? colTraslucidasA1 : colTraslucidasA2;
      const totalHojas = isAgua1 ? totalHojasA1 : totalHojasA2;
      
      // 💡 CORRECCIÓN: Detectamos la orientación para que la altura (h) siempre sea positiva
      let yStart, h;
      if (isAgua1) {
        yStart = isAgua1Invertida ? yCaballete : yInicioVoladizo1;
        const yEnd = isAgua1Invertida ? (yInicioVoladizo1 + voladizo1Px) : yCaballete;
        h = yEnd - yStart;
      } else {
        yStart = yCaballete;
        h = yFinVoladizo2 - yCaballete;
      }

      const tejaPx = isAgua1 ? tejaPxA1 : tejaPxA2;

      return cols.map(col => {
        if (col >= totalHojas) return null;
        const posX = paddingX + (col * tejaPx);
        return (
          <rect 
            key={`trasl-${isAgua1}-${col}`} 
            x={posX} 
            y={yStart}
            width={tejaPx} 
            height={h} 
            fill="#7dd3fc" /* 💡 Azul Cielo Claro */
            opacity="0.4" 
            stroke="#0ea5e9" /* 💡 Borde Azul Cielo Oscuro */
            strokeWidth={1.5 * textScale}
          />
        );
      });
    };

    const renderCorreas = (cantCorreas, isAgua1, L_r, altoAgua) => {
      let correasSVG = [];
      const traslapos = isAgua1 ? (traslaposA1 || {}) : (traslaposA2 || {});
      const tejaPx = isAgua1 ? tejaPxA1 : tejaPxA2;
      const totalHojas = isAgua1 ? totalHojasA1 : totalHojasA2;

      for (let i = 0; i < cantCorreas; i++) {
        const mathPos = getPurlinMathPos(i, cantCorreas, L_r);
        const posCY = getPurlinVisualY(i, cantCorreas, altoAgua, isAgua1, L_r);
        const traslapo = traslapos[i];
        const isMidCorrea = i !== 0 && i !== cantCorreas - 1;

        if (traslapo && isMidCorrea) {
          if (isAgua1) cortesCotasA1.push({ math: mathPos, y: posCY, extra: parseFloat(traslapo.extra) || 0 });
          else cortesCotasA2.push({ math: mathPos, y: posCY, extra: parseFloat(traslapo.extra) || 0 });
        }

        let tornillosSVG = [];
        const hasFijacion = isAgua1 ? arrFijacionA1.includes(i) : arrFijacionA2.includes(i);
        const hasRefuerzo = isAgua1 ? arrRefuerzoA1.includes(i) : arrRefuerzoA2.includes(i);

        // 💡 NUEVO: Renderizado visual inteligente diferenciando Metálica de Traslúcida
        const colsTrasl = isAgua1 ? colTraslucidasA1 : colTraslucidasA2;

        if (hasFijacion) {
          for (let col = 0; col <= totalHojas; col++) {
            let posX = paddingX + (col * tejaPx);
            if (posX > paddingX + anchoDibujo) posX = paddingX + anchoDibujo; 
            
            const tocaIzquierda = col > 0 && colsTrasl.includes(col - 1);
            const tocaDerecha = col < totalHojas && colsTrasl.includes(col);
            const esTraslucida = tocaIzquierda || tocaDerecha;
            const fillColor = esTraslucida ? "#a855f7" : "#ef4444"; // Púrpura Brillante para traslúcidas
            const strokeColor = esTraslucida ? "#7e22ce" : "#7f1d1d"; // Púrpura Oscuro para el borde
            
            tornillosSVG.push(<circle key={`tf-${isAgua1}-${i}-${col}`} cx={posX} cy={posCY} r={1.8 * textScale} fill={fillColor} stroke={strokeColor} strokeWidth={0.5 * textScale} />);
          }
        }
        
        if (hasRefuerzo) {
          for (let col = 0; col < totalHojas; col++) {
            let basePosX = paddingX + (col * tejaPx);
            const esTraslucida = colsTrasl.includes(col);
            
            // 💡 Tomamos la cantidad independiente según el tipo de teja
            const currentCantRef = esTraslucida ? (parseInt(traslucidas?.refuerzoCant) || 0) : cantRefuerzos;

            if (currentCantRef > 0) {
              // 💡 Unificamos al color Púrpura Brillante si es traslúcida, Rojo si es Metálica
              const fillColor = esTraslucida ? "#a855f7" : "#ef4444"; 
              const strokeColor = esTraslucida ? "#7e22ce" : "#7f1d1d";

              if (currentCantRef === 1) {
                tornillosSVG.push(<circle key={`tr-${isAgua1}-${i}-${col}`} cx={basePosX + (tejaPx / 2)} cy={posCY} r={1.8 * textScale} fill={fillColor} stroke={strokeColor} strokeWidth={0.5 * textScale} />);
              } else if (currentCantRef === 2) {
                tornillosSVG.push(<circle key={`tr1-${isAgua1}-${i}-${col}`} cx={basePosX + (tejaPx / 3)} cy={posCY} r={1.8 * textScale} fill={fillColor} stroke={strokeColor} strokeWidth={0.5 * textScale} />);
                tornillosSVG.push(<circle key={`tr2-${isAgua1}-${i}-${col}`} cx={basePosX + (tejaPx * 2 / 3)} cy={posCY} r={1.8 * textScale} fill={fillColor} stroke={strokeColor} strokeWidth={0.5 * textScale} />);
              } else if (currentCantRef === 3) {
                tornillosSVG.push(<circle key={`tr1-${isAgua1}-${i}-${col}`} cx={basePosX + (tejaPx / 4)} cy={posCY} r={1.8 * textScale} fill={fillColor} stroke={strokeColor} strokeWidth={0.5 * textScale} />);
                tornillosSVG.push(<circle key={`tr2-${isAgua1}-${i}-${col}`} cx={basePosX + (tejaPx / 2)} cy={posCY} r={1.8 * textScale} fill={fillColor} stroke={strokeColor} strokeWidth={0.5 * textScale} />);
                tornillosSVG.push(<circle key={`tr3-${isAgua1}-${i}-${col}`} cx={basePosX + (tejaPx * 3 / 4)} cy={posCY} r={1.8 * textScale} fill={fillColor} stroke={strokeColor} strokeWidth={0.5 * textScale} />);
              }
            }
          }
        }

        correasSVG.push(
          <g key={`cg-${isAgua1}-${i}`}>
            {traslapo && isMidCorrea && (
              <rect x={paddingX} y={posCY - (((parseFloat(traslapo.extra) || 0) * factorEscala)/2)} width={anchoDibujo} height={(parseFloat(traslapo.extra) || 0) * factorEscala} fill="#f97316" opacity="0.6" />
            )}
            <line x1={paddingX} y1={posCY} x2={paddingX + anchoDibujo} y2={posCY} stroke={traslapo && isMidCorrea ? "#39FF14" : "#475569"} strokeWidth={traslapo && isMidCorrea ? 3 * textScale : 2 * textScale} strokeDasharray={traslapo && isMidCorrea ? "none" : "6,4"} />
            {tornillosSVG}
            <rect x={paddingX} y={posCY - (10 * textScale)} width={anchoDibujo} height={20 * textScale} fill="transparent" style={{ cursor: "context-menu" }} onContextMenu={(e) => abrirMenuCorrea(e, i, isAgua1)} />
          </g>
        );
      }
      return correasSVG;
    };

    const renderCotasDivididas = (cortesArray, isAgua1) => {
      let cotas = [];
      cortesArray.sort((a, b) => a.math - b.math);
      
      const boxW = 55 * textScale;
      const boxH = 24 * textScale;

      for (let i = 0; i < cortesArray.length - 1; i++) {
        const c1 = cortesArray[i];
        const c2 = cortesArray[i+1];
        const yTop = Math.min(c1.y, c2.y);
        const yBottom = Math.max(c1.y, c2.y);
        const midY = (yTop + yBottom) / 2;
        const length = (c2.math - c1.math) + c2.extra;

        cotas.push(
          <g key={`cota-div-${isAgua1}-${i}`}>
            <line x1={paddingX - off1} y1={yTop} x2={paddingX - off1} y2={yBottom} stroke="#0f172a" strokeWidth={strk} />
            <line x1={paddingX - off2} y1={yTop} x2={paddingX - off3} y2={yTop} stroke="#0f172a" strokeWidth={strk} />
            <line x1={paddingX - off2} y1={yBottom} x2={paddingX - off3} y2={yBottom} stroke="#0f172a" strokeWidth={strk} />
            <rect x={paddingX - off2 - boxW + (10 * textScale)} y={midY - boxH/2} width={boxW} height={boxH} fill="white" opacity="0.9" />
            <text x={paddingX - off1 - (5 * textScale)} y={midY + (fSizeVert/3)} fontSize={fSizeVert} fontWeight="bold" fill="#0f172a" textAnchor="end">{length.toFixed(2)}m</text>
          </g>
        );
      }
      return cotas;
    };

    cortesCotasA1.push({ math: L_r1, y: isAgua1Invertida ? (yCaballete + altoAgua1) : yInicioAgua1, extra: numVolA1 });
    if (geoCubierta?.esDosAguas) {
      cortesCotasA2.push({ math: L_r2, y: yFinAgua2, extra: geoCubierta?.esSimetrica ? numVolA1 : numVolA2 });
    }

    const renderTraslaposLongitudinales = (yTop, yBottom, isAgua1) => {
      let traslaposSVG = [];
      const tejaPx = isAgua1 ? tejaPxA1 : tejaPxA2;
      const totalHojas = isAgua1 ? totalHojasA1 : totalHojasA2;
      if (tejaPx > 0) {
        for (let i = 1; i < totalHojas; i++) {
          const posX = paddingX + (i * tejaPx);
          // Cambiamos la línea punteada a un azul grisáceo para que contraste sobre blanco y celeste
          if (posX < paddingX + anchoDibujo) traslaposSVG.push(<line key={`t-${yTop}-${i}`} x1={posX} y1={yTop} x2={posX} y2={yBottom} stroke="#94a3b8" strokeWidth={1.5 * textScale} strokeDasharray="4,3" opacity="0.8" />);
        }
      }
      return traslaposSVG;
    };

    return (
      <svg width="100%" height="100%" style={{ maxHeight: "80vh", backgroundColor: "#ffffff" }} viewBox={`0 0 ${anchoSVG} ${altoSVG}`}>
        
        {/* AGUA 1 (Adaptable a la Inversión Visual) */}
        <rect x={paddingX} y={yInicioAgua1} width={anchoDibujo} height={altoAgua1} fill="#ffffff" stroke="#94a3b8" strokeWidth={2 * textScale} />
        {voladizo1Px > 0 && <rect x={paddingX} y={yInicioVoladizo1} width={anchoDibujo} height={voladizo1Px} fill="#3b82f6" opacity="0.3" stroke="#1e3a8a" strokeWidth={1.5 * textScale} />}
        
        {renderTraslucidas(true)}
                
        {renderTraslaposLongitudinales(isAgua1Invertida ? yCaballete : yInicioVoladizo1, isAgua1Invertida ? yInicioVoladizo1 + voladizo1Px : yCaballete, true)}
        {renderCorreas(numCorreasA1, true, L_r1, altoAgua1)}
        <text x={anchoSVG/2} y={isAgua1Invertida ? yCaballete + (altoAgua1/2) : yInicioAgua1 + (altoAgua1/2)} fontSize={fSizeEjes} fontWeight="bold" fill="#64748b" textAnchor="middle" opacity="0.5">
          {isAgua1Invertida ? "AGUA 2" : "AGUA 1"}
        </text>
        {renderCotasDivididas(cortesCotasA1, true)}

        {/* COTA VOLADIZO A1 */}
        {voladizo1Px > 0 && (
          <g>
            <line x1={paddingX + anchoDibujo + off1} y1={yInicioVoladizo1} x2={paddingX + anchoDibujo + off1} y2={isAgua1Invertida ? yInicioVoladizo1 + voladizo1Px : yInicioAgua1} stroke="#1e3a8a" strokeWidth={strk} />
            <line x1={paddingX + anchoDibujo + off3} y1={yInicioVoladizo1} x2={paddingX + anchoDibujo + off2} y2={yInicioVoladizo1} stroke="#1e3a8a" strokeWidth={strk} />
            <line x1={paddingX + anchoDibujo + off3} y1={isAgua1Invertida ? yInicioVoladizo1 + voladizo1Px : yInicioAgua1} x2={paddingX + anchoDibujo + off2} y2={isAgua1Invertida ? yInicioVoladizo1 + voladizo1Px : yInicioAgua1} stroke="#1e3a8a" strokeWidth={strk} />
            <text x={paddingX + anchoDibujo + off2 + (3 * textScale)} y={yInicioVoladizo1 + (voladizo1Px/2) + (fSizeVoladizo/3)} fontSize={fSizeVoladizo} fontWeight="bold" fill="#1e3a8a" textAnchor="start">Vol: {numVolA1} m</text>
          </g>
        )}

        {/* AGUA 2 */}
        {geoCubierta?.esDosAguas && (
          <g>
            <rect x={paddingX} y={yCaballete} width={anchoDibujo} height={altoAgua2} fill="#ffffff" stroke="#94a3b8" strokeWidth={2 * textScale} />
            {voladizo2Px > 0 && <rect x={paddingX} y={yFinAgua2} width={anchoDibujo} height={voladizo2Px} fill="#3b82f6" opacity="0.3" stroke="#1e3a8a" strokeWidth={1.5 * textScale} />}
            {renderTraslucidas(false)}
            {renderTraslaposLongitudinales(yCaballete, yFinVoladizo2, false)}
            {renderCorreas(numCorreasA2, false, L_r2, altoAgua2)}
            <text x={anchoSVG/2} y={yCaballete + (altoAgua2/2)} fontSize={fSizeEjes} fontWeight="bold" fill="#64748b" textAnchor="middle" opacity="0.5">AGUA 2</text>
            {renderCotasDivididas(cortesCotasA2, false)}
            
            {/* COTA VOLADIZO A2 */}
            {voladizo2Px > 0 && (
              <g>
                <line x1={paddingX + anchoDibujo + off1} y1={yFinAgua2} x2={paddingX + anchoDibujo + off1} y2={yFinVoladizo2} stroke="#1e3a8a" strokeWidth={strk} />
                <line x1={paddingX + anchoDibujo + off3} y1={yFinAgua2} x2={paddingX + anchoDibujo + off2} y2={yFinAgua2} stroke="#1e3a8a" strokeWidth={strk} />
                <line x1={paddingX + anchoDibujo + off3} y1={yFinVoladizo2} x2={paddingX + anchoDibujo + off2} y2={yFinVoladizo2} stroke="#1e3a8a" strokeWidth={strk} />
                <text x={paddingX + anchoDibujo + off2 + (3 * textScale)} y={yFinAgua2 + (voladizo2Px/2) + (fSizeVoladizo/3)} fontSize={fSizeVoladizo} fontWeight="bold" fill="#1e3a8a" textAnchor="start">Vol: {geoCubierta?.esSimetrica ? numVolA1 : numVolA2} m</text>
              </g>
            )}
          </g>
        )}

        <line x1={paddingX} y1={yCaballete} x2={paddingX + anchoDibujo} y2={yCaballete} stroke="#1e3a8a" strokeWidth={5 * textScale} />

        {/* COTA SUPERIOR (LARGO) */}
        <line x1={paddingX} y1={paddingY - off1} x2={paddingX + anchoDibujo} y2={paddingY - off1} stroke="#0f172a" strokeWidth={strk} />
        <line x1={paddingX} y1={paddingY - off2} x2={paddingX} y2={paddingY - off3} stroke="#0f172a" strokeWidth={strk} />
        <line x1={paddingX + anchoDibujo} y1={paddingY - off2} x2={paddingX + anchoDibujo} y2={paddingY - off3} stroke="#0f172a" strokeWidth={strk} />
        <text x={anchoSVG/2} y={paddingY - off2} fontSize={fSizeLargo} fontWeight="bold" fill="#0f172a" textAnchor="middle">Largo Total: {numGeoLargo} m</text>
      </svg>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", fontFamily: "Arial, sans-serif", backgroundColor: "#ffffff", overflow: "hidden" }}>
      
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { background-color: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-area { width: 100% !important; height: auto !important; box-shadow: none !important; border: none !important; overflow: visible !important; padding: 0 !important; }
        }
      `}</style>

      {menuCorrea.visible && (
        <div style={{ position: "fixed", top: menuCorrea.y, left: menuCorrea.x, backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "12px", zIndex: 3000, width: "220px" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: "bold", fontSize: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "10px", color: "#1e293b" }}>Correa N° {menuCorrea.index + 1} ({menuCorrea.isAgua1 ? "Agua 1" : "Agua 2"})</div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block" }}>Adicionar Traslapo (m):</label>
          <input type="number" step="0.05" style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "11px", boxSizing: "border-box", marginTop: "4px", marginBottom: "10px" }} value={menuCorrea.extraTraslapo} onChange={(e) => setMenuCorrea({...menuCorrea, extraTraslapo: e.target.value})} />
          <button onClick={aplicarTraslapoTransversal} style={{ width: "100%", backgroundColor: "#f97316", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold", marginBottom: "5px" }}>✂️ Aplicar Traslapo</button>
          {(menuCorrea.isAgua1 ? traslaposA1?.[menuCorrea.index] : traslaposA2?.[menuCorrea.index]) && (<button onClick={eliminarTraslapoTransversal} style={{ width: "100%", backgroundColor: "#ef4444", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>🗑️ Quitar Traslapo</button>)}
        </div>
      )}

      <div style={{ backgroundColor: "#1e293b", color: "#fff", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }} className="no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{ backgroundColor: "#fff", padding: "2px 6px", borderRadius: "4px", display: "flex", alignItems: "center" }}><img src={logoCortiza} alt="Cortiza" style={{ height: "29px", objectFit: "contain" }} /></div>
          <h2 style={{ margin: 0, fontSize: "16px", color: "#10b981" }}>DESPIECES DE CUBIERTA</h2>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setTabActiva("tejas")} style={tabBtnStyle(tabActiva === "tejas")}>🏠 Tejas y Estructura</button>
          <button onClick={() => setTabActiva("canales_remates")} style={tabBtnStyle(tabActiva === "canales_remates")}>💧 Canales y Remates</button>
          <button onClick={() => setTabActiva("resumen")} style={tabBtnStyle(tabActiva === "resumen")}>📊 Resumen Consolidado</button>
        </div>
      </div>

      <div style={{ backgroundColor: "#ffffff", borderBottom: "2px solid #cbd5e1", padding: "10px 20px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }} className="no-print">
        <div style={{ display: "flex", gap: "5px" }}><button onClick={nuevoDocumento} style={{ ...actionBtnStyle, backgroundColor: "#f39c12" }}>Nuevo</button><button onClick={abrirModalCarga} style={{ ...actionBtnStyle, backgroundColor: "#f39c12" }}>Abrir</button><button onClick={guardarDocumento} style={{ ...actionBtnStyle, backgroundColor: "#28a745" }}>Guardar</button><button onClick={guardarComoDocumento} style={{ ...actionBtnStyle, backgroundColor: "#20c997" }}>Guardar Como</button><button onClick={() => window.print()} style={{ ...actionBtnStyle, backgroundColor: "#5bc0de" }}>Imprimir</button></div>
        <div style={{ display: "flex", gap: "15px", flex: 1, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}><span style={labelBarraStyle}>Archivo:</span><input type="text" style={inputBarraStyle} value={nombreArchivo} onChange={(e) => setNombreArchivo(e.target.value)} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}><span style={labelBarraStyle}>Título:</span><input type="text" style={{...inputBarraStyle, width: "180px"}} value={tituloDocumento} onChange={(e) => setTituloDocumento(e.target.value)} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}><span style={labelBarraStyle}>Diseñador:</span><input type="text" style={inputBarraStyle} value={disenador} onChange={(e) => setDisenador(e.target.value)} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}><span style={labelBarraStyle}>Fecha:</span><input type="date" style={inputBarraStyle} value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        </div>
        {mensaje && <span style={{ fontSize: "11px", fontWeight: "bold", color: mensaje.includes("❌") ? "#dc2626" : "#2563eb" }}>{mensaje}</span>}
      </div>

      <div style={{ flex: 1, padding: "15px", overflowY: "hidden", display: "flex", gap: "15px", backgroundColor: "#ffffff", background: "#ffffff" }}>
        {tabActiva === "tejas" && (
          <>
            <div style={{ width: "240px", minWidth: "240px", backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", overflowY: "auto", border: "1px solid #e2e8f0" }} className="no-print">
              <h3 style={{ fontSize: "12px", color: "#10b981", marginTop: 0, borderBottom: "2px solid #10b981", paddingBottom: "5px" }}>PARÁMETROS ESTRUCTURA</h3>
              
              <div style={seccionFormStyle}>
                <strong style={labelTituloSeccion}>1. Cubierta (Metros)</strong>
                <label style={labelStyle}>Largo Cubierta (Ejes Y):</label><input type="number" style={inputStyle} value={geoCubierta?.largoCubierta ?? ""} onChange={(e) => setGeoCubierta({...geoCubierta, largoCubierta: e.target.value})} />
                
                <label style={labelStyle}>Ancho Cubierta (Fachada):</label><input type="number" style={inputStyle} value={geoCubierta?.anchoCubierta ?? ""} onChange={(e) => setGeoCubierta({...geoCubierta, anchoCubierta: e.target.value})} />
                
                {/* 💡 NUEVO: Aparece el ancho 2 si NO es simétrica y es a dos aguas */}
                {geoCubierta?.esDosAguas && !geoCubierta?.esSimetrica && (
                  <>
                    <label style={labelStyle}>Ancho Agua 2 (Fachada):</label>
                    <input type="number" style={inputStyle} value={geoCubierta?.anchoAgua2 ?? ""} onChange={(e) => setGeoCubierta({...geoCubierta, anchoAgua2: e.target.value})} />
                  </>
                )}

                <label style={checkboxLabelStyle}><input type="checkbox" checked={!!geoCubierta?.esSimetrica} onChange={(e) => setGeoCubierta({...geoCubierta, esSimetrica: e.target.checked})} /> Cubierta Simétrica</label>
                <label style={checkboxLabelStyle}><input type="checkbox" checked={!!geoCubierta?.esDosAguas} onChange={(e) => setGeoCubierta({...geoCubierta, esDosAguas: e.target.checked})} /> Es a Dos Aguas</label>
                
                {!geoCubierta?.esDosAguas && (
                  <div style={{ marginTop: "6px", backgroundColor: "#f8fafc", padding: "6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <label style={labelStyle}>Dirección de Caída (Un Agua):</label>
                    <select style={inputStyle} value={geoCubierta?.direccionUnAgua || 1} onChange={(e) => setGeoCubierta({...geoCubierta, direccionUnAgua: parseInt(e.target.value)})}>
                      <option value={1}>Hacia Arriba (Agua 1)</option>
                      <option value={2}>Hacia Abajo (Agua 2)</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={seccionFormStyle}>
                <strong style={labelTituloSeccion}>2. Pendiente</strong>
                <label style={checkboxLabelStyle}><input type="checkbox" checked={!!pendiente?.conoceAngulo} onChange={(e) => setPendiente({...pendiente, conoceAngulo: e.target.checked})} /> Conozco el ángulo (°)</label>
                
                {pendiente?.conoceAngulo ? (
                  <div style={{ marginTop: "8px" }}>
                    <label style={labelStyle}>Ángulo Agua 1 (°):</label><input type="number" style={inputStyle} value={pendiente?.anguloA1 ?? ""} onChange={(e) => setPendiente({...pendiente, anguloA1: e.target.value})} />
                    
                    {/* 💡 NUEVO: Ángulo Agua 2 */}
                    {geoCubierta?.esDosAguas && !geoCubierta?.esSimetrica && (
                      <>
                        <label style={labelStyle}>Ángulo Agua 2 (°):</label>
                        <input type="number" style={inputStyle} value={pendiente?.anguloA2 ?? ""} onChange={(e) => setPendiente({...pendiente, anguloA2: e.target.value})} />
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "4px", border: "1px solid #bfdbfe", marginTop: "8px" }}>
                    <span style={{ fontSize: "9px", color: "#1d4ed8", fontWeight: "bold" }}>Calc. por catetos (Agua 1):</span>
                    <label style={labelStyle}>Longitud plana (m):</label><input type="number" style={inputStyle} value={pendiente?.longitudPlanaA1 ?? ""} onChange={(e) => setPendiente({...pendiente, longitudPlanaA1: e.target.value})} />
                    <label style={labelStyle}>Altura caballete (m):</label><input type="number" style={inputStyle} value={pendiente?.alturaCaballeteA1 ?? ""} onChange={(e) => setPendiente({...pendiente, alturaCaballeteA1: e.target.value})} />
                    
                    {/* 💡 NUEVO: Catetos Agua 2 */}
                    {geoCubierta?.esDosAguas && !geoCubierta?.esSimetrica && (
                      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #93c5fd" }}>
                        <span style={{ fontSize: "9px", color: "#1d4ed8", fontWeight: "bold" }}>Calc. por catetos (Agua 2):</span>
                        <label style={labelStyle}>Longitud plana A2 (m):</label><input type="number" style={inputStyle} value={pendiente?.longitudPlanaA2 ?? ""} onChange={(e) => setPendiente({...pendiente, longitudPlanaA2: e.target.value})} />
                        <label style={labelStyle}>Altura caballete A2 (m):</label><input type="number" style={inputStyle} value={pendiente?.alturaCaballeteA2 ?? ""} onChange={(e) => setPendiente({...pendiente, alturaCaballeteA2: e.target.value})} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={seccionFormStyle}>
                <strong style={labelTituloSeccion}>3. Correas (Der. = Traslapo)</strong>
                <label style={labelStyle}>Cant. Correas Agua 1:</label><input type="number" style={inputStyle} value={estructura?.correasA1 ?? ""} onChange={(e) => setEstructura({...estructura, correasA1: e.target.value})} />
                {geoCubierta?.esDosAguas && (
                  <>
                    <label style={checkboxLabelStyle}><input type="checkbox" checked={!!estructura?.cantCorreasIguales} onChange={(e) => setEstructura({...estructura, cantCorreasIguales: e.target.checked})} /> Misma cant. Agua 2</label>
                    {!estructura?.cantCorreasIguales && (<><label style={labelStyle}>Cant. Correas Agua 2:</label><input type="number" style={inputStyle} value={estructura?.correasA2 ?? ""} onChange={(e) => setEstructura({...estructura, correasA2: e.target.value})} /></>)}
                  </>
                )}
              </div>

              <div style={seccionFormStyle}>
                <strong style={labelTituloSeccion}>4. Cubierta y Voladizo</strong>
                <label style={labelStyle}>Tipo de Teja:</label>
                <select style={inputStyle} value={especificaciones?.tejaSeleccionada?.id || ""} onChange={(e) => setEspecificaciones({...especificaciones, tejaSeleccionada: catalogoTejas.find(t => t.id === e.target.value)})}>
                  {catalogoTejas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
                <label style={labelStyle}>Voladizo a Canal A1 (m):</label><input type="number" step="0.1" style={inputStyle} value={especificaciones?.voladizoA1 ?? ""} onChange={(e) => setEspecificaciones({...especificaciones, voladizoA1: e.target.value})} />
                {geoCubierta?.esDosAguas && !geoCubierta?.esSimetrica && (<><label style={labelStyle}>Voladizo a Canal A2 (m):</label><input type="number" step="0.1" style={inputStyle} value={especificaciones?.voladizoA2 ?? ""} onChange={(e) => setEspecificaciones({...especificaciones, voladizoA2: e.target.value})} /></>)}
              </div>

              <div style={seccionFormStyle}>
                <strong style={labelTituloSeccion}>5. Tornillería</strong>
                <div style={{ marginBottom: "8px", borderBottom: "1px dashed #cbd5e1", paddingBottom: "8px" }}>
                  <span style={{ fontSize: "10px", color: "#1d4ed8", fontWeight: "bold" }}>Tornillos de Fijación:</span>
                  <label style={checkboxLabelStyle}><input type="checkbox" checked={!!fijaciones?.fijacionTodas} onChange={(e) => setFijaciones({...fijaciones, fijacionTodas: e.target.checked})} />En todas las correas</label>
                  {!fijaciones?.fijacionTodas && (
                    <div style={{ marginTop: "4px" }}>
                      <label style={labelStyle}>Correas A1 (Ej: 1, 3, 5):</label><input type="text" style={inputStyle} value={fijaciones?.fijacionA1 ?? ""} onChange={(e) => setFijaciones({...fijaciones, fijacionA1: e.target.value})} placeholder="Ej: 1, 3, 5" />
                      {geoCubierta?.esDosAguas && (<><label style={labelStyle}>Correas A2 (Ej: 1, 3):</label><input type="text" style={inputStyle} value={fijaciones?.fijacionA2 ?? ""} onChange={(e) => setFijaciones({...fijaciones, fijacionA2: e.target.value})} placeholder="Ej: 1, 3" /></>)}
                    </div>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#b91c1c", fontWeight: "bold" }}>Tornillos de Refuerzo:</span>
                  <select style={{...inputStyle, marginTop: "4px"}} value={fijaciones?.refuerzoCant ?? 0} onChange={(e) => setFijaciones({...fijaciones, refuerzoCant: parseInt(e.target.value)})}>
                    <option value={0}>0 Tornillos en el centro</option>
                    <option value={1}>1 Tornillo en el centro</option>
                    <option value={2}>2 Tornillos en el centro</option>
                    <option value={3}>3 Tornillos en el centro</option>
                  </select>
                  {fijaciones?.refuerzoCant > 0 && (
                    <>
                      <label style={checkboxLabelStyle}><input type="checkbox" checked={!!fijaciones?.refuerzoTodas} onChange={(e) => setFijaciones({...fijaciones, refuerzoTodas: e.target.checked})} />En todas las correas</label>
                      {!fijaciones?.refuerzoTodas && (
                        <div style={{ marginTop: "4px" }}>
                          <label style={labelStyle}>Correas A1 (Ej: 2, 4, 6):</label><input type="text" style={inputStyle} value={fijaciones?.refuerzoA1 ?? ""} onChange={(e) => setFijaciones({...fijaciones, refuerzoA1: e.target.value})} placeholder="Ej: 2, 4" />
                          {geoCubierta?.esDosAguas && (<><label style={labelStyle}>Correas A2 (Ej: 2, 4):</label><input type="text" style={inputStyle} value={fijaciones?.refuerzoA2 ?? ""} onChange={(e) => setFijaciones({...fijaciones, refuerzoA2: e.target.value})} placeholder="Ej: 2, 4" /></>)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* --- NUEVA SECCIÓN: TRASLÚCIDAS --- */}
              <div style={seccionFormStyle}>
                <strong style={labelTituloSeccion}>6. Tejas Traslúcidas</strong>
                <label style={checkboxLabelStyle}>
                  <input type="checkbox" checked={!!traslucidas?.habilitada} onChange={(e) => setTraslucidas({...traslucidas, habilitada: e.target.checked})} />
                  Incluir Franjas Traslúcidas
                </label>
                {traslucidas?.habilitada && (
                  <div style={{ marginTop: "8px", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }}>
                    <label style={labelStyle}>Ancho Útil Traslúcida:</label>
                    <select style={inputStyle} value={traslucidas?.tejaSeleccionada?.id || ""} onChange={(e) => setTraslucidas({...traslucidas, tejaSeleccionada: catalogoTejas.find(t => t.id === e.target.value)})}>
                      {catalogoTejas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    
                    <div style={{ marginTop: "6px" }}>
                      <label style={labelStyle}>Franjas Agua 1 (Ej: 3, 7, 13):</label>
                      <input type="text" style={inputStyle} value={traslucidas?.posicionesA1 || ""} onChange={(e) => setTraslucidas({...traslucidas, posicionesA1: e.target.value})} placeholder={`Ej: 3, 7`} />
                    </div>
                    
                    {geoCubierta?.esDosAguas && (
                      <div style={{ marginTop: "6px" }}>
                        <label style={labelStyle}>Franjas Agua 2 (Ej: 3, 7):</label>
                        <input type="text" style={inputStyle} value={traslucidas?.posicionesA2 || ""} onChange={(e) => setTraslucidas({...traslucidas, posicionesA2: e.target.value})} placeholder={`Ej: 2, 8`} />
                      </div>
                    )}
                    {/* 💡 NUEVO: Control independiente de refuerzos para traslúcidas */}
                    <div style={{ marginTop: "12px", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#7e22ce", fontWeight: "bold" }}>Tornillos de Refuerzo (Solo Traslúcidas):</span>
                      <select style={{...inputStyle, marginTop: "4px"}} value={traslucidas?.refuerzoCant ?? 0} onChange={(e) => setTraslucidas({...traslucidas, refuerzoCant: parseInt(e.target.value)})}>
                        <option value={0}>0 Tornillos en el centro</option>
                        <option value={1}>1 Tornillo en el centro</option>
                        <option value={2}>2 Tornillos en el centro</option>
                        <option value={3}>3 Tornillos en el centro</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="print-area" style={{ flex: 1, backgroundColor: "#ffffff", padding: "10px 20px 20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #f39c12", paddingBottom: "4px", marginBottom: "10px" }}>
                <img src={logoCortiza} alt="Cortiza" style={{ width: "50px", objectFit: "contain" }} />
                <div style={{ textAlign: "right" }}>
                  <h1 style={{ margin: 0, fontSize: "18px", color: "#f39c12", fontWeight: "bold", textTransform: "uppercase" }}>{tituloDocumento}</h1>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px", display: "flex", gap: "15px", justifyContent: "flex-end" }}>
                    <span><strong>Diseñador:</strong> {disenador || "____________________"}</span>
                    <span><strong>Fecha:</strong> {fecha || "____________________"}</span>
                  </div>
                </div>
              </div>

              {/* FILA 1: DATOS METÁLICOS Y ÁREAS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "8px" }}>
                <div style={kpiBoxStyle}><span style={kpiLabelStyle}>ÁREA METÁLICA</span><strong style={{...kpiValueStyle, color: "#f97316"}}>{areaTotal.toFixed(2)} m²</strong></div>
                <div style={{...kpiBoxStyle, border: "1px solid #94a3b8", backgroundColor: "#f8fafc"}}><span style={kpiLabelStyle}>TEJAS METÁLICAS</span><strong style={kpiValueStyle}>{cantMetalicasA1} {geoCubierta?.esDosAguas ? `| ${cantMetalicasA2}` : ''} unds</strong></div>
                
                {/* Nuevos colores Azul Cielo para el Área Traslúcida */}
                <div style={{...kpiBoxStyle, border: "1px solid #7dd3fc", backgroundColor: "#f0f9ff"}}><span style={{...kpiLabelStyle, color: "#0369a1"}}>ÁREA TRASLÚCIDA</span><strong style={{...kpiValueStyle, color: "#0284c7"}}>{areaTotalTraslucida.toFixed(2)} m²</strong></div>
                <div style={{...kpiBoxStyle, border: "1px solid #bae6fd", backgroundColor: "#f0f9ff"}}><span style={{...kpiLabelStyle, color: "#0284c7"}}>FRANJAS TRASLÚCIDAS</span><strong style={{...kpiValueStyle, color: "#0369a1"}}>{cantTraslucidasA1} {geoCubierta?.esDosAguas ? `| ${cantTraslucidasA2}` : ''} unds</strong></div>
                
                <div style={{...kpiBoxStyle, border: "1px solid #93c5fd", backgroundColor: "#eff6ff"}}><span style={{...kpiLabelStyle, color: "#1d4ed8"}}>FIJACIÓN METÁLICA</span><strong style={{...kpiValueStyle, color: "#2563eb"}}>{fijacionMetalica} unds</strong></div>
                <div style={{...kpiBoxStyle, border: "1px solid #fca5a5", backgroundColor: "#fef2f2"}}><span style={{...kpiLabelStyle, color: "#b91c1c"}}>REFUERZO METÁLICA</span><strong style={{...kpiValueStyle, color: "#ef4444"}}>{refuerzoMetalica} unds</strong></div>
                <div style={{...kpiBoxStyle, border: "1px solid #fcd34d", backgroundColor: "#fffbeb"}}><span style={{...kpiLabelStyle, color: "#b45309"}}>TOTAL TORN. METÁLICA</span><strong style={{...kpiValueStyle, color: "#d97706", fontSize: "16px"}}>{totalTornillosMetalica} unds</strong></div>
              </div>

              {/* FILA 2: DATOS DE TORNILLOS TRASLÚCIDOS AISLADOS ABAJO */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "15px", flexWrap: "wrap" }}>
                {/* Fijación asume el Púrpura del dibujo */}
                <div style={{...kpiBoxStyle, flex: "1 1 130px", border: "1px solid #d8b4fe", backgroundColor: "#faf5ff"}}><span style={{...kpiLabelStyle, color: "#7e22ce"}}>FIJACIÓN TRASL.</span><strong style={{...kpiValueStyle, color: "#9333ea"}}>{fijacionTraslucida} unds</strong></div>
                {/* Refuerzo asume Rosado para diferenciar */}
                <div style={{...kpiBoxStyle, flex: "1 1 130px", border: "1px solid #fbcfe8", backgroundColor: "#fdf2f8"}}><span style={{...kpiLabelStyle, color: "#be185d"}}>REFUERZO TRASL.</span><strong style={{...kpiValueStyle, color: "#db2777"}}>{refuerzoTraslucida} unds</strong></div>
                {/* Total asume color Índigo/Azul Oscuro Nuevo */}
                <div style={{...kpiBoxStyle, flex: "1 1 130px", border: "1px solid #a5b4fc", backgroundColor: "#eef2ff"}}><span style={{...kpiLabelStyle, color: "#4338ca"}}>TOTAL TORN. TRASL.</span><strong style={{...kpiValueStyle, color: "#4f46e5", fontSize: "16px"}}>{totalTornillosTraslucida} unds</strong></div>
              </div>

              <h3 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "14px", textTransform: "uppercase" }}>Visualización Despiece Cubierta</h3>
              <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: "15px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                {dibujarEstructuraSVG()}
              </div>
              
              <h3 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "14px", borderTop: "2px solid #f1f5f9", paddingTop: "10px" }}>Cubicación de Tejas para Fabricación</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid #cbd5e1" }}>
                <thead>
                  <tr>
                    <th style={tableThStyle}>Vertiente</th>
                    <th style={tableThStyle}>Tipo de Teja</th>
                    <th style={tableThStyle}>Tramo de Teja</th>
                    <th style={tableThStyle}>Medida Corte (m)</th>
                    <th style={tableThStyle}>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {todosLosTramos.map((tramo, i) => (
                    <tr key={i} style={{ backgroundColor: tramo.tipo === "Traslúcida" ? "#f0fdf4" : "transparent" }}>
                      <td style={tableTdStyle}><strong>{tramo.agua}</strong></td>
                      <td style={{...tableTdStyle, color: tramo.tipo === "Traslúcida" ? "#16a34a" : "#475569", fontWeight: "bold"}}>{tramo.tipo}</td>
                      <td style={tableTdStyle}>{tramo.etiqueta}</td>
                      <td style={{...tableTdStyle, color: "#2563eb", fontWeight: "bold"}}>{(parseFloat(tramo.medida) || 0).toFixed(2)} m</td>
                      <td style={{...tableTdStyle, color: tramo.tipo === "Traslúcida" ? "#15803d" : "#10b981", fontWeight: "bold"}}>{tramo.cantidad} unds</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <td colSpan="4" style={{...tableTdStyle, textAlign: "right", fontWeight: "bold"}}>TOTAL TEJAS A FABRICAR:</td>
                    <td style={{...tableTdStyle, color: "#f97316", fontWeight: "bold", fontSize: "14px"}}>{todosLosTramos.reduce((sum, t) => sum + t.cantidad, 0)} unds</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {tabActiva === "canales_remates" && ( <div className="print-area" style={{flex: 1, backgroundColor:"#fff", padding: "20px", borderRadius: "8px"}}>Módulo Canales y Remates</div> )}
        {tabActiva === "resumen" && ( <div className="print-area" style={{flex: 1, backgroundColor:"#fff", padding: "20px", borderRadius: "8px"}}>Hoja Resumen General</div> )}

      </div>

      {modalAbierto && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }} className="no-print">
          <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "8px", width: "400px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "10px" }}>
              <h4 style={{ margin: 0 }}>Abrir Proyecto Guardado</h4>
              <button onClick={() => setModalAbierto(false)} style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            </div>
            {cargandoLista ? <p>Cargando proyectos...</p> : listaProyectos.length === 0 ? <p>No hay proyectos guardados.</p> : (
              <div>
                {listaProyectos.map((p) => (
                  <div key={p.id} onClick={() => cargarProyecto(p)} style={{ padding: "10px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>
                    <span style={{ fontWeight: "bold", color: "#2563eb", display: "block" }}>{p.nombre_proyecto}</span>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Actualizado: {new Date(p.ultima_actualizacion).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const tabBtnStyle = (active) => ({ backgroundColor: active ? "#10b981" : "#334155", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" });
const actionBtnStyle = { color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" };
const labelBarraStyle = { fontSize: "10px", fontWeight: "bold", color: "#475569" };
const inputBarraStyle = { padding: "4px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "4px", width: "120px" };

const seccionFormStyle = { marginBottom: "12px", padding: "10px", backgroundColor: "#ffffff", borderRadius: "6px", border: "1px solid #cbd5e1" };
const labelTituloSeccion = { fontSize: "11px", color: "#334155", display: "block", marginBottom: "6px" };
const labelStyle = { fontSize: "10px", fontWeight: "bold", color: "#475569", display: "block", marginTop: "6px", marginBottom: "2px" };
const inputStyle = { width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "11px", boxSizing: "border-box" };
const checkboxLabelStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: "bold", color: "#1e293b", marginTop: "8px", cursor: "pointer" };
const kpiBoxStyle = { backgroundColor: "#ffffff", padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0", textAlign: "center" };
const kpiLabelStyle = { fontSize: "8px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "2px" };
const kpiValueStyle = { fontSize: "14px", color: "#0f172a" };

const tableThStyle = { padding: "8px 12px", backgroundColor: "#f1f5f9", color: "#475569", fontWeight: "bold", fontSize: "11px", textAlign: "left", borderBottom: "2px solid #cbd5e1" };
const tableTdStyle = { padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "11px", color: "#334155" };

export default CalculoDespieces;