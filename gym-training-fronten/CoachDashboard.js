import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import UserProfile from './UserProfile';
import ProgressionChart from './ProgressionChart';
import Calendar from './Calendar';
import NutritionCalculator from './NutritionCalculator';
import CardioTimer from './CardioTimer';
import { API_URL } from '../config/api';
import { getTraineeLimit } from '../config/subscriptionTiers';

// Helper component for Set Row
const SetRow = ({ setNum, log, isCompleted, targetWeight, targetReps, previousLog, onLog, onDelete }) => {
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
      border: isCompleted ? '1px solid var(--success)' : '1px solid rgba(255, 255, 255, 0.05)',
      backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
      boxShadow: isCompleted ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--light)', fontSize: '1.1rem' }}>{setNum}</div>
      <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: '0.9rem' }}>
        {previousLog ? `${previousLog.weight}kg x ${previousLog.reps}` : '-'}
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
  workoutLogs,
  activeWorkoutHistory,
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
        background: 'rgba(20, 20, 20, 0.95)',
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
        {activeWorkout.exercises.map((exercise, index) => (
          <div key={exercise.id} className="active-workout-card" style={{ marginBottom: '3rem' }}>
            <div className="exercise-progress" style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{
                fontSize: '2rem',
                marginBottom: '1rem',
                color: 'var(--light)',
                fontWeight: '800'
              }}>
                {index + 1}. {exercise.name}
              </h2>
              <div style={{
                display: 'inline-block',
                padding: '0.6rem 1.2rem',
                background: 'rgba(124, 58, 237, 0.1)',
                borderRadius: '50px',
                color: 'var(--accent)',
                fontWeight: '600',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                border: '1px solid var(--accent)',
                boxShadow: '0 0 15px rgba(124, 58, 237, 0.2)'
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
                        background: 'rgba(0,0,0,0.3)',
                        color: 'white',
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
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      border: '1px dashed rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to edit notes"
                  >
                    <p style={{
                      margin: 0,
                      fontSize: '1.1rem',
                      color: exercise.notes ? 'var(--light)' : 'var(--gray)',
                      fontStyle: exercise.notes ? 'normal' : 'italic'
                    }}>
                      {exercise.notes ? `📝 ${exercise.notes}` : 'Click to add notes...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cardio or Standard View */}
            {(exercise.weightUnit === 'min' || exercise.weightUnit === 'km') ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CardioTimer
                  initialTime={0}
                  targetDuration={exercise.reps * (exercise.weightUnit === 'min' ? 60 : 1)} // Assuming reps stores duration target? Or separate field?
                  // If standard is "Sets x Reps", for cardio it might be "1 x Minutes".
                  // Let's assume reps = minutes if weightUnit is min.
                  onFinish={(data) => {
                    // Log the result: Set 1 (Cardio is usually 1 set?), Weight=Calories, Reps=Duration
                    onLogSet(exercise.id, 1, data.calories, data.duration);
                  }}
                />

                {/* Cardio Log History Display */}
                <div style={{ marginTop: '2rem', width: '100%' }}>
                  <h4 style={{ color: 'var(--gray)', textAlign: 'center', marginBottom: '1rem' }}>Session Log</h4>
                  {workoutLogs[exercise.id] && workoutLogs[exercise.id].length > 0 ? (
                    workoutLogs[exercise.id].map(log => (
                      <div key={log.id} style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--success)',
                        padding: '1rem',
                        borderRadius: '12px',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#fff'
                      }}>
                        <span>Set {log.setNumber}</span>
                        <span>{Math.floor(log.repsCompleted / 60)}m {log.repsCompleted % 60}s</span>
                        <span>{log.weightUsed} kcal</span>
                        <button
                          onClick={() => onDeleteLog(activeWorkout.id, exercise.id, log.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: '#666' }}>No logs yet for this session.</p>
                  )}
                </div>
              </div>
            ) : (
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

                  // Get previous log for this specific set
                  const exerciseHistory = activeWorkoutHistory ? activeWorkoutHistory[exercise.id] : [];
                  const previousLog = exerciseHistory ? exerciseHistory.find(l => l.setNumber === setNum) : null;

                  return (
                    <SetRow
                      key={setNum}
                      setNum={setNum}
                      log={log}
                      isCompleted={isCompleted}
                      targetWeight={exercise.targetWeight}
                      targetReps={exercise.reps}
                      previousLog={previousLog}
                      onLog={(s, w, r) => onLogSet(exercise.id, s, w, r)}
                      onDelete={(logId) => onDeleteLog(activeWorkout.id, exercise.id, logId)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))
        }
      </div >

      <div className="workout-actions" style={{
        marginTop: '2rem',
        padding: '2rem',
        textAlign: 'center',
        background: 'rgba(20, 20, 20, 0.8)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <button
          onClick={onComplete}
          className="btn-success"
          style={{
            width: '100%',
            padding: '1.2rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
          }}
        >
          Complete Workout 🎉
        </button>
      </div>
    </div >
  );
};

const CoachDashboard = ({ token, userId }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('customers');
  const [coachTier, setCoachTier] = useState('starter');

  useEffect(() => {
    const fetchCoachProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` } // Assuming token is available or handled by interceptor
        });
        // Check where subscription_tier is. Usually in user object.
        const user = response.data.user || response.data;
        setCoachTier(user.subscription_tier || 'starter');
      } catch (error) {
        console.error('Error fetching coach profile:', error);
      }
    };
    if (userId) fetchCoachProfile();
  }, [userId, token]);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [allTraineeWorkouts, setAllTraineeWorkouts] = useState([]);

  // Customer workouts state
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workoutLogs, setWorkoutLogs] = useState({});
  const [trainees, setTrainees] = useState([]);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [showAddTrainee, setShowAddTrainee] = useState(false);
  const [traineeEmail, setTraineeEmail] = useState('');
  const [showTraineeProfile, setShowTraineeProfile] = useState(false);

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
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    exercises: []
  });

  // Progression state
  const [uniqueExercises, setUniqueExercises] = useState([]);
  const [selectedProgressionExercise, setSelectedProgressionExercise] = useState('');
  const [progressionData, setProgressionData] = useState([]);
  const [progressionUserId, setProgressionUserId] = useState(userId);


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
    sets: '',
    reps: '',
    targetWeight: '',
    weightUnit: 'kg',
    notes: ''
  });
  // --- START EXERCISE HISTORY LOGIC ---
  const [exerciseHistory, setExerciseHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      // Determine target user ID based on active tab
      let targetUserId = null;
      if (activeTab === 'customers') {
        targetUserId = formData.traineeId;
      } else if (activeTab === 'personal') {
        targetUserId = userId; // For personal workouts, use the coach's own ID
      }

      if (!newExercise.name || !targetUserId) {
        setExerciseHistory([]);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/workout-plans/users/${targetUserId}/progression`, {
          params: { exercise: newExercise.name }
        });

        // Group logs by date
        const rawLogs = response.data.progression || [];
        const groupedLogs = rawLogs.reduce((acc, log) => {
          // Create a date string (e.g., "12/5/2025")
          const date = new Date(log.date).toLocaleDateString();

          if (!acc[date]) {
            acc[date] = {
              date: log.date,
              setDetails: []
            };
          }

          acc[date].setDetails.push({
            reps: log.reps,
            weight: log.weight,
            rir: log.rir,
            rpe: log.rpe
          });
          return acc;
        }, {});

        // Convert back to array, sort by date, and take last 3 days
        const history = Object.values(groupedLogs)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(-3)
          .reverse();

        setExerciseHistory(history);
      } catch (err) {
        console.error('Error fetching exercise history:', err);
        setExerciseHistory([]);
      }
    };

    fetchHistory();
  }, [newExercise.name, formData.traineeId, activeTab, userId]);
  // --- END EXERCISE HISTORY LOGIC ---

  // Edit workout state
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    scheduledDate: '',
    exercises: []
  });

  // Active workout state
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [activeWorkoutHistory, setActiveWorkoutHistory] = useState({}); // Stores previous logs per exercise

  const [timer, setTimer] = useState('00:00:00');

  // --- Calendar Date Picker Modal State ---
  const [showDateModal, setShowDateModal] = useState(false);
  const [onDateSelect, setOnDateSelect] = useState(null); // Function to call when date is selected

  const openDatePicker = (callback) => {
    setOnDateSelect(() => callback);
    setShowDateModal(true);
    // Ensure workouts are loaded so the calendar shows context
    loadAllTraineeWorkouts();
  };

  const handleDateSelect = (dateObj) => {
    if (onDateSelect) {
      // Convert to YYYY-MM-DD using local time logic
      const offset = dateObj.getTimezoneOffset() * 60000;
      const dateStr = new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
      onDateSelect(dateStr);
    }
    setShowDateModal(false);
  };
  // ----------------------------------------

  // Timer effect for active workout
  React.useEffect(() => {
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

  // Fetch previous history for active workout exercises
  useEffect(() => {
    const fetchActiveWorkoutHistory = async () => {
      if (!activeWorkout) {
        setActiveWorkoutHistory({});
        return;
      }

      const historyData = {};
      const targetUserId = activeWorkout.traineeId || userId;

      for (const exercise of activeWorkout.exercises) {
        try {
          const response = await axios.get(`${API_URL}/workout-plans/users/${targetUserId}/progression`, {
            params: {
              exercise: exercise.name,
              _: new Date().getTime()
            }
          });

          const rawLogs = response.data.progression || [];

          // Fallback Logic: Backend might represent old version (missing workoutPlanId/setNumber)
          // Strategy: Group by Date (YYYY-MM-DD), find most recent previous day, infer set numbers by time.

          // 1. Group by Day
          const logsByDay = {};
          rawLogs.forEach(log => {
            // Use local date string to avoid timezone splitting issues slightly,
            // but ISO split is safer for consistency. 
            const dateObj = new Date(log.date);
            const dayStr = dateObj.toISOString().split('T')[0];
            if (!logsByDay[dayStr]) logsByDay[dayStr] = [];
            logsByDay[dayStr].push(log);
          });

          // 2. Identify "Current" day to exclude
          const currentDay = new Date(activeWorkout.startedAt || new Date()).toISOString().split('T')[0];

          // 3. Find available days (sorted newest first)
          const distinctDays = Object.keys(logsByDay).sort((a, b) => new Date(b) - new Date(a));

          // Find the first day that is strictly BEFORE the current day (or just different if we want to be loose)
          // We'll exclude the current day.
          const lastSessionDate = distinctDays.find(d => d !== currentDay);

          if (lastSessionDate) {
            let sessionLogs = logsByDay[lastSessionDate];

            // 4. Sort logs by timestamp ascending to reconstruct set order (Set 1, Set 2...)
            sessionLogs.sort((a, b) => new Date(a.date) - new Date(b.date));

            // 5. Augment with setNumber if missing
            const processedLogs = sessionLogs.map((log, index) => ({
              ...log,
              // If backend doesn't send setNumber, infer it from order
              setNumber: log.setNumber || (index + 1)
            }));

            historyData[exercise.id] = processedLogs;
          }
        } catch (err) {
          console.error(`Error fetching history for ${exercise.name}:`, err);
        }
      }
      setActiveWorkoutHistory(historyData);
    };

    fetchActiveWorkoutHistory();
  }, [activeWorkout, userId]);

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
      sets: '',
      reps: '',
      targetWeight: '',
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

  // --- Exercise Editing Logic ---
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(-1);
  const [editingLogs, setEditingLogs] = useState(false);
  const [editingExerciseData, setEditingExerciseData] = useState({
    sets: '',
    reps: '',
    targetWeight: '',
    notes: ''
  });

  // --- LOG EDITING LOGIC ---
  const handleUpdateLog = async (workoutId, exerciseId, logId, field, value) => {
    try {
      // Determine which log state to use based on which workout is selected
      const isPersonalWorkout = !!selectedPersonalWorkout;
      const currentLogs = isPersonalWorkout ? personalWorkoutLogs : workoutLogs;

      // Get the current log to build the full update object
      const currentLog = currentLogs[exerciseId]?.find(l => l.id === logId);
      if (!currentLog) return;

      const updatedLog = { ...currentLog, [field]: value };

      await axios.put(
        `${API_URL}/workout-plans/${workoutId}/exercises/${exerciseId}/logs/${logId}`,
        {
          setNumber: updatedLog.setNumber,
          repsCompleted: updatedLog.repsCompleted,
          weightUsed: updatedLog.weightUsed,
          weightUnit: updatedLog.weightUnit,
          notes: updatedLog.notes
        }
      );

      // Refresh logs
      const response = await axios.get(
        `${API_URL}/workout-plans/${workoutId}/exercises/${exerciseId}/logs`
      );

      // Update the appropriate state
      if (isPersonalWorkout) {
        setPersonalWorkoutLogs(prev => ({
          ...prev,
          [exerciseId]: response.data.logs
        }));
      } else {
        setWorkoutLogs(prev => ({
          ...prev,
          [exerciseId]: response.data.logs
        }));
      }

    } catch (err) {
      console.error('Error updating log:', err);
      alert('Failed to update log');
    }
  };

  const handleAddLog = async (workoutId, exerciseId) => {
    try {
      // Determine which log state to use based on which workout is selected
      const isPersonalWorkout = !!selectedPersonalWorkout;
      const currentLogs = isPersonalWorkout
        ? (personalWorkoutLogs[exerciseId] || [])
        : (workoutLogs[exerciseId] || []);

      const nextSetNumber = currentLogs.length > 0
        ? Math.max(...currentLogs.map(l => l.setNumber)) + 1
        : 1;

      await axios.post(
        `${API_URL}/workout-plans/${workoutId}/exercises/${exerciseId}/logs`,
        {
          setNumber: nextSetNumber,
          repsCompleted: 0,
          weightUsed: 0,
          weightUnit: 'kg',
          notes: ''
        }
      );

      // Refresh logs
      const response = await axios.get(
        `${API_URL}/workout-plans/${workoutId}/exercises/${exerciseId}/logs`
      );

      // Update the appropriate state
      if (isPersonalWorkout) {
        setPersonalWorkoutLogs(prev => ({
          ...prev,
          [exerciseId]: response.data.logs
        }));
      } else {
        setWorkoutLogs(prev => ({
          ...prev,
          [exerciseId]: response.data.logs
        }));
      }

    } catch (err) {
      console.error('Error adding log:', err);
      alert('Failed to add log');
    }
  };
  // -------------------------



  const startEditingExercise = (index, exercise) => {
    setEditingExerciseIndex(index);
    setEditingExerciseData({
      sets: exercise.sets,
      reps: exercise.reps,
      targetWeight: exercise.targetWeight,
      notes: exercise.notes || ''
    });
  };

  const cancelEditExercise = () => {
    setEditingExerciseIndex(-1);
    setEditingExerciseData({ sets: '', reps: '', targetWeight: '' });
  };

  const saveEditedExercise = () => {
    if (activeTab === 'customers') {
      const updatedExercises = [...formData.exercises];
      updatedExercises[editingExerciseIndex] = {
        ...updatedExercises[editingExerciseIndex],
        sets: parseInt(editingExerciseData.sets),
        reps: parseInt(editingExerciseData.reps),
        targetWeight: parseInt(editingExerciseData.targetWeight),
        notes: editingExerciseData.notes
      };
      setFormData({ ...formData, exercises: updatedExercises });
    } else {
      const updatedExercises = [...personalFormData.exercises];
      updatedExercises[editingExerciseIndex] = {
        ...updatedExercises[editingExerciseIndex],
        sets: parseInt(editingExerciseData.sets),
        reps: parseInt(editingExerciseData.reps),
        targetWeight: parseInt(editingExerciseData.targetWeight),
        notes: editingExerciseData.notes
      };
      setPersonalFormData({ ...personalFormData, exercises: updatedExercises });
    }
    cancelEditExercise();
  };
  // -----------------------------

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
      }, {
        headers: { Authorization: `Bearer ${token}` }
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
      }, {
        headers: { Authorization: `Bearer ${token}` }
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
      const workouts = response.data.workoutPlans;
      setWorkoutPlans(workouts);
      setSelectedTrainee(traineeId);

      // Load logs for all exercises in all workouts
      for (const workout of workouts) {
        if (workout.exercises && workout.exercises.length > 0) {
          await loadExerciseLogs(workout.id, workout.exercises);
        }
      }
    } catch (err) {
      alert('Error loading workouts: ' + err.message);
    }
  };

  const loadPersonalWorkouts = async () => {
    try {
      const response = await axios.get(`${API_URL}/trainees/${userId}/workout-plans`);
      const workouts = response.data.workoutPlans;
      setPersonalWorkouts(workouts);

      // Load logs for all exercises in all workouts
      for (const workout of workouts) {
        if (workout.exercises && workout.exercises.length > 0) {
          await loadExerciseLogs(workout.id, workout.exercises);
        }
      }
    } catch (err) {
      console.error('Error loading personal workouts:', err);
    }
  };

  const loadExerciseLogs = async (workoutPlanId, exercises) => {
    try {
      const logsData = {};

      // Fetch logs for each exercise
      await Promise.all(
        exercises.map(async (exercise) => {
          try {
            const response = await axios.get(
              `${API_URL}/workout-plans/${workoutPlanId}/exercises/${exercise.id}/logs`
            );
            logsData[exercise.id] = response.data.logs || [];
          } catch (err) {
            console.error(`Error loading logs for exercise ${exercise.id}:`, err);
            logsData[exercise.id] = [];
          }
        })
      );

      setWorkoutLogs(logsData);
    } catch (err) {
      console.error('Error loading exercise logs:', err);
    }
  };

  const loadAllTraineeWorkouts = async () => {
    if (!trainees || trainees.length === 0) return;

    // Optional: Avoid re-fetching if already loaded, or force refresh?
    // For now, let's fetch fresh data to be safe.

    const all = [];
    await Promise.all(trainees.map(async (trainee) => {
      try {
        const res = await axios.get(`${API_URL}/trainees/${trainee.id}/workout-plans?coachId=${userId}`);
        const plans = res.data.workoutPlans.map(p => ({
          ...p,
          traineeName: trainee.name // Explicitly attach name
        }));
        all.push(...plans);
      } catch (e) {
        console.error(`Error loading workouts for trainee ${trainee.id}:`, e);
      }
    }));
    setAllTraineeWorkouts(all);
  };

  useEffect(() => {
    if (activeTab === 'exercises') {
      loadUniqueExercises();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'calendar') {
      loadAllTraineeWorkouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, trainees]);

  const addTrainee = async (e) => {
    e.preventDefault();

    if (!traineeEmail.trim()) {
      alert('Please enter a trainee email');
      return;
    }

    try {
      await axios.post(`${API_URL}/coaches/${userId}/trainees`, {
        email: traineeEmail
      }, {
        headers: { Authorization: `Bearer ${token}` }
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
      await axios.delete(`${API_URL}/workout-plans/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      await axios.delete(`${API_URL}/workout-plans/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Workout updated successfully!');
      if (activeTab === 'customers' && selectedTrainee) {
        loadTraineeWorkouts(selectedTrainee);
      } else {
        loadPersonalWorkouts();
      }
      setEditingWorkout(null);
    } catch (err) {
      console.error('Update workout error:', err);
      alert('Error updating workout: ' + (err.response?.data?.message || err.message));
    }
  };

  const startWorkout = async (planId) => {
    try {
      await axios.post(`${API_URL}/workout-plans/${planId}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh the list
      let workouts = [];
      if (activeTab === 'customers' && selectedTrainee) {
        const response = await axios.get(`${API_URL}/trainees/${selectedTrainee}/workout-plans?coachId=${userId}`);
        workouts = response.data.workoutPlans;
        setWorkoutPlans(workouts);
      } else {
        const response = await axios.get(`${API_URL}/trainees/${userId}/workout-plans`);
        workouts = response.data.workoutPlans;
        setPersonalWorkouts(workouts);
      }

      // Find the started workout and set it as active
      const startedPlan = workouts.find(p => p.id === planId);
      if (startedPlan) {
        // Ensure startedAt is set for timer
        startedPlan.startedAt = new Date().toISOString();
        setActiveWorkout(startedPlan);


        // Load initial logs
        const logs = {};
        for (const exercise of startedPlan.exercises) {
          try {
            const response = await axios.get(
              `${API_URL}/workout-plans/${startedPlan.id}/exercises/${exercise.id}/logs`
            );
            logs[exercise.id] = response.data.logs;
          } catch (err) {
            logs[exercise.id] = [];
          }
        }
        setWorkoutLogs(logs);
      } else {
        alert('Workout started! Please refresh if it does not appear.');
      }

    } catch (err) {
      alert('Error starting workout: ' + (err.response?.data?.message || err.message));
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
        },
        {
          headers: { Authorization: `Bearer ${token}` }
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
      // Determine which log state to use based on which workout is selected
      const isPersonalWorkout = !!selectedPersonalWorkout;

      await axios.delete(
        `${API_URL}/workout-plans/${workoutId}/exercises/${exerciseId}/logs/${logId}`
      );

      // Refresh logs
      const response = await axios.get(
        `${API_URL}/workout-plans/${workoutId}/exercises/${exerciseId}/logs`
      );

      // Update the appropriate state
      if (isPersonalWorkout) {
        setPersonalWorkoutLogs(prev => ({
          ...prev,
          [exerciseId]: response.data.logs
        }));
      } else {
        setWorkoutLogs(prev => ({
          ...prev,
          [exerciseId]: response.data.logs
        }));
      }

    } catch (err) {
      console.error('Error deleting log:', err);
      alert('Failed to delete log');
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





  const completeWorkout = async () => {
    try {
      await axios.post(`${API_URL}/workout-plans/${activeWorkout.id}/complete`, {
        overallNotes: 'Completed via Coach Dashboard',
        rating: 5
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Workout completed! 🎉');
      setActiveWorkout(null);

      // Refresh lists
      if (activeTab === 'customers' && selectedTrainee) {
        loadTraineeWorkouts(selectedTrainee);
      } else {
        loadPersonalWorkouts();
      }
    } catch (err) {
      alert('Error completing workout: ' + (err.response?.data?.message || err.message));
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
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const response = await axios.get(`${API_URL}/trainees/${selectedTrainee || userId}/workout-plans?coachId=${userId}`);
      const updatedPlan = response.data.workoutPlans.find(p => p.id === editingWorkout.id);

      setEditFormData({
        ...editFormData,
        exercises: updatedPlan.exercises || []
      });
      setEditingWorkout(updatedPlan);

      setNewExercise({
        name: '',
        sets: '',
        reps: '',
        targetWeight: '',
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
      await axios.delete(`${API_URL}/workout-plans/${editingWorkout.id}/exercises/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
      const response = await axios.get(`${API_URL}/workout-templates/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Template saved successfully!');
      loadTemplates();
    } catch (err) {
      console.error('Save template error:', err);
      alert('Error saving template: ' + (err.response?.data?.message || err.message));
    }
  };



  // Start editing template
  const startEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      exercises: [...template.exercises]
    });
  };

  // Cancel editing template
  const cancelEditTemplate = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: '',
      description: '',
      exercises: []
    });
  };

  // Update template
  const updateTemplate = async () => {
    try {
      await axios.put(`${API_URL}/workout-templates/${editingTemplate.id}`, {
        name: templateFormData.name,
        description: templateFormData.description,
        exercises: templateFormData.exercises
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Template updated successfully!');
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error('Update template error:', err);
      alert('Error updating template: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete template
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await axios.delete(`${API_URL}/workout-templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  // Load unique exercises for progression
  const loadUniqueExercises = async () => {
    try {
      console.log('Loading unique exercises for userId:', progressionUserId);
      const response = await axios.get(`${API_URL}/workout-plans/users/${progressionUserId}/exercises`);
      console.log('Unique exercises response:', response.data);
      setUniqueExercises(response.data.exercises);
    } catch (err) {
      console.error('Error loading unique exercises:', err);
    }
  };

  // Load progression data when exercise is selected
  React.useEffect(() => {
    const loadProgression = async () => {
      if (!selectedProgressionExercise) return;

      try {
        const response = await axios.get(`${API_URL}/workout-plans/users/${progressionUserId}/progression`, {
          params: { exercise: selectedProgressionExercise }
        });
        setProgressionData(response.data.progression);
      } catch (err) {
        console.error('Error loading progression:', err);
      }
    };

    loadProgression();
  }, [selectedProgressionExercise, progressionUserId]);

  // Reload exercises when progression user change
  React.useEffect(() => {
    loadUniqueExercises();
    setSelectedProgressionExercise(''); // Reset selection
    setProgressionData([]); // Reset chart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressionUserId]);

  React.useEffect(() => {
    loadTrainees();
    loadPersonalWorkouts();
    loadTemplates();
    loadExerciseData();
    loadUniqueExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  const viewTraineeProfile = () => {
    if (!selectedTrainee) {
      alert('Please select a trainee first');
      return;
    }
    setShowTraineeProfile(true);
  };

  const closeTraineeProfile = () => {
    setShowTraineeProfile(false);
  };

  // Helper function to format dates
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if invalid
    }

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

  // Helper function to format time safely
  const formatTime = (dateString) => {
    if (!dateString) return '-';

    // Convert to string if it's an object
    const dateStr = typeof dateString === 'object' ? dateString.toString() : dateString;
    const date = new Date(dateStr);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.log('Invalid date:', dateString, 'Type:', typeof dateString);
      return '-';
    }

    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Show active workout view
  if (activeWorkout) {
    return (
      <ActiveWorkoutView
        activeWorkout={activeWorkout}
        workoutLogs={workoutLogs}
        activeWorkoutHistory={activeWorkoutHistory}
        timer={timer}
        onExit={() => setActiveWorkout(null)}
        onComplete={completeWorkout}
        onLogSet={handleLogSet}
        onDeleteLog={handleDeleteLog}
        onUpdateExercise={handleUpdateExercise}
      />
    );
  }

  return (
    <div className="dashboard" style={{ userSelect: 'none' }}>
      {/* Header */}
      {/* Header */}
      <div className="dashboard-header-container" style={{
        backgroundColor: '#0a0a0f',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%'
      }}>
        <div className="dashboard-header-content" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'center', // Centered as requested ("already have it in the middle")
          alignItems: 'center'
        }}>
          <h1 style={{
            color: '#fff',
            fontSize: '1.5rem',
            margin: 0,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #00ffff, #0080ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '800'
          }}>
            {t('dashboard.coachWelcome').toUpperCase()}
          </h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          {t('dashboard.myTrainees')}
        </button>
        <button
          className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          {t('dashboard.myWorkouts')}
        </button>
        <button
          className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 {t('common.date')}
        </button>
        <button
          className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📋 {t('profile.plan')}
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 {t('profile.title')}
        </button>
        <button
          className={`tab-button ${activeTab === 'progression' ? 'active' : ''}`}
          onClick={() => setActiveTab('progression')}
        >
          📈 {t('progression.title')}
        </button>
        <button
          className={`tab-button ${activeTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveTab('nutrition')}
        >
          🍎 {t('nutrition.title')}
        </button>
      </div>

      {activeTab === 'nutrition' && <NutritionCalculator userId={userId} />}

      {/* Customer Routines Tab  */}

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
                {selectedWorkout.description && (
                  <div className="workout-description" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                    <strong>Description:</strong> {selectedWorkout.description}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h5>Performance Log:</h5>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {editingLogs && (
                            <button
                              onClick={() => handleAddLog(selectedWorkout.id, exercise.id)}
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
                              <th>Delete</th>
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
                                      onChange={(e) => handleUpdateLog(selectedWorkout.id, exercise.id, log.id, 'repsCompleted', parseInt(e.target.value) || 0)}
                                      style={{ width: '50px', padding: '2px', textAlign: 'center', color: 'black' }}
                                    />
                                  ) : log.repsCompleted}
                                </td>
                                <td>
                                  {editingLogs ? (
                                    <input
                                      type="number"
                                      defaultValue={log.weightUsed}
                                      onChange={(e) => handleUpdateLog(selectedWorkout.id, exercise.id, log.id, 'weightUsed', parseFloat(e.target.value) || 0)}
                                      style={{ width: '60px', padding: '2px', textAlign: 'center', color: 'black' }}
                                    />
                                  ) : log.weightUsed}{log.weightUnit}
                                </td>
                                <td>
                                  {editingLogs ? (
                                    <input
                                      type="text"
                                      defaultValue={log.notes || ''}
                                      onChange={(e) => handleUpdateLog(selectedWorkout.id, exercise.id, log.id, 'notes', e.target.value)}
                                      style={{ width: '100%', padding: '2px', color: 'black' }}
                                    />
                                  ) : (log.notes || '-')}
                                </td>
                                <td>
                                  {editingLogs && (
                                    <button
                                      onClick={() => handleDeleteLog(selectedWorkout.id, exercise.id, log.id)}
                                      className="btn-danger"
                                      style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="no-logs">No logs recorded yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : showTraineeProfile && selectedTrainee ? (
            <div className="trainee-profile-view">
              <button onClick={closeTraineeProfile} className="btn-back">← Back to Workouts</button>
              <UserProfile userId={selectedTrainee} editable={false} />
            </div>
          ) : (
            <>
              {/* Subscription Usage Stats */}
              <div style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                borderRadius: '15px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}>
                <div>
                  <h4 style={{ margin: 0, color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Current Plan</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'capitalize' }}>
                    {coachTier} <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'normal' }}>Tier</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ margin: 0, color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Trainee Capacity</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                    <span style={{ color: trainees.length >= getTraineeLimit(coachTier) ? '#ff4444' : '#00ff88' }}>{trainees.length}</span>
                    <span style={{ color: '#666', margin: '0 5px' }}>/</span>
                    {getTraineeLimit(coachTier) === 999 ? '∞' : getTraineeLimit(coachTier)}
                  </div>
                </div>
              </div>

              <div className="dashboard-actions">
                <button onClick={() => {
                  const nextShow = !showForm;
                  setShowForm(nextShow);
                  if (nextShow) {
                    const baseDate = calendarSelectedDate || new Date();
                    const offset = baseDate.getTimezoneOffset() * 60000;
                    const dateStr = new Date(baseDate.getTime() - offset).toISOString().split('T')[0];

                    setFormData(prev => ({
                      ...prev,
                      traineeId: selectedTrainee || prev.traineeId,
                      scheduledDate: dateStr
                    }));
                  }
                }} className="btn-primary">
                  {showForm ? 'Cancel' : 'Create Workout Plan'}
                </button>

                <button onClick={() => setShowAddTrainee(!showAddTrainee)} className="btn-secondary">
                  {showAddTrainee ? 'Cancel' : 'Add Trainee'}
                </button>

                <button onClick={viewTraineeProfile} className="btn-secondary" disabled={!selectedTrainee}>
                  👤 View Trainee Profile
                </button>

                <div className="trainee-selector">
                  <label>Select Trainee:</label>
                  <select
                    value={selectedTrainee || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        loadTraineeWorkouts('');
                        return;
                      }
                      const index = trainees.findIndex(t => t.id === selectedId);
                      const limit = getTraineeLimit(coachTier);
                      if (index >= limit) {
                        alert(`🔒 This trainee is locked on your current ${coachTier} plan.\n\nPlease upgrade your subscription in your Profile to access more trainees.`);
                        return;
                      }
                      loadTraineeWorkouts(selectedId);
                    }}
                    className="trainee-dropdown"
                  >
                    <option value="">-- Select a trainee --</option>
                    {trainees.map((trainee, index) => {
                      const limit = getTraineeLimit(coachTier);
                      const isLocked = index >= limit;
                      return (
                        <option key={trainee.id} value={trainee.id} disabled={isLocked} style={{ color: isLocked ? '#888' : 'inherit' }}>
                          {isLocked ? '🔒 ' : ''}{trainee.name} {isLocked ? '(Locked)' : ''}
                        </option>
                      );
                    })}
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
                      <div className="form-group">

                        <div
                          className="date-picker-trigger"
                          onClick={() => openDatePicker((date) => setFormData(prev => ({ ...prev, scheduledDate: date })))}
                        >
                          <span>{formData.scheduledDate || 'Select Date'}</span>
                          <span className="icon">📅</span>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Import Template (Optional)</label>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const template = templates.find(t => t.id === parseInt(e.target.value));
                            if (template) {
                              setFormData({
                                ...formData,
                                name: template.name,
                                description: template.description || '',
                                exercises: [...template.exercises]
                              });
                              alert('Template imported! You can now modify and create the workout.');
                            }
                          }
                        }}
                        className="template-selector"
                      >
                        <option value="">-- Select a template --</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.exercises?.length || 0} exercises)
                          </option>
                        ))}
                      </select>
                    </div>


                    <div className="exercises-section">
                      <h4>Exercises</h4>

                      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* Left Side: Input Form */}
                        <div className="exercise-input" style={{ flex: 1, minWidth: '300px' }}>
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
                          <input
                            type="text"
                            placeholder="Notes (opt)"
                            value={newExercise.notes}
                            onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                            style={{ minWidth: '150px' }}
                          />
                          <button type="button" onClick={addExercise} className="btn-add">
                            Add
                          </button>
                        </div>

                        {/* Right Side: History Box (Always visible) */}
                        <div className="exercise-history-box" style={{
                          flex: 1,
                          minWidth: '300px',
                          background: 'rgba(255, 255, 255, 0.05)', // Gray background matching theme
                          padding: '1rem',
                          borderRadius: '10px',
                          color: 'var(--light)',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <h5 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: 'var(--gray)' }}>
                            {newExercise.name ? `${newExercise.name} History` : 'Exercise History'}
                          </h5>

                          {newExercise.name ? (
                            exerciseHistory.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {exerciseHistory.map((dayLog, idx) => (
                                  <div key={idx} style={{ fontSize: '0.9rem' }}>
                                    <div style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '2px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '2px' }}>
                                      {new Date(dayLog.date).toLocaleDateString()}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                      {dayLog.setDetails.map((set, setIdx) => (
                                        <div key={setIdx} style={{ fontSize: '0.85rem' }}>
                                          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Set {setIdx + 1}:</span> {set.reps} reps | {set.weight}kg
                                          {(set.rir || set.rpe) ? <span style={{ opacity: 0.8, fontSize: '0.8em', marginLeft: '5px' }}>
                                            @ {set.rir ? `RIR ${set.rir} ` : ''}{set.rpe ? `RPE ${set.rpe}` : ''}
                                          </span> : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.6, fontSize: '0.9rem' }}>No history found for this exercise.</p>
                            )
                          ) : (
                            <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.6, fontSize: '0.9rem' }}>Select an exercise to view history.</p>
                          )}
                        </div>
                      </div>

                      {/* List of Added Exercises */}
                      <div className="exercise-list">
                        {formData.exercises.map((ex, index) => (
                          <div key={index} className="exercise-item">
                            {editingExerciseIndex === index ? (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                                <span style={{ fontWeight: 'bold', marginRight: 'auto' }}>{ex.name}</span>
                                <input
                                  type="number"
                                  value={editingExerciseData.sets}
                                  onChange={(e) => setEditingExerciseData({ ...editingExerciseData, sets: e.target.value })}
                                  placeholder="Sets"
                                  style={{ width: '60px', padding: '5px' }}
                                />
                                <span>x</span>
                                <input
                                  type="number"
                                  value={editingExerciseData.reps}
                                  onChange={(e) => setEditingExerciseData({ ...editingExerciseData, reps: e.target.value })}
                                  placeholder="Reps"
                                  style={{ width: '60px', padding: '5px' }}
                                />
                                <span>@</span>
                                <input
                                  type="number"
                                  value={editingExerciseData.targetWeight}
                                  onChange={(e) => setEditingExerciseData({ ...editingExerciseData, targetWeight: e.target.value })}
                                  placeholder="Kg"
                                  style={{ width: '60px', padding: '5px' }}
                                />
                                <span>{ex.weightUnit}</span>
                                <input
                                  type="text"
                                  value={editingExerciseData.notes}
                                  onChange={(e) => setEditingExerciseData({ ...editingExerciseData, notes: e.target.value })}
                                  placeholder="Notes"
                                  style={{ width: '150px', padding: '5px', marginLeft: '5px' }}
                                />
                                <button type="button" onClick={saveEditedExercise} className="btn-success" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
                                  Save
                                </button>
                                <button type="button" onClick={cancelEditExercise} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <span>{ex.name} - {ex.sets}x{ex.reps} @ {ex.targetWeight}{ex.weightUnit} {ex.notes && <span style={{ fontSize: '0.9em', color: 'var(--gray)' }}>({ex.notes})</span>}</span>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => startEditingExercise(index, ex)}
                                    className="btn-secondary"
                                    style={{ marginRight: '0.5rem', padding: '2px 8px', fontSize: '0.8rem' }}
                                  >
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => removeExercise(index)} className="btn-remove">
                                    Remove
                                  </button>
                                </div>
                              </>
                            )}
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
                    <div className="form-group">
                      <label>Scheduled Date</label>
                      <div
                        className="date-picker-trigger"
                        onClick={() => openDatePicker((date) => setEditFormData(prev => ({ ...prev, scheduledDate: date })))}
                      >
                        <span>{editFormData.scheduledDate || 'Select Date'}</span>
                        <span className="icon">📅</span>
                      </div>
                    </div>
                  </div>

                  <div className="exercises-section">
                    <h4>Current Exercises</h4>
                    <div className="exercise-list">
                      {(editFormData.exercises || []).map((ex) => (
                        <div key={ex.id} className="exercise-item">
                          <span>{ex.name} - {ex.sets}x{ex.reps} @ {ex.targetWeight}{ex.weightUnit} {ex.notes && <span style={{ fontSize: '0.9em', color: 'var(--gray)' }}>({ex.notes})</span>}</span>
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
                      <input
                        type="text"
                        placeholder="Notes (opt)"
                        value={newExercise.notes}
                        onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                        style={{ minWidth: '150px' }}
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

      )
      }

      {/* Personal Workouts Tab  */}

      {
        activeTab === 'personal' && (
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
                  {selectedPersonalWorkout.description && (
                    <div className="workout-description" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                      <strong>Description:</strong> {selectedPersonalWorkout.description}
                    </div>
                  )}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h5>Performance Log:</h5>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {editingLogs && (
                              <button
                                onClick={() => handleAddLog(selectedPersonalWorkout.id, exercise.id)}
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
                        {personalWorkoutLogs[exercise.id] && personalWorkoutLogs[exercise.id].length > 0 ? (
                          <table className="logs-table">
                            <thead>
                              <tr>
                                <th>Set</th>
                                <th>Reps</th>
                                <th>Weight</th>
                                <th>Notes</th>
                                <th>Time</th>
                                <th>Delete</th>
                              </tr>
                            </thead>
                            <tbody>
                              {personalWorkoutLogs[exercise.id].map((log) => (
                                <tr key={log.id}>
                                  <td>{log.setNumber}</td>
                                  <td>
                                    {editingLogs ? (
                                      <input
                                        type="number"
                                        defaultValue={log.repsCompleted}
                                        onChange={(e) => handleUpdateLog(selectedPersonalWorkout.id, exercise.id, log.id, 'repsCompleted', parseInt(e.target.value) || 0)}
                                        style={{ width: '50px', padding: '2px', textAlign: 'center', color: 'black' }}
                                      />
                                    ) : log.repsCompleted}
                                  </td>
                                  <td>
                                    {editingLogs ? (
                                      <input
                                        type="number"
                                        defaultValue={log.weightUsed}
                                        onChange={(e) => handleUpdateLog(selectedPersonalWorkout.id, exercise.id, log.id, 'weightUsed', parseFloat(e.target.value) || 0)}
                                        style={{ width: '60px', padding: '2px', textAlign: 'center', color: 'black' }}
                                      />
                                    ) : log.weightUsed}{log.weightUnit}
                                  </td>
                                  <td>
                                    {editingLogs ? (
                                      <input
                                        type="text"
                                        defaultValue={log.notes || ''}
                                        onChange={(e) => handleUpdateLog(selectedPersonalWorkout.id, exercise.id, log.id, 'notes', e.target.value)}
                                        style={{ width: '100%', padding: '2px', color: 'black' }}
                                      />
                                    ) : (log.notes || '-')}
                                  </td>
                                  <td>{formatTime(log.loggedAt)}</td>
                                  <td>
                                    {editingLogs && (
                                      <button
                                        onClick={() => handleDeleteLog(selectedPersonalWorkout.id, exercise.id, log.id)}
                                        className="btn-danger"
                                        style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </td>
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
                    const nextShow = !showPersonalForm;
                    setShowPersonalForm(nextShow);
                    if (nextShow) {
                      const baseDate = calendarSelectedDate || new Date();
                      const offset = baseDate.getTimezoneOffset() * 60000;
                      const dateStr = new Date(baseDate.getTime() - offset).toISOString().split('T')[0];
                      setPersonalFormData(prev => ({ ...prev, scheduledDate: dateStr }));
                    }
                  }} className="btn-primary">
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
                        <div className="form-group">
                          <label>Scheduled Date</label>
                          <div
                            className="date-picker-trigger"
                            onClick={() => openDatePicker((date) => setPersonalFormData(prev => ({ ...prev, scheduledDate: date })))}
                          >
                            <span>{personalFormData.scheduledDate || 'Select Date'}</span>
                            <span className="icon">📅</span>
                          </div>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Import Template (Optional)</label>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const template = templates.find(t => t.id === parseInt(e.target.value));
                              if (template) {
                                setPersonalFormData({
                                  ...personalFormData,
                                  name: template.name,
                                  description: template.description || '',
                                  exercises: [...template.exercises]
                                });
                                alert('Template imported! You can now modify and create the workout.');
                              }
                            }
                          }}
                          className="template-selector"
                        >
                          <option value="">-- Select a template --</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.exercises?.length || 0} exercises)
                            </option>
                          ))}
                        </select>
                      </div>


                      <div className="exercises-section">
                        <h4>Exercises</h4>

                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div className="exercise-input" style={{ flex: 1, minWidth: '300px' }}>
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
                            <input
                              type="text"
                              placeholder="Notes (opt)"
                              value={newExercise.notes}
                              onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                              style={{ minWidth: '150px' }}
                            />
                            <button type="button" onClick={addExercise} className="btn-add">
                              Add
                            </button>
                          </div>

                          {/* Right Side: History Box (Always visible) */}
                          <div className="exercise-history-box" style={{
                            flex: 1,
                            minWidth: '300px',
                            background: 'rgba(255, 255, 255, 0.05)', // Gray background matching theme
                            padding: '1rem',
                            borderRadius: '10px',
                            color: 'var(--light)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <h5 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: 'var(--gray)' }}>
                              {newExercise.name ? `${newExercise.name} History` : 'Exercise History'}
                            </h5>

                            {newExercise.name ? (
                              exerciseHistory.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                  {exerciseHistory.map((dayLog, idx) => (
                                    <div key={idx} style={{ fontSize: '0.9rem' }}>
                                      <div style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '2px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '2px' }}>
                                        {new Date(dayLog.date).toLocaleDateString()}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                        {dayLog.setDetails.map((set, setIdx) => (
                                          <div key={setIdx} style={{ fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Set {setIdx + 1}:</span> {set.reps} reps | {set.weight}kg
                                            {(set.rir || set.rpe) ? <span style={{ opacity: 0.8, fontSize: '0.8em', marginLeft: '5px' }}>
                                              @ {set.rir ? `RIR ${set.rir} ` : ''}{set.rpe ? `RPE ${set.rpe}` : ''}
                                            </span> : null}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.6, fontSize: '0.9rem' }}>No history found for this exercise.</p>
                              )
                            ) : (
                              <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.6, fontSize: '0.9rem' }}>Select an exercise to view history.</p>
                            )}
                          </div>
                        </div>

                        <div className="exercise-list">
                          {personalFormData.exercises.map((ex, index) => (
                            <div key={index} className="exercise-item">
                              {editingExerciseIndex === index ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                                  <span style={{ fontWeight: 'bold', marginRight: 'auto' }}>{ex.name}</span>
                                  <input
                                    type="number"
                                    value={editingExerciseData.sets}
                                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, sets: e.target.value })}
                                    placeholder="Sets"
                                    style={{ width: '60px', padding: '5px' }}
                                  />
                                  <span>x</span>
                                  <input
                                    type="number"
                                    value={editingExerciseData.reps}
                                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, reps: e.target.value })}
                                    placeholder="Reps"
                                    style={{ width: '60px', padding: '5px' }}
                                  />
                                  <span>@</span>
                                  <input
                                    type="number"
                                    value={editingExerciseData.targetWeight}
                                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, targetWeight: e.target.value })}
                                    placeholder="Kg"
                                    style={{ width: '60px', padding: '5px' }}
                                  />
                                  <span>{ex.weightUnit}</span>
                                  <input
                                    type="text"
                                    value={editingExerciseData.notes}
                                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, notes: e.target.value })}
                                    placeholder="Notes"
                                    style={{ width: '150px', padding: '5px', marginLeft: '5px' }}
                                  />
                                  <button type="button" onClick={saveEditedExercise} className="btn-success" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
                                    Save
                                  </button>
                                  <button type="button" onClick={cancelEditExercise} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span>{ex.name} - {ex.sets}x{ex.reps} @ {ex.targetWeight}{ex.weightUnit} {ex.notes && <span style={{ fontSize: '0.9em', color: 'var(--gray)' }}>({ex.notes})</span>}</span>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => startEditingExercise(index, ex)}
                                      className="btn-secondary"
                                      style={{ marginRight: '0.5rem', padding: '2px 8px', fontSize: '0.8rem' }}
                                    >
                                      Edit
                                    </button>
                                    <button type="button" onClick={() => removeExercise(index)} className="btn-remove">
                                      Remove
                                    </button>
                                  </div>
                                </>
                              )}
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

                        {plan.status === 'assigned' && (
                          <button onClick={() => startWorkout(plan.id)} className="btn-primary">
                            Start Workout
                          </button>
                        )}

                        {plan.status === 'in_progress' && (
                          <button onClick={() => startWorkout(plan.id)} className="btn-primary">
                            Resume Workout
                          </button>
                        )}

                        <button onClick={() => viewPersonalWorkoutDetails(plan)} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
                          View Details
                        </button>

                        {(plan.status === 'assigned') && (
                          <>
                            <button onClick={() => startEditWorkout(plan)} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => deletePersonalWorkout(plan.id)} className="btn-danger" style={{ marginLeft: '0.5rem' }}>
                              Delete
                            </button>
                          </>
                        )}

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

        )
      }

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="calendar-section">
          <h2>My Calendar</h2>
          <Calendar
            events={[...personalWorkouts, ...allTraineeWorkouts]}
            onSelectDate={(date) => setCalendarSelectedDate(date)}
          />

          {calendarSelectedDate && (
            <div className="selected-date-workouts">
              <h3>Workouts for {calendarSelectedDate.toLocaleDateString()}</h3>
              {(() => {
                const dayEvents = [...personalWorkouts, ...allTraineeWorkouts].filter(p => {
                  const d = new Date(p.scheduledDate);
                  return d.getDate() === calendarSelectedDate.getDate() &&
                    d.getMonth() === calendarSelectedDate.getMonth() &&
                    d.getFullYear() === calendarSelectedDate.getFullYear();
                });

                if (dayEvents.length === 0) return <p>No workouts scheduled for this day.</p>;

                return dayEvents.map(plan => (
                  <div key={plan.id} className="workout-card">
                    <h4>{plan.name} {plan.traineeName ? `(Trainee: ${plan.traineeName})` : '(Personal)'}</h4>
                    <p>Status: <span className={`status-${plan.status}`}>{plan.status}</span></p>
                    <p>Scheduled: {formatDate(plan.scheduledDate)}</p>
                    <p>{(plan.exercises || []).length} exercises</p>
                    {plan.completedAt && <p>✓ Completed: {formatDate(plan.completedAt, true)}</p>}

                    {/* Personal workout actions */}
                    {!plan.traineeName && (
                      <>
                        {plan.status === 'assigned' && (
                          <button onClick={() => startWorkout(plan.id)} className="btn-primary">
                            Start Workout
                          </button>
                        )}

                        {plan.status === 'in_progress' && (
                          <button onClick={() => startWorkout(plan.id)} className="btn-primary">
                            Resume Workout
                          </button>
                        )}

                        <button onClick={() => viewPersonalWorkoutDetails(plan)} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
                          View Details
                        </button>

                        {plan.status === 'assigned' && (
                          <>
                            <button onClick={() => startEditWorkout(plan)} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => deletePersonalWorkout(plan.id)} className="btn-danger" style={{ marginLeft: '0.5rem' }}>
                              Delete
                            </button>
                          </>
                        )}

                        {plan.status === 'completed' && (
                          <button onClick={() => deletePersonalWorkout(plan.id)} className="btn-danger" style={{ marginLeft: '0.5rem' }}>
                            Delete
                          </button>
                        )}
                      </>
                    )}

                    {/* Trainee workout actions */}
                    {plan.traineeName && (
                      <>
                        <button onClick={() => viewWorkoutDetails(plan)} className="btn-secondary">
                          View Details
                        </button>

                        {(plan.status === 'assigned' || true) && (
                          <button onClick={() => startEditWorkout(plan)} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
                            ✏️ Edit
                          </button>
                        )}

                        {plan.status === 'completed' && (
                          <button onClick={() => deleteWorkout(plan.id)} className="btn-danger" style={{ marginLeft: '0.5rem' }}>
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab  */}

      {
        activeTab === 'templates' && (
          <div className="templates-section">
            <h2>My Workout Templates</h2>
            <p>Save and reuse your favorite workout configurations</p>

            {editingTemplate ? (
              <div className="workout-form">
                <h3>Edit Template: {editingTemplate.name}</h3>
                <form onSubmit={(e) => { e.preventDefault(); updateTemplate(); }}>
                  <div className="form-group">
                    <label>Template Name</label>
                    <input
                      type="text"
                      value={templateFormData.name}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={templateFormData.description}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                    />
                  </div>

                  <div className="exercises-list" style={{ margin: '1rem 0' }}>
                    <h4>Exercises ({templateFormData.exercises.length})</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {templateFormData.exercises.map((ex, idx) => (
                        <li key={idx} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', marginBottom: '0.5rem', borderRadius: '4px' }}>
                          <strong>{ex.name}</strong> - {ex.sets} sets × {ex.reps} reps
                        </li>
                      ))}
                    </ul>
                    <p style={{ fontSize: '0.9rem', color: '#aaa', fontStyle: 'italic' }}>
                      * To modify exercises, please create a new workout from this template, modify it, and save as a new template.
                    </p>
                  </div>

                  <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className="btn-primary">Update Template</button>
                    <button type="button" onClick={cancelEditTemplate} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              <>
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
                            onClick={() => startEditTemplate(template)}
                            className="btn-primary"
                          >
                            Edit
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
              </>
            )}
          </div>
        )
      }

      {/* My Profile Tab */}
      {
        activeTab === 'profile' && (
          <UserProfile userId={userId} editable={true} />
        )
      }

      {/* Progression Tab */}
      {
        activeTab === 'progression' && (
          <div className="progression-section">
            <h2>Progression Tracking</h2>
            <p style={{ color: 'var(--gray)', marginBottom: '2rem' }}>
              Track strength gains over time. Select an exercise to view the estimated 1 Rep Max trend.
            </p>

            <div className="progression-controls" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '2rem',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              {/* NEW USER SELECTOR */}
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label>View Progression For</label>
                <select
                  value={progressionUserId}
                  onChange={(e) => setProgressionUserId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value={userId}>Me (Coach)</option>
                  {trainees.map(trainee => (
                    <option key={trainee.id} value={trainee.id}>{trainee.name}</option>
                  ))}
                </select>
              </div>

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


      {/* Calendar Modal Picker */}
      {
        showDateModal && (
          <div className="calendar-modal-overlay" onClick={() => setShowDateModal(false)}>
            <div className="calendar-modal-content" onClick={e => e.stopPropagation()}>
              <div className="calendar-modal-header">
                <h3>Select Date</h3>
                <button onClick={() => setShowDateModal(false)} className="btn-close">×</button>
              </div>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <Calendar
                  events={[...personalWorkouts, ...allTraineeWorkouts]}
                  onSelectDate={handleDateSelect}
                />
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default CoachDashboard;
