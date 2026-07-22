import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
// Importamos el logo localmente desde la carpeta src
import logoCortiza from './logo-cortiza.png';

const DisenadorRemates = () => {
  const [proyectosList, setProyectosList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState("Diseño_001");
  const [tituloHoja, setTituloHoja] = useState("DISEÑO DE REMATES Y CANALES");
  const [remates, setRemates] = useState([{
    id: Date.now(),
    titulo: "Remate Principal",
    caraColor: "exterior",
    tramos: [
      { longitud: 40, angulo: 90 },
      { longitud: 180, angulo: 15 },
      { longitud: 20, angulo: 90 }
    ],
    caracteristicas: [
      { key: "Calibre", value: "26" },
      { key: "Color", value: "Blanco Almendra" },
      { key: "Desarrollo", value: "240 mm" },
      { key: "Unidades", value: "" }
    ]
  }]);
  const [mensaje, setMensaje] = useState("");

  // --- LÓGICA AUTOMÁTICA DE DESARROLLO ---
  useEffect(() => {
    const nuevosRemates = remates.map(r => {
      const sumaDesarrollo = r.tramos.reduce((acc, t) => {
        const l = parseFloat(t.longitud) || 0;
        return l > 5 ? acc + l : acc;
      }, 0);

      const nuevasCaracteristicas = r.caracteristicas.map(c => {
        if (c.key.toLowerCase().includes("desarrollo")) {
          return { ...c, value: `${sumaDesarrollo} mm` };
        }
        return c;
      });

      return { ...r, caracteristicas: nuevasCaracteristicas };
    });

    if (JSON.stringify(nuevosRemates) !== JSON.stringify(remates)) {
      setRemates(nuevosRemates);
    }
  }, [remates]);

  // --- PERSISTENCIA ---
  const nuevoProyecto = () => {
    if (window.confirm("¿Nuevo proyecto? Se limpiará la pantalla.")) {
      setProjectId(null);
      setNombreArchivo("Diseño_Nuevo");
      setTituloHoja("DISEÑO DE REMATES");
      setRemates([{
        id: Date.now(),
        titulo: "Nuevo Remate",
        caraColor: "ninguna",
        tramos: [{ longitud: 100, angulo: 90 }],
        caracteristicas: [
          { key: "Calibre", value: "" }, { key: "Color", value: "" },
          { key: "Desarrollo", value: "0 mm" }, { key: "Unidades", value: "" }
        ]
      }]);
    }
  };

  const guardarProyecto = async () => {
    setMensaje("Guardando...");
    const payload = {
      nombre_proyecto: nombreArchivo,
      tramos: { remates, tituloHoja },
      ultima_actualizacion: new Date()
    };

    let result = projectId 
      ? await supabase.from('diseños_canales').update(payload).eq('id', projectId)
      : await supabase.from('diseños_canales').insert([payload]).select();

    if (result.data && !projectId) setProjectId(result.data[0].id);
    setMensaje(result.error ? "❌ Error" : "✅ Guardado");
  };

  const listarProyectos = async () => {
    const { data } = await supabase.from('diseños_canales').select('id, nombre_proyecto, ultima_actualizacion');
    setProyectosList(data || []);
    setShowModal(true);
  };

  const cargarProyecto = async (id) => {
    const { data } = await supabase.from('diseños_canales').select('*').eq('id', id).single();
    if (data) {
      setProjectId(data.id);
      setNombreArchivo(data.nombre_proyecto);
      const rematesCargados = (data.tramos.remates || data.tramos).map(r => ({
        ...r,
        caraColor: r.caraColor || "ninguna"
      }));
      setRemates(rematesCargados); 
      setTituloHoja(data.tramos.tituloHoja || "DISEÑO DE REMATES");
      setShowModal(false);
    }
  };

  return (
    <div className="main-container" style={{ display: 'flex', height: '100vh', fontFamily: 'Arial', backgroundColor: '#f0f2f5' }}>
      
      <style>{`
        @media print { 
          .no-print { display: none !important; } 
          body, html, .main-container { background: white !important; height: auto !important; overflow: visible !important; display: block !important; }
          .print-area { width: 100% !important; padding: 0 !important; display: flex !important; flex-direction: column !important; min-height: 100vh !important; } 
          .print-header { display: flex !important; margin-bottom: 10px !important; padding-bottom: 10px !important; } 
          /* Magia para distribuir los remates equitativamente: */
          .remates-wrapper { flex: 1 !important; display: flex !important; flex-direction: column !important; justify-content: space-evenly !important; }
          .remate-item { border-bottom: 1px dashed #ccc !important; padding-bottom: 10px !important; margin-bottom: 0 !important; }
          .remate-item:last-child { border-bottom: none !important; }
          @page { size: letter portrait; margin: 0.5cm; }
        }
      `}</style>
      
      {/* PANEL DE CONTROL IZQUIERDO */}
      <div className="no-print" style={{ width: '280px', backgroundColor: '#fff', borderRight: '2px solid #ddd', overflowY: 'auto', padding: '15px', boxShadow: '2px 0 5px rgba(0,0,0,0.05)' }}>
        
        {/* LOGO INSERTO EN LA PARTE SUPERIOR IZQUIERDA DEL PANEL */}
        <div style={{ display: 'flex', justifyContent: 'left', marginBottom: '15px' }}>
          <img src={logoCortiza} alt="Logo Cortiza" style={{ maxWidth: '70px', height: 'auto' }} />
        </div>

        {/* CONTENEDOR DE BOTONES Y NOMBRE DE ARCHIVO */}
        <div style={{ marginBottom: '5px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {/* Fila 1: Nuevo, Abrir, Guardar */}
            <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
              <button onClick={nuevoProyecto} style={{ ...btnStyle, flex: 1, backgroundColor: '#f39c12', color: '#fff', fontWeight: 'bold', border: 'none' }}>Nuevo</button>
              <button onClick={listarProyectos} style={{ ...btnStyle, flex: 1, backgroundColor: '#f39c12', color: '#fff', fontWeight: 'bold', border: 'none' }}>Abrir</button>
              <button onClick={guardarProyecto} style={{ ...btnStyle, flex: 1, backgroundColor: '#28a745', color: '#fff', fontWeight: 'bold', border: 'none' }}>Guardar</button>
            </div>
            {/* Fila 2: Imprimir */}
            <button onClick={() => window.print()} style={{ ...btnStyle, width: '100%', backgroundColor: '#5bc0de', color: '#fff', fontWeight: 'bold', border: 'none', padding: '8px' }}>Imprimir</button>
          </div>
          <label style={{ fontSize: '10px', color: '#666' }}>NOMBRE DEL ARCHIVO:</label>
          <input style={inputStyle} value={nombreArchivo} onChange={e => setNombreArchivo(e.target.value)} />
          <p style={{ color: 'blue', fontSize: '11px', margin: '5px 0' }}>{mensaje}</p>
        </div>

        <label style={{ fontSize: '10px', fontWeight: 'bold' }}>TÍTULO DE LA HOJA:</label>
        <input style={{ ...inputStyle, marginBottom: '20px', border: '1px solid #f39c12' }} value={tituloHoja} onChange={e => setTituloHoja(e.target.value)} />

       {remates.map((r, rIdx) => (
          <div key={r.id} style={cardStyle}>
            {/* NUEVO ENCABEZADO CON BOTÓN DE ELIMINAR REMATE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
              <input style={{ fontWeight: 'bold', width: '100%', fontSize: '16px', border: 'none', outline: 'none' }} value={r.titulo} onChange={e => {
                const n = [...remates]; n[rIdx].titulo = e.target.value; setRemates(n);
              }} />
              <button 
                onClick={() => {
                  if (window.confirm(`¿Seguro que deseas eliminar el "${r.titulo}" por completo?`)) {
                    const n = remates.filter((_, i) => i !== rIdx);
                    setRemates(n);
                  }
                }} 
                style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }} 
                title="Eliminar Remate Completo"
              >
                🗑️
              </button>
            </div>
            
            <p style={labelStyle}>INDICACIÓN DE COLOR:</p>
            <select 
              style={{ ...inputStyle, marginBottom: '10px', padding: '6px', fontSize: '12px' }}
              value={r.caraColor}
              onChange={e => {
                const n = [...remates]; n[rIdx].caraColor = e.target.value; setRemates(n);
              }}
            >
              <option value="ninguna">No indicar cara de color</option>
              <option value="exterior">Color en la parte Superior / Exterior</option>
              <option value="interior">Color en la parte Inferior / Interior</option>
            </select>

            <p style={labelStyle}>PASOS DE DIBUJO (Ángulo | Largo):</p>
            {r.tramos.map((t, tIdx) => (
              <div key={tIdx} style={{ display: 'flex', gap: '5px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{fontSize: '10px', color: '#ccc'}}>{tIdx + 1}</span>
                <input type="number" placeholder="Ang°" style={{ width: '60px', padding: '4px' }} value={t.angulo} onChange={e => {
                  const n = [...remates]; n[rIdx].tramos[tIdx].angulo = e.target.value; setRemates(n);
                }} />
                <input type="number" placeholder="Long mm" style={{ width: '80px', padding: '4px' }} value={t.longitud} onChange={e => {
                  const n = [...remates]; n[rIdx].tramos[tIdx].longitud = e.target.value; setRemates(n);
                }} />
                <button onClick={() => {
                   const n = [...remates]; n[rIdx].tramos.splice(tIdx, 1); setRemates(n);
                }} style={{border: 'none', background: 'none', color: 'red', cursor: 'pointer'}}>×</button>
              </div>
            ))}
            <button onClick={() => {
              const n = [...remates]; n[rIdx].tramos.push({ longitud: 100, angulo: 0 }); setRemates(n);
            }} style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: '1px solid #2563eb', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>+ Añadir Línea</button>

            <p style={labelStyle}>DATOS DE FICHA TÉCNICA:</p>
            {r.caracteristicas.map((c, cIdx) => (
              <div key={cIdx} style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                <input style={{ width: '85px', fontSize: '11px', padding: '2px' }} value={c.key} readOnly={c.key.toLowerCase().includes("desarrollo")} />
                <input style={{ width: '120px', fontSize: '11px', padding: '2px', backgroundColor: c.key.toLowerCase().includes("desarrollo") ? '#e9ecef' : '#fff' }} value={c.value} onChange={e => {
                  if(!c.key.toLowerCase().includes("desarrollo")) {
                    const n = [...remates]; n[rIdx].caracteristicas[cIdx].value = e.target.value; setRemates(n);
                  }
                }} placeholder={c.key.toLowerCase().includes("desarrollo") ? "Calculado" : ""} />
              </div>
            ))}
          </div>
        ))}
        <button onClick={() => setRemates([...remates, { id: Date.now(), titulo: "Nuevo Remate", caraColor: "ninguna", tramos: [{ longitud: 100, angulo: 0 }], caracteristicas: [{ key: "Calibre", value: "" }, { key: "Color", value: "" }, { key: "Desarrollo", value: "0 mm" }, { key: "Unidades", value: "" }] }])} style={{ width: '100%', padding: '12px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px' }}>+ ADICIONAR OTRO REMATE</button>
      </div>

      {/* ÁREA DE TRABAJO IMPRIMIBLE */}
      <div className="print-area" style={{ flex: 1, backgroundColor: '#fff', padding: '40px', overflowY: 'auto' }}>
        
        {/* ENCABEZADO DE IMPRESIÓN MODERNO CON EL LOGO INCLUIDO EN EL PDF */}
        <div className="print-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '3px solid #f39c12', paddingBottom: '15px' }}>
          <img src={logoCortiza} alt="Logo Cortiza Impresión" style={{ maxWidth: '70px', height: 'auto' }} />
          <h1 style={{ margin: 0, color: '#f39c12', textTransform: 'uppercase', fontSize: '20px', textAlign: 'right', flex: 1, marginLeft: '20px' }}>
            {tituloHoja}
          </h1>
        </div>
        
        {/* CONTENEDOR FLEX PARA DISTRIBUIR EQUITATIVAMENTE EN IMPRESIÓN */}
        <div className="remates-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          {remates.map(r => (
            <div key={r.id} className="remate-item" style={{ display: 'flex', borderBottom: '1px solid #ddd', paddingBottom: '15px', alignItems: 'center', pageBreakInside: 'avoid' }}>
              <div style={{ flex: 1 }}>
                <DibujoSVG tramos={r.tramos} caraColor={r.caraColor} caracteristicas={r.caracteristicas} />
              </div>
              <div style={{ width: '260px', borderLeft: '4px solid #f39c12', paddingLeft: '15px', marginLeft: '15px' }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '17px', color: '#2c3e50' }}>{r.titulo}</h2>
                {r.caracteristicas.map((c, i) => (
                  <div key={i} style={{ fontSize: '12px', marginBottom: '4px' }}>
                    <strong style={{color: '#555'}}>{c.key}:</strong> {c.value}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div> 

      {/* MODAL OPEN */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{marginTop: 0}}>Abrir Diseño Guardado</h3>
            <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                {proyectosList.map(p => (
                <div key={p.id} onClick={() => cargarProyecto(p.id)} style={itemProyectoStyle}>
                    <strong>{p.nombre_proyecto}</strong>
                    <small style={{color: '#999'}}>{new Date(p.ultima_actualizacion).toLocaleString()}</small>
                </div>
                ))}
            </div>
            <button onClick={() => setShowModal(false)} style={{ marginTop: '20px', width: '100%', padding: '8px' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MOTOR DE DIBUJO GEOMÉTRICO (FILTRO DE COTAS <= 5MM) ---
const DibujoSVG = ({ tramos, caraColor, caracteristicas }) => {
  let x = 120, y = 110;
  let pathData = `M ${x} ${y}`;
  const etiquetas = [];
  const lineasProcesadas = [];

  const objetoColor = caracteristicas.find(c => c.key.toLowerCase() === 'color');
  const nombreColor = objetoColor && objetoColor.value ? objetoColor.value : "Color";

  let maxLong = -1;
  let indiceTramoLargo = 0;

  tramos.forEach((t, i) => {
    const long = parseFloat(t.longitud) || 0;
    if (long > maxLong) {
      maxLong = long;
      indiceTramoLargo = i;
    }

    const ang = parseFloat(t.angulo) || 0;
    const rad = (ang * Math.PI) / 180;
    
    const nx = x + (long * Math.cos(rad) * 0.7);
    const ny = y + (long * Math.sin(rad) * 0.7);

    pathData += ` L ${nx} ${ny}`;
    lineasProcesadas.push({ x1: x, y1: y, x2: nx, y2: ny, midX: (x + nx) / 2, midY: (y + ny) / 2, anguloRad: rad, longitud: long });

    x = nx; y = ny;
  });

  lineasProcesadas.forEach((linea, i) => {
    const normalAng = linea.anguloRad + Math.PI / 2;
    let offsetCota = -12; 

    if (i === indiceTramoLargo && caraColor === 'exterior') {
      offsetCota = 12; 
    }

    const mx = linea.midX + Math.cos(normalAng) * offsetCota;
    const my = linea.midY + Math.sin(normalAng) * offsetCota;

    etiquetas.push({ mx, my, val: linea.longitud });
  });

  let flechaG = null;
  if (lineasProcesadas.length > 0 && indiceTramoLargo < lineasProcesadas.length) {
    const tLargo = lineasProcesadas[indiceTramoLargo];
    const pAng = tLargo.anguloRad + Math.PI / 2;

    const factorDir = caraColor === 'exterior' ? -1 : 1;
    const fX1 = tLargo.midX + Math.cos(pAng) * (38 * factorDir);
    const fY1 = tLargo.midY + Math.sin(pAng) * (38 * factorDir);
    const fX2 = tLargo.midX + Math.cos(pAng) * (10 * factorDir);
    const fY2 = tLargo.midY + Math.sin(pAng) * (10 * factorDir);

    const tX = tLargo.midX + Math.cos(pAng) * (52 * factorDir);
    const tY = tLargo.midY + Math.sin(pAng) * (52 * factorDir) + 4;

    if (caraColor !== 'ninguna') {
      flechaG = (
        <g>
          <line x1={fX1} y1={fY1} x2={fX2} y2={fY2} stroke="#7f8c8d" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x={tX} y={tY} fontSize="11" fill="#4f5d73" fontWeight="bold" textAnchor="middle">{nombreColor}</text>
        </g>
      );
    }
  }

  return (
    <svg width="100%" height="150" viewBox="0 0 500 240" style={{ backgroundColor: '#fafafa', borderRadius: '6px', maxHeight: '150px' }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#7f8c8d" />
        </marker>
      </defs>

      <path d={pathData} fill="none" stroke="#2c3e50" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      
      {flechaG}

      {etiquetas.map((e, i) => {
        if (parseFloat(e.val) <= 5) return null;
        return (
          <text key={i} x={e.mx} y={e.my + 3} fontSize="11" fill="#e74c3c" fontWeight="bold" textAnchor="middle">
            {e.val}
          </text>
        );
      })}
    </svg>
  );
};

const btnStyle = { padding: '6px 10px', fontSize: '11px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' };
const inputStyle = { width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' };
const cardStyle = { background: '#fff', border: '1px solid #ddd', padding: '15px', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' };
const labelStyle = { fontSize: '10px', fontWeight: 'bold', color: '#999', margin: '15px 0 8px 0', textTransform: 'uppercase' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 };
const modalContentStyle = { background: 'white', padding: '25px', borderRadius: '12px', width: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const itemProyectoStyle = { padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer' };

export default DisenadorRemates;