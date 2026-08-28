import React from "react";

const CorteLateralCanal = ({
  plieguesGlobales = [],
  matrizPliegues = {},
  columnasMapeadas = [],
  configColumnas = {},
  colorInterior = "Blanco",
  anchoAbertura = "",
  ladoAbrir = "ninguno",
  ladoCubierta = "ninguno",
  datosGeometria = {},
  invertirTramos = false,
  nombreEje = "",
  inicioEjeNum = "1", // 💡 RECIBIMOS EL NÚMERO DE INICIO
}) => {
  const generarHitosLongitudinalesCompletos = () => {
    const hitos = [];
    const anchoVisualPartePlana = 25;

    columnasMapeadas.forEach((col, cIdx) => {
      // 💡 EVALUAMOS SI ES MURO O VIGA NORMAL
      hitos.push({
        tipo: col.esMuro ? "muro" : "viga",
        // 💡 CAMBIO: Ahora solo dice "Muro" para que no se corte
        label: col.esMuro ? "Muro" : `Eje ${col.numero}`,
        keyHash: col.esMuro ? col.id : `viga-${col.id}`,
        x: col.x,
      });

      if (cIdx < columnasMapeadas.length - 1) {
        const config = configColumnas[col.id] || {};
        const listaT = config.listaTraslapos || [];
        const sigCol = columnasMapeadas[cIdx + 1];

        if (listaT.length > 0) {
          const tienePlanaDerecha =
            parseFloat(config.planaDerecha) > 0 ||
            parseFloat(config.planaCentro) > 0;
          const inicioX_V1 =
            col.x + (tienePlanaDerecha ? anchoVisualPartePlana : 0);

          const configSig = configColumnas[sigCol.id] || {};
          const tienePlanaIzquierdaSig =
            parseFloat(configSig.planaIzquierda) > 0 ||
            parseFloat(configSig.planaCentro) > 0;
          const finX_V1 =
            sigCol.x - (tienePlanaIzquierdaSig ? anchoVisualPartePlana : 0);

          const anchoMaxDisponibleX = finX_V1 - inicioX_V1;
          const totalSegmentos =
            listaT.length +
            (listaT[listaT.length - 1].conectarA === "columna" ? 1 : 0);
          const numColumnas = columnasMapeadas.length;
          const pixelMinimoGarantizado = Math.max(14, 22 - numColumnas * 0.3);
          const pixelesFijosReservados =
            totalSegmentos * pixelMinimoGarantizado;
          const pixelesRemanentesProporcionales = Math.max(
            0,
            anchoMaxDisponibleX - pixelesFijosReservados,
          );

          let sumatoriaMilimetrosTotal = 0;
          listaT.forEach(
            (t) => (sumatoriaMilimetrosTotal += parseFloat(t.longitud) || 0),
          );
          const ultimoT = listaT[listaT.length - 1];
          if (ultimoT.conectarA === "columna")
            sumatoriaMilimetrosTotal += parseFloat(ultimoT.longitudCierre) || 0;

          let xCursor = inicioX_V1;
          listaT.forEach((traslapo, tIdx) => {
            const mmTramoActual = parseFloat(traslapo.longitud) || 0;
            const parteProporcional =
              sumatoriaMilimetrosTotal > 0
                ? (mmTramoActual / sumatoriaMilimetrosTotal) *
                  pixelesRemanentesProporcionales
                : 0;
            const xSiguiente =
              xCursor + pixelMinimoGarantizado + parteProporcional;

            hitos.push({
              tipo: "traslapo",
              label: col.esMuro
                ? `Muro-T${tIdx + 1}`
                : `E${col.numero}-T${tIdx + 1}`,
              keyHash: `traslapo-${col.id}-${tIdx}`,
              x: xSiguiente,
            });
            xCursor = xSiguiente;
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
      todosLosHitos.forEach((hito) => {
        const plieguesDelHito = matrizPliegues[hito.keyHash] || [];
        const cara = plieguesDelHito[fIdx] || { longitud: pg.longitud };
        const valor = parseFloat(cara.longitud) || 0;
        if (valor > maxMedida) maxMedida = valor;
      });
      return Math.max(maxMedida, 20);
    });

    const sumaAlturasReales = altosPorPliegue.reduce((a, b) => a + b, 0) || 1;
    const altoGraficoDisponible = Math.max(80, plieguesGlobales.length * 20);
    return altosPorPliegue.map(
      (alt) => (alt / sumaAlturasReales) * altoGraficoDisponible,
    );
  };

  const alturasEscaladas = obtenerAlturasProporcionales();
  const altoTotalTabla = 28 + alturasEscaladas.reduce((a, b) => a + b, 0);

  const generarDatosPerfilTrigonometrico = () => {
    let x = 0;
    let y = 0;
    const pts = [{ x, y }];
    const lineas = [];

    plieguesGlobales.forEach((pliegue, idx) => {
      const longitud = parseFloat(pliegue.longitud) || 0;
      const anguloAbsoluto = parseFloat(pliegue.angulo) || 0;

      const radianes = (anguloAbsoluto * Math.PI) / 180;
      // 💡 CAMBIO: Subimos la escala de 0.45 a 0.75 para agrandar el dibujo
      const escala = 0.75;

      const nx = x + longitud * escala * Math.cos(radianes);
      const ny = y + longitud * escala * Math.sin(radianes);

      lineas.push({
        x1: x,
        y1: y,
        x2: nx,
        y2: ny,
        longitud,
        anguloRad: radianes,
        idx,
      });

      x = nx;
      y = ny;
      pts.push({ x, y });
    });

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const margenYArriba = 90;
    const margenYAbajo = 150;
    const minYConMargen = minY - margenYArriba;
    const maxYConMargen = maxY + margenYAbajo;

    const anchoFigura = maxX - minX;
    const altoFigura = maxYConMargen - minYConMargen;

    // 💡 CAMBIO: Ajustamos el centro relativo al ancho total del viewBox (1000px)
    const offsetX = (1000 - anchoFigura) / 2 - minX;
    const offsetY = (325 - altoFigura) / 2 - minYConMargen;

    let pathData = `M ${pts[0].x + offsetX} ${pts[0].y + offsetY}`;
    const etiquetas = [];

    lineas.forEach((l) => {
      const px2 = l.x2 + offsetX;
      const py2 = l.y2 + offsetY;
      pathData += ` L ${px2} ${py2}`;

      const midX = (l.x1 + l.x2) / 2 + offsetX;
      const midY = (l.y1 + l.y2) / 2 + offsetY;
      const normalAngulo = l.anguloRad + Math.PI / 2;
      const separacion = 25;

      etiquetas.push({
        x: midX + Math.cos(normalAngulo) * separacion,
        y: midY + Math.sin(normalAngulo) * separacion,
        valor: l.longitud,
      });
    });

    let fondoIdx = 0;
    let maxMidY = -Infinity;
    lineas.forEach((l, i) => {
      const midY = (l.y1 + l.y2) / 2;
      if (midY > maxMidY) {
        maxMidY = midY;
        fondoIdx = i;
      }
    });

    let flechasColor = null;
    let cotaAberturaSvg = null;
    let cotaAbrirAletaSvg = null;
    let angulo90Svg = null;

    if (lineas.length > 0) {
      const lBase = lineas[fondoIdx];

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

      const extStrX = tX_ext + 45;
      const extStrY = tY_ext + 35;
      const extEndX = tX_ext + 8;
      const extEndY = tY_ext + 8;

      const textoInterior = colorInterior === "Blanco" ? "Blanco" : "Gris";
      const textoExterior = colorInterior === "Blanco" ? "Gris" : "Blanco";

      flechasColor = (
        <g>
          <line
            x1={intStrX}
            y1={intStrY}
            x2={intEndX}
            y2={intEndY}
            stroke="#7f8c8d"
            strokeWidth="1.5"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={intStrX - nx * 15}
            y={intStrY - ny * 15 + 6}
            fontSize="17"
            fill="#475569"
            fontWeight="bold"
            textAnchor="middle"
          >
            {textoInterior}
          </text>

          <line
            x1={extStrX}
            y1={extStrY}
            x2={extEndX}
            y2={extEndY}
            stroke="#7f8c8d"
            strokeWidth="1.5"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={extStrX + 10}
            y={extStrY + 14}
            fontSize="17"
            fill="#475569"
            fontWeight="bold"
            textAnchor="start"
          >
            {textoExterior}
          </text>
        </g>
      );

      if (anchoAbertura && pts.length >= 2) {
        const indexIzq = Math.max(0, fondoIdx - 1);
        const indexDer = Math.min(pts.length - 1, fondoIdx + 2);

        const pIzqTop = {
          x: pts[indexIzq].x + offsetX,
          y: pts[indexIzq].y + offsetY,
        };
        const pDerTop = {
          x: pts[indexDer].x + offsetX,
          y: pts[indexDer].y + offsetY,
        };

        const pMasBajo = pIzqTop.y > pDerTop.y ? pIzqTop : pDerTop;
        const cotaY = pMasBajo.y - 25;
        const midX = (pIzqTop.x + pDerTop.x) / 2;

        cotaAberturaSvg = (
          <g>
            <text
              x={midX}
              y={cotaY - 4}
              fontSize="21"
              fill="#0541c2"
              fontWeight="bold"
              textAnchor="middle"
            >
              {anchoAbertura}
            </text>

            <line
              x1={midX - 25}
              y1={cotaY}
              x2={pIzqTop.x + 8}
              y2={cotaY}
              stroke="#2563eb"
              strokeWidth="1.2"
              markerEnd="url(#arrowheadBlue)"
            />
            <line
              x1={midX + 25}
              y1={cotaY}
              x2={pDerTop.x - 8}
              y2={cotaY}
              stroke="#0541c2"
              strokeWidth="1.2"
              markerEnd="url(#arrowheadBlue)"
            />

            <line
              x1={pIzqTop.x}
              y1={cotaY + 5}
              x2={pIzqTop.x}
              y2={pIzqTop.y - 3}
              stroke="#0541c2"
              strokeWidth="0.8"
              strokeDasharray="2,2"
            />
            <line
              x1={pDerTop.x}
              y1={cotaY + 5}
              x2={pDerTop.x}
              y2={pDerTop.y - 3}
              stroke="#0541c2"
              strokeWidth="0.8"
              strokeDasharray="2,2"
            />
          </g>
        );
      }

      if (ladoAbrir !== "ninguno" && lineas.length >= 3) {
        const pIzqFondo = {
          x: pts[fondoIdx].x + offsetX,
          y: pts[fondoIdx].y + offsetY,
        };
        const pDerFondo = {
          x: pts[fondoIdx + 1].x + offsetX,
          y: pts[fondoIdx + 1].y + offsetY,
        };

        if (ladoAbrir === "derecho") {
          cotaAbrirAletaSvg = (
            <g>
              <line
                x1={pDerFondo.x - 20}
                y1={pDerFondo.y - 70}
                x2={pDerFondo.x - 5}
                y2={pDerFondo.y - 10}
                stroke="#475569"
                strokeWidth="1.2"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={pDerFondo.x - 20}
                y={pDerFondo.y - 90}
                fontSize="18"
                fill="#475569"
                textAnchor="middle"
              >
                Abrir solo
              </text>
              <text
                x={pDerFondo.x - 20}
                y={pDerFondo.y - 72}
                fontSize="18"
                fill="#475569"
                textAnchor="middle"
              >
                este lado
              </text>
            </g>
          );
          angulo90Svg = (
            <g>
              <path
                d={`M ${pIzqFondo.x} ${pIzqFondo.y - 14} L ${pIzqFondo.x + 14} ${pIzqFondo.y - 14} L ${pIzqFondo.x + 14} ${pIzqFondo.y}`}
                fill="none"
                stroke="#0541c2"
                strokeWidth="1.5"
              />
              <text
                x={pIzqFondo.x + 24}
                y={pIzqFondo.y - 18}
                fontSize="18"
                fill="#0541c2"
                fontWeight="bold"
              >
                90°
              </text>
            </g>
          );
        } else if (ladoAbrir === "izquierdo") {
          cotaAbrirAletaSvg = (
            <g>
              <line
                x1={pIzqFondo.x + 20}
                y1={pIzqFondo.y - 70}
                x2={pIzqFondo.x + 5}
                y2={pIzqFondo.y - 10}
                stroke="#475569"
                strokeWidth="1.2"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={pIzqFondo.x + 20}
                y={pIzqFondo.y - 90}
                fontSize="18"
                fill="#475569"
                textAnchor="middle"
              >
                Abrir solo
              </text>
              <text
                x={pIzqFondo.x + 20}
                y={pIzqFondo.y - 72}
                fontSize="18"
                fill="#475569"
                textAnchor="middle"
              >
                este lado
              </text>
            </g>
          );
          angulo90Svg = (
            <g>
              <path
                d={`M ${pDerFondo.x} ${pDerFondo.y - 14} L ${pDerFondo.x - 14} ${pDerFondo.y - 14} L ${pDerFondo.x - 14} ${pDerFondo.y}`}
                fill="none"
                stroke="#0541c2"
                strokeWidth="1.5"
              />
              <text
                x={pDerFondo.x - 24}
                y={pDerFondo.y - 18}
                fontSize="18"
                fill="#0541c2"
                fontWeight="bold"
              >
                90°
              </text>
            </g>
          );
        }
      }
    }

    const desarrolloExacto = plieguesGlobales.reduce(
      (sum, p) => sum + (parseFloat(p.longitud) || 0),
      0,
    );

    return {
      pathData,
      etiquetas,
      flechasColor,
      cotaAberturaSvg,
      cotaAbrirAletaSvg,
      angulo90Svg,
      maxXOffset: maxX + offsetX,
      desarrolloExacto,
    };
  };

  const {
    pathData,
    etiquetas,
    flechasColor,
    cotaAberturaSvg,
    cotaAbrirAletaSvg,
    angulo90Svg,
    maxXOffset,
    desarrolloExacto,
  } = generarDatosPerfilTrigonometrico();

  // ==========================================
  // LÓGICA VISTA 4 MUDADA AQUÍ
  // ==========================================
  const tramosVista4 = [];
  const nodosRaw = [];

  columnasMapeadas.forEach((col) => {
    if (datosGeometria[col.id]) {
      datosGeometria[col.id].lineas.forEach((linea) => {
        if (linea.color === "#2c3e50" || linea.color === "blue") {
          tramosVista4.push({
            x: (linea.x1 + linea.x2) / 2,
            y: (linea.y1 + linea.y2) / 2,
          });
          nodosRaw.push({ x: linea.x1, y: linea.y1 });
          nodosRaw.push({ x: linea.x2, y: linea.y2 });
        }
      });
    }
  });
  tramosVista4.sort((a, b) => a.x - b.x);
  const totalTramos = tramosVista4.length;

  const nodosUnicos = [];
  nodosRaw
    .sort((a, b) => a.x - b.x)
    .forEach((nodo) => {
      if (
        nodosUnicos.length === 0 ||
        Math.abs(nodosUnicos[nodosUnicos.length - 1].x - nodo.x) > 1
      ) {
        nodosUnicos.push(nodo);
      }
    });

  const letraEje =
    (nombreEje || "").trim().split(" ").pop().charAt(0).toUpperCase() || "A";

  // 💡 NUEVO: Mapeo de muros e identificación de nodos para la Vista 4
  const nodosConDetalle = nodosUnicos.map((n) => {
    // Buscamos si esta coordenada 'x' coincide con alguna columna mapeada
    const colMatch = columnasMapeadas.find((c) => Math.abs(c.x - n.x) < 2);
    return {
      ...n,
      esMuro: colMatch?.esMuro || false,
      esColumna: !!colMatch && !colMatch.esMuro, // Es un eje normal
      numeroEje: colMatch?.numero || "",
    };
  });

  return (
    <div
      style={{
        marginTop: "2px",
        borderTop: "1px dashed #cbd5e1",
        paddingTop: "5px",
        backgroundColor: "#ffffff",
        width: "100%", // 💡 CAMBIO CRUCIAL: Fuerza a que se alinee idéntico al ancho de la Vista 1
        paddingBottom: "20px",
      }}
    >
      {/* ----------------------------------------------------- */}
      {/* VISTA 2: TABLA LONGITUDINAL PROPORCIONAL              */}
      {/* ----------------------------------------------------- */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: "bold",
            color: "#1e293b",
            display: "block",
            marginBottom: "2px",
            textTransform: "uppercase",
          }}
        >
          Corte superior ancho paredes canal
        </span>

        <svg
          width="100%"
          height={Math.max(90, altoTotalTabla + 35)}
          viewBox={`0 0 1000 ${Math.max(90, altoTotalTabla + 35)}`}
          style={{ background: "transparent", display: "block" }}
        >
          <defs>
            <marker
              id="arrowheadRed"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#ef4444" />
            </marker>
          </defs>

          {ladoCubierta !== "ninguno" && (
            <g>
              {ladoCubierta === "P1" ? (
                <>
                  <text
                    x="500"
                    y="10"
                    fontSize="11"
                    fill="#ef4444"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    LADO CUBIERTA
                  </text>
                  <line
                    x1="500"
                    y1="13"
                    x2="500"
                    y2="24"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    markerEnd="url(#arrowheadRed)"
                  />
                </>
              ) : (
                <>
                  <line
                    x1="500"
                    y1={altoTotalTabla + 12}
                    x2="500"
                    y2={altoTotalTabla + 2}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    markerEnd="url(#arrowheadRed)"
                  />
                  <text
                    x="500"
                    y={altoTotalTabla + 24}
                    fontSize="11"
                    fill="#ef4444"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    LADO CUBIERTA
                  </text>
                </>
              )}
            </g>
          )}

          {todosLosHitos.map((hito, idx) => (
            <g key={`eje-long-${idx}`}>
              <line
                x1={hito.x}
                y1={25}
                x2={hito.x}
                y2={altoTotalTabla + 5}
                stroke={
                  hito.tipo === "viga" || hito.tipo === "muro"
                    ? "#64748b"
                    : "#cbd5e1"
                }
                strokeWidth={
                  hito.tipo === "viga" || hito.tipo === "muro" ? "1.2" : "1"
                }
                strokeDasharray={
                  hito.tipo === "viga" || hito.tipo === "muro" ? "none" : "2,2"
                }
              />
              <text
                x={hito.x}
                y={22}
                fontSize={
                  hito.tipo === "viga" || hito.tipo === "muro" ? "9.5" : "8"
                }
                fontWeight="bold"
                fill={
                  hito.tipo === "viga" || hito.tipo === "muro"
                    ? "#1e293b"
                    : "#2563eb"
                }
                textAnchor="middle"
              >
                {hito.label}
              </text>
            </g>
          ))}

          {(() => {
            let yAcumulado = 28;
            return plieguesGlobales.map((pliegueGlobal, fIdx) => {
              const altoFilaActual = alturasEscaladas[fIdx];
              const yLinea = yAcumulado;
              yAcumulado += altoFilaActual;

              return (
                <g key={`fila-p-${fIdx}`}>
                  <line
                    x1="15"
                    y1={yLinea}
                    x2="985"
                    y2={yLinea}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  {todosLosHitos.map((hito, hIdx) => {
                    const plieguesDelHito = matrizPliegues[hito.keyHash] || [];
                    const caraEspecifica = plieguesDelHito[fIdx] || {
                      longitud: pliegueGlobal.longitud,
                    };
                    return (
                      <text
                        key={`cota-h-${hIdx}`}
                        x={hito.x}
                        y={yLinea + altoFilaActual / 2 + 3}
                        fontSize={plieguesGlobales.length > 5 ? "8" : "9"}
                        fill={
                          hito.tipo === "viga" || hito.tipo === "muro"
                            ? "#0000ff"
                            : "#059669"
                        }
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {caraEspecifica.longitud}
                      </text>
                    );
                  })}
                  <text
                    x="990"
                    y={yLinea + altoFilaActual / 2 + 3}
                    fontSize="9"
                    fill="#475569"
                    fontWeight="bold"
                  >
                    P{fIdx + 1}
                  </text>
                </g>
              );
            });
          })()}
          <line
            x1="15"
            y1={altoTotalTabla}
            x2="985"
            y2={altoTotalTabla}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* ----------------------------------------------------- */}
      {/* VISTA 3: PERFIL GEOMÉTRICO                            */}
      {/* ----------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "10px 0",
          minHeight: "150px",
          width: "100%",
        }}
      >
        <h3
          style={{
            fontSize: "11px",
            fontWeight: "bold",
            color: "#1e293b",
            display: "block",
            marginBottom: "15px",
            textTransform: "uppercase",
          }}
        >
          Forma del Perfil de Doblez de la Canal (Plantilla Base)
        </h3>

        <div
          style={{ width: "100%", display: "flex", justifyContent: "center" }}
        >
          <svg
            width="100%"
            height="160px"
            viewBox="0 0 1000 325"
            style={{
              background: "transparent",
              border: "none",
              display: "block",
              maxWidth: "1000px",
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="#7f8c8d" />
              </marker>
              <marker
                id="arrowheadBlue"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="#2563eb" />
              </marker>
            </defs>

            <path
              d={pathData}
              fill="none"
              stroke="#1e293b"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {etiquetas.map((etq, idx) => {
              if (parseFloat(etq.valor) <= 5) return null;
              return (
                <text
                  key={`etiqueta-perfil-${idx}`}
                  x={etq.x}
                  y={etq.y + 4}
                  fontSize="21"
                  fill="#e41b05"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {etq.valor}
                </text>
              );
            })}

            {flechasColor}
            {cotaAberturaSvg}
            {cotaAbrirAletaSvg}
            {angulo90Svg}

            <text
              x={maxXOffset + 180}
              y="150"
              fontSize="30"
              fill="#475569"
              fontWeight="bold"
              textAnchor="start"
            >
              (Canal en desarrollo {desarrolloExacto} mm)
            </text>
          </svg>
        </div>
      </div>

      {/* ========================================== */}
      {/* VISTA 4: IDENTIFICACIÓN DE TRAMOS          */}
      {/* ========================================== */}
      <div
        style={{
          marginTop: "1px",
          paddingTop: "1px",
          width: "100%",
          background: "transparent",
          position: "relative",
        }}
      >
        <h3
          style={{
            fontSize: "11px",
            color: "#1e293b",
            margin: "0 0 2px 0",
            fontWeight: "bold",
            textTransform: "uppercase",
          }}
        >
          IDENTIFICACIÓN DE TRAMOS DE CANAL PARA LA INSTALACIÓN
        </h3>
        <div style={{ width: "100%", position: "relative" }}>
          <svg width="100%" viewBox="0 0 1000 150" style={{ display: "block" }}>
            <defs>
              <pattern
                id="pattern-ladrillo-v4"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <rect width="16" height="16" fill="#fed7aa" />
                <path
                  d="M 0,8 l 16,0 M 8,0 l 0,8 M 0,16 l 0,-8 M 16,16 l 0,-8"
                  stroke="#4c4c4c"
                  strokeWidth="1.5"
                  fill="none"
                />
              </pattern>
            </defs>

            {Object.keys(datosGeometria).map((colId) => {
              const geom = datosGeometria[colId];
              return (
                <g key={`v4-geom-${colId}`}>
                  {geom.lineas.map((l, idx) => (
                    <line
                      key={idx}
                      x1={l.x1}
                      y1={l.y1}
                      x2={l.x2}
                      y2={l.y2}
                      stroke={l.color}
                      strokeWidth={l.width}
                      style={{ pointerEvents: "none" }}
                    />
                  ))}
                </g>
              );
            })}

            {Object.keys(datosGeometria).map((colId) => (
              <g key={`v4-sosco-${colId}`} style={{ pointerEvents: "none" }}>
                {datosGeometria[colId].soscosSVG}
              </g>
            ))}

            {tramosVista4.map((c, idx) => {
              const numeroTramo = invertirTramos ? totalTramos - idx : idx + 1;
              const posY = c.y - 12;
              return (
                <g key={`v4-tramo-${idx}`} style={{ pointerEvents: "none" }}>
                  <rect
                    x={c.x - 10}
                    y={posY - 7}
                    width="20"
                    height="9"
                    fill="white"
                    fillOpacity="0.85"
                    rx="2"
                  />
                  <text
                    x={c.x}
                    y={posY}
                    fontSize="8.5"
                    fill="blue"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    T-{numeroTramo}
                  </text>
                </g>
              );
            })}

            {nodosConDetalle.map((nodo, idx) => {
              const yFinalLinea = nodo.y + 40;

              // Si es Muro: Dibujamos ladrillos
              if (nodo.esMuro) {
                return (
                  <g
                    key={`v4-nodo-muro-${idx}`}
                    style={{ pointerEvents: "none" }}
                  >
                    {/* 💡 CAMBIO: width a 5px y x centrado (-2.5) */}
                    <rect
                      x={nodo.x - 2.5}
                      y={nodo.y}
                      width="5"
                      height={yFinalLinea - nodo.y + 20}
                      fill="url(#pattern-ladrillo-v4)"
                      stroke="#94a3b8"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              }

              // Si es un eje normal: Dibujamos la caja y los números
              if (nodo.esColumna) {
                return (
                  <g key={`v4-nodo-${idx}`} style={{ pointerEvents: "none" }}>
                    <line
                      x1={nodo.x}
                      y1={nodo.y}
                      x2={nodo.x}
                      y2={yFinalLinea}
                      stroke="black"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <rect
                      x={nodo.x - 7}
                      y={yFinalLinea}
                      width="14"
                      height="20"
                      fill="white"
                      fillOpacity="0.85"
                      rx="2"
                    />
                    <text
                      x={nodo.x}
                      y={yFinalLinea + 8}
                      fontSize="9.5"
                      fill="black"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {letraEje}
                    </text>
                    <text
                      x={nodo.x}
                      y={yFinalLinea + 18}
                      fontSize="9.5"
                      fill="black"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {nodo.numeroEje}
                    </text>
                  </g>
                );
              }

              // Si es un traslapo interno (no tiene columna asignada) no dibujamos caja.
              return (
                <g
                  key={`v4-nodo-traslapo-${idx}`}
                  style={{ pointerEvents: "none" }}
                >
                  <line
                    x1={nodo.x}
                    y1={nodo.y}
                    x2={nodo.x}
                    y2={nodo.y + 15}
                    stroke="#3b82f6"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                </g>
              );
            })}
          </svg>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              padding: "0 0 6px 15px",
              marginTop: "-15px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  color: "blue",
                  fontWeight: "bold",
                  fontSize: "11.5px",
                }}
              >
                T - 1
              </span>
              <span
                style={{
                  color: "blue",
                  fontWeight: "bold",
                  fontSize: "11.5px",
                }}
              >
                Número del tramo de canal
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  color: "black",
                  fontWeight: "bold",
                  fontSize: "11.5px",
                  lineHeight: "1",
                }}
              >
                <span>{letraEje}</span>
                <span>1</span>
              </div>
              <span
                style={{
                  color: "black",
                  fontWeight: "bold",
                  fontSize: "11.5px",
                }}
              >
                Identificación del inicio y final de cada tramo de Canal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* HOJA 2 DE IMPRESIÓN: TABLA DE RESUMEN DE CANTIDADES       */}
      {/* ========================================================= */}
      <div
        className="no-print-screen"
        style={{
          pageBreakBefore: "always",
          marginTop: "40px",
          paddingTop: "20px",
          width: "100%",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            color: "#1e293b",
            margin: "0 0 15px 0",
            fontWeight: "bold",
            textTransform: "uppercase",
            borderBottom: "2px solid #f39c12",
            paddingBottom: "6px",
          }}
        >
          REPORTE DE PRODUCCIÓN Y DESPACHO A OBRA
        </h3>

        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            padding: "15px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #e2e8f0",
              padding: "10px 0",
              fontSize: "13px",
              fontWeight: "bold",
              color: "#334155",
            }}
          >
            <span>Tramos de Canal a Fabricar (T):</span>
            <span style={{ color: "#2563eb" }}>
              {totalTramos} {totalTramos === 1 ? "tramo" : "tramos"}
            </span>
          </div>

          {(() => {
            let totalSoscos = 0;
            Object.values(configColumnas).forEach((col) => {
              if (col.soscoCentro) totalSoscos++;
              if (col.soscoIzquierdo) totalSoscos++;
              if (col.soscoDerecho) totalSoscos++;
              if (col.dosSoscos) totalSoscos += 2;
            });

            return (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #e2e8f0",
                  padding: "10px 0",
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: "#334155",
                }}
              >
                <span>Accesorios Bajantes (Soscos):</span>
                <span
                  style={{ color: totalSoscos > 0 ? "#dc2626" : "#94a3b8" }}
                >
                  {totalSoscos} {totalSoscos === 1 ? "unidad" : "unidades"}
                </span>
              </div>
            );
          })()}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              fontSize: "13px",
              fontWeight: "bold",
              color: "#334155",
            }}
          >
            <span>Tapas Laterales (Extremos de Canal):</span>
            <span style={{ color: "#059669" }}>2 unidades</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorteLateralCanal;
