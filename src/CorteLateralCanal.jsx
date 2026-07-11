import React from 'react';

const CorteLateralCanal = ({ 
  plieguesGlobales = [],
  matrizPliegues = {},
  columnasMapeadas = [],
  configColumnas = {}
}) => {

  // --- MOTOR GRÁFICO SECCIONAL ---
  const generarRutaPerfilCanal = () => {
    let x = 60;
    let y = 140; 
    let anguloAcumulado = 0;
    const lineas = [];

    plieguesGlobales.forEach((p, idx) => {
      const long = parseFloat(p.longitud) || 0;
      const ang = parseFloat(p.angulo) || 0;

      const rad = (anguloAcumulado * Math.PI) / 180;
      const nextX = x + (long / 2.8) * Math.cos(rad);
      const nextY = y + (long / 2.8) * Math.sin(rad);

      lineas.push({ x1: x, y1: y, x2: nextX, y2: nextY, index: idx, longitudReal: long });
      
      x = nextX;
      y = nextY;
      anguloAcumulado += ang;
    });

    return lineas;
  };

  const lineasPerfil = generarRutaPerfilCanal();

  // --- ORDENACIÓN DE HITOS LONGITUDINALES ---
  const generarHitosLongitudinalesCompletos = () => {
    const hitos = [];
    columnasMapeadas.forEach((col, cIdx) => {
      hitos.push({
        tipo: 'viga',
        label: `Viga ${col.numero}`,
        keyHash: `viga-${col.id}`,
        x: col.x
      });

      if (cIdx < columnasMapeadas.length - 1) {
        const config = configColumnas[col.id] || {};
        const listaT = config.listaTraslapos || [];
        const sigCol = columnasMapeadas[cIdx + 1];

        if (listaT.length > 0) {
          const pasoX = (sigCol.x - col.x) / (listaT.length + 1);
          listaT.forEach((_, tIdx) => {
            hitos.push({
              tipo: 'traslapo',
              label: `V${col.numero}-T${tIdx + 1}`,
              keyHash: `traslapo-${col.id}-${tIdx}`,
              x: col.x + (pasoX * (tIdx + 1))
            });
          });
        }
      }
    });
    return hitos;
  };

  const todosLosHitos = generarHitosLongitudinalesCompletos();

  // --- 📐 MOTOR DE ESCALA PROPORCIONAL VISUAL HORIZONTAL ---
  // Para que las franjas varíen su grosor visual según los mm asignados
  const obtenerAlturasProporcionales = () => {
    const altosPorPliegue = plieguesGlobales.map((pg, fIdx) => {
      let maxMedidaEnEstaCara = 0;
      todosLosHitos.forEach(hito => {
        const plieguesDelHito = matrizPliegues[hito.keyHash] || [];
        const cara = plieguesDelHito[fIdx] || { longitud: pg.longitud };
        const valor = parseFloat(cara.longitud) || 0;
        if (valor > maxMedidaEnEstaCara) maxMedidaEnEstaCara = valor;
      });
      return Math.max(maxMedidaEnEstaCara, 20); // Asegurar un mínimo visual de 20mm
    });

    const sumaAlturasReales = altosPorPliegue.reduce((a, b) => a + b, 0) || 1;
    const altoGraficoDisponible = 135; 
    
    // Mapear cada cara a píxeles escalados proporcionales
    return altosPorPliegue.map(alt => (alt / sumaAlturasReales) * altoGraficoDisponible);
  };

  const alturasEscaladas = obtenerAlturasProporcionales();

  return (
    <div style={{ marginTop: '25px', borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }}>
      
      {/* SECCIÓN 1: TABLA LONGITUDINAL CON FILAS PROPORCIONALES DINÁMICAS */}
      <div style={{ width: '100%', backgroundColor: '#fdfdfd', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
          Corte superior ancho parades canal</span>
        
        <svg width="100%" height="195" viewBox="0 0 816 195" style={{ background: '#fff' }}>
          {todosLosHitos.map((hito, idx) => (
            <g key={`eje-long-${idx}`}>
              <line 
                x1={hito.x} 
                y1={25} 
                x2={hito.x} 
                y2={170} 
                stroke={hito.tipo === 'viga' ? '#64748b' : '#cbd5e1'} 
                strokeWidth={hito.tipo === 'viga' ? '1.2' : '1'} 
                strokeDasharray={hito.tipo === 'viga' ? 'none' : '2,2'} 
              />
              <text 
                x={hito.x} 
                y={15} 
                fontSize={hito.tipo === 'viga' ? '9.5' : '8'} 
                fontWeight="bold" 
                fill={hito.tipo === 'viga' ? '#1e293b' : '#2563eb'} 
                textAnchor="middle"
              >
                {hito.label}
              </text>
            </g>
          ))}

          {/* Renderizado acumulando los altos proporcionales calculados al vuelo */}
          {(() => {
            let yAcumulado = 28;
            return plieguesGlobales.map((pliegueGlobal, fIdx) => {
              const altoFilaActual = alturasEscaladas[fIdx];
              const yLinea = yAcumulado;
              yAcumulado += altoFilaActual;

              return (
                <g key={`fila-p-${fIdx}`}>
                  {/* Línea superior divisoria de cara */}
                  <line x1="15" y1={yLinea} x2="790" y2={yLinea} stroke="#cbd5e1" strokeWidth="1" />
                  
                  {todosLosHitos.map((hito, hIdx) => {
                    const plieguesDelHito = matrizPliegues[hito.keyHash] || [];
                    const caraEspecifica = plieguesDelHito[fIdx] || { longitud: pliegueGlobal.longitud };
                    
                    return (
                      <text 
                        key={`cota-h-${hIdx}`} 
                        x={hito.x} 
                        y={yLinea + (altoFilaActual / 2) + 3} 
                        fontSize={plieguesGlobales.length > 5 ? "8" : "9"} 
                        fill={hito.tipo === 'viga' ? '#0000ff' : '#059669'} 
                        fontWeight="bold" 
                        textAnchor="middle"
                      >
                        {caraEspecifica.longitud}
                      </text>
                    );
                  })}

                  <text x="795" y={yLinea + (altoFilaActual / 2) + 3} fontSize="9" fill="#475569" fontWeight="bold">
                    P{fIdx + 1}
                  </text>
                </g>
              );
            });
          })()}
          
          {/* Línea de cierre inferior */}
          <line x1="15" y1={28 + alturasEscaladas.reduce((a,b)=>a+b, 0)} x2="790" y2={28 + alturasEscaladas.reduce((a,b)=>a+b, 0)} stroke="#cbd5e1" strokeWidth="1" />
        </svg>
      </div>

      {/* SECCIÓN 2: PREVISUALIZACIÓN PERFIL */}
      <div style={{ width: '100%', backgroundColor: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
          Forma del Perfil de Doblez de la Canal (Plantilla Base)
        </span>
        <svg width="100%" height="170" viewBox="0 0 816 170" style={{ background: '#fff', border: '1px solid #f1f5f9' }}>
          {lineasPerfil.map((l, idx) => (
            <g key={`perfil-l-${idx}`}>
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx={l.x2} cy={l.y2} r="3.5" fill="#f39c12" />
              <text x={(l.x1 + l.x2)/2} y={(l.y1 + l.y2)/2 - 6} fontSize="10" fill="#2563eb" fontWeight="bold" textAnchor="middle">
                P{idx + 1} ({l.longitudReal}mm)
              </text>
            </g>
          ))}
          <text x="25" y="155" fontSize="9" fill="#94a3b8" fontWeight="bold">← LADO FACHADA / INTERIOR BODEGA</text>
        </svg>
      </div>

    </div>
  );
};

export default CorteLateralCanal;