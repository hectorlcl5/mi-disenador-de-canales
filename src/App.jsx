import React, { useState } from 'react';
import DisenadorRemates from './DisenadorRemates';
import DisenadorCanales from './DisenadorCanales';
import logoCortiza from './logo-cortiza.png';

const App = () => {
  // Estado para saber en qué sección estamos: 'menu', 'remates' o 'canales'
  const [seccion, setSeccion] = useState('menu');

  if (seccion === 'remates') {
    return (
      <div>
        <button 
          onClick={() => setSeccion('menu')} 
          style={btnVolverStyle}
          className="no-print"
        >
          ← Volver al Menú Principal
        </button>
        <DisenadorRemates />
      </div>
    );
  }

  if (seccion === 'canales') {
    return (
      <div>
        <button 
          onClick={() => setSeccion('menu')} 
          style={btnVolverStyle}
          className="no-print"
        >
          ← Volver al Menú Principal
        </button>
        <DisenadorCanales />
      </div>
    );
  }

  // Vista del Menú de Bienvenida
  return (
    <div style={menuContainerStyle}>
      <img src={logoCortiza} alt="Logo Cortiza" style={{ maxWidth: '250px', marginBottom: '30px' }} />
      <h1 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '28px' }}>SOFTWARE DE INGENIERÍA CORTIZA</h1>
      <p style={{ color: '#7f8c8d', marginBottom: '40px' }}>Seleccione el módulo de diseño que desea iniciar:</p>
      
      <div style={{ display: 'flex', gap: '25px' }}>
        <button onClick={() => setSeccion('remates')} style={cardMenuRemateStyle}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📐</div>
          <strong style={{ fontSize: '18px' }}>Diseñador de Remates</strong>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Cortes 2D, pliegues paramétricos y calibres de remate.</p>
        </button>

        <button onClick={() => setSeccion('canales')} style={cardMenuCanalStyle}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>💧</div>
          <strong style={{ fontSize: '18px' }}>Diseñador de Canales</strong>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Vista planta, cálculo de columnas, pendientes e instalación.</p>
        </button>
      </div>
    </div>
  );
};

// Estilos rápidos para el menú
const menuContainerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Arial' };
const cardMenuStyle = { width: '260px', padding: '30px', border: 'none', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s', textAlign: 'center' };
const cardMenuRemateStyle = { ...cardMenuStyle, borderTop: '6px solid #2563eb' };
const cardMenuCanalStyle = { ...cardMenuStyle, borderTop: '6px solid #f39c12' };
const btnVolverStyle = { position: 'fixed', top: '15px', right: '15px', zIndex: 1000, padding: '8px 10px', fontSize: '11px', backgroundColor: '#f39c12', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', width: '100px', textAlign: 'center', lineHeight: '1.3' };

export default App;