import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

function CoachDashboard({ token, userId }) {
    const [workoutPlans, setWorkoutPlans] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [workoutLogs, setWorkoutLogs] = useState({});
    const [trainees, setTrainees] = useState([]);
    const [selectedTrainee, setSelectedTrainee] = useState(null);
    const [showAddTrainee, setShowAddTrainee] = useState(false);
    const [traineeEmail, setTraineeEmail] = useState('');
    const [formData, setFormData] = useState({
        traineeId: '',
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

    // Exercise library states
    const [categories, setCategories] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [filteredExercises, setFilteredExercises] = useState([]);

    const addExercise = () => {
        setFormData({
            ...formData,
            exercises: [...formData.exercises, { ...newExercise }]
        });
        setNewExercise({
            name: '',
            sets: 3,
            reps: 10,
            targetWeight: 0,
            weightUnit: 'kg',
            notes: ''
        });
    };

    const removeExercise = (index) => {
        const updated = formData.exercises.filter((_, i) => i !== index);
        setFormData({ ...formData, exercises: updated });
    };

    const createWorkoutPlan = async (e) => {
        e.preventDefault();

        if (!formData.traineeId) {
            alert('Please select a trainee');
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/workout-plans`, {
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
            loadTrainees(); // Refresh the trainees list
        } catch (err) {
            console.error('Add trainee error:', err);
            alert('Error adding trainee: ' + (err.response?.data?.message || err.message));
        }
    };

    React.useEffect(() => {
        loadTrainees();
    }, []);

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
        loadExerciseData();
    }, []);

    const viewWorkoutDetails = async (plan) => {
        setSelectedWorkout(plan);

        // Si no hay exercises, inicializar como array vacío
        if (!plan.exercises) {
            plan.exercises = [];
        }

        // Load logs for each exercise
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

    const closeDetails = () => {
        setSelectedWorkout(null);
        setWorkoutLogs({});
    };

    return (
        <div className="dashboard">
            <h2>Coach Dashboard</h2>

            {selectedWorkout ? (
                <div className="workout-details">
                    <button onClick={closeDetails} className="btn-back">← Back to List</button>

                    <div className="workout-header">
                        <h3>{selectedWorkout.name}</h3>
                        <p className="workout-meta">
                            Status: <span className={`status-${selectedWorkout.status}`}>{selectedWorkout.status}</span> |
                            Scheduled: {selectedWorkout.scheduledDate}
                            {selectedWorkout.completedAt && ` | Completed: ${new Date(selectedWorkout.completedAt).toLocaleString()}`}
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
                        {selectedWorkout.exercises.map((exercise) => (
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

                    {showForm && (
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
                            </form>
                        </div>
                    )}

                    {workoutPlans.length > 0 && (
                        <div className="workout-plans">
                            <h3>Trainee's Workout Plans</h3>
                            {workoutPlans.map((plan) => (
                                <div key={plan.id} className="workout-card">
                                    <h4>{plan.name}</h4>
                                    <p>Status: <span className={`status-${plan.status}`}>{plan.status}</span></p>
                                    <p>Scheduled: {plan.scheduledDate}</p>
                                    <p>{plan.exercises?.length || 0} exercises</p>
                                    {plan.completedAt && <p>✓ Completed: {new Date(plan.completedAt).toLocaleString()}</p>}
                                    <button onClick={() => viewWorkoutDetails(plan)} className="btn-secondary">
                                        View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default CoachDashboard;