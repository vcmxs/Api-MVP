import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';
import { API_URL, BASE_URL } from '../config/api';

function UserProfile({ userId, editable, onUpdate }) {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        sex: '',
        phone: '',
        gym: '',
        notes: ''
    });
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const [profilePicFile, setProfilePicFile] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [uploadingPic, setUploadingPic] = useState(false);

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const loadProfile = async () => {
        try {
            const response = await axios.get(`${API_URL}/users/${userId}/profile`);
            setProfile(response.data);
            setFormData({
                name: response.data.name || '',
                age: response.data.age || '',
                sex: response.data.sex || '',
                phone: response.data.phone || '',
                gym: response.data.gym || '',
                notes: response.data.notes || ''
            });
            setProfilePicUrl(response.data.profile_pic_url || '');
        } catch (err) {
            console.error('Load profile error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/users/${userId}/profile`, formData);
            alert('¡Perfil actualizado exitosamente!');
            setEditing(false);
            loadProfile();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Update profile error:', err);
            alert('Error al actualizar el perfil: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                alert('Solo se permiten imágenes (JPEG, PNG, WEBP)');
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen debe ser menor a 5MB');
                return;
            }

            setProfilePicFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfilePicUpload = async () => {
        if (!profilePicFile) {
            alert('Por favor selecciona una imagen primero');
            return;
        }

        setUploadingPic(true);

        try {
            const formData = new FormData();
            formData.append('profilePic', profilePicFile);

            await axios.put(`${API_URL}/users/${userId}/profile-picture`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('¡Foto de perfil actualizada!');
            setProfilePicFile(null);
            setProfilePicPreview(null);
            loadProfile();
        } catch (err) {
            console.error('Update profile picture error:', err);
            alert('Error al actualizar la foto de perfil');
        } finally {
            setUploadingPic(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('¿Estás SEGURO que quieres eliminar tu cuenta?\n\nEsta acción es irreversible. Se borrarán todos tus datos, entrenamientos y progreso.\n\nEscribe "borrar" para confirmar.')) {
            // Additional safety check prompt could be added here, but simplest is just confirm
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('No hay sesión activa');
                    return;
                }

                await axios.delete(`${API_URL}/users/${userId}/account`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                alert('Tu cuenta ha sido eliminada correctamente.');

                // Clear local storage and redirect
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                navigate('/login');

            } catch (err) {
                console.error('Delete account error:', err);
                alert('Error al eliminar la cuenta: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    if (!profile) {
        return <div>Cargando perfil...</div>;
    }

    return (
        <div className="user-profile">
            <div className="profile-header">
                <div className="profile-pic-container">
                    <img
                        src={profilePicPreview || (profilePicUrl ? `${BASE_URL}${profilePicUrl}` : 'https://via.placeholder.com/150')}
                        alt="Profile"
                        className="profile-pic"
                    />
                    {editable && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleProfilePicChange}
                                style={{ display: 'none' }}
                                id="profile-pic-input"
                            />
                            <label htmlFor="profile-pic-input" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block', marginBottom: '0.5rem' }}>
                                Seleccionar Imagen
                            </label>
                            {profilePicFile && (
                                <button
                                    onClick={handleProfilePicUpload}
                                    className="btn-primary"
                                    disabled={uploadingPic}
                                    style={{ marginLeft: '0.5rem' }}
                                >
                                    {uploadingPic ? 'Subiendo...' : 'Subir'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="profile-info">
                    <h2>{profile.name}</h2>
                    <p className="profile-role">{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</p>
                    <p className="profile-email">{profile.email}</p>
                </div>
            </div>

            {editing ? (
                <form onSubmit={handleSubmit} className="profile-form">
                    <h3>Editar Perfil</h3>

                    <div className="form-group">
                        <label>Nombre</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Edad</label>
                            <input
                                type="number"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Sexo</label>
                            <select
                                value={formData.sex}
                                onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                className="form-input"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="Male">Hombre</option>
                                <option value="Female">Mujer</option>
                                <option value="Other">Otros</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Teléfono</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="form-input"
                            placeholder="+1234567890"
                        />
                    </div>

                    <div className="form-group">
                        <label>Gimnasio</label>
                        <input
                            type="text"
                            value={formData.gym}
                            onChange={(e) => setFormData({ ...formData, gym: e.target.value })}
                            className="form-input"
                            placeholder="Gold's Gym"
                        />
                    </div>

                    <div className="form-group">
                        <label>Notas (Problemas de salud, lesiones, restricciones dietéticas, etc.)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="form-input"
                            rows="4"
                            placeholder="Cualquier información de salud importante..."
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary">Guardar Cambios</button>
                        <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
                    </div>
                </form>
            ) : (
                <div className="profile-details">
                    <h3>Detalles del Perfil</h3>

                    <div className="detail-row">
                        <strong>Edad:</strong>
                        <span>{profile.age || 'No especificado'}</span>
                    </div>

                    <div className="detail-row">
                        <strong>Sexo:</strong>
                        <span>{profile.sex || 'No especificado'}</span>
                    </div>

                    <div className="detail-row">
                        <strong>Teléfono:</strong>
                        <span>{profile.phone || 'No especificado'}</span>
                    </div>

                    <div className="detail-row">
                        <strong>Gimnasio:</strong>
                        <span>{profile.gym || 'No especificado'}</span>
                    </div>

                    {profile.notes && (
                        <div className="detail-row">
                            <strong>Notas:</strong>
                            <p className="profile-notes">{profile.notes}</p>
                        </div>
                    )}

                    {editable && (
                        <>
                            <button onClick={() => setEditing(true)} className="btn-primary" style={{ marginTop: '1rem', marginRight: '1rem' }}>
                                Editar Perfil
                            </button>

                            <hr style={{ margin: '2rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

                            <div className="danger-zone" style={{ padding: '1rem', border: '1px solid rgba(255, 71, 87, 0.3)', borderRadius: '8px', background: 'rgba(255, 71, 87, 0.05)' }}>
                                <h4 style={{ color: '#ff4757', marginTop: 0 }}>Zona de Peligro</h4>
                                <p style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                    Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor asegúrate.
                                </p>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="btn-danger"
                                    style={{
                                        backgroundColor: '#ff4757',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        marginTop: '0.5rem'
                                    }}
                                >
                                    Eliminar Cuenta
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default UserProfile;
