import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { updateProfileService, changePasswordService } from '../services/authService';

export default function MiPerfil() {
  const { user, updateUser, logout } = useContext(AuthContext);
  const [perfilData, setPerfilData] = useState({
    nombre: user?.nombre || '',
    correo: user?.correo || '',
  });
  const [passData, setPassData] = useState({
    contrasenaActual: '',
    contrasenaNueva: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    setSavingProfile(true);
    try {
      const res = await updateProfileService(perfilData);
      updateUser({
        nombre: res?.usuario?.nombre ?? perfilData.nombre,
        correo: res?.usuario?.correo ?? perfilData.correo,
      });
      setMensaje({ texto: 'Perfil actualizado correctamente', tipo: 'success' });
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    setSavingPass(true);
    try {
      await changePasswordService(passData.contrasenaActual, passData.contrasenaNueva);
      setPassData({ contrasenaActual: '', contrasenaNueva: '' });
      setMensaje({ texto: 'Contraseña actualizada. Debes iniciar sesión nuevamente.', tipo: 'success' });
      await logout();
    } catch (err) {
      setMensaje({ texto: err.message, tipo: 'error' });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Actualiza tu nombre, correo y contraseña.
          </p>
        </div>

        {mensaje.texto && (
          <div className={[
            'rounded-xl px-4 py-3 text-sm border',
            mensaje.tipo === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700',
          ].join(' ')}>
            {mensaje.texto}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Datos personales</h2>
            <form onSubmit={handleUpdatePerfil} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={perfilData.nombre}
                  onChange={(e) => setPerfilData({ ...perfilData, nombre: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo</label>
                <input
                  type="email"
                  value={perfilData.correo}
                  onChange={(e) => setPerfilData({ ...perfilData, correo: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-[#FDBA74] text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
              >
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Cambiar contraseña</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña actual</label>
                <input
                  type="password"
                  value={passData.contrasenaActual}
                  onChange={(e) => setPassData({ ...passData, contrasenaActual: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nueva contraseña</label>
                <input
                  type="password"
                  value={passData.contrasenaNueva}
                  onChange={(e) => setPassData({ ...passData, contrasenaNueva: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingPass}
                className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
              >
                {savingPass ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}