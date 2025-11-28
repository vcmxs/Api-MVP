import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

function CoachDashboard({ token, userId }) {
    // Tab state
    const [activeTab, setActiveTab] = useState('customers');

    // Customer workouts state
    const [workoutPlans, setWorkoutPlans] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [workoutLogs, setWorkoutLogs] = useState({});
    const [trainees, setTrainees] = useState([]);
    const [selectedTrainee, setSelectedTrainee] = useState(null);
    const [showAddTrainee, setShowAddTrainee] = useState(false);
    const [traineeEmail, setTraineeEmail] = useState('');

    // Personal workouts state
    const [personalWorkouts, setPersonalWorkouts] = useState([]);
    const [showPersonalForm, setShowPersonalForm] = useState(false);
    const [selectedPersonalWorkout, setSelectedPersonalWorkout] = useState(null);
    const [personalWorkoutLogs, setPersonalWorkoutLogs] = useState({});

    // Exercise library state
    const [categories, setCategories] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [filteredExercises, setFilteredExercises] = useState([]);

    // Template state
    const [templates, setTemplates] = useState([]);

    const [formData, setFormData] = useState({
        traineeId: '',
        name: '',
        description: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        exercises: []
    });

    const [personalFormData, setPersonalFormData] = useState({
        name: '',
        description: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        exercises: []
    });

    const [newExercise, setNewExercise] = useState({
        name: '',
        sets: 3,
        reps: 10,
        targetWeight: 0,
        weightUnit: 'kg',
        notes: ''
    });

    // Edit workout state
    const [editingWorkout, setEditingWorkout] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        description: '',
        scheduledDate: '',
        exercises: []
    });

    const addExercise = () => {
        if (activeTab === 'customers') {
            setFormData({
                ...formData,
                exercises: [...formData.exercises, { ...newExercise }]
            });
        } else {
            setPersonalFormData({
                ...personalFormData,
                exercises: [...personalFormData.exercises, { ...newExercise }]
            });
        }
        setNewExercise({
            name: '',
            sets: 3,
            reps: 10,
            targetWeight: 0,
            weightUnit: 'kg',
            notes: ''
        });
        setSelectedCategory('');
    };

    const removeExercise = (index) => {
        if (activeTab === 'customers') {
            const updated = formData.exercises.filter((_, i) => i !== index);
            setFormData({ ...formData, exercises: updated });
        } else {
            const updated = personalFormData.exercises.filter((_, i) => i !== index);
            setPersonalFormData({ ...personalFormData, exercises: updated });
        }
    };

    const createWorkoutPlan = async (e) => {
        e.preventDefault();

        if (!formData.traineeId) {
            alert('Please select a trainee');
            return;
        }

        try {
            await axios.post(`${API_URL}/workout-plans`, {
                traineeId: formData.traineeId,
                coachId: userId,
                name: formData.name,
                description: formData.description,
                scheduledDate: formData.scheduledDate,
                exercises: formData.exercises
            });
            alert('Workout plan created successfully!');
            setShowForm(false);
            setFormData({
                traineeId: '',
                name: '',
                description: '',
                scheduledDate: new Date().toISOString().split('T')[0],
                exercises: []
            });
            if (selectedTrainee) {
                loadTraineeWorkouts(selectedTrainee);
            }
        } catch (err) {
            console.error('Full error:', err.response?.data);
            alert('Error creating workout plan: ' + (err.response?.data?.message || err.message));
        }
    };

    const createPersonalWorkout = async (e) => {
        e.preventDefault();

        try {
            await axios.post(`${API_URL}/workout-plans`, {
                traineeId: userId,
                coachId: userId,
                name: personalFormData.name,
                description: personalFormData.description,
                scheduledDate: personalFormData.scheduledDate,
                exercises: personalFormData.exercises
            });
            alert('Personal workout created successfully!');
            setShowPersonalForm(false);
            setPersonalFormData({
                name: '',
                description: '',
                scheduledDate: new Date().toISOString().split('T')[0],
                exercises: []
            });
            loadPersonalWorkouts();
        } catch (err) {
            console.error('Full error:', err.response?.data);
            alert('Error creating personal workout: ' + (err.response?.data?.message || err.message));
        }
    };

    const loadTrainees = async () => {
        try {
            const response = await axios.get(`${API_URL}/coaches/${userId}/trainees`);
            setTrainees(response.data.trainees || []);
        } catch (err) {
            console.error('Error loading trainees:', err);
        }
    };

    const loadTraineeWorkouts = async (traineeId) => {
        if (!traineeId) return;

        try {
            const response = await axios.get(`${API_URL}/trainees/${traineeId}/workout-plans?coachId=${userId}`);
            setWorkoutPlans(response.data.workoutPlans);
            setSelectedTrainee(traineeId);
        } catch (err) {
            alert('Error loading workouts: ' + err.message);
        }
    };

    const loadPersonalWorkouts = async () => {
        try {
            const response = await axios.get(`${API_URL}/trainees/${userId}/workout-plans`);
            setPersonalWorkouts(response.data.workoutPlans);
        } catch (err) {
            console.error('Error loading personal workouts:', err);
        }
    };

    const addTrainee = async (e) => {
        e.preventDefault();

        if (!traineeEmail.trim()) {
            alert('Please enter a trainee email');
            return;
        }

        try {
            await axios.post(`${API_URL}/coaches/${userId}/trainees`, {
                email: traineeEmail
            });
            alert('Trainee added successfully!');
            setTraineeEmail('');
            setShowAddTrainee(false);
            loadTrainees();
        } catch (err) {
            console.error('Add trainee error:', err);
            alert('Error adding trainee: ' + (err.response?.data?.message || err.message));
        }
    };

    const deleteWorkout = async (workoutId) => {
        if (!window.confirm('Are you sure you want to delete this completed workout?')) {
            return;
        }
        try {
            await axios.delete(`${API_URL}/workout-plans/${workoutId}`);
            alert('Workout deleted successfully!');
            if (selectedTrainee) {
                loadTraineeWorkouts(selectedTrainee);
            }
        } catch (err) {
            console.error('Delete workout error:', err);
            alert('Error deleting workout: ' + (err.response?.data?.message || err.message));
        }
    };

    const deletePersonalWorkout = async (workoutId) => {
        if (!window.confirm('Are you sure you want to delete this completed workout?')) {
            return;
        }
        try {
            await axios.delete(`${API_URL}/workout-plans/${workoutId}`);
            alert('Workout deleted successfully!');
            loadPersonalWorkouts();
        } catch (err) {
            console.error('Delete workout error:', err);
            alert('Error deleting workout: ' + (err.response?.data?.message || err.message));
        }
    };

    // Start editing a workout
    const startEditWorkout = (plan) => {
        setEditingWorkout(plan);
        setEditFormData({
            name: plan.name,
            description: plan.description || '',
            scheduledDate: plan.scheduledDate,
            exercises: [...(plan.exercises || [])]
        });
        setShowForm(false);
    };

    // Update workout details
    const updateWorkoutDetails = async () => {
        try {
            await axios.put(`${API_URL}/workout-plans/${editingWorkout.id}`, {
                name: editFormData.name,
                description: editFormData.description,
                scheduledDate: editFormData.scheduledDate
            });
            alert('Workout updated successfully!');
            if (selectedTrainee) {
                loadTraineeWorkouts(selectedTrainee);
            }
            setEditingWorkout(null);
        } catch (err) {
            console.error('Update workout error:', err);
            alert('Error updating workout: ' + (err.response?.data?.message || err.message));
        }
    };

    // Add exercise to existing workout
    const addExerciseToWorkout = async () => {
        if (!newExercise.name) {
            alert('Please select an exercise');
            return;
        }

        try {
            await axios.post(`${API_URL}/workout-plans/${editingWorkout.id}/exercises`, {
                exercises: [newExercise]
            });

            const response = await axios.get(`${API_URL}/trainees/${selectedTrainee}/workout-plans?coachId=${userId}`);
            const updatedPlan = response.data.workoutPlans.find(p => p.id === editingWorkout.id);

            setEditFormData({
                ...editFormData,
                exercises: updatedPlan.exercises || []
            });
            setEditingWorkout(updatedPlan);

            setNewExercise({
                name: '',
                sets: 3,
                reps: 10,
                targetWeight: 0,
                weightUnit: 'kg',
                notes: ''
            });
            setSelectedCategory('');

            alert('Exercise added successfully!');
        } catch (err) {
            console.error('Add exercise error:', err);
            alert('Error adding exercise: ' + (err.response?.data?.message || err.message));
        }
    };

    // Remove exercise from workout
    const removeExerciseFromWorkout = async (exerciseId) => {
        if (!window.confirm('Are you sure you want to remove this exercise?')) return;

        try {
            await axios.delete(`${API_URL}/workout-plans/${editingWorkout.id}/exercises/${exerciseId}`);

            const updatedExercises = editFormData.exercises.filter(ex => ex.id !== exerciseId);
            setEditFormData({
                ...editFormData,
                exercises: updatedExercises
            });

            alert('Exercise removed successfully!');
        } catch (err) {
            console.error('Remove exercise error:', err);
            alert('Error removing exercise: ' + (err.response?.data?.message || err.message));
        }
    };

    const cancelEdit = () => {
        setEditingWorkout(null);
        setEditFormData({
            name: '',
            description: '',
            scheduledDate: '',
            exercises: []
        });
    };

    // Load templates
    const loadTemplates = async () => {
        try {
            const response = await axios.get(`${API_URL}/users/${userId}/workout-templates`);
            setTemplates(response.data.templates);
        } catch (err) {
            console.error('Load templates error:', err);
        }
    };

    // Save as template
    const saveAsTemplate = async () => {
        const data = activeTab === 'customers' ? formData : personalFormData;

        if (!data.name || data.exercises.length === 0) {
            alert('Please add a name and at least one exercise');
            return;
        }

        try {
            await axios.post(`${API_URL}/workout-templates`, {
                userId,
                name: data.name,
                description: data.description,
                exercises: data.exercises
            });
            alert('Template saved successfully!');
            loadTemplates();
        } catch (err) {
            console.error('Save template error:', err);
            alert('Error saving template: ' + (err.response?.data?.message || err.message));
        }
    };

    // Load template
    const loadTemplate = (template) => {
        if (activeTab === 'customers') {
            setFormData({
                ...formData,
                name: template.name,
                description: template.description,
                exercises: [...template.exercises]
            });
        } else {
            setPersonalFormData({
                ...personalFormData,
                name: template.name,
                description: template.description,
                exercises: [...template.exercises]
            });
        }
        alert('Template loaded! You can now modify and create the workout.');
    };

    // Delete template
    const deleteTemplate = async (templateId) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;

        try {
            await axios.delete(`${API_URL}/workout-templates/${templateId}`);
            alert('Template deleted successfully!');
            loadTemplates();
        } catch (err) {
            console.error('Delete template error:', err);
            alert('Error deleting template: ' + (err.response?.data?.message || err.message));
        }
    };

    // Load exercise library data
    const loadExerciseData = async () => {
        try {
            const [categoriesRes, exercisesRes] = await Promise.all([
                axios.get(`${API_URL}/exercises/categories`),
                axios.get(`${API_URL}/exercises`)
            ]);
            setCategories(categoriesRes.data.categories);
            setExercises(exercisesRes.data.exercises);
        } catch (err) {
            console.error('Error loading exercise data:', err);
        }
    };

    // Filter exercises when category changes
    React.useEffect(() => {
        if (selectedCategory) {
            const filtered = exercises.filter(ex => ex.muscle_category === selectedCategory);
            setFilteredExercises(filtered);
        } else {
            setFilteredExercises([]);
        }
    }, [selectedCategory, exercises]);

    React.useEffect(() => {
        loadTrainees();
        loadPersonalWorkouts();
        loadTemplates();
        loadExerciseData();
    }, []);

    const viewWorkoutDetails = async (plan) => {
        setSelectedWorkout(plan);

        // Safety check for exercises
        if (!plan.exercises) {
            plan.exercises = [];
        }

        const logs = {};
        for (const exercise of plan.exercises) {
            try {
                const response = await axios.get(
                    `${API_URL}/workout-plans/${plan.id}/exercises/${exercise.id}/logs`
                );
                logs[exercise.id] = response.data.logs;
            } catch (err) {
                console.error('Error loading logs for exercise:', err);
                logs[exercise.id] = [];
            }
        }
        setWorkoutLogs(logs);
    };

    const viewPersonalWorkoutDetails = async (plan) => {
        setSelectedPersonalWorkout(plan);

        // Safety check for exercises
        if (!plan.exercises) {
            plan.exercises = [];
        }

        const logs = {};
        for (const exercise of plan.exercises) {
            try {
                const response = await axios.get(
                    `${API_URL}/workout-plans/${plan.id}/exercises/${exercise.id}/logs`
                );
                logs[exercise.id] = response.data.logs;
            } catch (err) {
                console.error('Error loading logs for exercise:', err);
                logs[exercise.id] = [];
            }
        }
        setPersonalWorkoutLogs(logs);
    };

    const closeDetails = () => {
        setSelectedWorkout(null);
        setWorkoutLogs({});
    };

    const closePersonalDetails = () => {
        setSelectedPersonalWorkout(null);
        setPersonalWorkoutLogs({});
    };

    // Helper function to format dates
    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };

        if (includeTime) {
            options.hour = 'numeric';
            options.minute = '2-digit';
            options.hour12 = true;
        }

        return date.toLocaleString('en-US', options).replace(',', ' at');
    };

    return (
        <div className="dashboard">
            <h2>Coach Dashboard</h2>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                >
                    Manage Customer Routines
                </button>
                <button
                    className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('personal')}
                >
                    My Personal Workouts
                </button>
                <button
                    className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    📋 My Templates
                </button>
            </div>

            {/* Customer Routines Tab */}
            {activeTab === 'customers' && (
                <>
                    {selectedWorkout ? (
                        <div className="workout-details">
                            <button onClick={closeDetails} className="btn-back">← Back to List</button>

                            <div className="workout-header">
                                <h3>{selectedWorkout.name}</h3>
                                <p className="workout-meta">
                                    Status: <span className={`status-${selectedWorkout.status}`}>{selectedWorkout.status}</span> |
                                    Scheduled: {formatDate(selectedWorkout.scheduledDate)}
                                    {selectedWorkout.completedAt && ` | Completed: ${formatDate(selectedWorkout.completedAt, true)}`}
                                </p>
                                {selectedWorkout.overallNotes && (
                                    <div className="overall-notes">
                                        <strong>Trainee's Overall Notes:</strong> {selectedWorkout.overallNotes}
                                    </div>
                                )}
                                {selectedWorkout.rating && (
                                    <div className="workout-rating">
                                        <strong>Rating:</strong> {'⭐'.repeat(selectedWorkout.rating)}
                                    </div>
                                )}
                            </div>

                            <div className="exercises-details">
                                {(selectedWorkout.exercises || []).map((exercise) => (
                                    <div key={exercise.id} className="exercise-detail-card">
                                        <h4>{exercise.name}</h4>
                                        <p className="exercise-target">
                                            Target: {exercise.sets} sets × {exercise.reps} reps @ {exercise.targetWeight}{exercise.weightUnit}
                                        </p>
                                        {exercise.notes && <p className="exercise-notes">Coach notes: {exercise.notes}</p>}

                                        <div className="logs-section">
                                            <h5>Performance Log:</h5>
                                            {workoutLogs[exercise.id] && workoutLogs[exercise.id].length > 0 ? (
                                                <table className="logs-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Set</th>
                                                            <th>Reps</th>
                                                            <th>Weight</th>
                                                            <th>Notes</th>
                                                            <th>Time</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {workoutLogs[exercise.id].map((log) => (
                                                            <tr key={log.id}>
                                                                <td>{log.setNumber}</td>
                                                                <td>{log.repsCompleted}</td>
                                                                <td>{log.weightUsed}{log.weightUnit}</td>
                                                                <td>{log.notes || '-'}</td>
                                                                <td>{new Date(log.completedAt).toLocaleTimeString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="no-logs">No performance data logged yet</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="dashboard-actions">
                                <button onClick={() => {
                                    setShowForm(!showForm);
                                    if (!showForm && selectedTrainee) {
                                        setFormData({ ...formData, traineeId: selectedTrainee });
                                    }
                                }} className="btn-primary">
                                    {showForm ? 'Cancel' : 'Create Workout Plan'}
                                </button>

                                <button onClick={() => setShowAddTrainee(!showAddTrainee)} className="btn-secondary">
                                    {showAddTrainee ? 'Cancel' : 'Add Trainee'}
                                </button>

                                <div className="trainee-selector">
                                    <label>Select Trainee:</label>
                                    <select
                                        value={selectedTrainee || ''}
                                        onChange={(e) => loadTraineeWorkouts(e.target.value)}
                                        className="trainee-dropdown"
                                    >
                                        <option value="">-- Select a trainee --</option>
                                        {trainees.map((trainee) => (
                                            <option key={trainee.id} value={trainee.id}>
                                                {trainee.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {showAddTrainee && (
                                <div className="add-trainee-form">
                                    <h3>Add Trainee</h3>
                                    <form onSubmit={addTrainee}>
                                        <div className="form-group">
                                            <label>Trainee Email</label>
                                            <input
                                                type="email"
                                                value={traineeEmail}
                                                onChange={(e) => setTraineeEmail(e.target.value)}
                                                placeholder="Enter trainee's email address"
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn-primary">
                                            Add Trainee
                                        </button>
                                    </form>
                                </div>
                            )}

                            {showForm && !editingWorkout && (
                                <div className="workout-form">
                                    <h3>Create New Workout Plan</h3>
                                    <form onSubmit={createWorkoutPlan}>
                                        <div className="form-group">
                                            <label>Assign to Trainee</label>
                                            <select
                                                value={formData.traineeId}
                                                onChange={(e) => setFormData({ ...formData, traineeId: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Select trainee --</option>
                                                {trainees.map((trainee) => (
                                                    <option key={trainee.id} value={trainee.id}>
                                                        {trainee.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Workout Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g., Chest Day"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Description</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Optional description"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Scheduled Date</label>
                                            <input
                                                type="date"
                                                value={formData.scheduledDate}
                                                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="exercises-section">
                                            <h4>Exercises</h4>

                                            <div className="exercise-input">
                                                <select
                                                    value={selectedCategory}
                                                    onChange={(e) => {
                                                        setSelectedCategory(e.target.value);
                                                        setNewExercise({ ...newExercise, name: '' });
                                                    }}
                                                    className="form-input"
                                                >
                                                    <option value="">Select muscle category...</option>
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>

                                                <select
                                                    value={newExercise.name}
                                                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                                                    disabled={!selectedCategory}
                                                    className="form-input"
                                                >
                                                    <option value="">Select exercise...</option>
                                                    {filteredExercises.map(ex => (
                                                        <option key={ex.id} value={ex.name}>{ex.name}</option>
                                                    ))}
                                                </select>

                                                <input
                                                    type="number"
                                                    placeholder="Sets"
                                                    value={newExercise.sets}
                                                    onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) })}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Reps"
                                                    value={newExercise.reps}
                                                    onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value) })}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Weight"
                                                    value={newExercise.targetWeight}
                                                    onChange={(e) => setNewExercise({ ...newExercise, targetWeight: parseInt(e.target.value) })}
                                                />
                                                <button type="button" onClick={addExercise} className="btn-add">
                                                    Add
                                                </button>
                                            </div>

                                            <div className="exercise-list">
                                                {formData.exercises.map((ex, index) => (
                                                    <div key={index} className="exercise-item">
                                                        <span>{ex.name} - {ex.sets}x{ex.reps} @ {ex.targetWeight}{ex.weightUnit}</span>
                                                        <button type="button" onClick={() => removeExercise(index)} className="btn-remove">
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button type="submit" className="btn-primary" disabled={formData.exercises.length === 0}>
                                            Create Workout Plan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={saveAsTemplate}
                                            className="btn-secondary"
                                            style={{ marginLeft: '0.5rem' }}
                                            disabled={formData.exercises.length === 0}
                                        >
                                            💾 Save as Template
                                        </button>
                                    </form>
                                </div>
                            )}

                            {editingWorkout && (
                                <div className="workout-form">
                                    <h3>Edit Workout Plan</h3>
                                    <div className="form-group">
                                        <label>Workout Name</label>
                                        <input
                                            type="text"
                                            value={editFormData.name}
                                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                            placeholder="e.g., Chest Day"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea
                                            value={editFormData.description}
                                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                            placeholder="Optional description"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Scheduled Date</label>
                                        <input
                                            type="date"
                                            value={editFormData.scheduledDate}
                                            onChange={(e) => setEditFormData({ ...editFormData, scheduledDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="exercises-section">
                                        <h4>Current Exercises</h4>
                                        <div className="exercise-list">
                                            {(editFormData.exercises || []).map((ex) => (
                                                <div key={ex.id} className="exercise-item">
                                                    <span>{ex.name} - {ex.sets}x{ex.reps} @ {ex.targetWeight}{ex.weightUnit}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExerciseFromWorkout(ex.id)}
                                                        className="btn-remove"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <h4 style={{ marginTop: '1.5rem' }}>Add New Exercise</h4>
                                        <div className="exercise-input">
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => {
                                                    setSelectedCategory(e.target.value);
                                                    setNewExercise({ ...newExercise, name: '' });
                                                }}
                                                className="form-input"
                                            >
                                                <option value="">Select muscle category...</option>
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={newExercise.name}
                                                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                                                disabled={!selectedCategory}
                                                className="form-input"
                                            >
                                                <option value="">Select exercise...</option>
                                                {filteredExercises.map(ex => (
                                                    <option key={ex.id} value={ex.name}>{ex.name}</option>
                                                ))}
                                            </select>

                                            <input
                                                type="number"
                                                placeholder="Sets"
                                                value={newExercise.sets}
                                                onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) })}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Reps"
                                                value={newExercise.reps}
                                                onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value) })}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Weight"
                                                value={newExercise.targetWeight}
                                                onChange={(e) => setNewExercise({ ...newExercise, targetWeight: parseInt(e.target.value) })}
                                            />
                                            <button type="button" onClick={addExerciseToWorkout} className="btn-add">
                                                Add Exercise
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                        <button onClick={updateWorkoutDetails} className="btn-primary">
                                            Save Changes
                                        </button>
                                        <button onClick={cancelEdit} className="btn-secondary">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {workoutPlans.length > 0 && (
                                <div className="workout-plans">
                                    <h3>Trainee's Workout Plans</h3>
                                    {workoutPlans.map((plan) => (
                                        <div key={plan.id} className="workout-card">
                                            <h4>{plan.name}</h4>
                                            <p>Status: <span className={`status-${plan.status}`}>{plan.status}</span></p>
                                            <p>Scheduled: {formatDate(plan.scheduledDate)}</p>
                                            <p>{(plan.exercises || []).length} exercises</p>
                                            {plan.completedAt && <p>✓ Completed: {formatDate(plan.completedAt, true)}</p>}
                                            <button onClick={() => viewWorkoutDetails(plan)} className="btn-secondary">
                                                View Details
                                            </button>
                                            {(plan.status === 'assigned' || true) && (
                                                <button
                                                    onClick={() => startEditWorkout(plan)}
                                                    className="btn-secondary"
                                                    style={{ marginLeft: '0.5rem' }}
                                                >
                                                    ✏️ Edit
                                                </button>
                                            )}
                                            {plan.status === 'completed' && (
                                                <button
                                                    onClick={() => deleteWorkout(plan.id)}
                                                    className="btn-danger"
                                                    style={{ marginLeft: '0.5rem' }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Personal Workouts Tab */}
            {activeTab === 'personal' && (
                <>
                    {selectedPersonalWorkout ? (
                        <div className="workout-details">
                            <button onClick={closePersonalDetails} className="btn-back">← Back to List</button>

                            <div className="workout-header">
                                <h3>{selectedPersonalWorkout.name}</h3>
                                <p className="workout-meta">
                                    Status: <span className={`status-${selectedPersonalWorkout.status}`}>{selectedPersonalWorkout.status}</span> |
                                    Scheduled: {formatDate(selectedPersonalWorkout.scheduledDate)}
                                    {selectedPersonalWorkout.completedAt && ` | Completed: ${formatDate(selectedPersonalWorkout.completedAt, true)}`}
                                </p>
                            </div>

                            <div className="exercises-details">
                                {(selectedPersonalWorkout.exercises || []).map((exercise) => (
                                    <div key={exercise.id} className="exercise-detail-card">
                                        <h4>{exercise.name}</h4>
                                        <p className="exercise-target">
                                            Target: {exercise.sets} sets × {exercise.reps} reps @ {exercise.targetWeight}{exercise.weightUnit}
                                        </p>
                                        {exercise.notes && <p className="exercise-notes">Notes: {exercise.notes}</p>}

                                        <div className="logs-section">
                                            <h5>Performance Log:</h5>
                                            {personalWorkoutLogs[exercise.id] && personalWorkoutLogs[exercise.id].length > 0 ? (
                                                <table className="logs-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Set</th>
                                                            <th>Reps</th>
                                                            <th>Weight</th>
                                                            <th>Notes</th>
                                                            <th>Time</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {personalWorkoutLogs[exercise.id].map((log) => (
                                                            <tr key={log.id}>
                                                                <td>{log.setNumber}</td>
                                                                <td>{log.repsCompleted}</td>
                                                                <td>{log.weightUsed}{log.weightUnit}</td>
                                                                <td>{log.notes || '-'}</td>
                                                                <td>{new Date(log.completedAt).toLocaleTimeString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="no-logs">No performance data logged yet</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="dashboard-actions">
                                <button onClick={() => setShowPersonalForm(!showPersonalForm)} className="btn-primary">
                                    {showPersonalForm ? 'Cancel' : 'Create Personal Workout'}
                                </button>
                            </div>

                            {showPersonalForm && (
                                <div className="workout-form">
                                    <h3>Create Personal Workout</h3>
                                    <form onSubmit={createPersonalWorkout}>
                                        <div className="form-group">
                                            <label>Workout Name</label>
                                            <input
                                                type="text"
                                                value={personalFormData.name}
                                                onChange={(e) => setPersonalFormData({ ...personalFormData, name: e.target.value })}
                                                placeholder="e.g., Leg Day"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Description</label>
                                            <textarea
                                                value={personalFormData.description}
                                                onChange={(e) => setPersonalFormData({ ...personalFormData, description: e.target.value })}
                                                placeholder="Optional description"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Scheduled Date</label>
                                            <input
                                                type="date"
                                                value={personalFormData.scheduledDate}
                                                onChange={(e) => setPersonalFormData({ ...personalFormData, scheduledDate: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="exercises-section">
                                            <h4>Exercises</h4>

                                            <div className="exercise-input">
                                                <select
                                                    value={selectedCategory}
                                                    onChange={(e) => {
                                                        setSelectedCategory(e.target.value);
                                                        setNewExercise({ ...newExercise, name: '' });
                                                    }}
                                                    className="form-input"
                                                >
                                                    <option value="">Select muscle category...</option>
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>

                                                <select
                                                    value={newExercise.name}
                                                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                                                    disabled={!selectedCategory}
                                                    className="form-input"
                                                >
                                                    <option value="">Select exercise...</option>
                                                    {filteredExercises.map(ex => (
                                                        <option key={ex.id} value={ex.name}>{ex.name}</option>
                                                    ))}
                                                </select>

                                                <input
                                                    type="number"
                                                    placeholder="Sets"
                                                    value={newExercise.sets}
                                                    onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) })}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Reps"
                                                    value={newExercise.reps}
                                                    onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value) })}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Weight"
                                                    value={newExercise.targetWeight}
                                                    onChange={(e) => setNewExercise({ ...newExercise, targetWeight: parseInt(e.target.value) })}
                                                />
                                                <button type="button" onClick={addExercise} className="btn-add">
                                                    Add
                                                </button>
                                            </div>

                                            <div className="exercise-list">
                                                {personalFormData.exercises.map((ex, index) => (
                                                    <div key={index} className="exercise-item">
                                                        <span>{ex.name} - {ex.sets}x{ex.reps} @ {ex.targetWeight}{ex.weightUnit}</span>
                                                        <button type="button" onClick={() => removeExercise(index)} className="btn-remove">
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button type="submit" className="btn-primary" disabled={personalFormData.exercises.length === 0}>
                                            Create Personal Workout
                                        </button>
                                        <button
                                            type="button"
                                            onClick={saveAsTemplate}
                                            className="btn-secondary"
                                            style={{ marginLeft: '0.5rem' }}
                                            disabled={personalFormData.exercises.length === 0}
                                        >
                                            💾 Save as Template
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div className="workout-plans">
                                <h3>My Personal Workouts</h3>
                                {personalWorkouts.length === 0 ? (
                                    <p>No personal workouts created yet.</p>
                                ) : (
                                    personalWorkouts.map((plan) => (
                                        <div key={plan.id} className="workout-card">
                                            <h4>{plan.name}</h4>
                                            <p>Status: <span className={`status-${plan.status}`}>{plan.status}</span></p>
                                            <p>Scheduled: {formatDate(plan.scheduledDate)}</p>
                                            <p>{(plan.exercises || []).length} exercises</p>
                                            {plan.completedAt && <p>✓ Completed: {formatDate(plan.completedAt, true)}</p>}

                                            <button onClick={() => viewPersonalWorkoutDetails(plan)} className="btn-secondary">
                                                View Details
                                            </button>
                                            {plan.status === 'completed' && (
                                                <button
                                                    onClick={() => deletePersonalWorkout(plan.id)}
                                                    className="btn-danger"
                                                    style={{ marginLeft: '0.5rem' }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="templates-section">
                    <h2>My Workout Templates</h2>
                    <p>Save and reuse your favorite workout configurations</p>

                    {templates.length === 0 ? (
                        <p>No templates yet. Create a workout and click "Save as Template" to get started!</p>
                    ) : (
                        <div className="templates-list">
                            {templates.map((template) => (
                                <div key={template.id} className="template-card">
                                    <h3>{template.name}</h3>
                                    {template.description && <p>{template.description}</p>}
                                    <p className="template-info">
                                        {template.exercises.length} exercises
                                    </p>
                                    <div className="template-exercises">
                                        {template.exercises.map((ex, idx) => (
                                            <span key={idx} className="exercise-tag">
                                                {ex.name}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="template-actions">
                                        <button
                                            onClick={() => loadTemplate(template)}
                                            className="btn-primary"
                                        >
                                            Use Template
                                        </button>
                                        <button
                                            onClick={() => deleteTemplate(template.id)}
                                            className="btn-danger"
                                            style={{ marginLeft: '0.5rem' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CoachDashboard;
