import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

function Register({ onRegister, onToggle }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'trainee',
    sex: '',
    age: '',
    phone: '',
    gym: '',
    notes: ''
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Solo se permiten imágenes (JPEG, PNG, WEBP)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen debe ser menor a 5MB');
        return;
      }

      setProfilePic(file);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Use FormData for file upload
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('role', formData.role);
      data.append('sex', formData.sex);
      data.append('age', formData.age);
      data.append('phone', formData.phone);
      data.append('gym', formData.gym);
      data.append('notes', formData.notes);

      if (profilePic) {
        data.append('profilePic', profilePic);
      }

      const response = await axios.post(`${API_URL}/auth/register`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      onRegister(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '500px' }}>
        <h2>Crear Cuenta</h2>

        <form onSubmit={handleSubmit}>
          {/* Profile Picture Upload */}
          <div className="form-group">
            <label>Foto de Perfil (Opcional)</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ marginBottom: '0.5rem' }}
            />
            {profilePicPreview && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <img
                  src={profilePicPreview}
                  alt="Preview"
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #667eea'
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sexo</label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar...</option>
                <option value="Male">Hombre</option>
                <option value="Female">Mujer</option>
                <option value="Other">Otros</option>
              </select>
            </div>

            <div className="form-group">
              <label>Edad</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="25"
                min="1"
                max="120"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+58 412 123 1234"
            />
          </div>

          <div className="form-group">
            <label>Gimnasio Asociado</label>
            <input
              type="text"
              name="gym"
              value={formData.gym}
              onChange={handleChange}
              placeholder="Altitude, Bodyfit, etc."
            />
          </div>

          <div className="form-group">
            <label>Patologías / Notas</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Condiciones médicas, lesiones, metas, etc..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repetir contraseña"
              required
            />
          </div>

          <div className="form-group">
            <label>Soy:</label>
            <div className="role-selector">
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="trainee"
                  checked={formData.role === 'trainee'}
                  onChange={handleChange}
                />
                <span>Persona de Entrenamiento</span>
              </label>
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="coach"
                  checked={formData.role === 'coach'}
                  onChange={handleChange}
                />
                <span>Entrenador</span>
              </label>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <div className="auth-toggle">
          <p>¿Ya tienes una cuenta?</p>
          <button onClick={onToggle} className="btn-link">
            Inicia sesión aquí
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;
