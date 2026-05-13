import { useState } from 'react';
import { registrarLoteService } from '../services/inventoryService';

export default function RegistrarLote({ insumos, onLoteRegistrado }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    insumo_id: '',
    numero_lote: '',
    cantidad: '',
    fecha_vencimiento: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validación simple de fecha
    const hoy = new Date().toISOString().split('T')[0];
    if (formData.fecha_vencimiento < hoy) {
      alert("⚠️ La fecha de vencimiento no puede ser anterior a hoy.");
      setLoading(false);
      return;
    }

    try {
      // Aseguramos que cantidad sea un número antes de enviar
      const dataAEnviar = {
        ...formData,
        cantidad: Number(formData.cantidad)
      };

      await registrarLoteService(dataAEnviar);
      
      alert("✅ Lote registrado e inventario actualizado");
      setFormData({ insumo_id: '', numero_lote: '', cantidad: '', fecha_vencimiento: '' });
      onLoteRegistrado(); 
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ marginTop: 0 }}>📥 Entrada de Mercancía (Nuevo Lote)</h3>
      <form onSubmit={handleSubmit}>
        <select 
          required 
          value={formData.insumo_id} 
          onChange={e => setFormData({...formData, insumo_id: e.target.value})}
          style={inputStyle}
          disabled={loading}
        >
          <option value="">Seleccione Insumo...</option>
          {insumos.map(i => (
            <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>
          ))}
        </select>

        <input 
          type="text" 
          placeholder="N° de Lote / Factura" 
          required 
          value={formData.numero_lote} 
          onChange={e => setFormData({...formData, numero_lote: e.target.value})}
          style={inputStyle}
          disabled={loading}
        />

        <input 
          type="number" 
          placeholder="Cantidad" 
          required 
          min="1"
          value={formData.cantidad} 
          onChange={e => setFormData({...formData, cantidad: e.target.value})}
          style={inputStyle}
          disabled={loading}
        />

        <label style={labelStyle}>Fecha de Vencimiento:</label>
        <input 
          type="date" 
          required 
          value={formData.fecha_vencimiento} 
          onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})}
          style={inputStyle}
          disabled={loading}
        />

        <button 
          type="submit" 
          style={{...btnSubmit, backgroundColor: loading ? '#6c757d' : '#28a745'}}
          disabled={loading}
        >
          {loading ? 'Procesando...' : 'Registrar Entrada'}
        </button>
      </form>
    </div>
  );
}

// Estilos adicionales para mantener el orden
const containerStyle = { 
  padding: '15px', 
  border: '1px solid #ddd', 
  borderRadius: '8px', 
  backgroundColor: '#fff', 
  marginBottom: '20px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
};

const labelStyle = { fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' };
const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const btnSubmit = { width: '100%', padding: '10px', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.3s' };