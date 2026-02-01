import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import UserProfile from './UserProfile';
import ProgressionChart from './ProgressionChart';
import Calendar from './Calendar';
import NutritionCalculator from './NutritionCalculator';
import { API_URL } from '../config/api';

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
      border: isCompleted ? '1px solid var(--success)' : '1px solid var(--border-color)',
      backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
      boxShadow: isCompleted ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{setNum}</div>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        {targetWeight}kg x {targetReps}
      </div>
      <div>
        <input
          type="number"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          style={{
            width: '90%',
            textAlign: 'center',
            padding: '0.6rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '1rem'
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
            width: '90%',
            textAlign: 'center',
            padding: '0.6rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '1rem'
          }}
          disabled={isCompleted}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => isCompleted ? onDelete(log.id) : onLog(setNum, weightInput, repsInput)}
          style={{
            background: isCompleted ? 'var(--success)' : 'var(--bg-secondary)',
            color: isCompleted ? 'white' : 'var(--text-secondary)',
            border: isCompleted ? 'none' : '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '42px',
            height: '42px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '1.2rem',
            boxShadow: isCompleted ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
          }}
          title={isCompleted ? "Undo" : "Log Set"}
        >
          {isCompleted ? '✓' : ''}
        </button>
      </div>
    </div>
  );
};

// Active Workout View Component
// Active Workout View Component
const ActiveWorkoutView = ({
  activeWorkout,
  workoutLogs,
  timer,
  onExit,
  onComplete,
  onLogSet,
  onDeleteLog,
  onUpdateExercise
}) => {
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteContent, setNoteContent] = useState('');

  const startEditingNote = (exercise) => {
    setEditingNoteId(exercise.id);
    setNoteContent(exercise.notes || '');
  };

  const saveNote = (exercise) => {
    onUpdateExercise(exercise.id, { notes: noteContent });
    setEditingNoteId(null);
  };
  const getSetLog = (exerciseId, setNum) => {
    const exerciseLogs = workoutLogs[exerciseId] || [];
    return exerciseLogs.find(log => log.setNumber === setNum);
  };

  return (
    <div className="dashboard" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div className="active-workout-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1.5rem',
        borderRadius: '20px',
        position: 'sticky',
        top: '1rem',
        zIndex: 100,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
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

      <div className="exercises-list">
        {activeWorkout.exercises?.map((exercise, index) => (
          <div key={exercise.id} className="active-workout-card" style={{
            marginBottom: '3rem',
            background: 'var(--card-bg)',
            padding: '2rem',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div className="exercise-progress" style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '1rem',
                color: 'var(--text-primary)',
                fontWeight: '800'
              }}>
                {index + 1}. {exercise.name}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '0.8rem 1.5rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '50px',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '0.95rem',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                Target: {exercise.sets} sets × {exercise.reps} reps @ {exercise.targetWeight}{exercise.weightUnit}
              </div>
              <div style={{ marginTop: '1rem', minHeight: '3rem' }}>
                {editingNoteId === exercise.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add notes..."
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--accent)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        width: '80%',
                        minHeight: '60px',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button onClick={() => saveNote(exercise)} className="btn-success" style={{ padding: '0.5rem' }}>💾</button>
                      <button onClick={() => setEditingNoteId(null)} className="btn-secondary" style={{ padding: '0.5rem' }}>❌</button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => startEditingNote(exercise)}
                    style={{
                      cursor: 'pointer',
                      padding: '1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      border: '1px dashed var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to edit notes"
                  >
                    <p style={{
                      margin: 0,
                      fontSize: '1.1rem',
                      color: exercise.notes ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontStyle: exercise.notes ? 'normal' : 'italic'
                    }}>
                      {exercise.notes ? `📝 ${exercise.notes}` : 'Click to add notes...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sets-list">
              <div className="sets-header" style={{
                display: 'grid',
                gridTemplateColumns: '0.5fr 1fr 1fr 1fr 0.5fr',
                gap: '1rem',
                marginBottom: '1rem',
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

              {Array.from({ length: exercise.sets }).map((_, idx) => {
                const setNum = idx + 1;
                const log = getSetLog(exercise.id, setNum);
                const isCompleted = !!log;

                return (
                  <SetRow
                    key={setNum}
                    setNum={setNum}
                    log={log}
                    isCompleted={isCompleted}
                    targetWeight={exercise.targetWeight}
                    targetReps={exercise.reps}
                    onLog={(s, w, r) => onLogSet(exercise.id, s, w, r)}
                    onDelete={(logId) => onDeleteLog(activeWorkout.id, exercise.id, logId)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="workout-actions" style={{
        marginTop: '2rem',
        padding: '2rem',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
        borderRadius: '20px',
        border: '1px solid var(--border-color)'
      }}>

        <button
          onClick={onComplete}
          className="btn-success"
          style={{
            minWidth: '200px',
            maxWidth: '100%',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            color: '#fff',
            background: 'var(--success)'
          }}
        >
          Complete Workout 🎉
        </button>
      </div>
    </div >
  );
};


function TraineeDashboard({ token, userId }) {
  const { t } = useTranslation();

  // Helper component for Sidebar Navigation Button
  const NavButton = ({ active, onClick, icon, label }) => (
    <button
      onClick={onClick}
      className={`nav-button ${active ? 'active' : ''}`}
    >
      <span className="nav-button-icon">{icon}</span>
      <span className="nav-button-label">{label}</span>
    </button>
  );


  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workoutLogs, setWorkoutLogs] = useState({});

  const [activeTab, setActiveTab] = useState('workouts'); // 'workouts', 'profile', 'progression'
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [timer, setTimer] = useState('00:00:00');

  // Progression state
  const [uniqueExercises, setUniqueExercises] = useState([]);
  const [selectedProgressionExercise, setSelectedProgressionExercise] = useState('');
  const [progressionData, setProgressionData] = useState([]);

  useEffect(() => {
    if (activeTab === 'workouts') {
      loadWorkouts();
    } else if (activeTab === 'progression') {
      loadUniqueExercises();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load unique exercises for progression
  const loadUniqueExercises = async () => {
    try {
      const response = await axios.get(`${API_URL}/workout-plans/users/${userId}/exercises`);
      setUniqueExercises(response.data.exercises || []);
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
      setWorkoutPlans(response.data.workoutPlans || []);
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

  const [processingSets, setProcessingSets] = useState(new Set());

  const handleLogSet = async (exerciseId, setNum, weight, reps) => {
    const setKey = `${exerciseId}-${setNum}`;

    // Prevent duplicate requests
    if (processingSets.has(setKey)) return;

    // Check if log already exists locally
    const existingLog = workoutLogs[exerciseId]?.find(l => l.setNumber === setNum);
    if (existingLog) return;

    try {
      setProcessingSets(prev => new Set(prev).add(setKey));

      const currentExercise = activeWorkout.exercises.find(ex => ex.id === exerciseId);
      if (!currentExercise) return;

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
    } finally {
      setProcessingSets(prev => {
        const next = new Set(prev);
        next.delete(setKey);
        return next;
      });
    }
  };

  const handleDeleteLog = async (workoutId, exerciseId, logId) => {
    try {
      await axios.delete(
        `${API_URL}/workout-plans/${workoutId}/exercises/${exerciseId}/logs/${logId}`
      );

      // Refresh logs
      const response = await axios.get(
        `${API_URL}/workout-plans/${workoutId}/exercises/${exerciseId}/logs`
      );

      setWorkoutLogs(prev => ({
        ...prev,
        [exerciseId]: response.data.logs
      }));

    } catch (err) {
      alert('Error deleting log: ' + err.message);
    }
  };

  const handleUpdateExercise = async (exerciseId, updates) => {
    try {
      const exercise = activeWorkout.exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      await axios.put(
        `${API_URL}/workout-plans/${activeWorkout.id}/exercises/${exerciseId}`,
        {
          ...exercise,
          ...updates
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      const updatedExercises = activeWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      );
      setActiveWorkout({ ...activeWorkout, exercises: updatedExercises });

    } catch (err) {
      console.error('Update exercise error:', err);
      alert('Error updating exercise: ' + err.message);
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
        workoutLogs={workoutLogs}
        timer={timer}
        onExit={() => setActiveWorkout(null)}
        onComplete={completeWorkout}
        onLogSet={handleLogSet}
        onDeleteLog={handleDeleteLog}
        onUpdateExercise={handleUpdateExercise}
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
    <div className="dashboard" style={{ userSelect: 'none', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      {/* Header */}
      <div className="dashboard-header-container" style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
        marginBottom: '2rem'
      }}>
        <div className="dashboard-header-content" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{
            color: 'var(--text-primary)',
            fontSize: 'clamp(1.2rem, 5vw, 1.5rem)',
            margin: 0,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #00ffff, #0080ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '800',
            textAlign: 'center',
            lineHeight: '1.2'
          }}>
            {t('dashboard.traineeWelcome').toUpperCase()}
          </h1>
        </div>
      </div>




      <div className="dashboard-body">
        {/* Sidebar Navigation */}
        <aside className="dashboard-sidebar">
          <NavButton
            active={activeTab === 'workouts'}
            onClick={() => setActiveTab('workouts')}
            icon="💪"
            label={t('dashboard.myWorkouts')}
          />
          <NavButton
            active={activeTab === 'calendar'}
            onClick={() => setActiveTab('calendar')}
            icon="📅"
            label={t('common.date')}
          />
          <NavButton
            active={activeTab === 'progression'}
            onClick={() => setActiveTab('progression')}
            icon="📈"
            label={t('progression.title')}
          />
          <NavButton
            active={activeTab === 'nutrition'}
            onClick={() => setActiveTab('nutrition')}
            icon="🍎"
            label={t('nutrition.title')}
          />
          <NavButton
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            icon="👤"
            label={t('profile.title')}
          />
        </aside>

        {/* Main Content Area */}
        {/* Main Content Area */}
        <main className="dashboard-content">

          {activeTab === 'nutrition' && <NutritionCalculator userId={userId} />
          }

          {
            activeTab === 'profile' && (
              <div className="profile-section">
                <UserProfile userId={userId} editable={true} />
              </div>
            )
          }

          {
            activeTab === 'workouts' && (
              <div className="workout-plans">
                {workoutPlans?.length === 0 ? (
                  <p>No workout plans assigned yet.</p>
                ) : (
                  workoutPlans.map((plan) => (
                    <div key={plan.id} className="workout-card">
                      <h3>{plan.name}</h3>
                      <p>Status: <span className={`status-${plan.status}`}>{plan.status}</span></p>
                      <p>Scheduled: {formatDate(plan.scheduledDate)}</p>
                      <p>{plan.exercises?.length || 0} exercises</p>
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
            )
          }

          {
            activeTab === 'calendar' && (
              <div className="calendar-section">
                <h2>My Calendar</h2>
                <Calendar
                  events={workoutPlans}
                  onSelectDate={(date) => setCalendarSelectedDate(date)}
                />

                {calendarSelectedDate && (
                  <div className="selected-date-workouts">
                    <h3>Workouts for {calendarSelectedDate.toLocaleDateString()}</h3>
                    {(() => {
                      const dayEvents = workoutPlans.filter(p => {
                        const d = new Date(p.scheduledDate);
                        return d.getDate() === calendarSelectedDate.getDate() &&
                          d.getMonth() === calendarSelectedDate.getMonth() &&
                          d.getFullYear() === calendarSelectedDate.getFullYear();
                      });

                      if (dayEvents.length === 0) return <p>No workouts scheduled for this day.</p>;

                      return dayEvents.map(plan => (
                        <div key={plan.id} className="workout-card">
                          <h3>{plan.name}</h3>
                          <p>Status: <span className={`status-${plan.status}`}>{plan.status}</span></p>
                          <p>Scheduled: {formatDate(plan.scheduledDate)}</p>
                          <p>{plan.exercises?.length || 0} exercises</p>
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
                      ));
                    })()}
                  </div>
                )}
              </div>
            )
          }

          {
            activeTab === 'progression' && (
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
            )
          }

        </main>
      </div>
    </div >
  );
}

export default TraineeDashboard; 