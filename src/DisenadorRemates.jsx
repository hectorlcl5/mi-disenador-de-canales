import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
// Importamos el logo localmente desde la carpeta src
import logoCortiza from "./logo-cortiza.png";

const DisenadorRemates = () => {
  const [proyectosList, setProyectosList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState("Diseño_001");
  const [tituloHoja, setTituloHoja] = useState("DISEÑO DE REMATES");
  const [nombreDisenador, setNombreDisenador] = useState("");
  const [fechaDiseno, setFechaDiseno] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [remates, setRemates] = useState([
    {
      id: Date.now(),
      titulo: "Remate Principal",
      caraColor: "exterior",
      tramos: [
        { longitud: 40, angulo: 90 },
        { longitud: 180, angulo: 15 },
        { longitud: 20, angulo: 90 },
      ],
      caracteristicas: [
        { key: "Calibre", value: "26" },
        { key: "Color", value: "Blanco Almendra" },
        { key: "Desarrollo", value: "240 mm" },
        { key: "Unidades", value: "" },
      ],
    },
  ]);
  const [mensaje, setMensaje] = useState("");
  const [listaPlantillas, setListaPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");

  // --- LÓGICA AUTOMÁTICA DE DESARROLLO ---
  useEffect(() => {
    const nuevosRemates = remates.map((r) => {
      const sumaDesarrollo = r.tramos.reduce((acc, t) => {
        const l = parseFloat(t.longitud) || 0;
        // 💡 CAMBIO: Ignorar de la suma los grafados (1mm o menos)
        return l > 2 ? acc + l : acc;
      }, 0);

      const nuevasCaracteristicas = r.caracteristicas.map((c) => {
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

  // --- CARGA DE PLANTILLAS DE REMATES ---
  const cargarListaPlantillas = async () => {
    const { data, error } = await supabase
      .from("diseños_canales")
      .select("id, nombre_proyecto, tramos")
      .order("ultima_actualizacion", { ascending: false });
    if (!error) {
      setListaPlantillas(
        data.filter((p) => p.tramos?.modulo === "remates_plantilla"),
      );
    }
  };

  useEffect(() => {
    cargarListaPlantillas();
  }, []);

  // --- PERSISTENCIA ---
  const nuevoProyecto = () => {
    if (window.confirm("¿Nuevo proyecto? Se limpiará la pantalla.")) {
      setProjectId(null);
      setNombreArchivo("Diseño_Nuevo");
      setTituloHoja("DISEÑO DE REMATES");
      setNombreDisenador(""); // 💡 Limpiar diseñador
      setFechaDiseno(new Date().toISOString().split("T")[0]); // 💡 Resetear fecha
      setRemates([
        {
          id: Date.now(),
          titulo: "Nuevo Remate",
          caraColor: "ninguna",
          tramos: [{ longitud: 100, angulo: 90 }],
          caracteristicas: [
            { key: "Calibre", value: "" },
            { key: "Color", value: "" },
            { key: "Desarrollo", value: "0 mm" },
            { key: "Unidades", value: "" },
          ],
        },
      ]);
    }
  };

  const guardarProyecto = async () => {
    setMensaje("Guardando...");
    const payload = {
      nombre_proyecto: nombreArchivo,
      tramos: {
        modulo: "remates",
        remates,
        tituloHoja,
        nombreDisenador,
        fechaDiseno,
      }, // 💡 Incluidos
      ultima_actualizacion: new Date(),
    };

    let result = projectId
      ? await supabase
          .from("diseños_canales")
          .update(payload)
          .eq("id", projectId)
      : await supabase.from("diseños_canales").insert([payload]).select();

    if (result.data && !projectId) setProjectId(result.data[0].id);
    setMensaje(result.error ? "❌ Error" : "✅ Guardado");
  };

  const guardarComoDB = async () => {
    const nuevoNombre = window.prompt(
      "Ingrese el nuevo nombre para este archivo:",
      nombreArchivo + "_Copia",
    );
    if (!nuevoNombre) return;
    setMensaje("Guardando como archivo nuevo...");
    const payload = {
      nombre_proyecto: nuevoNombre,
      tramos: {
        modulo: "remates",
        remates,
        tituloHoja,
        nombreDisenador,
        fechaDiseno,
      }, // 💡 Incluidos
      ultima_actualizacion: new Date(),
    };
    let res = await supabase.from("diseños_canales").insert([payload]).select();
    if (!res.error && res.data?.length > 0) {
      setProjectId(res.data[0].id);
      setNombreArchivo(nuevoNombre);
    }
    setMensaje(
      res.error ? "❌ Error al guardar como" : "✅ Archivo nuevo creado",
    );
  };

  const guardarComoPlantilla = async () => {
    const nombrePlantilla = window.prompt(
      "Ingrese el nombre para esta Plantilla (Ej: Caballete Tipo 1):",
    );
    if (!nombrePlantilla) return;
    setMensaje("Guardando en plantillas...");
    const payload = {
      nombre_proyecto: nombrePlantilla,
      tramos: {
        modulo: "remates_plantilla",
        remates,
        tituloHoja,
        nombreDisenador,
        fechaDiseno,
      }, // 💡 Incluidos
      ultima_actualizacion: new Date(),
    };
    let res = await supabase.from("diseños_canales").insert([payload]);
    setMensaje(
      res.error ? "❌ Error al guardar plantilla" : "✅ Plantilla guardada",
    );
    cargarListaPlantillas();
  };

  const cargarPlantillaEspecifica = (idPlantilla) => {
    const plantilla = listaPlantillas.find(
      (p) => String(p.id) === String(idPlantilla),
    );
    if (!plantilla) return;
    const info = plantilla.tramos;

    setProjectId(null);
    setNombreArchivo(plantilla.nombre_proyecto + "_Nuevo");
    setTituloHoja(info.tituloHoja || "DISEÑO DE REMATES");
    setNombreDisenador(info.nombreDisenador || ""); // 💡 Cargados
    setFechaDiseno(info.fechaDiseno || new Date().toISOString().split("T")[0]); // 💡 Cargados

    const rematesCargados = (info.remates || []).map((r) => ({
      ...r,
      caraColor: r.caraColor || "ninguna",
    }));
    setRemates(rematesCargados);
    setMensaje(
      "✅ Plantilla cargada. Dale a 'Guardar' para crear tu proyecto.",
    );
  };

  const eliminarPlantilla = async () => {
    if (!plantillaSeleccionada) {
      alert("Seleccione una plantilla primero.");
      return;
    }
    const plantilla = listaPlantillas.find(
      (p) => String(p.id) === String(plantillaSeleccionada),
    );
    if (
      window.confirm(
        `¿Seguro que desea eliminar permanentemente la plantilla "${plantilla?.nombre_proyecto}"?`,
      )
    ) {
      setMensaje("Eliminando...");
      const { error } = await supabase
        .from("diseños_canales")
        .delete()
        .eq("id", plantillaSeleccionada);
      if (!error) {
        setMensaje("✅ Plantilla eliminada.");
        setPlantillaSeleccionada("");
        cargarListaPlantillas();
      } else {
        setMensaje("❌ Error al eliminar.");
      }
    }
  };

  const listarProyectos = async () => {
    const { data } = await supabase
      .from("diseños_canales")
      .select("id, nombre_proyecto, ultima_actualizacion, tramos")
      .order("ultima_actualizacion", { ascending: false });
    if (data) {
      setProyectosList(
        data.filter(
          (p) =>
            p.tramos?.modulo === "remates" ||
            (!p.tramos?.modulo && p.tramos?.remates),
        ),
      );
    }
    setShowModal(true);
  };

  const cargarProyecto = async (id) => {
    const { data } = await supabase
      .from("diseños_canales")
      .select("*")
      .eq("id", id)
      .single();
    if (data) {
      setProjectId(data.id);
      setNombreArchivo(data.nombre_proyecto);
      setTituloHoja(data.tramos.tituloHoja || "DISEÑO DE REMATES");
      setNombreDisenador(data.tramos.nombreDisenador || ""); // 💡 Cargados
      setFechaDiseno(
        data.tramos.fechaDiseno || new Date().toISOString().split("T")[0],
      ); // 💡 Cargados

      const rematesCargados = (data.tramos.remates || data.tramos).map((r) => ({
        ...r,
        caraColor: r.caraColor || "ninguna",
      }));
      setRemates(rematesCargados);
      setShowModal(false);
    }
  };

  // 👇 AQUÍ FALTABA EL RETURN Y EL DIV PRINCIPAL 👇
  return (
    <div
      className="main-container"
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Arial",
        backgroundColor: "#f0f2f5",
      }}
    >
      <style>{`
        @media print { 
          .no-print { display: none !important; } 
          body, html, .main-container { background: white !important; height: auto !important; overflow: visible !important; display: block !important; }
          .print-area { width: 100% !important; padding: 0 !important; display: flex !important; flex-direction: column !important; min-height: 100vh !important; } 
          .print-header { display: flex !important; margin-bottom: 10px !important; padding-bottom: 10px !important; } 
          
          /* 💡 PUNTO 4: justify-content: flex-start apila los remates en la parte superior. 
             Un gap de 15px nos asegura que quepan 6 holgadamente en la hoja carta. */
          .remates-wrapper { flex: 1 !important; display: flex !important; flex-direction: column !important; justify-content: flex-start !important; gap: 15px !important; }
          
          .remate-item { border-bottom: none !important; padding-bottom: 10px !important; margin-bottom: 0 !important; page-break-inside: avoid !important; }
          .remate-item:last-child { border-bottom: none !important; }
          @page { size: letter portrait; margin: 0.5cm; }
        }
      `}</style>

      {/* PANEL DE CONTROL IZQUIERDO */}
      <div
        className="no-print"
        style={{
          width: "280px",
          backgroundColor: "#fff",
          borderRight: "2px solid #ddd",
          overflowY: "auto",
          padding: "15px",
          boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
        }}
      >
        {/* LOGO INSERTO EN LA PARTE SUPERIOR IZQUIERDA DEL PANEL */}
        <div
          style={{
            display: "flex",
            justifyContent: "left",
            marginBottom: "15px",
          }}
        >
          <img
            src={logoCortiza}
            alt="Logo Cortiza"
            style={{ maxWidth: "70px", height: "auto" }}
          />
        </div>

        {/* CONTENEDOR DE BOTONES Y NOMBRE DE ARCHIVO */}
        <div
          style={{
            marginBottom: "5px",
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            {/* Fila 1: Nuevo, Abrir, Guardar, Guardar Como */}
            <div style={{ display: "flex", gap: "5px", width: "100%" }}>
              <button
                onClick={nuevoProyecto}
                style={{
                  ...btnStyle,
                  flex: 1,
                  backgroundColor: "#f39c12",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                }}
              >
                Nuevo
              </button>
              <button
                onClick={listarProyectos}
                style={{
                  ...btnStyle,
                  flex: 1,
                  backgroundColor: "#f39c12",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                }}
              >
                Abrir
              </button>
              <button
                onClick={guardarProyecto}
                style={{
                  ...btnStyle,
                  flex: 1,
                  backgroundColor: "#28a745",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                }}
              >
                Guardar
              </button>
              <button
                onClick={guardarComoDB}
                style={{
                  ...btnStyle,
                  flex: 1,
                  backgroundColor: "#20c997",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                  padding: "6px 2px",
                }}
              >
                Guardar Como
              </button>
            </div>
            {/* Fila 2: Imprimir y Guardar Plantilla */}
            <div style={{ display: "flex", gap: "5px", width: "100%" }}>
              <button
                onClick={() => window.print()}
                style={{
                  ...btnStyle,
                  flex: 1,
                  backgroundColor: "#5bc0de",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                  padding: "8px",
                }}
              >
                Imprimir
              </button>
              <button
                onClick={guardarComoPlantilla}
                style={{
                  ...btnStyle,
                  flex: 1,
                  backgroundColor: "#8e44ad",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                  padding: "8px",
                }}
              >
                Guardar en Plantilla
              </button>
            </div>
          </div>

          {/* NUEVO MENÚ: PLANTILLAS ESTÁNDAR */}
          <div
            style={{
              padding: "8px",
              backgroundColor: "#f3e8ff",
              borderRadius: "6px",
              marginBottom: "10px",
              border: "1px solid #d8b4e2",
            }}
          >
            <label
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#6b21a8",
                display: "block",
                marginBottom: "2px",
              }}
            >
              PLANTILLAS ESTÁNDAR:
            </label>
            <select
              style={{
                ...inputStyle,
                backgroundColor: "#fff",
                fontWeight: "bold",
                borderColor: "#d8b4e2",
                color: "#6b21a8",
                marginBottom: "6px",
              }}
              value={plantillaSeleccionada}
              onChange={(e) => setPlantillaSeleccionada(e.target.value)}
            >
              <option value="" disabled>
                Seleccione una plantilla...
              </option>
              {listaPlantillas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_proyecto}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: "5px" }}>
              <button
                onClick={() => {
                  if (plantillaSeleccionada) {
                    cargarPlantillaEspecifica(plantillaSeleccionada);
                    setPlantillaSeleccionada("");
                  } else {
                    alert("Seleccione una plantilla para cargar");
                  }
                }}
                style={{
                  ...btnStyle,
                  flex: 1,
                  backgroundColor: "#9333ea",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                }}
              >
                ⬇️ Cargar
              </button>
              <button
                onClick={eliminarPlantilla}
                style={{
                  ...btnStyle,
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                  padding: "5px 10px",
                }}
                title="Eliminar Plantilla"
              >
                🗑️
              </button>
            </div>
          </div>

          <label style={{ fontSize: "10px", color: "#666" }}>
            NOMBRE DEL ARCHIVO:
          </label>
          <input
            style={inputStyle}
            value={nombreArchivo}
            onChange={(e) => setNombreArchivo(e.target.value)}
          />
          <p style={{ color: "blue", fontSize: "11px", margin: "5px 0" }}>
            {mensaje}
          </p>
        </div>

        <label style={{ fontSize: "10px", fontWeight: "bold" }}>
          TÍTULO DE LA HOJA:
        </label>
        <input
          style={{
            ...inputStyle,
            marginBottom: "20px",
            border: "1px solid #f39c12",
          }}
          value={tituloHoja}
          onChange={(e) => setTituloHoja(e.target.value)}
        />

        {/* 💡 PUNTO 1: Inputs para Diseñador y Fecha en el panel izquierdo */}
        <label style={labelStyle}>DISEÑADOR:</label>
        <input
          type="text"
          style={{ ...inputStyle, marginBottom: "8px" }}
          value={nombreDisenador}
          onChange={(e) => setNombreDisenador(e.target.value)}
          placeholder="Nombre de quien diseña"
        />

        <label style={labelStyle}>FECHA DE DISEÑO:</label>
        <input
          type="date"
          style={{ ...inputStyle, marginBottom: "20px" }}
          value={fechaDiseno}
          onChange={(e) => setFechaDiseno(e.target.value)}
        />

        {remates.map((r, rIdx) => (
          <div key={r.id} style={cardStyle}>
            {/* NUEVO ENCABEZADO CON BOTÓN DE ELIMINAR REMATE */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
                borderBottom: "1px solid #ddd",
                paddingBottom: "4px",
              }}
            >
              <input
                style={{
                  fontWeight: "bold",
                  width: "100%",
                  fontSize: "16px",
                  border: "none",
                  outline: "none",
                }}
                value={r.titulo}
                onChange={(e) => {
                  const n = [...remates];
                  n[rIdx].titulo = e.target.value;
                  setRemates(n);
                }}
              />
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Seguro que deseas eliminar el "${r.titulo}" por completo?`,
                    )
                  ) {
                    const n = remates.filter((_, i) => i !== rIdx);
                    setRemates(n);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#e74c3c",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "0 5px",
                }}
                title="Eliminar Remate Completo"
              >
                🗑️
              </button>
            </div>

            <p style={labelStyle}>INDICACIÓN DE COLOR:</p>
            <select
              style={{
                ...inputStyle,
                marginBottom: "10px",
                padding: "6px",
                fontSize: "12px",
              }}
              value={r.caraColor}
              onChange={(e) => {
                const n = [...remates];
                n[rIdx].caraColor = e.target.value;
                setRemates(n);
              }}
            >
              <option value="ninguna">No indicar cara de color</option>
              <option value="exterior">
                Color en la parte Superior / Exterior
              </option>
              <option value="interior">
                Color en la parte Inferior / Interior
              </option>
            </select>

            <p style={labelStyle}>PASOS DE DIBUJO (Ángulo | Largo):</p>
            {r.tramos.map((t, tIdx) => (
              <div
                key={tIdx}
                style={{
                  display: "flex",
                  gap: "5px",
                  marginBottom: "8px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "10px", color: "#ccc" }}>
                  {tIdx + 1}
                </span>
                <input
                  type="number"
                  placeholder="Ang°"
                  style={{ width: "60px", padding: "4px" }}
                  value={t.angulo}
                  onChange={(e) => {
                    const n = [...remates];
                    n[rIdx].tramos[tIdx].angulo = e.target.value;
                    setRemates(n);
                  }}
                />
                <input
                  type="number"
                  placeholder="Long mm"
                  style={{ width: "80px", padding: "4px" }}
                  value={t.longitud}
                  onChange={(e) => {
                    const n = [...remates];
                    n[rIdx].tramos[tIdx].longitud = e.target.value;
                    setRemates(n);
                  }}
                />
                <button
                  onClick={() => {
                    const n = [...remates];
                    n[rIdx].tramos.splice(tIdx, 1);
                    setRemates(n);
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    color: "red",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const n = [...remates];
                n[rIdx].tramos.push({ longitud: 100, angulo: 0 });
                setRemates(n);
              }}
              style={{
                fontSize: "11px",
                color: "#2563eb",
                background: "none",
                border: "1px solid #2563eb",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                marginBottom: "10px",
              }}
            >
              <div
                style={{ display: "flex", gap: "5px", marginBottom: "10px" }}
              >
                <button
                  onClick={() => {
                    const n = [...remates];
                    // 💡 COPIA SEGURA: Evita que React duplique la acción
                    n[rIdx] = { ...n[rIdx], tramos: [...n[rIdx].tramos] };
                    n[rIdx].tramos.unshift({ longitud: 100, angulo: 0 });
                    setRemates(n);
                  }}
                  style={{
                    fontSize: "10px",
                    color: "#2563eb",
                    background: "#eff6ff",
                    border: "1px solid #2563eb",
                    padding: "6px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    flex: 1,
                    fontWeight: "bold",
                  }}
                >
                  ⬆️ + Añadir al Inicio
                </button>

                <button
                  onClick={() => {
                    const n = [...remates];
                    // 💡 COPIA SEGURA: Evita que React duplique la acción
                    n[rIdx] = { ...n[rIdx], tramos: [...n[rIdx].tramos] };
                    n[rIdx].tramos.push({ longitud: 100, angulo: 0 });
                    setRemates(n);
                  }}
                  style={{
                    fontSize: "10px",
                    color: "#2563eb",
                    background: "#eff6ff",
                    border: "1px solid #2563eb",
                    padding: "6px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    flex: 1,
                    fontWeight: "bold",
                  }}
                >
                  ⬇️ + Añadir al Final
                </button>
              </div>
            </button>

            <p style={labelStyle}>DATOS DE FICHA TÉCNICA:</p>
            {r.caracteristicas.map((c, cIdx) => (
              <div
                key={cIdx}
                style={{ display: "flex", gap: "5px", marginBottom: "4px" }}
              >
                <input
                  style={{ width: "85px", fontSize: "11px", padding: "2px" }}
                  value={c.key}
                  readOnly={c.key.toLowerCase().includes("desarrollo")}
                />
                <input
                  style={{
                    width: "120px",
                    fontSize: "11px",
                    padding: "2px",
                    backgroundColor: c.key.toLowerCase().includes("desarrollo")
                      ? "#e9ecef"
                      : "#fff",
                  }}
                  value={c.value}
                  onChange={(e) => {
                    if (!c.key.toLowerCase().includes("desarrollo")) {
                      const n = [...remates];
                      n[rIdx].caracteristicas[cIdx].value = e.target.value;
                      setRemates(n);
                    }
                  }}
                  placeholder={
                    c.key.toLowerCase().includes("desarrollo")
                      ? "Calculado"
                      : ""
                  }
                />
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={() =>
            setRemates([
              ...remates,
              {
                id: Date.now(),
                titulo: "Nuevo Remate",
                caraColor: "ninguna",
                tramos: [{ longitud: 100, angulo: 0 }],
                caracteristicas: [
                  { key: "Calibre", value: "" },
                  { key: "Color", value: "" },
                  { key: "Desarrollo", value: "0 mm" },
                  { key: "Unidades", value: "" },
                ],
              },
            ])
          }
          style={{
            width: "100%",
            padding: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            backgroundColor: "#f39c12",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          + ADICIONAR OTRO REMATE
        </button>
      </div>

      {/* ÁREA DE TRABAJO IMPRIMIBLE */}
      <div
        className="print-area"
        style={{
          flex: 1,
          backgroundColor: "#fff",
          padding: "40px",
          overflowY: "auto",
        }}
      >
        {/* ENCABEZADO DE IMPRESIÓN MODERNO CON EL LOGO INCLUIDO EN EL PDF */}
        <div
          className="print-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            borderBottom: "3px solid #f39c12",
            paddingBottom: "15px",
          }}
        >
          <img
            src={logoCortiza}
            alt="Logo Cortiza Impresión"
            style={{ maxWidth: "80px", height: "auto" }}
          />

          <div style={{ textAlign: "right", flex: 1, marginLeft: "20px" }}>
            <h1
              style={{
                margin: 0,
                color: "#f39c12",
                textTransform: "uppercase",
                fontSize: "19px",
                fontWeight: "bold",
              }}
            >
              {tituloHoja}
            </h1>
            <div
              style={{
                fontSize: "12px",
                color: "#475569",
                marginTop: "5px",
                display: "flex",
                gap: "15px",
                justifyContent: "flex-end",
              }}
            >
              <span>
                <strong>Diseñador:</strong>{" "}
                {nombreDisenador || "____________________"}
              </span>
              <span>
                <strong>Fecha:</strong> {fechaDiseno || "____________________"}
              </span>
            </div>
          </div>
        </div>

        {/* CONTENEDOR FLEX PARA DISTRIBUIR EQUITATIVAMENTE EN IMPRESIÓN */}
        <div
          className="remates-wrapper"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
          }}
        >
          {remates.map((r) => (
            <div
              key={r.id}
              className="remate-item"
              style={{
                display: "flex",
                borderBottom: "none",
                paddingBottom: "15px",
                alignItems: "center",
                pageBreakInside: "avoid",
              }}
            >
              <div style={{ flex: 1 }}>
                <DibujoSVG
                  tramos={r.tramos}
                  caraColor={r.caraColor}
                  caracteristicas={r.caracteristicas}
                />
              </div>
              <div
                style={{
                  width: "260px",
                  borderLeft: "4px solid #f39c12",
                  paddingLeft: "15px",
                  marginLeft: "15px",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "17px",
                    color: "#2c3e50",
                  }}
                >
                  {r.titulo}
                </h2>
                {r.caracteristicas.map((c, i) => (
                  <div
                    key={i}
                    style={{ fontSize: "12px", marginBottom: "4px" }}
                  >
                    <strong style={{ color: "#555" }}>{c.key}:</strong>{" "}
                    {c.value}
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
            <h3 style={{ marginTop: 0 }}>Abrir Diseño Guardado</h3>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {proyectosList.map((p) => (
                <div
                  key={p.id}
                  onClick={() => cargarProyecto(p.id)}
                  style={itemProyectoStyle}
                >
                  <strong>{p.nombre_proyecto}</strong>
                  <small style={{ color: "#999" }}>
                    {new Date(p.ultima_actualizacion).toLocaleString()}
                  </small>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowModal(false)}
              style={{ marginTop: "20px", width: "100%", padding: "8px" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MOTOR DE DIBUJO GEOMÉTRICO (AUTO-ESCALADO INTELIGENTE Y ANTICOLISIONES) ---
const DibujoSVG = ({ tramos, caraColor, caracteristicas }) => {
  const etiquetas = [];
  const lineasProcesadas = [];
  const intersecciones = [];

  const objetoColor = caracteristicas.find(
    (c) => c.key.toLowerCase() === "color",
  );
  const nombreColor =
    objetoColor && objetoColor.value ? objetoColor.value : "Color";

  // PASADA 1: Calcular límites (Bounding Box) en bruto
  let rx = 0,
    ry = 0;
  let minX = 0,
    maxX = 0,
    minY = 0,
    maxY = 0;
  const rawLines = [];
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
    const nx = rx + long * Math.cos(rad);
    const ny = ry + long * Math.sin(rad);

    rawLines.push({
      x1: rx,
      y1: ry,
      x2: nx,
      y2: ny,
      long,
      angRad: rad,
      angGrados: ang,
    });

    rx = nx;
    ry = ny;
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  });

  // PASADA 2: Calcular el factor de escala y centrado
  const rawW = maxX - minX || 1;
  const rawH = maxY - minY || 1;

  const targetW = 400;
  const targetH = 180;

  let scale = Math.min(targetW / rawW, targetH / rawH);
  if (scale > 2.5) scale = 2.5;

  const scaledW = rawW * scale;
  const scaledH = rawH * scale;

  const offsetX = (500 - scaledW) / 2 - minX * scale;
  const offsetY = (240 - scaledH) / 2 - minY * scale;

  // PASADA 3: Aplicar escala y guardar datos para renderizar
  let pathData = "";
  if (rawLines.length > 0) {
    pathData = `M ${rawLines[0].x1 * scale + offsetX} ${rawLines[0].y1 * scale + offsetY}`;
  }

  rawLines.forEach((rl) => {
    const sx1 = rl.x1 * scale + offsetX;
    const sy1 = rl.y1 * scale + offsetY;
    const sx2 = rl.x2 * scale + offsetX;
    const sy2 = rl.y2 * scale + offsetY;

    pathData += ` L ${sx2} ${sy2}`;
    lineasProcesadas.push({
      x1: sx1,
      y1: sy1,
      x2: sx2,
      y2: sy2,
      midX: (sx1 + sx2) / 2,
      midY: (sy1 + sy2) / 2,
      anguloRad: rl.angRad,
      longitud: rl.long,
      anguloGrados: rl.angGrados,
    });
  });

  // Generar etiquetas de medidas (Cotas Rojas)
  lineasProcesadas.forEach((linea, i) => {
    const normalAng = linea.anguloRad + Math.PI / 2;
    let offsetCota = -16;
    if (i === indiceTramoLargo && caraColor === "exterior") offsetCota = 16;
    const mx = linea.midX + Math.cos(normalAng) * offsetCota;
    const my = linea.midY + Math.sin(normalAng) * offsetCota;
    etiquetas.push({ mx, my, val: linea.longitud });
  });

  // Calcular ángulos internos y aplicar LÓGICA ANTICOLISIONES
  for (let i = 0; i < lineasProcesadas.length - 1; i++) {
    const l1 = lineasProcesadas[i];
    const l2 = lineasProcesadas[i + 1];

    // 💡 NUEVO: Si alguna de las líneas es un grafado (<= 1mm), NO dibujamos el ángulo
    if (l1.longitud <= 2 || l2.longitud <= 2) continue;

    const vx = l1.x2,
      vy = l1.y2;
    const v1x = -Math.cos(l1.anguloRad),
      v1y = -Math.sin(l1.anguloRad);
    const v2x = Math.cos(l2.anguloRad),
      v2y = Math.sin(l2.anguloRad);

    const dot = v1x * v2x + v1y * v2y;
    const cross = v1x * v2y - v1y * v2x;
    const innerRad = Math.acos(Math.max(-1, Math.min(1, dot)));
    const innerDeg = Math.round((innerRad * 180) / Math.PI);

    let bx = v1x + v2x,
      by = v1y + v2y;
    const bLen = Math.sqrt(bx * bx + by * by);
    if (bLen > 0.001) {
      bx /= bLen;
      by /= bLen;
    } else {
      bx = -v1y;
      by = v1x;
    }

    const distReal1 = Math.sqrt((l1.x2 - l1.x1) ** 2 + (l1.y2 - l1.y1) ** 2);
    const distReal2 = Math.sqrt((l2.x2 - l2.x1) ** 2 + (l2.y2 - l2.y1) ** 2);
    const crowded = distReal1 < 35 || distReal2 < 35;

    const rArc = 12;
    let rText = crowded ? 45 : 22;

    let tx = vx + bx * rText;
    let ty = vy + by * rText;

    let overlap = false;
    const minDistSeguridad = 28;

    etiquetas.forEach((etq) => {
      if (Math.hypot(tx - etq.mx, ty - etq.my) < minDistSeguridad) {
        overlap = true;
      }
    });

    if (overlap) {
      rText += 28;
      tx = vx + bx * rText;
      ty = vy + by * rText;
    }

    let leader = null;
    if (crowded || overlap) {
      leader = {
        x1: vx + bx * (rArc + 2),
        y1: vy + by * (rArc + 2),
        x2: vx + bx * (rText - 14),
        y2: vy + by * (rText - 14),
      };
    }

    const ax1 = vx + v1x * rArc,
      ay1 = vy + v1y * rArc;
    const ax2 = vx + v2x * rArc,
      ay2 = vy + v2y * rArc;
    const sweepFlag = cross > 0 ? 1 : 0;

    ty += 4;

    intersecciones.push({
      vx,
      vy,
      ax1,
      ay1,
      ax2,
      ay2,
      rArc,
      sweepFlag,
      tx,
      ty,
      innerDeg,
      leader,
    });
  }

  let flechaG = null;
  if (
    lineasProcesadas.length > 0 &&
    indiceTramoLargo < lineasProcesadas.length
  ) {
    const tLargo = lineasProcesadas[indiceTramoLargo];
    const pAng = tLargo.anguloRad + Math.PI / 2;
    const factorDir = caraColor === "exterior" ? -1 : 1;
    const fX1 = tLargo.midX + Math.cos(pAng) * (38 * factorDir);
    const fY1 = tLargo.midY + Math.sin(pAng) * (38 * factorDir);
    const fX2 = tLargo.midX + Math.cos(pAng) * (10 * factorDir);
    const fY2 = tLargo.midY + Math.sin(pAng) * (10 * factorDir);
    const tX = tLargo.midX + Math.cos(pAng) * (52 * factorDir);
    const tY = tLargo.midY + Math.sin(pAng) * (52 * factorDir) + 4;

    if (caraColor !== "ninguna") {
      flechaG = (
        <g>
          <line
            x1={fX1}
            y1={fY1}
            x2={fX2}
            y2={fY2}
            stroke="#7f8c8d"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
          <text
            x={tX}
            y={tY}
            fontSize="15"
            fill="#4f5d73"
            fontWeight="bold"
            textAnchor="middle"
          >
            {nombreColor}
          </text>
        </g>
      );
    }
  }

  return (
    <svg
      width="100%"
      height="150"
      viewBox="0 0 500 240"
      style={{
        backgroundColor: "#fafafa",
        borderRadius: "6px",
        maxHeight: "150px",
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#7f8c8d" />
        </marker>
        <marker
          id="arrowBlue"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
        </marker>
      </defs>

      <path
        d={pathData}
        fill="none"
        stroke="#2c3e50"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {flechaG}

      {etiquetas.map((e, i) => {
        // 💡 CAMBIO: Solo oculta cotas si son de 1mm o menos
        if (parseFloat(e.val) <= 2) return null;
        return (
          <text
            key={`cota-${i}`}
            x={e.mx}
            y={e.my + 3}
            fontSize="16"
            fill="#e41b05"
            fontWeight="bold"
            textAnchor="middle"
          >
            {e.val}
          </text>
        );
      })}

      {intersecciones.map((int, i) => (
        <g key={`angulo-${i}`}>
          <path
            d={`M ${int.ax1} ${int.ay1} A ${int.rArc} ${int.rArc} 0 0 ${int.sweepFlag} ${int.ax2} ${int.ay2}`}
            fill="none"
            stroke="#0541c2"
            strokeWidth="1.2"
          />
          {int.leader && (
            <line
              x1={int.leader.x1}
              y1={int.leader.y1}
              x2={int.leader.x2}
              y2={int.leader.y2}
              stroke="#0541c2"
              strokeWidth="1"
              markerEnd="url(#arrowBlue)"
            />
          )}
          <text
            x={int.tx}
            y={int.ty}
            fontSize="16"
            fill="#0541c2"
            fontWeight="bold"
            textAnchor="middle"
          >
            {int.innerDeg}°
          </text>
        </g>
      ))}
    </svg>
  );
};

// (Mantén tus estilos constantes al final como btnStyle, etc)
const btnStyle = {
  padding: "6px 10px",
  fontSize: "11px",
  cursor: "pointer",
  border: "1px solid #ccc",
  borderRadius: "4px",
};
const inputStyle = {
  width: "100%",
  padding: "8px",
  boxSizing: "border-box",
  borderRadius: "4px",
  border: "1px solid #ccc",
};
const cardStyle = {
  background: "#fff",
  border: "1px solid #ddd",
  padding: "15px",
  marginBottom: "20px",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
};
const labelStyle = {
  fontSize: "10px",
  fontWeight: "bold",
  color: "#999",
  margin: "15px 0 8px 0",
  textTransform: "uppercase",
};
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 100,
};
const modalContentStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "12px",
  width: "350px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
};
const itemProyectoStyle = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  cursor: "pointer",
};

export default DisenadorRemates;
