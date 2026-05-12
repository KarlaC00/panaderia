import { useState } from 'react';
import { registrarLoteService } from '../services/inventoryService';

export default function RegistrarLote({ insumos, onLoteRegistrado }) {
  const [formData, setFormData] = useState({
    insumo_id: '',
    numero_lote: '',
    cantidad: '',
    fecha_vencimiento: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registrarLoteService(formData);
      alert("✅ Lote registrado e inventario actualizado");
      setFormData({ insumo_id: '', numero_lote: '', cantidad: '', fecha_vencimiento: '' });
      onLoteRegistrado(); // Esta función refresca la lista de la página principal
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '20px' }}>
      <h3 style={{ marginTop: 0 }}>📥 Entrada de Mercancía (Nuevo Lote)</h3>
      <form onSubmit={handleSubmit}>
        <select 
          required 
          value={formData.insumo_id} 
          onChange={e => setFormData({...formData, insumo_id: e.target.value})}
          style={inputStyle}
        >
          <option value="">Seleccione Insumo...</option>
          {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
        </select>

        <input 
          type="text" placeholder="N° de Lote / Factura" required 
          value={formData.numero_lote} onChange={e => setFormData({...formData, numero_lote: e.target.value})}
          style={inputStyle}
        />

        <input 
          type="number" placeholder="Cantidad" required 
          value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})}
          style={inputStyle}
        />

        <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>Fecha de Vencimiento:</label>
        <input 
          type="date" required 
          value={formData.fecha_vencimiento} onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})}
          style={inputStyle}
        />

        <button type="submit" style={btnSubmit}>Registrar Entrada</button>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const btnSubmit = { width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };