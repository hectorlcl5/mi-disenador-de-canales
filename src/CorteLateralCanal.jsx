import React from 'react';

const CorteLateralCanal = ({ 
  plieguesGlobales = [],
  matrizPliegues = {},
  columnasMapeadas = [],
  configColumnas = {},
  colorInterior = "Blanco",
  anchoAbertura = "",
  ladoAbrir = "ninguno",
  ladoCubierta = "ninguno" // RECIBIMOS EL NUEVO SELECTOR
}) => {

  // ==========================================
  // SECCIÓN 1: MOTOR DE LA TABLA LONGITUDINAL (VISTA 2)
  // ==========================================
  const generarHitosLongitudinalesCompletos = () => {
    const hitos = [];
    columnasMapeadas.forEach((col, cIdx) => {
      hitos.push({ tipo: 'viga', label: `Viga ${col.numero}`, keyHash: `viga-${col.id}`, x: col.x });

      if (cIdx < columnasMapeadas.length - 1) {
        const config = configColumnas[col.id] || {};
        const listaT = config.listaTraslapos || [];
        const sigCol = columnasMapeadas[cIdx + 1];

        if (listaT.length > 0) {
          const pasoX = (sigCol.x - col.x) / (listaT.length + 1);
          listaT.forEach((_, tIdx) => {
            hitos.push({ tipo: 'traslapo', label: `V${col.numero}-T${tIdx + 1}`, keyHash: `traslapo-${col.id}-${tIdx}`, x: col.x + (pasoX * (tIdx + 1)) });
          });
        }
      }
    });
    return hitos;
  };

  const todosLosHitos = generarHitosLongitudinalesCompletos();

  const obtenerAlturasProporcionales = () => {
    const altosPorPliegue = plieguesGlobales.map((pg, fIdx) => {
      let maxMedida = 0;
      todosLosHitos.forEach(hito => {
        const plieguesDelHito = matrizPliegues[hito.keyHash] || [];
        const cara = plieguesDelHito[fIdx] || { longitud: pg.longitud };
        const valor = parseFloat(cara.longitud) || 0;
        if (valor > maxMedida) maxMedida = valor;
      });
      return Math.max(maxMedida, 20); 
    });

    const sumaAlturasReales = altosPorPliegue.reduce((a, b) => a + b, 0) || 1;
    const altoGraficoDisponible = 135; 
    return altosPorPliegue.map(alt => (alt / sumaAlturasReales) * altoGraficoDisponible);
  };

  const alturasEscaladas = obtenerAlturasProporcionales();
  const altoTotalTabla = 28 + alturasEscaladas.reduce((a, b) => a + b, 0);


  // ==========================================
  // SECCIÓN 2: MOTOR GEOMÉTRICO (VISTA 3)
  // ==========================================
  const generarDatosPerfilTrigonometrico = () => {
    let x = 0; 
    let y = 0; 
    const pts = [{ x, y }];
    const lineas = [];

    plieguesGlobales.forEach((pliegue, idx) => {
      const longitud = parseFloat(pliegue.longitud) || 0;
      const anguloAbsoluto = parseFloat(pliegue.angulo) || 0; 
      
      const radianes = (anguloAbsoluto * Math.PI) / 180;
      const escala = 0.45; 
      
      const nx = x + (longitud * escala * Math.cos(radianes));
      const ny = y + (longitud * escala * Math.sin(radianes));
      
      lineas.push({ x1: x, y1: y, x2: nx, y2: ny, longitud, anguloRad: radianes, idx });
      
      x = nx;
      y = ny;
      pts.push({ x, y });
    });

    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const margenY = 90;
    const minYConMargen = minY - margenY;
    const maxYConMargen = maxY + margenY;

    const anchoFigura = maxX - minX;
    const altoFigura = maxYConMargen - minYConMargen;

    const offsetX = (550 - anchoFigura) / 2 - minX; 
    const offsetY = (200 - altoFigura) / 2 - minYConMargen;

    let pathData = `M ${pts[0].x + offsetX} ${pts[0].y + offsetY}`;
    const etiquetas = [];

    lineas.forEach(l => {
      const px2 = l.x2 + offsetX;
      const py2 = l.y2 + offsetY;
      pathData += ` L ${px2} ${py2}`;

      const midX = (l.x1 + l.x2) / 2 + offsetX;
      const midY = (l.y1 + l.y2) / 2 + offsetY;
      const normalAngulo = l.anguloRad + (Math.PI / 2);
      const separacion = 14; 
      
      etiquetas.push({
        x: midX + Math.cos(normalAngulo) * separacion,
        y: midY + Math.sin(normalAngulo) * separacion,
        valor: l.longitud
      });
    });

    let flechasColor = null;
    if (lineas.length >= 3) {
      const midIdx = Math.floor(lineas.length / 2);
      const lBase = lineas[midIdx];

      const tX_int = lBase.x1 + (lBase.x2 - lBase.x1) * 0.35 + offsetX;
      const tY_int = lBase.y1 + (lBase.y2 - lBase.y1) * 0.35 + offsetY;
      const tX_ext = lBase.x2 + offsetX;
      const tY_ext = lBase.y2 + offsetY;

      const dx = Math.cos(lBase.anguloRad);
      const dy = Math.sin(lBase.anguloRad);
      const nx = -dy; 
      const ny = dx;  

      const intStrX = tX_int - nx * 45;
      const intStrY = tY_int - ny * 45;
      const intEndX = tX_int - nx * 10;
      const intEndY = tY_int - ny * 10;

      const extStrX = tX_ext + nx * 45 + 15; 
      const extStrY = tY_ext + ny * 45 + 15;
      const extEndX = tX_ext + nx * 5;
      const extEndY = tY_ext + ny * 5;

      const textoInterior = colorInterior === 'Blanco' ? 'Blanco' : 'Gris';
      const textoExterior = colorInterior === 'Blanco' ? 'Gris' : 'Blanco';

      flechasColor = (
        <g>
          <line x1={intStrX} y1={intStrY} x2={intEndX} y2={intEndY} stroke="#7f8c8d" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
          <text x={intStrX - nx*15} y={intStrY - ny*15 + 4} fontSize="11" fill="#475569" fontWeight="bold" textAnchor="middle">{textoInterior}</text>

          <line x1={extStrX} y1={extStrY} x2={extEndX} y2={extEndY} stroke="#7f8c8d" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
          <text x={extStrX + nx*15} y={extStrY + ny*15 + 4} fontSize="11" fill="#475569" fontWeight="bold" textAnchor="middle">{textoExterior}</text>
        </g>
      );
    }

    let cotaAberturaSvg = null;
    if (anchoAbertura && lineas.length >= 5) {
      const p1 = { x: pts[1].x + offsetX, y: pts[1].y + offsetY };
      const p4 = { x: pts[4].x + offsetX, y: pts[4].y + offsetY };
      const midX = (p1.x + p4.x) / 2;
      const topY = Math.min(p1.y, p4.y) + 20; 

      cotaAberturaSvg = (
        <g>
          <text x={midX} y={topY + 4} fontSize="12" fill="#2563eb" fontWeight="bold" textAnchor="middle">{anchoAbertura}</text>
          <line x1={midX - 25} y1={topY} x2={p1.x + 10} y2={topY} stroke="#2563eb" strokeWidth="1.2" markerEnd="url(#arrowheadBlue)" />
          <line x1={midX + 25} y1={topY} x2={p4.x - 10} y2={topY} stroke="#2563eb" strokeWidth="1.2" markerEnd="url(#arrowheadBlue)" />
        </g>
      );
    }

    let cotaAbrirAletaSvg = null;
    let angulo90Svg = null;
    
    if (ladoAbrir !== 'ninguno' && lineas.length >= 5) {
      const pIzq = { x: pts[2].x + offsetX, y: pts[2].y + offsetY }; 
      const pDer = { x: pts[3].x + offsetX, y: pts[3].y + offsetY }; 
      
      if (ladoAbrir === 'derecho') {
        cotaAbrirAletaSvg = (
          <g>
            <line x1={pDer.x - 20} y1={pDer.y - 70} x2={pDer.x - 5} y2={pDer.y - 10} stroke="#475569" strokeWidth="1.2" markerEnd="url(#arrowhead)" />
            <text x={pDer.x - 20} y={pDer.y - 85} fontSize="10" fill="#475569" textAnchor="middle">Abrir solo</text>
            <text x={pDer.x - 20} y={pDer.y - 73} fontSize="10" fill="#475569" textAnchor="middle">este lado</text>
          </g>
        );
        angulo90Svg = (
          <g>
            <path d={`M ${pIzq.x} ${pIzq.y - 14} L ${pIzq.x + 14} ${pIzq.y - 14} L ${pIzq.x + 14} ${pIzq.y}`} fill="none" stroke="#2563eb" strokeWidth="1.5" />
            <text x={pIzq.x + 22} y={pIzq.y - 16} fontSize="10" fill="#2563eb" fontWeight="bold">90°</text>
          </g>
        );
      } else if (ladoAbrir === 'izquierdo') {
        cotaAbrirAletaSvg = (
          <g>
            <line x1={pIzq.x + 20} y1={pIzq.y - 70} x2={pIzq.x + 5} y2={pIzq.y - 10} stroke="#475569" strokeWidth="1.2" markerEnd="url(#arrowhead)" />
            <text x={pIzq.x + 20} y={pIzq.y - 85} fontSize="10" fill="#475569" textAnchor="middle">Abrir solo</text>
            <text x={pIzq.x + 20} y={pIzq.y - 73} fontSize="10" fill="#475569" textAnchor="middle">este lado</text>
          </g>
        );
        angulo90Svg = (
          <g>
            <path d={`M ${pDer.x} ${pDer.y - 14} L ${pDer.x - 14} ${pDer.y - 14} L ${pDer.x - 14} ${pDer.y}`} fill="none" stroke="#2563eb" strokeWidth="1.5" />
            <text x={pDer.x - 22} y={pDer.y - 16} fontSize="10" fill="#2563eb" fontWeight="bold">90°</text>
          </g>
        );
      }
    }

    const desarrolloExacto = plieguesGlobales.reduce((sum, p) => sum + (parseFloat(p.longitud) || 0), 0);

    return { pathData, etiquetas, flechasColor, cotaAberturaSvg, cotaAbrirAletaSvg, angulo90Svg, maxXOffset: maxX + offsetX, desarrolloExacto };
  };

  const { pathData, etiquetas, flechasColor, cotaAberturaSvg, cotaAbrirAletaSvg, angulo90Svg, maxXOffset, desarrolloExacto } = generarDatosPerfilTrigonometrico();

  // ==========================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================
  return (
    <div style={{ marginTop: '25px', borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }}>
      
      {/* ----------------------------------------------------- */}
      {/* VISTA 2: TABLA LONGITUDINAL PROPORCIONAL              */}
      {/* ----------------------------------------------------- */}
      <div style={{ width: '100%', backgroundColor: '#fdfdfd', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
          Corte superior ancho paredes canal
        </span>
        
        {/* VIEWBOX AMPLIADO A 1000px PARA ALINEARSE CON LA VISTA 1 */}
        <svg width="100%" height="230" viewBox="0 0 1000 230" style={{ background: '#fff' }}>
          
          {/* DEFINICIÓN PARA LA FLECHA ROJA DE LA TABLA */}
          <defs>
            <marker id="arrowheadRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#ef4444" />
            </marker>
          </defs>

          {/* DIBUJO DE LA FLECHA "LADO CUBIERTA" SI ESTÁ SELECCIONADA */}
          {ladoCubierta !== 'ninguno' && (
            <g>
              {ladoCubierta === 'P1' ? (
                // Flecha arriba apuntando hacia P1 (Y=28)
                <>
                  <text x="500" y="12" fontSize="11" fill="#ef4444" fontWeight="bold" textAnchor="middle">LADO CUBIERTA</text>
                  <line x1="500" y1="15" x2="500" y2="26" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrowheadRed)" />
                </>
              ) : (
                // Flecha abajo apuntando hacia la Última Pestaña (Y = altoTotalTabla)
                <>
                  <line x1="500" y1={altoTotalTabla + 20} x2="500" y2={altoTotalTabla + 2} stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrowheadRed)" />
                  <text x="500" y={altoTotalTabla + 30} fontSize="11" fill="#ef4444" fontWeight="bold" textAnchor="middle">LADO CUBIERTA</text>
                </>
              )}
            </g>
          )}

          {/* HITOS VERTICALES */}
          {todosLosHitos.map((hito, idx) => (
            <g key={`eje-long-${idx}`}>
              <line x1={hito.x} y1={25} x2={hito.x} y2={altoTotalTabla + 5} stroke={hito.tipo === 'viga' ? '#64748b' : '#cbd5e1'} strokeWidth={hito.tipo === 'viga' ? '1.2' : '1'} strokeDasharray={hito.tipo === 'viga' ? 'none' : '2,2'} />
              <text x={hito.x} y={22} fontSize={hito.tipo === 'viga' ? '9.5' : '8'} fontWeight="bold" fill={hito.tipo === 'viga' ? '#1e293b' : '#2563eb'} textAnchor="middle">{hito.label}</text>
            </g>
          ))}

          {/* LÍNEAS HORIZONTALES (EXTENDIDAS HASTA EL ANCHO 985px) */}
          {(() => {
            let yAcumulado = 28;
            return plieguesGlobales.map((pliegueGlobal, fIdx) => {
              const altoFilaActual = alturasEscaladas[fIdx];
              const yLinea = yAcumulado;
              yAcumulado += altoFilaActual;

              return (
                <g key={`fila-p-${fIdx}`}>
                  <line x1="15" y1={yLinea} x2="985" y2={yLinea} stroke="#cbd5e1" strokeWidth="1" />
                  
                  {todosLosHitos.map((hito, hIdx) => {
                    const plieguesDelHito = matrizPliegues[hito.keyHash] || [];
                    const caraEspecifica = plieguesDelHito[fIdx] || { longitud: pliegueGlobal.longitud };
                    
                    return (
                      <text key={`cota-h-${hIdx}`} x={hito.x} y={yLinea + (altoFilaActual / 2) + 3} fontSize={plieguesGlobales.length > 5 ? "8" : "9"} fill={hito.tipo === 'viga' ? '#0000ff' : '#059669'} fontWeight="bold" textAnchor="middle">
                        {caraEspecifica.longitud}
                      </text>
                    );
                  })}
                  {/* TEXTO DE IDENTIFICACIÓN DE PESTAÑA A LA DERECHA */}
                  <text x="990" y={yLinea + (altoFilaActual / 2) + 3} fontSize="9" fill="#475569" fontWeight="bold">P{fIdx + 1}</text>
                </g>
              );
            });
          })()}
          <line x1="15" y1={altoTotalTabla} x2="985" y2={altoTotalTabla} stroke="#cbd5e1" strokeWidth="1" />
        </svg>
      </div>

      {/* ----------------------------------------------------- */}
      {/* VISTA 3: PERFIL GEOMÉTRICO                            */}
      {/* ----------------------------------------------------- */}
      <div style={{ width: '100%', backgroundColor: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
          Forma del Perfil de Doblez de la Canal (Plantilla Base)
        </span>
        
        <svg width="100%" height="170" viewBox="0 0 816 280" preserveAspectRatio="xMidYMid meet" style={{ background: '#fff', border: '1px solid #f1f5f9' }}>
          
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#7f8c8d" />
            </marker>
            <marker id="arrowheadBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#2563eb" />
            </marker>
          </defs>

          <path d={pathData} fill="none" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />

          {etiquetas.map((etq, idx) => {
            if (parseFloat(etq.valor) <= 5) return null;
            return (
              <text key={`etiqueta-perfil-${idx}`} x={etq.x} y={etq.y + 4} fontSize="12" fill="#e74c3c" fontWeight="bold" textAnchor="middle">
                {etq.valor}
              </text>
            );
          })}
          
          {flechasColor}
          {cotaAberturaSvg}
          {cotaAbrirAletaSvg}
          {angulo90Svg}

          <text x={Math.min(maxXOffset + 100, 700)} y="130" fontSize="26" fill="#475569" fontWeight="bold" textAnchor="start">
            (Canal en desarrollo {desarrolloExacto} mm)
          </text>

        </svg>
      </div>

    </div>
  );
};

export default CorteLateralCanal;