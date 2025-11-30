import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserProfile from './UserProfile';
import ProgressionChart from './ProgressionChart';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

// Helper component for Set Row
const SetRow = ({ setNum, log, isCompleted, targetWeight, targetReps, onLog, onDelete }) => {
  const [weightInput, setWeightInput] = useState(log ? log.weightUsed : targetWeight);
  const [repsInput, setRepsInput] = useState(log ? log.repsCompleted : targetReps);

  useEffect(() => {
    if (log) {
      setWeightInput(log.weightUsed);
      setRepsInput(log.repsCompleted);
    }
  }, [log]);

  return (
    <div className="set-row" style={{
      display: 'grid',
      gridTemplateColumns: '0.5fr 1fr 1fr 1fr 0.5fr',
      gap: '1rem',
      marginBottom: '0.8rem',
      alignItems: 'center',
      padding: '1rem',
      borderRadius: '12px',
      border: isCompleted ? '1px solid var(--success)' : '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--light)', fontSize: '1.1rem' }}>{setNum}</div>
      <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: '0.9rem' }}>
        {targetWeight}kg x {targetReps}
      </div>
      <div>
        <input
          type="number"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          style={{
            width: '100%',
            textAlign: 'center',
            padding: '0.8rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: 'var(--light)',
            fontSize: '1.1rem'
          }}
          disabled={isCompleted}
        />
      </div>
      <div>
        <input
          type="number"
          value={repsInput}
          onChange={(e) => setRepsInput(e.target.value)}
          style={{
            width: '100%',
            textAlign: 'center',
            padding: '0.8rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: 'var(--light)',
            fontSize: '1.1rem'
          }}
          disabled={isCompleted}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => isCompleted ? onDelete(log.id) : onLog(setNum, weightInput, repsInput)}
          style={{
            background: isCompleted ? 'var(--success)' : 'rgba(255, 255, 255, 0.05)',
            color: isCompleted ? 'var(--dark)' : 'var(--gray)',
            border: isCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            fontSize: '1.2rem'
          }}
          title={isCompleted ? "Undo" : "Log Set"}
        >
          ✓
        </button>
      </div>
    </div>
  );
};

// Active Workout View Component
const ActiveWorkoutView = ({
  activeWorkout,
  currentExerciseIndex,
  workoutLogs,
  timer,
  onExit,
  onNext,
  onPrev,
  onComplete,
  onLogSet,
  onDeleteLog
}) => {
  const currentExercise = activeWorkout.exercises[currentExerciseIndex];
  const exerciseLogs = workoutLogs[currentExercise.id] || [];

  const getSetLog = (setNum) => {
    return exerciseLogs.find(log => log.setNumber === setNum);
  };

  return (
    <div className="dashboard" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="active-workout-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1.5rem',
        borderRadius: '20px',
      }}>
        <button
          onClick={onExit}
          className="btn-secondary"
          style={{ padding: '0.5rem 1.5rem', fontSize: '0.8rem' }}
        >
          Exit
        </button>
        <div className="workout-timer" style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--primary)',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
        }}>
          {timer}
        </div>
      </div>

      <div className="active-workout-card">
        <div className="exercise-progress" style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            color: 'var(--light)',
            fontWeight: '800'
          }}>
            {currentExercise.name}
          </h2>
          <div style={{
            display: 'inline-block',
            padding: '0.8rem 1.5rem',
            background: 'rgba(124, 58, 237, 0.1)',
            borderRadius: '50px',
            color: 'var(--accent)',
            fontWeight: '600',
            fontSize: '1rem',
            marginBottom: '1rem',
            border: '1px solid var(--accent)',
            boxShadow: '0 0 15px rgba(124, 58, 237, 0.2)'
          }}>
            Target: {currentExercise.sets} sets × {currentExercise.reps} reps @ {currentExercise.targetWeight}{currentExercise.weightUnit}
          </div>
          {currentExercise.notes && (
            <p style={{ fontStyle: 'italic', marginTop: '1rem', color: 'var(--gray)' }}>
              Notes: {currentExercise.notes}
            </p>
          )}
        </div>

        <div className="sets-list">
          <div className="sets-header" style={{
            display: 'grid',
            gridTemplateColumns: '0.5fr 1fr 1fr 1fr 0.5fr',
            gap: '1rem',
            marginBottom: '1.5rem',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textAlign: 'center'
          }}>
            <div>SET</div>
            <div>PREVIOUS</div>
            <div>KG</div>
            <div>REPS</div>
            <div>✓</div>
          </div>

          {Array.from({ length: currentExercise.sets }).map((_, idx) => {
            const setNum = idx + 1;
            const log = getSetLog(setNum);
            const isCompleted = !!log;

            return (
              <SetRow
                key={setNum}
                setNum={setNum}
                log={log}
                isCompleted={isCompleted}
                targetWeight={currentExercise.targetWeight}
                targetReps={currentExercise.reps}
                onLog={onLogSet}
                onDelete={onDeleteLog}
              />
            );
          })}
        </div>

        <div className="workout-actions" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <button
            onClick={onPrev}
            className="btn-secondary"
            disabled={currentExerciseIndex === 0}
            style={{ opacity: currentExerciseIndex === 0 ? 0.5 : 1, flex: 1 }}
          >
            ← Prev
          </button>

          {currentExerciseIndex < activeWorkout.exercises.length - 1 ? (
            <button onClick={onNext} className="btn-primary" style={{ flex: 1 }}>
              Next Exercise →
            </button>
          ) : (
            <button onClick={onComplete} className="btn-success" style={{ flex: 1 }}>
              Complete Workout ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function TraineeDashboard({ token, userId }) {
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workoutLogs, setWorkoutLogs] = useState({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('workouts'); // 'workouts', 'profile', 'progression'
  const [timer, setTimer] = useState('00:00:00');

  // Progression state
  const [uniqueExercises, setUniqueExercises] = useState([]);
  const [selectedProgressionExercise, setSelectedProgressionExercise] = useState('');
  const [progressionData, setProgressionData] = useState([]);

  useEffect(() => {
    loadWorkouts();
    loadUniqueExercises();
  }, []);

  // Load unique exercises for progression
  const loadUniqueExercises = async () => {
    try {
      const response = await axios.get(`${API_URL}/workout-plans/users/${userId}/exercises`);
      setUniqueExercises(response.data.exercises);
    } catch (err) {
      console.error('Error loading unique exercises:', err);
    }
  };

  // Load progression data when exercise is selected
  useEffect(() => {
    const loadProgression = async () => {
      if (!selectedProgressionExercise) return;

      try {
        const response = await axios.get(`${API_URL}/workout-plans/users/${userId}/progression`, {
          params: { exercise: selectedProgressionExercise }
        });
        setProgressionData(response.data.progression);
      } catch (err) {
        console.error('Error loading progression:', err);
      }
    };

    loadProgression();
  }, [selectedProgressionExercise, userId]);

  // Timer effect for active workout
  useEffect(() => {
    let interval;
    if (activeWorkout) {
      interval = setInterval(() => {
        const startTime = new Date(activeWorkout.startedAt).getTime();
        const durationMs = Date.now() - startTime;
        const durationDate = new Date(durationMs);
        setTimer(durationDate.toISOString().substr(11, 8));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout]);

  const loadWorkouts = async () => {
    try {
      const response = await axios.get(`${API_URL}/trainees/${userId}/workout-plans`);
      setWorkoutPlans(response.data.workoutPlans);
    } catch (err) {
      alert('Error loading workouts: ' + err.message);
    }
  };

  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    if (includeTime) {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    return date.toLocaleString('en-US', options).replace(',', ' at');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const viewWorkoutDetails = async (plan) => {
    setSelectedWorkout(plan);
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

  const startWorkout = async (planId) => {
    try {
      await axios.post(`${API_URL}/workout-plans/${planId}/start`);
      const plan = workoutPlans.find(p => p.id === planId);
      // Ensure startedAt is set for timer
      plan.startedAt = new Date().toISOString();
      setActiveWorkout(plan);
      setCurrentExerciseIndex(0);

      // Load initial logs
      const logs = {};
      for (const exercise of plan.exercises) {
        try {
          const response = await axios.get(
            `${API_URL}/workout-plans/${plan.id}/exercises/${exercise.id}/logs`
          );
          logs[exercise.id] = response.data.logs;
        } catch (err) {
          logs[exercise.id] = [];
        }
      }
      setWorkoutLogs(logs);

    } catch (err) {
      alert('Error starting workout: ' + err.message);
    }
  };

  const nextExercise = () => {
    if (currentExerciseIndex < activeWorkout.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };

  const prevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };

  const completeWorkout = async () => {
    try {
      await axios.post(`${API_URL}/workout-plans/${activeWorkout.id}/complete`, {
        overallNotes: 'Great workout!',
        rating: 5
      });
      alert('Workout completed! 🎉');
      setActiveWorkout(null);
      loadWorkouts();
    } catch (err) {
      alert('Error completing workout: ' + err.message);
    }
  };

  const handleLogSet = async (setNum, weight, reps) => {
    try {
      const currentExercise = activeWorkout.exercises[currentExerciseIndex];
      await axios.post(
        `${API_URL}/workout-plans/${activeWorkout.id}/exercises/${currentExercise.id}/logs`,
        {
          setNumber: setNum,
          repsCompleted: reps,
          weightUsed: weight,
          weightUnit: currentExercise.weightUnit,
          notes: ''
        }
      );

      // Refresh logs
      const response = await axios.get(
        `${API_URL}/workout-plans/${activeWorkout.id}/exercises/${currentExercise.id}/logs`
      );

      setWorkoutLogs(prev => ({
        ...prev,
        [currentExercise.id]: response.data.logs
      }));

    } catch (err) {
      alert('Error logging set: ' + err.message);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      const currentExercise = activeWorkout.exercises[currentExerciseIndex];
      await axios.delete(
        `${API_URL}/workout-plans/${activeWorkout.id}/exercises/${currentExercise.id}/logs/${logId}`
      );

      // Refresh logs
      const response = await axios.get(
        `${API_URL}/workout-plans/${activeWorkout.id}/exercises/${currentExercise.id}/logs`
      );

      setWorkoutLogs(prev => ({
        ...prev,
        [currentExercise.id]: response.data.logs
      }));

    } catch (err) {
      alert('Error deleting log: ' + err.message);
    }
  };

  // --- START EDIT LOGS LOGIC ---
  const [editingLogs, setEditingLogs] = useState(false);

  const handleUpdateLog = async (exerciseId, logId, field, value) => {
    console.log('handleUpdateLog called:', { exerciseId, logId, field, value });

    try {
      // Get the current log to build the full update object
      const currentLog = workoutLogs[exerciseId]?.find(l => l.id === logId);
      if (!currentLog) {
        console.error('Log not found:', logId);
        return;
      }

      const updatedLog = { ...currentLog, [field]: value };

      await axios.put(
        `${API_URL}/workout-plans/${selectedWorkout.id}/exercises/${exerciseId}/logs/${logId}`,
        {
          setNumber: updatedLog.setNumber,
          repsCompleted: updatedLog.repsCompleted,
          weightUsed: updatedLog.weightUsed,
          weightUnit: updatedLog.weightUnit,
          notes: updatedLog.notes
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Refresh logs from backend after successful update
      const response = await axios.get(
        `${API_URL}/workout-plans/${selectedWorkout.id}/exercises/${exerciseId}/logs`
      );

      setWorkoutLogs(prev => ({
        ...prev,
        [exerciseId]: response.data.logs
      }));

    } catch (err) {
      console.error('Error updating log:', err);
      alert('Failed to update log');
    }
  };
  // --- END EDIT LOGS LOGIC ---

  // --- START ADD LOG LOGIC ---
  const handleAddLog = async (exerciseId) => {
    try {
      const currentLogs = workoutLogs[exerciseId] || [];
      const nextSetNumber = currentLogs.length > 0
        ? Math.max(...currentLogs.map(l => l.setNumber)) + 1
        : 1;

      await axios.post(
        `${API_URL}/workout-plans/${selectedWorkout.id}/exercises/${exerciseId}/logs`,
        {
          setNumber: nextSetNumber,
          repsCompleted: 0,
          weightUsed: 0,
          weightUnit: 'kg',
          notes: ''
        }
      );

      // Refresh logs from backend
      const response = await axios.get(
        `${API_URL}/workout-plans/${selectedWorkout.id}/exercises/${exerciseId}/logs`
      );

      setWorkoutLogs(prev => ({
        ...prev,
        [exerciseId]: response.data.logs
      }));

    } catch (err) {
      console.error('Error adding log:', err);
      alert('Failed to add log');
    }
  };
  // --- END ADD LOG LOGIC ---

  if (activeWorkout) {
    return (
      <ActiveWorkoutView
        activeWorkout={activeWorkout}
        currentExerciseIndex={currentExerciseIndex}
        workoutLogs={workoutLogs}
        timer={timer}
        onExit={() => setActiveWorkout(null)}
        onNext={nextExercise}
        onPrev={prevExercise}
        onComplete={completeWorkout}
        onLogSet={handleLogSet}
        onDeleteLog={handleDeleteLog}
      />
    );
  }

  if (selectedWorkout) {
    return (
      <div className="dashboard">
        <h2>Workout Details</h2>
        <div className="workout-details">
          <button onClick={closeDetails} className="btn-back">← Back to List</button>
          <div className="workout-header">
            <h3>{selectedWorkout.name}</h3>
            <p className="workout-meta">
              Status: <span className={`status-${selectedWorkout.status}`}>{selectedWorkout.status}</span> |
              Scheduled: {formatDate(selectedWorkout.scheduledDate)}
              {selectedWorkout.completedAt && ` | Completed: ${formatDate(selectedWorkout.completedAt, true)}`}
            </p>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h5>Performance Log:</h5>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {editingLogs && (
                        <button
                          onClick={() => handleAddLog(exercise.id)}
                          className="btn-primary"
                          style={{ padding: '2px 8px', fontSize: '0.8rem', backgroundColor: '#28a745' }}
                        >
                          + Add Set
                        </button>
                      )}
                      <button
                        onClick={() => setEditingLogs(!editingLogs)}
                        className="btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                      >
                        {editingLogs ? 'Done' : 'Edit Logs'}
                      </button>
                    </div>
                  </div>

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
                            <td>
                              {editingLogs ? (
                                <input
                                  type="number"
                                  defaultValue={log.repsCompleted}
                                  onChange={(e) => handleUpdateLog(exercise.id, log.id, 'repsCompleted', parseInt(e.target.value) || 0)}
                                  style={{ width: '50px', padding: '2px', textAlign: 'center', color: 'black' }}
                                />
                              ) : log.repsCompleted}
                            </td>
                            <td>
                              {editingLogs ? (
                                <input
                                  type="number"
                                  defaultValue={log.weightUsed}
                                  onChange={(e) => handleUpdateLog(exercise.id, log.id, 'weightUsed', parseFloat(e.target.value) || 0)}
                                  style={{ width: '60px', padding: '2px', textAlign: 'center', color: 'black' }}
                                />
                              ) : log.weightUsed}{log.weightUnit}
                            </td>
                            <td>
                              {editingLogs ? (
                                <input
                                  type="text"
                                  defaultValue={log.notes || ''}
                                  onChange={(e) => handleUpdateLog(exercise.id, log.id, 'notes', e.target.value)}
                                  style={{ width: '100%', padding: '2px', color: 'black' }}
                                />
                              ) : (log.notes || '-')}
                            </td>
                            <td>{formatTime(log.loggedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-logs">
                      {editingLogs ? 'Click "+ Add Set" to create a log entry.' : 'No performance data logged yet'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>Trainee Dashboard</h2>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'workouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('workouts')}
        >
          🏋️ My Workouts
        </button>
        <button
          className={`tab-button ${activeTab === 'progression' ? 'active' : ''}`}
          onClick={() => setActiveTab('progression')}
        >
          📈 Progression
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 My Profile
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="profile-section">
          <UserProfile userId={userId} editable={true} />
        </div>
      )}

      {activeTab === 'workouts' && (
        <div className="workout-plans">
          {workoutPlans.length === 0 ? (
            <p>No workout plans assigned yet.</p>
          ) : (
            workoutPlans.map((plan) => (
              <div key={plan.id} className="workout-card">
                <h3>{plan.name}</h3>
                <p>Status: <span className={`status-${plan.status}`}>{plan.status}</span></p>
                <p>Scheduled: {formatDate(plan.scheduledDate)}</p>
                <p>{plan.exercises.length} exercises</p>
                {plan.completedAt && <p>✓ Completed: {formatDate(plan.completedAt, true)}</p>}

                {plan.status === 'assigned' && (
                  <button onClick={() => startWorkout(plan.id)} className="btn-primary">
                    Start Workout
                  </button>
                )}

                {plan.status === 'in_progress' && (
                  <>
                    <button onClick={() => startWorkout(plan.id)} className="btn-primary">
                      Resume Workout
                    </button>
                    <button onClick={() => viewWorkoutDetails(plan)} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
                      View Details
                    </button>
                  </>
                )}

                {plan.status === 'completed' && (
                  <button onClick={() => viewWorkoutDetails(plan)} className="btn-secondary">
                    View Details
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'progression' && (
        <div className="progression-section">
          <h2>Progression Tracking</h2>
          <p style={{ color: 'var(--gray)', marginBottom: '2rem' }}>
            Track your strength gains over time. Select an exercise to view your estimated 1 Rep Max trend.
          </p>

          <div className="progression-controls" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 255, 255, 0.1)'
          }}>
            <div className="form-group">
              <label>Select Exercise</label>
              <select
                value={selectedProgressionExercise}
                onChange={(e) => setSelectedProgressionExercise(e.target.value)}
                style={{ maxWidth: '400px' }}
              >
                <option value="">-- Choose an exercise --</option>
                {uniqueExercises.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedProgressionExercise && (
            <div className="chart-card" style={{
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '1rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <ProgressionChart
                data={progressionData}
                title={`${selectedProgressionExercise} Progress`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TraineeDashboard; 